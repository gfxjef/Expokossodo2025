# 🚀 GUÍA DE INICIO - Sistema QR y Verificación
## ExpoKossodo 2024 - Implementación Paso a Paso

### **📋 RESUMEN**
Esta guía te llevará paso a paso para implementar el sistema completo de códigos QR y verificación de asistencia basado en el PRD y TASK_MASTER creados.

---

## **⚡ INICIO RÁPIDO**

### **Paso 1: Preparar Entorno**
```bash
# 1. Ir al directorio backend
cd backend

# 2. Instalar nuevas dependencias
pip install qrcode[pil] Pillow

# 3. Actualizar requirements.txt
pip freeze > requirements.txt

# 4. Ir al directorio frontend  
cd ../frontend

# 5. Instalar dependencias de QR scanner
npm install html5-qrcode
npm install react-webcam
```

### **Paso 2: Ejecutar con Task Master**
```bash
# Usar el task master para implementación estructurada
python task_master.py --file TASK_MASTER_QR_VERIFICATION.json --phase FASE_1_BASE_DATOS
```

---

## **🗄️ ORDEN DE IMPLEMENTACIÓN**

### **FASE 1: Base de Datos (2 horas)**
1. **BD-001:** Crear tablas de asistencia
2. **BD-002:** Modificar tabla registros  
3. **BD-003:** Actualizar init_database()

### **FASE 2: Generación QR (4 horas)**
1. **QR-001:** Instalar dependencias
2. **QR-002:** Función generadora de texto QR
3. **QR-003:** Función generadora de imagen QR
4. **QR-004:** Integrar QR en registro
5. **QR-005:** Actualizar email con QR

### **FASE 3: Verificador General (5 horas)**
1. **VG-001:** Dependencias cámara React
2. **VG-002:** Componente QRScanner
3. **VG-003:** Endpoint buscar usuario
4. **VG-004:** Endpoint confirmar asistencia
5. **VG-005:** Componente VerificadorGeneral
6. **VG-006:** Ruta /verificar

### **FASE 4: Verificador Sala (6 horas)**
1. **VS-001:** Endpoint eventos
2. **VS-002:** Endpoint verificar sala
3. **VS-003:** Endpoint asistentes por evento
4. **VS-004:** Componente SelectorCharlas
5. **VS-005:** Componente VerificadorSala
6. **VS-006:** Componente ListaAsistentes
7. **VS-007:** Ruta /verificarSala

### **FASE 5: Testing (3 horas)**
1. **TO-001:** Testing QR
2. **TO-002:** Testing verificadores
3. **TO-003:** Optimización
4. **TO-004:** Documentación

---

## **🔧 COMANDOS CLAVE**

### **Estructura QR**
```
Formato: {3_LETRAS_NOMBRE}|{DNI}|{CARGO}|{EMPRESA}|{TIMESTAMP}
Ejemplo: JUA|12345678|Director|TechCorp|1703875234
```

### **Nuevas Tablas SQL**
```sql
-- Asistencias generales
CREATE TABLE expokossodo_asistencias_generales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registro_id INT NOT NULL,
    qr_escaneado VARCHAR(500) NOT NULL,
    fecha_escaneo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verificado_por VARCHAR(100) DEFAULT 'Sistema',
    ip_verificacion VARCHAR(45),
    FOREIGN KEY (registro_id) REFERENCES expokossodo_registros(id) ON DELETE CASCADE
);

-- Asistencias por sala
CREATE TABLE expokossodo_asistencias_por_sala (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registro_id INT NOT NULL,
    evento_id INT NOT NULL,
    qr_escaneado VARCHAR(500) NOT NULL,
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    asesor_verificador VARCHAR(100) NOT NULL,
    ip_verificacion VARCHAR(45),
    notas TEXT,
    FOREIGN KEY (registro_id) REFERENCES expokossodo_registros(id) ON DELETE CASCADE,
    FOREIGN KEY (evento_id) REFERENCES expokossodo_eventos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_registro_evento_ingreso (registro_id, evento_id)
);
```

### **Nuevas Rutas**
- `/verificar` - Verificador general de asistencia
- `/verificarSala` - Verificador por sala específica
- `/api/verificar/buscar-usuario` - POST - Buscar usuario por QR
- `/api/verificar/confirmar-asistencia` - POST - Confirmar asistencia general
- `/api/verificar-sala/eventos` - GET - Lista de eventos para verificar
- `/api/verificar-sala/verificar` - POST - Verificar acceso a sala
- `/api/verificar-sala/asistentes/:evento_id` - GET - Asistentes de evento

---

## **📱 FLUJOS IMPLEMENTADOS**

### **Flujo 1: Registro → QR**
```
Usuario se registra → Sistema genera QR → Guarda en BD → Envía por email
```

### **Flujo 2: Verificación General**
```
Staff abre /verificar → Escanea QR → Ve info usuario → Confirma asistencia
```

### **Flujo 3: Verificación por Sala**
```
Asesor abre /verificarSala → Selecciona charla → Escanea QR → Registra ingreso
```

---

## **⚠️ CONSIDERACIONES IMPORTANTES**

### **Seguridad**
- Validar formato QR antes de procesar
- Sanitizar datos escaneados
- Rate limiting en endpoints de verificación
- HTTPS requerido para acceso a cámara

### **UX/UI**
- Feedback visual inmediato al escanear
- Estados claros (loading/success/error)
- Responsive para móviles
- Instrucciones claras para usuarios

### **Rendimiento**
- Caché datos de usuarios frecuentes
- Índices optimizados en BD
- Compresión de imágenes QR
- Tiempo respuesta < 3 segundos

---

## **🎯 PRÓXIMOS PASOS**

1. **Revisar PRD completo:** `PRD_SISTEMA_QR_VERIFICACION.md`
2. **Seguir Task Master:** `TASK_MASTER_QR_VERIFICATION.json`
3. **Implementar fase por fase según cronograma**
4. **Testing exhaustivo en cada fase**
5. **Documentar cambios realizados**

---

## **📞 SOPORTE**

Si encuentras problemas durante la implementación:
1. Consultar acceptance criteria en cada task
2. Revisar logs de error específicos
3. Verificar dependencias instaladas
4. Comprobar permisos de cámara en browser

¡Éxito en la implementación! 🚀 