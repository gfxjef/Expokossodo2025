#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de prueba para verificar la función prepare_text_for_thermal_printer()
"""

import unicodedata
import re

def prepare_text_for_thermal_printer(text):
    """Prepara texto completamente para impresora térmica ASCII
    
    Maneja:
    - Tildes/acentos: á,é,í,ó,ú → a,e,i,o,u
    - Eñes: ñ,Ñ → n,N  
    - Símbolos especiales: &,@,¿,¡ → equivalentes ASCII
    - Filtra caracteres no-ASCII
    - Limita longitud a 15 caracteres
    """
    if not text:
        return "INVITADO"
    
    # 1. Normalizar tildes/acentos (NFD)
    normalized = unicodedata.normalize('NFD', text)
    no_accents = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    
    # 2. Mapeo manual para caracteres que NFD no maneja
    replacements = {
        'ñ': 'n', 'Ñ': 'N',           # Eñes
        '&': 'y', '@': 'at',           # Símbolos comunes
        '¿': '', '¡': '',              # Signos de pregunta/exclamación
        '°': 'deg', '²': '2', '³': '3', # Símbolos matemáticos
    }
    
    result = no_accents
    for special, replacement in replacements.items():
        result = result.replace(special, replacement)
    
    # 3. Remover cualquier carácter que no sea ASCII básico (32-126)
    result = re.sub(r'[^\x20-\x7E]', '', result)
    
    # 4. Limpiar espacios múltiples
    result = ' '.join(result.split())
    
    return result[:15]  # Limitar longitud

def test_normalizacion():
    """Ejecutar casos de prueba"""
    
    casos_prueba = [
        ("Eliana Peña Herrera", "Eliana Pena He"),
        ("José María García", "Jose Maria Ga"),
        ("Dr. López & Cía.", "Dr. Lopez y Ci"),
        ("María José 100%", "Maria Jose 100"),
        ("¿Quién es él?", "Quien es el?"),
        ("Niño²³ °C", "Nino23 degC"),
        ("", "INVITADO"),
        (None, "INVITADO"),
        ("A" * 20, "A" * 15),  # Test límite
    ]
    
    print("=== PRUEBAS DE NORMALIZACIÓN ===\n")
    
    for i, (entrada, esperado) in enumerate(casos_prueba, 1):
        resultado = prepare_text_for_thermal_printer(entrada)
        
        # Verificar que se puede codificar en ASCII
        try:
            resultado.encode('ascii')
            ascii_ok = "OK ASCII"
        except UnicodeEncodeError:
            ascii_ok = "NO ASCII"
        
        status = "PASS" if resultado == esperado else "FAIL"
        
        print(f"Caso {i}: {status}")
        print(f"  Entrada:   '{entrada}'")
        print(f"  Resultado: '{resultado}' {ascii_ok}")
        print(f"  Esperado:  '{esperado}'")
        if resultado != esperado:
            print(f"  WARNING: DIFERENCIA DETECTADA")
        print()

if __name__ == "__main__":
    test_normalizacion()