from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def get_db_connection():
    """Crear conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

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
        
        connection.commit()
        print("✅ Tablas creadas exitosamente")
        
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
        horarios = ['09:00-10:00', '10:30-11:30', '12:00-13:00', '14:00-15:00', '15:30-16:30']
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

def send_confirmation_email(user_data, selected_events):
    """Enviar email de confirmación"""
    try:
        smtp_server = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('EMAIL_PORT', 587))
        email_user = os.getenv('EMAIL_USER')
        email_password = os.getenv('EMAIL_PASSWORD')
        
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = user_data['correo']
        msg['Subject'] = "Confirmación de Registro - ExpoKossodo 2024"
        
        # Crear contenido del email
        eventos_html = ""
        for evento in selected_events:
            eventos_html += f"""
            <div style="margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
                <strong>📅 {evento['fecha']}</strong> - <strong>🕐 {evento['hora']}</strong><br>
                <strong>🏛️ Sala:</strong> {evento['sala']}<br>
                <strong>🎤 Charla:</strong> {evento['titulo_charla']}<br>
                <strong>👨‍💼 Expositor:</strong> {evento['expositor']} ({evento['pais']})
            </div>
            """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
                <h1>🎉 ¡Registro Confirmado!</h1>
                <h2>ExpoKossodo 2024</h2>
            </div>
            
            <div style="padding: 20px;">
                <h3>Hola {user_data['nombres']},</h3>
                <p>Tu registro ha sido confirmado exitosamente. A continuación los detalles:</p>
                
                <div style="background-color: #E5E7EB; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>📋 Datos del Participante:</h4>
                    <p><strong>Nombre:</strong> {user_data['nombres']}</p>
                    <p><strong>Email:</strong> {user_data['correo']}</p>
                    <p><strong>Empresa:</strong> {user_data['empresa']}</p>
                    <p><strong>Cargo:</strong> {user_data['cargo']}</p>
                    <p><strong>Teléfono:</strong> {user_data['numero']}</p>
                </div>
                
                <h4>📅 Eventos Seleccionados:</h4>
                {eventos_html}
                
                <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>📍 Información Importante:</h4>
                    <p>• <strong>Fechas:</strong> 22, 23, 24 y 25 de Julio 2024</p>
                    <p>• <strong>Ubicación:</strong> [Agregar ubicación del evento]</p>
                    <p>• <strong>Llegada:</strong> Te recomendamos llegar 15 minutos antes</p>
                </div>
                
                <p>¡Esperamos verte pronto en ExpoKossodo 2024!</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #6B7280;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
                    <p><strong>Equipo ExpoKossodo</strong></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
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
    """Obtener todos los eventos organizados por fecha"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT * FROM expokossodo_eventos 
            ORDER BY fecha, hora, sala
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
                'slots_disponibles': evento['slots_disponibles'],
                'slots_ocupados': evento['slots_ocupados'],
                'disponible': evento['slots_ocupados'] < evento['slots_disponibles']
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
        
        placeholders = ','.join(['%s'] * len(evento_ids))
        cursor.execute(f"""
            SELECT id, titulo_charla, slots_disponibles, slots_ocupados, hora
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
        
        # Verificar horarios únicos (no más de un evento por hora)
        horarios = [evento['hora'] for evento in eventos]
        if len(horarios) != len(set(horarios)):
            return jsonify({
                "error": "No puede seleccionar múltiples eventos en el mismo horario"
            }), 400
        
        # Insertar registro
        cursor.execute("""
            INSERT INTO expokossodo_registros 
            (nombres, correo, empresa, cargo, numero, expectativas, eventos_seleccionados)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data['nombres'],
            data['correo'],
            data['empresa'],
            data['cargo'],
            data['numero'],
            data.get('expectativas', ''),
            json.dumps(evento_ids)
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
        
        # Enviar email de confirmación
        email_sent = send_confirmation_email(data, eventos_completos)
        
        return jsonify({
            "message": "Registro creado exitosamente",
            "registro_id": registro_id,
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
                created_at
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
        
        # Actualizar evento
        update_query = """
            UPDATE expokossodo_eventos 
            SET titulo_charla = %s, expositor = %s, pais = %s, 
                descripcion = %s, imagen_url = %s
            WHERE id = %s
        """
        
        cursor.execute(update_query, (
            data['titulo_charla'],
            data['expositor'],
            data['pais'],
            data.get('descripcion', ''),
            data.get('imagen_url', None),
            evento_id
        ))
        
        connection.commit()
        
        # Log del cambio
        print(f"✅ Evento {evento_id} actualizado por admin: {data['titulo_charla']}")
        
        return jsonify({'message': 'Evento actualizado exitosamente'})
        
    except Error as e:
        print(f"Error actualizando evento {evento_id}: {e}")
        connection.rollback()
        return jsonify({'error': 'Error actualizando evento'}), 500
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
                created_at
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