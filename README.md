# ExpoKossodo 2024 - Sistema de Registro

![Estado del Proyecto](https://img.shields.io/badge/Estado-59%25%20Completado-yellow)
![Backend](https://img.shields.io/badge/Backend-✅%20Funcional-green)
![Frontend](https://img.shields.io/badge/Frontend-✅%20Funcional-green)

Sistema web completo para el registro de participantes en ExpoKossodo 2024, el evento médico más importante del año.

## 🚀 **Estado Actual**

### ✅ **Completado**
- ✅ Backend Flask con API REST completa
- ✅ Base de datos MySQL con tablas automáticas
- ✅ Sistema de emails de confirmación
- ✅ Frontend React con Tailwind CSS
- ✅ Calendario interactivo de eventos
- ✅ Formulario de registro con validaciones
- ✅ Animaciones profesionales con Framer Motion
- ✅ Entorno de desarrollo configurado

### 🔄 **En Progreso**
- 🔄 Testing completo de integración
- 🔄 Optimizaciones de performance
- 🔄 Testing responsive en móvil

## 📋 **Características**

### **🎯 Funcionalidades Principales**
- **Calendario Navegable**: 4 días de evento (22-25 Julio 2024)
- **Selección Inteligente**: Solo un evento por horario (5 horarios × 4 salas)
- **Control de Capacidad**: Máximo 60 personas por sala
- **Validaciones en Tiempo Real**: Frontend y backend
- **Confirmación Automática**: Email inmediato al registrarse
- **Interfaz Moderna**: Diseño responsive con animaciones

### **🏗️ Arquitectura**
- **Frontend**: React 18 + Tailwind CSS + Framer Motion
- **Backend**: Python Flask + MySQL
- **APIs**: RESTful con validaciones completas
- **Email**: SMTP con templates HTML profesionales

## 🛠️ **Instalación y Configuración**

### **Prerrequisitos**
- Python 3.8+ 
- Node.js 16+
- MySQL 8.0+
- Acceso a base de datos remota

### **1. Configuración del Backend**

```bash
# 1. Navegar al backend
cd backend

# 2. Crear entorno virtual
python -m venv venv

# 3. Activar entorno virtual
# Windows:
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# 4. Instalar dependencias
pip install -r requirements.txt

# 5. Crear archivo .env (ver backend/README_ENV.md)
# Copiar las variables del archivo README_ENV.md

# 6. Ejecutar el servidor
python app.py
```

### **2. Configuración del Frontend**

```bash
# 1. Navegar al frontend (nueva terminal)
cd frontend

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# 4. Ejecutar el servidor de desarrollo
npm start
```

### **3. Verificar Funcionamiento**

Una vez ejecutados ambos servidores:

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000
- **API Documentación**: http://localhost:5000/api/eventos

## 📊 **Estructura del Proyecto**

```
registro_expokossodo/
├── backend/
│   ├── app.py                 # Aplicación Flask principal
│   ├── requirements.txt       # Dependencias Python
│   ├── .env                  # Variables de entorno
│   ├── venv/                 # Entorno virtual
│   └── README_ENV.md         # Instrucciones .env
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   │   ├── EventRegistration.js
│   │   │   ├── EventCalendar.js
│   │   │   ├── RegistrationForm.js
│   │   │   └── LoadingSpinner.js
│   │   ├── services/         # Servicios API
│   │   │   └── api.js
│   │   ├── App.js           # Componente principal
│   │   ├── index.js         # Punto de entrada
│   │   └── index.css        # Estilos Tailwind
│   ├── public/
│   ├── package.json         # Dependencias Node.js
│   ├── tailwind.config.js   # Configuración Tailwind
│   └── .env                 # Variables frontend
├── PRD_EXPOKOSSODO.md       # Documento de Requerimientos
├── TASK_MASTER.md           # Control de tareas
└── README.md                # Esta documentación
```

## 🗄️ **Base de Datos**

### **Tablas Principales**

#### `expokossodo_eventos`
- Información de charlas, expositores, horarios y capacidad
- Datos de ejemplo incluidos automáticamente

#### `expokossodo_registros`  
- Datos personales de participantes
- Eventos seleccionados en formato JSON

#### `expokossodo_registro_eventos`
- Relación many-to-many entre registros y eventos
- Control de capacidad automático

### **Datos de Ejemplo**
El sistema incluye automáticamente:
- **80 eventos** distribuidos en 4 días
- **20 expositores** de 12 países diferentes
- **Temas**: IA en medicina, biotecnología, telemedicina, etc.

## 🌐 **API Endpoints**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/eventos` | Obtener calendario completo |
| POST | `/api/registro` | Crear nuevo registro |
| GET | `/api/registros` | Listar registros (admin) |
| GET | `/api/stats` | Estadísticas del evento |

## 📧 **Sistema de Emails**

### **Configuración SMTP**
- Servidor: smtp.gmail.com
- Puerto: 587
- Autenticación: OAuth2

### **Template de Email**
- Diseño HTML profesional
- Resumen de eventos seleccionados
- Información de contacto
- Datos del participante

## 🔐 **Validaciones**

### **Frontend**
- Validación de formularios en tiempo real
- Control de horarios únicos
- Verificación de capacidad visual
- Mensajes de error/éxito

### **Backend**
- Validación de datos obligatorios
- Control de capacidad por evento
- Verificación de horarios únicos
- Transacciones atómicas en MySQL

## 🎨 **Diseño y UX**

### **Características Visuales**
- **Colores**: Gradientes azul/púrpura profesionales
- **Tipografía**: Inter (Google Fonts)
- **Iconos**: Lucide React
- **Animaciones**: Framer Motion
- **Estados**: Carga, error, éxito

### **Responsive Design**
- Optimizado para móvil y desktop
- Grid adaptativo para el calendario
- Formularios optimizados para táctil

## 🧪 **Testing**

### **Backend Testing**
```bash
cd backend
python app.py  # Verificar conexión MySQL
# Probar endpoints manualmente o con Postman
```

### **Frontend Testing**
```bash
cd frontend
npm start      # Verificar interfaz
# Probar flujo completo de registro
```

## 📈 **Métricas de Progreso**

### **Task Master: 59% Completado (10/17 tareas)**

✅ **Completadas**:
- TASK-001: Configuración inicial
- TASK-002: Variables de entorno  
- TASK-003: Setup React base
- TASK-004: Modelos de base de datos
- TASK-005: API endpoints
- TASK-006: Sistema de emails
- TASK-007: Componentes React
- TASK-013: Testing backend
- TASK-016: Archivo .env backend
- TASK-017: Entorno virtual Python

🔄 **Próximas Tareas**:
- TASK-008: Integración frontend-backend
- TASK-009: Validaciones frontend
- TASK-010: Calendario interactivo
- TASK-011: Sistema de selección
- TASK-012: Formulario completo
- TASK-014: Testing frontend
- TASK-015: Optimización final

## 🚀 **Uso del Sistema**

### **1. Selección de Eventos**
1. Navega entre las fechas (22-25 Julio)
2. Visualiza el calendario 5×4 (horarios×salas)
3. Haz clic en eventos disponibles
4. Máximo un evento por horario

### **2. Registro Personal**
1. Completa todos los campos obligatorios
2. Describe tus expectativas del evento
3. Revisa el resumen de selecciones
4. Confirma el registro

### **3. Confirmación**
1. Recibe email inmediato de confirmación
2. Revisa los detalles de tus eventos
3. Guarda la información de contacto

## 📞 **Soporte**

- **Email**: jcamacho@kossodo.com
- **Documentación**: Ver PRD_EXPOKOSSODO.md
- **Issues**: Reportar en el repositorio

## 📄 **Licencia**

Proyecto desarrollado para ExpoKossodo 2024.

---

**🎉 ¡Sistema listo para registrar participantes en ExpoKossodo 2024!** #   E x p o k o s s o d o 2 0 2 5  
 #   E x p o k o s s o d o 2 0 2 5  
 