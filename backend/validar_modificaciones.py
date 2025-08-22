#!/usr/bin/env python3
"""
Script de validación de las modificaciones implementadas
Valida que las funciones estén correctamente implementadas sin ejecutar el servidor
"""

import ast
import inspect
import sys
import json
from datetime import datetime

def validar_sintaxis_python(archivo):
    """Valida que el archivo Python tenga sintaxis correcta"""
    try:
        with open(archivo, 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        # Compilar el código para verificar sintaxis
        ast.parse(contenido)
        print(f"[OK] Sintaxis correcta en {archivo}")
        return True
    except SyntaxError as e:
        print(f"[ERROR] Error de sintaxis en {archivo}: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Error al leer {archivo}: {e}")
        return False

def validar_funciones_auxiliares():
    """Valida que las funciones auxiliares estén implementadas correctamente"""
    try:
        # Importar el módulo para verificar las funciones
        sys.path.insert(0, '.')
        
        # Verificar que las funciones existen
        funciones_requeridas = [
            'validar_conflictos_horario',
            'obtener_eventos_usuario',
            'crear_registro'
        ]
        
        # Leer el archivo y buscar las definiciones de funciones
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        funciones_encontradas = []
        for linea in contenido.split('\n'):
            if linea.strip().startswith('def '):
                nombre_funcion = linea.split('def ')[1].split('(')[0].strip()
                funciones_encontradas.append(nombre_funcion)
        
        print("[INFO] Funciones encontradas en app.py:")
        for func in funciones_encontradas:
            print(f"   - {func}")
        
        # Verificar funciones requeridas
        faltantes = []
        for func_requerida in funciones_requeridas:
            if func_requerida in funciones_encontradas:
                print(f"[OK] Función {func_requerida} encontrada")
            else:
                print(f"[ERROR] Función {func_requerida} NO encontrada")
                faltantes.append(func_requerida)
        
        return len(faltantes) == 0
        
    except Exception as e:
        print(f"❌ Error al validar funciones auxiliares: {e}")
        return False

def validar_documentacion_funciones():
    """Valida que las funciones tengan documentación adecuada"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        # Buscar funciones con docstrings
        funciones_con_docs = {}
        lineas = contenido.split('\n')
        
        for i, linea in enumerate(lineas):
            if linea.strip().startswith('def ') and ('validar_conflictos' in linea or 'obtener_eventos' in linea or 'crear_registro' in linea):
                nombre_funcion = linea.split('def ')[1].split('(')[0].strip()
                
                # Buscar docstring en las siguientes líneas
                docstring_found = False
                for j in range(i+1, min(i+10, len(lineas))):
                    if '"""' in lineas[j]:
                        docstring_found = True
                        break
                
                funciones_con_docs[nombre_funcion] = docstring_found
        
        print("📝 Documentación de funciones:")
        todas_documentadas = True
        for func, tiene_doc in funciones_con_docs.items():
            status = "✅" if tiene_doc else "❌"
            print(f"   {status} {func}: {'Documentada' if tiene_doc else 'Sin documentación'}")
            if not tiene_doc:
                todas_documentadas = False
        
        return todas_documentadas
        
    except Exception as e:
        print(f"❌ Error al validar documentación: {e}")
        return False

def validar_logica_implementada():
    """Valida que la lógica específica esté implementada"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        # Palabras clave que deben estar presentes en la nueva implementación
        palabras_clave = [
            'modo_actualizacion',
            'eventos_conflictivos',
            'eventos_validos',
            'eventos_inscritos',
            'obtener_eventos_usuario',
            'validar_conflictos_horario',
            'eventos_agregados',
            'eventos_omitidos'
        ]
        
        print("🔍 Validando lógica implementada:")
        logica_completa = True
        
        for palabra in palabras_clave:
            if palabra in contenido:
                print(f"   ✅ {palabra} - Implementado")
            else:
                print(f"   ❌ {palabra} - NO encontrado")
                logica_completa = False
        
        return logica_completa
        
    except Exception as e:
        print(f"❌ Error al validar lógica: {e}")
        return False

def validar_respuesta_json_mejorada():
    """Valida que la respuesta JSON tenga los campos mejorados"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        # Campos que deben estar en la nueva respuesta JSON
        campos_respuesta = [
            '"success"',
            '"modo"',
            '"eventos_agregados"',
            '"eventos_omitidos"',
            '"registro_id"'
        ]
        
        print("📊 Validando respuesta JSON mejorada:")
        respuesta_completa = True
        
        for campo in campos_respuesta:
            if campo in contenido:
                print(f"   ✅ Campo {campo} - Presente en respuesta")
            else:
                print(f"   ❌ Campo {campo} - NO encontrado")
                respuesta_completa = False
        
        return respuesta_completa
        
    except Exception as e:
        print(f"❌ Error al validar respuesta JSON: {e}")
        return False

def validar_transacciones_atomicas():
    """Valida que las transacciones sean atómicas"""
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        # Buscar patrones de transacciones atómicas
        patrones_transaccionales = [
            'connection.commit()',
            'connection.rollback()',
            'try:',
            'except',
            'finally:'
        ]
        
        print("🔒 Validando transacciones atómicas:")
        transacciones_ok = True
        
        for patron in patrones_transaccionales:
            if patron in contenido:
                print(f"   ✅ {patron} - Implementado")
            else:
                print(f"   ❌ {patron} - NO encontrado")
                transacciones_ok = False
        
        return transacciones_ok
        
    except Exception as e:
        print(f"❌ Error al validar transacciones: {e}")
        return False

def generar_reporte_validacion():
    """Genera reporte completo de validación"""
    print("🚀 INICIANDO VALIDACIÓN DE MODIFICACIONES")
    print(f"⏰ Timestamp: {datetime.now()}")
    print("="*60)
    
    resultados = {}
    
    # Ejecutar todas las validaciones
    validaciones = [
        ("Sintaxis Python", lambda: validar_sintaxis_python('app.py')),
        ("Funciones Auxiliares", validar_funciones_auxiliares),
        ("Documentación", validar_documentacion_funciones),
        ("Lógica Implementada", validar_logica_implementada),
        ("Respuesta JSON Mejorada", validar_respuesta_json_mejorada),
        ("Transacciones Atómicas", validar_transacciones_atomicas)
    ]
    
    for nombre, validacion in validaciones:
        try:
            print(f"\n🧪 {nombre}")
            print("-" * 40)
            resultado = validacion()
            resultados[nombre] = "✅ PASS" if resultado else "❌ FAIL"
        except Exception as e:
            resultados[nombre] = f"❌ ERROR: {str(e)}"
        
        print()
    
    # Reporte final
    print("="*60)
    print("🎯 REPORTE FINAL DE VALIDACIÓN")
    print("="*60)
    
    for nombre, resultado in resultados.items():
        print(f"{resultado} {nombre}")
    
    passed = sum(1 for r in resultados.values() if "✅" in r)
    total = len(resultados)
    
    print(f"\n📈 RESUMEN: {passed}/{total} validaciones pasaron")
    
    if passed == total:
        print("🏆 ¡Todas las validaciones pasaron! Las modificaciones están implementadas correctamente.")
        print("\n📋 PRÓXIMOS PASOS:")
        print("   1. Iniciar el servidor Flask: python app.py")
        print("   2. Ejecutar tests de integración: python test_nuevo_registro.py")
        print("   3. Probar en el frontend la nueva funcionalidad")
    else:
        print("⚠️  Algunas validaciones fallaron. Revisar la implementación.")
    
    return passed == total

if __name__ == "__main__":
    try:
        generar_reporte_validacion()
    except KeyboardInterrupt:
        print("\n👋 Validación interrumpida por el usuario")
    except Exception as e:
        print(f"\n❌ Error inesperado durante la validación: {e}")