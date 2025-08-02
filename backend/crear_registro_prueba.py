#!/usr/bin/env python3
"""
Script para crear un registro de prueba con QR válido
"""

import sys
import os
import time

# Agregar el directorio backend al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import get_db_connection, generar_texto_qr

def crear_registro_prueba():
    """Crear un registro de prueba con QR válido"""
    print("🔧 Creando registro de prueba...")
    
    connection = get_db_connection()
    if not connection:
        print("❌ Error de conexión a la base de datos")
        return False
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Datos de prueba
        datos_prueba = {
            'nombres': 'Juan Pérez Test',
            'correo': 'juan.test@empresa.com',
            'empresa': 'Empresa Test',
            'cargo': 'Ingeniero',
            'numero': '12345678',
            'expectativas': 'Probar funcionalidad de confirmación'
        }
        
        # Generar QR
        qr_text = generar_texto_qr(
            datos_prueba['nombres'],
            datos_prueba['numero'],
            datos_prueba['cargo'],
            datos_prueba['empresa']
        )
        
        if not qr_text:
            print("❌ Error generando QR")
            return False
        
        print(f"📱 QR generado: {qr_text}")
        
        # Verificar si ya existe un registro con este correo
        cursor.execute("SELECT id FROM expokossodo_registros WHERE correo = %s", (datos_prueba['correo'],))
        if cursor.fetchone():
            print("⚠️ Ya existe un registro con este correo")
            return True
        
        # Insertar registro
        cursor.execute("""
            INSERT INTO expokossodo_registros 
            (nombres, correo, empresa, cargo, numero, expectativas, eventos_seleccionados, qr_code, qr_generado_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            datos_prueba['nombres'],
            datos_prueba['correo'],
            datos_prueba['empresa'],
            datos_prueba['cargo'],
            datos_prueba['numero'],
            datos_prueba['expectativas'],
            '[]',  # Sin eventos seleccionados para la prueba
            qr_text
        ))
        
        registro_id = cursor.lastrowid
        
        # Obtener algunos eventos para asignar
        cursor.execute("SELECT id FROM expokossodo_eventos LIMIT 2")
        eventos = cursor.fetchall()
        
        if eventos:
            # Asignar eventos al registro
            for evento in eventos:
                cursor.execute("""
                    INSERT INTO expokossodo_registro_eventos (registro_id, evento_id)
                    VALUES (%s, %s)
                """, (registro_id, evento['id']))
                
                # Actualizar slots ocupados
                cursor.execute("""
                    UPDATE expokossodo_eventos 
                    SET slots_ocupados = slots_ocupados + 1
                    WHERE id = %s
                """, (evento['id'],))
        
        connection.commit()
        
        print("✅ Registro de prueba creado exitosamente:")
        print(f"   🆔 ID: {registro_id}")
        print(f"   👤 Nombre: {datos_prueba['nombres']}")
        print(f"   📧 Email: {datos_prueba['correo']}")
        print(f"   🏢 Empresa: {datos_prueba['empresa']}")
        print(f"   📱 QR: {qr_text}")
        print(f"   📅 Eventos asignados: {len(eventos)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creando registro: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

def main():
    """Función principal"""
    print("🚀 Creando Registro de Prueba para Confirmación de Asistencia")
    print("=" * 60)
    
    if crear_registro_prueba():
        print("\n✅ Registro de prueba creado correctamente")
        print("💡 Ahora puedes usar este QR para probar la confirmación de asistencia")
    else:
        print("\n❌ Error creando registro de prueba")

if __name__ == "__main__":
    main() 