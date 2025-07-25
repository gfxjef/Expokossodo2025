#!/usr/bin/env python3
"""
�� Exportador de URLs Directas de Charlas - ExpoKossodo 2025
Genera un JSON con todas las charlas y sus URLs directas
"""

import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional

# Agregar el directorio actual al path para importar funciones de app.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app import get_db_connection, generate_slug, ensure_unique_slug
except ImportError:
    print("❌ Error: No se puede importar app.py")
    print("💡 Asegúrate de ejecutar este script desde el directorio backend/")
    sys.exit(1)

class ExportadorURLsCharlas:
    def __init__(self, base_url: str = "https://expokossodo.grupokossodo.com"):
        self.base_url = base_url
        self.connection = None
        self.cursor = None
    
    def conectar_db(self) -> bool:
        """Conectar a la base de datos"""
        try:
            self.connection = get_db_connection()
            if not self.connection:
                print("❌ Error de conexión a la base de datos")
                return False
            
            self.cursor = self.connection.cursor(dictionary=True)
            print("✅ Conexión a base de datos establecida")
            return True
            
        except Exception as e:
            print(f"❌ Error conectando a la base de datos: {e}")
            return False
    
    def obtener_todas_las_charlas(self) -> List[Dict]:
        """Obtener todas las charlas con sus slugs"""
        try:
            # Obtener todas las charlas (incluyendo las no disponibles para tener URLs completas)
            self.cursor.execute("""
                SELECT 
                    e.id,
                    e.titulo_charla,
                    e.expositor,
                    e.fecha,
                    e.hora,
                    e.sala,
                    e.slug,
                    e.disponible,
                    e.slots_disponibles,
                    e.slots_ocupados,
                    m.marca as marca_nombre
                FROM expokossodo_eventos e
                LEFT JOIN expokossodo_marcas m ON e.marca_id = m.id
                ORDER BY e.fecha, e.hora, e.sala
            """)
            
            charlas = self.cursor.fetchall()
            print(f"📊 Encontradas {len(charlas)} charlas en total")
            return charlas
            
        except Exception as e:
            print(f"❌ Error obteniendo charlas: {e}")
            return []
    
    def generar_slug_si_falta(self, charla: Dict) -> str:
        """Generar slug si no existe"""
        if charla.get('slug'):
            return charla['slug']
        
        # Generar slug desde el título
        slug = generate_slug(charla['titulo_charla'])
        
        # Asegurar unicidad
        slug_final = ensure_unique_slug(self.cursor, slug, charla['id'])
        
        # Actualizar en base de datos
        try:
            self.cursor.execute(
                "UPDATE expokossodo_eventos SET slug = %s WHERE id = %s",
                (slug_final, charla['id'])
            )
            self.connection.commit()
            print(f"✅ Slug generado para: {charla['titulo_charla'][:50]}...")
        except Exception as e:
            print(f"⚠️ Error actualizando slug: {e}")
        
        return slug_final
    
    def formatear_charla_para_json(self, charla: Dict) -> Dict:
        """Formatear charla para el JSON de salida"""
        slug = self.generar_slug_si_falta(charla)
        
        return {
            "id": charla['id'],
            "titulo": charla['titulo_charla'],
            "expositor": charla['expositor'],
            "fecha": charla['fecha'].strftime('%Y-%m-%d') if charla['fecha'] else None,
            "hora": charla['hora'],
            "sala": charla['sala'],
            "slug": slug,
            "url_directa": f"{self.base_url}/charla/{slug}",
            "disponible": bool(charla.get('disponible', True)),
            "cupos_disponibles": charla.get('slots_disponibles', 0) - charla.get('slots_ocupados', 0),
            "marca": charla.get('marca_nombre')
        }
    
    def exportar_json_urls(self, charlas: List[Dict], filename: str = "urls_charlas_directas.json") -> bool:
        """Exportar JSON con URLs directas"""
        try:
            # Formatear charlas
            charlas_formateadas = []
            charlas_con_slug = 0
            charlas_sin_slug = 0
            
            for charla in charlas:
                charla_formateada = self.formatear_charla_para_json(charla)
                charlas_formateadas.append(charla_formateada)
                
                if charla.get('slug'):
                    charlas_con_slug += 1
                else:
                    charlas_sin_slug += 1
            
            # Crear estructura final del JSON
            json_data = {
                "metadata": {
                    "generado_el": datetime.now().isoformat(),
                    "total_charlas": len(charlas_formateadas),
                    "charlas_con_slug": charlas_con_slug,
                    "charlas_sin_slug": charlas_sin_slug,
                    "base_url": self.base_url,
                    "formato_url": f"{self.base_url}/charla/[slug]"
                },
                "charlas": charlas_formateadas
            }
            
            # Guardar archivo
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ JSON exportado exitosamente: {filename}")
            print(f"📊 Estadísticas:")
            print(f"   • Total charlas: {len(charlas_formateadas)}")
            print(f"   • Con slug existente: {charlas_con_slug}")
            print(f"   • Con slug generado: {charlas_sin_slug}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error exportando JSON: {e}")
            return False
    
    def mostrar_vista_previa(self, charlas: List[Dict], limite: int = 5):
        """Mostrar vista previa de las URLs generadas"""
        print(f"\n🔍 Vista previa (primeras {limite} charlas):")
        print("=" * 80)
        
        for i, charla in enumerate(charlas[:limite]):
            slug = self.generar_slug_si_falta(charla)
            url = f"{self.base_url}/charla/{slug}"
            
            print(f"{i+1}. {charla['titulo_charla']}")
            print(f"   �� {charla['expositor']}")
            print(f"   📅 {charla['fecha'].strftime('%Y-%m-%d')} - {charla['hora']} - Sala {charla['sala']}")
            print(f"   🔗 {url}")
            print(f"   �� Cupos: {charla.get('slots_disponibles', 0) - charla.get('slots_ocupados', 0)} disponibles")
            print()
    
    def ejecutar_exportacion(self, base_url: Optional[str] = None):
        """Ejecutar proceso completo de exportación"""
        if base_url:
            self.base_url = base_url
        
        print("�� Exportador de URLs Directas de Charlas - ExpoKossodo 2025")
        print("=" * 70)
        print(f"🌐 URL Base: {self.base_url}")
        print()
        
        # Conectar a base de datos
        if not self.conectar_db():
            return False
        
        try:
            # Obtener charlas
            charlas = self.obtener_todas_las_charlas()
            if not charlas:
                print("❌ No se encontraron charlas")
                return False
            
            # Mostrar vista previa
            self.mostrar_vista_previa(charlas)
            
            # Exportar JSON
            filename = f"urls_charlas_directas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            success = self.exportar_json_urls(charlas, filename)
            
            if success:
                print(f"\n🎉 ¡Exportación completada!")
                print(f"📁 Archivo generado: {filename}")
                print(f"🔗 Ejemplo de URL: {self.base_url}/charla/[slug]")
            
            return success
            
        finally:
            if self.cursor:
                self.cursor.close()
            if self.connection:
                self.connection.close()

def main():
    """Función principal"""
    # Configurar URL base (puedes cambiarla aquí)
    base_url = "https://expokossodo.grupokossodo.com"
    
    # Crear exportador y ejecutar
    exportador = ExportadorURLsCharlas(base_url)
    success = exportador.ejecutar_exportacion()
    
    if success:
        print("\n✅ Proceso completado exitosamente")
        sys.exit(0)
    else:
        print("\n❌ Error en el proceso")
        sys.exit(1)

if __name__ == "__main__":
    main()