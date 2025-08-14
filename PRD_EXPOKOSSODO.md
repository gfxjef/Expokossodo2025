# PRD - Sistema de Registro ExpoKossodo 2024

## **Información General**
- **Producto**: Sistema de Registro para ExpoKossodo 2024
- **Fecha de Creación**: $(date)
- **Versión**: 1.0
- **Responsable**: Equipo de Desarrollo

## **1. Resumen Ejecutivo**

### **Objetivo Principal**
Desarrollar un sistema web completo para el registro de participantes en ExpoKossodo 2024, permitiendo la selección de eventos por calendario interactivo y gestión automatizada de confirmaciones.

### **Problema a Resolver**
- Necesidad de un sistema eficiente para registrar participantes en un evento de 4 días
- Control de capacidad de salas (60 personas máximo por evento)
- Prevención de conflictos de horarios (una selección por franja horaria)
- Automatización de confirmaciones por email

### **Solución Propuesta**
Sistema web con frontend en React y backend en Python/Flask que permita:
- Navegación por calendario de eventos
- Selección intuitiva con validaciones
- Formulario de registro completo
- Confirmación automática por email

## **2. Especificaciones Funcionales**

### **2.1 Funcionalidades Principales**

#### **Frontend (React + Tailwind)**
- **F001**: Calendario navegable por fechas (22, 23, 24, 25 Julio)
- **F002**: Visualización de eventos por horario/sala (5 horarios × 4 salas)
- **F003**: Selección única por horario con validación visual
- **F004**: Animaciones profesionales con Framer Motion
- **F005**: Formulario de registro con validaciones
- **F006**: Diseño responsive y moderno

#### **Backend (Python/Flask)**
- **F007**: API REST para gestión de eventos y registros
- **F008**: Conexión a MySQL con tablas prefijadas "expokossodo_"
- **F009**: Control de capacidad (60 personas/sala)
- **F010**: Envío de emails de confirmación
- **F011**: Validaciones de horarios únicos
- **F012**: Endpoints para reportes y estadísticas

### **2.2 Estructura de Datos**

#### **Tabla: expokossodo_eventos**
```sql
- id (INT, PRIMARY KEY)
- fecha (DATE)
- hora (VARCHAR)
- sala (VARCHAR)
- titulo_charla (VARCHAR)
- expositor (VARCHAR)
- pais (VARCHAR)
- slots_disponibles (INT, DEFAULT 60)
- slots_ocupados (INT, DEFAULT 0)
```

#### **Tabla: expokossodo_registros**
```sql
- id (INT, PRIMARY KEY)
- nombres (VARCHAR)
- correo (VARCHAR)
- empresa (VARCHAR)
- cargo (VARCHAR)
- numero (VARCHAR)
- expectativas (TEXT)
- eventos_seleccionados (JSON)
```

#### **Tabla: expokossodo_registro_eventos**
```sql
- id (INT, PRIMARY KEY)
- registro_id (INT, FK)
- evento_id (INT, FK)
```

### **2.3 Flujo de Usuario**

1. **Selección de Eventos**:
   - Usuario navega por fechas (22-25 Julio)
   - Visualiza calendario con 5 horarios × 4 salas
   - Selecciona eventos (máximo uno por horario)
   - Recibe validación visual y mensajes de error/éxito

2. **Registro Personal**:
   - Completa formulario con datos personales
   - Revisa resumen de eventos seleccionados
   - Confirma registro

3. **Confirmación**:
   - Sistema valida disponibilidad final
   - Actualiza contadores de capacidad
   - Envía email de confirmación automático

### **2.4 Validaciones de Negocio**

- **V001**: Máximo 60 personas por evento
- **V002**: Una selección por franja horaria
- **V003**: Al menos un evento debe ser seleccionado
- **V004**: Email válido y único por registro
- **V005**: Todos los campos del formulario son obligatorios

## **3. Especificaciones Técnicas**

### **3.1 Stack Tecnológico**

#### **Frontend**
- React 18.2.0
- Tailwind CSS 3.3.0
- Framer Motion 10.16.4
- Axios para API calls
- React Hot Toast para notificaciones
- Lucide React para iconos

#### **Backend**
- Python 3.8+
- Flask 2.3.3
- MySQL 8.0+
- Flask-CORS para CORS
- mysql-connector-python
- python-dotenv
- smtplib para emails

### **3.2 Configuración de Entorno**

#### **Variables de Entorno (.env)**
```bash
# Database
DB_HOST=to1.fcomet.com
DB_NAME=atusalud_kossomet
DB_PASSWORD=####
DB_PORT=3306
DB_USER=atusalud_atusalud

# Email
EMAIL_PASSWORD=kfmklqrzzrengbhk
EMAIL_USER=jcamacho@kossodo.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Flask
FLASK_ENV=development
FLASK_PORT=5000
SECRET_KEY=expokossodo-secret-key-2024
```

### **3.3 API Endpoints**

#### **Eventos**
- `GET /api/eventos` - Obtener calendario completo
- `GET /api/stats` - Estadísticas del evento

#### **Registros**
- `POST /api/registro` - Crear nuevo registro
- `GET /api/registros` - Listar registros (admin)

### **3.4 Estructura de Proyecto**
```
proyecto/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── src/
    │   ├── components/
    │   ├── services/
    │   └── ...
    └── public/
```

## **4. Criterios de Aceptación**

### **4.1 Funcionales**
- [ ] Usuario puede navegar entre las 4 fechas del evento
- [ ] Sistema muestra calendario 5×4 (horarios×salas) por fecha
- [ ] Usuario puede seleccionar máximo un evento por horario
- [ ] Sistema valida capacidad de 60 personas por evento
- [ ] Formulario de registro captura todos los datos requeridos
- [ ] Email de confirmación se envía automáticamente
- [ ] Base de datos se actualiza correctamente

### **4.2 No Funcionales**
- [ ] Interfaz responsive para móvil y desktop
- [ ] Animaciones fluidas y profesionales
- [ ] Tiempo de respuesta < 3 segundos
- [ ] Manejo de errores con mensajes claros
- [ ] Código documentado y mantenible

### **4.3 Técnicos**
- [ ] Tablas MySQL se crean automáticamente al iniciar
- [ ] API maneja errores correctamente
- [ ] Frontend maneja estados de carga y error
- [ ] Validaciones tanto en frontend como backend
- [ ] Logs de errores para debugging

## **5. Plan de Implementación**

### **Fase 1: Configuración Base** (Task 1-3)
- Configurar entorno de desarrollo
- Crear estructura de proyecto
- Configurar base de datos

### **Fase 2: Backend API** (Task 4-6)
- Implementar modelos de datos
- Crear endpoints de API
- Sistema de emails

### **Fase 3: Frontend Base** (Task 7-9)
- Setup React + Tailwind
- Componentes básicos
- Integración con API

### **Fase 4: Funcionalidades Principales** (Task 10-12)
- Calendario interactivo
- Sistema de selección
- Formulario de registro

### **Fase 5: Testing e Integración** (Task 13-15)
- Testing completo
- Optimizaciones
- Deploy y documentación

## **6. Riesgos y Mitigaciones**

### **Riesgos Identificados**
1. **Conexión a base de datos externa**: Validar credenciales temprano
2. **Capacidad de email SMTP**: Configurar límites y fallbacks
3. **Concurrencia en registros**: Implementar transacciones atómicas
4. **Performance en calendario**: Optimizar queries y caching

### **Mitigaciones**
- Testing exhaustivo de conexiones
- Manejo de errores robusto
- Validaciones redundantes (frontend + backend)
- Monitoreo de performance

## **7. Métricas de Éxito**

### **KPIs Técnicos**
- 0% errores en producción
- < 3 segundos tiempo de carga
- 100% emails entregados
- 0 conflictos de horarios

### **KPIs de Negocio**
- Registro exitoso de todos los participantes
- 0 problemas de capacidad
- Satisfacción del usuario (feedback positivo)

---

**Estatus**: ✅ APROBADO
**Próximo Paso**: Creación de tareas detalladas con Task Master 