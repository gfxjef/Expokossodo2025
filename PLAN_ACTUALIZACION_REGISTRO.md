# Plan de Modificación del Sistema de Registro

**Versión:** 1.0  
**Fecha:** 2025-08-21  
**Autor:** Sistema de IA  

## 1. Resumen Ejecutivo

Este documento detalla el plan para modificar el flujo de registro de usuarios en ExpoKossodo 2025. El objetivo es cambiar el comportamiento actual del sistema para permitir que los usuarios existentes añadan nuevas charlas a su registro utilizando el mismo correo electrónico, manejando de forma inteligente los conflictos de horario sin rechazar todo el proceso.

### Requerimientos Clave:
1. **Re-registro Permitido**: Los clientes pueden registrarse nuevamente con el mismo correo
2. **Validación de Horarios**: Si selecciona una charla en la misma hora, esa charla específica no se registrará
3. **Registro Parcial**: Las demás charlas válidas sí se registrarán
4. **Actualización de Salas**: Las charlas se agregan a las columnas de salas existentes [32, 31, 52, etc.]
5. **Preservar Registro**: No se crea un nuevo registro, se mantiene el existente basado en el correo electrónico

## 2. Contexto y Localización de Datos (El Historial)

Gracias al análisis previo del código, hemos identificado los componentes clave que gestionan el registro. Esta "historia" nos permite actuar con precisión sobre los archivos correctos.

### Frontend (React 19.1.1)
- **Componente Principal**: [`frontend/src/components/EventRegistration.js`](./frontend/src/components/EventRegistration.js)
- **Formulario**: [`frontend/src/components/RegistrationForm.js`](./frontend/src/components/RegistrationForm.js)
- **Servicio API**: [`frontend/src/services/api.js`](./frontend/src/services/api.js) - función `createRegistration`

### Backend (Flask 2.3.3)
- **Archivo Principal**: [`backend/app.py`](./backend/app.py)
- **Función a Modificar**: `crear_registro()` (línea ~400-500 aprox)
- **Endpoint**: `POST /api/registro`

### Base de Datos (MySQL)
Esquema definido en `init_database()` dentro de [`backend/app.py`](./backend/app.py):

#### Tablas Relevantes:
1. **`expokossodo_registros`**: 
   - `id` (PK)
   - `correo` (UNIQUE) - Clave para buscar usuario existente
   - `eventos_seleccionados` (JSON) - Array de IDs de eventos
   - `fecha_registro`, `nombre`, `apellido`, etc.

2. **`expokossodo_eventos`**:
   - `id` (PK)
   - `fecha`, `hora` - Campos cruciales para validación de conflictos
   - `titulo_charla`, `sala`, `slots_ocupados`, `capacidad_maxima`

3. **`expokossodo_registro_eventos`**:
   - `registro_id` (FK)
   - `evento_id` (FK)
   - Tabla de relación many-to-many

## 3. Plan de Implementación Detallado

La función `crear_registro()` en [`backend/app.py`](./backend/app.py) será reestructurada siguiendo estos pasos:

### Paso 1: Modificar la Búsqueda de Usuario

**Lógica Actual** (líneas ~430-440):
```python
# Verificar si el correo ya existe
cursor.execute("SELECT id FROM expokossodo_registros WHERE correo = %s", (correo,))
existing_user = cursor.fetchone()
if existing_user:
    return jsonify({"error": "Ya existe un registro con este correo electrónico"}), 400
```

**Nueva Lógica**:
```python
# Buscar usuario existente
cursor.execute("SELECT id, eventos_seleccionados FROM expokossodo_registros WHERE correo = %s", (correo,))
existing_user = cursor.fetchone()

if existing_user:
    # Usuario existe - flujo de actualización
    registro_id = existing_user[0]
    eventos_actuales = json.loads(existing_user[1] or '[]')
    modo_actualizacion = True
else:
    # Usuario nuevo - flujo de creación
    modo_actualizacion = False
    eventos_actuales = []
```

### Paso 2: Recopilar Eventos del Usuario (Flujo de Actualización)

```python
if modo_actualizacion:
    # Obtener detalles de eventos ya inscritos
    if eventos_actuales:
        format_strings = ','.join(['%s'] * len(eventos_actuales))
        cursor.execute(f"""
            SELECT id, fecha, hora 
            FROM expokossodo_eventos 
            WHERE id IN ({format_strings})
        """, eventos_actuales)
        eventos_inscritos = cursor.fetchall()
    else:
        eventos_inscritos = []
```

### Paso 3: Implementar Lógica de Validación de Conflictos

```python
def validar_conflictos_horario(eventos_inscritos, eventos_nuevos, cursor):
    """
    Valida conflictos de horario entre eventos existentes y nuevos
    
    Args:
        eventos_inscritos: Lista de tuplas (id, fecha, hora) de eventos ya inscritos
        eventos_nuevos: Lista de IDs de eventos nuevos a validar
        cursor: Cursor de base de datos
    
    Returns:
        tuple: (eventos_validos, eventos_conflictivos)
    """
    # Crear mapa de horarios ocupados
    horarios_ocupados = {}
    for evento_id, fecha, hora in eventos_inscritos:
        fecha_str = fecha.strftime('%Y-%m-%d')
        if fecha_str not in horarios_ocupados:
            horarios_ocupados[fecha_str] = set()
        horarios_ocupados[fecha_str].add(hora)
    
    # Validar eventos nuevos
    eventos_validos = []
    eventos_conflictivos = []
    
    if eventos_nuevos:
        format_strings = ','.join(['%s'] * len(eventos_nuevos))
        cursor.execute(f"""
            SELECT id, fecha, hora, titulo_charla, sala 
            FROM expokossodo_eventos 
            WHERE id IN ({format_strings})
        """, eventos_nuevos)
        eventos_nuevos_detalles = cursor.fetchall()
        
        for evento_id, fecha, hora, titulo, sala in eventos_nuevos_detalles:
            fecha_str = fecha.strftime('%Y-%m-%d')
            
            # Verificar conflicto
            if (fecha_str in horarios_ocupados and 
                hora in horarios_ocupados[fecha_str]):
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo_charla': titulo,
                    'sala': sala,
                    'motivo': f'Conflicto de horario: {fecha_str} {hora}'
                })
            else:
                eventos_validos.append(evento_id)
    
    return eventos_validos, eventos_conflictivos
```

### Paso 4: Actualización Transaccional de la Base de Datos

```python
if eventos_validos:
    try:
        # Actualizar lista de eventos del usuario
        eventos_finales = list(set(eventos_actuales + eventos_validos))
        
        if modo_actualizacion:
            # Actualizar registro existente
            cursor.execute("""
                UPDATE expokossodo_registros 
                SET eventos_seleccionados = %s, fecha_registro = NOW()
                WHERE id = %s
            """, (json.dumps(eventos_finales), registro_id))
        else:
            # Crear nuevo registro (flujo original pero con validación)
            cursor.execute("""
                INSERT INTO expokossodo_registros 
                (nombre, apellido, correo, telefono, empresa, cargo, eventos_seleccionados)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (nombre, apellido, correo, telefono, empresa, cargo, json.dumps(eventos_validos)))
            registro_id = cursor.lastrowid
        
        # Insertar relaciones evento-registro
        for evento_id in eventos_validos:
            cursor.execute("""
                INSERT INTO expokossodo_registro_eventos (registro_id, evento_id)
                VALUES (%s, %s)
            """, (registro_id, evento_id))
            
            # Actualizar contador de slots ocupados
            cursor.execute("""
                UPDATE expokossodo_eventos 
                SET slots_ocupados = slots_ocupados + 1 
                WHERE id = %s
            """, (evento_id,))
        
        connection.commit()
        
    except Exception as e:
        connection.rollback()
        raise e
```

### Paso 5: Mejorar la Respuesta de la API

**Nueva Respuesta JSON**:
```python
# Preparar respuesta detallada
response_data = {
    "success": True,
    "registro_id": registro_id,
    "modo": "actualizado" if modo_actualizacion else "creado",
    "eventos_agregados": [],
    "eventos_omitidos": eventos_conflictivos,
    "email_sent": False
}

# Obtener detalles de eventos agregados
if eventos_validos:
    format_strings = ','.join(['%s'] * len(eventos_validos))
    cursor.execute(f"""
        SELECT id, titulo_charla, sala, fecha, hora
        FROM expokossodo_eventos 
        WHERE id IN ({format_strings})
    """, eventos_validos)
    eventos_agregados = cursor.fetchall()
    
    response_data["eventos_agregados"] = [
        {
            "id": evento[0],
            "titulo_charla": evento[1],
            "sala": evento[2],
            "fecha": evento[3].strftime('%Y-%m-%d'),
            "hora": evento[4]
        }
        for evento in eventos_agregados
    ]

# Mensaje dinámico
if eventos_conflictivos and eventos_validos:
    response_data["message"] = "Registro actualizado. Algunas charlas fueron omitidas por conflictos de horario."
elif eventos_conflictivos and not eventos_validos:
    response_data["message"] = "No se pudo agregar ninguna charla debido a conflictos de horario."
elif eventos_validos:
    response_data["message"] = "Registro actualizado exitosamente."
```

## 4. Archivos a Modificar

### Archivo Principal: [`backend/app.py`](./backend/app.py)

**Funciones a modificar:**
1. `crear_registro()` - Lógica principal (líneas ~400-500)
2. Posible nueva función: `validar_conflictos_horario()`
3. Posible nueva función: `obtener_eventos_usuario()`

### Archivos de Testing (Usando .claude/agents)

**Crear agente especializado**:
- **Archivo**: `.claude/agents/test_registro_system.py`
- **Propósito**: Testing automatizado del nuevo sistema
- **Funcionalidad**: 
  - Crear usuarios de prueba
  - Simular registros múltiples
  - Validar conflictos de horario
  - Verificar integridad de datos

## 5. Casos de Prueba a Implementar

### Caso 1: Usuario Nuevo
- **Input**: Correo nuevo + selección de charlas
- **Esperado**: Registro normal con validación de conflictos solo en la selección actual

### Caso 2: Usuario Existente - Sin Conflictos
- **Input**: Correo existente + charlas en horarios libres
- **Esperado**: Todas las charlas se agregan al registro existente

### Caso 3: Usuario Existente - Con Conflictos Parciales
- **Input**: Correo existente + mix de charlas (algunas conflictivas, otras válidas)
- **Esperado**: Solo las charlas válidas se agregan, respuesta detalla qué se omitió

### Caso 4: Usuario Existente - Todos Conflictos
- **Input**: Correo existente + solo charlas conflictivas
- **Esperado**: Ninguna charla se agrega, respuesta explica los conflictos

### Caso 5: Validación de Integridad
- **Verificar**: Que `slots_ocupados` se actualice correctamente
- **Verificar**: Que las relaciones en `expokossodo_registro_eventos` sean correctas
- **Verificar**: Que el JSON `eventos_seleccionados` se mantenga sincronizado

## 6. Configuración del Agente de Testing

```python
# .claude/agents/test_registro_system.py
"""
Agente especializado para testing del sistema de registro modificado
"""

class RegistroTestAgent:
    def __init__(self, api_base_url="http://localhost:5000/api"):
        self.api_url = api_base_url
        self.test_results = []
    
    def test_usuario_nuevo(self):
        """Prueba registro de usuario completamente nuevo"""
        pass
    
    def test_usuario_existente_sin_conflictos(self):
        """Prueba usuario existente agregando charlas sin conflictos"""
        pass
    
    def test_usuario_existente_con_conflictos(self):
        """Prueba usuario existente con conflictos parciales"""
        pass
    
    def test_integridad_base_datos(self):
        """Verifica integridad de datos post-registro"""
        pass
    
    def generar_reporte(self):
        """Genera reporte detallado de pruebas"""
        pass
```

## 7. Cronograma de Implementación

1. **Fase 1**: Modificación de `backend/app.py` (2-3 horas)
2. **Fase 2**: Creación del agente de testing (1 hora)
3. **Fase 3**: Pruebas exhaustivas (2 horas)
4. **Fase 4**: Refinamiento y optimización (1 hora)

## 8. Riesgos y Consideraciones

### Riesgos Técnicos:
- **Integridad de Datos**: Asegurar transacciones atómicas
- **Performance**: Validación adicional puede impactar tiempo de respuesta
- **Concurrencia**: Manejo de registros simultáneos

### Mitigaciones:
- Uso de transacciones MySQL
- Indexación adecuada en campos de búsqueda
- Testing exhaustivo de casos edge

## 9. Métricas de Éxito

- ✅ Usuario puede registrarse múltiples veces con mismo correo
- ✅ Conflictos de horario se manejan inteligentemente
- ✅ Registro parcial funciona correctamente
- ✅ Integridad de datos se mantiene
- ✅ Respuesta API es informativa y detallada
- ✅ Performance no se degrada significativamente

---

**Próximo Paso**: Implementar las modificaciones en [`backend/app.py`](./backend/app.py) siguiendo este plan detallado.