# Registro System Tester

Agente especializado para testing del sistema de registro modificado de ExpoKossodo 2025.

## Propósito

Este agente está diseñado para probar exhaustivamente la nueva lógica de registro que permite:
1. Re-registro con el mismo correo electrónico
2. Validación inteligente de conflictos de horario
3. Registro parcial de charlas válidas
4. Actualización de registros existentes

## Capacidades

### Testing de Funcionalidad
- **Casos de Usuario Nuevo**: Valida el flujo de registro inicial con la nueva lógica de validación
- **Casos de Usuario Existente**: Prueba actualizaciones de registro con diferentes escenarios de conflictos
- **Validación de Conflictos**: Verifica que la lógica de horarios funcione correctamente
- **Integridad de Datos**: Asegura que las transacciones mantengan consistencia en la base de datos

### Escenarios de Prueba

#### Caso 1: Usuario Completamente Nuevo
```json
{
  "correo": "nuevo@test.com",
  "eventos": [1, 2, 3],
  "esperado": "registro_exitoso_completo"
}
```

#### Caso 2: Usuario Existente - Sin Conflictos
```json
{
  "correo": "existente@test.com",
  "eventos_actuales": [1, 2],
  "eventos_nuevos": [4, 5, 6],
  "esperado": "actualizacion_exitosa_completa"
}
```

#### Caso 3: Usuario Existente - Conflictos Parciales
```json
{
  "correo": "existente@test.com", 
  "eventos_actuales": [1, 2],
  "eventos_nuevos": [3, 1, 7],
  "esperado": {
    "agregados": [3, 7],
    "omitidos": [1],
    "motivo_omision": "conflicto_horario"
  }
}
```

#### Caso 4: Usuario Existente - Todos Conflictos
```json
{
  "correo": "existente@test.com",
  "eventos_actuales": [1, 2, 3],
  "eventos_nuevos": [1, 2, 3],
  "esperado": {
    "agregados": [],
    "omitidos": [1, 2, 3],
    "mensaje": "no_charlas_agregadas_conflictos"
  }
}
```

### Validaciones de Integridad

#### Base de Datos
- Verificar que `expokossodo_registros.eventos_seleccionados` se actualice correctamente
- Confirmar que `expokossodo_registro_eventos` mantenga relaciones consistentes
- Validar que `expokossodo_eventos.slots_ocupados` se incremente adecuadamente
- Asegurar que las transacciones sean atómicas

#### API Response
- Verificar estructura JSON de respuesta
- Validar que se incluyan detalles de eventos agregados y omitidos
- Confirmar que los mensajes de error/éxito sean informativos
- Comprobar códigos de estado HTTP apropiados

### Herramientas de Testing

#### Setup de Datos de Prueba
```python
def setup_test_data():
    """
    Crea datos de prueba consistentes:
    - Eventos con horarios específicos
    - Usuarios existentes con registros conocidos
    - Configuración de salas y capacidades
    """
    pass
```

#### Ejecución de Pruebas
```python
def run_test_suite():
    """
    Ejecuta todos los casos de prueba en secuencia:
    1. Setup de datos limpios
    2. Ejecución de cada caso
    3. Validación de resultados
    4. Cleanup
    """
    pass
```

#### Generación de Reportes
```python
def generate_test_report():
    """
    Genera reporte detallado con:
    - Casos ejecutados
    - Resultados obtenidos vs esperados
    - Métricas de performance
    - Recomendaciones de mejora
    """
    pass
```

### Métricas de Performance

#### Tiempo de Respuesta
- Medir tiempo de procesamiento para diferentes volúmenes de eventos
- Comparar performance antes y después de modificaciones
- Identificar cuellos de botella

#### Carga de Base de Datos
- Monitorear número de queries ejecutadas por registro
- Verificar eficiencia de consultas de validación
- Asegurar que índices se utilicen correctamente

### Configuración del Entorno de Testing

#### Variables de Entorno
```bash
TEST_DB_HOST=localhost
TEST_DB_NAME=expokossodo_test
TEST_API_URL=http://localhost:5000/api
TEST_MODE=true
```

#### Dependencias
- `requests` para llamadas HTTP
- `mysql-connector-python` para validaciones directas de DB
- `pytest` para framework de testing
- `json` para manejo de payloads

### Casos Edge a Considerar

1. **Concurrencia**: Múltiples usuarios registrándose simultáneamente para el mismo evento
2. **Capacidad Límite**: Intentar registrarse cuando un evento está lleno
3. **Datos Inválidos**: Eventos inexistentes, correos malformados
4. **Rollback**: Verificar que transacciones fallidas no dejen datos inconsistentes

### Criterios de Aceptación

✅ **Funcionalidad Básica**
- Usuario nuevo puede registrarse normalmente
- Usuario existente puede agregar charlas sin conflictos
- Conflictos de horario se detectan y manejan correctamente

✅ **Integridad de Datos**
- Todas las tablas mantienen consistencia
- Contadores de slots_ocupados son precisos
- JSON eventos_seleccionados refleja estado real

✅ **Experiencia de Usuario**
- Respuestas API son informativas
- Errores se comunican claramente
- Performance es aceptable (<2 segundos por registro)

✅ **Robustez**
- Sistema maneja casos edge sin crashes
- Transacciones fallan de manera segura
- Concurrencia no causa inconsistencias

### Uso del Agente

Para utilizar este agente:

1. **Preparación**: Configurar entorno de testing con base de datos limpia
2. **Ejecución**: Correr suite completa de pruebas
3. **Análisis**: Revisar reporte generado y métricas
4. **Iteración**: Repetir después de cambios en el código

Este agente debe usarse después de cada modificación al sistema de registro para asegurar que la funcionalidad se mantiene correcta y robusta.