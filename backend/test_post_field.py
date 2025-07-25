#!/usr/bin/env python3
"""
Script de prueba para verificar la implementación del campo 'post'
Autor: ExpoKossodo Development Team
Fecha: 2025
"""

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import json

# Cargar variables de entorno
load_dotenv()

def test_post_field():
    """Probar la implementación del campo post"""
    
    # Configuración de base de datos
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'database': os.getenv('DB_NAME', 'expokossodo'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'port': int(os.getenv('DB_PORT', 3306)),
        'charset': 'utf8mb4',
        'use_unicode': True
    }
    
    print("🧪 Iniciando pruebas del campo 'post'...")
    print(f"📍 Conectando a: {db_config['host']}:{db_config['port']}/{db_config['database']}")
    
    try:
        # Conectar a la base de datos
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        print("✅ Conexión exitosa a la base de datos")
        
        # 1. Verificar que la columna existe
        print("\n🔍 1. Verificando que la columna 'post' existe...")
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'expokossodo_eventos' 
            AND COLUMN_NAME = 'post'
        """, (db_config['database'],))
        
        column_info = cursor.fetchone()
        if column_info:
            print(f"✅ Columna 'post' encontrada:")
            print(f"   - Tipo: {column_info['DATA_TYPE']}")
            print(f"   - Nullable: {column_info['IS_NULLABLE']}")
            print(f"   - Default: {column_info['COLUMN_DEFAULT']}")
        else:
            print("❌ Columna 'post' NO encontrada")
            return False
        
        # 2. Verificar eventos existentes
        print("\n🔍 2. Verificando eventos existentes...")
        cursor.execute("SELECT COUNT(*) as total FROM expokossodo_eventos")
        total_eventos = cursor.fetchone()['total']
        print(f"✅ Total de eventos: {total_eventos}")
        
        # 3. Verificar eventos con campo post
        print("\n🔍 3. Verificando eventos con campo post...")
        cursor.execute("SELECT COUNT(*) as total FROM expokossodo_eventos WHERE post IS NOT NULL AND post != ''")
        eventos_con_post = cursor.fetchone()['total']
        print(f"✅ Eventos con post: {eventos_con_post}")
        
        # 4. Mostrar algunos eventos de ejemplo
        print("\n🔍 4. Mostrando eventos de ejemplo...")
        cursor.execute("""
            SELECT id, titulo_charla, post 
            FROM expokossodo_eventos 
            ORDER BY id 
            LIMIT 5
        """)
        
        eventos_ejemplo = cursor.fetchall()
        for evento in eventos_ejemplo:
            post_status = "✅ Con post" if evento['post'] else "❌ Sin post"
            print(f"   - ID {evento['id']}: {evento['titulo_charla'][:50]}... {post_status}")
        
        # 5. Probar inserción de un post de ejemplo
        print("\n🔍 5. Probando inserción de post de ejemplo...")
        test_post_url = "https://ejemplo.com/post-charla-test"
        
        cursor.execute("""
            UPDATE expokossodo_eventos 
            SET post = %s 
            WHERE id = 1
        """, (test_post_url,))
        
        connection.commit()
        print(f"✅ Post de ejemplo insertado: {test_post_url}")
        
        # 6. Verificar que se guardó correctamente
        cursor.execute("SELECT post FROM expokossodo_eventos WHERE id = 1")
        resultado = cursor.fetchone()
        if resultado and resultado['post'] == test_post_url:
            print("✅ Post guardado correctamente")
        else:
            print("❌ Error al guardar el post")
        
        # 7. Limpiar el post de prueba
        cursor.execute("UPDATE expokossodo_eventos SET post = NULL WHERE id = 1")
        connection.commit()
        print("✅ Post de prueba limpiado")
        
        print("\n🎉 Todas las pruebas completadas exitosamente!")
        return True
        
    except Error as e:
        print(f"❌ Error en las pruebas: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 Conexión cerrada")

if __name__ == "__main__":
    success = test_post_field()
    if success:
        print("\n✅ Implementación del campo 'post' verificada correctamente")
    else:
        print("\n❌ Error en la verificación del campo 'post'") 