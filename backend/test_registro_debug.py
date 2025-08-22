#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de debug para el error 500 en el registro
"""

import json
import requests
import mysql.connector
import os
from dotenv import load_dotenv
import traceback

# Cargar variables de entorno
load_dotenv()

def test_registro_directo():
    """Test directo a la base de datos para verificar el problema"""
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'database': os.getenv('DB_NAME', 'expokossodo'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'port': int(os.getenv('DB_PORT', 3306))
    }
    
    print("=== TEST DE REGISTRO - DEBUG ERROR 500 ===")
    print(f"Configuración DB: {db_config['host']}:{db_config['port']}/{db_config['database']}")
    
    try:
        # Conectar con dictionary=True como en el código original
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        # Datos de prueba del error
        correo_test = "gfxjef@gmail.com"
        
        print(f"\n1. Verificando si el usuario {correo_test} existe...")
        cursor.execute("""
            SELECT id, nombres, eventos_seleccionados FROM expokossodo_registros 
            WHERE correo = %s
        """, (correo_test,))
        
        usuario_existente = cursor.fetchone()
        
        if usuario_existente:
            print(f"   Usuario encontrado: ID={usuario_existente['id']}, Nombre={usuario_existente['nombres']}")
            print(f"   Eventos actuales: {usuario_existente['eventos_seleccionados']}")
            
            # Verificar eventos del usuario
            registro_id = usuario_existente['id']
            cursor.execute("""
                SELECT e.id, e.fecha, e.hora, e.titulo_charla, e.sala
                FROM expokossodo_eventos e
                INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
                WHERE re.registro_id = %s
                ORDER BY e.fecha, e.hora
            """, (registro_id,))
            
            eventos_inscritos = cursor.fetchall()
            print(f"   Eventos inscritos en registro_eventos: {len(eventos_inscritos)}")
            
            for evento in eventos_inscritos:
                print(f"      - {evento['titulo_charla']} ({evento['fecha']} {evento['hora']})")
        else:
            print(f"   Usuario NO existe")
        
        # Verificar estructura de eventos
        print("\n2. Verificando estructura de eventos...")
        cursor.execute("SELECT id, fecha, hora, titulo_charla, sala, slots_disponibles, slots_ocupados FROM expokossodo_eventos LIMIT 3")
        eventos = cursor.fetchall()
        
        for evento in eventos:
            print(f"   Evento {evento['id']}: {evento['titulo_charla']}")
            print(f"      Fecha: {evento['fecha']} (tipo: {type(evento['fecha'])})")
            print(f"      Hora: {evento['hora']} (tipo: {type(evento['hora'])})")
            print(f"      Slots: {evento['slots_ocupados']}/{evento['slots_disponibles']}")
        
        # Simular la validación de conflictos
        print("\n3. Simulando validación de conflictos...")
        eventos_nuevos = [1, 2]  # IDs de eventos de prueba
        
        placeholders = ','.join(['%s'] * len(eventos_nuevos))
        cursor.execute(f"""
            SELECT id, fecha, hora, titulo_charla, sala, slots_disponibles, slots_ocupados
            FROM expokossodo_eventos 
            WHERE id IN ({placeholders})
        """, eventos_nuevos)
        eventos_nuevos_detalles = cursor.fetchall()
        
        print(f"   Eventos a validar: {len(eventos_nuevos_detalles)}")
        
        for evento in eventos_nuevos_detalles:
            fecha = evento['fecha']
            hora = evento['hora']
            
            # Intentar hacer strftime
            try:
                fecha_str = fecha.strftime('%Y-%m-%d')
                print(f"   Evento {evento['id']}: fecha_str = {fecha_str}, hora = {hora}")
            except Exception as e:
                print(f"   ERROR en strftime para evento {evento['id']}: {e}")
                print(f"      Tipo de fecha: {type(fecha)}, Valor: {fecha}")
                print(f"      Tipo de hora: {type(hora)}, Valor: {hora}")
        
        cursor.close()
        connection.close()
        print("\n✓ Test completado sin errores de conexión")
        
    except Exception as e:
        print(f"\n✗ ERROR DETECTADO: {e}")
        print(f"\nTraceback completo:")
        traceback.print_exc()
        
        # Intentar identificar el tipo de error
        if "strftime" in str(e):
            print("\n[DIAGNÓSTICO] El error parece estar relacionado con el formato de fecha/hora")
            print("Posible causa: La fecha no es un objeto datetime sino un string")
        elif "dictionary" in str(e):
            print("\n[DIAGNÓSTICO] El error puede estar en el uso del cursor con dictionary=True")
        elif "NoneType" in str(e):
            print("\n[DIAGNÓSTICO] Algún valor esperado es None")
        
    return True

def test_api_endpoint():
    """Test del endpoint API real"""
    print("\n=== TEST DEL ENDPOINT API ===")
    
    api_url = "http://localhost:5000/api"
    
    # Datos de prueba similares a los del error
    payload = {
        "nombres": "123 12312",
        "correo": "gfxjef@gmail.com",
        "empresa": "A Tu Salud",
        "cargo": "12 312 31",
        "numero": "12345678",
        "expectativas": "",
        "eventos_seleccionados": [1, 2]
    }
    
    print(f"Enviando payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(f"{api_url}/registro", json=payload)
        print(f"\nCódigo de respuesta: {response.status_code}")
        
        if response.status_code == 200:
            print("Respuesta exitosa:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print("Respuesta de error:")
            try:
                print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            except:
                print(response.text)
                
    except Exception as e:
        print(f"Error en llamada API: {e}")

def main():
    """Función principal"""
    print("DEBUG DEL ERROR 500 EN REGISTRO")
    print("="*50)
    
    # Primero test directo a DB
    test_registro_directo()
    
    # Luego test del API
    print("\n" + "="*50)
    test_api_endpoint()

if __name__ == "__main__":
    main()