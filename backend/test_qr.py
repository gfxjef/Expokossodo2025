#!/usr/bin/env python3
"""
Test script para las funciones de generación QR
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import generar_texto_qr, generar_imagen_qr, validar_formato_qr

def test_generar_texto_qr():
    """Probar generación de texto QR"""
    print("🧪 PROBANDO GENERACIÓN DE TEXTO QR")
    print("-" * 50)
    
    # Caso 1: Datos normales
    texto1 = generar_texto_qr("Juan Carlos", "12345678", "Director", "TechCorp")
    print(f"Caso 1: {texto1}")
    
    # Caso 2: Nombre con caracteres especiales
    texto2 = generar_texto_qr("María José Ñoña", "87654321", "CEO & Founder", "Empresa|Pipe")
    print(f"Caso 2: {texto2}")
    
    # Caso 3: Nombre muy corto
    texto3 = generar_texto_qr("Al", "11111111", "Dev", "StartupXYZ")
    print(f"Caso 3: {texto3}")
    
    return [texto1, texto2, texto3]

def test_validar_formato_qr(textos_qr):
    """Probar validación de formato QR"""
    print("\n🧪 PROBANDO VALIDACIÓN DE FORMATO QR")
    print("-" * 50)
    
    for i, texto in enumerate(textos_qr, 1):
        resultado = validar_formato_qr(texto)
        print(f"Caso {i}: {resultado['valid']}")
        if resultado['valid']:
            print(f"  Parsed: {resultado['parsed']}")
        else:
            print(f"  Error en validación")
    
    # Caso inválido
    resultado_invalido = validar_formato_qr("TEXTO_INVALIDO")
    print(f"Caso inválido: {resultado_invalido['valid']}")

def test_generar_imagen_qr(texto_qr):
    """Probar generación de imagen QR"""
    print("\n🧪 PROBANDO GENERACIÓN DE IMAGEN QR")
    print("-" * 50)
    
    imagen_bytes = generar_imagen_qr(texto_qr)
    
    if imagen_bytes:
        print(f"✅ Imagen generada: {len(imagen_bytes)} bytes")
        
        # Guardar imagen de prueba
        with open("test_qr_image.png", "wb") as f:
            f.write(imagen_bytes)
        print("✅ Imagen guardada como 'test_qr_image.png'")
        
        return True
    else:
        print("❌ Error generando imagen")
        return False

if __name__ == "__main__":
    print("🚀 INICIANDO TESTS DE FUNCIONES QR")
    print("=" * 60)
    
    try:
        # Test 1: Generación de texto
        textos_qr = test_generar_texto_qr()
        
        # Test 2: Validación
        test_validar_formato_qr(textos_qr)
        
        # Test 3: Generación de imagen
        if textos_qr:
            test_generar_imagen_qr(textos_qr[0])
        
        print("\n✅ TODOS LOS TESTS COMPLETADOS")
        
    except Exception as e:
        print(f"\n❌ ERROR EN TESTS: {e}")
        import traceback
        traceback.print_exc() 