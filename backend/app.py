from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import qrcode
from PIL import Image
import io
import bcrypt
import time
import re
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from openai import OpenAI

# Cargar variables de entorno desde .env
load_dotenv()

# --- CONFIGURACIÓN ---
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')

# Configuración de CORS más permisiva para producción
# Permitir múltiples orígenes incluyendo localhost para desarrollo
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://expokossodo2025.vercel.app",
    "https://*.vercel.app",  # Permitir todos los subdominios de Vercel
    "https://*.ngrok-free.app",  # Permitir todos los subdominios de ngrok
    "https://*.ngrok.io",  # Permitir también ngrok.io
    "https://expokossodo.grupokossodo.com/",
    "https://www.grupokossodo.com",
    "https://grupokossodo.com"
]

CORS(app, 
     resources={
         r"/*": {
             "origins": allowed_origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": True,
             "max_age": 3600
         }
     })

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

# Configuración de OpenAI
# Asegúrate de tener estas variables en tu archivo .env
openai_api_key = os.getenv('OPENAI_API_KEY')
assistant_id = os.getenv('OPENAI_ASSISTANT_ID')
vector_store_id = os.getenv('OPENAI_VECTOR_STORE_ID', 'vs_67d2546ee78881918ebeb8ff16697cc1')  # Valor por defecto

# Inicializar cliente con header beta para v2
client = OpenAI(
    api_key=openai_api_key,
    default_headers={"OpenAI-Beta": "assistants=v2"}
)

# Almacenamiento en memoria para hilos de conversación (para producción, usar una base de datos)
threads_in_memory = {}

# Middleware para manejar solicitudes OPTIONS (preflight)
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        # Responder a las solicitudes preflight
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,ngrok-skip-browser-warning")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Middleware para logging de solicitudes
@app.before_request
def log_request_info():
    print(f"🔍 {request.method} {request.path} from {request.remote_addr}")
    print(f"   Origin: {request.headers.get('Origin', 'No origin')}")
    if request.method in ['POST', 'PUT'] and request.is_json:
        print(f"   Body preview: {str(request.get_json())[:100]}...")

# Agregar headers CORS después de cada respuesta
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        # Verificar si ya existe el header para evitar duplicados
        if not response.headers.get('Access-Control-Allow-Origin'):
            # Verificar si el origen está en la lista permitida
            allowed_origins = [
                "http://localhost:3000",
                "http://localhost:3001", 
                "https://expokossodo2025.vercel.app"
            ]
            
            # También permitir cualquier subdominio de vercel.app y ngrok
            if (origin in allowed_origins or 
                origin.endswith('.vercel.app') or 
                origin.endswith('.ngrok-free.app') or 
                origin.endswith('.ngrok.io')):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
    
    return response

# --- CONEXIÓN A LA BASE DE DATOS ---
def get_db_connection():
    """Crear conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

# ===== FUNCIONES DE GENERACIÓN QR =====

def generar_texto_qr(nombres, numero, cargo, empresa):
    """
    Generar texto QR con formato: {3_LETRAS_NOMBRE}|{DNI}|{CARGO}|{EMPRESA}|{TIMESTAMP}
    
    Args:
        nombres (str): Nombre completo del usuario
        numero (str): Número de documento/DNI 
        cargo (str): Cargo del usuario
        empresa (str): Empresa del usuario
    
    Returns:
        str: Texto QR formateado
    """
    try:
        # Obtener primeras 3 letras del nombre (solo letras)
        nombres_clean = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑ]', '', nombres.upper())
        tres_letras = nombres_clean[:3].ljust(3, 'X')  # Rellenar con X si es muy corto
        
        # Limpiar campos para evitar problemas con pipe |
        numero_clean = str(numero).replace('|', '-')
        cargo_clean = str(cargo).replace('|', '-')
        empresa_clean = str(empresa).replace('|', '-')
        
        # Generar timestamp único en segundos
        timestamp = int(time.time())
        
        # Crear texto QR
        qr_text = f"{tres_letras}|{numero_clean}|{cargo_clean}|{empresa_clean}|{timestamp}"
        
        return qr_text
        
    except Exception as e:
        print(f"Error generando texto QR: {e}")
        return None

def generar_imagen_qr(qr_text):
    """
    Generar imagen QR a partir del texto
    
    Args:
        qr_text (str): Texto para convertir en QR
    
    Returns:
        bytes: Imagen QR en formato PNG como bytes
    """
    try:
        # Configurar generador QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Agregar datos y generar
        qr.add_data(qr_text)
        qr.make(fit=True)
        
        # Crear imagen
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a bytes
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_bytes = img_buffer.getvalue()
        
        return img_bytes
        
    except Exception as e:
        print(f"Error generando imagen QR: {e}")
        return None

def validar_formato_qr(qr_text):
    """
    Validar que el texto QR tenga el formato correcto
    
    Args:
        qr_text (str): Texto QR a validar
    
    Returns:
        dict: {valid: bool, parsed: dict o None}
    """
    try:
        if not qr_text or not isinstance(qr_text, str):
            return {"valid": False, "parsed": None}
        
        # Dividir por pipes
        parts = qr_text.split('|')
        
        if len(parts) != 5:
            return {"valid": False, "parsed": None}
        
        tres_letras, numero, cargo, empresa, timestamp = parts
        
        # Validaciones básicas
        if len(tres_letras) != 3 or not tres_letras.isalpha():
            return {"valid": False, "parsed": None}
        
        if not numero or not cargo or not empresa:
            return {"valid": False, "parsed": None}
        
        # Validar timestamp
        try:
            timestamp_int = int(timestamp)
        except ValueError:
            return {"valid": False, "parsed": None}
        
        parsed_data = {
            "tres_letras": tres_letras,
            "numero": numero,
            "cargo": cargo,
            "empresa": empresa,
            "timestamp": timestamp_int
        }
        
        return {"valid": True, "parsed": parsed_data}
        
    except Exception as e:
        print(f"Error validando QR: {e}")
        return {"valid": False, "parsed": None}

def init_database():
    """Inicializar tablas de la base de datos"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Tabla de eventos (charlas por día/hora/sala)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_eventos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fecha DATE NOT NULL,
                hora VARCHAR(20) NOT NULL,
                sala VARCHAR(50) NOT NULL,
                titulo_charla VARCHAR(200) NOT NULL,
                expositor VARCHAR(100) NOT NULL,
                pais VARCHAR(50) NOT NULL,
                descripcion TEXT,
                imagen_url VARCHAR(500),
                slots_disponibles INT DEFAULT 60,
                slots_ocupados INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_fecha_hora (fecha, hora),
                INDEX idx_sala (sala)
            )
        """)
        
        # Nueva tabla para gestionar horarios
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_horarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                horario VARCHAR(20) NOT NULL UNIQUE,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_horario (horario),
                INDEX idx_activo (activo)
            )
        """)
        
        # Insertar horarios por defecto si no existen
        horarios_default = ['15:00-15:45', '16:00-16:45', '17:00-17:45', '18:00-18:45', '19:00-19:45']
        for horario in horarios_default:
            cursor.execute("""
                INSERT IGNORE INTO expokossodo_horarios (horario, activo) 
                VALUES (%s, %s)
            """, (horario, True))
        
        # ===== NUEVA TABLA: INFORMACIÓN POR FECHA =====
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_fecha_info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fecha DATE NOT NULL UNIQUE,
                rubro VARCHAR(100) NOT NULL,
                titulo_dia VARCHAR(200) NOT NULL,
                descripcion TEXT,
                ponentes_destacados JSON,
                marcas_patrocinadoras JSON,
                paises_participantes JSON,
                imagen_url VARCHAR(500),
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_fecha (fecha),
                INDEX idx_activo (activo),
                INDEX idx_rubro (rubro)
            )
        """)

        # Insertar información por defecto de fechas
        fechas_info_default = [
            {
                'fecha': '2024-07-22',
                'rubro': 'Inteligencia Artificial y Diagnóstico',
                'titulo_dia': 'Día 1 - IA Revolucionando la Medicina',
                'descripcion': 'Explora cómo la inteligencia artificial está transformando el diagnóstico médico y la atención al paciente.',
                'ponentes_destacados': '["Dr. María González", "Dr. Hiroshi Tanaka", "Prof. Chen Wei"]',
                'marcas_patrocinadoras': '["TechMed Solutions", "AI Healthcare", "MedTech Innovations"]',
                'paises_participantes': '["España", "Japón", "China", "Estados Unidos"]',
                'imagen_url': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
            },
            {
                'fecha': '2024-07-23',
                'rubro': 'Biotecnología y Medicina Regenerativa',
                'titulo_dia': 'Día 2 - Innovación Biotecnológica',
                'descripcion': 'Descubre las últimas innovaciones en biotecnología, terapias génicas y medicina regenerativa.',
                'ponentes_destacados': '["Dr. John Smith", "Dr. Sarah Johnson", "Dr. Pierre Dubois"]',
                'marcas_patrocinadoras': '["BioTech Labs", "RegenerativeMed", "GenTherapy Corp"]',
                'paises_participantes': '["Estados Unidos", "Reino Unido", "Francia", "Alemania"]',
                'imagen_url': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
            },
            {
                'fecha': '2024-07-24',
                'rubro': 'Telemedicina y Salud Digital',
                'titulo_dia': 'Día 3 - Transformación Digital en Salud',
                'descripcion': 'Conoce cómo la telemedicina y las tecnologías digitales están democratizando el acceso a la salud.',
                'ponentes_destacados': '["Dra. Ana Rodríguez", "Dr. Kim Jong-Su", "Dra. Camila Silva"]',
                'marcas_patrocinadoras': '["TeleMed Global", "HealthTech Solutions", "Digital Care"]',
                'paises_participantes': '["México", "Corea del Sur", "Brasil", "Canadá"]',
                'imagen_url': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
            },
            {
                'fecha': '2024-07-25',
                'rubro': 'Especialidades Médicas Avanzadas',
                'titulo_dia': 'Día 4 - Medicina Especializada del Futuro',
                'descripcion': 'Explora los avances en cardiología, neurociencia, oncología y otras especialidades médicas.',
                'ponentes_destacados': '["Dr. Raj Patel", "Dr. Lars Anderson", "Dr. Ahmed Hassan"]',
                'marcas_patrocinadoras': '["CardioTech", "NeuroScience Pro", "OncoMed Innovations"]',
                'paises_participantes': '["India", "Suecia", "Egipto", "Australia"]',
                'imagen_url': 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
            }
        ]

        for fecha_info in fechas_info_default:
            cursor.execute("""
                INSERT IGNORE INTO expokossodo_fecha_info 
                (fecha, rubro, titulo_dia, descripcion, ponentes_destacados, marcas_patrocinadoras, paises_participantes, imagen_url, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                fecha_info['fecha'],
                fecha_info['rubro'], 
                fecha_info['titulo_dia'],
                fecha_info['descripcion'],
                fecha_info['ponentes_destacados'],
                fecha_info['marcas_patrocinadoras'],
                fecha_info['paises_participantes'],
                fecha_info['imagen_url'],
                True
            ))
        
        # Agregar columna descripcion si no existe (para bases de datos existentes)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN descripcion TEXT AFTER pais
            """)
            print("✅ Columna 'descripcion' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'descripcion' ya existe")
            else:
                print(f"Error agregando columna descripcion: {e}")
        
        # Agregar columna imagen_url si no existe (para bases de datos existentes)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN imagen_url VARCHAR(500) AFTER descripcion
            """)
            print("✅ Columna 'imagen_url' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'imagen_url' ya existe")
            else:
                print(f"Error agregando columna imagen_url: {e}")
        
        # Agregar columna disponible si no existe (NUEVA FUNCIONALIDAD)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN disponible BOOLEAN DEFAULT TRUE AFTER slots_ocupados
            """)
            print("✅ Columna 'disponible' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'disponible' ya existe")
            else:
                print(f"Error agregando columna disponible: {e}")
        
        # Tabla de registros de usuarios
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_registros (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombres VARCHAR(100) NOT NULL,
                correo VARCHAR(100) NOT NULL,
                empresa VARCHAR(100) NOT NULL,
                cargo VARCHAR(100) NOT NULL,
                numero VARCHAR(20) NOT NULL,
                expectativas TEXT,
                eventos_seleccionados JSON,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                confirmado BOOLEAN DEFAULT FALSE,
                INDEX idx_correo (correo)
            )
        """)
        
        # Tabla de relación registro-evento (para mejor control)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_registro_eventos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registro_id INT NOT NULL,
                evento_id INT NOT NULL,
                fecha_seleccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registro_id) REFERENCES expokossodo_registros(id) ON DELETE CASCADE,
                FOREIGN KEY (evento_id) REFERENCES expokossodo_eventos(id) ON DELETE CASCADE,
                UNIQUE KEY unique_registro_evento (registro_id, evento_id)
            )
        """)
        
        # ===== NUEVAS TABLAS PARA SISTEMA QR Y VERIFICACIÓN =====
        
        # Tabla de asistencias generales
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_asistencias_generales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registro_id INT NOT NULL,
                qr_escaneado VARCHAR(500) NOT NULL,
                fecha_escaneo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verificado_por VARCHAR(100) DEFAULT 'Sistema',
                ip_verificacion VARCHAR(45),
                FOREIGN KEY (registro_id) REFERENCES expokossodo_registros(id) ON DELETE CASCADE,
                INDEX idx_registro_fecha (registro_id, fecha_escaneo),
                INDEX idx_qr_escaneado (qr_escaneado)
            )
        """)
        
        # Tabla de asistencias por sala específica
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_asistencias_por_sala (
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
                INDEX idx_evento_fecha (evento_id, fecha_ingreso),
                INDEX idx_qr_escaneado (qr_escaneado)
            )
        """)
        
        # Agregar nuevas columnas a tabla expokossodo_registros para QR
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN qr_code VARCHAR(500) AFTER eventos_seleccionados
            """)
            print("✅ Columna 'qr_code' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'qr_code' ya existe")
            else:
                print(f"Error agregando columna qr_code: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN qr_generado_at TIMESTAMP NULL AFTER qr_code
            """)
            print("✅ Columna 'qr_generado_at' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'qr_generado_at' ya existe")
            else:
                print(f"Error agregando columna qr_generado_at: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN asistencia_general_confirmada BOOLEAN DEFAULT FALSE AFTER qr_generado_at
            """)
            print("✅ Columna 'asistencia_general_confirmada' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'asistencia_general_confirmada' ya existe")
            else:
                print(f"Error agregando columna asistencia_general_confirmada: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN fecha_asistencia_general TIMESTAMP NULL AFTER asistencia_general_confirmada
            """)
            print("✅ Columna 'fecha_asistencia_general' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("ℹ️ Columna 'fecha_asistencia_general' ya existe")
            else:
                print(f"Error agregando columna fecha_asistencia_general: {e}")
        
        connection.commit()
        print("✅ Tablas y columnas QR creadas exitosamente")
        
        # Verificar si ya hay datos de ejemplo
        cursor.execute("SELECT COUNT(*) FROM expokossodo_eventos")
        count = cursor.fetchone()[0]
        
        if count == 0:
            populate_sample_data(cursor, connection)
            
        return True
        
    except Error as e:
        print(f"Error creando tablas: {e}")
        return False
    finally:
        cursor.close()
        connection.close()

def populate_sample_data(cursor, connection):
    """Poblar la base de datos con datos de ejemplo"""
    try:
        fechas = ['2024-07-22', '2024-07-23', '2024-07-24', '2024-07-25']
        horarios = ['15:00-15:45', '16:00-16:45', '17:00-17:45', '18:00-18:45', '19:00-19:45']
        salas = ['sala1', 'sala2', 'sala3', 'sala5']
        
        # Datos de ejemplo para las charlas con descripciones
        charlas_data = [
            {
                "titulo": "Inteligencia Artificial en la Medicina", 
                "expositor": "Dr. María González", 
                "pais": "España",
                "descripcion": "## Revolucionando el Diagnóstico Médico\n\nExplora cómo la **inteligencia artificial** está transformando la medicina moderna. Esta presentación aborda:\n\n### Tecnologías Emergentes\n- **Machine Learning** en diagnóstico por imagen\n- Algoritmos de **análisis predictivo**\n- **Redes neuronales** para detección temprana\n\n### Casos de Éxito\n✅ Detección de cáncer con **95% de precisión**\n✅ Diagnóstico de enfermedades cardíacas\n✅ Análisis automatizado de radiografías\n\n### Impacto en el Futuro\nConoce cómo la IA reducirá tiempos de diagnóstico y mejorará la precisión médica en los próximos años.",
                "imagen_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                "titulo": "Innovación en Biotecnología", 
                "expositor": "Dr. John Smith", 
                "pais": "Estados Unidos",
                "descripcion": "## El Futuro de la Biotecnología\n\nUna inmersión profunda en las **innovaciones biotecnológicas** que están cambiando la medicina:\n\n### Terapias Génicas\n- **CRISPR-Cas9** y edición genética\n- Terapias personalizadas\n- Tratamiento de enfermedades raras\n\n### Medicina Regenerativa\n- Células madre y **tissue engineering**\n- Bioimpresión 3D de órganos\n- Medicina personalizada\n\n### Casos Prácticos\n🔬 Desarrollo de nuevos medicamentos\n🧬 Terapias contra el cáncer\n💊 Fármacos biotecnológicos innovadores",
                "imagen_url": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                "titulo": "Telemedicina y Futuro", 
                "expositor": "Dra. Ana Rodríguez", 
                "pais": "México",
                "descripcion": "## Transformación Digital en Salud\n\nDescubre cómo la **telemedicina** está revolucionando la atención médica:\n\n### Tecnologías Actuales\n- Consultas virtuales en tiempo real\n- Monitoreo remoto de pacientes\n- **IoT médico** y wearables\n\n### Beneficios Clave\n✅ **Accesibilidad** universal a la atención médica\n✅ Reducción de costos operativos\n✅ Atención 24/7 desde cualquier lugar\n\n### Casos de Implementación\n📱 Apps móviles de diagnóstico\n🏥 Hospitales virtuales\n📊 Plataformas de seguimiento de pacientes",
                "imagen_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                "titulo": "Robótica Médica Avanzada", 
                "expositor": "Prof. Chen Wei", 
                "pais": "China",
                "descripcion": "## Robots en el Quirófano\n\nExplora las últimas innovaciones en **robótica médica** y cirugía asistida:\n\n### Sistemas Robóticos\n- **Da Vinci Surgical System**\n- Robots de rehabilitación\n- Asistentes quirúrgicos autónomos\n\n### Ventajas Quirúrgicas\n🎯 **Precisión milimétrica** en procedimientos\n⚡ Reducción de tiempo operatorio\n🩹 Mínima invasión y recuperación rápida\n\n### Futuro de la Cirugía\nConoce cómo la robótica permitirá cirugías remotas y procedimientos completamente automatizados.",
                "imagen_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                "titulo": "Genómica Personalizada", 
                "expositor": "Dr. Pierre Dubois", 
                "pais": "Francia",
                "descripcion": "## Medicina de Precisión Genética\n\nDescubre cómo la **genómica personalizada** está revolucionando los tratamientos médicos:\n\n### Secuenciación del ADN\n- **Análisis genómico completo**\n- Identificación de mutaciones\n- Predisposición a enfermedades\n\n### Tratamientos Personalizados\n💊 Farmacogenómica y dosificación precisa\n🧬 Terapias génicas específicas\n📊 Medicina predictiva y preventiva\n\n### Aplicaciones Clínicas\n✅ Oncología personalizada\n✅ Enfermedades hereditarias\n✅ Medicina preventiva basada en genes",
                "imagen_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {"titulo": "Cirugía Mínimamente Invasiva", "expositor": "Dr. Giuseppe Rossi", "pais": "Italia", "descripcion": "## Técnicas Quirúrgicas Avanzadas\n\nDescubre las últimas innovaciones en **cirugía mínimamente invasiva**:\n\n- Laparoscopía avanzada\n- Técnicas endoscópicas\n- Recuperación acelerada\n\n✅ Menor dolor postoperatorio\n✅ Cicatrices mínimas\n✅ Hospitalización reducida", "imagen_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Diagnóstico por Imagen IA", "expositor": "Dr. Hiroshi Tanaka", "pais": "Japón", "descripcion": "## Radiología Inteligente\n\n**Inteligencia artificial** aplicada al diagnóstico por imagen:\n\n- Detección automática de anomalías\n- Análisis de resonancias magnéticas\n- Interpretación de tomografías\n\n🎯 **Precisión diagnóstica del 98%**", "imagen_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Medicina Regenerativa", "expositor": "Dr. Sarah Johnson", "pais": "Reino Unido", "descripcion": "## Regeneración de Tejidos\n\nExplora el futuro de la **medicina regenerativa**:\n\n- Terapia con células madre\n- Ingeniería de tejidos\n- Bioimpresión 3D\n\n🔬 Casos de éxito en regeneración ósea y cartilaginosa", "imagen_url": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Farmacología Digital", "expositor": "Dr. Hans Mueller", "pais": "Alemania", "descripcion": "## Medicamentos Inteligentes\n\n**Farmacología digital** y medicina personalizada:\n\n- Dosificación precisa por IA\n- Monitoreo de adherencia\n- Efectos secundarios predictivos\n\n💊 Optimización de tratamientos farmacológicos", "imagen_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Salud Mental Digital", "expositor": "Dra. Camila Silva", "pais": "Brasil", "descripcion": "## Psiquiatría del Futuro\n\nInnovaciones en **salud mental digital**:\n\n- Terapia virtual inmersiva\n- Apps de bienestar mental\n- Análisis predictivo de crisis\n\n🧠 Detección temprana de trastornos mentales", "imagen_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Oncología de Precisión", "expositor": "Dr. Ahmed Hassan", "pais": "Egipto", "descripcion": "## Tratamiento Personalizado del Cáncer\n\n**Oncología de precisión** basada en genómica:\n\n- Perfiles genéticos tumorales\n- Inmunoterapias personalizadas\n- Biomarcadores predictivos\n\n🎯 Terapias dirigidas con mayor eficacia", "imagen_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Cardiopatías del Futuro", "expositor": "Dr. Raj Patel", "pais": "India", "descripcion": "## Cardiología Innovadora\n\nAvances en **tratamiento cardiovascular**:\n\n- Stents inteligentes\n- Marcapasos sin cables\n- Válvulas cardíacas bioimprimidas\n\n❤️ Prevención y tratamiento de cardiopatías", "imagen_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Neurociencia Computacional", "expositor": "Dr. Lars Anderson", "pais": "Suecia", "descripcion": "## Cerebro y Computación\n\n**Neurociencia computacional** aplicada:\n\n- Interfaces cerebro-computadora\n- Modelos neuronales avanzados\n- Estimulación cerebral profunda\n\n🧠 Tratamiento de enfermedades neurológicas", "imagen_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Pediatría Innovadora", "expositor": "Dra. Sophie Martin", "pais": "Canadá", "descripcion": "## Medicina Pediátrica Avanzada\n\nInnovaciones en **atención pediátrica**:\n\n- Diagnóstico prenatal avanzado\n- Terapias génicas pediátricas\n- Dispositivos médicos infantiles\n\n👶 Mejores resultados en salud infantil", "imagen_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Geriatría y Tecnología", "expositor": "Dr. Antonio Costa", "pais": "Portugal", "descripcion": "## Envejecimiento Saludable\n\n**Tecnología** aplicada al cuidado geriátrico:\n\n- Monitoreo domiciliario\n- Asistentes virtuales para mayores\n- Detección de caídas automática\n\n🏠 Independencia y calidad de vida", "imagen_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Medicina de Emergencia", "expositor": "Dr. Kim Jong-Su", "pais": "Corea del Sur", "descripcion": "## Emergencias Médicas Digitales\n\n**Tecnología** en medicina de urgencias:\n\n- Triaje automatizado\n- Diagnóstico rápido por IA\n- Telemedicina de emergencia\n\n⚡ Respuesta rápida y efectiva", "imagen_url": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Rehabilitación Virtual", "expositor": "Dr. Olga Petrov", "pais": "Rusia", "descripcion": "## Fisioterapia del Futuro\n\n**Realidad virtual** en rehabilitación:\n\n- Terapias inmersivas\n- Gamificación de ejercicios\n- Seguimiento de progreso\n\n🎮 Recuperación más rápida y motivante", "imagen_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Nutrición Personalizada", "expositor": "Dra. Elena Popov", "pais": "Bulgaria", "descripcion": "## Dietas Genéticamente Personalizadas\n\n**Nutrigenómica** y alimentación:\n\n- Dietas basadas en ADN\n- Análisis de micronutrientes\n- Prevención de enfermedades\n\n🍎 Alimentación optimizada para cada persona", "imagen_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Medicina Deportiva", "expositor": "Dr. Mark Thompson", "pais": "Australia", "descripcion": "## Rendimiento y Recuperación\n\n**Medicina deportiva** de alta tecnología:\n\n- Análisis biomecánico\n- Prevención de lesiones\n- Recuperación acelerada\n\n🏃‍♂️ Optimización del rendimiento atlético", "imagen_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
            {"titulo": "Biosensores Médicos", "expositor": "Dr. Yuki Nakamura", "pais": "Japón", "descripcion": "## Monitoreo Continuo de Salud\n\n**Biosensores** y wearables médicos:\n\n- Parches inteligentes\n- Lentes de contacto con sensores\n- Implantes monitoreables\n\n📊 Datos de salud en tiempo real", "imagen_url": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
        ]
        
        eventos = []
        charla_index = 0
        
        for fecha in fechas:
            for hora in horarios:
                for sala in salas:
                    charla = charlas_data[charla_index % len(charlas_data)]
                    eventos.append((
                        fecha, hora, sala,
                        charla["titulo"],
                        charla["expositor"],
                        charla["pais"],
                        charla.get("descripcion", "Descripción no disponible"),
                        charla.get("imagen_url", None),
                        60, 0  # slots_disponibles, slots_ocupados
                    ))
                    charla_index += 1
        
        cursor.executemany("""
            INSERT INTO expokossodo_eventos 
            (fecha, hora, sala, titulo_charla, expositor, pais, descripcion, imagen_url, slots_disponibles, slots_ocupados)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, eventos)
        
        connection.commit()
        print("✅ Datos de ejemplo insertados exitosamente")
        
    except Error as e:
        print(f"Error insertando datos de ejemplo: {e}")

def send_confirmation_email(user_data, selected_events, qr_text=None):
    """Enviar email de confirmación con código QR adjunto"""
    try:
        smtp_server = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('EMAIL_PORT', 587))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = user_data['correo']
        msg['Subject'] = "Confirmación de Registro - ExpoKossodo 2025"
        
        # Crear contenido del email con diseño moderno
        eventos_html = ""
        for i, evento in enumerate(selected_events):
            eventos_html += f"""
            <tr>
                <td style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 15px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding-bottom: 12px;">
                                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; line-height: 1.4;">
                                    {evento['titulo_charla']}
                                </h3>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 8px;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">
                                    {evento['expositor']} • {evento['pais']}
                                </p>
                            </td>
                        </tr>
                                                                 <tr>
                                             <td>
                                                 <div style="display: inline-flex; align-items: center; background: #6cb79a; color: white; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                                                     📅 {evento['fecha']} &nbsp;•&nbsp; 🕐 {evento['hora']} &nbsp;•&nbsp; 🏛️ {evento['sala']}
            </div>
                                             </td>
                                         </tr>pe
                    </table>
                </td>
            </tr>
            """
        
        html_body = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación ExpoKossodo 2025</title>
            <!--[if mso]>
            <noscript>
                <xml>
                    <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                </xml>
            </noscript>
            <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); line-height: 1.6;">
            
            <!-- Main Container -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); min-height: 100vh;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        
                        <!-- Email Content Container -->
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: white; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden;">
                            
                            <!-- Header with Gradient -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #01295c 0%, #1d2236 100%); padding: 40px 30px; text-align: center;">
                                                                                                              <!-- Logo -->
                                     <img src="https://i.ibb.co/3mjHgkvb/EXPOKOSSODO-PNG.png" alt="ExpoKossodo 2025" style="width: 200px; height: auto; margin-bottom: 30px;">
                                     
                                     <!-- Title -->
                                     <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white; margin-bottom: 8px;">
                                         ¡Registro Confirmado!
                                     </h1>
                                     <p style="margin: 0; font-size: 18px; color: rgba(255, 255, 255, 0.8); font-weight: 400;">
                                         Te esperamos en ExpoKossodo 2025
                                     </p>
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    
                                    <!-- Greeting -->
                                    <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1f2937;">
                                        Hola {user_data['nombres']},
                                    </h2>
                                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                                        Tu registro ha sido confirmado exitosamente. Aquí tienes todos los detalles de tu participación:
                                    </p>
                                    
                                    <!-- Participant Data Card -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #6cb79a;">
                                                <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                                                    📋 Datos del Participante
                                                </h3>
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="padding: 5px 0; font-size: 14px; color: #374151;"><strong>Nombre:</strong> {user_data['nombres']}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 5px 0; font-size: 14px; color: #374151;"><strong>Email:</strong> {user_data['correo']}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 5px 0; font-size: 14px; color: #374151;"><strong>Empresa:</strong> {user_data['empresa']}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 5px 0; font-size: 14px; color: #374151;"><strong>Cargo:</strong> {user_data['cargo']}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 5px 0; font-size: 14px; color: #374151;"><strong>Teléfono:</strong> {user_data['numero']}</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                                                         <!-- Selected Events Section - Estilo del frontend -->
                                     <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                         <tr>
                                             <td style="background: linear-gradient(135deg, #01295c 0%, #1d2236 100%); padding: 25px; border-radius: 16px;">
                                                 <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: white;">
                                                     Eventos Seleccionados ({len(selected_events)})
                                                 </h3>
                                                 <table width="100%" cellpadding="0" cellspacing="0">
                {eventos_html}
                                                 </table>
                                             </td>
                                         </tr>
                                     </table>
                                    
                                                                         <!-- Important Information - Diseño minimalista -->
                                     <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                         <tr>
                                             <td style="background: white; padding: 25px; border-radius: 16px; border: 2px solid #6cb79a; box-shadow: 0 4px 6px rgba(108, 183, 154, 0.1);">
                                                 <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                                     <div style="width: 40px; height: 40px; background: #6cb79a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                                         <svg width="20" height="20" fill="#ffffff" viewBox="0 0 24 24">
                                                             <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                                         </svg>
                </div>
                                                     <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">
                                                         Información Importante
                                                     </h3>
                </div>
                                                 <table width="100%" cellpadding="0" cellspacing="0">
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;"><strong>Fechas de tus eventos:</strong> {', '.join(sorted(set([evento['fecha'].strftime('%d/%m/%Y') if hasattr(evento['fecha'], 'strftime') else str(evento['fecha']) for evento in selected_events])))}</td></tr>
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                                         <strong>Ubicación:</strong> Oficinas de Kossodo Jr. Chota 1161, Cercado de Lima<br>
                                                         <a href="https://maps.app.goo.gl/nbKHT74Tk3gfquhA6" target="_blank" style="display: inline-block; margin-top: 8px; background: #6cb79a; color: white; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                                                             📍 Ver en Google Maps
                                                         </a>
                                                     </td></tr>
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151;"><strong>Llegada:</strong> Te recomendamos llegar 30 minutos antes</td></tr>
                                                 </table>
                                             </td>
                                         </tr>
                                     </table>
                                     
                                     <!-- QR Code Information - Diseño minimalista -->
                                     <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                         <tr>
                                             <td style="background: white; padding: 25px; border-radius: 16px; border: 2px solid #6cb79a; box-shadow: 0 4px 6px rgba(108, 183, 154, 0.1);">
                                                 <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                                     <div style="width: 40px; height: 40px; background: #6cb79a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                                         <svg width="20" height="20" fill="#ffffff" viewBox="0 0 24 24">
                                                             <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h2v2H7V7zm0 4h2v2H7v-2zm4-4h2v2h-2V7zm0 4h2v2h-2v-2zm4-4h2v2h-2V7zm0 4h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
                                                         </svg>
                </div>
                                                     <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">
                                                         Tu Código QR Personal
                                                     </h3>
            </div>
                                                 <table width="100%" cellpadding="0" cellspacing="0">
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">Hemos adjuntado tu <strong>código QR único</strong> a este email</td></tr>
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;"><strong>Guárdalo en tu teléfono</strong> - lo necesitarás para ingresar al evento</td></tr>
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">Presenta el QR en recepción y en cada charla para registrar tu asistencia</td></tr>
                                                     <tr><td style="padding: 8px 0; font-size: 14px; color: #374151;"><strong>¡No lo compartas!</strong> Es único e intransferible</td></tr>
                                                 </table>
                                             </td>
                                         </tr>
                                     </table>
                                    
                                    <!-- CTA Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                        <tr>
                                            <td align="center">
                                                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6cb79a 0%, #5ca085 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(108, 183, 154, 0.25);">
                                                    🌟 Preparándote para la Expo
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Final Message -->
                                    <p style="margin: 0; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
                                        ¡Esperamos verte pronto en <strong style="color: #6cb79a;">ExpoKossodo 2025</strong>!<br>
                                        Un evento que marcará el futuro de la sostenibilidad.
                                    </p>
                                    
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                                        Si tienes alguna pregunta, no dudes en contactarnos:
                                    </p>
                                    <p style="margin: 0 0 15px 0; font-size: 14px;">
                                        <a href="mailto:jcamacho@kossodo.com" style="color: #6cb79a; text-decoration: none; font-weight: 600;">jcamacho@kossodo.com</a>
                                    </p>
                                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                                        Equipo ExpoKossodo 2025
                                    </p>
                                </td>
                            </tr>
                            
                        </table>
                        
                    </td>
                </tr>
            </table>
            
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # ===== ADJUNTAR CÓDIGO QR =====
        if qr_text:
            try:
                # Generar imagen QR
                qr_image_bytes = generar_imagen_qr(qr_text)
                if qr_image_bytes:
                    # Crear adjunto de imagen
                    qr_attachment = MIMEImage(qr_image_bytes)
                    qr_attachment.add_header('Content-Disposition', 
                                           f'attachment; filename="QR_ExpoKossodo_{user_data["nombres"].replace(" ", "_")}.png"')
                    qr_attachment.add_header('Content-ID', '<qr_code>')
                    msg.attach(qr_attachment)
                    print("✅ Código QR adjuntado al email exitosamente")
                else:
                    print("⚠️ No se pudo generar la imagen QR para adjuntar")
            except Exception as e:
                print(f"⚠️ Error adjuntando QR al email: {e}")
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(email_user, email_password)
        server.send_message(msg)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"Error enviando email: {e}")
        return False

# Rutas de la API
@app.route('/api/eventos', methods=['GET'])
def get_eventos():
    """Obtener todos los eventos organizados por fecha (solo horarios activos)"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Obtener eventos solo para horarios activos Y disponibles
        cursor.execute("""
            SELECT e.* FROM expokossodo_eventos e
            INNER JOIN expokossodo_horarios h ON e.hora = h.horario
            WHERE h.activo = TRUE AND e.disponible = TRUE
            ORDER BY e.fecha, e.hora, e.sala
        """)
        eventos = cursor.fetchall()
        
        # Organizar por fecha
        eventos_por_fecha = {}
        for evento in eventos:
            fecha_str = evento['fecha'].strftime('%Y-%m-%d')
            if fecha_str not in eventos_por_fecha:
                eventos_por_fecha[fecha_str] = {}
            
            hora = evento['hora']
            if hora not in eventos_por_fecha[fecha_str]:
                eventos_por_fecha[fecha_str][hora] = []
            
            eventos_por_fecha[fecha_str][hora].append({
                'id': evento['id'],
                'sala': evento['sala'],
                'titulo_charla': evento['titulo_charla'],
                'expositor': evento['expositor'],
                'pais': evento['pais'],
                'descripcion': evento.get('descripcion', ''),
                'imagen_url': evento.get('imagen_url', ''),
                'slots_disponibles': evento['slots_disponibles'],
                'slots_ocupados': evento['slots_ocupados'],
                'disponible': (
                    evento.get('disponible', True) and 
                    evento['slots_ocupados'] < evento['slots_disponibles']
                )
            })
        
        return jsonify(eventos_por_fecha)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/registro', methods=['POST'])
def crear_registro():
    """Crear nuevo registro de usuario"""
    data = request.get_json()
    
    # Validaciones básicas
    required_fields = ['nombres', 'correo', 'empresa', 'cargo', 'numero', 'eventos_seleccionados']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar disponibilidad de eventos
        evento_ids = data['eventos_seleccionados']
        if not evento_ids:
            return jsonify({"error": "Debe seleccionar al menos un evento"}), 400
        
        # Verificar si el usuario ya está registrado (por correo)
        cursor.execute("""
            SELECT id, nombres FROM expokossodo_registros 
            WHERE correo = %s
        """, (data['correo'],))
        
        usuario_existente = cursor.fetchone()
        if usuario_existente:
            return jsonify({
                "error": f"El correo {data['correo']} ya está registrado a nombre de {usuario_existente['nombres']}"
            }), 400

        placeholders = ','.join(['%s'] * len(evento_ids))
        cursor.execute(f"""
            SELECT id, titulo_charla, slots_disponibles, slots_ocupados, hora, fecha
            FROM expokossodo_eventos 
            WHERE id IN ({placeholders})
        """, evento_ids)
        
        eventos = cursor.fetchall()
        
        if len(eventos) != len(evento_ids):
            return jsonify({"error": "Algunos eventos seleccionados no existen"}), 400
        
        # Verificar capacidad
        for evento in eventos:
            if evento['slots_ocupados'] >= evento['slots_disponibles']:
                return jsonify({
                    "error": f"El evento '{evento['titulo_charla']}' ya no tiene cupos disponibles"
                }), 400
        
        # Verificar horarios únicos POR DÍA (no más de un evento por hora en el mismo día)
        eventos_por_fecha = {}
        for evento in eventos:
            fecha_str = evento['fecha'].strftime('%Y-%m-%d')
            if fecha_str not in eventos_por_fecha:
                eventos_por_fecha[fecha_str] = []
            eventos_por_fecha[fecha_str].append(evento['hora'])
        
        # Verificar que no haya conflictos de horario en el mismo día
        for fecha, horarios in eventos_por_fecha.items():
            if len(horarios) != len(set(horarios)):
                return jsonify({
                    "error": f"No puede seleccionar múltiples eventos en el mismo horario el día {fecha}"
                }), 400
        
        # ===== GENERAR CÓDIGO QR =====
        qr_text = generar_texto_qr(
            data['nombres'], 
            data['numero'], 
            data['cargo'], 
            data['empresa']
        )
        
        if not qr_text:
            return jsonify({"error": "Error generando código QR"}), 500
        
        # Insertar registro con QR
        cursor.execute("""
            INSERT INTO expokossodo_registros 
            (nombres, correo, empresa, cargo, numero, expectativas, eventos_seleccionados, 
             qr_code, qr_generado_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            data['nombres'],
            data['correo'],
            data['empresa'],
            data['cargo'],
            data['numero'],
            data.get('expectativas', ''),
            json.dumps(evento_ids),
            qr_text
        ))
        
        registro_id = cursor.lastrowid
        
        # Insertar relaciones registro-evento y actualizar slots
        for evento_id in evento_ids:
            cursor.execute("""
                INSERT INTO expokossodo_registro_eventos (registro_id, evento_id)
                VALUES (%s, %s)
            """, (registro_id, evento_id))
            
            cursor.execute("""
                UPDATE expokossodo_eventos 
                SET slots_ocupados = slots_ocupados + 1
                WHERE id = %s
            """, (evento_id,))
        
        connection.commit()
        
        # Obtener datos completos para el email
        cursor.execute(f"""
            SELECT e.* FROM expokossodo_eventos e
            WHERE e.id IN ({placeholders})
            ORDER BY e.fecha, e.hora
        """, evento_ids)
        
        eventos_completos = cursor.fetchall()
        
        # Enviar email de confirmación con QR
        email_sent = send_confirmation_email(data, eventos_completos, qr_text)
        
        return jsonify({
            "message": "Registro creado exitosamente",
            "registro_id": registro_id,
            "qr_code": qr_text,
            "qr_generated": True,
            "email_sent": email_sent
        })
        
    except Error as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/registros', methods=['GET'])
def get_registros():
    """Obtener todos los registros (para reportes)"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT r.*, 
                   GROUP_CONCAT(
                       CONCAT(e.fecha, ' - ', e.hora, ' - ', e.sala, ' - ', e.titulo_charla)
                       SEPARATOR '; '
                   ) as eventos
            FROM expokossodo_registros r
            LEFT JOIN expokossodo_registro_eventos re ON r.id = re.registro_id
            LEFT JOIN expokossodo_eventos e ON re.evento_id = e.id
            GROUP BY r.id
            ORDER BY r.fecha_registro DESC
        """)
        
        registros = cursor.fetchall()
        return jsonify(registros)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Obtener estadísticas del evento"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Estadísticas generales
        cursor.execute("SELECT COUNT(*) as total_registros FROM expokossodo_registros")
        total_registros = cursor.fetchone()['total_registros']
        
        cursor.execute("SELECT SUM(slots_ocupados) as total_slots_ocupados FROM expokossodo_eventos")
        total_slots_ocupados = cursor.fetchone()['total_slots_ocupados'] or 0
        
        cursor.execute("SELECT COUNT(*) as total_eventos FROM expokossodo_eventos")
        total_eventos = cursor.fetchone()['total_eventos']
        
        # Eventos más populares
        cursor.execute("""
            SELECT titulo_charla, expositor, slots_ocupados, slots_disponibles
            FROM expokossodo_eventos
            ORDER BY slots_ocupados DESC
            LIMIT 10
        """)
        eventos_populares = cursor.fetchall()
        
        return jsonify({
            "total_registros": total_registros,
            "total_slots_ocupados": total_slots_ocupados,
            "total_eventos": total_eventos,
            "eventos_populares": eventos_populares
        })
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ENDPOINTS DE ADMINISTRACIÓN
@app.route('/api/admin/eventos', methods=['GET'])
def get_admin_eventos():
    """Obtener todos los eventos para administración"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                id, fecha, hora, sala, titulo_charla, expositor, pais, 
                descripcion, imagen_url, slots_disponibles, slots_ocupados,
                disponible, created_at
            FROM expokossodo_eventos 
            ORDER BY fecha, hora, sala
        """)
        
        eventos = cursor.fetchall()
        
        # Organizar por fecha para la interfaz
        eventos_por_fecha = {}
        for evento in eventos:
            fecha_str = evento['fecha'].strftime('%Y-%m-%d')
            if fecha_str not in eventos_por_fecha:
                eventos_por_fecha[fecha_str] = []
            eventos_por_fecha[fecha_str].append(evento)
        
        return jsonify(eventos_por_fecha)
        
    except Error as e:
        print(f"Error obteniendo eventos admin: {e}")
        return jsonify({'error': 'Error obteniendo eventos'}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/admin/evento/<int:evento_id>', methods=['PUT'])
def update_evento(evento_id):
    """Actualizar información de un evento específico"""
    data = request.get_json()
    
    # Validaciones básicas
    required_fields = ['titulo_charla', 'expositor', 'pais']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Campo requerido: {field}'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor()
    
    try:
        # Verificar que el evento existe
        cursor.execute("SELECT id FROM expokossodo_eventos WHERE id = %s", (evento_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # Actualizar evento - AHORA INCLUYE DISPONIBLE
        update_query = """
            UPDATE expokossodo_eventos 
            SET titulo_charla = %s, expositor = %s, pais = %s, 
                descripcion = %s, imagen_url = %s, disponible = %s
            WHERE id = %s
        """
        
        cursor.execute(update_query, (
            data['titulo_charla'],
            data['expositor'],
            data['pais'],
            data.get('descripcion', ''),
            data.get('imagen_url', None),
            data.get('disponible', True),  # NUEVO CAMPO
            evento_id
        ))
        
        connection.commit()
        
        # Log del cambio
        estado_disponible = "disponible" if data.get('disponible', True) else "no disponible"
        print(f"✅ Evento {evento_id} actualizado por admin: {data['titulo_charla']} - {estado_disponible}")
        
        return jsonify({'message': 'Evento actualizado exitosamente'})
        
    except Error as e:
        print(f"Error actualizando evento {evento_id}: {e}")
        connection.rollback()
        return jsonify({'error': 'Error actualizando evento'}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/admin/evento/<int:evento_id>/toggle-disponibilidad', methods=['PUT'])
def toggle_evento_disponibilidad(evento_id):
    """Toggle de disponibilidad de un evento específico"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar que el evento existe y obtener estado actual
        cursor.execute("SELECT id, titulo_charla, disponible FROM expokossodo_eventos WHERE id = %s", (evento_id,))
        evento = cursor.fetchone()
        
        if not evento:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # Toggle del estado
        nuevo_estado = not evento['disponible']
        
        cursor.execute("""
            UPDATE expokossodo_eventos 
            SET disponible = %s 
            WHERE id = %s
        """, (nuevo_estado, evento_id))
        
        connection.commit()
        
        # Log del cambio
        estado_texto = "activado" if nuevo_estado else "desactivado"
        print(f"✅ Evento {evento_id} ({evento['titulo_charla']}) {estado_texto} por admin")
        
        return jsonify({
            'message': f'Evento {estado_texto} exitosamente',
            'evento_id': evento_id,
            'disponible': nuevo_estado,
            'titulo_charla': evento['titulo_charla']
        })
        
    except Error as e:
        print(f"Error toggling disponibilidad evento {evento_id}: {e}")
        connection.rollback()
        return jsonify({'error': 'Error cambiando disponibilidad del evento'}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/admin/evento/<int:evento_id>', methods=['GET'])
def get_evento_detalle(evento_id):
    """Obtener detalles completos de un evento específico"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                id, fecha, hora, sala, titulo_charla, expositor, pais, 
                descripcion, imagen_url, slots_disponibles, slots_ocupados,
                disponible, created_at
            FROM expokossodo_eventos 
            WHERE id = %s
        """, (evento_id,))
        
        evento = cursor.fetchone()
        
        if not evento:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        return jsonify(evento)
        
    except Error as e:
        print(f"Error obteniendo evento {evento_id}: {e}")
        return jsonify({'error': 'Error obteniendo evento'}), 500
    finally:
        cursor.close()
        connection.close()

# ===== ENDPOINTS DE VERIFICACIÓN QR =====

@app.route('/api/verificar/buscar-usuario', methods=['POST'])
def buscar_usuario_por_qr():
    """Buscar usuario por código QR escaneado"""
    data = request.get_json()
    
    if not data or 'qr_code' not in data:
        return jsonify({"error": "Código QR requerido"}), 400
    
    qr_code = data['qr_code']
    
    # Validar formato QR
    validacion = validar_formato_qr(qr_code)
    if not validacion['valid']:
        return jsonify({"error": "Código QR inválido"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Buscar usuario por código QR
        cursor.execute("""
            SELECT r.*, 
                   CASE WHEN r.asistencia_general_confirmada = 1 THEN 'confirmada' ELSE 'pendiente' END as estado_asistencia
            FROM expokossodo_registros r
            WHERE r.qr_code = %s
        """, (qr_code,))
        
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Obtener eventos registrados del usuario
        cursor.execute("""
            SELECT e.id, e.fecha, e.hora, e.sala, e.titulo_charla, e.expositor, e.pais,
                   CASE WHEN aps.id IS NOT NULL THEN 'presente' ELSE 'ausente' END as estado_sala
            FROM expokossodo_eventos e
            INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
            LEFT JOIN expokossodo_asistencias_por_sala aps ON e.id = aps.evento_id AND aps.registro_id = %s
            WHERE re.registro_id = %s
            ORDER BY e.fecha, e.hora
        """, (usuario['id'], usuario['id']))
        
        eventos = cursor.fetchall()
        
        # Verificar si ya tiene asistencia general registrada
        cursor.execute("""
            SELECT fecha_escaneo 
            FROM expokossodo_asistencias_generales 
            WHERE registro_id = %s 
            ORDER BY fecha_escaneo DESC 
            LIMIT 1
        """, (usuario['id'],))
        
        asistencia_general = cursor.fetchone()
        
        return jsonify({
            "usuario": {
                "id": usuario['id'],
                "nombres": usuario['nombres'],
                "correo": usuario['correo'],
                "empresa": usuario['empresa'],
                "cargo": usuario['cargo'],
                "numero": usuario['numero'],
                "fecha_registro": usuario['fecha_registro'].isoformat() if usuario['fecha_registro'] else None,
                "asistencia_confirmada": usuario['asistencia_general_confirmada'],
                "estado_asistencia": usuario['estado_asistencia']
            },
            "eventos": eventos,
            "asistencia_general": asistencia_general,
            "qr_validado": validacion['parsed']
        })
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/verificar/confirmar-asistencia', methods=['POST'])
def confirmar_asistencia_general():
    """Confirmar asistencia general del usuario"""
    data = request.get_json()
    
    required_fields = ['registro_id', 'qr_code']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar que el usuario existe
        cursor.execute("""
            SELECT id, nombres FROM expokossodo_registros 
            WHERE id = %s AND qr_code = %s
        """, (data['registro_id'], data['qr_code']))
        
        usuario = cursor.fetchone()
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Verificar si ya tiene asistencia confirmada
        cursor.execute("""
            SELECT id FROM expokossodo_asistencias_generales 
            WHERE registro_id = %s
        """, (data['registro_id'],))
        
        if cursor.fetchone():
            return jsonify({"error": "Asistencia ya confirmada previamente"}), 400
        
        # Registrar asistencia general
        cursor.execute("""
            INSERT INTO expokossodo_asistencias_generales 
            (registro_id, qr_escaneado, verificado_por, ip_verificacion)
            VALUES (%s, %s, %s, %s)
        """, (
            data['registro_id'],
            data['qr_code'],
            data.get('verificado_por', 'Sistema'),
            request.remote_addr
        ))
        
        # Actualizar campo en tabla de registros
        cursor.execute("""
            UPDATE expokossodo_registros 
            SET asistencia_general_confirmada = TRUE, fecha_asistencia_general = NOW()
            WHERE id = %s
        """, (data['registro_id'],))
        
        connection.commit()
        
        return jsonify({
            "message": f"Asistencia confirmada para {usuario['nombres']}",
            "registro_id": data['registro_id'],
            "confirmado": True
        })
        
    except Error as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ===== ENDPOINTS DE VERIFICACIÓN POR SALA =====

@app.route('/api/verificar-sala/eventos', methods=['GET'])
def get_eventos_verificacion():
    """Obtener eventos para verificación por sala - OPTIMIZADO"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # UNA SOLA CONSULTA SUPER OPTIMIZADA con conteos agregados
        cursor.execute("""
            SELECT 
                e.id,
                e.fecha,
                e.hora,
                e.sala,
                e.titulo_charla,
                e.expositor,
                e.pais,
                e.slots_disponibles,
                e.slots_ocupados,
                COUNT(DISTINCT re.registro_id) as registrados,
                COUNT(DISTINCT aps.registro_id) as presentes
            FROM expokossodo_eventos e
            LEFT JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
            LEFT JOIN expokossodo_asistencias_por_sala aps ON e.id = aps.evento_id
            GROUP BY e.id, e.fecha, e.hora, e.sala, e.titulo_charla, e.expositor, e.pais, e.slots_disponibles, e.slots_ocupados
            ORDER BY e.fecha, e.hora, e.sala
        """)
        
        eventos = cursor.fetchall()
        
        # Convertir a formato JSON optimizado
        eventos_optimizados = []
        for evento in eventos:
            # Debug log solo para eventos con datos
            if evento['registrados'] > 0 or evento['presentes'] > 0:
                print(f"✅ Evento {evento['id']} ({evento['titulo_charla']}): {evento['registrados']} registrados, {evento['presentes']} presentes")
            
            eventos_optimizados.append({
                'id': evento['id'],
                'fecha': evento['fecha'].strftime('%Y-%m-%d'),
                'hora': evento['hora'],
                'sala': evento['sala'],
                'titulo_charla': evento['titulo_charla'],
                'expositor': evento['expositor'],
                'pais': evento['pais'],
                'registrados': evento['registrados'],
                'presentes': evento['presentes'],
                'disponible': evento['slots_ocupados'] < evento['slots_disponibles']
            })
        
        return jsonify({
            "eventos": eventos_optimizados,
            "total_eventos": len(eventos_optimizados)
        })
        
    except Error as e:
        print(f"Error obteniendo eventos para verificación: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/verificar-sala/evento/<int:evento_id>', methods=['GET'])
def get_evento_verificacion_individual(evento_id):
    """Obtener UN evento específico para verificación por sala - SUPER RÁPIDO"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # UNA SOLA CONSULTA para obtener TODO de un evento específico
        cursor.execute("""
            SELECT 
                e.id,
                e.fecha,
                e.hora,
                e.sala,
                e.titulo_charla,
                e.expositor,
                e.pais,
                e.slots_disponibles,
                e.slots_ocupados,
                COUNT(DISTINCT re.registro_id) as registrados,
                COUNT(DISTINCT aps.registro_id) as presentes
            FROM expokossodo_eventos e
            LEFT JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
            LEFT JOIN expokossodo_asistencias_por_sala aps ON e.id = aps.evento_id
            WHERE e.id = %s
            GROUP BY e.id, e.fecha, e.hora, e.sala, e.titulo_charla, e.expositor, e.pais, e.slots_disponibles, e.slots_ocupados
        """, (evento_id,))
        
        evento = cursor.fetchone()
        
        if not evento:
            return jsonify({"error": "Evento no encontrado"}), 404
        
        evento_optimizado = {
            'id': evento['id'],
            'fecha': evento['fecha'].strftime('%Y-%m-%d'),
            'hora': evento['hora'],
            'sala': evento['sala'],
            'titulo_charla': evento['titulo_charla'],
            'expositor': evento['expositor'],
            'pais': evento['pais'],
            'registrados': evento['registrados'],
            'presentes': evento['presentes'],
            'disponible': evento['slots_ocupados'] < evento['slots_disponibles']
        }
        
        print(f"🎯 Evento específico {evento_id}: {evento['registrados']} registrados, {evento['presentes']} presentes")
        
        return jsonify({
            "evento": evento_optimizado
        })
        
    except Error as e:
        print(f"Error obteniendo evento específico {evento_id}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/verificar-sala/verificar', methods=['POST'])
def verificar_acceso_sala():
    """Verificar acceso del usuario a sala específica"""
    data = request.get_json()
    
    required_fields = ['qr_code', 'evento_id', 'asesor_verificador']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Validar QR
        validacion = validar_formato_qr(data['qr_code'])
        if not validacion['valid']:
            return jsonify({"error": "Código QR inválido"}), 400
        
        # Buscar usuario
        cursor.execute("""
            SELECT id, nombres, empresa, cargo 
            FROM expokossodo_registros 
            WHERE qr_code = %s
        """, (data['qr_code'],))
        
        usuario = cursor.fetchone()
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Verificar que el usuario esté registrado en ese evento
        cursor.execute("""
            SELECT e.titulo_charla, e.hora, e.sala
            FROM expokossodo_eventos e
            INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
            WHERE e.id = %s AND re.registro_id = %s
        """, (data['evento_id'], usuario['id']))
        
        evento = cursor.fetchone()
        if not evento:
            return jsonify({
                "error": "Usuario no registrado en este evento",
                "usuario": usuario['nombres']
            }), 403
        
        # Verificar si ya ingresó a esta sala
        cursor.execute("""
            SELECT id, fecha_ingreso 
            FROM expokossodo_asistencias_por_sala 
            WHERE registro_id = %s AND evento_id = %s
        """, (usuario['id'], data['evento_id']))
        
        if cursor.fetchone():
            return jsonify({
                "error": "Usuario ya registró ingreso a esta sala",
                "usuario": usuario['nombres'],
                "evento": evento['titulo_charla']
            }), 400
        
        # Registrar ingreso a sala
        cursor.execute("""
            INSERT INTO expokossodo_asistencias_por_sala 
            (registro_id, evento_id, qr_escaneado, asesor_verificador, ip_verificacion, notas)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            usuario['id'],
            data['evento_id'],
            data['qr_code'],
            data['asesor_verificador'],
            request.remote_addr,
            data.get('notas', '')
        ))
        
        connection.commit()
        
        return jsonify({
            "message": "Acceso autorizado y registrado",
            "usuario": {
                "nombres": usuario['nombres'],
                "empresa": usuario['empresa'],
                "cargo": usuario['cargo']
            },
            "evento": {
                "titulo": evento['titulo_charla'],
                "hora": evento['hora'],
                "sala": evento['sala']
            },
            "verificado_por": data['asesor_verificador'],
            "autorizado": True
        })
        
    except Error as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/verificar-sala/asistentes/<int:evento_id>', methods=['GET'])
def get_asistentes_evento(evento_id):
    """Obtener asistentes de un evento específico - OPTIMIZADO"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # UNA SOLA CONSULTA OPTIMIZADA para obtener todo
        cursor.execute("""
            SELECT 
                e.titulo_charla, e.hora, e.sala, e.fecha,
                r.id, r.nombres, r.empresa, r.cargo,
                CASE WHEN aps.id IS NOT NULL THEN 'presente' ELSE 'registrado' END as estado,
                aps.fecha_ingreso
            FROM expokossodo_eventos e
            LEFT JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
            LEFT JOIN expokossodo_registros r ON re.registro_id = r.id
            LEFT JOIN expokossodo_asistencias_por_sala aps ON r.id = aps.registro_id AND aps.evento_id = e.id
            WHERE e.id = %s
            ORDER BY aps.fecha_ingreso DESC, r.nombres
        """, (evento_id,))
        
        resultados = cursor.fetchall()
        
        if not resultados:
            return jsonify({"error": "Evento no encontrado"}), 404
        
        # Separar información del evento y asistentes
        evento_info = {
            'titulo_charla': resultados[0]['titulo_charla'],
            'hora': resultados[0]['hora'],
            'sala': resultados[0]['sala'],
            'fecha': resultados[0]['fecha'].strftime('%Y-%m-%d') if resultados[0]['fecha'] else None
        }
        
        # Procesar asistentes (filtrar si hay registros válidos)
        asistentes = []
        total_registrados = 0
        presentes = 0
        
        for row in resultados:
            if row['id']:  # Solo si hay un registro válido
                asistente = {
                    'id': row['id'],
                    'nombres': row['nombres'],
                    'empresa': row['empresa'],
                    'cargo': row['cargo'],
                    'estado': row['estado'],
                    'fecha_ingreso': row['fecha_ingreso'].isoformat() if row['fecha_ingreso'] else None
                }
                asistentes.append(asistente)
                total_registrados += 1
                if row['estado'] == 'presente':
                    presentes += 1
        
        ausentes = total_registrados - presentes
        porcentaje = round((presentes / total_registrados * 100) if total_registrados > 0 else 0, 1)
        
        return jsonify({
            "evento": evento_info,
            "asistentes": asistentes,
            "estadisticas": {
                "total_registrados": total_registrados,
                "presentes": presentes,
                "ausentes": ausentes,
                "porcentaje_asistencia": porcentaje
            }
        })
        
    except Error as e:
        print(f"Error obteniendo asistentes del evento {evento_id}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ===== NUEVOS ENDPOINTS PARA GESTIÓN DE HORARIOS =====

@app.route('/api/admin/horarios', methods=['GET'])
def get_horarios():
    """Obtener todos los horarios con su estado"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT h.*, 
                   COUNT(e.id) as total_eventos,
                   COUNT(CASE WHEN e.slots_ocupados > 0 THEN 1 END) as eventos_con_registros
            FROM expokossodo_horarios h
            LEFT JOIN expokossodo_eventos e ON h.horario = e.hora
            GROUP BY h.id, h.horario, h.activo
            ORDER BY h.horario
        """)
        horarios = cursor.fetchall()
        
        return jsonify(horarios)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/admin/horario/<string:horario>/toggle', methods=['PUT'])
def toggle_horario(horario):
    """Activar/Desactivar un horario específico"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor()
    
    try:
        # Verificar si el horario existe
        cursor.execute("SELECT activo FROM expokossodo_horarios WHERE horario = %s", (horario,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"error": "Horario no encontrado"}), 404
        
        # Cambiar el estado
        nuevo_estado = not result[0]
        cursor.execute("""
            UPDATE expokossodo_horarios 
            SET activo = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE horario = %s
        """, (nuevo_estado, horario))
        
        connection.commit()
        
        estado_texto = "activado" if nuevo_estado else "desactivado"
        
        return jsonify({
            "success": True,
            "message": f"Horario {horario} {estado_texto} exitosamente",
            "horario": horario,
            "activo": nuevo_estado
        })
        
    except Error as e:
        connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/admin/horarios/activos', methods=['GET'])
def get_horarios_activos():
    """Obtener solo los horarios activos (para uso en frontend)"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor()
    
    try:
        cursor.execute("""
            SELECT horario FROM expokossodo_horarios 
            WHERE activo = TRUE 
            ORDER BY horario
        """)
        horarios = [row[0] for row in cursor.fetchall()]
        
        return jsonify(horarios)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ===== GESTIÓN DE INFORMACIÓN POR FECHA =====

@app.route('/api/admin/fechas-info', methods=['GET'])
def get_fechas_info():
    """Obtener información de todas las fechas (para admin)"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor()
        cursor.execute("""
            SELECT 
                id, fecha, rubro, titulo_dia, descripcion, 
                ponentes_destacados, marcas_patrocinadoras, paises_participantes,
                imagen_url, activo, created_at, updated_at
            FROM expokossodo_fecha_info 
            ORDER BY fecha ASC
        """)
        
        fechas_info = []
        for row in cursor.fetchall():
            import json
            fecha_info = {
                "id": row[0],
                "fecha": row[1].strftime('%Y-%m-%d'),
                "rubro": row[2],
                "titulo_dia": row[3],
                "descripcion": row[4],
                "ponentes_destacados": json.loads(row[5]) if row[5] else [],
                "marcas_patrocinadoras": json.loads(row[6]) if row[6] else [],
                "paises_participantes": json.loads(row[7]) if row[7] else [],
                "imagen_url": row[8],
                "activo": bool(row[9]),
                "created_at": row[10].isoformat() if row[10] else None,
                "updated_at": row[11].isoformat() if row[11] else None
            }
            fechas_info.append(fecha_info)
        
        return jsonify({"fechas_info": fechas_info})
        
    except Error as e:
        print(f"Error obteniendo fechas info: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/fechas-info/activas', methods=['GET'])
def get_fechas_info_activas():
    """Obtener información de fechas activas (para público)"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor()
        cursor.execute("""
            SELECT 
                fecha, rubro, titulo_dia, descripcion, 
                ponentes_destacados, marcas_patrocinadoras, paises_participantes,
                imagen_url
            FROM expokossodo_fecha_info 
            WHERE activo = TRUE
            ORDER BY fecha ASC
        """)
        
        fechas_info = []
        for row in cursor.fetchall():
            import json
            fecha_info = {
                "fecha": row[0].strftime('%Y-%m-%d'),
                "rubro": row[1],
                "titulo_dia": row[2],
                "descripcion": row[3],
                "ponentes_destacados": json.loads(row[4]) if row[4] else [],
                "marcas_patrocinadoras": json.loads(row[5]) if row[5] else [],
                "paises_participantes": json.loads(row[6]) if row[6] else [],
                "imagen_url": row[7]
            }
            fechas_info.append(fecha_info)
        
        return jsonify(fechas_info)
        
    except Error as e:
        print(f"Error obteniendo fechas info activas: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/admin/fecha-info/<int:fecha_id>', methods=['PUT'])
def update_fecha_info(fecha_id):
    """Actualizar información de una fecha específica"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor()
        
        # Construir query dinámicamente según campos proporcionados
        fields_to_update = []
        values = []
        
        allowed_fields = [
            'rubro', 'titulo_dia', 'descripcion', 'imagen_url', 'activo',
            'ponentes_destacados', 'marcas_patrocinadoras', 'paises_participantes'
        ]
        
        for field in allowed_fields:
            if field in data:
                fields_to_update.append(f"{field} = %s")
                if field in ['ponentes_destacados', 'marcas_patrocinadoras', 'paises_participantes']:
                    import json
                    values.append(json.dumps(data[field]))
                else:
                    values.append(data[field])
        
        if not fields_to_update:
            return jsonify({"error": "No hay campos válidos para actualizar"}), 400
        
        # Agregar ID al final
        values.append(fecha_id)
        
        query = f"""
            UPDATE expokossodo_fecha_info 
            SET {', '.join(fields_to_update)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        
        cursor.execute(query, values)
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Fecha no encontrada"}), 404
        
        connection.commit()
        
        return jsonify({
            "success": True,
            "message": "Información de fecha actualizada exitosamente"
        })
        
    except Error as e:
        print(f"Error actualizando fecha info: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/admin/fecha-info/<int:fecha_id>/toggle', methods=['PUT'])
def toggle_fecha_info(fecha_id):
    """Activar/desactivar información de una fecha"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor()
        
        # Obtener estado actual
        cursor.execute("SELECT activo FROM expokossodo_fecha_info WHERE id = %s", (fecha_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"error": "Fecha no encontrada"}), 404
        
        nuevo_estado = not bool(result[0])
        
        cursor.execute("""
            UPDATE expokossodo_fecha_info 
            SET activo = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (nuevo_estado, fecha_id))
        
        connection.commit()
        
        return jsonify({
            "success": True,
            "nuevo_estado": nuevo_estado,
            "message": f"Fecha {'activada' if nuevo_estado else 'desactivada'} exitosamente"
        })
        
    except Error as e:
        print(f"Error toggle fecha info: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    thread_id = data.get('thread_id')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400
    
    # Validar que las configuraciones de OpenAI estén presentes
    if not all([openai_api_key, assistant_id]):
        return jsonify({'error': 'OpenAI API keys not configured on the server'}), 500

    try:
        # Si no hay thread_id, crear uno nuevo
        if not thread_id:
            thread_obj = client.beta.threads.create()
            thread_id = thread_obj.id
            threads_in_memory[thread_id] = thread_obj # Guardar el nuevo hilo
        
        # 1. Añadir el mensaje del usuario al hilo
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=user_message
        )

        # 2. Crear un Run para que el asistente procese el mensaje
        # En v2, el vector store se especifica en el assistant, no en el run
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant_id
        )

        # 3. Esperar a que el Run se complete
        while run.status in ['queued', 'in_progress', 'cancelling']:
            time.sleep(1) # Evitar "busy-waiting" excesivo
            run = client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run.id
            )

        if run.status == 'completed':
            # 4. Recuperar los mensajes del hilo
            messages = client.beta.threads.messages.list(
                thread_id=thread_id,
                order="asc"
            )
            
            # 5. Encontrar la última respuesta del asistente
            assistant_response = ""
            for msg in reversed(messages.data):
                if msg.role == 'assistant':
                    # El contenido puede venir en partes
                    for content_part in msg.content:
                        if content_part.type == 'text':
                            assistant_response = content_part.text.value
                            break
                    if assistant_response:
                        break
            
            return jsonify({
                'reply': assistant_response, 
                'thread_id': thread_id
            })

        else:
            print(f"Run failed. Status: {run.status}")
            if hasattr(run, 'last_error') and run.last_error:
                print(f"Error details: {run.last_error}")
            return jsonify({'error': f'Run failed with status: {run.status}'}), 500

    except Exception as e:
        print(f"Error in OpenAI chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Iniciando ExpoKossodo Backend...")
    
    # Inicializar base de datos
    if init_database():
        print("✅ Base de datos inicializada correctamente")
    else:
        print("❌ Error inicializando base de datos")
        exit(1)
    
    # Configuración del servidor
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🌐 Servidor corriendo en http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 