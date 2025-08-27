#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de prueba para el nuevo endpoint de registro general
"""

import requests
import json
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:5000/api"

def test_registro_general():
    """Probar registro general sin eventos"""
    print("=" * 60)
    print("PRUEBA 1: Registro General (sin eventos)")
    print("=" * 60)
    
    data = {
        "nombres": "Test Usuario General",
        "correo": f"test_general_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
        "empresa": "Empresa Test General",
        "cargo": "Cargo Test",
        "numero": "+507 6000-0000",
        "expectativas": "Prueba de registro general sin eventos específicos",
        "eventos_seleccionados": [],
        "tipo_registro": "general"
    }
    
    print(f"\n[->] Enviando datos:")
    print(json.dumps(data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/registro", json=data)
        print(f"\n[<-] Status Code: {response.status_code}")
        print(f"[<-] Response:")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200 and response.json().get('success'):
            print("\n[OK] EXITO: Registro general creado correctamente")
            print(f"   - ID de registro: {response.json().get('registro_id')}")
            print(f"   - Tipo: {response.json().get('tipo_registro')}")
            print(f"   - Asistencia general: {response.json().get('asistencia_general')}")
            print(f"   - QR generado: {response.json().get('qr_generated')}")
        else:
            print("\n[ERROR] No se pudo crear el registro general")
            
    except Exception as e:
        print(f"\n[ERROR] en la peticion: {e}")
    
    return response.json() if 'response' in locals() else None

def test_registro_con_eventos():
    """Probar registro tradicional con eventos (compatibilidad)"""
    print("\n" + "=" * 60)
    print("PRUEBA 2: Registro con Eventos (compatibilidad)")
    print("=" * 60)
    
    data = {
        "nombres": "Test Usuario Eventos",
        "correo": f"test_eventos_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
        "empresa": "Empresa Test Eventos",
        "cargo": "Cargo Test",
        "numero": "+507 6111-1111",
        "expectativas": "Prueba de registro con eventos seleccionados",
        "eventos_seleccionados": [1, 2, 3],  # IDs de eventos de prueba
        "tipo_registro": "eventos"  # Explícito
    }
    
    print(f"\n[->] Enviando datos:")
    print(json.dumps(data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/registro", json=data)
        print(f"\n[<-] Status Code: {response.status_code}")
        print(f"[<-] Response:")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200 and response.json().get('success'):
            print("\n[OK] EXITO: Registro con eventos creado correctamente")
            print(f"   - Eventos agregados: {len(response.json().get('eventos_agregados', []))}")
        else:
            print("\n[INFO] Respuesta del servidor (puede ser por conflictos o eventos invalidos)")
            
    except Exception as e:
        print(f"\n[ERROR] en la peticion: {e}")

def test_registro_sin_tipo_especificado():
    """Probar compatibilidad hacia atrás (sin tipo_registro)"""
    print("\n" + "=" * 60)
    print("PRUEBA 3: Registro sin tipo_registro (compatibilidad hacia atrás)")
    print("=" * 60)
    
    data = {
        "nombres": "Test Usuario Legacy",
        "correo": f"test_legacy_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
        "empresa": "Empresa Test Legacy",
        "cargo": "Cargo Test",
        "numero": "+507 6222-2222",
        "expectativas": "Prueba de compatibilidad sin tipo_registro",
        "eventos_seleccionados": [1]  # Al menos un evento
        # NO incluimos tipo_registro
    }
    
    print(f"\n[->] Enviando datos (sin tipo_registro):")
    print(json.dumps(data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/registro", json=data)
        print(f"\n[<-] Status Code: {response.status_code}")
        print(f"[<-] Response:")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200:
            print("\n[OK] EXITO: Compatibilidad hacia atras funciona correctamente")
        else:
            print("\n[INFO] Verificar respuesta")
            
    except Exception as e:
        print(f"\n[ERROR] en la peticion: {e}")

def test_registro_general_sin_tipo():
    """Probar qué pasa si enviamos [] sin especificar tipo_registro"""
    print("\n" + "=" * 60)
    print("PRUEBA 4: Array vacío sin tipo_registro (debería fallar)")
    print("=" * 60)
    
    data = {
        "nombres": "Test Usuario Error",
        "correo": f"test_error_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
        "empresa": "Empresa Test Error",
        "cargo": "Cargo Test",
        "numero": "+507 6333-3333",
        "expectativas": "Prueba que debería fallar",
        "eventos_seleccionados": []
        # NO incluimos tipo_registro
    }
    
    print(f"\n[->] Enviando datos (array vacio sin tipo_registro):")
    print(json.dumps(data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/registro", json=data)
        print(f"\n[<-] Status Code: {response.status_code}")
        print(f"[<-] Response:")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 400:
            print("\n[OK] CORRECTO: Se rechazo array vacio sin tipo_registro (comportamiento esperado)")
        else:
            print("\n[WARN] INESPERADO: Se acepto array vacio sin tipo_registro")
            
    except Exception as e:
        print(f"\n[ERROR] en la peticion: {e}")

if __name__ == "__main__":
    print("\n[TEST] INICIANDO PRUEBAS DEL ENDPOINT DE REGISTRO MODIFICADO")
    print("=" * 60)
    
    # Verificar que el servidor esté activo
    try:
        response = requests.get(f"{BASE_URL}/eventos")
        print("[OK] Servidor activo y respondiendo")
    except:
        print("[ERROR] El servidor no esta respondiendo en", BASE_URL)
        print("   Asegurate de ejecutar: python app.py")
        exit(1)
    
    # Ejecutar todas las pruebas
    test_registro_general()
    test_registro_con_eventos()
    test_registro_sin_tipo_especificado()
    test_registro_general_sin_tipo()
    
    print("\n" + "=" * 60)
    print("[DONE] PRUEBAS COMPLETADAS")
    print("=" * 60)