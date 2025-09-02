#!/usr/bin/env python3
"""
Script de Backup de Base de Datos - ExpoKossodo 2025

Este script crea un backup completo de las tablas críticas antes de realizar
operaciones de consolidación o modificación masiva de datos.

Autor: Sistema de Gestión ExpoKossodo
Fecha: 2025-01-02
"""

import mysql.connector
from mysql.connector import Error
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import subprocess
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

class BackupManager:
    def __init__(self):
        """Inicializa el gestor de backups"""
        self.connection = None
        self.cursor = None
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.backup_dir = f"backup_{self.timestamp}"
        self.log_file = f"backup_log_{self.timestamp}.txt"
        self.tablas_criticas = [
            'expokossodo_registros',
            'expokossodo_registro_eventos',
            'expokossodo_eventos',
            'expokossodo_asistencias_generales',
            'expokossodo_asistencias_por_sala',
            'expokossodo_qr_registros',
            'expokossodo_fecha_info',
            'expokossodo_marcas',
            'expokossodo_asesores',
            'expokossodo_asesor_marcas',
            'expokossodo_leads',
            'fb_leads'
        ]
        self.stats = {
            'tablas_respaldadas': 0,
            'registros_totales': 0,
            'tamaño_total_mb': 0,
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
            self.connection.close()
            self.log("✅ Conexión a base de datos cerrada")
            
    def crear_directorio_backup(self):
        """Crea el directorio para almacenar los backups"""
        try:
            if not os.path.exists(self.backup_dir):
                os.makedirs(self.backup_dir)
                self.log(f"📁 Directorio de backup creado: {self.backup_dir}")
            return True
        except Exception as e:
            self.log(f"❌ Error creando directorio de backup: {e}", "ERROR")
            return False
            
    def verificar_tabla_existe(self, tabla):
        """Verifica si una tabla existe en la base de datos"""
        try:
            self.cursor.execute(f"SHOW TABLES LIKE '{tabla}'")
            return self.cursor.fetchone() is not None
        except Error as e:
            self.log(f"❌ Error verificando tabla {tabla}: {e}", "ERROR")
            return False
            
    def obtener_estructura_tabla(self, tabla):
        """Obtiene la estructura CREATE TABLE de una tabla"""
        try:
            self.cursor.execute(f"SHOW CREATE TABLE {tabla}")
            resultado = self.cursor.fetchone()
            return resultado['Create Table'] if 'Create Table' in resultado else resultado[list(resultado.keys())[1]]
        except Error as e:
            self.log(f"❌ Error obteniendo estructura de {tabla}: {e}", "ERROR")
            return None
            
    def exportar_datos_tabla(self, tabla):
        """Exporta todos los datos de una tabla a formato SQL y JSON"""
        try:
            # Verificar si la tabla existe
            if not self.verificar_tabla_existe(tabla):
                self.log(f"⚠️ Tabla {tabla} no existe, saltando...", "WARN")
                return False
                
            self.log(f"📊 Exportando tabla: {tabla}")
            
            # Obtener estructura de la tabla
            estructura = self.obtener_estructura_tabla(tabla)
            if not estructura:
                return False
                
            # Obtener todos los datos
            self.cursor.execute(f"SELECT * FROM {tabla}")
            datos = self.cursor.fetchall()
            registros = len(datos)
            
            # Guardar estructura SQL
            sql_file = os.path.join(self.backup_dir, f"{tabla}_structure.sql")
            with open(sql_file, 'w', encoding='utf-8') as f:
                f.write(f"-- Estructura de tabla {tabla}\n")
                f.write(f"-- Fecha: {datetime.now()}\n")
                f.write(f"-- Registros: {registros}\n\n")
                f.write(f"DROP TABLE IF EXISTS {tabla}_backup;\n")
                f.write(estructura.replace(tabla, f"{tabla}_backup") + ";\n\n")
                
            # Guardar datos en formato SQL INSERT
            if registros > 0:
                insert_file = os.path.join(self.backup_dir, f"{tabla}_data.sql")
                with open(insert_file, 'w', encoding='utf-8') as f:
                    f.write(f"-- Datos de tabla {tabla}\n")
                    f.write(f"-- Fecha: {datetime.now()}\n")
                    f.write(f"-- Registros: {registros}\n\n")
                    
                    # Obtener nombres de columnas
                    columnas = list(datos[0].keys())
                    columnas_str = ', '.join([f"`{col}`" for col in columnas])
                    
                    # Escribir INSERTs en lotes de 100
                    batch_size = 100
                    for i in range(0, registros, batch_size):
                        batch = datos[i:i+batch_size]
                        
                        f.write(f"INSERT INTO {tabla}_backup ({columnas_str}) VALUES\n")
                        
                        valores_batch = []
                        for row in batch:
                            valores = []
                            for col in columnas:
                                valor = row[col]
                                if valor is None:
                                    valores.append("NULL")
                                elif isinstance(valor, (int, float)):
                                    valores.append(str(valor))
                                elif isinstance(valor, bool):
                                    valores.append("TRUE" if valor else "FALSE")
                                elif isinstance(valor, datetime):
                                    valores.append(f"'{valor.strftime('%Y-%m-%d %H:%M:%S')}'")
                                elif isinstance(valor, bytes):
                                    # Para datos binarios, convertir a hexadecimal
                                    valores.append(f"0x{valor.hex()}")
                                else:
                                    # Escapar comillas simples en strings
                                    valor_str = str(valor).replace("'", "''")
                                    valores.append(f"'{valor_str}'")
                            
                            valores_batch.append(f"({', '.join(valores)})")
                        
                        f.write(',\n'.join(valores_batch))
                        f.write(';\n\n')
                
            # Guardar datos en formato JSON (para análisis y recuperación alternativa)
            json_file = os.path.join(self.backup_dir, f"{tabla}_data.json")
            
            # Convertir datos para JSON (manejar tipos no serializables)
            datos_json = []
            for row in datos:
                row_json = {}
                for key, value in row.items():
                    if isinstance(value, datetime):
                        row_json[key] = value.isoformat()
                    elif isinstance(value, bytes):
                        row_json[key] = value.hex()
                    elif hasattr(value, 'isoformat'):  # Para date, datetime, time
                        row_json[key] = value.isoformat()
                    else:
                        row_json[key] = value
                datos_json.append(row_json)
                
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'tabla': tabla,
                    'fecha_backup': datetime.now().isoformat(),
                    'registros': registros,
                    'datos': datos_json
                }, f, indent=2, ensure_ascii=False)
                
            # Calcular tamaño de archivos
            tamaño_mb = 0
            for archivo in [sql_file, insert_file if registros > 0 else None, json_file]:
                if archivo and os.path.exists(archivo):
                    tamaño_mb += os.path.getsize(archivo) / (1024 * 1024)
                    
            self.log(f"  ✅ {tabla}: {registros} registros exportados ({tamaño_mb:.2f} MB)")
            
            self.stats['tablas_respaldadas'] += 1
            self.stats['registros_totales'] += registros
            self.stats['tamaño_total_mb'] += tamaño_mb
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error exportando tabla {tabla}: {e}", "ERROR")
            self.stats['errores'].append(f"{tabla}: {str(e)}")
            return False
            
    def crear_script_restauracion(self):
        """Crea un script para restaurar el backup"""
        script_file = os.path.join(self.backup_dir, "restaurar_backup.py")
        
        script_content = '''#!/usr/bin/env python3
"""
Script de Restauración de Backup - ExpoKossodo 2025
Generado automáticamente el: {fecha}
"""

import mysql.connector
import os
import sys
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {{
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': int(os.getenv('DB_PORT', 3306))
}}

def restaurar():
    print("\\n⚠️ ADVERTENCIA: Este script restaurará el backup del {fecha}")
    print("Esto sobrescribirá los datos actuales de las tablas.")
    
    confirmacion = input("\\n¿Está seguro? Escriba 'RESTAURAR' para continuar: ")
    if confirmacion != 'RESTAURAR':
        print("Operación cancelada")
        return
        
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("\\n📦 Iniciando restauración...")
        
        # Lista de archivos SQL a ejecutar
        archivos_sql = [
{archivos_sql}
        ]
        
        for archivo in archivos_sql:
            if os.path.exists(archivo):
                print(f"  Ejecutando: {{archivo}}")
                with open(archivo, 'r', encoding='utf-8') as f:
                    sql_commands = f.read()
                    
                # Ejecutar comandos SQL
                for command in sql_commands.split(';'):
                    if command.strip():
                        try:
                            cursor.execute(command)
                        except Exception as e:
                            print(f"    ⚠️ Error en comando: {{e}}")
                            
        connection.commit()
        print("\\n✅ Restauración completada")
        
    except Exception as e:
        print(f"\\n❌ Error durante la restauración: {{e}}")
        if connection:
            connection.rollback()
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            
if __name__ == "__main__":
    restaurar()
'''.format(
            fecha=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            archivos_sql='\n'.join([f'            "{tabla}_structure.sql", "{tabla}_data.sql",' for tabla in self.tablas_criticas])
        )
        
        with open(script_file, 'w', encoding='utf-8') as f:
            f.write(script_content)
            
        self.log(f"📝 Script de restauración creado: {script_file}")
        
    def crear_readme(self):
        """Crea un archivo README con información del backup"""
        readme_file = os.path.join(self.backup_dir, "README.md")
        
        content = f"""# Backup de Base de Datos - ExpoKossodo 2025

## Información del Backup

- **Fecha y Hora**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Base de Datos**: {DB_CONFIG['database']}
- **Host**: {DB_CONFIG['host']}
- **Tablas Respaldadas**: {self.stats['tablas_respaldadas']}
- **Total de Registros**: {self.stats['registros_totales']:,}
- **Tamaño Total**: {self.stats['tamaño_total_mb']:.2f} MB

## Tablas Incluidas

"""
        for tabla in self.tablas_criticas:
            content += f"- {tabla}\n"
            
        content += f"""

## Archivos Generados

Para cada tabla se generaron 3 archivos:
- `[tabla]_structure.sql`: Estructura de la tabla (CREATE TABLE)
- `[tabla]_data.sql`: Datos en formato INSERT
- `[tabla]_data.json`: Datos en formato JSON

## Cómo Restaurar

### Opción 1: Script Automático
```bash
python restaurar_backup.py
```

### Opción 2: MySQL Manual
```bash
mysql -h {DB_CONFIG['host']} -u {DB_CONFIG['user']} -p {DB_CONFIG['database']} < [tabla]_structure.sql
mysql -h {DB_CONFIG['host']} -u {DB_CONFIG['user']} -p {DB_CONFIG['database']} < [tabla]_data.sql
```

### Opción 3: Importar JSON (requiere script personalizado)
Los archivos JSON pueden ser procesados con un script Python para reimportar los datos.

## Notas Importantes

1. **Antes de restaurar**: Haga un backup de los datos actuales
2. **Orden de restauración**: Primero estructura, luego datos
3. **Integridad referencial**: Desactive foreign keys durante la restauración si es necesario
4. **Verificación**: Después de restaurar, verifique la integridad de los datos

## Errores Durante el Backup

"""
        
        if self.stats['errores']:
            content += "Se encontraron los siguientes errores:\n\n"
            for error in self.stats['errores']:
                content += f"- {error}\n"
        else:
            content += "No se encontraron errores durante el backup.\n"
            
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(content)
            
        self.log(f"📄 README creado: {readme_file}")
        
    def comprimir_backup(self):
        """Comprime el directorio de backup en un archivo ZIP"""
        try:
            import zipfile
            
            zip_file = f"{self.backup_dir}.zip"
            
            self.log(f"🗜️ Comprimiendo backup...")
            
            with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(self.backup_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, os.path.dirname(self.backup_dir))
                        zipf.write(file_path, arcname)
                        
            # Verificar tamaño del ZIP
            zip_size_mb = os.path.getsize(zip_file) / (1024 * 1024)
            self.log(f"✅ Backup comprimido: {zip_file} ({zip_size_mb:.2f} MB)")
            
            return True
            
        except ImportError:
            self.log("⚠️ Módulo zipfile no disponible, backup no comprimido", "WARN")
            return False
        except Exception as e:
            self.log(f"❌ Error comprimiendo backup: {e}", "ERROR")
            return False
            
    def ejecutar(self):
        """Ejecuta el proceso completo de backup"""
        self.log("=" * 70)
        self.log("BACKUP DE BASE DE DATOS - EXPOKOSSODO 2025")
        self.log("=" * 70)
        
        if not self.conectar_db():
            return False
            
        try:
            # Crear directorio de backup
            if not self.crear_directorio_backup():
                return False
                
            # Exportar cada tabla
            self.log("\n📊 Iniciando exportación de tablas...")
            for tabla in self.tablas_criticas:
                self.exportar_datos_tabla(tabla)
                
            # Crear script de restauración
            self.crear_script_restauracion()
            
            # Crear README
            self.crear_readme()
            
            # Comprimir backup
            self.comprimir_backup()
            
            # Mostrar estadísticas finales
            self.log("\n" + "=" * 70)
            self.log("📊 ESTADÍSTICAS DEL BACKUP")
            self.log("=" * 70)
            self.log(f"Tablas respaldadas: {self.stats['tablas_respaldadas']}/{len(self.tablas_criticas)}")
            self.log(f"Total de registros: {self.stats['registros_totales']:,}")
            self.log(f"Tamaño total: {self.stats['tamaño_total_mb']:.2f} MB")
            self.log(f"Directorio: {os.path.abspath(self.backup_dir)}")
            
            if self.stats['errores']:
                self.log(f"\n⚠️ Errores encontrados: {len(self.stats['errores'])}")
                for error in self.stats['errores']:
                    self.log(f"  - {error}")
            else:
                self.log("\n✅ Backup completado sin errores")
                
            self.log(f"\n📄 Log completo guardado en: {self.log_file}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error inesperado durante el backup: {e}", "ERROR")
            return False
            
        finally:
            self.cerrar_db()


def main():
    """Función principal"""
    # Configurar encoding para Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    
    print("\n🚀 SISTEMA DE BACKUP DE BASE DE DATOS - EXPOKOSSODO 2025\n")
    print("Este script creará un backup completo de las tablas críticas del sistema.\n")
    
    print("Tablas a respaldar:")
    manager = BackupManager()
    for i, tabla in enumerate(manager.tablas_criticas, 1):
        print(f"  {i}. {tabla}")
        
    print(f"\nTotal: {len(manager.tablas_criticas)} tablas")
    
    confirmacion = input("\n¿Desea continuar con el backup? (s/n): ").strip().lower()
    
    if confirmacion != 's':
        print("Operación cancelada")
        return
        
    # Ejecutar backup
    exito = manager.ejecutar()
    
    if exito:
        print("\n✅ Backup completado exitosamente")
        print(f"📁 Los archivos se encuentran en: {os.path.abspath(manager.backup_dir)}")
        print(f"🗜️ Archivo comprimido: {manager.backup_dir}.zip")
    else:
        print("\n❌ El backup encontró errores. Revise el log para más detalles.")
        
    input("\nPresione Enter para salir...")


if __name__ == "__main__":
    main()