#!/usr/bin/env python3
"""
Backend simplificado para testing del sistema de registro
Sin emojis, solo con funcionalidad básica de registro
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import json
import time

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)

# CORS simplificado
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Configuración de BD
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def get_db_connection():
    """Obtener conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"[ERROR] Error conectando a BD: {e}")
        return None

def obtener_eventos_usuario(registro_id, cursor):
    """Obtiene los eventos actuales de un usuario registrado"""
    cursor.execute("""
        SELECT e.id, e.fecha, e.hora, e.titulo_charla, e.sala
        FROM expokossodo_eventos e
        INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
        WHERE re.registro_id = %s
        ORDER BY e.fecha, e.hora
    """, (registro_id,))
    
    return cursor.fetchall()

def validar_conflictos_horario(eventos_inscritos, eventos_nuevos, cursor):
    """Valida conflictos de horario entre eventos existentes y nuevos"""
    # Crear mapa de horarios ocupados
    horarios_ocupados = {}
    for evento in eventos_inscritos:
        evento_id, fecha, hora = evento['id'], evento['fecha'], evento['hora']
        fecha_str = fecha.strftime('%Y-%m-%d')
        if fecha_str not in horarios_ocupados:
            horarios_ocupados[fecha_str] = set()
        horarios_ocupados[fecha_str].add(hora)
    
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
            
            fecha_str = fecha.strftime('%Y-%m-%d')
            
            # Verificar conflicto de horario
            if (fecha_str in horarios_ocupados and 
                hora in horarios_ocupados[fecha_str]):
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo': titulo,
                    'fecha': fecha_str,
                    'hora': str(hora),
                    'sala': sala,
                    'motivo': 'conflicto_horario'
                })
            # Verificar capacidad
            elif slots_ocupados >= slots_disponibles:
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo': titulo,
                    'fecha': fecha_str,
                    'hora': str(hora),
                    'sala': sala,
                    'motivo': 'evento_lleno'
                })
            else:
                eventos_validos.append(evento_id)
    
    return eventos_validos, eventos_conflictivos

@app.route('/api/eventos', methods=['GET'])
def get_eventos():
    """Endpoint básico para obtener eventos"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT id, fecha, hora, sala, titulo_charla, expositor, 
                   slots_disponibles, slots_ocupados, disponible
            FROM expokossodo_eventos
            WHERE disponible = 1
            ORDER BY fecha, hora, sala
        """)
        
        eventos = cursor.fetchall()
        
        # Organizar por fecha
        eventos_por_fecha = {}
        for evento in eventos:
            fecha_str = evento['fecha'].strftime('%Y-%m-%d')
            if fecha_str not in eventos_por_fecha:
                eventos_por_fecha[fecha_str] = []
            eventos_por_fecha[fecha_str].append(evento)
        
        return jsonify(eventos_por_fecha)
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/registro', methods=['POST'])
def crear_registro():
    """Endpoint principal de registro con nueva lógica"""
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
        eventos_nuevos = data['eventos_seleccionados']
        if not eventos_nuevos:
            return jsonify({"error": "Debe seleccionar al menos un evento"}), 400
        
        # PASO 1: Verificar si el usuario ya está registrado
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
            eventos_inscritos = obtener_eventos_usuario(registro_id, cursor)
        else:
            # Usuario nuevo - flujo de creación
            eventos_actuales = []
            eventos_inscritos = []
        
        # PASO 2: Validar conflictos de horario y capacidad
        eventos_validos, eventos_conflictivos = validar_conflictos_horario(
            eventos_inscritos, eventos_nuevos, cursor
        )
        
        # PASO 3: Verificar que los eventos nuevos existen
        if eventos_nuevos:
            placeholders = ','.join(['%s'] * len(eventos_nuevos))
            cursor.execute(f"""
                SELECT id FROM expokossodo_eventos 
                WHERE id IN ({placeholders})
            """, eventos_nuevos)
            eventos_existentes = [row['id'] for row in cursor.fetchall()]
            
            eventos_no_existentes = [eid for eid in eventos_nuevos if eid not in eventos_existentes]
            if eventos_no_existentes:
                return jsonify({
                    "error": f"Los siguientes eventos no existen: {eventos_no_existentes}"
                }), 400
        
        # PASO 4: Verificar si hay eventos válidos para procesar
        if not eventos_validos:
            response_data = {
                "success": False,
                "message": "No se pudo agregar ninguna charla debido a conflictos de horario o eventos llenos.",
                "eventos_omitidos": eventos_conflictivos,
                "eventos_agregados": [],
                "modo": "sin_cambios"
            }
            return jsonify(response_data), 400
        
        # PASO 5: Actualización transaccional de la base de datos
        try:
            eventos_finales = list(set(eventos_actuales + eventos_validos))
            
            if modo_actualizacion:
                # Actualizar registro existente
                cursor.execute("""
                    UPDATE expokossodo_registros 
                    SET eventos_seleccionados = %s
                    WHERE id = %s
                """, (json.dumps(eventos_finales), registro_id))
            else:
                # Crear nuevo registro
                cursor.execute("""
                    INSERT INTO expokossodo_registros 
                    (nombres, correo, empresa, cargo, numero, eventos_seleccionados)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    data['nombres'], data['correo'], data['empresa'], 
                    data['cargo'], data['numero'], json.dumps(eventos_finales)
                ))
                registro_id = cursor.lastrowid
            
            # Eliminar relaciones anteriores para eventos válidos (evitar duplicados)
            if eventos_validos:
                placeholders = ','.join(['%s'] * len(eventos_validos))
                cursor.execute(f"""
                    DELETE FROM expokossodo_registro_eventos 
                    WHERE registro_id = %s AND evento_id IN ({placeholders})
                """, [registro_id] + eventos_validos)
            
            # Insertar nuevas relaciones
            for evento_id in eventos_validos:
                cursor.execute("""
                    INSERT INTO expokossodo_registro_eventos (registro_id, evento_id)
                    VALUES (%s, %s)
                """, (registro_id, evento_id))
            
            # Actualizar contadores de slots ocupados
            for evento_id in eventos_validos:
                cursor.execute("""
                    UPDATE expokossodo_eventos 
                    SET slots_ocupados = slots_ocupados + 1
                    WHERE id = %s
                """, (evento_id,))
            
            connection.commit()
            
            # Preparar respuesta exitosa
            response_data = {
                "success": True,
                "message": f"Registro {'actualizado' if modo_actualizacion else 'creado'} exitosamente. "
                          f"Se agregaron {len(eventos_validos)} charlas.",
                "eventos_agregados": eventos_validos,
                "eventos_omitidos": eventos_conflictivos,
                "modo": "actualizacion" if modo_actualizacion else "creacion",
                "registro_id": registro_id
            }
            
            return jsonify(response_data), 200
            
        except Exception as e:
            connection.rollback()
            return jsonify({
                "error": f"Error en transacción de base de datos: {str(e)}"
            }), 500
        
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/test/health', methods=['GET'])
def health_check():
    """Endpoint de salud para testing"""
    return jsonify({
        "status": "ok",
        "message": "Test backend is running",
        "timestamp": time.time()
    })

if __name__ == '__main__':
    print("[TEST-BACKEND] Iniciando backend de testing...")
    print(f"[TEST-BACKEND] Conectando a DB: {DB_CONFIG['host']}")
    
    # Verificar conexión
    conn = get_db_connection()
    if conn:
        conn.close()
        print("[TEST-BACKEND] Conexión a BD: OK")
    else:
        print("[TEST-BACKEND] Error: No se pudo conectar a la BD")
        exit(1)
    
    print("[TEST-BACKEND] Iniciando servidor en puerto 5000...")
    app.run(debug=False, host='localhost', port=5000)