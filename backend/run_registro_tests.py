#!/usr/bin/env python3
"""
Script auxiliar para ejecutar los tests del sistema de registro
Verifica el entorno y ejecuta el suite de testing completo
"""

import sys
import os
import subprocess
import time
import requests
from dotenv import load_dotenv

def check_environment():
    """Verificar que el entorno esté configurado correctamente"""
    print("[CHECK] Verificando entorno de testing...")
    
    # Cargar variables de entorno
    load_dotenv()
    
    # Verificar variables críticas
    required_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"[ERROR] Variables de entorno faltantes: {missing_vars}")
        return False
    
    print("[OK] Variables de entorno configuradas")
    return True

def check_api_availability(api_url="http://localhost:5000/api"):
    """Verificar que la API esté disponible"""
    print(f"[API] Verificando disponibilidad de API en {api_url}...")
    
    try:
        # Intentar endpoint de eventos
        response = requests.get(f"{api_url}/eventos", timeout=5)
        if response.status_code == 200:
            print("[OK] API disponible y respondiendo")
            return True
        else:
            print(f"[ERROR] API responde con código {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] No se pudo conectar a la API")
        print("[INFO] Asegúrate de que el backend Flask esté ejecutándose en puerto 5000")
        return False
    except requests.exceptions.Timeout:
        print("[ERROR] Timeout conectando a la API")
        return False
    except Exception as e:
        print(f"[ERROR] Error verificando API: {e}")
        return False

def start_backend_if_needed():
    """Intentar iniciar el backend si no está ejecutándose"""
    print("[START] Intentando iniciar backend Flask...")
    
    # Cambiar al directorio del backend
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    try:
        # Intentar ejecutar app.py en background
        if os.name == 'nt':  # Windows
            subprocess.Popen(['python', 'app.py'], shell=True, 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
        else:  # Unix/Linux/Mac
            subprocess.Popen(['python3', 'app.py'], 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
        
        # Esperar un momento para que el servidor se inicie
        print("[WAIT] Esperando que el backend se inicie...")
        time.sleep(5)
        
        # Verificar si ahora está disponible
        return check_api_availability()
        
    except Exception as e:
        print(f"[ERROR] Error iniciando backend: {e}")
        return False

def run_tests():
    """Ejecutar el suite de testing"""
    print("[TEST] Iniciando suite de testing...")
    
    try:
        # Ejecutar test_registro_system_clean.py (version sin emojis)
        result = subprocess.run([sys.executable, 'test_registro_system_clean.py'], 
                              capture_output=True, text=True)
        
        # Mostrar output
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"[ERROR] Error ejecutando tests: {e}")
        return False

def main():
    """Función principal"""
    print("ExpoKossodo 2025 - Test Runner")
    print("=" * 50)
    
    # 1. Verificar entorno
    if not check_environment():
        print("[ERROR] Entorno no configurado correctamente")
        return 1
    
    # 2. Verificar API o intentar iniciarla
    if not check_api_availability():
        print("[WARN] API no disponible, intentando iniciar backend...")
        if not start_backend_if_needed():
            print("[ERROR] No se pudo iniciar o conectar con el backend")
            print("\n[INFO] Para iniciar manualmente:")
            print("   cd backend")
            print("   python app.py")
            return 1
    
    # 3. Ejecutar tests
    success = run_tests()
    
    if success:
        print("\n[SUCCESS] Suite de testing completado exitosamente")
        return 0
    else:
        print("\n[FAILED] Suite de testing falló")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)