#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test simplificado para analizar fechas en /verificarSala
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_endpoint():
    try:
        print("=" * 60)
        print("TEST: /verificar-sala/eventos")
        print("=" * 60)
        
        response = requests.get(f"{BASE_URL}/verificar-sala/eventos")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            eventos = data.get('eventos', [])
            
            print(f"Total eventos: {len(eventos)}")
            
            # Obtener fechas únicas
            fechas = list(set(evento.get('fecha') for evento in eventos if evento.get('fecha')))
            fechas.sort()
            
            print("\nFECHAS DEL BACKEND:")
            print("-" * 40)
            for i, fecha in enumerate(fechas, 1):
                print(f"{i}. '{fecha}'")
            
            print("\nEJEMPLOS DE EVENTOS:")
            print("-" * 40)
            for i, evento in enumerate(eventos[:3], 1):
                print(f"{i}. ID:{evento.get('id')} - '{evento.get('fecha')}' - {evento.get('titulo_charla', '')[:30]}...")
            
            return fechas
        else:
            print(f"Error HTTP: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("ANALISIS DE FECHAS - Filtrar por Fecha")
    print("")
    
    fechas = test_endpoint()
    
    if fechas:
        print(f"\n[RESULTADO] Encontradas {len(fechas)} fechas unicas:")
        for fecha in fechas:
            print(f"  - {fecha}")
    else:
        print("\n[ERROR] No se pudieron obtener fechas")