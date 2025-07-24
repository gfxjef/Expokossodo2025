#!/usr/bin/env python3
"""
Script de migración para agregar la columna rubro a la tabla expokossodo_eventos
"""

import mysql.connector
import os
from dotenv import load_dotenv
import json

# Cargar variables de entorno
load_dotenv()

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def get_db_connection():
    """Obtener conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as e:
        print(f"❌ Error conectando a la base de datos: {e}")
        return None

def check_column_exists(cursor, table_name, column_name):
    """Verificar si una columna existe en la tabla"""
    cursor.execute("""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = %s 
        AND TABLE_NAME = %s 
        AND COLUMN_NAME = %s
    """, (DB_CONFIG['database'], table_name, column_name))
    
    return cursor.fetchone() is not None

def migrate_add_rubro_column():
    """Migración para agregar la columna rubro"""
    connection = get_db_connection()
    if not connection:
        print("❌ No se pudo conectar a la base de datos")
        return False
    
    cursor = connection.cursor()
    
    try:
        print("🔍 Verificando si la columna 'rubro' ya existe...")
        
        if check_column_exists(cursor, 'expokossodo_eventos', 'rubro'):
            print("✅ La columna 'rubro' ya existe en la tabla expokossodo_eventos")
            return True
        
        print("📝 Agregando columna 'rubro' a la tabla expokossodo_eventos...")
        
        # Agregar columna rubro como JSON
        cursor.execute("""
            ALTER TABLE expokossodo_eventos 
            ADD COLUMN rubro JSON NULL
        """)
        
        # Agregar índice para búsquedas eficientes
        cursor.execute("""
            ALTER TABLE expokossodo_eventos 
            ADD INDEX idx_rubro ((CAST(rubro AS CHAR(100))))
        """)
        
        # Verificar si las columnas disponible y marca_id existen
        if not check_column_exists(cursor, 'expokossodo_eventos', 'disponible'):
            print("📝 Agregando columna 'disponible'...")
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN disponible BOOLEAN DEFAULT TRUE
            """)
        
        if not check_column_exists(cursor, 'expokossodo_eventos', 'marca_id'):
            print("📝 Agregando columna 'marca_id'...")
            cursor.execute("""
                ALTER TABLE expokossodo_eventos 
                ADD COLUMN marca_id INT NULL
            """)
            
            # Agregar foreign key si la tabla de marcas existe
            cursor.execute("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'expokossodo_marcas'
            """, (DB_CONFIG['database'],))
            
            if cursor.fetchone()[0] > 0:
                cursor.execute("""
                    ALTER TABLE expokossodo_eventos 
                    ADD CONSTRAINT fk_evento_marca 
                    FOREIGN KEY (marca_id) REFERENCES expokossodo_marcas(id) 
                    ON DELETE SET NULL
                """)
        
        connection.commit()
        print("✅ Migración completada exitosamente")
        print("📊 Columnas agregadas:")
        print("   - rubro (JSON): Para almacenar múltiples rubros")
        print("   - disponible (BOOLEAN): Para activar/desactivar eventos")
        print("   - marca_id (INT): Para asociar eventos con marcas")
        
        return True
        
    except mysql.connector.Error as e:
        print(f"❌ Error durante la migración: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

def populate_sample_rubros():
    """Poblar algunos eventos con rubros de ejemplo"""
    connection = get_db_connection()
    if not connection:
        print("❌ No se pudo conectar a la base de datos")
        return False
    
    cursor = connection.cursor()
    
    try:
        print("🔍 Poblando algunos eventos con rubros de ejemplo...")
        
        # Rubros de ejemplo para diferentes tipos de eventos
        sample_rubros = {
            'Salud': ['Salud'],
            'Química & Petrolera': ['Química & Petrolera'],
            'Educación': ['Educación'],
            'Aguas y bebidas': ['Aguas y bebidas'],
            'Farmacéutica': ['Farmacéutica'],
            'Alimentos': ['Alimentos'],
            'Minería': ['Minería'],
            'Pesquera': ['Pesquera'],
            'Multi-sector': ['Salud', 'Farmacéutica'],
            'Industrial': ['Química & Petrolera', 'Minería']
        }
        
        # Obtener algunos eventos para actualizar
        cursor.execute("SELECT id, titulo_charla FROM expokossodo_eventos LIMIT 10")
        eventos = cursor.fetchall()
        
        for i, (evento_id, titulo) in enumerate(eventos):
            # Asignar rubros de forma rotativa
            rubros_keys = list(sample_rubros.keys())
            rubros_key = rubros_keys[i % len(rubros_keys)]
            rubros = sample_rubros[rubros_key]
            
            cursor.execute("""
                UPDATE expokossodo_eventos 
                SET rubro = %s 
                WHERE id = %s
            """, (json.dumps(rubros), evento_id))
            
            print(f"   ✅ Evento {evento_id}: {titulo[:30]}... -> {', '.join(rubros)}")
        
        connection.commit()
        print("✅ Población de rubros completada")
        return True
        
    except mysql.connector.Error as e:
        print(f"❌ Error poblando rubros: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    print("🚀 Iniciando migración para agregar columna rubro...")
    print("=" * 50)
    
    # Ejecutar migración
    if migrate_add_rubro_column():
        print("\n" + "=" * 50)
        print("🎯 Migración de estructura completada")
        
        # Preguntar si poblar con datos de ejemplo
        response = input("\n¿Deseas poblar algunos eventos con rubros de ejemplo? (y/n): ")
        if response.lower() in ['y', 'yes', 'sí', 'si']:
            populate_sample_rubros()
    else:
        print("❌ La migración falló")
    
    print("\n🏁 Proceso completado") 