#!/usr/bin/env python3
"""
Script de Restauración de Backup - ExpoKossodo 2025
Generado automáticamente el: 2025-09-02 09:01:31
"""

import mysql.connector
import os
import sys
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def restaurar():
    print("\n⚠️ ADVERTENCIA: Este script restaurará el backup del 2025-09-02 09:01:31")
    print("Esto sobrescribirá los datos actuales de las tablas.")
    
    confirmacion = input("\n¿Está seguro? Escriba 'RESTAURAR' para continuar: ")
    if confirmacion != 'RESTAURAR':
        print("Operación cancelada")
        return
        
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("\n📦 Iniciando restauración...")
        
        # Lista de archivos SQL a ejecutar
        archivos_sql = [
            "expokossodo_registros_structure.sql", "expokossodo_registros_data.sql",
            "expokossodo_registro_eventos_structure.sql", "expokossodo_registro_eventos_data.sql",
            "expokossodo_eventos_structure.sql", "expokossodo_eventos_data.sql",
            "expokossodo_asistencias_generales_structure.sql", "expokossodo_asistencias_generales_data.sql",
            "expokossodo_asistencias_por_sala_structure.sql", "expokossodo_asistencias_por_sala_data.sql",
            "expokossodo_qr_registros_structure.sql", "expokossodo_qr_registros_data.sql",
            "expokossodo_fecha_info_structure.sql", "expokossodo_fecha_info_data.sql",
            "expokossodo_marcas_structure.sql", "expokossodo_marcas_data.sql",
            "expokossodo_asesores_structure.sql", "expokossodo_asesores_data.sql",
            "expokossodo_asesor_marcas_structure.sql", "expokossodo_asesor_marcas_data.sql",
            "expokossodo_leads_structure.sql", "expokossodo_leads_data.sql",
            "fb_leads_structure.sql", "fb_leads_data.sql",
        ]
        
        for archivo in archivos_sql:
            if os.path.exists(archivo):
                print(f"  Ejecutando: {archivo}")
                with open(archivo, 'r', encoding='utf-8') as f:
                    sql_commands = f.read()
                    
                # Ejecutar comandos SQL
                for command in sql_commands.split(';'):
                    if command.strip():
                        try:
                            cursor.execute(command)
                        except Exception as e:
                            print(f"    ⚠️ Error en comando: {e}")
                            
        connection.commit()
        print("\n✅ Restauración completada")
        
    except Exception as e:
        print(f"\n❌ Error durante la restauración: {e}")
        if connection:
            connection.rollback()
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            
if __name__ == "__main__":
    restaurar()
