from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error, pooling
import os
from dotenv import load_dotenv
from datetime import datetime
from functools import wraps
import traceback
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
import threading
import ftplib
import logging
import sys
import requests

# Import condicional de cv2 para evitar errores en producción
try:
    import cv2
    CV2_AVAILABLE = True
    print("[CV2] OpenCV cargado exitosamente")
except ImportError as e:
    print(f"[CV2] Warning: OpenCV no disponible: {e}")
    CV2_AVAILABLE = False

# Clase de impresora térmica usando TSPL (método que SÍ funciona)
class TermalPrinter4BARCODE:
    """Impresora térmica usando TSPL con el código que funciona perfectamente"""
    
    def __init__(self, printer_name=None):
        self.printer_name = printer_name or "4BARCODE 3B-303B"
    
    def _send_raw_tspl(self, raw_data):
        """Enviar datos TSPL a la impresora usando win32print"""
        try:
            import win32print
            
            h = win32print.OpenPrinter(self.printer_name, {"DesiredAccess": win32print.PRINTER_ACCESS_USE})
            win32print.StartDocPrinter(h, 1, ("TSPL_QR", None, "RAW"))
            win32print.StartPagePrinter(h)
            win32print.WritePrinter(h, raw_data)
            win32print.EndPagePrinter(h)
            win32print.EndDocPrinter(h)
            win32print.ClosePrinter(h)
            
            return {"success": True, "message": "Impresión enviada correctamente"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _generate_tspl_commands(self, qr_text, user_data):
        """Generar comandos TSPL con parámetros actualizados y mejorados"""
        
        # Extraer datos del usuario con fallback mejorado
        nombre = user_data.get('nombres', 'INVITADO') or 'INVITADO'
        
        # --- AJUSTES RÁPIDOS (parámetros actualizados) ---
        QR_X = 70        # antes 60 → movido a la izquierda
        QR_Y = 70        # antes 60 → bajado para más margen arriba  
        QR_CELL = 10      # antes 10 → más chico para evitar mordiscos
        FONT = "3"       # 0..7 (3 = grande/legible)
        CHAR_W = 20      # ancho aprox por carácter en font "3"
        TEXT_OFFSET = 50 # nombre a 50 dots por encima del QR
        MAX_NAME = 15    # máximo de caracteres visibles en el nombre
        
        # Procesar nombre con límite actualizado
        nombre_corto = nombre[:MAX_NAME]
        text_width = len(nombre_corto) * CHAR_W
        
        # Estimación del ancho del QR para centrar el texto respecto al bloque del QR
        qr_est_ancho = QR_CELL * 24  # ~24 módulos típico; funciona bien como aproximación
        center_x = QR_X + (qr_est_ancho // 2) - (text_width // 2)
        
        # Generar comandos TSPL con parámetros actualizados
        tspl = (
            "SIZE 50 mm,50 mm\r\n"
            "GAP 2 mm,0 mm\r\n"
            "SPEED 3\r\n"
            "DENSITY 12\r\n"
            "DIRECTION 1\r\n"
            "REFERENCE 0,0\r\n"
            "CLS\r\n"
            # Nombre centrado con respecto al QR (mismo espaciado)
            f'TEXT {center_x},{QR_Y - TEXT_OFFSET},"{FONT}",0,1,1,"{nombre_corto}"\r\n'
            # QR nativo grande (colores correctos)
            f'QRCODE {QR_X},{QR_Y},M,{QR_CELL},A,0,"{qr_text}"\r\n'
            "PRINT 1\r\n"
        ).encode("ascii")
        
        return tspl
    
    def print_qr_label(self, qr_text, user_data, mode='TSPL'):
        """Imprimir etiqueta con QR y nombre"""
        try:
            tspl_commands = self._generate_tspl_commands(qr_text, user_data)
            result = self._send_raw_tspl(tspl_commands)
            
            if result['success']:
                nombre_corto = user_data.get('nombres', 'INVITADO')[:10]
                print(f"[OK] Enviado. Nombre='{nombre_corto}' | QR cell=8 | pos=(70,70)")
            
            return result
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_print(self):
        """Test usando los mismos datos del código que funciona"""
        test_data = {"nombres": "Jefferson Camacho Portillo"}
        test_qr = "ROY|907245135|Jefe de ventas|JQS CONSULTING|1752211193"
        return self.print_qr_label(test_qr, test_data)
    
    def get_printer_status(self):
        """Estado de la impresora"""
        try:
            import win32print
            handle = win32print.OpenPrinter(self.printer_name)
            win32print.ClosePrinter(handle)
            return {"success": True, "printer": self.printer_name, "status_text": "Lista (TSPL)", "jobs": 0}
        except Exception as e:
            return {"success": False, "error": str(e), "printer": self.printer_name}

# Confirmar disponibilidad
THERMAL_PRINTER_DISPONIBLE = True
print("[OK] Impresora térmica: Usando método integrado que funciona")

# Configuración del servicio de transcripción en Railway
TRANSCRIPCION_API_URL = os.getenv('TRANSCRIPCION_API_URL', 
                                   'https://transcripcionleads-production.up.railway.app')
TRANSCRIPCION_API_KEY = os.getenv('TRANSCRIPCION_API_KEY', '')  # Para autenticación futura si es necesaria

# Verificar disponibilidad del servicio de transcripción
try:
    response = requests.get(f"{TRANSCRIPCION_API_URL}/health", timeout=5)
    if response.status_code == 200:
        TRANSCRIPCION_DISPONIBLE = True
        print(f"[OK] Servicio de transcripción conectado en: {TRANSCRIPCION_API_URL}")
    else:
        TRANSCRIPCION_DISPONIBLE = False
        print(f"[WARN] Servicio de transcripción no disponible (status: {response.status_code})")
except Exception as e:
    TRANSCRIPCION_DISPONIBLE = False
    print(f"[WARN] No se pudo conectar al servicio de transcripción: {e}")

# Configuración de logging mejorada
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Función para enviar consultas al servicio de transcripción
def enviar_a_transcripcion(consulta_id, texto, callback_url=None):
    """Enviar consulta al servicio de transcripción en Railway"""
    if not TRANSCRIPCION_DISPONIBLE:
        print(f"[WARN] Servicio de transcripción no disponible para consulta {consulta_id}")
        return False
    
    try:
        payload = {
            "texto": texto,
            "contexto": "consulta_asesor",
            "callback_url": callback_url
        }
        
        # Agregar el ID de consulta al payload
        payload["consulta_id"] = consulta_id
        
        response = requests.post(
            f"{TRANSCRIPCION_API_URL}/procesar-resumenes",
            json=payload,
            headers={'X-API-Key': TRANSCRIPCION_API_KEY} if TRANSCRIPCION_API_KEY else {},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"[OK] Consulta {consulta_id} enviada a transcripción exitosamente")
            return True
        else:
            print(f"[ERROR] Transcripción falló para consulta {consulta_id}: Status {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"[ERROR] Timeout enviando consulta {consulta_id} a transcripción")
        return False
    except Exception as e:
        print(f"[ERROR] No se pudo enviar consulta {consulta_id} a transcripción: {e}")
        return False

# Cargar variables de entorno desde .env
from dotenv import load_dotenv
load_dotenv(override=True)  # Forzar recarga de variables

# Imprimir configuración de DB para debug
print(f"[INFO] Conectando a DB_HOST: {os.getenv('DB_HOST')}")

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
    "https://expokossodo.grupokossodo.com",
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

# Configuración de la base de datos con timeouts
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'connection_timeout': 10,
    'autocommit': True
}

# Crear pool de conexiones
try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="expokossodo_pool",
        pool_size=10,
        pool_reset_session=True,
        **DB_CONFIG
    )
    print("[OK] Pool de conexiones creado exitosamente")
except Error as e:
    print(f"[ERROR] Error creando pool de conexiones: {e}")
    connection_pool = None

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
    print(f"[REQ] {request.method} {request.path} from {request.remote_addr}")
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
                "https://expokossodo2025.vercel.app",
                "https://expokossodo.grupokossodo.com",
                "https://www.grupokossodo.com",
                "https://grupokossodo.com"
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
    """Obtener conexión del pool"""
    try:
        if connection_pool:
            connection = connection_pool.get_connection()
            if connection.is_connected():
                return connection
            else:
                print("[ERROR] Conexión no está activa")
                return None
        else:
            # Fallback a conexión directa si no hay pool
            print("[WARN] Usando conexión directa (sin pool)")
            connection = mysql.connector.connect(**DB_CONFIG)
            return connection
    except Error as e:
        print(f"[ERROR] Error obteniendo conexión: {e}")
        return None

# Decorador para medir tiempo de ejecución
def log_execution_time(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        endpoint = request.endpoint if request else func.__name__
        method = request.method if request else 'N/A'
        
        try:
            print(f"[START] [{datetime.now().strftime('%H:%M:%S')}] Iniciando {method} {endpoint}")
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            if execution_time > 5:
                print(f"[WARN] SLOW QUERY: {endpoint} tomó {execution_time:.2f}s")
            else:
                print(f"[OK] [{datetime.now().strftime('%H:%M:%S')}] Completado {endpoint} en {execution_time:.2f}s")
            
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"[ERROR] Error en {endpoint} después de {execution_time:.2f}s: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise
    
    return wrapper

# ===== FUNCIONES DE GENERACIÓN QR =====

def generar_texto_qr(nombres, numero, cargo, empresa):
    """
    Generar texto QR con formato simplificado: 
    {3_letras_nombre}{numeros_dni}{3_letras_cargo}{3_letras_empresa}{timestamp}
    Todo en minúsculas, sin caracteres especiales, sin separadores
    
    Args:
        nombres (str): Nombre completo del usuario
        numero (str): Número de documento/DNI 
        cargo (str): Cargo del usuario
        empresa (str): Empresa del usuario
    
    Returns:
        str: Texto QR formateado sin caracteres especiales
    """
    try:
        # Función auxiliar para limpiar texto: quitar tildes y caracteres especiales
        def limpiar_texto(texto):
            if not texto:
                return 'xxx'
            # Convertir a minúsculas
            texto = texto.lower()
            # Reemplazar vocales con tildes
            texto = texto.replace('á', 'a').replace('é', 'e').replace('í', 'i')
            texto = texto.replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
            texto = texto.replace('à', 'a').replace('è', 'e').replace('ì', 'i')
            texto = texto.replace('ò', 'o').replace('ù', 'u')
            texto = texto.replace('ä', 'a').replace('ë', 'e').replace('ï', 'i')
            texto = texto.replace('ö', 'o').replace('ü', 'u')
            # Mantener solo letras
            texto = re.sub(r'[^a-z]', '', texto)
            return texto if texto else 'xxx'
        
        # 1. Obtener primeras 3 letras del PRIMER NOMBRE
        partes_nombre = nombres.strip().split() if nombres else []
        primer_nombre = partes_nombre[0] if partes_nombre else 'xxx'
        tres_letras_nombre = limpiar_texto(primer_nombre)[:3].ljust(3, 'x')
        
        # 2. Extraer solo números del DNI/número
        solo_numeros = re.sub(r'[^0-9]', '', str(numero))
        if not solo_numeros:
            solo_numeros = '000000'  # Valor por defecto si no hay números
        
        # 3. Obtener primeras 3 letras del cargo
        tres_letras_cargo = limpiar_texto(cargo)[:3].ljust(3, 'x')
        
        # 4. Obtener primeras 3 letras de la empresa
        tres_letras_empresa = limpiar_texto(empresa)[:3].ljust(3, 'x')
        
        # 5. Generar timestamp único en segundos
        timestamp = str(int(time.time()))
        
        # Crear texto QR todo junto sin separadores
        qr_text = f"{tres_letras_nombre}{solo_numeros}{tres_letras_cargo}{tres_letras_empresa}{timestamp}"
        
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
    Soporta tanto formato antiguo (con pipes) como nuevo (sin separadores)
    
    Args:
        qr_text (str): Texto QR a validar
    
    Returns:
        dict: {valid: bool, parsed: dict o None}
    """
    try:
        if not qr_text or not isinstance(qr_text, str):
            return {"valid": False, "parsed": None}
        
        # Detectar si es formato antiguo (con pipes) o nuevo (sin separadores)
        if '|' in qr_text:
            # FORMATO ANTIGUO: 3LETRAS|DNI|CARGO|EMPRESA|TIMESTAMP
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
            
        else:
            # FORMATO NUEVO: 3letras + numeros + 3letras + 3letras + timestamp
            # Ejemplo: asd51938101013asaatu1756243863
            
            # Validar longitud mínima (3 + al_menos_6_digitos + 3 + 3 + al_menos_10_timestamp = 25)
            if len(qr_text) < 25:
                return {"valid": False, "parsed": None}
            
            # Extraer las primeras 3 letras del nombre
            tres_letras = qr_text[:3]
            if not tres_letras.isalpha():
                return {"valid": False, "parsed": None}
            
            # El resto del string después de las 3 primeras letras
            resto = qr_text[3:]
            
            # Encontrar donde terminan los números (DNI)
            numeros_dni = ""
            pos = 0
            while pos < len(resto) and resto[pos].isdigit():
                numeros_dni += resto[pos]
                pos += 1
            
            if len(numeros_dni) < 6:  # DNI debe tener al menos 6 dígitos
                return {"valid": False, "parsed": None}
            
            # Después del DNI vienen 6 letras (3 cargo + 3 empresa) seguido del timestamp
            resto_despues_dni = resto[pos:]
            
            if len(resto_despues_dni) < 16:  # 6 letras + al menos 10 dígitos timestamp
                return {"valid": False, "parsed": None}
            
            # Extraer las siguientes 6 letras
            seis_letras = resto_despues_dni[:6]
            if not seis_letras.isalpha():
                return {"valid": False, "parsed": None}
            
            # Las primeras 3 son del cargo, las siguientes 3 de la empresa
            tres_letras_cargo = seis_letras[:3]
            tres_letras_empresa = seis_letras[3:6]
            
            # El resto es el timestamp
            timestamp_str = resto_despues_dni[6:]
            if not timestamp_str.isdigit():
                return {"valid": False, "parsed": None}
                
            try:
                timestamp_int = int(timestamp_str)
            except ValueError:
                return {"valid": False, "parsed": None}
            
            parsed_data = {
                "tres_letras": tres_letras,
                "numero": numeros_dni,
                "cargo": tres_letras_cargo,  # En el nuevo formato solo tenemos 3 letras
                "empresa": tres_letras_empresa,  # En el nuevo formato solo tenemos 3 letras
                "timestamp": timestamp_int
            }
        
        return {"valid": True, "parsed": parsed_data}
        
    except Exception as e:
        print(f"Error validando QR: {e}")
        return {"valid": False, "parsed": None}

def generate_slug(titulo_charla):
    """Generar slug URL-friendly desde titulo_charla"""
    import re
    import unicodedata
    
    if not titulo_charla:
        return None
    
    # Normalizar unicode y remover acentos
    slug = unicodedata.normalize('NFKD', titulo_charla)
    slug = slug.encode('ascii', 'ignore').decode('ascii')
    
    # Convertir a minúsculas
    slug = slug.lower()
    
    # Reemplazar espacios y caracteres especiales con guiones
    slug = re.sub(r'[^a-z0-9\-]', '-', slug)
    
    # Remover guiones múltiples
    slug = re.sub(r'-+', '-', slug)
    
    # Remover guiones al inicio y final
    slug = slug.strip('-')
    
    # Limitar longitud a 200 caracteres
    if len(slug) > 200:
        # Cortar en última palabra completa
        slug = slug[:200]
        last_dash = slug.rfind('-')
        if last_dash > 100:  # Solo cortar si no es muy corto
            slug = slug[:last_dash]
    
    return slug if slug else 'evento-sin-titulo'

def ensure_unique_slug(cursor, base_slug, evento_id=None):
    """Asegurar que el slug sea único, agregando números si es necesario"""
    original_slug = base_slug
    counter = 1
    
    while True:
        # Verificar si el slug ya existe (excluyendo el evento actual si estamos editando)
        if evento_id:
            cursor.execute(
                "SELECT id FROM expokossodo_eventos WHERE slug = %s AND id != %s", 
                (base_slug, evento_id)
            )
        else:
            cursor.execute(
                "SELECT id FROM expokossodo_eventos WHERE slug = %s", 
                (base_slug,)
            )
        
        existing = cursor.fetchone()
        
        if not existing:
            return base_slug
        
        # Si existe, intentar con número
        counter += 1
        base_slug = f"{original_slug}-{counter}"
        
        # Evitar loops infinitos
        if counter > 1000:
            import time
            base_slug = f"{original_slug}-{int(time.time())}"
            break
    
    return base_slug

def populate_existing_slugs():
    """Poblar slugs para eventos existentes que no los tengan"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Obtener eventos sin slug
        cursor.execute("SELECT id, titulo_charla FROM expokossodo_eventos WHERE slug IS NULL OR slug = ''")
        eventos_sin_slug = cursor.fetchall()
        
        print(f"[LOG] Procesando {len(eventos_sin_slug)} eventos sin slug...")
        
        for evento in eventos_sin_slug:
            # Acceso por índice (id=0, titulo_charla=1)
            evento_id = evento[0]
            titulo_charla = evento[1]
            
            if not evento_id or not titulo_charla:
                continue
            
            # Generar slug base
            base_slug = generate_slug(titulo_charla)
            
            # Asegurar unicidad
            final_slug = ensure_unique_slug(cursor, base_slug, evento_id)
            
            # Actualizar en base de datos
            cursor.execute(
                "UPDATE expokossodo_eventos SET slug = %s WHERE id = %s",
                (final_slug, evento_id)
            )
            
            print(f"[OK] Evento {evento_id}: '{titulo_charla}' → '{final_slug}'")
        
        connection.commit()
        print(f"🎯 {len(eventos_sin_slug)} slugs generados exitosamente")
        return True
        
    except Error as e:
        print(f"[ERROR] Error poblando slugs: {e}")
        return False
    finally:
        cursor.close()
        connection.close()

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
                rubro JSON,
                disponible BOOLEAN DEFAULT TRUE,
                marca_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_fecha_hora (fecha, hora),
                INDEX idx_sala (sala),
                INDEX idx_rubro ((CAST(rubro AS CHAR(100)))),
                FOREIGN KEY (marca_id) REFERENCES expokossodo_marcas(id) ON DELETE SET NULL
            )
        """)
        
        # Nueva tabla para marcas patrocinadoras
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_marcas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                marca VARCHAR(100) NOT NULL UNIQUE,
                expositor VARCHAR(100),
                logo VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_marca (marca)
            )
        """)
        
        # Poblar marcas por defecto si no existen
        marcas_default = [
            ('CAMAG', 'Ing. Eliezer Ceniviva', 'https://i.ibb.co/YFYknC9N/camag-color.webp'),
            ('EVIDENT', 'Mario Esteban Muñoz', 'https://i.ibb.co/RpHJ7W0C/evident-color.webp'),
            ('ESCO', None, 'https://i.ibb.co/wFCJ2RK3/esco-color.webp'),
            ('VACUUBRAND', 'Dr. Roberto Friztler', 'https://i.ibb.co/8nCL3Ksb/vacubrand-color.webp'),
            ('SARTORIUS', 'Lic. Mónica Klarreich', 'https://i.ibb.co/pYPPZ6m/sartorius-color.webp'),
            ('LAUDA', 'Andre Sautchuk', 'https://i.ibb.co/GfrzYHYS/lauda-color.webp'),
            ('BINDER', 'PhD. Fernando Vargas', 'https://i.ibb.co/JR51wysn/binder-color.webp'),
            ('VELP', 'Pablo Scarpin', 'https://i.ibb.co/tVn3sdB/velp-color.webp'),
            ('CHEM', None, 'https://i.ibb.co/LXZ02Zb3/chem-color.webp'),
            ('AMS', None, 'https://i.ibb.co/Z16k8Xcy/ams-color.webp'),
            ('KOSSODO', 'Qco. James Rojas Sanchez', None),
            ('KOSSOMET', 'Jhonny Quispe', None)
        ]
        
        for marca, expositor, logo in marcas_default:
            cursor.execute("""
                INSERT IGNORE INTO expokossodo_marcas (marca, expositor, logo) 
                VALUES (%s, %s, %s)
            """, (marca, expositor, logo))
        
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
            print("[OK] Columna 'descripcion' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'descripcion' ya existe")
            else:
                print(f"Error agregando columna descripcion: {e}")
        
        # Agregar columna imagen_url si no existe (para bases de datos existentes)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN imagen_url VARCHAR(500) AFTER descripcion
            """)
            print("[OK] Columna 'imagen_url' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'imagen_url' ya existe")
            else:
                print(f"Error agregando columna imagen_url: {e}")
        
        # Agregar columna disponible si no existe (NUEVA FUNCIONALIDAD)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN disponible BOOLEAN DEFAULT TRUE AFTER slots_ocupados
            """)
            print("[OK] Columna 'disponible' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'disponible' ya existe")
            else:
                print(f"Error agregando columna disponible: {e}")
        
        # Agregar columna slug si no existe (URLs DIRECTAS)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN slug VARCHAR(255) UNIQUE AFTER titulo_charla
            """)
            print("[OK] Columna 'slug' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'slug' ya existe")
            else:
                print(f"Error agregando columna slug: {e}")
        
        # Crear índice para slug si no existe
        try:
            cursor.execute("CREATE INDEX idx_slug ON expokossodo_eventos(slug)")
            print("[OK] Índice 'idx_slug' creado exitosamente")
        except Error as e:
            if "Duplicate key name" in str(e):
                print("[INFO] Índice 'idx_slug' ya existe")
            else:
                print(f"Error creando índice slug: {e}")
        
        # Agregar columna marca_id si no existe (NUEVA FUNCIONALIDAD)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN marca_id INT AFTER imagen_url,
                ADD CONSTRAINT fk_evento_marca 
                FOREIGN KEY (marca_id) REFERENCES expokossodo_marcas(id) 
                ON DELETE SET NULL
            """)
            print("[OK] Columna 'marca_id' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'marca_id' ya existe")
            else:
                print(f"Error agregando columna marca_id: {e}")
        
        # Agregar columna post si no existe (URL DE POST)
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN post VARCHAR(500) AFTER imagen_url
            """)
            print("[OK] Columna 'post' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'post' ya existe")
            else:
                print(f"Error agregando columna post: {e}")
        
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

        # Tabla de consultas/leads de asesores
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expokossodo_consultas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registro_id INT NOT NULL,
                asesor_nombre VARCHAR(100) NOT NULL,
                consulta TEXT NOT NULL,
                uso_transcripcion BOOLEAN DEFAULT FALSE,
                fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registro_id) REFERENCES expokossodo_registros(id) ON DELETE CASCADE,
                INDEX idx_registro_fecha (registro_id, fecha_consulta),
                INDEX idx_asesor (asesor_nombre)
            )
        """)
        
        # Agregar columna uso_transcripcion a tabla existente si no existe
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_consultas 
                ADD COLUMN uso_transcripcion BOOLEAN DEFAULT FALSE
            """)
            print("[OK] Columna 'uso_transcripcion' agregada a tabla expokossodo_consultas")
        except Error as e:
            if "Duplicate column name" not in str(e):
                print(f"[WARN] Error agregando columna uso_transcripcion: {e}")
            else:
                print("[OK] Columna 'uso_transcripcion' ya existe")

        # Agregar nuevas columnas a tabla expokossodo_registros para QR
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN qr_code VARCHAR(500) AFTER eventos_seleccionados
            """)
            print("[OK] Columna 'qr_code' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'qr_code' ya existe")
            else:
                print(f"Error agregando columna qr_code: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN qr_generado_at TIMESTAMP NULL AFTER qr_code
            """)
            print("[OK] Columna 'qr_generado_at' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'qr_generado_at' ya existe")
            else:
                print(f"Error agregando columna qr_generado_at: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN asistencia_general_confirmada BOOLEAN DEFAULT FALSE AFTER qr_generado_at
            """)
            print("[OK] Columna 'asistencia_general_confirmada' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'asistencia_general_confirmada' ya existe")
            else:
                print(f"Error agregando columna asistencia_general_confirmada: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE expokossodo_registros 
                ADD COLUMN fecha_asistencia_general TIMESTAMP NULL AFTER asistencia_general_confirmada
            """)
            print("[OK] Columna 'fecha_asistencia_general' agregada exitosamente")
        except Error as e:
            if "Duplicate column name" in str(e):
                print("[INFO] Columna 'fecha_asistencia_general' ya existe")
            else:
                print(f"Error agregando columna fecha_asistencia_general: {e}")
        
        connection.commit()
        print("[OK] Tablas y columnas QR creadas exitosamente")
        
        # Verificar si ya hay datos de ejemplo
        cursor.execute("SELECT COUNT(*) FROM expokossodo_eventos")
        count = cursor.fetchone()[0]
        
        if count == 0:
            populate_sample_data(cursor, connection)
        
        # Poblar slugs para eventos existentes que no los tengan
        print("[INFO] Verificando slugs de eventos existentes...")
        
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
        salas = ['sala1', 'sala2', 'sala3', 'sala4']
        
        # Datos de ejemplo para las charlas con descripciones
        charlas_data = [
            {
                "titulo": "Inteligencia Artificial en la Medicina", 
                "expositor": "Dr. María González", 
                "pais": "España",
                "descripcion": "## Revolucionando el Diagnóstico Médico\n\nExplora cómo la **inteligencia artificial** está transformando la medicina moderna. Esta presentación aborda:\n\n### Tecnologías Emergentes\n- **Machine Learning** en diagnóstico por imagen\n- Algoritmos de **análisis predictivo**\n- **Redes neuronales** para detección temprana\n\n### Casos de Éxito\n[OK] Detección de cáncer con **95% de precisión**\n[OK] Diagnóstico de enfermedades cardíacas\n[OK] Análisis automatizado de radiografías\n\n### Impacto en el Futuro\nConoce cómo la IA reducirá tiempos de diagnóstico y mejorará la precisión médica en los próximos años.",
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
                "descripcion": "## Transformación Digital en Salud\n\nDescubre cómo la **telemedicina** está revolucionando la atención médica:\n\n### Tecnologías Actuales\n- Consultas virtuales en tiempo real\n- Monitoreo remoto de pacientes\n- **IoT médico** y wearables\n\n### Beneficios Clave\n[OK] **Accesibilidad** universal a la atención médica\n[OK] Reducción de costos operativos\n[OK] Atención 24/7 desde cualquier lugar\n\n### Casos de Implementación\n📱 Apps móviles de diagnóstico\n🏥 Hospitales virtuales\n📊 Plataformas de seguimiento de pacientes",
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
                "descripcion": "## Medicina de Precisión Genética\n\nDescubre cómo la **genómica personalizada** está revolucionando los tratamientos médicos:\n\n### Secuenciación del ADN\n- **Análisis genómico completo**\n- Identificación de mutaciones\n- Predisposición a enfermedades\n\n### Tratamientos Personalizados\n💊 Farmacogenómica y dosificación precisa\n🧬 Terapias génicas específicas\n📊 Medicina predictiva y preventiva\n\n### Aplicaciones Clínicas\n[OK] Oncología personalizada\n[OK] Enfermedades hereditarias\n[OK] Medicina preventiva basada en genes",
                "imagen_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {"titulo": "Cirugía Mínimamente Invasiva", "expositor": "Dr. Giuseppe Rossi", "pais": "Italia", "descripcion": "## Técnicas Quirúrgicas Avanzadas\n\nDescubre las últimas innovaciones en **cirugía mínimamente invasiva**:\n\n- Laparoscopía avanzada\n- Técnicas endoscópicas\n- Recuperación acelerada\n\n[OK] Menor dolor postoperatorio\n[OK] Cicatrices mínimas\n[OK] Hospitalización reducida", "imagen_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},
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
        print("[OK] Datos de ejemplo insertados exitosamente")
        
    except Error as e:
        print(f"Error insertando datos de ejemplo: {e}")

def send_confirmation_email_async(email_data):
    """Versión asíncrona de envío de email - no bloquea la respuesta al usuario"""
    try:
        user_email = email_data['user_data']['correo']
        email_type = "actualización" if email_data['is_update'] else "confirmación"
        print(f"[EMAIL] Enviando {email_type} a {user_email} en background...")
        
        result = send_confirmation_email_enhanced(email_data)
        print(f"[EMAIL] {'Enviado exitosamente' if result else 'Error en el envío'} a {user_email}")
    except Exception as e:
        print(f"[ERROR] Error enviando email en background: {e}")

def send_confirmation_email_enhanced(email_data):
    """Envía email de confirmación o actualización según el contexto"""
    user_data = email_data['user_data']
    selected_events = email_data['eventos_completos']
    qr_text = email_data['qr_text']
    is_update = email_data['is_update']
    eventos_agregados = email_data.get('eventos_agregados', [])
    eventos_previos = email_data.get('eventos_previos', [])
    
    if is_update:
        return send_update_email(user_data, selected_events, qr_text, eventos_agregados, eventos_previos)
    else:
        return send_confirmation_email(user_data, selected_events, qr_text)

def send_update_email(user_data, all_events, qr_text, eventos_agregados_ids, eventos_previos_ids):
    """Envía email de actualización de registro con charlas anteriores y nuevas"""
    try:
        smtp_server = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('EMAIL_PORT', 587))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        
        msg = MIMEMultipart()
        msg['From'] = f"Kossodo <{email_user}>"
        msg['To'] = user_data['correo']
        msg['Subject'] = "Actualización de Registro - ExpoKossodo 2025"
        
        # Separar eventos en anteriores y nuevos
        eventos_anteriores = [e for e in all_events if e['id'] in eventos_previos_ids]
        eventos_nuevos = [e for e in all_events if e['id'] in eventos_agregados_ids]
        
        # Crear HTML para TODAS las charlas (anteriores + nuevas) usando el MISMO diseño original
        eventos_html = ""
        
        # Primero agregar las charlas NUEVAS con badge
        for evento in eventos_nuevos:
            eventos_html += f"""
            <tr>
                <td style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 15px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding-bottom: 12px;">
                                <div style="display: inline-block; background: #28a745; color: white; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">
                                    ✨ NUEVA CHARLA
                                </div>
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
                        </tr>
                    </table>
                </td>
            </tr>
            """
        
        # Luego agregar las charlas ANTERIORES sin badge
        for evento in eventos_anteriores:
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
                        </tr>
                    </table>
                </td>
            </tr>
            """
        
        # Usar la MISMA plantilla HTML que el email original, solo cambiar título y texto
        html_body = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Actualización de Registro - ExpoKossodo 2025</title>
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
                                    <img src="https://www.kossomet.com/AppUp/default/Expokossodo_logo_blanco_trans.png" alt="ExpoKossodo 2025" style="width: 200px; height: auto; margin-bottom: 30px;">
                                     
                                    <!-- Title - CAMBIO AQUÍ -->
                                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white; margin-bottom: 8px;">
                                        🔄 Registro Actualizado
                                    </h1>
                                    <p style="margin: 0; font-size: 18px; color: rgba(255, 255, 255, 0.8); font-weight: 400;">
                                        Nuevas charlas agregadas a tu agenda
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
                                        Tu registro ha sido <strong>actualizado exitosamente</strong>. Has agregado nuevas charlas a tu agenda personal. Aquí tienes todos los detalles actualizados:
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
                                    
                                    <!-- Selected Events Section - CAMBIO AQUÍ EN EL TÍTULO -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #01295c 0%, #1d2236 100%); padding: 25px; border-radius: 16px;">
                                                <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: white;">
                                                    Tu Agenda Actualizada ({len(all_events)} eventos)
                                                </h3>
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    {eventos_html}
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Important Information -->
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
                                                    <tr><td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;"><strong>Fechas de tus eventos:</strong> {', '.join(sorted(set([evento['fecha'].strftime('%d/%m/%Y') if hasattr(evento['fecha'], 'strftime') else str(evento['fecha']) for evento in all_events])))}</td></tr>
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
                                                <a href="https://expokossodo.com" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6cb79a 0%, #5aa085 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 15px rgba(108, 183, 154, 0.3); transition: all 0.3s ease;">
                                                    🌐 Visitar ExpoKossodo.com
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer with Social Links -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); padding: 30px; text-align: center;">
                                    <h4 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: white;">
                                        Gracias por actualizar tu registro
                                    </h4>
                                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #d1d5db; line-height: 1.6;">
                                        ¿Tienes alguna pregunta? Contáctanos:<br>
                                        📧 <a href="mailto:expokossodo@kossomet.com" style="color: #6cb79a;">expokossodo@kossomet.com</a><br>
                                        📱 WhatsApp: <a href="https://wa.me/51999999999" style="color: #6cb79a;">+51 999 999 999</a>
                                    </p>
                                    <div style="margin: 20px 0;">
                                        <a href="#" style="display: inline-block; margin: 0 10px; color: #6cb79a; text-decoration: none; font-size: 24px;">📘</a>
                                        <a href="#" style="display: inline-block; margin: 0 10px; color: #6cb79a; text-decoration: none; font-size: 24px;">📷</a>
                                        <a href="#" style="display: inline-block; margin: 0 10px; color: #6cb79a; text-decoration: none; font-size: 24px;">🐦</a>
                                    </div>
                                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                        © 2025 ExpoKossodo. Todos los derechos reservados.<br>
                                        Evento organizado por Kossodo Medical Group
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
        
        # Adjuntar QR si existe (usar QR existente del usuario, no generar nuevo)
        if qr_text:
            try:
                qr_img = generar_imagen_qr(qr_text)
                if qr_img:
                    qr_attachment = MIMEImage(qr_img)
                    qr_attachment.add_header('Content-Disposition', 'attachment', filename='qr_code_expokossodo.png')
                    msg.attach(qr_attachment)
                    print(f"[OK] QR existente adjuntado al email de actualización")
            except Exception as e:
                print(f"[WARN] Error adjuntando QR al email de actualización: {e}")
        
        # Enviar email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(email_user, email_password)
        server.send_message(msg)
        server.quit()
        
        print(f"[OK] Email de actualización enviado a {user_data['correo']}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error enviando email de actualización: {e}")
        return False

def send_confirmation_email(user_data, selected_events, qr_text=None):
    """Enviar email de confirmación con código QR adjunto"""
    try:
        smtp_server = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('EMAIL_PORT', 587))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        
        msg = MIMEMultipart()
        msg['From'] = f"Kossodo <{email_user}>"
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
                                     <img src="https://www.kossomet.com/AppUp/default/Expokossodo_logo_blanco_trans.png" alt="ExpoKossodo 2025" style="width: 200px; height: auto; margin-bottom: 30px;">
                                     
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
                    print("[OK] Código QR adjuntado al email exitosamente")
                else:
                    print("[WARN] No se pudo generar la imagen QR para adjuntar")
            except Exception as e:
                print(f"[WARN] Error adjuntando QR al email: {e}")
        
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
# --- ENDPOINTS DE HEALTH CHECK ---
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint para monitoreo"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()}), 200

@app.route('/api/health/db', methods=['GET'])
def db_health_check():
    """Health check de la base de datos"""
    try:
        connection = get_db_connection()
        if connection and connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            connection.close()
            return jsonify({
                "status": "healthy",
                "database": "connected",
                "timestamp": datetime.now().isoformat()
            }), 200
        else:
            return jsonify({
                "status": "unhealthy",
                "database": "disconnected",
                "timestamp": datetime.now().isoformat()
            }), 503
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "database": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503

@app.route('/api/eventos', methods=['GET'])
@log_execution_time
def get_eventos():
    """Obtener todos los eventos organizados por fecha (solo horarios activos)"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERROR] No se pudo obtener conexión para /api/eventos")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Optimización: usar índices y limitar campos
        query_start = time.time()
        # Consulta simplificada sin joins complejos  
        cursor.execute("""
            SELECT 
                e.id, e.titulo_charla, e.expositor, e.sala, e.hora, e.fecha,
                e.disponible, e.pais, e.descripcion, e.imagen_url, e.post,
                e.slots_disponibles, e.slots_ocupados
            FROM expokossodo_eventos e
            WHERE e.disponible = TRUE
            ORDER BY e.fecha, e.hora, e.sala
        """)
        eventos = cursor.fetchall()
        query_time = time.time() - query_start
        print(f"[SEARCH] Query /api/eventos tomó {query_time:.3f}s, {len(eventos)} eventos encontrados")
        
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
                'titulo_charla': evento.get('titulo_charla', ''),
                'expositor': evento.get('expositor', ''),
                'pais': evento.get('pais', ''),
                'descripcion': evento.get('descripcion', ''),
                'imagen_url': evento.get('imagen_url', ''),
                'post': evento.get('post', ''),
                'slots_disponibles': evento['slots_disponibles'],
                'slots_ocupados': evento['slots_ocupados'],
                'disponible': (
                    evento.get('disponible', True) and 
                    evento['slots_ocupados'] < evento['slots_disponibles']
                ),
                'marca_id': evento.get('marca_id'),
                'marca_nombre': evento.get('marca_nombre'),
                'marca_logo': evento.get('marca_logo'),
                'marca_expositor': evento.get('marca_expositor'),
                'slug': evento.get('slug', '')
            })
        
        return jsonify(eventos_por_fecha)
        
    except Exception as e:
        print(f"[ERROR] Error en /api/eventos: {str(e)}")
        print(f"[ERROR] Tipo de error: {type(e).__name__}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Error interno del servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("[LOCK] Conexión cerrada para /api/eventos")

@app.route('/api/evento/<slug>', methods=['GET'])
def get_evento_by_slug(slug):
    """Obtener un evento específico por su slug"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Buscar evento por slug
        cursor.execute("""
            SELECT 
                e.*,
                m.marca as marca_nombre,
                m.logo as marca_logo,
                m.expositor as marca_expositor
            FROM expokossodo_eventos e
            LEFT JOIN expokossodo_marcas m ON e.marca_id = m.id
            INNER JOIN expokossodo_horarios h ON e.hora = h.horario
            WHERE e.slug = %s AND h.activo = TRUE AND e.disponible = TRUE
        """, (slug,))
        
        evento = cursor.fetchone()
        
        if not evento:
            return jsonify({"error": "Evento no encontrado"}), 404
        
        # Formatear respuesta similar a la estructura del frontend
        evento_formateado = {
            'id': evento['id'],
            'fecha': evento['fecha'].strftime('%Y-%m-%d'),
            'hora': evento['hora'],
            'sala': evento['sala'],
            'titulo_charla': evento['titulo_charla'],
            'expositor': evento['expositor'],
            'pais': evento['pais'],
            'descripcion': evento.get('descripcion', ''),
            'imagen_url': evento.get('imagen_url', ''),
            'slots_disponibles': evento['slots_disponibles'],
            'slots_ocupados': evento['slots_ocupados'],
            'slug': evento['slug'],
            'disponible': (
                evento.get('disponible', True) and 
                evento['slots_ocupados'] < evento['slots_disponibles']
            ),
            'marca_id': evento.get('marca_id'),
            'marca_nombre': evento.get('marca_nombre'),
            'marca_logo': evento.get('marca_logo'),
            'marca_expositor': evento.get('marca_expositor')
        }
        
        return jsonify(evento_formateado)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ===== FUNCIONES AUXILIARES PARA REGISTRO =====

def validar_conflictos_horario(eventos_inscritos, eventos_nuevos, cursor):
    """
    Valida conflictos de horario entre eventos existentes y nuevos
    
    Args:
        eventos_inscritos: Lista de eventos ya inscritos [(id, fecha, hora), ...]
        eventos_nuevos: Lista de IDs de eventos nuevos a validar
        cursor: Cursor de base de datos
    
    Returns:
        tuple: (eventos_validos, eventos_conflictivos)
    """
    # WHY: Crear mapa de horarios ocupados para optimizar búsquedas
    horarios_ocupados = {}
    for evento in eventos_inscritos:
        evento_id, fecha, hora = evento['id'], evento['fecha'], evento['hora']
        # Manejar fecha como string si ya viene como string
        if isinstance(fecha, str):
            fecha_str = fecha
        else:
            fecha_str = fecha.strftime('%Y-%m-%d')
        if fecha_str not in horarios_ocupados:
            horarios_ocupados[fecha_str] = set()
        horarios_ocupados[fecha_str].add(str(hora))  # Asegurar que hora sea string
    
    # Validar eventos nuevos
    eventos_validos = []
    eventos_conflictivos = []
    
    if eventos_nuevos:
        placeholders = ','.join(['%s'] * len(eventos_nuevos))
        cursor.execute(f"""
            SELECT id, fecha, hora, titulo_charla, sala, slots_disponibles, slots_ocupados
            FROM expokossodo_eventos 
            WHERE id IN ({placeholders})
        """, eventos_nuevos)
        eventos_nuevos_detalles = cursor.fetchall()
        
        for evento in eventos_nuevos_detalles:
            evento_id = evento['id']
            fecha = evento['fecha']
            hora = evento['hora']
            titulo = evento['titulo_charla']
            sala = evento['sala']
            slots_disponibles = evento['slots_disponibles']
            slots_ocupados = evento['slots_ocupados']
            
            # Manejar fecha como string si es necesario
            if isinstance(fecha, str):
                fecha_str = fecha
            else:
                fecha_str = fecha.strftime('%Y-%m-%d')
            
            hora_str = str(hora)  # Asegurar que hora sea string
            
            # WHY: Verificar múltiples tipos de conflictos
            # 1. Conflicto de horario
            if (fecha_str in horarios_ocupados and 
                hora_str in horarios_ocupados[fecha_str]):
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo_charla': titulo,
                    'sala': sala,
                    'fecha': fecha_str,
                    'hora': hora_str,
                    'motivo': f'Conflicto de horario: ya tienes un evento registrado a las {hora_str} el {fecha_str}'
                })
            # 2. Verificar capacidad disponible
            elif slots_ocupados >= slots_disponibles:
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo_charla': titulo,
                    'sala': sala,
                    'fecha': fecha_str,
                    'hora': hora_str,
                    'motivo': f'Evento lleno: {slots_ocupados}/{slots_disponibles} cupos ocupados'
                })
            else:
                eventos_validos.append(evento_id)
    
    return eventos_validos, eventos_conflictivos

def obtener_eventos_usuario(registro_id, cursor):
    """
    Obtiene los eventos actuales de un usuario registrado
    
    Args:
        registro_id: ID del registro del usuario
        cursor: Cursor de base de datos
    
    Returns:
        List: Lista de eventos inscritos con detalles completos
    """
    cursor.execute("""
        SELECT e.id, e.fecha, e.hora, e.titulo_charla, e.sala
        FROM expokossodo_eventos e
        INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
        WHERE re.registro_id = %s
        ORDER BY e.fecha, e.hora
    """, (registro_id,))
    
    return cursor.fetchall()

@app.route('/api/registro', methods=['POST'])
def crear_registro():
    """
    Crear nuevo registro de usuario o actualizar registro existente
    
    Nueva lógica implementada:
    - Permite re-registrarse con el mismo correo
    - Maneja conflictos de horario inteligentemente
    - Registra solo charlas válidas (sin conflictos)
    - Mantiene el registro existente si ya existe el correo
    """
    data = request.get_json()
    
    # Detectar tipo de registro (por defecto 'eventos' para compatibilidad)
    tipo_registro = data.get('tipo_registro', 'eventos')
    
    # Validaciones básicas
    required_fields = ['nombres', 'correo', 'empresa', 'cargo', 'numero', 'eventos_seleccionados']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True, buffered=True)
    
    try:
        # Verificar disponibilidad de eventos según tipo de registro
        eventos_nuevos = data['eventos_seleccionados']
        
        # Solo validar eventos si es registro con eventos
        if tipo_registro == 'eventos':
            if not eventos_nuevos:
                return jsonify({"error": "Debe seleccionar al menos un evento"}), 400
        elif tipo_registro == 'general':
            # Para registro general, permitir array vacío
            eventos_nuevos = []
            data['eventos_seleccionados'] = []
        
        # === PASO 1: Verificar si el usuario ya está registrado ===
        cursor.execute("""
            SELECT id, nombres, eventos_seleccionados FROM expokossodo_registros 
            WHERE correo = %s
        """, (data['correo'],))
        
        usuario_existente = cursor.fetchone()
        modo_actualizacion = usuario_existente is not None
        
        if modo_actualizacion:
            # Usuario existe - flujo de actualización
            registro_id = usuario_existente['id']
            eventos_actuales_json = usuario_existente['eventos_seleccionados'] or '[]'
            eventos_actuales = json.loads(eventos_actuales_json)
            
            # WHY: Obtener eventos ya inscritos para validar conflictos
            eventos_inscritos = obtener_eventos_usuario(registro_id, cursor)
        else:
            # Usuario nuevo - flujo de creación
            eventos_actuales = []
            eventos_inscritos = []
        
        # === PASO 2: Validar conflictos de horario y capacidad ===
        # Solo validar si hay eventos (no aplica para registro general)
        if tipo_registro == 'general':
            eventos_validos = []
            eventos_conflictivos = []
        else:
            eventos_validos, eventos_conflictivos = validar_conflictos_horario(
                eventos_inscritos, eventos_nuevos, cursor
            )
        
        # === PASO 3: Verificar que los eventos nuevos existen ===
        if eventos_nuevos and tipo_registro != 'general':
            placeholders = ','.join(['%s'] * len(eventos_nuevos))
            cursor.execute(f"""
                SELECT id FROM expokossodo_eventos 
                WHERE id IN ({placeholders})
            """, eventos_nuevos)
            eventos_existentes = [row['id'] for row in cursor.fetchall()]
            
            # Filtrar eventos que no existen
            eventos_no_existentes = [eid for eid in eventos_nuevos if eid not in eventos_existentes]
            if eventos_no_existentes:
                return jsonify({
                    "error": f"Los siguientes eventos no existen: {eventos_no_existentes}"
                }), 400
        
        # === PASO 4: Verificar si hay eventos válidos para procesar ===
        # Para registro general, siempre continuar aunque no haya eventos
        if not eventos_validos and tipo_registro != 'general':
            # No hay eventos válidos para agregar
            if modo_actualizacion:
                # Para usuarios existentes, devolver 200 con información detallada
                response_data = {
                    "success": False,
                    "message": "No se pudieron agregar las charlas seleccionadas debido a conflictos de horario o eventos llenos.",
                    "eventos_omitidos": eventos_conflictivos,
                    "eventos_agregados": [],
                    "modo": "sin_cambios",
                    "registro_id": registro_id,
                    "info": "Tu registro anterior se mantiene sin cambios. Puedes seleccionar otros eventos en diferentes horarios."
                }
                return jsonify(response_data), 200
            else:
                # Para usuarios nuevos, mantener el 400
                response_data = {
                    "success": False,
                    "message": "No se pudo completar el registro. Todas las charlas seleccionadas tienen conflictos o están llenas.",
                    "eventos_omitidos": eventos_conflictivos,
                    "eventos_agregados": [],
                    "modo": "sin_registro"
                }
                return jsonify(response_data), 400
        
        # === PASO 5: Actualización transaccional de la base de datos ===
        try:
            # WHY: Evitar duplicados al combinar eventos actuales con nuevos válidos
            eventos_finales = list(set(eventos_actuales + eventos_validos))
            
            if modo_actualizacion:
                # Actualizar registro existente
                cursor.execute("""
                    UPDATE expokossodo_registros 
                    SET eventos_seleccionados = %s, fecha_registro = NOW()
                    WHERE id = %s
                """, (json.dumps(eventos_finales), registro_id))
            else:
                # === GENERAR CÓDIGO QR para usuario nuevo ===
                qr_text = generar_texto_qr(
                    data['nombres'], 
                    data['numero'], 
                    data['cargo'], 
                    data['empresa']
                )
                
                if not qr_text:
                    return jsonify({"error": "Error generando código QR"}), 500
                
                # Crear nuevo registro - marcar asistencia_general si es tipo general
                if tipo_registro == 'general':
                    cursor.execute("""
                        INSERT INTO expokossodo_registros 
                        (nombres, correo, empresa, cargo, numero, expectativas, eventos_seleccionados, 
                         qr_code, qr_generado_at, asistencia_general_confirmada)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), TRUE)
                    """, (
                        data['nombres'],
                        data['correo'],
                        data['empresa'],
                        data['cargo'],
                        data['numero'],
                        data.get('expectativas', ''),
                        json.dumps([]),  # Array vacío para registro general
                        qr_text
                    ))
                else:
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
                        json.dumps(eventos_finales),
                        qr_text
                    ))
                registro_id = cursor.lastrowid
            
            # Insertar relaciones evento-registro solo para eventos válidos
            for evento_id in eventos_validos:
                # WHY: Verificar si la relación ya existe para evitar duplicados
                cursor.execute("""
                    SELECT 1 FROM expokossodo_registro_eventos 
                    WHERE registro_id = %s AND evento_id = %s
                    LIMIT 1
                """, (registro_id, evento_id))
                
                existe = cursor.fetchone()
                if not existe:
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
        
        # === PASO 6: Preparar respuesta detallada ===
        # Obtener detalles de eventos agregados
        eventos_agregados_detalles = []
        if eventos_validos:
            placeholders = ','.join(['%s'] * len(eventos_validos))
            cursor.execute(f"""
                SELECT id, titulo_charla, sala, fecha, hora
                FROM expokossodo_eventos 
                WHERE id IN ({placeholders})
                ORDER BY fecha, hora
            """, eventos_validos)
            
            for evento in cursor.fetchall():
                eventos_agregados_detalles.append({
                    "id": evento['id'],
                    "titulo_charla": evento['titulo_charla'],
                    "sala": evento['sala'],
                    "fecha": evento['fecha'].strftime('%Y-%m-%d'),
                    "hora": str(evento['hora'])
                })
        
        # Preparar respuesta
        response_data = {
            "success": True,
            "registro_id": registro_id,
            "modo": "actualizado" if modo_actualizacion else "creado",
            "tipo_registro": tipo_registro,
            "eventos_agregados": eventos_agregados_detalles,
            "eventos_omitidos": eventos_conflictivos,
            "email_sent": False
        }
        
        # Mensaje dinámico basado en resultados
        if tipo_registro == 'general':
            response_data["message"] = f"Registro general {'actualizado' if modo_actualizacion else 'creado'} exitosamente. Asistencia general confirmada."
            response_data["asistencia_general"] = True
        elif eventos_conflictivos and eventos_validos:
            response_data["message"] = f"Registro {'actualizado' if modo_actualizacion else 'creado'} exitosamente. {len(eventos_validos)} charla(s) agregada(s), {len(eventos_conflictivos)} omitida(s) por conflictos."
        elif eventos_validos:
            response_data["message"] = f"Registro {'actualizado' if modo_actualizacion else 'creado'} exitosamente. {len(eventos_validos)} charla(s) agregada(s)."
        
        # === PASO 7: Enviar email de confirmación ===
        # Enviar email para registro general o cuando hay eventos válidos
        if tipo_registro == 'general' or eventos_validos or modo_actualizacion:
            # Para actualización: obtener TODOS los eventos (anteriores + nuevos)
            # Para registro nuevo: solo los eventos nuevos
            if modo_actualizacion:
                # Combinar eventos anteriores + nuevos para mostrar agenda completa
                todos_los_eventos_ids = list(set(eventos_actuales + eventos_validos))
            else:
                todos_los_eventos_ids = eventos_validos
            
            if todos_los_eventos_ids:
                # Obtener datos completos de TODOS los eventos para el email
                placeholders = ','.join(['%s'] * len(todos_los_eventos_ids))
                cursor.execute(f"""
                    SELECT e.* FROM expokossodo_eventos e
                    WHERE e.id IN ({placeholders})
                    ORDER BY e.fecha, e.hora
                """, todos_los_eventos_ids)
                
                eventos_completos = cursor.fetchall()
            else:
                eventos_completos = []
            
            # Para usuario existente, usar QR existente; para nuevo, usar el recién generado
            if modo_actualizacion:
                cursor.execute("SELECT qr_code FROM expokossodo_registros WHERE id = %s", (registro_id,))
                qr_existente = cursor.fetchone()
                qr_text = qr_existente['qr_code'] if qr_existente else None
            
            if qr_text:
                # Preparar información para el email
                email_data = {
                    'user_data': data.copy(),
                    'eventos_completos': eventos_completos.copy(),
                    'qr_text': qr_text,
                    'is_update': modo_actualizacion,
                    'eventos_agregados': eventos_validos if modo_actualizacion else eventos_validos,
                    'eventos_previos': eventos_actuales if modo_actualizacion else []
                }
                
                # Envío asíncrono del email para acelerar la respuesta al usuario
                threading.Thread(
                    target=send_confirmation_email_async,
                    args=(email_data,),
                    daemon=True
                ).start()
                
                response_data["email_sent"] = True  # Siempre True - se envía en background
                response_data["qr_code"] = qr_text
                response_data["qr_generated"] = True
        
        return jsonify(response_data)
        
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
                e.id, e.fecha, e.hora, e.sala, e.titulo_charla, e.expositor, e.pais, 
                e.descripcion, e.imagen_url, e.post, e.slots_disponibles, e.slots_ocupados,
                e.disponible, e.created_at, e.marca_id, e.rubro, e.slug,
                m.marca as marca_nombre, m.logo as marca_logo
            FROM expokossodo_eventos e
            LEFT JOIN expokossodo_marcas m ON e.marca_id = m.id
            ORDER BY e.fecha, e.hora, e.sala
        """)
        
        eventos = cursor.fetchall()
        
        # Organizar por fecha para la interfaz y parsear rubro
        eventos_por_fecha = {}
        for evento in eventos:
            fecha_str = evento['fecha'].strftime('%Y-%m-%d')
            if fecha_str not in eventos_por_fecha:
                eventos_por_fecha[fecha_str] = []
            
            # Parsear rubro de JSON string a array
            if evento['rubro']:
                try:
                    evento['rubro'] = json.loads(evento['rubro'])
                except (json.JSONDecodeError, TypeError):
                    evento['rubro'] = []
            else:
                evento['rubro'] = []
            
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
        
        # Actualizar evento - AHORA INCLUYE RUBRO, DISPONIBLE, MARCA_ID Y POST
        update_query = """
            UPDATE expokossodo_eventos 
            SET titulo_charla = %s, expositor = %s, pais = %s, 
                descripcion = %s, imagen_url = %s, post = %s, disponible = %s, marca_id = %s, rubro = %s
            WHERE id = %s
        """
        
        # Procesar rubro como JSON
        rubro_data = data.get('rubro', [])
        if isinstance(rubro_data, list):
            rubro_json = json.dumps(rubro_data)
        else:
            rubro_json = None
        
        cursor.execute(update_query, (
            data['titulo_charla'],
            data['expositor'],
            data['pais'],
            data.get('descripcion', ''),
            data.get('imagen_url', None),
            data.get('post', None),
            data.get('disponible', True),
            data.get('marca_id', None),
            rubro_json,
            evento_id
        ))
        
        connection.commit()
        
        # Log del cambio
        estado_disponible = "disponible" if data.get('disponible', True) else "no disponible"
        print(f"[OK] Evento {evento_id} actualizado por admin: {data['titulo_charla']} - {estado_disponible}")
        
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
        print(f"[OK] Evento {evento_id} ({evento['titulo_charla']}) {estado_texto} por admin")
        
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

@app.route('/api/verificar/obtener-todos-registros', methods=['GET'])
def obtener_todos_registros_cache():
    """Obtener todos los registros con QR para cache en frontend"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERROR] No se pudo obtener conexión a la base de datos")
            return jsonify({
                "success": False,
                "error": "Error de conexión a la base de datos"
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Obtener todos los registros activos con QR
        query = """
        SELECT 
            r.id,
            r.nombres,
            r.correo,
            r.empresa,
            r.cargo,
            r.numero,
            r.qr_code,
            r.qr_generado_at,
            r.asistencia_general_confirmada,
            r.fecha_asistencia_general,
            r.fecha_registro,
            r.eventos_seleccionados
        FROM expokossodo_registros r
        ORDER BY r.id DESC
        """
        
        cursor.execute(query)
        registros = cursor.fetchall()
        
        # Procesar registros para usar QR existente o generar si no existe
        for registro in registros:
            # Usar QR code existente o generar si no existe
            if registro.get('qr_code'):
                registro['qr_text'] = registro['qr_code']
            else:
                # Generar QR solo si no existe
                registro['qr_text'] = generar_texto_qr(
                    registro['nombres'],
                    registro['numero'],
                    registro['cargo'],
                    registro['empresa']
                )
            
            # Convertir fechas a string
            if registro.get('fecha_registro'):
                registro['fecha_registro'] = registro['fecha_registro'].isoformat() if registro['fecha_registro'] else None
            if registro.get('qr_generado_at'):
                registro['qr_generado_at'] = registro['qr_generado_at'].isoformat() if registro['qr_generado_at'] else None
            if registro.get('fecha_asistencia_general'):
                registro['fecha_asistencia_general'] = registro['fecha_asistencia_general'].isoformat() if registro['fecha_asistencia_general'] else None
            
            # Agregar estado de asistencia
            registro['estado_asistencia'] = 'confirmada' if registro.get('asistencia_general_confirmada') else 'pendiente'
        
        # Cache ultra-ligero: Contar eventos desde eventos_seleccionados
        import json
        for registro in registros:
            # Contar eventos desde JSON de eventos_seleccionados
            eventos_count = 0
            if registro.get('eventos_seleccionados'):
                try:
                    eventos_seleccionados_str = str(registro['eventos_seleccionados'])
                    eventos_ids = json.loads(eventos_seleccionados_str)
                    if isinstance(eventos_ids, list):
                        eventos_count = len(eventos_ids)
                except Exception as e:
                    # Silenciar error, mantener eventos_count = 0
                    eventos_count = 0
            
            registro['total_eventos'] = eventos_count  # Número real de eventos
            registro['eventos'] = []  # Vacío para cache ligero - se cargan bajo demanda
        
        return jsonify({
            "success": True,
            "total": len(registros),
            "registros": registros,
            "timestamp": datetime.now().isoformat(),
            "optimized": True,
            "message": f"Cache optimizado: {len(registros)} registros con datos esenciales"
        })
        
    except Exception as e:
        print(f"Error obteniendo registros para cache: {e}")
        return jsonify({
            "success": False,
            "error": "Error obteniendo registros"
        }), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/verificar/obtener-eventos-usuario/<int:usuario_id>', methods=['GET'])
def obtener_eventos_usuario_api(usuario_id):
    """Obtener eventos detallados de un usuario específico (para cuando se necesiten)"""
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERROR] No se pudo obtener conexión a la base de datos")
            return jsonify({
                "success": False,
                "error": "Error de conexión a la base de datos"
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                e.id as evento_id,
                e.titulo_charla,
                e.sala,
                e.hora,
                e.fecha,
                e.expositor,
                e.pais,
                CASE WHEN aps.id IS NOT NULL THEN 'presente' ELSE 'ausente' END as estado_sala
            FROM expokossodo_registro_eventos re
            JOIN expokossodo_eventos e ON re.evento_id = e.id
            LEFT JOIN expokossodo_asistencias_por_sala aps ON e.id = aps.evento_id AND aps.registro_id = re.registro_id
            WHERE re.registro_id = %s
            ORDER BY e.fecha, e.hora
        """, (usuario_id,))
        
        eventos = cursor.fetchall()
        
        # Convertir fechas de eventos
        for evento in eventos:
            if evento.get('fecha'):
                evento['fecha'] = evento['fecha'].isoformat() if evento['fecha'] else None
        
        return jsonify({
            "success": True,
            "eventos": eventos,
            "total": len(eventos)
        })
        
    except Exception as e:
        print(f"Error obteniendo eventos del usuario {usuario_id}: {e}")
        return jsonify({
            "success": False,
            "error": "Error obteniendo eventos del usuario"
        }), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/verificar/generar-qr-impresion', methods=['POST'])
def generar_qr_para_impresion():
    """Generar código QR para impresión basado en datos del usuario"""
    data = request.get_json()
    
    if not data or 'usuario_datos' not in data:
        return jsonify({"error": "Datos del usuario requeridos"}), 400
    
    usuario_datos = data['usuario_datos']
    
    # Validar campos requeridos
    required_fields = ['nombres', 'numero', 'cargo', 'empresa']
    for field in required_fields:
        if field not in usuario_datos:
            return jsonify({"error": f"Campo requerido en usuario_datos: {field}"}), 400
    
    try:
        # Generar texto QR usando los datos actuales del usuario
        qr_text = generar_texto_qr(
            usuario_datos['nombres'],
            usuario_datos['numero'], 
            usuario_datos['cargo'],
            usuario_datos['empresa']
        )
        
        if not qr_text:
            return jsonify({"error": "Error generando texto QR"}), 500
        
        # Generar imagen QR
        qr_image_bytes = generar_imagen_qr(qr_text)
        
        if not qr_image_bytes:
            return jsonify({"error": "Error generando imagen QR"}), 500
        
        # Convertir a base64 para envío
        import base64
        qr_base64 = base64.b64encode(qr_image_bytes).decode('utf-8')
        
        return jsonify({
            "success": True,
            "qr_text": qr_text,
            "qr_image_base64": qr_base64,
            "filename": f"QR_{usuario_datos['nombres'].replace(' ', '_')}_Reimpresion.png"
        })
        
    except Exception as e:
        print(f"Error generando QR para impresión: {e}")
        return jsonify({"error": "Error interno generando QR"}), 500

@app.route('/api/verificar/imprimir-termica', methods=['POST'])
def imprimir_qr_termica():
    """Imprimir QR en impresora térmica 4BARCODE 3B-303B"""
    if not THERMAL_PRINTER_DISPONIBLE:
        return jsonify({"error": "Módulo de impresora térmica no disponible"}), 503
    
    data = request.get_json()
    
    if not data or 'usuario_datos' not in data:
        return jsonify({"error": "Datos del usuario requeridos"}), 400
    
    usuario_datos = data['usuario_datos']
    qr_text = data.get('qr_text', '')
    mode = data.get('mode', 'TSPL')  # TSPL o ESCPOS
    
    # Validar campos requeridos
    required_fields = ['nombres']
    for field in required_fields:
        if field not in usuario_datos:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    # IMPORTANTE: El QR text es OBLIGATORIO - debe venir el QR escaneado
    if not qr_text:
        print(f"[ERROR] No se recibió qr_text. Data recibida: {data}")
        return jsonify({
            "error": "El código QR es requerido para la impresión",
            "detail": "Debe enviar el QR escaneado original, no se genera uno nuevo"
        }), 400
    
    try:
        # Log para debug del QR recibido
        print(f"[IMPRESION] QR recibido: {qr_text}")
        print(f"[IMPRESION] Usuario: {usuario_datos.get('nombres', 'Sin nombre')}")
        
        # Inicializar impresora
        printer = TermalPrinter4BARCODE()
        
        # Imprimir etiqueta
        result = printer.print_qr_label(qr_text, usuario_datos, mode)
        
        if result['success']:
            return jsonify({
                "success": True,
                "message": "Etiqueta enviada a impresora térmica",
                "printer": result.get('printer', 'Desconocida'),
                "qr_text": qr_text
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Error desconocido'),
                "details": result.get('details', '')
            }), 500
            
    except Exception as e:
        print(f"Error imprimiendo en térmica: {e}")
        return jsonify({
            "success": False,
            "error": "Error al imprimir en impresora térmica",
            "details": str(e)
        }), 500

@app.route('/api/verificar/estado-impresora', methods=['GET'])
def obtener_estado_impresora():
    """Obtener estado de la impresora térmica"""
    try:
        # Simplificado para evitar errores en producción
        return jsonify({
            "success": True,
            "printer_available": THERMAL_PRINTER_DISPONIBLE,
            "status": "ready" if THERMAL_PRINTER_DISPONIBLE else "not_available",
            "message": "Impresora disponible" if THERMAL_PRINTER_DISPONIBLE else "Impresora no disponible en este servidor"
        })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Error obteniendo estado de impresora",
            "details": str(e)
        }), 500

@app.route('/api/verificar/test-impresora', methods=['POST'])
def test_impresora_termica():
    """Imprimir etiqueta de prueba"""
    if not THERMAL_PRINTER_DISPONIBLE:
        return jsonify({"error": "Módulo de impresora térmica no disponible"}), 503
    
    try:
        printer = TermalPrinter4BARCODE()
        result = printer.test_print()
        
        if result['success']:
            return jsonify({
                "success": True,
                "message": "Etiqueta de prueba enviada correctamente",
                "printer": result.get('printer', 'Desconocida')
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Error en impresión de prueba'),
                "details": result.get('details', '')
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Error en test de impresora",
            "details": str(e)
        }), 500

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

# ===== FUNCIONES DE CAPTURA DE FOTO Y FTP =====

def capturar_foto_rapida(camera_index=0):
    """Captura una foto rápidamente de la cámara y retorna los bytes de la imagen"""
    if not CV2_AVAILABLE:
        print("[FOTO] OpenCV no está disponible - captura de foto deshabilitada")
        return None
        
    try:
        cap = cv2.VideoCapture(camera_index)
        
        if not cap.isOpened():
            print(f"[FOTO] No se pudo abrir la cámara {camera_index}")
            return None
        
        # Configuraciones para velocidad máxima
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Capturar un frame
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            # Convertir a bytes JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return buffer.tobytes()
        
        print("[FOTO] No se pudo capturar frame de la cámara")
        return None
        
    except Exception as e:
        print(f"[FOTO] Error capturando foto: {str(e)}")
        return None

def sanitizar_nombre_archivo(nombre):
    """Convierte el nombre a un formato válido para archivo"""
    # Eliminar caracteres especiales y acentos
    nombre = re.sub(r'[àáäâ]', 'a', nombre.lower())
    nombre = re.sub(r'[èéëê]', 'e', nombre)
    nombre = re.sub(r'[ìíïî]', 'i', nombre)
    nombre = re.sub(r'[òóöô]', 'o', nombre)
    nombre = re.sub(r'[ùúüû]', 'u', nombre)
    nombre = re.sub(r'[ñ]', 'n', nombre)
    
    # Reemplazar espacios por underscore y eliminar caracteres no alfanuméricos
    nombre = re.sub(r'[^a-z0-9\s]', '', nombre)
    nombre = nombre.replace(' ', '_')
    
    # Capitalizar primera letra de cada palabra
    nombre = '_'.join(word.capitalize() for word in nombre.split('_'))
    
    return nombre + '.jpg'

def subir_foto_ftp(imagen_bytes, nombre_archivo):
    """Sube una foto al servidor FTP"""
    try:
        # Obtener credenciales del .env
        ftp_host = os.getenv('FTP_HOST', 'ftp.kossomet.com')
        ftp_user = os.getenv('FTP_USER', 'marketing@kossomet.com')
        ftp_pass = os.getenv('FTP_PASS', '#k55d.202$INT')
        
        # Conectar al FTP
        ftp = ftplib.FTP(ftp_host)
        ftp.login(ftp_user, ftp_pass)
        
        # Cambiar al directorio destino
        ftp.cwd('/public_html/clientexpokossodo/')
        
        # Subir archivo desde memoria
        bio = io.BytesIO(imagen_bytes)
        ftp.storbinary(f'STOR {nombre_archivo}', bio)
        
        ftp.quit()
        
        # Retornar URL pública (incluyendo public_html en la URL)
        url = f"https://www.kossomet.com/public_html/clientexpokossodo/{nombre_archivo}"
        print(f"[FTP] Foto subida exitosamente: {url}")
        return url
        
    except Exception as e:
        print(f"[FTP] Error subiendo foto: {str(e)}")
        return None

def capturar_y_subir_foto_async(registro_id, nombres):
    """Función asíncrona para capturar y subir foto en background"""
    try:
        print(f"[FOTO] Iniciando captura para {nombres} (ID: {registro_id})")
        
        # Capturar foto
        imagen_bytes = capturar_foto_rapida()
        if not imagen_bytes:
            print(f"[FOTO] No se pudo capturar foto para {nombres}")
            return
        
        # Generar nombre de archivo
        nombre_archivo = sanitizar_nombre_archivo(nombres)
        
        # Subir al FTP
        url = subir_foto_ftp(imagen_bytes, nombre_archivo)
        if url:
            print(f"[FOTO] Foto de {nombres} subida exitosamente")
            print(f"[FOTO] URL: {url}")
        else:
            print(f"[FOTO] Error subiendo foto de {nombres}")
            
    except Exception as e:
        print(f"[FOTO] Error en proceso de captura: {str(e)}")

@app.route('/api/verificar/capturar-foto', methods=['POST'])
def capturar_foto_endpoint():
    """Endpoint para capturar foto y subirla al FTP"""
    data = request.get_json()
    
    registro_id = data.get('registro_id')
    nombres = data.get('nombres')
    
    if not registro_id or not nombres:
        return jsonify({"error": "registro_id y nombres son requeridos"}), 400
    
    # Ejecutar en background para no bloquear
    thread = threading.Thread(
        target=capturar_y_subir_foto_async,
        args=(registro_id, nombres)
    )
    thread.daemon = True
    thread.start()
    
    # Retornar inmediatamente
    return jsonify({
        "success": True,
        "message": "Captura de foto iniciada"
    })

@app.route('/api/verificar/obtener-todos-eventos', methods=['GET'])
def obtener_todos_eventos_sin_filtros():
    """Obtener TODOS los eventos sin filtros para cache del frontend de verificación"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Consulta SIN filtros - obtener TODOS los eventos
        cursor.execute("""
            SELECT 
                e.id, e.titulo_charla, e.expositor, e.sala, e.hora, e.fecha,
                e.disponible, e.pais, e.descripcion, e.imagen_url, e.post,
                e.slots_disponibles, e.slots_ocupados
            FROM expokossodo_eventos e
            ORDER BY e.id
        """)
        eventos = cursor.fetchall()
        
        print(f"[CACHE EVENTOS] Devolviendo {len(eventos)} eventos SIN FILTROS")
        
        # Convertir fechas para JSON
        for evento in eventos:
            if evento.get('fecha'):
                evento['fecha'] = evento['fecha'].isoformat() if evento['fecha'] else None
        
        return jsonify({
            "success": True,
            "eventos": eventos,
            "total": len(eventos)
        })
        
    except Exception as e:
        print(f"[ERROR] obtener-todos-eventos: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/verificar/test-whatsapp', methods=['POST'])
def test_whatsapp_webhook():
    """Endpoint de prueba para verificar los datos que se envían al webhook de WhatsApp"""
    try:
        data = request.get_json()
        
        print("\n" + "="*60)
        print("[WHATSAPP TEST] 📨 DATOS RECIBIDOS PARA WEBHOOK:")
        print("="*60)
        print(f"[WHATSAPP TEST] 👤 Nombre: {data.get('nombre', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP TEST] 🏢 Empresa: {data.get('empresa', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP TEST] 💼 Cargo: {data.get('cargo', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP TEST] 🕐 Fecha/Hora: {data.get('fecha_hora', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP TEST] 📸 Photo URL: {data.get('photo', 'NO DISPONIBLE')}")
        print("="*60)
        
        # Verificar que todos los campos requeridos estén presentes
        required_fields = ['nombre', 'empresa', 'cargo', 'fecha_hora']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            print(f"[WHATSAPP TEST] ⚠️  CAMPOS FALTANTES: {missing_fields}")
            return jsonify({
                "success": False,
                "error": f"Campos requeridos faltantes: {missing_fields}",
                "received_data": data
            }), 400
        
        # Simular respuesta exitosa como el webhook real
        response_data = {
            "success": True,
            "message": "Datos válidos para WhatsApp webhook",
            "data": {
                "employee_name": data['nombre'],
                "company": data['empresa'],
                "cargo": data['cargo'],
                "timestamp": data['fecha_hora'],
                "has_photo": bool(data.get('photo')),
                "photo_url": data.get('photo'),
                "test_mode": True
            }
        }
        
        print(f"[WHATSAPP TEST] ✅ RESPUESTA SIMULADA: {response_data}")
        print("="*60 + "\n")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[WHATSAPP TEST] ❌ ERROR: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/verificar/whatsapp-proxy', methods=['POST'])
def whatsapp_proxy():
    """Proxy para evitar problemas de CORS con el webhook de WhatsApp"""
    try:
        data = request.get_json()
        
        print("\n" + "="*60)
        print("[WHATSAPP PROXY] 📤 REENVIANDO DATOS AL WEBHOOK:")
        print("="*60)
        print(f"[WHATSAPP PROXY] 👤 Nombre: {data.get('nombre', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP PROXY] 🏢 Empresa: {data.get('empresa', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP PROXY] 💼 Cargo: {data.get('cargo', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP PROXY] 🕐 Fecha/Hora: {data.get('fecha_hora', 'NO DISPONIBLE')}")
        print(f"[WHATSAPP PROXY] 📸 Photo URL: {data.get('photo', 'NO DISPONIBLE')}")
        print("="*60)
        
        # Reenviar al webhook de WhatsApp
        webhook_url = "https://expokossodowhatsappvisita-production.up.railway.app/attendance-webhook"
        
        print(f"[WHATSAPP PROXY] 🚀 Enviando a: {webhook_url}")
        
        webhook_response = requests.post(
            webhook_url,
            json=data,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'ExpoKossodo-Backend/1.0'
            },
            timeout=10
        )
        
        print(f"[WHATSAPP PROXY] 📨 Respuesta del webhook - Status: {webhook_response.status_code}")
        
        if webhook_response.status_code == 200:
            try:
                webhook_data = webhook_response.json()
                print(f"[WHATSAPP PROXY] ✅ Respuesta del webhook: {webhook_data}")
                
                # Verificar si WhatsApp envió el mensaje correctamente
                if webhook_data.get('success'):
                    message_id = webhook_data.get('data', {}).get('message_id', 'NO DISPONIBLE')
                    print(f"[WHATSAPP PROXY] 📱 MESSAGE ID: {message_id}")
                    print("[WHATSAPP PROXY] ✅ MENSAJE DE WHATSAPP ENVIADO EXITOSAMENTE")
                else:
                    print(f"[WHATSAPP PROXY] ⚠️  WEBHOOK DEVOLVIÓ SUCCESS=FALSE: {webhook_data}")
                
                print("="*60 + "\n")
                return jsonify(webhook_data)
                
            except Exception as json_error:
                print(f"[WHATSAPP PROXY] ⚠️  Respuesta no es JSON válido: {webhook_response.text}")
                print("="*60 + "\n")
                return jsonify({
                    "success": False,
                    "error": "Respuesta del webhook no es JSON válido",
                    "raw_response": webhook_response.text
                }), 500
        else:
            print(f"[WHATSAPP PROXY] ❌ Error HTTP: {webhook_response.status_code}")
            print(f"[WHATSAPP PROXY] ❌ Respuesta: {webhook_response.text}")
            print("="*60 + "\n")
            return jsonify({
                "success": False,
                "error": f"Webhook devolvió status {webhook_response.status_code}",
                "response": webhook_response.text
            }), webhook_response.status_code
            
    except requests.exceptions.Timeout:
        print("[WHATSAPP PROXY] ⏰ TIMEOUT - El webhook tardó más de 10 segundos")
        print("="*60 + "\n")
        return jsonify({
            "success": False,
            "error": "Timeout al conectar con el webhook de WhatsApp"
        }), 504
        
    except requests.exceptions.ConnectionError:
        print("[WHATSAPP PROXY] 🚫 ERROR DE CONEXIÓN - No se pudo conectar al webhook")
        print("="*60 + "\n")
        return jsonify({
            "success": False,
            "error": "No se pudo conectar con el webhook de WhatsApp"
        }), 503
        
    except Exception as e:
        print(f"[WHATSAPP PROXY] ❌ ERROR INESPERADO: {str(e)}")
        print("="*60 + "\n")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

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
                print(f"[OK] Evento {evento['id']} ({evento['titulo_charla']}): {evento['registrados']} registrados, {evento['presentes']} presentes")
            
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

@app.route('/api/verificar-sala/agregar-asistente', methods=['POST'])
def agregar_asistente_a_evento():
    """Agregar un usuario registrado a un evento específico cuando no está inscrito"""
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
        
        # Verificar que el evento existe
        cursor.execute("""
            SELECT id, titulo_charla, hora, sala, fecha, slots_disponibles, slots_ocupados
            FROM expokossodo_eventos 
            WHERE id = %s
        """, (data['evento_id'],))
        
        evento = cursor.fetchone()
        if not evento:
            return jsonify({"error": "Evento no encontrado"}), 404
        
        # Verificar si ya está registrado en este evento
        cursor.execute("""
            SELECT id FROM expokossodo_registro_eventos 
            WHERE registro_id = %s AND evento_id = %s
        """, (usuario['id'], data['evento_id']))
        
        if cursor.fetchone():
            return jsonify({
                "error": "Usuario ya está registrado en este evento",
                "usuario": usuario['nombres']
            }), 400
        
        # NOTA: Se permite sobrecupo para casos especiales - asesor puede agregar sin límite de cupos
        
        # Agregar usuario al evento
        cursor.execute("""
            INSERT INTO expokossodo_registro_eventos (registro_id, evento_id)
            VALUES (%s, %s)
        """, (usuario['id'], data['evento_id']))
        
        # Actualizar slots ocupados
        cursor.execute("""
            UPDATE expokossodo_eventos 
            SET slots_ocupados = slots_ocupados + 1 
            WHERE id = %s
        """, (data['evento_id'],))
        
        # Registrar inmediatamente la asistencia
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
            f"Agregado y registrado por {data['asesor_verificador']} - Sobrecupo autorizado"
        ))
        
        connection.commit()
        
        return jsonify({
            "message": "Usuario agregado al evento y asistencia registrada exitosamente",
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
            "agregado_por": data['asesor_verificador'],
            "autorizado": True
        })
        
    except Error as e:
        connection.rollback()
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
@log_execution_time
def get_horarios_activos():
    """Obtener solo los horarios activos (para uso en frontend)"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERROR] No se pudo obtener conexión para /api/admin/horarios/activos")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor()
        
        query_start = time.time()
        cursor.execute("""
            SELECT horario FROM expokossodo_horarios 
            WHERE activo = TRUE 
            ORDER BY horario
        """)
        horarios = [row[0] for row in cursor.fetchall()]
        query_time = time.time() - query_start
        print(f"[SEARCH] Query /api/admin/horarios/activos tomó {query_time:.3f}s, {len(horarios)} horarios encontrados")
        
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
@log_execution_time
def get_fechas_info_activas():
    """Obtener información de fechas activas (para público)"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERROR] No se pudo obtener conexión para /api/fechas-info/activas")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor()
        
        query_start = time.time()
        cursor.execute("""
            SELECT 
                fecha, rubro, titulo_dia, descripcion, 
                ponentes_destacados, marcas_patrocinadoras, paises_participantes,
                imagen_url
            FROM expokossodo_fecha_info 
            WHERE activo = TRUE
            ORDER BY fecha ASC
        """)
        query_time = time.time() - query_start
        print(f"[SEARCH] Query /api/fechas-info/activas tomó {query_time:.3f}s")
        
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

# ===== ENDPOINT PARA MARCAS =====

@app.route('/api/admin/marcas', methods=['GET'])
def get_marcas():
    """Obtener todas las marcas disponibles"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT id, marca, expositor, logo
            FROM expokossodo_marcas
            ORDER BY marca
        """)
        
        marcas = cursor.fetchall()
        
        return jsonify({"marcas": marcas})
        
    except Error as e:
        print(f"Error obteniendo marcas: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        cursor.close()
        connection.close()

# ===== ENDPOINTS PARA SISTEMA DE LEADS =====

@app.route('/api/leads/cliente-info', methods=['POST'])
def obtener_cliente_info():
    """Obtener SOLO información básica del cliente (RÁPIDO)"""
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
        # Buscar SOLO datos básicos del cliente (query ligera y rápida)
        cursor.execute("""
            SELECT id, nombres, correo, empresa, cargo, numero
            FROM expokossodo_registros 
            WHERE qr_code = %s
        """, (qr_code,))
        
        cliente = cursor.fetchone()
        if not cliente:
            return jsonify({"error": "Cliente no encontrado"}), 404
        
        return jsonify({"cliente": cliente})
        
    except Error as e:
        print(f"[ERROR] Error obteniendo cliente info: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/registros/actualizar-datos', methods=['PUT'])
def actualizar_datos_cliente():
    """Actualizar datos básicos del cliente (nombre, correo, empresa, cargo, teléfono)"""
    data = request.get_json()
    
    # Validación de campos requeridos
    required_fields = ['registro_id', 'qr_code', 'nombres', 'correo', 'empresa', 'cargo', 'numero']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    # Validación de formato de email
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data['correo']):
        return jsonify({"error": "Formato de correo inválido"}), 400
    
    # Validación de número de teléfono (solo números y guiones)
    telefono_pattern = r'^[\d\-\+\(\)\s]+$'
    if not re.match(telefono_pattern, data['numero']):
        return jsonify({"error": "Formato de teléfono inválido"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar que el registro existe y el QR code coincide
        cursor.execute("""
            SELECT id, qr_code 
            FROM expokossodo_registros 
            WHERE id = %s AND qr_code = %s
        """, (data['registro_id'], data['qr_code']))
        
        registro = cursor.fetchone()
        if not registro:
            return jsonify({"error": "Registro no encontrado o código QR no coincide"}), 404
        
        # Actualizar solo los campos permitidos
        cursor.execute("""
            UPDATE expokossodo_registros 
            SET nombres = %s, 
                correo = %s, 
                empresa = %s, 
                cargo = %s, 
                numero = %s
            WHERE id = %s AND qr_code = %s
        """, (
            data['nombres'].strip(),
            data['correo'].strip().lower(),
            data['empresa'].strip(),
            data['cargo'].strip(),
            data['numero'].strip(),
            data['registro_id'],
            data['qr_code']
        ))
        
        if cursor.rowcount == 0:
            return jsonify({"error": "No se pudo actualizar el registro"}), 500
        
        connection.commit()
        
        # Obtener los datos actualizados
        cursor.execute("""
            SELECT id, nombres, correo, empresa, cargo, numero
            FROM expokossodo_registros 
            WHERE id = %s
        """, (data['registro_id'],))
        
        datos_actualizados = cursor.fetchone()
        
        print(f"[OK] Datos actualizados para registro ID: {data['registro_id']}")
        
        return jsonify({
            "success": True,
            "message": "Datos actualizados correctamente",
            "datos_actualizados": datos_actualizados
        })
        
    except Error as e:
        print(f"[ERROR] Error actualizando datos del cliente: {e}")
        connection.rollback()
        return jsonify({"error": "Error del servidor al actualizar datos"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/leads/cliente-historial', methods=['POST'])
def obtener_cliente_historial():
    """Obtener SOLO el historial de consultas (puede demorar más)"""
    data = request.get_json()
    
    if not data or 'registro_id' not in data:
        return jsonify({"error": "ID de registro requerido"}), 400
    
    registro_id = data['registro_id']
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Obtener historial con resúmenes (puede ser más lento por el parsing de JSON)
        cursor.execute("""
            SELECT 
                asesor_nombre, 
                consulta, 
                fecha_consulta,
                uso_transcripcion,
                resumen
            FROM expokossodo_consultas 
            WHERE registro_id = %s
            ORDER BY fecha_consulta DESC
            LIMIT 5
        """, (registro_id,))
        
        consultas_raw = cursor.fetchall()
        
        # Procesar consultas para mostrar resúmenes cuando hay transcripción
        consultas_anteriores = []
        for consulta_raw in consultas_raw:
            consulta_final = {
                'asesor_nombre': consulta_raw['asesor_nombre'],
                'fecha_consulta': consulta_raw['fecha_consulta'],
                'consulta': consulta_raw['consulta']
            }
            
            # Si usó transcripción y hay resumen, mostrar el resumen_general
            if consulta_raw['uso_transcripcion'] == 1 and consulta_raw['resumen']:
                try:
                    import json
                    resumen_data = json.loads(consulta_raw['resumen'])
                    if 'resumen_general' in resumen_data and resumen_data['resumen_general'].strip():
                        consulta_final['consulta'] = resumen_data['resumen_general']
                        print(f"[LOG] Resumen encontrado para historial")
                except (json.JSONDecodeError, KeyError, TypeError) as e:
                    print(f"[WARN] Error parseando resumen: {e}")
            
            consultas_anteriores.append(consulta_final)
        
        return jsonify({"consultas_anteriores": consultas_anteriores})
        
    except Error as e:
        print(f"[ERROR] Error obteniendo historial: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        cursor.close()
        connection.close()

# MANTENER el endpoint original para compatibilidad
@app.route('/api/leads/cliente-por-qr', methods=['POST'])
def obtener_cliente_por_qr():
    """Obtener información del cliente por código QR para sistema de leads"""
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
        # Buscar cliente por código QR
        cursor.execute("""
            SELECT id, nombres, correo, empresa, cargo, numero
            FROM expokossodo_registros 
            WHERE qr_code = %s
        """, (qr_code,))
        
        cliente = cursor.fetchone()
        if not cliente:
            return jsonify({"error": "Cliente no encontrado"}), 404
        
        # Obtener consultas anteriores del cliente con resúmenes de transcripción
        cursor.execute("""
            SELECT 
                asesor_nombre, 
                consulta, 
                fecha_consulta,
                uso_transcripcion,
                resumen
            FROM expokossodo_consultas 
            WHERE registro_id = %s
            ORDER BY fecha_consulta DESC
            LIMIT 5
        """, (cliente['id'],))
        
        consultas_raw = cursor.fetchall()
        
        # Procesar consultas para mostrar resúmenes cuando hay transcripción
        consultas_anteriores = []
        for consulta_raw in consultas_raw:
            consulta_final = {
                'asesor_nombre': consulta_raw['asesor_nombre'],
                'fecha_consulta': consulta_raw['fecha_consulta'],
                'consulta': consulta_raw['consulta']  # Por defecto usar la consulta original
            }
            
            # Si usó transcripción y hay resumen, mostrar el resumen_general
            if consulta_raw['uso_transcripcion'] == 1 and consulta_raw['resumen']:
                try:
                    import json
                    resumen_data = json.loads(consulta_raw['resumen'])
                    if 'resumen_general' in resumen_data and resumen_data['resumen_general'].strip():
                        consulta_final['consulta'] = resumen_data['resumen_general']
                        print(f"[LOG] Mostrando resumen de transcripción para consulta ID")
                except (json.JSONDecodeError, KeyError, TypeError) as e:
                    # Si hay error parseando JSON, mantener consulta original
                    print(f"[WARN] Error parseando resumen JSON: {e}")
                    pass
            
            consultas_anteriores.append(consulta_final)
        
        return jsonify({
            "cliente": cliente,
            "consultas_anteriores": consultas_anteriores
        })
        
    except Error as e:
        print(f"Error obteniendo cliente: {e}")
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/leads/guardar-consulta', methods=['POST'])
def guardar_consulta():
    """Guardar consulta del asesor sobre el cliente"""
    data = request.get_json()
    
    required_fields = ['registro_id', 'asesor_nombre', 'consulta']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Campo requerido: {field}"}), 400
    
    if not data['consulta'].strip():
        return jsonify({"error": "La consulta no puede estar vacía"}), 400
    
    # Campo opcional para indicar si se usó transcripción
    uso_transcripcion = data.get('uso_transcripcion', False)
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar que el registro existe
        cursor.execute("""
            SELECT id, nombres FROM expokossodo_registros WHERE id = %s
        """, (data['registro_id'],))
        
        cliente = cursor.fetchone()
        if not cliente:
            return jsonify({"error": "Cliente no encontrado"}), 404
        
        # Insertar consulta
        cursor.execute("""
            INSERT INTO expokossodo_consultas 
            (registro_id, asesor_nombre, consulta, uso_transcripcion, fecha_consulta)
            VALUES (%s, %s, %s, %s, NOW())
        """, (
            data['registro_id'],
            data['asesor_nombre'],
            data['consulta'].strip(),
            uso_transcripcion
        ))
        
        # Obtener el ID de la consulta recién insertada
        consulta_id = cursor.lastrowid
        
        connection.commit()
        
        # Si se usó transcripción, enviar al servicio Railway
        if uso_transcripcion:
            # Construir URL del callback dentro del contexto de request
            callback_url = f"{request.url_root}api/transcripcion/callback"
            
            # Llamada asíncrona al servicio de transcripción
            threading.Thread(
                target=enviar_a_transcripcion,
                args=(consulta_id, data['consulta'].strip(), callback_url),
                daemon=True
            ).start()
            print(f"[LOG] Consulta ID {consulta_id} enviada al servicio de transcripción")
        
        return jsonify({
            "message": "Consulta guardada exitosamente",
            "cliente": cliente['nombres'],
            "asesor": data['asesor_nombre'],
            "transcripcion_programada": uso_transcripcion
        })
        
    except Error as e:
        print(f"Error guardando consulta: {e}")
        connection.rollback()
        return jsonify({"error": "Error del servidor"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/transcripcion/callback', methods=['POST'])
def recibir_resultado_transcripcion():
    """Recibir el resultado procesado desde el servicio de transcripción Railway"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No se recibieron datos"}), 400
    
    consulta_id = data.get('consulta_id')
    resumen = data.get('resumen')
    
    if not consulta_id:
        return jsonify({"error": "consulta_id es requerido"}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor()
    
    try:
        # Actualizar la consulta con el resumen generado
        cursor.execute("""
            UPDATE expokossodo_consultas 
            SET resumen = %s
            WHERE id = %s
        """, (json.dumps(resumen) if resumen else None, consulta_id))
        
        affected_rows = cursor.rowcount
        connection.commit()
        
        if affected_rows > 0:
            print(f"[OK] Resumen actualizado para consulta {consulta_id}")
            return jsonify({
                "success": True,
                "message": f"Resumen actualizado para consulta {consulta_id}"
            })
        else:
            print(f"[WARN] No se encontró la consulta {consulta_id}")
            return jsonify({
                "success": False,
                "message": f"No se encontró la consulta {consulta_id}"
            }), 404
            
    except Error as e:
        print(f"[ERROR] Error actualizando resumen: {e}")
        connection.rollback()
        return jsonify({"error": "Error actualizando resumen"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/leads/asesores', methods=['GET'])
def obtener_asesores():
    """Obtener lista de asesores disponibles"""
    print("📋 Endpoint /api/leads/asesores solicitado")
    
    asesores = [
        "Abigail Alvarez del Villar",
        "Alexandra Ccota Chacon",
        "Angela Gómez Sánchez",
        "Azucena Chuquilin",
        "Carlos Granda",
        "Cinthya Zapata Ruiz",
        "Daniel Torres",
        "Denisse Duche",
        "Diana Esteban Ladera",
        "Eder Vilchez",
        "Ernesto Rodriguez",
        "Fernando Pacheco",
        "Giovanna Ramirez",
        "Hugo Guzman",
        "Ines Cosinga Enriquez",
        "Jackeline Rojas",
        "Javier Santa Cruz",
        "Jessica Soto Alarcón",
        "Jimmy Bueno",
        "Jonathan Lopez",
        "Lidia Cachay",
        "Lucy Elvira Torres Jiménez",
        "Manuel Mosqueira",
        "Milagros Pasaro",
        "Mizael Despacho",
        "Silvia Porras Quintanilla",
        "Tania Hernandez",
        "Vanessa Hoffman",
        "Ximena Rojas"
    ]
    
    print(f"📋 Devolviendo {len(asesores)} asesores")
    return jsonify({"asesores": asesores})

# --- ENDPOINTS DE MONITOREO DE TRANSCRIPCIÓN ---

@app.route('/api/transcripcion/stats', methods=['GET'])
def transcripcion_stats_endpoint():
    """Estadísticas del sistema de transcripción en Railway"""
    try:
        # Solicitar estadísticas al servicio Railway
        response = requests.get(f"{TRANSCRIPCION_API_URL}/stats", timeout=5)
        if response.status_code == 200:
            stats = response.json()
            stats['sistema_disponible'] = TRANSCRIPCION_DISPONIBLE
            stats['servicio_url'] = TRANSCRIPCION_API_URL
            return jsonify(stats)
        else:
            return jsonify({
                'sistema_disponible': TRANSCRIPCION_DISPONIBLE,
                'servicio_url': TRANSCRIPCION_API_URL,
                'error': 'No se pudieron obtener estadísticas del servicio'
            })
    except Exception as e:
        return jsonify({
            'sistema_disponible': False,
            'servicio_url': TRANSCRIPCION_API_URL,
            'error': str(e)
        })

@app.route('/api/transcripcion/health', methods=['GET'])
def transcripcion_health():
    """Estado de salud del sistema de transcripción en Railway"""
    try:
        # Verificar salud del servicio Railway
        response = requests.get(f"{TRANSCRIPCION_API_URL}/health", timeout=5)
        status = {
            'sistema_disponible': response.status_code == 200,
            'servicio_url': TRANSCRIPCION_API_URL,
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
            'status_code': response.status_code
        }
        return jsonify(status)
    except Exception as e:
        return jsonify({
            'sistema_disponible': False,
            'servicio_url': TRANSCRIPCION_API_URL,
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
            'error': str(e)
        })

@app.route('/api/transcripcion/procesar-pendientes', methods=['POST'])
def procesar_transcripciones_pendientes():
    """Procesar todas las consultas pendientes de transcripción enviándolas a Railway"""
    if not TRANSCRIPCION_DISPONIBLE:
        return jsonify({"error": "Servicio de transcripción no disponible"}), 503
    
    try:
        # Buscar consultas con uso_transcripcion=1 pero sin resumen
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, consulta 
            FROM expokossodo_consultas 
            WHERE uso_transcripcion = 1 AND (resumen IS NULL OR resumen = '')
        """)
        
        consultas_pendientes = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Construir URL del callback dentro del contexto de request
        callback_url = f"{request.url_root}api/transcripcion/callback"
        
        # Enviar todas al servicio Railway
        enviadas = 0
        errores = 0
        for consulta in consultas_pendientes:
            try:
                # Enviar cada consulta al servicio de transcripción
                threading.Thread(
                    target=enviar_a_transcripcion,
                    args=(consulta['id'], consulta['consulta'], callback_url),
                    daemon=True
                ).start()
                enviadas += 1
                # Pequeña pausa para no saturar
                time.sleep(0.5)
            except Exception as e:
                print(f"Error enviando consulta {consulta['id']} a transcripción: {e}")
                errores += 1
        
        return jsonify({
            "message": f"Se enviaron {enviadas} consultas al servicio de transcripción",
            "consultas_encontradas": len(consultas_pendientes),
            "consultas_enviadas": enviadas,
            "errores": errores,
            "servicio_url": TRANSCRIPCION_API_URL
        })
        
    except Exception as e:
        print(f"Error procesando consultas pendientes: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500


if __name__ == '__main__':
    print("[INIT] Iniciando ExpoKossodo Backend...")
    print(f"[CONFIG] Modo: {'Producción' if os.getenv('FLASK_ENV') == 'production' else 'Desarrollo'}")
    print(f"[CONFIG] Pool de conexiones: {'Activado' if connection_pool else 'Desactivado'}")
    
    # Inicializar base de datos
    if init_database():
        print("[OK] Base de datos inicializada correctamente")
    else:
        print("[WARN] Error inicializando base de datos")
        print("[INFO] El servidor iniciará de todos modos. Algunos endpoints pueden no funcionar.")
        print("[INFO] Para desarrollo local, considera usar una base de datos MySQL local.")
        
        # No salir, permitir que el servidor inicie sin DB
        # Esto permite probar otros aspectos del backend
    
    # Configuración del servidor
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"[SERVER] Servidor corriendo en http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 