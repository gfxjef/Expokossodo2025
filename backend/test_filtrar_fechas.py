#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test para analizar el problema de fechas en "Filtrar por Fecha" de /verificarSala
Este script reproduce exactamente lo que hace el endpoint que alimenta esa funcionalidad.
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000/api"

def test_verificar_sala_eventos():
    """
    Probar el endpoint que usa la página /verificarSala para obtener eventos
    Este es el endpoint que alimenta la funcionalidad "Filtrar por Fecha"
    """
    print("=" * 80)
    print("[TEST] Endpoint /verificar-sala/eventos (Filtrar por Fecha)")
    print("=" * 80)
    
    try:
        # Este es el endpoint exacto que usa SelectorCharlas.js
        response = requests.get(f"{BASE_URL}/verificar-sala/eventos")
        
        print(f"📡 Request URL: {BASE_URL}/verificar-sala/eventos")
        print(f"📡 Status Code: {response.status_code}")
        print("")
        
        if response.status_code == 200:
            data = response.json()
            eventos = data.get('eventos', [])
            
            print(f"[OK] Respuesta exitosa:")
            print(f"   - Total eventos: {data.get('total_eventos', 0)}")
            print(f"   - Eventos en respuesta: {len(eventos)}")
            print("")
            
            # Obtener fechas únicas (exactamente como hace el frontend)
            fechas_unicas = list(set(evento.get('fecha') for evento in eventos if evento.get('fecha')))
            fechas_unicas.sort()
            
            print("[FECHAS] RAW DEL BACKEND (las que usa 'Filtrar por Fecha'):")
            print("-" * 60)
            for i, fecha in enumerate(fechas_unicas, 1):
                print(f"   {i}. '{fecha}' (tipo: {type(fecha).__name__})")
            print("")
            
            # Mostrar algunos eventos de ejemplo con sus fechas
            print("[EJEMPLOS] DE EVENTOS CON FECHAS:")
            print("-" * 60)
            for i, evento in enumerate(eventos[:5], 1):
                print(f"   {i}. ID {evento.get('id')} - Fecha: '{evento.get('fecha')}' - {evento.get('titulo_charla', 'Sin título')[:40]}...")
            
            print("")
            print("[ANALISIS] DE FORMATOS:")
            print("-" * 60)
            if fechas_unicas:
                primera_fecha = fechas_unicas[0]
                print(f"   - Primera fecha: '{primera_fecha}'")
                print(f"   - Formato detectado: {'ISO Date (YYYY-MM-DD)' if len(primera_fecha) == 10 and primera_fecha.count('-') == 2 else 'Formato desconocido'}")
                print(f"   - Ejemplo: {primera_fecha} -> Año: {primera_fecha[:4]}, Mes: {primera_fecha[5:7]}, Día: {primera_fecha[8:10]}")
            
            return fechas_unicas
            
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: No se puede conectar al servidor")
        print("   Asegúrate de que el backend esté ejecutándose en localhost:5000")
        print("   Comando: python app.py")
        return None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None

def test_javascript_conversion_simulation(fechas_backend):
    """
    Simular lo que hace JavaScript en el frontend con las fechas
    """
    print("")
    print("=" * 80)
    print("[SIMULACION] Conversión JavaScript (formatearFecha)")
    print("=" * 80)
    
    if not fechas_backend:
        print("[ERROR] No hay fechas del backend para procesar")
        return
    
    # Simular lo que hace JavaScript: new Date(fecha).toLocaleDateString('es-ES', {...})
    import locale
    from datetime import datetime
    
    print("[SIMULANDO] la función formatearFecha() de SelectorCharlas.js:")
    print("   const formatearFecha = (fecha) => {")
    print("     return new Date(fecha).toLocaleDateString('es-ES', {")
    print("       weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'")
    print("     });")
    print("   }")
    print("")
    
    print("[CONVERSIONES]:")
    print("-" * 60)
    
    for i, fecha_str in enumerate(fechas_backend[:3], 1):  # Solo primeras 3 fechas
        print(f"   {i}. Backend envía: '{fecha_str}'")
        
        try:
            # Simular el comportamiento de JavaScript new Date(fecha_str)
            # En Python usamos datetime.fromisoformat para simular
            fecha_obj = datetime.fromisoformat(fecha_str)
            
            print(f"      - Python datetime: {fecha_obj}")
            print(f"      - Año: {fecha_obj.year}, Mes: {fecha_obj.month}, Día: {fecha_obj.day}")
            
            # Formatear similar a JavaScript toLocaleDateString
            dias_semana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
            meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
            
            dia_semana = dias_semana[fecha_obj.weekday()]
            mes_nombre = meses[fecha_obj.month - 1]
            
            fecha_formateada = f"{dia_semana}, {fecha_obj.day} de {mes_nombre} de {fecha_obj.year}"
            print(f"      - Formato español: '{fecha_formateada}'")
            
        except Exception as e:
            print(f"      - ERROR en conversión: {e}")
        
        print("")

def main():
    print("[ANALISIS] DEL PROBLEMA: Filtrar por Fecha en /verificarSala")
    print("")
    print("Este script reproduce exactamente lo que hace la funcionalidad")
    print("'Filtrar por Fecha' para identificar donde se produce el desfase.")
    print("")
    
    # Verificar que el servidor esté activo
    try:
        response = requests.get(f"{BASE_URL}/eventos", timeout=5)
        print("[OK] Servidor backend activo")
    except:
        print("[ERROR] Servidor backend no responde")
        print("   Ejecuta: python app.py")
        return
    
    # Paso 1: Obtener datos del backend
    fechas_backend = test_verificar_sala_eventos()
    
    # Paso 2: Simular conversión JavaScript
    test_javascript_conversion_simulation(fechas_backend)
    
    print("")
    print("=" * 80)
    print("[RESUMEN] DEL ANÁLISIS")
    print("=" * 80)
    print("1. [OK] Verificamos las fechas RAW que envía el backend")
    print("2. [OK] Simulamos la conversión que hace JavaScript")
    print("3. [OK] Identificamos posibles puntos de fallo")
    print("")
    print("[PROXIMOS PASOS]:")
    print("   - Comparar estos resultados con lo que ves en el navegador")
    print("   - Si hay diferencias, el problema está en la zona horaria del navegador")
    print("   - Revisar configuración de zona horaria del sistema")

if __name__ == "__main__":
    main()