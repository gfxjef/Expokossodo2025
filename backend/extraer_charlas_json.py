#!/usr/bin/env python3
"""
Script para extraer datos de charlas de ExpoKossodo y generar JSON para IA
Autor: ExpoKossodo Development Team
Fecha: 2024

Este script extrae información completa de las charlas/eventos almacenados en la base de datos
y genera un archivo JSON estructurado para alimentar un sistema de IA.
"""

import mysql.connector
from mysql.connector import Error
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from typing import Dict, List, Optional
import sys

# Cargar variables de entorno
load_dotenv()

class ExtractorCharlas:
    def __init__(self):
        """Inicializar extractor con configuración de base de datos"""
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'expokossodo'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'port': int(os.getenv('DB_PORT', 3306)),
            'charset': 'utf8mb4',
            'use_unicode': True
        }
        
        print("🔧 Configuración de Base de Datos:")
        print(f"   Host: {self.db_config['host']}")
        print(f"   Database: {self.db_config['database']}")
        print(f"   User: {self.db_config['user']}")
        print(f"   Port: {self.db_config['port']}")
        print()
    
    def conectar_db(self):
        """Crear conexión a la base de datos"""
        try:
            connection = mysql.connector.connect(**self.db_config)
            if connection.is_connected():
                print("✅ Conexión exitosa a la base de datos")
                return connection
            else:
                print("❌ Error: No se pudo conectar a la base de datos")
                return None
        except Error as e:
            print(f"❌ Error conectando a la base de datos: {e}")
            return None
    
    def obtener_charlas_completas(self) -> List[Dict]:
        """
        Extrae todas las charlas con información completa incluyendo marcas
        
        Returns:
            List[Dict]: Lista de charlas con todos los datos
        """
        connection = self.conectar_db()
        if not connection:
            return []
        
        cursor = connection.cursor(dictionary=True)
        charlas = []
        
        try:
            # Consulta SQL para obtener charlas con información de marcas
            query = """
            SELECT 
                e.id,
                e.fecha,
                e.hora,
                e.sala,
                e.titulo_charla,
                e.expositor,
                e.pais,
                e.descripcion,
                e.imagen_url,
                e.slots_disponibles,
                e.slots_ocupados,
                e.disponible,
                e.slug,
                e.created_at,
                m.id as marca_id,
                m.marca as marca_nombre,
                m.expositor as marca_expositor,
                m.logo as marca_logo
            FROM expokossodo_eventos e
            LEFT JOIN expokossodo_marcas m ON e.marca_id = m.id
            ORDER BY e.fecha, e.hora, e.sala
            """
            
            print("🔍 Ejecutando consulta para obtener charlas...")
            cursor.execute(query)
            resultados = cursor.fetchall()
            
            print(f"📊 Se encontraron {len(resultados)} charlas en la base de datos")
            
            # Procesar cada resultado
            for row in resultados:
                try:
                    charla = {
                        "id": row['id'] if row['id'] else 0,  # type: ignore
                        "titulo": row['titulo_charla'] if row['titulo_charla'] else "",  # type: ignore
                        "descripcion": row['descripcion'] if row['descripcion'] else "",  # type: ignore
                        "expositor": row['expositor'] if row['expositor'] else "",  # type: ignore
                        "marca": row['marca_nombre'] if row['marca_nombre'] else "Sin marca",  # type: ignore
                        "sala": row['sala'] if row['sala'] else "",  # type: ignore
                        "fecha": row['fecha'].strftime('%Y-%m-%d') if row['fecha'] else "",  # type: ignore
                        "hora": row['hora'] if row['hora'] else "",  # type: ignore
                        "pais": row['pais'] if row['pais'] else "",  # type: ignore
                        "imagen_url": row['imagen_url'] if row['imagen_url'] else "",  # type: ignore
                        "slots_disponibles": row['slots_disponibles'] if row['slots_disponibles'] else 0,  # type: ignore
                        "slots_ocupados": row['slots_ocupados'] if row['slots_ocupados'] else 0,  # type: ignore
                        "disponible": bool(row['disponible']) if row['disponible'] is not None else True,  # type: ignore
                        "slug": row['slug'] if row['slug'] else "",  # type: ignore
                        "fecha_creacion": row['created_at'].isoformat() if row['created_at'] else "",  # type: ignore
                        # Información adicional de la marca
                        "marca_info": {
                            "id": row['marca_id'],  # type: ignore
                            "nombre": row['marca_nombre'] if row['marca_nombre'] else "",  # type: ignore
                            "expositor_marca": row['marca_expositor'] if row['marca_expositor'] else "",  # type: ignore
                            "logo": row['marca_logo'] if row['marca_logo'] else ""  # type: ignore
                        } if row['marca_id'] else None  # type: ignore
                    }
                except (KeyError, TypeError) as e:
                    print(f"⚠️ Error procesando fila: {e}")
                    continue
                
                charlas.append(charla)
            
            print(f"✅ Se procesaron {len(charlas)} charlas exitosamente")
            
        except Error as e:
            print(f"❌ Error ejecutando consulta: {e}")
            
        finally:
            cursor.close()
            connection.close()
            print("🔐 Conexión a la base de datos cerrada")
        
        return charlas
    
    def generar_resumen_estadisticas(self, charlas: List[Dict]) -> Dict:
        """
        Genera estadísticas resumidas de las charlas
        
        Args:
            charlas: Lista de charlas
            
        Returns:
            Dict: Estadísticas resumidas
        """
        if not charlas:
            return {}
        
        total_charlas = len(charlas)
        charlas_disponibles = sum(1 for c in charlas if c['disponible'])
        charlas_ocupadas = sum(1 for c in charlas if c['slots_ocupados'] > 0)
        
        # Agrupar por fecha
        fechas = {}
        for charla in charlas:
            fecha = charla['fecha']
            if fecha not in fechas:
                fechas[fecha] = 0
            fechas[fecha] += 1
        
        # Agrupar por sala
        salas = {}
        for charla in charlas:
            sala = charla['sala']
            if sala not in salas:
                salas[sala] = 0
            salas[sala] += 1
        
        # Agrupar por marca
        marcas = {}
        for charla in charlas:
            marca = charla['marca']
            if marca not in marcas:
                marcas[marca] = 0
            marcas[marca] += 1
        
        # Agrupar por país
        paises = {}
        for charla in charlas:
            pais = charla['pais']
            if pais not in paises:
                paises[pais] = 0
            paises[pais] += 1
        
        return {
            "total_charlas": total_charlas,
            "charlas_disponibles": charlas_disponibles,
            "charlas_con_registros": charlas_ocupadas,
            "distribución_por_fecha": fechas,
            "distribución_por_sala": salas,
            "distribución_por_marca": marcas,
            "distribución_por_país": paises,
            "última_extracción": datetime.now().isoformat()
        }
    
    def exportar_json(self, charlas: List[Dict], filename: str = "charlas_expokossodo.json") -> bool:
        """
        Exporta las charlas a un archivo JSON
        
        Args:
            charlas: Lista de charlas
            filename: Nombre del archivo de salida
            
        Returns:
            bool: True si la exportación fue exitosa
        """
        try:
            # Crear estructura completa para el JSON
            estadisticas = self.generar_resumen_estadisticas(charlas)
            
            datos_completos = {
                "meta": {
                    "titulo": "Base de Datos de Charlas - ExpoKossodo 2025",
                    "descripcion": "Información completa de todas las charlas y eventos de ExpoKossodo 2025",
                    "fecha_generacion": datetime.now().isoformat(),
                    "version": "1.0",
                    "total_registros": len(charlas),
                    "campos_incluidos": [
                        "id", "titulo", "descripcion", "expositor", "marca", 
                        "sala", "fecha", "hora", "pais", "imagen_url",
                        "slots_disponibles", "slots_ocupados", "disponible",
                        "slug", "fecha_creacion", "marca_info"
                    ]
                },
                "estadisticas": estadisticas,
                "charlas": charlas
            }
            
            # Guardar archivo JSON con formato legible
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(datos_completos, f, 
                         indent=2, 
                         ensure_ascii=False, 
                         separators=(',', ': '))
            
            print(f"✅ Archivo JSON exportado exitosamente: {filename}")
            print(f"📊 Total de charlas exportadas: {len(charlas)}")
            
            # Mostrar tamaño del archivo
            size = os.path.getsize(filename)
            print(f"📁 Tamaño del archivo: {size:,} bytes ({size/1024:.1f} KB)")
            
            return True
            
        except Exception as e:
            print(f"❌ Error exportando JSON: {e}")
            return False
    
    def exportar_json_simple(self, charlas: List[Dict], filename: str = "charlas_simple.json") -> bool:
        """
        Exporta solo los campos básicos solicitados por el usuario
        
        Args:
            charlas: Lista de charlas
            filename: Nombre del archivo de salida
            
        Returns:
            bool: True si la exportación fue exitosa
        """
        try:
            # Extraer solo los campos solicitados
            charlas_simples = []
            for charla in charlas:
                charla_simple = {
                    "titulo": charla['titulo'],
                    "descripcion": charla['descripcion'],
                    "expositor": charla['expositor'],
                    "marca": charla['marca'],
                    "sala": charla['sala'],
                    "fecha": charla['fecha'],
                    "hora": charla['hora']
                }
                charlas_simples.append(charla_simple)
            
            # Guardar archivo JSON con formato legible
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(charlas_simples, f, 
                         indent=2, 
                         ensure_ascii=False, 
                         separators=(',', ': '))
            
            print(f"✅ Archivo JSON simple exportado exitosamente: {filename}")
            print(f"📊 Total de charlas exportadas: {len(charlas_simples)}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error exportando JSON simple: {e}")
            return False
    
    def mostrar_vista_previa(self, charlas: List[Dict], limite: int = 3):
        """
        Muestra una vista previa de las charlas extraídas
        
        Args:
            charlas: Lista de charlas
            limite: Número de charlas a mostrar
        """
        print(f"\n👁️ Vista previa de las primeras {limite} charlas:")
        print("=" * 80)
        
        for i, charla in enumerate(charlas[:limite], 1):
            print(f"\n📅 CHARLA {i}:")
            print(f"   Título: {charla['titulo']}")
            print(f"   Expositor: {charla['expositor']}")
            print(f"   Marca: {charla['marca']}")
            print(f"   Sala: {charla['sala']}")
            print(f"   Fecha: {charla['fecha']}")
            print(f"   Hora: {charla['hora']}")
            print(f"   Descripción: {charla['descripcion'][:100]}..." if len(charla['descripcion']) > 100 else f"   Descripción: {charla['descripcion']}")
            print(f"   Disponible: {'✅' if charla['disponible'] else '❌'}")
            
        if len(charlas) > limite:
            print(f"\n... y {len(charlas) - limite} charlas más.")
    
    def ejecutar_extraccion(self):
        """
        Ejecuta el proceso completo de extracción
        """
        print("🚀 Iniciando extracción de charlas de ExpoKossodo 2025")
        print("=" * 60)
        
        # Extraer charlas
        charlas = self.obtener_charlas_completas()
        
        if not charlas:
            print("❌ No se encontraron charlas para extraer.")
            return False
        
        # Mostrar vista previa
        self.mostrar_vista_previa(charlas)
        
        # Exportar archivos JSON
        print("\n📤 Exportando archivos JSON...")
        
        # Exportar JSON completo
        exito_completo = self.exportar_json(charlas, "charlas_expokossodo_completo.json")
        
        # Exportar JSON simple (solo campos solicitados)
        exito_simple = self.exportar_json_simple(charlas, "charlas_expokossodo_simple.json")
        
        if exito_completo and exito_simple:
            print("\n✅ Extracción completada exitosamente!")
            print("\n📁 Archivos generados:")
            print("   • charlas_expokossodo_completo.json - Información completa")
            print("   • charlas_expokossodo_simple.json - Solo campos básicos para IA")
            print("\n💡 Recomendación: Usa el archivo simple para alimentar tu IA")
            return True
        else:
            print("\n❌ Error durante la exportación")
            return False


def main():
    """Función principal"""
    print("🎯 ExpoKossodo 2025 - Extractor de Charlas para IA")
    print("=" * 60)
    
    try:
        extractor = ExtractorCharlas()
        extractor.ejecutar_extraccion()
        
    except KeyboardInterrupt:
        print("\n⚠️ Proceso interrumpido por el usuario")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 