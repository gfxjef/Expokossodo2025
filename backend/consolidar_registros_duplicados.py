#!/usr/bin/env python3
"""
Script de Consolidación de Registros Duplicados por Número de Teléfono
ExpoKossodo 2025

Este script unifica registros duplicados que comparten el mismo número de teléfono,
manteniendo la integridad de datos y actualizando todas las relaciones.

Autor: Sistema de Gestión ExpoKossodo
Fecha: 2025-01-02
"""

import mysql.connector
from mysql.connector import Error
import json
import os
from datetime import datetime
from dotenv import load_dotenv
import sys

# Cargar variables de entorno
load_dotenv()

# Configuración de base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}

class ConsolidadorRegistros:
    def __init__(self, dry_run=True):
        """
        Inicializa el consolidador
        
        Args:
            dry_run (bool): Si es True, solo simula los cambios sin aplicarlos
        """
        self.dry_run = dry_run
        self.connection = None
        self.cursor = None
        self.log_file = f"consolidacion_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        self.stats = {
            'grupos_encontrados': 0,
            'registros_consolidados': 0,
            'registros_eliminados': 0,
            'relaciones_actualizadas': 0,
            'errores': []
        }
        
    def log(self, mensaje, nivel="INFO"):
        """Registra mensajes en consola y archivo"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        mensaje_completo = f"[{timestamp}] [{nivel}] {mensaje}"
        print(mensaje_completo)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(mensaje_completo + '\n')
            
    def conectar_db(self):
        """Establece conexión con la base de datos"""
        try:
            self.connection = mysql.connector.connect(**DB_CONFIG)
            self.cursor = self.connection.cursor(dictionary=True)
            self.log("✅ Conexión a base de datos establecida")
            return True
        except Error as e:
            self.log(f"❌ Error conectando a la base de datos: {e}", "ERROR")
            return False
            
    def cerrar_db(self):
        """Cierra la conexión con la base de datos"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            if not self.dry_run:
                self.connection.commit()
            self.connection.close()
            self.log("✅ Conexión a base de datos cerrada")
            
    def crear_backup(self):
        """Crea un backup de las tablas afectadas"""
        self.log("📦 Creando backup de tablas...")
        
        tablas_backup = [
            'expokossodo_registros',
            'expokossodo_registro_eventos',
            'expokossodo_asistencias_generales',
            'expokossodo_asistencias_por_sala'
        ]
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for tabla in tablas_backup:
            tabla_backup = f"{tabla}_backup_{timestamp}"
            
            try:
                # Verificar si la tabla de backup ya existe
                self.cursor.execute(f"DROP TABLE IF EXISTS {tabla_backup}")
                
                # Crear tabla de backup
                self.cursor.execute(f"CREATE TABLE {tabla_backup} LIKE {tabla}")
                self.cursor.execute(f"INSERT INTO {tabla_backup} SELECT * FROM {tabla}")
                
                # Contar registros
                self.cursor.execute(f"SELECT COUNT(*) as total FROM {tabla_backup}")
                total = self.cursor.fetchone()['total']
                
                self.log(f"  ✅ Backup de {tabla}: {total} registros en {tabla_backup}")
                
            except Error as e:
                self.log(f"  ❌ Error creando backup de {tabla}: {e}", "ERROR")
                return False
                
        return True
        
    def encontrar_duplicados(self):
        """Encuentra grupos de registros con el mismo número de teléfono"""
        self.log("🔍 Buscando registros duplicados por número de teléfono...")
        
        query = """
            SELECT 
                numero,
                COUNT(*) as cantidad,
                GROUP_CONCAT(id ORDER BY id) as ids,
                GROUP_CONCAT(nombres ORDER BY id SEPARATOR '||') as todos_nombres,
                GROUP_CONCAT(correo ORDER BY id SEPARATOR '||') as todos_correos
            FROM expokossodo_registros
            GROUP BY numero
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC, MIN(id)
        """
        
        self.cursor.execute(query)
        duplicados = self.cursor.fetchall()
        
        self.stats['grupos_encontrados'] = len(duplicados)
        
        self.log(f"📊 Encontrados {len(duplicados)} grupos de números duplicados")
        
        # Mostrar resumen
        for grupo in duplicados[:5]:  # Mostrar primeros 5 grupos
            self.log(f"  - Número: {grupo['numero']} | Registros: {grupo['cantidad']} | IDs: {grupo['ids']}")
            
        if len(duplicados) > 5:
            self.log(f"  ... y {len(duplicados) - 5} grupos más")
            
        return duplicados
        
    def obtener_detalles_registros(self, ids_list):
        """Obtiene los detalles completos de un grupo de registros"""
        ids_str = ','.join(map(str, ids_list))
        
        query = f"""
            SELECT *
            FROM expokossodo_registros
            WHERE id IN ({ids_str})
            ORDER BY id
        """
        
        self.cursor.execute(query)
        return self.cursor.fetchall()
        
    def consolidar_eventos(self, eventos_arrays):
        """Consolida múltiples arrays de eventos en uno único"""
        eventos_unicos = set()
        
        for eventos_json in eventos_arrays:
            if eventos_json:
                try:
                    if isinstance(eventos_json, str):
                        eventos = json.loads(eventos_json)
                    else:
                        eventos = eventos_json
                        
                    if isinstance(eventos, list):
                        eventos_unicos.update(eventos)
                except (json.JSONDecodeError, TypeError) as e:
                    self.log(f"  ⚠️ Error parseando eventos: {e}", "WARN")
                    
        return sorted(list(eventos_unicos))
        
    def consolidar_grupo(self, grupo):
        """Consolida un grupo de registros duplicados"""
        ids = [int(id_) for id_ in grupo['ids'].split(',')]
        id_principal = min(ids)
        ids_eliminar = [id_ for id_ in ids if id_ != id_principal]
        
        self.log(f"\n📝 Procesando grupo con número: {grupo['numero']}")
        self.log(f"  - ID principal (mantener): {id_principal}")
        self.log(f"  - IDs a eliminar: {ids_eliminar}")
        
        # Obtener detalles completos
        registros = self.obtener_detalles_registros(ids)
        registro_principal = registros[0]  # El de menor ID
        
        # Consolidar correos
        correos_unicos = []
        correos_vistos = set()
        for registro in registros:
            correo = registro['correo'].strip()
            if correo and correo not in correos_vistos:
                correos_unicos.append(correo)
                correos_vistos.add(correo)
        correo_consolidado = ', '.join(correos_unicos)
        
        # Consolidar eventos
        eventos_arrays = [registro['eventos_seleccionados'] for registro in registros]
        eventos_consolidados = self.consolidar_eventos(eventos_arrays)
        eventos_json = json.dumps(eventos_consolidados)
        
        # Determinar confirmado y asistencia
        confirmado = any(registro['confirmado'] for registro in registros)
        asistencia_confirmada = any(
            registro.get('asistencia_general_confirmada', False) 
            for registro in registros
        )
        
        self.log(f"  - Correos consolidados: {correo_consolidado}")
        self.log(f"  - Eventos consolidados: {eventos_consolidados}")
        self.log(f"  - Confirmado: {confirmado}")
        self.log(f"  - Asistencia confirmada: {asistencia_confirmada}")
        
        if not self.dry_run:
            try:
                # Actualizar registro principal
                update_query = """
                    UPDATE expokossodo_registros 
                    SET 
                        correo = %s,
                        eventos_seleccionados = %s,
                        confirmado = %s,
                        asistencia_general_confirmada = %s
                    WHERE id = %s
                """
                
                self.cursor.execute(update_query, (
                    correo_consolidado,
                    eventos_json,
                    confirmado,
                    asistencia_confirmada,
                    id_principal
                ))
                
                self.log(f"  ✅ Registro principal {id_principal} actualizado")
                
                # Actualizar relaciones
                self.actualizar_relaciones(id_principal, ids_eliminar)
                
                # Eliminar registros duplicados
                if ids_eliminar:
                    delete_query = f"DELETE FROM expokossodo_registros WHERE id IN ({','.join(map(str, ids_eliminar))})"
                    self.cursor.execute(delete_query)
                    self.log(f"  ✅ Eliminados {len(ids_eliminar)} registros duplicados")
                    self.stats['registros_eliminados'] += len(ids_eliminar)
                
                self.stats['registros_consolidados'] += 1
                
            except Error as e:
                self.log(f"  ❌ Error consolidando grupo: {e}", "ERROR")
                self.stats['errores'].append(f"Grupo {grupo['numero']}: {str(e)}")
                
    def actualizar_relaciones(self, id_principal, ids_eliminar):
        """Actualiza las relaciones en otras tablas"""
        if not ids_eliminar:
            return
            
        ids_str = ','.join(map(str, ids_eliminar))
        
        # 1. Actualizar expokossodo_registro_eventos
        self.log(f"  📎 Actualizando relaciones registro-eventos...")
        
        # Primero, obtener eventos que ya tiene el registro principal
        self.cursor.execute("""
            SELECT evento_id 
            FROM expokossodo_registro_eventos 
            WHERE registro_id = %s
        """, (id_principal,))
        eventos_principal = {row['evento_id'] for row in self.cursor.fetchall()}
        
        # Obtener eventos de los registros a eliminar
        query = f"""
            SELECT evento_id, registro_id
            FROM expokossodo_registro_eventos 
            WHERE registro_id IN ({ids_str})
        """
        self.cursor.execute(query)
        eventos_eliminar = self.cursor.fetchall()
        
        for evento in eventos_eliminar:
            if evento['evento_id'] not in eventos_principal:
                # Evento no existe en principal, migrar
                insert_query = """
                    INSERT INTO expokossodo_registro_eventos 
                    (registro_id, evento_id, fecha_seleccion)
                    VALUES (%s, %s, NOW())
                """
                self.cursor.execute(insert_query, (
                    id_principal,
                    evento['evento_id']
                ))
                self.stats['relaciones_actualizadas'] += 1
                
        # 2. Actualizar expokossodo_asistencias_generales
        self.log(f"  📎 Actualizando asistencias generales...")
        update_query = f"""
            UPDATE expokossodo_asistencias_generales 
            SET registro_id = %s 
            WHERE registro_id IN ({ids_str})
        """
        self.cursor.execute(update_query, (id_principal,))
        
        # 3. Actualizar expokossodo_asistencias_por_sala
        self.log(f"  📎 Actualizando asistencias por sala...")
        update_query = f"""
            UPDATE expokossodo_asistencias_por_sala 
            SET registro_id = %s 
            WHERE registro_id IN ({ids_str})
        """
        self.cursor.execute(update_query, (id_principal,))
        
    def validar_resultado(self):
        """Valida el resultado de la consolidación"""
        self.log("\n🔍 Validando resultados...")
        
        # Verificar que no quedaron duplicados
        self.cursor.execute("""
            SELECT numero, COUNT(*) as cantidad
            FROM expokossodo_registros
            GROUP BY numero
            HAVING COUNT(*) > 1
        """)
        
        duplicados_restantes = self.cursor.fetchall()
        
        if duplicados_restantes:
            self.log(f"  ⚠️ Aún quedan {len(duplicados_restantes)} números duplicados", "WARN")
        else:
            self.log("  ✅ No quedan números duplicados")
            
        # Verificar integridad referencial
        self.cursor.execute("""
            SELECT COUNT(*) as huerfanos
            FROM expokossodo_registro_eventos re
            WHERE NOT EXISTS (
                SELECT 1 FROM expokossodo_registros r 
                WHERE r.id = re.registro_id
            )
        """)
        
        huerfanos = self.cursor.fetchone()['huerfanos']
        
        if huerfanos > 0:
            self.log(f"  ❌ Encontrados {huerfanos} registros huérfanos en registro_eventos", "ERROR")
        else:
            self.log("  ✅ Integridad referencial mantenida")
            
    def ejecutar(self):
        """Ejecuta el proceso completo de consolidación"""
        self.log("=" * 70)
        self.log(f"CONSOLIDACIÓN DE REGISTROS DUPLICADOS - EXPOKOSSODO 2025")
        self.log(f"Modo: {'SIMULACIÓN' if self.dry_run else 'EJECUCIÓN REAL'}")
        self.log("=" * 70)
        
        if not self.conectar_db():
            return False
            
        try:
            # Crear backup si no es dry_run
            if not self.dry_run:
                if not self.crear_backup():
                    self.log("❌ Error creando backup. Abortando proceso.", "ERROR")
                    return False
                    
            # Encontrar duplicados
            duplicados = self.encontrar_duplicados()
            
            if not duplicados:
                self.log("✅ No se encontraron registros duplicados. Nada que hacer.")
                return True
                
            # Procesar cada grupo
            for i, grupo in enumerate(duplicados, 1):
                self.log(f"\n{'='*50}")
                self.log(f"Procesando grupo {i} de {len(duplicados)}")
                self.consolidar_grupo(grupo)
                
                # Commit parcial cada 10 grupos
                if not self.dry_run and i % 10 == 0:
                    self.connection.commit()
                    self.log(f"💾 Commit parcial realizado ({i} grupos procesados)")
                    
            # Validar resultados
            if not self.dry_run:
                self.validar_resultado()
                
            # Mostrar estadísticas finales
            self.log("\n" + "=" * 70)
            self.log("📊 ESTADÍSTICAS FINALES")
            self.log("=" * 70)
            self.log(f"Grupos encontrados: {self.stats['grupos_encontrados']}")
            self.log(f"Registros consolidados: {self.stats['registros_consolidados']}")
            self.log(f"Registros eliminados: {self.stats['registros_eliminados']}")
            self.log(f"Relaciones actualizadas: {self.stats['relaciones_actualizadas']}")
            
            if self.stats['errores']:
                self.log(f"\n⚠️ Errores encontrados: {len(self.stats['errores'])}")
                for error in self.stats['errores'][:10]:
                    self.log(f"  - {error}")
                    
            self.log(f"\n📄 Log completo guardado en: {self.log_file}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error inesperado: {e}", "ERROR")
            if not self.dry_run:
                self.connection.rollback()
            return False
            
        finally:
            self.cerrar_db()


def main():
    """Función principal"""
    # Configurar encoding para Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    
    print("\n🚀 SCRIPT DE CONSOLIDACIÓN DE REGISTROS DUPLICADOS\n")
    print("Este script unificará registros que compartan el mismo número de teléfono.\n")
    
    # Preguntar modo de ejecución
    print("Seleccione el modo de ejecución:")
    print("1. SIMULACIÓN (dry-run) - Solo muestra lo que haría sin modificar datos")
    print("2. EJECUCIÓN REAL - Aplica los cambios en la base de datos")
    
    while True:
        opcion = input("\nIngrese su opción (1 o 2): ").strip()
        
        if opcion == '1':
            dry_run = True
            print("\n✅ Modo SIMULACIÓN seleccionado")
            break
        elif opcion == '2':
            confirmacion = input("\n⚠️ ADVERTENCIA: Esto modificará la base de datos. ¿Está seguro? (escriba 'SI' para continuar): ")
            if confirmacion.upper() == 'SI':
                dry_run = False
                print("\n✅ Modo EJECUCIÓN REAL seleccionado")
                break
            else:
                print("Operación cancelada")
                return
        else:
            print("❌ Opción inválida. Por favor ingrese 1 o 2.")
            
    # Ejecutar consolidación
    consolidador = ConsolidadorRegistros(dry_run=dry_run)
    exito = consolidador.ejecutar()
    
    if exito:
        print("\n✅ Proceso completado exitosamente")
    else:
        print("\n❌ El proceso encontró errores. Revise el log para más detalles.")
        
    input("\nPresione Enter para salir...")


if __name__ == "__main__":
    main()