"""
Script de prueba para el endpoint de actualización de datos del cliente
"""

import requests
import json

# URL del servidor backend
BASE_URL = "http://localhost:5000"

def test_actualizar_datos():
    """Probar actualización de datos del cliente"""
    
    print("=" * 60)
    print("PRUEBA DE ACTUALIZACIÓN DE DATOS DEL CLIENTE")
    print("=" * 60)
    
    # Datos de prueba - NECESITAS AJUSTAR ESTOS VALORES con un registro real
    # Primero debes tener un registro existente con su QR code
    datos_prueba = {
        "registro_id": 1,  # Cambiar por un ID real
        "qr_code": "JUA|12345678|Gerente|Tech Corp|1735827456",  # Cambiar por un QR real
        "nombres": "Juan Carlos Actualizado",
        "correo": "juan.actualizado@ejemplo.com",
        "empresa": "Nueva Empresa SA",
        "cargo": "Director General",
        "numero": "+51-987654321"
    }
    
    print("\n1. CASO DE ÉXITO - Actualización válida")
    print("-" * 40)
    print(f"Datos a enviar: {json.dumps(datos_prueba, indent=2)}")
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/registros/actualizar-datos",
            json=datos_prueba,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nEstado de respuesta: {response.status_code}")
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Actualización exitosa!")
        else:
            print("❌ Error en la actualización")
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
    
    # Prueba 2: Email inválido
    print("\n2. CASO DE ERROR - Email inválido")
    print("-" * 40)
    datos_invalidos = datos_prueba.copy()
    datos_invalidos["correo"] = "correo-invalido"
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/registros/actualizar-datos",
            json=datos_invalidos,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Estado de respuesta: {response.status_code}")
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 400:
            print("✅ Validación correcta - Email rechazado")
        else:
            print("❌ La validación no funcionó correctamente")
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
    
    # Prueba 3: Teléfono inválido
    print("\n3. CASO DE ERROR - Teléfono inválido")
    print("-" * 40)
    datos_invalidos = datos_prueba.copy()
    datos_invalidos["numero"] = "abc123xyz"
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/registros/actualizar-datos",
            json=datos_invalidos,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Estado de respuesta: {response.status_code}")
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 400:
            print("✅ Validación correcta - Teléfono rechazado")
        else:
            print("❌ La validación no funcionó correctamente")
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
    
    # Prueba 4: QR code no coincide
    print("\n4. CASO DE ERROR - QR code no coincide")
    print("-" * 40)
    datos_invalidos = datos_prueba.copy()
    datos_invalidos["qr_code"] = "XXX|99999999|Test|Test|999999999"
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/registros/actualizar-datos",
            json=datos_invalidos,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Estado de respuesta: {response.status_code}")
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 404:
            print("✅ Validación correcta - QR no coincide")
        else:
            print("❌ La validación no funcionó correctamente")
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
    
    # Prueba 5: Campo requerido faltante
    print("\n5. CASO DE ERROR - Campo requerido faltante")
    print("-" * 40)
    datos_incompletos = {
        "registro_id": 1,
        "qr_code": datos_prueba["qr_code"],
        "nombres": "Test",
        # Falta correo, empresa, cargo, numero
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/api/registros/actualizar-datos",
            json=datos_incompletos,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Estado de respuesta: {response.status_code}")
        print(f"Respuesta: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 400:
            print("✅ Validación correcta - Campos requeridos")
        else:
            print("❌ La validación no funcionó correctamente")
            
    except Exception as e:
        print(f"❌ Error en la petición: {e}")
    
    print("\n" + "=" * 60)
    print("PRUEBAS COMPLETADAS")
    print("=" * 60)
    print("\n⚠️  NOTA: Para probar correctamente, necesitas:")
    print("1. Tener el servidor Flask corriendo (python app.py)")
    print("2. Tener un registro real en la base de datos")
    print("3. Actualizar registro_id y qr_code con valores reales")

if __name__ == "__main__":
    test_actualizar_datos()