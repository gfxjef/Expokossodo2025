#!/usr/bin/env python3
"""
Script de corrección para los problemas identificados en el testing del sistema de registro
"""

import mysql.connector
from dotenv import load_dotenv
import os
import json

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def check_data_integrity():
    """Verificar integridad entre eventos_seleccionados JSON y relaciones"""
    print("[CHECK] Verificando integridad de datos...")
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        # Obtener todos los registros
        cursor.execute("""
            SELECT id, correo, eventos_seleccionados 
            FROM expokossodo_registros
        """)
        registros = cursor.fetchall()
        
        inconsistencias = []
        
        for registro in registros:
            registro_id = registro['id']
            eventos_json = json.loads(registro['eventos_seleccionados'] or '[]')
            
            # Obtener eventos de la tabla de relaciones
            cursor.execute("""
                SELECT evento_id FROM expokossodo_registro_eventos 
                WHERE registro_id = %s
            """, (registro_id,))
            eventos_relaciones = [row['evento_id'] for row in cursor.fetchall()]
            
            # Comparar
            eventos_json_set = set(eventos_json)
            eventos_relaciones_set = set(eventos_relaciones)
            
            if eventos_json_set != eventos_relaciones_set:
                inconsistencias.append({
                    'registro_id': registro_id,
                    'correo': registro['correo'],
                    'json_eventos': eventos_json,
                    'relacion_eventos': eventos_relaciones,
                    'solo_en_json': list(eventos_json_set - eventos_relaciones_set),
                    'solo_en_relaciones': list(eventos_relaciones_set - eventos_json_set)
                })
        
        print(f"[RESULT] Encontradas {len(inconsistencias)} inconsistencias")
        
        for inc in inconsistencias:
            print(f"  Registro {inc['registro_id']} ({inc['correo']}):")
            print(f"    JSON: {inc['json_eventos']}")
            print(f"    Relaciones: {inc['relacion_eventos']}")
            if inc['solo_en_json']:
                print(f"    Solo en JSON: {inc['solo_en_json']}")
            if inc['solo_en_relaciones']:
                print(f"    Solo en relaciones: {inc['solo_en_relaciones']}")
        
        cursor.close()
        conn.close()
        
        return inconsistencias
        
    except Exception as e:
        print(f"[ERROR] Error verificando integridad: {e}")
        return []

def fix_data_integrity():
    """Corregir inconsistencias de datos"""
    print("[FIX] Iniciando corrección de inconsistencias...")
    
    inconsistencias = check_data_integrity()
    
    if not inconsistencias:
        print("[OK] No hay inconsistencias para corregir")
        return
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        for inc in inconsistencias:
            registro_id = inc['registro_id']
            
            # Usar las relaciones como fuente de verdad
            eventos_correctos = inc['relacion_eventos']
            
            # Actualizar el JSON
            cursor.execute("""
                UPDATE expokossodo_registros 
                SET eventos_seleccionados = %s
                WHERE id = %s
            """, (json.dumps(eventos_correctos), registro_id))
            
            print(f"[FIX] Corregido registro {registro_id}: {eventos_correctos}")
        
        conn.commit()
        print(f"[OK] Corregidas {len(inconsistencias)} inconsistencias")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"[ERROR] Error corrigiendo inconsistencias: {e}")

def analyze_event_schedule():
    """Analizar horarios de eventos para identificar conflictos potenciales"""
    print("[ANALYZE] Analizando horarios de eventos...")
    
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, fecha, hora, sala, titulo_charla, disponible
            FROM expokossodo_eventos
            ORDER BY fecha, hora, sala
        """)
        eventos = cursor.fetchall()
        
        # Agrupar por horario
        horarios = {}
        for evento in eventos:
            key = f"{evento['fecha']} {evento['hora']}"
            if key not in horarios:
                horarios[key] = []
            horarios[key].append(evento)
        
        print(f"[INFO] Total de eventos: {len(eventos)}")
        print(f"[INFO] Horarios únicos: {len(horarios)}")
        
        # Identificar horarios con múltiples eventos
        conflictos = {k: v for k, v in horarios.items() if len(v) > 1}
        
        if conflictos:
            print(f"[WARN] Horarios con múltiples eventos: {len(conflictos)}")
            for horario, eventos_conflicto in list(conflictos.items())[:5]:  # Solo mostrar 5
                print(f"  {horario}:")
                for evento in eventos_conflicto:
                    print(f"    - {evento['id']}: {evento['titulo_charla']} (Sala: {evento['sala']})")
        else:
            print("[OK] No hay conflictos de horario entre eventos")
        
        # Eventos disponibles por horario para testing
        eventos_sin_conflicto = []
        for horario, eventos_grupo in horarios.items():
            if len(eventos_grupo) == 1 and eventos_grupo[0]['disponible']:
                eventos_sin_conflicto.append(eventos_grupo[0])
        
        print(f"[INFO] Eventos sin conflicto disponibles para testing: {len(eventos_sin_conflicto)}")
        
        cursor.close()
        conn.close()
        
        return eventos_sin_conflicto[:10]  # Retornar 10 para testing
        
    except Exception as e:
        print(f"[ERROR] Error analizando horarios: {e}")
        return []

def generate_test_data_suggestions():
    """Generar sugerencias de datos para testing mejorado"""
    print("[SUGGEST] Generando sugerencias para testing...")
    
    eventos_limpios = analyze_event_schedule()
    
    if len(eventos_limpios) < 6:
        print("[WARN] Insuficientes eventos sin conflicto para testing completo")
        print(f"[INFO] Eventos disponibles: {len(eventos_limpios)}")
        return
    
    # Sugerir configuración de testing
    print("\n[SUGGEST] Configuración recomendada para testing:")
    print("```python")
    print("# Eventos recomendados para testing (sin conflictos de horario)")
    print("TEST_EVENTS = [")
    
    for i, evento in enumerate(eventos_limpios[:6]):
        print(f"    {evento['id']},  # {evento['titulo_charla'][:50]}... ({evento['fecha']} {evento['hora']})")
    
    print("]")
    print("```")
    
    print("\n[SUGGEST] Casos de prueba sugeridos:")
    print("- Caso 1 (Usuario nuevo): eventos [0, 1, 2] de la lista")
    print("- Caso 2 (Sin conflictos): eventos [3, 4] agregados a usuario existente")
    print("- Caso 3 (Conflictos parciales): evento [0] (ya tiene) + evento [5] (nuevo)")
    print("- Caso 4 (Todos conflictos): todos los eventos que ya tiene")

def main():
    """Función principal"""
    print("ExpoKossodo 2025 - Fix Sistema de Registro")
    print("=" * 50)
    
    # 1. Verificar integridad de datos
    inconsistencias = check_data_integrity()
    
    if inconsistencias:
        respuesta = input("\n¿Deseas corregir las inconsistencias automáticamente? (y/n): ")
        if respuesta.lower() == 'y':
            fix_data_integrity()
    
    # 2. Analizar horarios de eventos
    print("\n" + "=" * 50)
    eventos_testing = analyze_event_schedule()
    
    # 3. Generar sugerencias
    print("\n" + "=" * 50)
    generate_test_data_suggestions()
    
    print("\n[INFO] Análisis completo. Revisa las recomendaciones antes de re-ejecutar tests.")

if __name__ == "__main__":
    main()