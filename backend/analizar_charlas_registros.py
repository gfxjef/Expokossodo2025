#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para analizar todas las charlas y sus registros
ExpoKossodo 2025 - Análisis de Charlas y Registros
"""

import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime
import json
import csv

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

def analizar_charlas_registros():
    """Obtiene lista completa de charlas con cantidad de registros"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Query principal para obtener charlas con conteo de registros
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
            e.descripcion,
            e.post,
            e.imagen_url,
            
            -- Conteo real de registros desde tabla de relaciones
            COALESCE(COUNT(re.registro_id), 0) as registros_confirmados,
            
            -- Información adicional
            CASE 
                WHEN e.slots_disponibles > 0 THEN 
                    ROUND((COALESCE(COUNT(re.registro_id), 0) * 100.0 / e.slots_disponibles), 2)
                ELSE 0 
            END as porcentaje_ocupacion
            
        FROM expokossodo_eventos e
        LEFT JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
        GROUP BY 
            e.id, e.titulo_charla, e.expositor, e.sala, e.fecha, e.hora,
            e.pais, e.slots_disponibles, e.slots_ocupados, e.disponible,
            e.descripcion, e.post, e.imagen_url
        ORDER BY 
            e.fecha, e.hora, e.sala, e.titulo_charla
        """
        
        cursor.execute(query)
        charlas = cursor.fetchall()
        
        # Convertir datetime a string para serialización
        for charla in charlas:
            if charla['fecha']:
                charla['fecha'] = charla['fecha'].strftime('%Y-%m-%d')
            if charla['hora']:
                charla['hora'] = str(charla['hora'])
        
        return charlas
        
    except mysql.connector.Error as e:
        print(f"Error ejecutando consulta: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def generar_resumen_estadisticas(charlas):
    """Genera resumen estadístico de las charlas"""
    if not charlas:
        return None
        
    total_charlas = len(charlas)
    total_registros = sum(c['registros_confirmados'] for c in charlas)
    charlas_con_registros = len([c for c in charlas if c['registros_confirmados'] > 0])
    charlas_disponibles = len([c for c in charlas if c['disponible']])
    
    # Agrupar por fecha
    por_fecha = {}
    for charla in charlas:
        fecha = charla['fecha']
        if fecha not in por_fecha:
            por_fecha[fecha] = {
                'charlas': 0,
                'registros': 0,
                'salas': set()
            }
        por_fecha[fecha]['charlas'] += 1
        por_fecha[fecha]['registros'] += charla['registros_confirmados']
        por_fecha[fecha]['salas'].add(charla['sala'])
    
    # Convertir sets a listas para JSON
    for fecha in por_fecha:
        por_fecha[fecha]['salas'] = list(por_fecha[fecha]['salas'])
    
    # Top charlas con más registros
    top_charlas = sorted(charlas, key=lambda x: x['registros_confirmados'], reverse=True)[:10]
    
    # Agrupar por sala
    por_sala = {}
    for charla in charlas:
        sala = charla['sala']
        if sala not in por_sala:
            por_sala[sala] = {
                'charlas': 0,
                'registros': 0
            }
        por_sala[sala]['charlas'] += 1
        por_sala[sala]['registros'] += charla['registros_confirmados']
    
    resumen = {
        'timestamp': datetime.now().isoformat(),
        'totales': {
            'charlas_total': total_charlas,
            'charlas_disponibles': charlas_disponibles,
            'charlas_con_registros': charlas_con_registros,
            'total_registros': total_registros,
            'promedio_registros_por_charla': round(total_registros / total_charlas if total_charlas > 0 else 0, 2)
        },
        'por_fecha': por_fecha,
        'por_sala': por_sala,
        'top_charlas': top_charlas
    }
    
    return resumen

def exportar_resultados(charlas, resumen):
    """Exporta resultados a diferentes formatos"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Exportar JSON completo
    json_filename = f'analisis_charlas_registros_{timestamp}.json'
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump({
            'charlas': charlas,
            'resumen': resumen
        }, f, ensure_ascii=False, indent=2)
    
    # Exportar CSV simplificado
    csv_filename = f'charlas_registros_{timestamp}.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Headers
        writer.writerow([
            'ID', 'Título', 'Expositor', 'Sala', 'Fecha', 'Hora',
            'País', 'Slots Disponibles', 'Slots Ocupados', 'Registros Confirmados',
            '% Ocupación', 'Disponible'
        ])
        
        # Data
        for charla in charlas:
            writer.writerow([
                charla['id'],
                charla['titulo_charla'],
                charla['expositor'],
                charla['sala'],
                charla['fecha'],
                charla['hora'],
                charla['pais'],
                charla['slots_disponibles'],
                charla['slots_ocupados'],
                charla['registros_confirmados'],
                charla['porcentaje_ocupacion'],
                'Sí' if charla['disponible'] else 'No'
            ])
    
    return json_filename, csv_filename

def main():
    """Función principal"""
    print("=" * 60)
    print("ANÁLISIS DE CHARLAS Y REGISTROS - EXPOKOSSODO 2025")
    print("=" * 60)
    
    # Obtener datos
    print("[INFO] Obteniendo datos de charlas y registros...")
    charlas = analizar_charlas_registros()
    
    if not charlas:
        print("[ERROR] No se pudieron obtener los datos.")
        return
    
    print(f"[OK] Se encontraron {len(charlas)} charlas en total")
    
    # Generar resumen
    print("[INFO] Generando resumen estadistico...")
    resumen = generar_resumen_estadisticas(charlas)
    
    # Mostrar resumen en consola
    print("\n" + "=" * 40)
    print("RESUMEN ESTADÍSTICO")
    print("=" * 40)
    
    totales = resumen['totales']
    print(f"📅 Total de charlas: {totales['charlas_total']}")
    print(f"✅ Charlas disponibles: {totales['charlas_disponibles']}")
    print(f"👥 Charlas con registros: {totales['charlas_con_registros']}")
    print(f"📊 Total de registros: {totales['total_registros']}")
    print(f"📈 Promedio registros/charla: {totales['promedio_registros_por_charla']}")
    
    print(f"\n📋 DISTRIBUCIÓN POR FECHA:")
    for fecha, datos in resumen['por_fecha'].items():
        print(f"  {fecha}: {datos['charlas']} charlas, {datos['registros']} registros")
    
    print(f"\n🏛️  DISTRIBUCIÓN POR SALA:")
    for sala, datos in resumen['por_sala'].items():
        print(f"  {sala}: {datos['charlas']} charlas, {datos['registros']} registros")
    
    print(f"\n🏆 TOP 5 CHARLAS CON MÁS REGISTROS:")
    for i, charla in enumerate(resumen['top_charlas'][:5], 1):
        print(f"  {i}. {charla['titulo_charla']} ({charla['registros_confirmados']} registros)")
    
    # Exportar archivos
    print(f"\n💾 Exportando resultados...")
    json_file, csv_file = exportar_resultados(charlas, resumen)
    
    print(f"✅ Archivos generados:")
    print(f"  📄 JSON completo: {json_file}")
    print(f"  📊 CSV simplificado: {csv_file}")
    
    print(f"\n🎯 ¿Quieres ver charlas específicas? (s/n): ", end="")
    if input().lower() == 's':
        mostrar_charlas_detalle(charlas)

def mostrar_charlas_detalle(charlas):
    """Muestra detalles de charlas específicas"""
    while True:
        print(f"\n🔍 Filtros disponibles:")
        print("1. Todas las charlas")
        print("2. Solo charlas con registros")
        print("3. Solo charlas sin registros")
        print("4. Filtrar por sala")
        print("5. Filtrar por fecha")
        print("6. Buscar por título/expositor")
        print("0. Salir")
        
        opcion = input("Selecciona una opción: ").strip()
        
        if opcion == "0":
            break
        elif opcion == "1":
            mostrar_lista_charlas(charlas)
        elif opcion == "2":
            charlas_filtradas = [c for c in charlas if c['registros_confirmados'] > 0]
            mostrar_lista_charlas(charlas_filtradas, "CHARLAS CON REGISTROS")
        elif opcion == "3":
            charlas_filtradas = [c for c in charlas if c['registros_confirmados'] == 0]
            mostrar_lista_charlas(charlas_filtradas, "CHARLAS SIN REGISTROS")
        elif opcion == "4":
            salas = list(set(c['sala'] for c in charlas))
            print(f"Salas disponibles: {', '.join(salas)}")
            sala = input("Ingresa el nombre de la sala: ").strip()
            charlas_filtradas = [c for c in charlas if c['sala'].lower() == sala.lower()]
            mostrar_lista_charlas(charlas_filtradas, f"CHARLAS EN SALA {sala.upper()}")
        elif opcion == "5":
            fechas = list(set(c['fecha'] for c in charlas))
            fechas.sort()
            print(f"Fechas disponibles: {', '.join(fechas)}")
            fecha = input("Ingresa la fecha (YYYY-MM-DD): ").strip()
            charlas_filtradas = [c for c in charlas if c['fecha'] == fecha]
            mostrar_lista_charlas(charlas_filtradas, f"CHARLAS DEL {fecha}")
        elif opcion == "6":
            termino = input("Ingresa término de búsqueda: ").strip().lower()
            charlas_filtradas = [c for c in charlas 
                               if termino in c['titulo_charla'].lower() 
                               or termino in c['expositor'].lower()]
            mostrar_lista_charlas(charlas_filtradas, f"BÚSQUEDA: '{termino}'")

def mostrar_lista_charlas(charlas, titulo="LISTA DE CHARLAS"):
    """Muestra una lista formateada de charlas"""
    print(f"\n{titulo}")
    print("-" * len(titulo))
    
    if not charlas:
        print("No se encontraron charlas con los criterios especificados.")
        return
    
    for charla in charlas:
        print(f"\n📍 ID: {charla['id']}")
        print(f"  📚 Título: {charla['titulo_charla']}")
        print(f"  👨‍🏫 Expositor: {charla['expositor']}")
        print(f"  🏛️  Sala: {charla['sala']}")
        print(f"  📅 Fecha/Hora: {charla['fecha']} {charla['hora']}")
        print(f"  🌍 País: {charla['pais']}")
        print(f"  👥 Registros: {charla['registros_confirmados']}/{charla['slots_disponibles']} ({charla['porcentaje_ocupacion']}%)")
        print(f"  ✅ Disponible: {'Sí' if charla['disponible'] else 'No'}")

if __name__ == "__main__":
    main()