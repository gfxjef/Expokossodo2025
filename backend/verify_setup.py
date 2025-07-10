#!/usr/bin/env python3
"""
Script para verificar que el setup local esté listo para URLs directas
"""

import sys
import os
import requests

# Agregar el directorio backend al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import get_db_connection

def check_database_slugs():
    """Verificar que la base de datos tenga slugs poblados"""
    print("🔍 Verificando base de datos...")
    
    connection = get_db_connection()
    if not connection:
        print("❌ Error de conexión a la base de datos")
        return False
    
    cursor = connection.cursor()
    
    try:
        # Verificar que existe la columna slug
        cursor.execute("DESCRIBE expokossodo_eventos")
        columns = [row[0] for row in cursor.fetchall()]
        
        if 'slug' not in columns:
            print("❌ Columna 'slug' no existe en la tabla")
            return False
        
        print("✅ Columna 'slug' existe")
        
        # Verificar que hay eventos con slugs
        cursor.execute("SELECT COUNT(*) FROM expokossodo_eventos WHERE slug IS NOT NULL AND slug != ''")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("❌ No hay eventos con slugs poblados")
            print("💡 Ejecuta el script de poblado de slugs")
            return False
        
        print(f"✅ {count} eventos tienen slugs poblados")
        
        # Mostrar algunos ejemplos
        cursor.execute("SELECT titulo_charla, slug FROM expokossodo_eventos WHERE slug IS NOT NULL LIMIT 3")
        ejemplos = cursor.fetchall()
        
        print("\n📋 Ejemplos de slugs:")
        for titulo, slug in ejemplos:
            print(f"   • {slug}")
            print(f"     '{titulo[:50]}{'...' if len(titulo) > 50 else ''}'")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando base de datos: {e}")
        return False
    finally:
        cursor.close()
        connection.close()

def check_backend_server():
    """Verificar que el servidor backend esté corriendo"""
    print("\n🔍 Verificando servidor backend...")
    
    try:
        # Verificar endpoint básico
        response = requests.get("http://localhost:5000/api/eventos", timeout=5)
        if response.status_code == 200:
            print("✅ Backend corriendo en http://localhost:5000")
        else:
            print(f"⚠️ Backend responde pero con código {response.status_code}")
            return False
            
        # Verificar endpoint de slug específico
        test_slug = "vacio-que-cumple-tecnologia-inteligente-para-auditar-sin-estres"
        response = requests.get(f"http://localhost:5000/api/evento/{test_slug}", timeout=5)
        
        if response.status_code == 200:
            print("✅ Endpoint de slugs funcionando correctamente")
            evento = response.json()
            print(f"   📌 Evento encontrado: {evento['titulo_charla']}")
            return True
        elif response.status_code == 404:
            print("❌ Endpoint de slugs responde 404 (evento no encontrado)")
            print("💡 Necesitas poblar los slugs en la base de datos")
            return False
        else:
            print(f"⚠️ Endpoint de slugs responde código {response.status_code}")
            return False
            
    except requests.ConnectionError:
        print("❌ No se puede conectar al backend en localhost:5000")
        print("💡 Asegúrate de ejecutar: python app.py")
        return False
    except Exception as e:
        print(f"❌ Error verificando backend: {e}")
        return False

def main():
    print("🚀 Verificando setup para URLs directas de charlas\n")
    
    db_ok = check_database_slugs()
    server_ok = check_backend_server()
    
    print("\n" + "="*60)
    
    if db_ok and server_ok:
        print("🎉 ¡TODO LISTO! El sistema está funcionando correctamente")
        print("\n🎯 Links de prueba:")
        print("   http://localhost:3000/charla/vacio-que-cumple-tecnologia-inteligente-para-auditar-sin-estres")
        print("   http://localhost:3000/charla/medicion-del-dbo-y-su-impacto-en-el-medio-ambiente")
        print("\n💡 Asegúrate también de que el frontend esté corriendo:")
        print("   cd frontend && npm start")
    else:
        print("❌ Hay problemas que necesitan ser resueltos:")
        
        if not db_ok:
            print("\n🔧 Para arreglar la base de datos:")
            print("   1. cd backend")
            print("   2. venv\\Scripts\\activate")
            print("   3. python app.py (esto inicializará la BD)")
            print("   4. Ejecuta este script otra vez")
        
        if not server_ok:
            print("\n🔧 Para iniciar el backend:")
            print("   1. cd backend")
            print("   2. venv\\Scripts\\activate") 
            print("   3. python app.py")

if __name__ == "__main__":
    main() 