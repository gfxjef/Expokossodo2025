#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reporte detallado de registros por sala
ExpoKossodo 2025 - Lista completa de participantes por sala
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

def obtener_registros_por_sala():
    """Obtiene todos los registros organizados por sala"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Query principal para obtener registros con información completa
        query = """
        SELECT 
            -- Información del evento
            e.id as evento_id,
            e.sala,
            e.fecha,
            e.hora,
            e.titulo_charla,
            e.expositor,
            e.pais as pais_expositor,
            e.slots_disponibles,
            
            -- Información del participante
            r.id as registro_id,
            r.nombres,
            r.correo,
            r.empresa,
            r.cargo,
            r.numero,
            r.expectativas,
            r.fecha_registro,
            r.confirmado,
            
            -- Información de la relación
            re.fecha_seleccion
            
        FROM expokossodo_eventos e
        INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
        INNER JOIN expokossodo_registros r ON re.registro_id = r.id
        
        WHERE e.disponible = TRUE
        
        ORDER BY 
            e.sala, 
            e.fecha, 
            e.hora, 
            e.titulo_charla,
            r.nombres
        """
        
        cursor.execute(query)
        registros = cursor.fetchall()
        
        # Convertir datetime a string para serialización
        for registro in registros:
            if registro['fecha']:
                registro['fecha'] = registro['fecha'].strftime('%Y-%m-%d')
            if registro['hora']:
                registro['hora'] = str(registro['hora'])
            if registro['fecha_registro']:
                registro['fecha_registro'] = registro['fecha_registro'].strftime('%Y-%m-%d %H:%M:%S')
            if registro['fecha_seleccion']:
                registro['fecha_seleccion'] = registro['fecha_seleccion'].strftime('%Y-%m-%d %H:%M:%S')
        
        return registros
        
    except mysql.connector.Error as e:
        print(f"Error ejecutando consulta: {e}")
        return None
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def organizar_por_sala(registros):
    """Organiza los registros por sala para mejor visualización"""
    if not registros:
        return {}
    
    por_sala = {}
    
    for registro in registros:
        sala = registro['sala']
        if sala not in por_sala:
            por_sala[sala] = {}
        
        fecha_hora = f"{registro['fecha']} {registro['hora']}"
        charla_key = f"{fecha_hora} - {registro['titulo_charla']}"
        
        if charla_key not in por_sala[sala]:
            por_sala[sala][charla_key] = {
                'info_charla': {
                    'evento_id': registro['evento_id'],
                    'titulo': registro['titulo_charla'],
                    'expositor': registro['expositor'],
                    'fecha': registro['fecha'],
                    'hora': registro['hora'],
                    'pais_expositor': registro['pais_expositor'],
                    'slots_disponibles': registro['slots_disponibles']
                },
                'participantes': []
            }
        
        por_sala[sala][charla_key]['participantes'].append({
            'registro_id': registro['registro_id'],
            'nombres': registro['nombres'],
            'correo': registro['correo'],
            'empresa': registro['empresa'],
            'cargo': registro['cargo'],
            'numero': registro['numero'],
            'expectativas': registro['expectativas'],
            'fecha_registro': registro['fecha_registro'],
            'confirmado': registro['confirmado'],
            'fecha_seleccion': registro['fecha_seleccion']
        })
    
    return por_sala

def generar_resumen_estadistico(registros, por_sala):
    """Genera resumen estadístico del reporte"""
    total_registros = len(registros)
    total_charlas_con_registros = 0
    total_salas = len(por_sala)
    
    # Contar charlas únicas con registros
    charlas_unicas = set()
    for registro in registros:
        charla_key = f"{registro['evento_id']}"
        charlas_unicas.add(charla_key)
    
    total_charlas_con_registros = len(charlas_unicas)
    
    # Estadísticas por sala
    stats_por_sala = {}
    for sala, charlas in por_sala.items():
        total_participantes_sala = 0
        total_charlas_sala = len(charlas)
        
        for charla_info in charlas.values():
            total_participantes_sala += len(charla_info['participantes'])
        
        stats_por_sala[sala] = {
            'total_charlas': total_charlas_sala,
            'total_participantes': total_participantes_sala,
            'promedio_por_charla': round(total_participantes_sala / total_charlas_sala if total_charlas_sala > 0 else 0, 2)
        }
    
    return {
        'timestamp': datetime.now().isoformat(),
        'totales': {
            'total_registros': total_registros,
            'total_charlas_con_registros': total_charlas_con_registros,
            'total_salas': total_salas,
            'promedio_participantes_por_charla': round(total_registros / total_charlas_con_registros if total_charlas_con_registros > 0 else 0, 2)
        },
        'estadisticas_por_sala': stats_por_sala
    }

def exportar_csv(registros, filename_base):
    """Exporta los datos a CSV"""
    csv_filename = f'{filename_base}.csv'
    
    with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Headers
        writer.writerow([
            'Sala', 'Fecha', 'Hora', 'Título Charla', 'Expositor', 'País Expositor',
            'Nombre Participante', 'Correo', 'Empresa', 'Cargo', 'Teléfono',
            'Expectativas', 'Fecha Registro', 'Confirmado'
        ])
        
        # Data
        for registro in registros:
            writer.writerow([
                registro['sala'],
                registro['fecha'],
                registro['hora'],
                registro['titulo_charla'],
                registro['expositor'],
                registro['pais_expositor'],
                registro['nombres'],
                registro['correo'],
                registro['empresa'],
                registro['cargo'],
                registro['numero'],
                registro['expectativas'] or '',
                registro['fecha_registro'],
                'Sí' if registro['confirmado'] else 'No'
            ])
    
    return csv_filename

def exportar_csv_por_sala(por_sala, filename_base):
    """Exporta un archivo CSV por cada sala"""
    archivos_generados = []
    
    for sala, charlas in por_sala.items():
        csv_filename = f'{filename_base}_sala_{sala}.csv'
        
        with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Headers
            writer.writerow([
                'Fecha', 'Hora', 'Título Charla', 'Expositor', 'País Expositor',
                'Nombre Participante', 'Correo', 'Empresa', 'Cargo', 'Teléfono',
                'Expectativas', 'Fecha Registro'
            ])
            
            # Data por charla
            for charla_key, charla_info in charlas.items():
                info = charla_info['info_charla']
                for participante in charla_info['participantes']:
                    writer.writerow([
                        info['fecha'],
                        info['hora'],
                        info['titulo'],
                        info['expositor'],
                        info['pais_expositor'],
                        participante['nombres'],
                        participante['correo'],
                        participante['empresa'],
                        participante['cargo'],
                        participante['numero'],
                        participante['expectativas'] or '',
                        participante['fecha_registro']
                    ])
        
        archivos_generados.append(csv_filename)
    
    return archivos_generados

def mostrar_reporte_consola(por_sala, resumen):
    """Muestra el reporte organizado en consola"""
    print("=" * 80)
    print("REPORTE DETALLADO DE REGISTROS POR SALA")
    print("ExpoKossodo 2025")
    print("=" * 80)
    
    # Mostrar resumen
    totales = resumen['totales']
    print(f"\nRESUMEN GENERAL:")
    print(f"- Total de registros: {totales['total_registros']}")
    print(f"- Charlas con registros: {totales['total_charlas_con_registros']}")
    print(f"- Salas activas: {totales['total_salas']}")
    print(f"- Promedio participantes por charla: {totales['promedio_participantes_por_charla']}")
    
    print(f"\nESTADISTICAS POR SALA:")
    for sala, stats in resumen['estadisticas_por_sala'].items():
        print(f"  {sala.upper()}: {stats['total_charlas']} charlas, {stats['total_participantes']} participantes (promedio: {stats['promedio_por_charla']})")
    
    # Mostrar detalle por sala
    for sala, charlas in por_sala.items():
        print(f"\n" + "=" * 60)
        print(f"SALA: {sala.upper()}")
        print("=" * 60)
        
        for charla_key, charla_info in charlas.items():
            info = charla_info['info_charla']
            participantes = charla_info['participantes']
            
            print(f"\n[{info['fecha']} - {info['hora']}]")
            print(f"CHARLA: {info['titulo']}")
            print(f"EXPOSITOR: {info['expositor']} ({info['pais_expositor']})")
            print(f"PARTICIPANTES REGISTRADOS: {len(participantes)}/{info['slots_disponibles']}")
            print("-" * 50)
            
            for i, p in enumerate(participantes, 1):
                print(f"{i:2d}. {p['nombres']}")
                print(f"    Empresa: {p['empresa']}")
                print(f"    Cargo: {p['cargo']}")
                print(f"    Correo: {p['correo']}")
                print(f"    Teléfono: {p['numero']}")
                if p['expectativas']:
                    print(f"    Expectativas: {p['expectativas'][:100]}{'...' if len(p['expectativas']) > 100 else ''}")
                print()

def main():
    """Función principal"""
    print("Generando reporte detallado de registros por sala...")
    
    # Obtener datos
    registros = obtener_registros_por_sala()
    if not registros:
        print("ERROR: No se pudieron obtener los registros")
        return
    
    print(f"[OK] Se encontraron {len(registros)} registros individuales")
    
    # Organizar por sala
    por_sala = organizar_por_sala(registros)
    
    # Generar resumen
    resumen = generar_resumen_estadistico(registros, por_sala)
    
    # Timestamp para archivos
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename_base = f'registros_por_sala_{timestamp}'
    
    # Exportar archivos
    print("\n[INFO] Exportando archivos...")
    
    # CSV general
    csv_general = exportar_csv(registros, filename_base)
    print(f"[OK] CSV general: {csv_general}")
    
    # CSV por sala
    csvs_por_sala = exportar_csv_por_sala(por_sala, filename_base)
    print(f"[OK] CSVs por sala generados: {len(csvs_por_sala)} archivos")
    
    # JSON completo
    json_filename = f'{filename_base}.json'
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump({
            'resumen': resumen,
            'registros_individuales': registros,
            'organizacion_por_sala': por_sala
        }, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON completo: {json_filename}")
    
    # Mostrar en consola
    print("\n¿Mostrar reporte detallado en consola? (s/n): ", end="")
    if input().lower() == 's':
        mostrar_reporte_consola(por_sala, resumen)
    
    print(f"\n[COMPLETADO] Archivos generados:")
    print(f"  - CSV general: {csv_general}")
    print(f"  - JSON completo: {json_filename}")
    print(f"  - CSVs por sala: {len(csvs_por_sala)} archivos")
    for csv_sala in csvs_por_sala:
        print(f"    * {csv_sala}")

if __name__ == "__main__":
    main()