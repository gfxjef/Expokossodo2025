# Configuración del archivo .env

## **IMPORTANTE**: Crear archivo .env en la carpeta backend/

Crea un archivo llamado `.env` en la carpeta `backend/` con el siguiente contenido:

```bash
# Database Configuration
DB_HOST=atusaludlicoreria.com
DB_NAME=atusalud_kossomet
DB_PASSWORD=kmachin1
DB_PORT=3306
DB_USER=atusalud_atusalud

# Email Configuration
EMAIL_PASSWORD=kfmklqrzzrengbhk
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
```

## **Pasos para crear el archivo .env:**

1. Navega a la carpeta `backend/`
2. Crea un archivo llamado `.env` (sin extensión)
3. Copia y pega el contenido de arriba
4. Guarda el archivo

## **Verificar que funciona:**

Una vez creado el archivo .env, ejecuta:
```bash
cd backend
python app.py
```

El servidor debería iniciarse correctamente y mostrar:
- ✅ Base de datos inicializada correctamente
- 🌐 Servidor corriendo en http://localhost:5000 