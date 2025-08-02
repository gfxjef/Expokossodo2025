#!/usr/bin/env python3
"""
Script para diagnosticar problemas con confirmación de asistencia
"""

import sys
import os
import requests
import json

# Agregar el directorio backend al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import get_db_connection, validar_formato_qr

def test_backend_connection():
    """Verificar que el backend esté corriendo"""
    print("🔍 Verificando conexión al backend...")
    
    try:
        response = requests.get("http://localhost:5000/api/eventos", timeout=5)
        if response.status_code == 200:
            print("✅ Backend corriendo correctamente")
            return True
        else:
            print(f"❌ Backend responde con código {response.status_code}")
            return False
    except requests.ConnectionError:
        print("❌ No se puede conectar al backend")
        print("💡 Ejecuta: python app.py")
        return False

def test_endpoint_buscar_usuario():
    """Probar el endpoint de buscar usuario"""
    print("\n🔍 Probando endpoint /api/verificar/buscar-usuario...")
    
    # QR de prueba (formato: TRES_LETRAS|DNI|CARGO|EMPRESA|TIMESTAMP)
    # Usar el QR real que se generó en crear_registro_prueba.py
    qr_test = "JUA|12345678|Ingeniero|Empresa Test|1754072857"
    
    try:
        response = requests.post(
            "http://localhost:5000/api/verificar/buscar-usuario",
            json={"qr_code": qr_test},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Usuario encontrado:")
            print(f"   👤 Nombre: {data['usuario']['nombres']}")
            print(f"   📧 Email: {data['usuario']['correo']}")
            print(f"   🏢 Empresa: {data['usuario']['empresa']}")
            print(f"   📱 QR Validado: {data['qr_validado']}")
            return data
        else:
            print(f"❌ Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
        return None

def test_endpoint_confirmar_asistencia(usuario_data):
    """Probar el endpoint de confirmar asistencia"""
    print("\n🔍 Probando endpoint /api/verificar/confirmar-asistencia...")
    
    if not usuario_data:
        print("❌ No hay datos de usuario para probar")
        return False
    
    # Usar el QR original que funcionó en buscar-usuario
    qr_original = "JUA|12345678|Ingeniero|Empresa Test|1754072857"
    
    payload = {
        "registro_id": usuario_data['usuario']['id'],
        "qr_code": qr_original,
        "verificado_por": "Test-Script"
    }
    
    try:
        response = requests.post(
            "http://localhost:5000/api/verificar/confirmar-asistencia",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Asistencia confirmada exitosamente:")
            print(f"   📝 Mensaje: {data['message']}")
            print(f"   🆔 Registro ID: {data['registro_id']}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
        return False

def check_database_records():
    """Verificar registros en la base de datos"""
    print("\n🔍 Verificando registros en la base de datos...")
    
    connection = get_db_connection()
    if not connection:
        print("❌ Error de conexión a la base de datos")
        return False
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar registros existentes
        cursor.execute("SELECT COUNT(*) as total FROM expokossodo_registros")
        total_registros = cursor.fetchone()['total']
        print(f"📊 Total de registros: {total_registros}")
        
        if total_registros == 0:
            print("❌ No hay registros en la base de datos")
            print("💡 Necesitas crear registros primero")
            return False
        
        # Verificar registros con QR
        cursor.execute("SELECT COUNT(*) as total FROM expokossodo_registros WHERE qr_code IS NOT NULL AND qr_code != ''")
        registros_con_qr = cursor.fetchone()['total']
        print(f"📱 Registros con QR: {registros_con_qr}")
        
        # Mostrar algunos ejemplos
        cursor.execute("""
            SELECT id, nombres, correo, empresa, qr_code, asistencia_general_confirmada 
            FROM expokossodo_registros 
            WHERE qr_code IS NOT NULL 
            LIMIT 3
        """)
        
        ejemplos = cursor.fetchall()
        print("\n👥 Ejemplos de registros:")
        for registro in ejemplos:
            print(f"   👤 {registro['nombres']} ({registro['correo']})")
            print(f"      🏢 {registro['empresa']}")
            print(f"      📱 QR: {registro['qr_code'][:30]}...")
            print(f"      ✅ Asistencia: {'Sí' if registro['asistencia_general_confirmada'] else 'No'}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando base de datos: {e}")
        return False
    finally:
        cursor.close()
        connection.close()

def test_qr_validation():
    """Probar validación de QR"""
    print("\n🔍 Probando validación de QR...")
    
    # QR de prueba
    qr_test = "JUA|12345678|Ingeniero|Empresa Test|1754072857"
    
    validacion = validar_formato_qr(qr_test)
    
    if validacion['valid']:
        print("✅ QR válido:")
        print(f"   📝 Tres letras: {validacion['parsed']['tres_letras']}")
        print(f"   🆔 Número: {validacion['parsed']['numero']}")
        print(f"   💼 Cargo: {validacion['parsed']['cargo']}")
        print(f"   🏢 Empresa: {validacion['parsed']['empresa']}")
        print(f"   ⏰ Timestamp: {validacion['parsed']['timestamp']}")
        return True
    else:
        print("❌ QR inválido")
        return False

def main():
    """Función principal de diagnóstico"""
    print("🚀 Diagnóstico de Confirmación de Asistencia")
    print("=" * 50)
    
    # 1. Verificar backend
    if not test_backend_connection():
        return
    
    # 2. Verificar base de datos
    if not check_database_records():
        return
    
    # 3. Probar validación de QR
    if not test_qr_validation():
        return
    
    # 4. Probar endpoint buscar usuario
    usuario_data = test_endpoint_buscar_usuario()
    
    # 5. Probar endpoint confirmar asistencia
    if usuario_data:
        test_endpoint_confirmar_asistencia(usuario_data)
    
    print("\n✅ Diagnóstico completado")

if __name__ == "__main__":
    main() 