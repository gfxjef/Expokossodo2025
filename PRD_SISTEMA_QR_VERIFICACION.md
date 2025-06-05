# PRD - Sistema de QR y Verificación de Asistencia
## ExpoKossodo 2024 - Módulo de Control de Acceso

### **📋 RESUMEN EJECUTIVO**
Expandir el sistema ExpoKossodo 2024 con funcionalidades de generación de códigos QR únicos para cada asistente y sistema de verificación de asistencia en tiempo real para control de acceso a charlas y salas.

### **🎯 OBJETIVOS PRINCIPALES**
- Generar códigos QR únicos para cada usuario registrado
- Implementar sistema de verificación de asistencia general
- Crear sistema de verificación por sala específica
- Controlar acceso y asistencia en tiempo real
- Mantener registro detallado de asistencias por evento

---

## **📊 FUNCIONALIDADES DETALLADAS**

### **1. GENERACIÓN DE CÓDIGO QR AL REGISTRO**

#### **1.1 Creación del QR**
- **Trigger:** Al completar registro exitoso
- **Contenido del QR:** `{3_LETRAS_NOMBRE}|{DNI}|{CARGO}|{EMPRESA}|{TIMESTAMP_SEGUNDO}`
- **Formato:** Texto plano separado por pipes (|)
- **Ejemplo:** `JUA|12345678|Director|TechCorp|1703875234`

#### **1.2 Almacenamiento**
- Guardar texto del QR en nueva columna `qr_code` de tabla `expokossodo_registros`
- Generar imagen QR en formato PNG
- Almacenar imagen temporalmente para envío por email

#### **1.3 Envío por Email**
- Adjuntar imagen QR al email de confirmación existente
- Instrucciones de uso del QR en el correo
- Diseño responsive del email con QR visible

---

### **2. RUTA /verificar - VERIFICADOR DE ASISTENCIA GENERAL**

#### **2.1 Interfaz**
- **Layout:** 2 columnas (50% - 50%)
- **Columna Izquierda:** Escáner de cámara activo
- **Columna Derecha:** Información del asistente

#### **2.2 Funcionalidad de Escaneo**
- Activar cámara automáticamente al cargar página
- Detectar y decodificar códigos QR en tiempo real
- Validar formato del QR escaneado
- Buscar usuario en base de datos

#### **2.3 Información Mostrada**
Al escanear QR válido mostrar:
- **Datos Personales:** Nombre, empresa, cargo, email
- **Eventos Registrados:** Lista de todas las charlas inscritas
- **Estado de Asistencia:** Por cada evento (Presente/Ausente/Pendiente)
- **Estadísticas:** Total eventos, asistencias confirmadas

#### **2.4 Registro de Asistencia**
- Botón "Confirmar Asistencia General" 
- Marcar asistencia global del usuario
- Timestamp de confirmación
- Cambio visual de estado (verde = confirmado)

---

### **3. RUTA /verificarSala - VERIFICADOR POR SALA**

#### **3.1 Selección de Charla**
- **Vista Principal:** Grid/Lista de todas las charlas disponibles
- **Filtros:** Por fecha, hora, sala, estado
- **Información por Charla:** Título, expositor, capacidad, asistentes actuales

#### **3.2 Vista de Charla Específica**
Al seleccionar una charla:
- **Header:** Información de la charla seleccionada
- **Columna Izquierda:** Escáner QR activo
- **Columna Derecha:** Lista de asistentes registrados + nuevos escaneos

#### **3.3 Proceso de Verificación**
1. Asesor selecciona charla desde su dispositivo
2. Cliente muestra QR personal
3. Asesor escanea QR del cliente
4. Sistema valida:
   - QR válido y existente
   - Usuario registrado en esa charla específica
   - No registrado previamente en esa sesión
5. Registro de ingreso a sala

#### **3.4 Control de Acceso**
- **Validaciones:**
  - Usuario debe estar registrado en esa charla
  - No puede ingresar dos veces a la misma charla
  - Verificar capacidad de sala
- **Estados:** Registrado/Presente/Ausente
- **Notificaciones:** Feedback visual y sonoro para el asesor

---

## **🗄️ NUEVAS TABLAS DE BASE DE DATOS**

### **Tabla: `expokossodo_asistencias_generales`**
```sql
CREATE TABLE expokossodo_asistencias_generales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registro_id INT NOT NULL,
    qr_escaneado VARCHAR(500) NOT NULL,
    fecha_escaneo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verificado_por VARCHAR(100) DEFAULT 'Sistema',
    ip_verificacion VARCHAR(45),
    FOREIGN KEY (registro_id) REFERENCES expokossodo_registros(id) ON DELETE CASCADE,
    INDEX idx_registro_fecha (registro_id, fecha_escaneo)
);
```

### **Tabla: `expokossodo_asistencias_por_sala`**
```sql
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
    UNIQUE KEY unique_registro_evento_ingreso (registro_id, evento_id),
    INDEX idx_evento_fecha (evento_id, fecha_ingreso)
);
```

### **Modificación tabla existente: `expokossodo_registros`**
```sql
ALTER TABLE expokossodo_registros 
ADD COLUMN qr_code VARCHAR(500) AFTER eventos_seleccionados,
ADD COLUMN qr_generado_at TIMESTAMP NULL AFTER qr_code,
ADD COLUMN asistencia_general_confirmada BOOLEAN DEFAULT FALSE AFTER qr_generado_at,
ADD COLUMN fecha_asistencia_general TIMESTAMP NULL AFTER asistencia_general_confirmada;
```

---

## **🛠️ TECNOLOGÍAS REQUERIDAS**

### **Backend (Python/Flask)**
- `qrcode` - Generación de códigos QR
- `Pillow` - Manipulación de imágenes
- `email.mime` - Envío de emails con adjuntos
- Endpoints nuevos para verificación

### **Frontend (React)**
- `react-qr-scanner` o `html5-qrcode` - Escáneo de QR
- `react-webcam` - Acceso a cámara
- Nuevos componentes para verificación
- Estados de verificación en tiempo real

### **Base de Datos (MySQL)**
- Nuevas tablas de asistencias
- Índices optimizados para consultas frecuentes
- Triggers para logs automáticos

---

## **📱 FLUJOS DE USUARIO**

### **Flujo 1: Registro con QR**
1. Usuario completa registro → 
2. Sistema genera QR único → 
3. Guarda QR en BD → 
4. Envía email con QR adjunto → 
5. Usuario recibe QR para usar en evento

### **Flujo 2: Verificación General (/verificar)**
1. Staff abre verificador general → 
2. Activa cámara → 
3. Usuario muestra QR → 
4. Staff escanea QR → 
5. Sistema muestra info + eventos del usuario → 
6. Staff confirma asistencia general

### **Flujo 3: Verificación por Sala (/verificarSala)**
1. Asesor selecciona charla específica → 
2. Activa cámara para esa sala → 
3. Usuario muestra QR → 
4. Asesor escanea QR → 
5. Sistema valida registro en esa charla → 
6. Registra ingreso a sala específica

---

## **⚡ CONSIDERACIONES TÉCNICAS**

### **Rendimiento**
- Caché de información de usuarios frecuentes
- Índices optimizados para búsquedas por QR
- Compresión de imágenes QR

### **Seguridad**
- Validación de formato QR
- Sanitización de datos escaneados
- Rate limiting para endpoints de verificación
- Logs de todas las verificaciones

### **UX/UI**
- Feedback visual inmediato al escanear
- Estados claros (exitoso/error/pendiente)
- Responsive design para dispositivos móviles
- Modo oscuro para mejor lectura en ambientes de poca luz

---

## **📊 MÉTRICAS DE ÉXITO**
- Tiempo promedio de verificación < 3 segundos
- 99% de precisión en lectura de QR
- 0% de ingresos duplicados por charla
- Satisfacción del staff verificador > 4.5/5

---

## **🚀 PLAN DE IMPLEMENTACIÓN**
Ver archivo `TASK_MASTER_QR_VERIFICATION.json` para desglose detallado de tareas y cronograma. 