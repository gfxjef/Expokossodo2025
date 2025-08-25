"""
Prueba del endpoint de impresión térmica via API
"""
import requests
import json

# Primero probar estado de impresora
print("=== Verificando estado de impresora ===")
try:
    response = requests.get('http://localhost:5000/api/verificar/estado-impresora')
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Estado: {data.get('status_text', 'Desconocido')}")
        print(f"✓ Impresora: {data.get('printer', 'No detectada')}")
        print(f"✓ Trabajos en cola: {data.get('jobs', 0)}")
    else:
        print(f"✗ Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error conectando: {e}")

print("\n=== Enviando etiqueta de prueba ===")
try:
    response = requests.post('http://localhost:5000/api/verificar/test-impresora')
    if response.status_code == 200:
        data = response.json()
        print(f"✓ {data.get('message', 'Enviado')}")
        print(f"✓ Impresora: {data.get('printer', 'Desconocida')}")
    else:
        print(f"✗ Error {response.status_code}: {response.text}")
except Exception as e:
    print(f"✗ Error enviando: {e}")

print("\n=== Enviando etiqueta con datos de usuario ===")
usuario_prueba = {
    "usuario_datos": {
        "nombres": "PRUEBA API",
        "empresa": "ExpoKossodo",
        "cargo": "Test 50mm",
        "numero": "123456"
    },
    "qr_text": "API|123456|TEST|EXPO|1234567890",
    "mode": "TSPL"
}

try:
    response = requests.post(
        'http://localhost:5000/api/verificar/imprimir-termica',
        json=usuario_prueba,
        headers={'Content-Type': 'application/json'}
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✓ {data.get('message', 'Enviado')}")
        print(f"✓ QR: {data.get('qr_text', 'N/A')[:30]}...")
    else:
        data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        print(f"✗ Error {response.status_code}: {data.get('error', response.text)}")
except Exception as e:
    print(f"✗ Error: {e}")

print("\n=== Pruebas completadas ===")