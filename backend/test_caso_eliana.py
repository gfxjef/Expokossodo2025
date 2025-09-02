#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prueba específica del caso que causaba el error: Eliana Peña Herrera
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Función copiada para evitar dependencias de app.py
import unicodedata
import re

def prepare_text_for_thermal_printer(text):
    """Prepara texto completamente para impresora térmica ASCII"""
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

def test_caso_eliana():
    """Probar el caso específico que causaba el error"""
    
    # Datos del caso problema
    nombre_original = "Eliana Peña Herrera"
    qr_original = "eli51999594954estuna1756243244"
    
    print("=== PRUEBA CASO ELIANA PEÑA ===")
    print(f"Nombre original: '{nombre_original}'")
    print(f"QR original:     '{qr_original}'")
    print()
    
    # Normalizar nombre
    nombre_normalizado = prepare_text_for_thermal_printer(nombre_original)
    print(f"Nombre normalizado: '{nombre_normalizado}'")
    
    # Verificar ASCII
    try:
        nombre_normalizado.encode('ascii')
        print("OK - Nombre se puede codificar en ASCII")
    except UnicodeEncodeError as e:
        print(f"ERROR - Error ASCII en nombre: {e}")
        return False
    
    # Verificar QR
    try:
        qr_original.encode('ascii')
        print("OK - QR se puede codificar en ASCII")
    except UnicodeEncodeError as e:
        print(f"ERROR - Error ASCII en QR: {e}")
        return False
    
    # Simular la construcción del comando TSPL
    try:
        comando_tspl = f'TEXT 100,20,"3",0,1,1,"{nombre_normalizado}"\r\n'
        comando_tspl += f'QRCODE 70,70,M,10,A,0,"{qr_original}"\r\n'
        
        # Intentar codificar todo el comando
        comando_bytes = comando_tspl.encode('ascii')
        print("OK - Comando TSPL completo se puede codificar en ASCII")
        print(f"Comando generado: {len(comando_bytes)} bytes")
        print()
        print("COMANDOS TSPL GENERADOS:")
        print(comando_tspl)
        
        return True
        
    except UnicodeEncodeError as e:
        print(f"ERROR - Error ASCII en comando TSPL: {e}")
        return False

if __name__ == "__main__":
    exito = test_caso_eliana()
    print("\n" + "="*50)
    if exito:
        print("SUCCESS: El problema esta resuelto!")
    else:
        print("FAIL: Aun hay problemas de codificacion")