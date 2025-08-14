# Configuración del archivo .env

## **IMPORTANTE**: Crear archivo .env en la carpeta backend/

Crea un archivo llamado `.env` en la carpeta `backend/` con el siguiente contenido:

```bash
# Database Configuration
DB_HOST=to1.fcomet.com
DB_NAME=atusalud_kossomet
DB_PASSWORD=######
DB_PORT=3306
DB_USER=atusalud_atusalud

# Email Configuration
EMAIL_PASSWORD=###
EMAIL_USER=jcamacho@kossodo.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000

# Security
SECRET_KEY=expokossodo-secret-key-2024

# API Configuration
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# OpenAI Configuration (NUEVO - Requerido para el Chat con RAG)
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
OPENAI_ASSISTANT_ID=asst-tu-assistant-id-aqui
OPENAI_VECTOR_STORE_ID=vs_67d2546ee78881918ebeb8ff16697cc1
```

## **Configuración de OpenAI (NUEVO):**

Para que el chat con RAG funcione, necesitas:

1. **OPENAI_API_KEY**: Tu clave API de OpenAI
   - Obtén una en: https://platform.openai.com/api-keys

2. **OPENAI_ASSISTANT_ID**: El ID de tu asistente
   - Ve a: https://platform.openai.com/assistants
   - Crea un nuevo asistente con:
     - Modelo: `gpt-3.5-turbo`
     - Herramientas: Activa "File Search"
     - Vector Store: Adjunta el vector store `vs_67d2546ee78881918ebeb8ff16697cc1`
   - Copia el ID del asistente (formato: `asst_...`)

3. **OPENAI_VECTOR_STORE_ID**: Ya configurado con el valor proporcionado

## **Pasos para crear el archivo .env:**

1. Navega a la carpeta `backend/`
2. Crea un archivo llamado `.env` (sin extensión)
3. Copia y pega el contenido de arriba
4. Reemplaza los valores de OpenAI con tus credenciales reales
5. Guarda el archivo

## **Verificar que funciona:**

Una vez creado el archivo .env, ejecuta:
```bash
cd backend
python app.py
```

El servidor debería iniciarse correctamente y mostrar:
- ✅ Base de datos inicializada correctamente
- 🌐 Servidor corriendo en http://localhost:5000 