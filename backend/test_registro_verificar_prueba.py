#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para probar el flujo completo:
1. Crear registro con tipo_registro: general
2. Buscar el QR generado en /api/verificar/buscar-usuario
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000/api"

def test_registro_y_verificacion():
    print("[TEST] Iniciando prueba completa de registro + verificación")
    print("=" * 60)
    
    # Datos para el registro
    datos_registro = {
        "nombres": "Test Usuario Frontend",
        "correo": f"test_frontend_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
        "empresa": "Empresa Test Frontend",
        "cargo": "Cargo Test",
        "numero": "+507 6999-9999",
        "expectativas": "Registro desde página verificar_prueba",
        "eventos_seleccionados": [],
        "tipo_registro": "general"
    }
    
    print(f"\n[PASO 1] Creando registro general...")
    
    try:
        # Crear registro
        response = requests.post(f"{BASE_URL}/registro", json=datos_registro)
        
        if response.status_code == 200 and response.json().get('success'):
            data = response.json()
            print(f"[OK] Registro creado exitosamente:")
            print(f"  - ID: {data.get('registro_id')}")
            print(f"  - Tipo: {data.get('tipo_registro')}")
            print(f"  - QR: {data.get('qr_code')}")
            print(f"  - Asistencia general: {data.get('asistencia_general')}")
            
            qr_code = data.get('qr_code')
            
            # Esperar un momento para asegurar que el registro esté en BD
            print(f"\n[PASO 2] Buscando usuario por QR: {qr_code}")
            
            # Buscar por QR
            busqueda_data = {"qr_code": qr_code}
            response_busqueda = requests.post(f"{BASE_URL}/verificar/buscar-usuario", json=busqueda_data)
            
            if response_busqueda.status_code == 200:
                usuario_data = response_busqueda.json()
                print(f"[OK] Usuario encontrado:")
                print(f"  - Nombre: {usuario_data['usuario']['nombres']}")
                print(f"  - Email: {usuario_data['usuario']['correo']}")
                print(f"  - Estado asistencia: {usuario_data['usuario']['estado_asistencia']}")
                print(f"  - Eventos registrados: {len(usuario_data['eventos'])}")
                print(f"  - QR validado: {usuario_data['qr_validado']}")
                
                print(f"\n[OK] PRUEBA COMPLETA EXITOSA!")
                print(f"     El flujo registro -> búsqueda funciona correctamente")
                return True
            else:
                print(f"[ERROR] No se pudo buscar el usuario: {response_busqueda.text}")
                return False
        else:
            print(f"[ERROR] Error creando registro: {response.text}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Excepción durante la prueba: {e}")
        return False

def test_buscar_registros_cache():
    """Probar el endpoint que usa la página para cargar el cache"""
    print(f"\n[PASO 3] Probando endpoint de cache...")
    
    try:
        response = requests.get(f"{BASE_URL}/verificar/obtener-todos-registros")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"[OK] Cache cargado correctamente:")
                print(f"  - Total registros: {data.get('total')}")
                print(f"  - Registros en respuesta: {len(data.get('registros', []))}")
                
                # Mostrar algunos registros de ejemplo
                registros = data.get('registros', [])[:3]
                for i, registro in enumerate(registros):
                    print(f"  - Registro {i+1}: {registro.get('nombres')} - QR: {registro.get('qr_code', 'N/A')[:20]}...")
                return True
            else:
                print(f"[ERROR] Respuesta no exitosa: {data}")
                return False
        else:
            print(f"[ERROR] Error HTTP: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error obteniendo cache: {e}")
        return False

if __name__ == "__main__":
    print("\n[TEST] VERIFICANDO SERVIDOR...")
    try:
        response = requests.get(f"{BASE_URL}/eventos")
        print("[OK] Servidor activo")
    except:
        print("[ERROR] Servidor no responde en", BASE_URL)
        print("   Ejecuta: python app.py")
        exit(1)
    
    # Ejecutar pruebas
    exito = test_registro_y_verificacion()
    exito_cache = test_buscar_registros_cache()
    
    print("\n" + "=" * 60)
    if exito and exito_cache:
        print("[RESULTADO] TODAS LAS PRUEBAS EXITOSAS")
        print("           La página /verificar_prueba debería funcionar correctamente")
    else:
        print("[RESULTADO] ALGUNAS PRUEBAS FALLARON")
    print("=" * 60)