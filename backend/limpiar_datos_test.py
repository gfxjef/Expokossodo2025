#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para limpiar registros de test de la base de datos.
"""

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT', 3306)
        )
        return connection
    except Error as e:
        print(f"Error conectando a MySQL: {e}")
        return None

def limpiar_datos_test():
    """Eliminar registros con datos de test específicos"""
    connection = get_db_connection()
    if not connection:
        print("[ERROR] No se pudo conectar a la base de datos")
        return
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        print("Buscando y eliminando registros de test...")
        
        # Eliminar registros de test
        cursor.execute("""
            DELETE FROM expokossodo_registros 
            WHERE nombres LIKE '%Test Usuario%' 
               OR correo LIKE '%test_frontend_%'
               OR numero = '+507 6999-9999'
               OR empresa LIKE '%Test Frontend%'
               OR cargo = 'Cargo Test'
        """)
        
        registros_eliminados = cursor.rowcount
        connection.commit()
        
        print(f"[OK] {registros_eliminados} registros de test eliminados")
        
    except Error as e:
        print(f"[ERROR] Error: {e}")
        connection.rollback()
    
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    limpiar_datos_test()