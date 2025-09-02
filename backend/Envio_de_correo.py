#!/usr/bin/env python3
"""
Script para enviar correo de términos y condiciones con código QR
Destinatario de prueba: gfxjef@gmail.com
"""

import os
import sys
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime
import mysql.connector
from dotenv import load_dotenv
import qrcode
from PIL import Image
import io
import re
import unicodedata

# Cargar variables de entorno
load_dotenv()

# ===== CONFIGURACIÓN DE BASE DE DATOS =====
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'kossodo_industrial'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': int(os.getenv('DB_PORT', 3306))
}

# ===== CONFIGURACIÓN DE EMAIL =====
smtp_server = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
smtp_port = int(os.getenv('EMAIL_PORT', 587))
email_user = os.getenv('EMAIL_USER')
email_password = os.getenv('EMAIL_PASSWORD')

# Configuración de envío
MODO_MASIVO = True  # True para envío masivo, False para solo gfxjef@gmail.com
CORREO_PRUEBA = "gfxjef@gmail.com"

# ===== FUNCIONES DE GENERACIÓN QR =====
def generar_texto_qr(nombres, numero, cargo, empresa):
    """
    Generar texto QR con formato simplificado
    """
    try:
        # Función para limpiar y obtener solo caracteres alfanuméricos
        def limpiar_texto(texto):
            if not texto:
                return ""
            # Normalizar para remover acentos
            texto = unicodedata.normalize('NFKD', str(texto))
            texto = ''.join([c for c in texto if not unicodedata.combining(c)])
            # Mantener solo letras y números
            texto = re.sub(r'[^a-zA-Z0-9]', '', texto)
            return texto.lower()
        
        # Limpiar y procesar cada campo
        nombres_limpio = limpiar_texto(nombres)[:3] if nombres else "xxx"
        numero_limpio = re.sub(r'[^0-9]', '', str(numero)) if numero else "000"
        cargo_limpio = limpiar_texto(cargo)[:3] if cargo else "xxx"
        empresa_limpio = limpiar_texto(empresa)[:3] if empresa else "xxx"
        
        # Generar timestamp
        timestamp = str(int(time.time()))
        
        # Combinar todo sin espacios ni caracteres especiales
        qr_text = f"{nombres_limpio}{numero_limpio}{cargo_limpio}{empresa_limpio}{timestamp}"
        
        print(f"[QR] Texto generado: {qr_text}")
        return qr_text
        
    except Exception as e:
        print(f"Error generando texto QR: {e}")
        return None

def generar_imagen_qr(qr_text):
    """
    Generar imagen QR a partir del texto
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
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        print(f"[QR] Imagen generada exitosamente ({len(img_byte_arr)} bytes)")
        return img_byte_arr
        
    except Exception as e:
        print(f"Error generando imagen QR: {e}")
        return None

# ===== FUNCIÓN PARA OBTENER TODOS LOS REGISTRADOS =====
def obtener_todos_registrados():
    """
    Obtener todos los usuarios registrados para envío masivo
    """
    connection = None
    try:
        print(f"\n[BD] Conectando a la base de datos para obtener todos los registrados...")
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        # Obtener todos los usuarios con correos válidos
        cursor.execute("""
            SELECT id, nombres, correo, empresa, cargo, numero, qr_code
            FROM expokossodo_registros
            WHERE correo IS NOT NULL 
            AND correo != ''
            AND correo LIKE '%@%'
            ORDER BY id ASC
        """)
        
        usuarios = cursor.fetchall()
        print(f"[BD] {len(usuarios)} usuarios encontrados en la base de datos")
        
        # Verificar y generar QR faltantes
        usuarios_actualizados = []
        for usuario in usuarios:
            if not usuario['qr_code']:
                print(f"[QR] Generando QR para {usuario['nombres']} ({usuario['correo']})")
                qr_text = generar_texto_qr(
                    usuario['nombres'],
                    usuario['numero'],
                    usuario['cargo'],
                    usuario['empresa']
                )
                
                if qr_text:
                    # Actualizar en BD
                    cursor.execute("""
                        UPDATE expokossodo_registros
                        SET qr_code = %s
                        WHERE id = %s
                    """, (qr_text, usuario['id']))
                    usuario['qr_code'] = qr_text
                    print(f"[BD] QR actualizado para {usuario['nombres']}")
            
            usuarios_actualizados.append(usuario)
        
        connection.commit()
        cursor.close()
        
        print(f"[BD] Preparados {len(usuarios_actualizados)} usuarios para envío")
        return usuarios_actualizados
        
    except Exception as e:
        print(f"[ERROR] Error obteniendo usuarios: {e}")
        return []
    finally:
        if connection and connection.is_connected():
            connection.close()
            print("[BD] Conexión cerrada")

# ===== FUNCIÓN PARA OBTENER DATOS DE UN USUARIO =====
def obtener_datos_usuario():
    """
    Obtener datos del usuario de prueba desde la base de datos
    """
    connection = None
    try:
        print(f"\n[BD] Conectando a la base de datos...")
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        # Buscar usuario por correo
        print(f"[BD] Buscando usuario: {CORREO_PRUEBA}")
        cursor.execute("""
            SELECT id, nombres, correo, empresa, cargo, numero, qr_code
            FROM expokossodo_registros
            WHERE correo = %s
            LIMIT 1
        """, (CORREO_PRUEBA,))
        
        usuario = cursor.fetchone()
        
        if not usuario:
            print(f"[ERROR] Usuario {CORREO_PRUEBA} no encontrado en la base de datos")
            print("[INFO] Creando datos de prueba...")
            
            # Datos de prueba si no existe
            usuario = {
                'id': 0,
                'nombres': 'Jefferson Farfán',
                'correo': CORREO_PRUEBA,
                'empresa': 'Consultoria',
                'cargo': 'Jefferson',
                'numero': '17522111193',
                'qr_code': None
            }
        
        print(f"[BD] Usuario encontrado: {usuario['nombres']}")
        
        # Si no tiene QR, generar uno
        if not usuario['qr_code']:
            print("[QR] Usuario no tiene QR, generando uno nuevo...")
            qr_text = generar_texto_qr(
                usuario['nombres'],
                usuario['numero'],
                usuario['cargo'],
                usuario['empresa']
            )
            
            if qr_text and usuario['id'] > 0:
                # Actualizar en BD si es un usuario real
                cursor.execute("""
                    UPDATE expokossodo_registros
                    SET qr_code = %s
                    WHERE id = %s
                """, (qr_text, usuario['id']))
                connection.commit()
                print(f"[BD] QR actualizado en base de datos")
            
            usuario['qr_code'] = qr_text
        
        print(f"[BD] QR Code: {usuario['qr_code']}")
        
        cursor.close()
        return usuario
        
    except Exception as e:
        print(f"[ERROR] Error obteniendo datos del usuario: {e}")
        # Retornar datos de prueba en caso de error
        return {
            'nombres': 'Jefferson Farfán',
            'correo': CORREO_PRUEBA,
            'empresa': 'Consultoria',
            'cargo': 'Jefferson',
            'numero': '17522111193',
            'qr_code': 'jef17522111193jefcon' + str(int(time.time()))
        }
    finally:
        if connection and connection.is_connected():
            connection.close()
            print("[BD] Conexión cerrada")

# ===== FUNCIÓN PARA GENERAR HTML DEL CORREO =====
def generar_html_correo(usuario_datos):
    """
    Generar el HTML del correo con la estructura solicitada
    """
    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Términos y Condiciones - ExpoKossodo 2025</title>
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
                        
                        <!-- 1. HEADER con Logo -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #01295c 0%, #1d2236 100%); padding: 40px 30px; text-align: center;">
                                <!-- Logo -->
                                <img src="https://www.kossomet.com/AppUp/default/Expokossodo_logo_blanco_trans.png" alt="ExpoKossodo 2025" style="width: 200px; height: auto; margin-bottom: 20px;">
                                
                                <!-- Title -->
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white; margin-bottom: 8px;">
                                    Términos y Condiciones
                                </h1>
                                <p style="margin: 0; font-size: 16px; color: rgba(255, 255, 255, 0.9); font-weight: 400;">
                                    ExpoKossodo 2025
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                
                                <!-- Saludo -->
                                <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1f2937;">
                                    Hola {usuario_datos['nombres']},
                                </h2>
                                <p style="margin: 0 0 30px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                                    Te enviamos tu código QR de ingreso junto con los términos y condiciones del evento.
                                </p>
                                
                                <!-- TÉRMINOS Y CONDICIONES -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                    <tr>
                                        <td style="background: #f8fafc; padding: 25px; border-radius: 12px; border-left: 4px solid #6cb79a;">
                                            <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1f2937; text-transform: uppercase;">
                                                TÉRMINOS Y CONDICIONES
                                            </h3>
                                            <h4 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #374151; text-transform: uppercase;">
                                                LO ESENCIAL PARA TU ASISTENCIA
                                            </h4>
                                            <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                                Para asegurar tu participación efectiva en EXPOKOSSODO 2025, te compartimos algunas pautas clave que te ayudarán a disfrutar de la mejor experiencia:
                                            </p>
                                            <div style="margin-bottom: 15px; padding-left: 20px;">
                                                <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">
                                                    <strong>Inscripción gratuita:</strong> El registro se confirmará por orden de llegada, hasta completar el aforo disponible.
                                                </p>
                                                <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">
                                                    <strong>Comportamiento profesional:</strong> Se solicita mantener una actitud respetuosa y cordial durante toda la jornada.
                                                </p>
                                                <p style="margin: 0; font-size: 14px; color: #374151;">
                                                    <strong>Puntualidad:</strong> Se otorgará una tolerancia máxima de 10 minutos. Pasado este tiempo, no podremos garantizar tu acceso a la charla o taller.
                                                </p>
                                            </div>
                                            
                                            <!-- Botón debajo de términos y condiciones -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                                <tr>
                                                    <td align="center">
                                                        <a href="https://docs.google.com/document/d/1wjSWCqrPqZ3aRM6qL_zCyjSG6Q2QqTwBA8jP5GD1uuY/edit?usp=sharing" style="display: inline-block; background: linear-gradient(135deg, #6cb79a 0%, #5ca085 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 6px rgba(108, 183, 154, 0.25);">
                                                            📄 Ver Términos Completos
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- TODO LO QUE NECESITAS SABER -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                    <tr>
                                        <td style="background: #f8fafc; padding: 25px; border-radius: 12px; border-left: 4px solid #6cb79a;">
                                            <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1f2937; text-transform: uppercase;">
                                                TODO LO QUE NECESITAS SABER
                                            </h3>
                                            <h4 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #374151; text-transform: uppercase;">
                                                Para disfrutar al máximo tu experiencia
                                            </h4>
                                            <div style="margin-bottom: 15px; padding-left: 20px;">
                                                <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">
                                                    <strong>Apertura de puertas:</strong> 1:30 PM
                                                </p>
                                                <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">
                                                    <strong>Inscripción previa obligatoria:</strong> Solo quienes se registren con anticipación podrán participar en charlas y talleres.
                                                </p>
                                                <p style="margin: 0; font-size: 14px; color: #374151;">
                                                    <strong>Estacionamiento:</strong> No habrá disponibilidad de estacionamiento en el establecimiento.
                                                </p>
                                            </div>
                                            
                                            <!-- Botón con imagen -->
                                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                                <tr>
                                                    <td align="center">
                                                        <a href="https://maps.app.goo.gl/qvZJPJXt2PBp7QJa8" style="display: inline-block; text-decoration: none;">
                                                            <img src="https://www.kossomet.com/AppUp/default/adondeir.png" alt="¿A dónde ir?" style="width: 100%; max-width: 500px; height: auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- 5. INFORMACIÓN DEL QR Y SU USO -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                    <tr>
                                        <td style="background: white; padding: 25px; border-radius: 16px; border: 2px solid #6cb79a; box-shadow: 0 4px 6px rgba(108, 183, 154, 0.1);">
                                            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                                                <div style="width: 40px; height: 40px; background: #6cb79a; border-radius: 50%; display: inline-block; text-align: center; line-height: 40px; margin-right: 15px;">
                                                    <span style="font-size: 20px;">🎫</span>
                                                </div>
                                                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; display: inline-block;">
                                                    Tu Código QR Personal
                                                </h3>
                                            </div>
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                                        ✅ Hemos adjuntado tu <strong>código QR único</strong> a este email
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                                        📱 <strong>Guárdalo en tu teléfono</strong> - lo necesitarás para ingresar al evento
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                                        🚪 Presenta el QR en recepción para registrar tu asistencia
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                                        🏷️ <strong>Al ingresar al evento se te brindará un fotocheck con tu QR impreso</strong>, que debe mantenerse visible en todo momento ya que es parte esencial del recorrido completo en el evento
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                                        📍 Úsalo también para ingresar a cada charla o taller
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #374151;">
                                                        ⚠️ <strong>¡No lo compartas!</strong> Es único e intransferible
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Mensaje final -->
                                <p style="margin: 0; font-size: 16px; color: #6b7280; text-align: center; line-height: 1.6;">
                                    ¡Te esperamos en <strong style="color: #6cb79a;">ExpoKossodo 2025</strong>!<br>
                                    El evento más importante del año en sostenibilidad industrial.
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
                                    <a href="mailto:jcamacho@kossodo.com" style="color: #6cb79a; text-decoration: none; font-weight: 600;">
                                        jcamacho@kossodo.com
                                    </a>
                                </p>
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #9ca3af;">
                                    © 2025 Grupo Kossodo. Todos los derechos reservados.
                                </p>
                                <p style="margin: 0; font-size: 10px; color: #9ca3af;">
                                    Este es un correo automático, por favor no responder.
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
    
    return html_body

# ===== FUNCIÓN PARA ENVIAR CORREO =====
def enviar_correo_terminos(usuario_datos):
    """
    Enviar correo con términos y condiciones y QR adjunto
    """
    try:
        print("\n[EMAIL] Preparando envío de correo...")
        
        # Validar configuración
        if not email_user or not email_password:
            print("[ERROR] Credenciales de email no configuradas en .env")
            return False
        
        # Crear mensaje
        msg = MIMEMultipart('related')
        msg['From'] = f"Kossodo <{email_user}>"
        msg['To'] = usuario_datos['correo']
        msg['Subject'] = "A un día de ExpoKossodo 2025"
        
        # Generar HTML
        html_body = generar_html_correo(usuario_datos)
        msg.attach(MIMEText(html_body, 'html'))
        
        # Adjuntar código QR
        if usuario_datos['qr_code']:
            print(f"[QR] Generando imagen QR para adjuntar...")
            qr_image_bytes = generar_imagen_qr(usuario_datos['qr_code'])
            
            if qr_image_bytes:
                qr_attachment = MIMEImage(qr_image_bytes)
                qr_attachment.add_header(
                    'Content-Disposition',
                    f'attachment; filename="QR_ExpoKossodo_{usuario_datos["nombres"].replace(" ", "_")}.png"'
                )
                qr_attachment.add_header('Content-ID', '<qr_code>')
                msg.attach(qr_attachment)
                print("[OK] Código QR adjuntado exitosamente")
            else:
                print("[WARN] No se pudo generar la imagen QR")
        
        # Enviar correo
        print(f"[EMAIL] Conectando a {smtp_server}:{smtp_port}...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        
        print(f"[EMAIL] Autenticando con usuario: {email_user}")
        server.login(email_user, email_password)
        
        print(f"[EMAIL] Enviando correo a: {usuario_datos['correo']}")
        server.send_message(msg)
        server.quit()
        
        print(f"[OK] Correo enviado exitosamente a {usuario_datos['correo']}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error enviando correo: {e}")
        return False

# ===== FUNCIÓN DE ENVÍO MASIVO =====
def enviar_correos_masivos():
    """
    Enviar correos masivos con intervalos y batching
    """
    import time
    from datetime import datetime
    
    print("=" * 60)
    print("ENVÍO MASIVO DE CORREOS - TÉRMINOS Y CONDICIONES")
    print("ExpoKossodo 2025")
    print("=" * 60)
    
    # Crear archivo de log
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = f"envios_masivos_{timestamp}.log"
    
    def log_mensaje(mensaje):
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {mensaje}\n")
        print(mensaje)
    
    try:
        # 1. Obtener todos los usuarios
        log_mensaje("\n[1/3] Obteniendo lista completa de usuarios...")
        usuarios = obtener_todos_registrados()
        
        if not usuarios:
            log_mensaje("[ERROR] No se pudieron obtener usuarios de la base de datos")
            return False
        
        total_usuarios = len(usuarios)
        log_mensaje(f"[OK] {total_usuarios} usuarios preparados para envío")
        
        # 2. Configurar envío
        log_mensaje(f"\n[2/3] Configurando envío masivo...")
        log_mensaje(f"Intervalo entre correos: 1 segundo")
        log_mensaje(f"Batching: Pausa de 30 segundos cada 100 correos")
        log_mensaje(f"Tiempo estimado: ~{int(total_usuarios * 1.2 / 60)} minutos")
        
        # 3. Envío masivo
        log_mensaje(f"\n[3/3] Iniciando envío masivo...")
        log_mensaje("=" * 60)
        
        enviados_exitosos = 0
        enviados_fallidos = 0
        inicio_tiempo = time.time()
        
        for i, usuario in enumerate(usuarios, 1):
            try:
                # Verificar datos mínimos
                if not usuario['correo'] or not usuario['nombres']:
                    log_mensaje(f"[SKIP] {i}/{total_usuarios} - Datos incompletos: {usuario.get('nombres', 'Sin nombre')}")
                    enviados_fallidos += 1
                    continue
                
                if not usuario['qr_code']:
                    log_mensaje(f"[SKIP] {i}/{total_usuarios} - Sin QR: {usuario['nombres']} ({usuario['correo']})")
                    enviados_fallidos += 1
                    continue
                
                # Enviar correo
                log_mensaje(f"[SENDING] {i}/{total_usuarios} - {usuario['nombres']} ({usuario['correo']})")
                
                resultado = enviar_correo_terminos(usuario)
                
                if resultado:
                    enviados_exitosos += 1
                    log_mensaje(f"[SUCCESS] ✓ Correo enviado exitosamente")
                else:
                    enviados_fallidos += 1
                    log_mensaje(f"[ERROR] ✗ Falló el envío")
                
                # Batching: Pausa cada 100 correos
                if i % 100 == 0 and i < total_usuarios:
                    log_mensaje(f"\n[BATCH] Pausa de 30 segundos después de {i} correos...")
                    time.sleep(30)
                    log_mensaje(f"[BATCH] Reanudando envíos...\n")
                
                # Pausa entre correos (1 segundo)
                if i < total_usuarios:  # No pausar después del último
                    time.sleep(1)
                
            except Exception as e:
                enviados_fallidos += 1
                log_mensaje(f"[ERROR] {i}/{total_usuarios} - Error con {usuario.get('nombres', 'Usuario')}: {str(e)}")
                time.sleep(1)  # Pausa incluso en error
        
        # Resumen final
        tiempo_total = time.time() - inicio_tiempo
        log_mensaje("\n" + "=" * 60)
        log_mensaje("[RESUMEN FINAL]")
        log_mensaje(f"Total usuarios procesados: {total_usuarios}")
        log_mensaje(f"Correos enviados exitosamente: {enviados_exitosos}")
        log_mensaje(f"Correos fallidos: {enviados_fallidos}")
        log_mensaje(f"Tasa de éxito: {(enviados_exitosos/total_usuarios*100):.1f}%")
        log_mensaje(f"Tiempo total: {int(tiempo_total//60)}m {int(tiempo_total%60)}s")
        log_mensaje(f"Log guardado en: {log_file}")
        log_mensaje("=" * 60)
        
        return enviados_exitosos > 0
        
    except Exception as e:
        log_mensaje(f"\n[ERROR CRÍTICO] Error en envío masivo: {e}")
        import traceback
        traceback.print_exc()
        return False

# ===== FUNCIÓN PRINCIPAL =====
def main():
    """
    Función principal que ejecuta todo el proceso
    """
    if MODO_MASIVO:
        return enviar_correos_masivos()
    else:
        # Modo individual (original)
        print("=" * 60)
        print("ENVÍO DE CORREO - TÉRMINOS Y CONDICIONES")
        print("ExpoKossodo 2025")
        print("=" * 60)
        
        try:
            # 1. Obtener datos del usuario
            print("\n[1/3] Obteniendo datos del usuario...")
            usuario = obtener_datos_usuario()
            
            if not usuario:
                print("[ERROR] No se pudieron obtener los datos del usuario")
                return False
            
            print(f"[OK] Datos obtenidos para: {usuario['nombres']}")
            
            # 2. Verificar que tiene QR
            print("\n[2/3] Verificando código QR...")
            if not usuario['qr_code']:
                print("[ERROR] No se pudo generar código QR")
                return False
            
            print(f"[OK] QR Code: {usuario['qr_code']}")
            
            # 3. Enviar correo
            print("\n[3/3] Enviando correo...")
            resultado = enviar_correo_terminos(usuario)
            
            if resultado:
                print("\n" + "=" * 60)
                print("[SUCCESS] PROCESO COMPLETADO EXITOSAMENTE")
                print(f"Correo enviado a: {usuario['correo']}")
                print(f"Asunto: A un día de ExpoKossodo 2025")
                print(f"Remitente: Kossodo")
                print(f"QR adjunto: {usuario['qr_code']}")
                print("=" * 60)
            else:
                print("\n[ERROR] El proceso no se completó correctamente")
                
            return resultado
            
        except Exception as e:
            print(f"\n[ERROR CRÍTICO] Error en el proceso principal: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    # Ejecutar el proceso
    success = main()
    
    # Salir con código apropiado
    sys.exit(0 if success else 1)