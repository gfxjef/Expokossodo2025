#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WhatsApp Attendance Webhook Microservice

Microservicio Flask que actúa como proxy entre el frontend y el endpoint 
externo de WhatsApp en Railway. Recibe notificaciones de asistencia desde 
el frontend y las reenvía al servicio de WhatsApp.

Usage:
    python test_webhook.py [--port 5001] [--debug]

WHY: Permite control local sobre las notificaciones WhatsApp con logging
detallado y manejo de errores robusto.
"""

import json
import sys
import argparse
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('whatsapp_webhook.log')
    ]
)

logger = logging.getLogger(__name__)

# Crear aplicación Flask
app = Flask(__name__)

# Configurar CORS para permitir requests desde el frontend
CORS(app, origins=[
    'http://localhost:3000',  # Frontend React
    'http://127.0.0.1:3000',
    'https://*.vercel.app',   # Vercel deployments
])

# URL del endpoint externo de WhatsApp
WHATSAPP_EXTERNAL_URL = 'https://expokossodowhatsappvisita-production.up.railway.app/attendance-webhook'

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint para verificar que el microservicio está funcionando.
    """
    logger.info("Health check solicitado")
    return jsonify({
        'status': 'healthy',
        'service': 'whatsapp-attendance-webhook',
        'timestamp': datetime.now().isoformat(),
        'external_endpoint': WHATSAPP_EXTERNAL_URL
    }), 200

@app.route('/attendance-webhook', methods=['POST'])
def attendance_webhook():
    """
    Endpoint principal que recibe notificaciones de asistencia desde el frontend
    y las reenvía al servicio externo de WhatsApp.
    
    Expected payload:
    {
        "nombre": "ELIANA JOGANY DIAZ MEGO",
        "empresa": "GRUPOGRAT S.A.C", 
        "cargo": "Responsable laboratorio",
        "fecha_hora": "2025-08-30 05:27:12",
        "photo": "https://www.kossomet.com/public_html/clientexpokossodo/Eliana_Jogany_Diaz_Mego.jpg"
    }
    """
    try:
        # Validar que el request tenga datos JSON
        if not request.is_json:
            logger.error("Request no contiene JSON válido")
            return jsonify({
                'success': False,
                'error': 'Content-Type debe ser application/json'
            }), 400
            
        data = request.get_json()
        
        # Validar campos requeridos
        required_fields = ['nombre', 'empresa', 'cargo', 'fecha_hora']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        
        if missing_fields:
            logger.error(f"Campos requeridos faltantes: {missing_fields}")
            return jsonify({
                'success': False,
                'error': f'Campos requeridos faltantes: {", ".join(missing_fields)}'
            }), 400
        
        # Log de datos recibidos
        logger.info("=== NUEVA NOTIFICACIÓN WHATSAPP ===")
        logger.info(f"Empleado: {data['nombre']}")
        logger.info(f"Empresa: {data['empresa']}")
        logger.info(f"Cargo: {data['cargo']}")
        logger.info(f"Fecha/Hora: {data['fecha_hora']}")
        logger.info(f"Foto: {'Sí' if data.get('photo') else 'No'}")
        if data.get('photo'):
            logger.info(f"URL Foto: {data['photo']}")
        
        # Reenviar datos al endpoint externo
        logger.info(f"Enviando a endpoint externo: {WHATSAPP_EXTERNAL_URL}")
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'WhatsAppWebhookProxy/1.0'
        }
        
        # Realizar request al endpoint externo
        external_response = requests.post(
            WHATSAPP_EXTERNAL_URL,
            json=data,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"Respuesta externa - Status: {external_response.status_code}")
        
        # Procesar respuesta del endpoint externo
        if external_response.status_code == 200:
            try:
                response_data = external_response.json()
                logger.info("Notificación WhatsApp enviada exitosamente")
                
                # Log detalles de la respuesta si están disponibles
                if response_data.get('data'):
                    response_details = response_data['data']
                    logger.info(f"Message ID: {response_details.get('message_id', 'N/A')}")
                    logger.info(f"Empleado confirmado: {response_details.get('employee_name', 'N/A')}")
                    logger.info(f"Con foto: {response_details.get('has_photo', False)}")
                    logger.info(f"Timestamp: {response_details.get('timestamp', 'N/A')}")
                
                # Devolver respuesta exitosa al frontend
                return jsonify({
                    'success': True,
                    'message': 'Notificación WhatsApp enviada exitosamente',
                    'data': response_data.get('data', {}),
                    'proxy_info': {
                        'processed_by': 'local-webhook-proxy',
                        'timestamp': datetime.now().isoformat()
                    }
                }), 200
                
            except ValueError:
                # Respuesta no es JSON válido pero el status es 200
                logger.warning("Respuesta externa exitosa pero no es JSON válido")
                return jsonify({
                    'success': True,
                    'message': 'Notificación enviada (respuesta externa no JSON)',
                    'proxy_info': {
                        'processed_by': 'local-webhook-proxy',
                        'timestamp': datetime.now().isoformat()
                    }
                }), 200
        else:
            # Error en el endpoint externo
            logger.error(f"Error en endpoint externo: Status {external_response.status_code}")
            logger.error(f"Respuesta: {external_response.text}")
            
            return jsonify({
                'success': False,
                'error': f'Error en servicio externo: {external_response.status_code}',
                'details': external_response.text[:500]  # Limitar tamaño de respuesta
            }), 502
            
    except requests.exceptions.Timeout:
        logger.error("Timeout conectando con endpoint externo")
        return jsonify({
            'success': False,
            'error': 'Timeout conectando con servicio WhatsApp'
        }), 504
        
    except requests.exceptions.ConnectionError:
        logger.error("Error de conexión con endpoint externo")
        return jsonify({
            'success': False,
            'error': 'No se pudo conectar con servicio WhatsApp'
        }), 503
        
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Error interno del proxy'
        }), 500

@app.route('/test', methods=['POST', 'GET'])
def test_endpoint():
    """
    Endpoint de prueba para verificar que el microservicio funciona sin 
    reenviar datos al endpoint externo.
    """
    if request.method == 'POST':
        data = request.get_json() if request.is_json else {}
        logger.info(f"Test POST recibido: {data}")
        
        return jsonify({
            'success': True,
            'message': 'Test endpoint funcionando',
            'received_data': data,
            'timestamp': datetime.now().isoformat()
        }), 200
    else:
        logger.info("Test GET recibido")
        return jsonify({
            'success': True,
            'message': 'Microservicio WhatsApp Webhook funcionando',
            'endpoints': [
                'GET /health - Health check',
                'POST /attendance-webhook - Proxy para notificaciones WhatsApp',
                'GET/POST /test - Endpoint de prueba'
            ],
            'timestamp': datetime.now().isoformat()
        }), 200

@app.errorhandler(404)
def not_found(error):
    """Manejo de rutas no encontradas"""
    logger.warning(f"Ruta no encontrada: {request.path}")
    return jsonify({
        'success': False,
        'error': 'Endpoint no encontrado',
        'available_endpoints': ['/health', '/attendance-webhook', '/test']
    }), 404

def main():
    """Función principal para iniciar el microservicio"""
    parser = argparse.ArgumentParser(description='WhatsApp Attendance Webhook Microservice')
    parser.add_argument('--port', type=int, default=5001, help='Puerto del microservicio (default: 5001)')
    parser.add_argument('--debug', action='store_true', help='Activar modo debug')
    parser.add_argument('--host', default='localhost', help='Host del microservicio (default: localhost)')
    
    args = parser.parse_args()
    
    print("Iniciando WhatsApp Attendance Webhook Microservice")
    print("=" * 60)
    print(f"Host: {args.host}")
    print(f"Puerto: {args.port}")
    print(f"Debug: {'Activado' if args.debug else 'Desactivado'}")
    print(f"Endpoint externo: {WHATSAPP_EXTERNAL_URL}")
    print("=" * 60)
    print(f"Microservicio disponible en: http://{args.host}:{args.port}")
    print(f"Health check: http://{args.host}:{args.port}/health")
    print(f"Webhook: http://{args.host}:{args.port}/attendance-webhook")
    print(f"Test: http://{args.host}:{args.port}/test")
    print("=" * 60)
    print("Presiona Ctrl+C para detener el servicio")
    print()
    
    try:
        # Iniciar servidor Flask
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug,
            use_reloader=False  # Evitar reinicio automático en producción
        )
    except KeyboardInterrupt:
        print("\nMicroservicio detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\nError iniciando microservicio: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()