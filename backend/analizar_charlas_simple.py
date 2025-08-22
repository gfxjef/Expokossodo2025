#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script simple para analizar charlas y registros
ExpoKossodo 2025
"""

import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime
import json

# Cargar variables de entorno
load_dotenv()

def get_db_connection():
    """Establece conexión con la base de datos"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

def main():
    """Función principal"""
    print("=" * 60)
    print("ANALISIS DE CHARLAS Y REGISTROS - EXPOKOSSODO 2025")
    print("=" * 60)
    
    connection = get_db_connection()
    if not connection:
        print("ERROR: No se pudo conectar a la base de datos")
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Query para obtener charlas con registros
        query = """
        SELECT 
            e.id,
            e.titulo_charla,
            e.expositor,
            e.sala,
            e.fecha,
            e.hora,
            e.pais,
            e.slots_disponibles,
            e.slots_ocupados,
            e.disponible,
            COALESCE(COUNT(re.registro_id), 0) as registros_reales
        FROM expokossodo_eventos e
        LEFT JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
        GROUP BY 
            e.id, e.titulo_charla, e.expositor, e.sala, e.fecha, e.hora,
            e.pais, e.slots_disponibles, e.slots_ocupados, e.disponible
        ORDER BY 
            registros_reales DESC, e.fecha, e.hora
        """
        
        cursor.execute(query)
        charlas = cursor.fetchall()
        
        print(f"\nSe encontraron {len(charlas)} charlas en total")
        print("=" * 60)
        
        total_registros = 0
        charlas_con_registros = 0
        
        for i, charla in enumerate(charlas, 1):
            registros = charla['registros_reales']
            total_registros += registros
            
            if registros > 0:
                charlas_con_registros += 1
            
            fecha_str = charla['fecha'].strftime('%Y-%m-%d') if charla['fecha'] else 'N/A'
            hora_str = str(charla['hora']) if charla['hora'] else 'N/A'
            
            print(f"\n{i:3d}. ID: {charla['id']}")
            print(f"     Titulo: {charla['titulo_charla']}")
            print(f"     Expositor: {charla['expositor']}")
            print(f"     Sala: {charla['sala']}")
            print(f"     Fecha/Hora: {fecha_str} {hora_str}")
            print(f"     Pais: {charla['pais']}")
            print(f"     Capacidad: {charla['slots_disponibles']}")
            print(f"     Registros: {registros}")
            
            if charla['slots_disponibles'] > 0:
                porcentaje = (registros * 100) / charla['slots_disponibles']
                print(f"     Ocupacion: {porcentaje:.1f}%")
            else:
                print(f"     Ocupacion: N/A")
            
            print(f"     Disponible: {'Si' if charla['disponible'] else 'No'}")
            print("-" * 50)
        
        # Resumen final
        print("\n" + "=" * 60)
        print("RESUMEN ESTADISTICO")
        print("=" * 60)
        print(f"Total de charlas: {len(charlas)}")
        print(f"Charlas con registros: {charlas_con_registros}")
        print(f"Charlas sin registros: {len(charlas) - charlas_con_registros}")
        print(f"Total de registros: {total_registros}")
        
        if len(charlas) > 0:
            promedio = total_registros / len(charlas)
            print(f"Promedio registros por charla: {promedio:.2f}")
        
        # Top 10 charlas con más registros
        print(f"\nTOP 10 CHARLAS CON MAS REGISTROS:")
        print("-" * 40)
        for i, charla in enumerate(charlas[:10], 1):
            if charla['registros_reales'] > 0:
                print(f"{i:2d}. {charla['titulo_charla']} - {charla['registros_reales']} registros")
        
        # Exportar a JSON
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'charlas_registros_{timestamp}.json'
        
        # Preparar datos para JSON
        charlas_json = []
        for charla in charlas:
            charla_dict = dict(charla)
            if charla_dict['fecha']:
                charla_dict['fecha'] = charla_dict['fecha'].strftime('%Y-%m-%d')
            if charla_dict['hora']:
                charla_dict['hora'] = str(charla_dict['hora'])
            charlas_json.append(charla_dict)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_charlas': len(charlas),
                'total_registros': total_registros,
                'charlas': charlas_json
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\nArchivo exportado: {filename}")
        
    except mysql.connector.Error as e:
        print(f"Error ejecutando consulta: {e}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    main()