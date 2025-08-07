#!/bin/bash

# Script de inicio para producción en Render

echo "🚀 Iniciando servidor en producción..."

# Configurar variables de entorno
export FLASK_ENV=production
export PYTHONUNBUFFERED=1

# Verificar conexión a base de datos
echo "🔍 Verificando conexión a base de datos..."
python -c "
import mysql.connector
import os
from dotenv import load_dotenv
load_dotenv()

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=int(os.getenv('DB_PORT', 3306)),
        connection_timeout=10
    )
    print('✅ Conexión a base de datos exitosa')
    conn.close()
except Exception as e:
    print(f'⚠️ Error conectando a base de datos: {e}')
    print('Continuando de todas formas...')
"

# Iniciar Gunicorn con configuración optimizada
echo "🏃 Iniciando Gunicorn..."
exec gunicorn app:app --config gunicorn_config.py