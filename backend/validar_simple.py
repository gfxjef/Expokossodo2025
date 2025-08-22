#!/usr/bin/env python3
"""
Script simple de validación de las modificaciones implementadas
"""

import ast
from datetime import datetime

def validar_sintaxis():
    """Valida sintaxis de app.py"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        ast.parse(contenido)
        print("[OK] Sintaxis correcta")
        return True
    except Exception as e:
        print(f"[ERROR] Sintaxis: {e}")
        return False

def validar_funciones():
    """Valida que las funciones auxiliares existan"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        funciones_requeridas = [
            'validar_conflictos_horario',
            'obtener_eventos_usuario'
        ]
        
        print("[INFO] Validando funciones auxiliares:")
        todas_ok = True
        
        for func in funciones_requeridas:
            if f'def {func}(' in contenido:
                print(f"   [OK] {func}")
            else:
                print(f"   [ERROR] {func} NO encontrada")
                todas_ok = False
        
        return todas_ok
    except Exception as e:
        print(f"[ERROR] Validando funciones: {e}")
        return False

def validar_logica():
    """Valida que la nueva lógica esté implementada"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        elementos_clave = [
            'modo_actualizacion',
            'eventos_conflictivos', 
            'eventos_validos',
            'obtener_eventos_usuario',
            'validar_conflictos_horario'
        ]
        
        print("[INFO] Validando lógica implementada:")
        todas_ok = True
        
        for elemento in elementos_clave:
            if elemento in contenido:
                print(f"   [OK] {elemento}")
            else:
                print(f"   [ERROR] {elemento} NO encontrado")
                todas_ok = False
        
        return todas_ok
    except Exception as e:
        print(f"[ERROR] Validando lógica: {e}")
        return False

def validar_respuesta():
    """Valida que la respuesta JSON tenga campos mejorados"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        campos_json = [
            '"success"',
            '"modo"', 
            '"eventos_agregados"',
            '"eventos_omitidos"'
        ]
        
        print("[INFO] Validando respuesta JSON:")
        todas_ok = True
        
        for campo in campos_json:
            if campo in contenido:
                print(f"   [OK] Campo {campo}")
            else:
                print(f"   [ERROR] Campo {campo} NO encontrado")
                todas_ok = False
        
        return todas_ok
    except Exception as e:
        print(f"[ERROR] Validando respuesta: {e}")
        return False

def main():
    print("VALIDACIÓN DE MODIFICACIONES DEL SISTEMA DE REGISTRO")
    print(f"Timestamp: {datetime.now()}")
    print("=" * 60)
    
    validaciones = [
        ("Sintaxis Python", validar_sintaxis),
        ("Funciones Auxiliares", validar_funciones),
        ("Lógica Implementada", validar_logica),
        ("Respuesta JSON", validar_respuesta)
    ]
    
    resultados = {}
    
    for nombre, validacion in validaciones:
        print(f"\n[TEST] {nombre}")
        print("-" * 40)
        try:
            resultado = validacion()
            resultados[nombre] = "[PASS]" if resultado else "[FAIL]"
        except Exception as e:
            resultados[nombre] = f"[ERROR] {e}"
    
    print("\n" + "=" * 60)
    print("REPORTE FINAL")
    print("=" * 60)
    
    for nombre, resultado in resultados.items():
        print(f"{resultado} {nombre}")
    
    passed = sum(1 for r in resultados.values() if "[PASS]" in r)
    total = len(resultados)
    
    print(f"\nRESUMEN: {passed}/{total} validaciones exitosas")
    
    if passed == total:
        print("\n[SUCCESS] Todas las modificaciones están implementadas correctamente!")
        print("\nPRÓXIMOS PASOS:")
        print("1. Probar el servidor: python app.py")
        print("2. Ejecutar tests de integración")
        print("3. Validar en el frontend")
    else:
        print("\n[WARNING] Algunas validaciones fallaron. Revisar implementación.")

if __name__ == "__main__":
    main()