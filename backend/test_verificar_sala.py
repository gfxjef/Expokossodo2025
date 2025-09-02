#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test específico para reproducir el error en /api/verificar-sala/verificar
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_verificar_sala():
    """Probar el endpoint que está fallando"""
    print("=" * 60)
    print("TEST: /api/verificar-sala/verificar")
    print("=" * 60)
    
    # Datos exactos del error reportado
    datos_verificacion = {
        "qr_code": "ana930852410tecuna1756243305",
        "evento_id": 44,
        "asesor_verificador": "Staff-Sala"
    }
    
    print(f"QR Code: {datos_verificacion['qr_code']}")
    print(f"Evento ID: {datos_verificacion['evento_id']}")
    print(f"Asesor: {datos_verificacion['asesor_verificador']}")
    print()
    
    try:
        print("Enviando solicitud POST a /api/verificar-sala/verificar...")
        response = requests.post(
            f"{BASE_URL}/verificar-sala/verificar",
            json=datos_verificacion,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("[EXITO] Verificacion exitosa!")
            data = response.json()
            print(f"Respuesta: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        elif response.status_code == 500:
            print("[ERROR 500] Error interno del servidor")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Respuesta raw: {response.text}")
        
        elif response.status_code == 404:
            print("[ERROR 404] Usuario o evento no encontrado")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Respuesta raw: {response.text}")
                
        elif response.status_code == 403:
            print("[ERROR 403] Usuario no registrado en este evento")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Respuesta raw: {response.text}")
                
        else:
            print(f"[ERROR {response.status_code}] Respuesta inesperada")
            print(f"Respuesta: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"[ERROR DE CONEXION] {e}")
    except Exception as e:
        print(f"[ERROR GENERAL] {e}")

def test_usuario_existe():
    """Verificar si el usuario del QR existe en la base de datos"""
    print("\n" + "=" * 60)
    print("TEST: Verificar si usuario existe")
    print("=" * 60)
    
    # Probar primero con el endpoint de leads que funciona
    datos_leads = {
        "qr_code": "ana930852410tecuna1756243305"
    }
    
    try:
        print("Probando /api/leads/cliente-info...")
        response = requests.post(
            f"{BASE_URL}/leads/cliente-info",
            json=datos_leads,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("[OK] Usuario encontrado en leads:")
            cliente = data.get('cliente', {})
            print(f"  ID: {cliente.get('id')}")
            print(f"  Nombre: {cliente.get('nombres')}")
            print(f"  Email: {cliente.get('correo')}")
            print(f"  Empresa: {cliente.get('empresa')}")
            return cliente.get('id')
        else:
            print(f"[ERROR] Usuario no encontrado: {response.text}")
            return None
            
    except Exception as e:
        print(f"[ERROR] {e}")
        return None

if __name__ == "__main__":
    print("TEST DE VERIFICAR SALA")
    print("Reproduciendo error 'Unread result found'")
    
    # Primero verificar que el usuario existe
    usuario_id = test_usuario_existe()
    
    if usuario_id:
        print(f"\n[OK] Usuario existe con ID: {usuario_id}")
        print("Continuando con test de verificar-sala...")
    else:
        print("\n[ERROR] Usuario no existe, el error puede ser diferente")
        print("Continuando de todas formas...")
    
    # Luego probar el endpoint problemático
    test_verificar_sala()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETADO")
    print("=" * 60)