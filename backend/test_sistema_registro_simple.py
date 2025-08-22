#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Testing del Sistema de Registro Modificado (Sin Unicode)
Usando entorno virtual para garantizar dependencias correctas
"""

import json
import requests
import time
import mysql.connector
from datetime import datetime
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class TestSistemaRegistro:
    def __init__(self):
        self.api_url = "http://localhost:5000/api"
        self.test_results = []
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'expokossodo'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'port': int(os.getenv('DB_PORT', 3306))
        }
        print(f"Configurando tests para API: {self.api_url}")
        print(f"Base de datos: {self.db_config['host']}:{self.db_config['port']}/{self.db_config['database']}")

    def log_result(self, test_name, success, details, duration=0):
        """Registra el resultado de una prueba"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "EXITOSO" if success else "FALLIDO"
        print(f"[{status}] {test_name} - {duration:.2f}s")
        if not success:
            print(f"  Error: {details}")

    def verificar_servidor(self):
        """Verifica que el servidor Flask esté ejecutándose"""
        try:
            response = requests.get(f"{self.api_url}/eventos", timeout=5)
            if response.status_code == 200:
                print("[OK] Servidor Flask está ejecutándose correctamente")
                return True
            else:
                print(f"[ERROR] Servidor responde con código {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] No se puede conectar al servidor: {e}")
            return False

    def verificar_base_datos(self):
        """Verifica la conexión a la base de datos"""
        try:
            connection = mysql.connector.connect(**self.db_config)
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM expokossodo_eventos")
            eventos_count = cursor.fetchone()[0]
            cursor.close()
            connection.close()
            print(f"[OK] Conexión a base de datos exitosa. Eventos disponibles: {eventos_count}")
            return True
        except Exception as e:
            print(f"[ERROR] Error conectando a la base de datos: {e}")
            return False

    def obtener_eventos_disponibles(self):
        """Obtiene eventos disponibles para las pruebas"""
        try:
            response = requests.get(f"{self.api_url}/eventos")
            if response.status_code == 200:
                eventos_data = response.json()
                # Extraer eventos de la estructura anidada
                eventos = []
                for fecha, horarios in eventos_data.items():
                    for horario, eventos_horario in horarios.items():
                        eventos.extend(eventos_horario)
                print(f"[OK] Obtenidos {len(eventos)} eventos para testing")
                return eventos
            return []
        except Exception as e:
            print(f"[ERROR] Error obteniendo eventos: {e}")
            return []

    def limpiar_usuario_test(self, correo):
        """Limpia datos de usuario de test si existen"""
        try:
            connection = mysql.connector.connect(**self.db_config)
            cursor = connection.cursor()
            
            # Obtener ID del registro si existe
            cursor.execute("SELECT id FROM expokossodo_registros WHERE correo = %s", (correo,))
            result = cursor.fetchone()
            
            if result:
                registro_id = result[0]
                # Eliminar relaciones en expokossodo_registro_eventos
                cursor.execute("DELETE FROM expokossodo_registro_eventos WHERE registro_id = %s", (registro_id,))
                # Eliminar registro principal
                cursor.execute("DELETE FROM expokossodo_registros WHERE id = %s", (registro_id,))
                connection.commit()
                print(f"[OK] Limpieza previa para {correo} completada")
            
            cursor.close()
            connection.close()
        except Exception as e:
            print(f"[WARNING] Error en limpieza previa para {correo}: {e}")

    def test_caso_1_usuario_nuevo(self, eventos):
        """Prueba: Usuario completamente nuevo"""
        correo_test = "nuevo_test@expokossodo.com"
        self.limpiar_usuario_test(correo_test)
        
        # Seleccionar 3 eventos diferentes
        eventos_seleccionados = [eventos[0]['id'], eventos[1]['id'], eventos[2]['id']] if len(eventos) >= 3 else [eventos[0]['id']]
        
        payload = {
            "nombres": "Usuario",
            "apellidos": "Nuevo Test",
            "correo": correo_test,
            "telefono": "123456789",
            "numero": "12345678",
            "empresa": "Test Company",
            "cargo": "Tester",
            "eventos_seleccionados": eventos_seleccionados
        }
        
        start_time = time.time()
        try:
            response = requests.post(f"{self.api_url}/registro", json=payload)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                success = (
                    data.get('success', False) and
                    len(data.get('eventos_agregados', [])) > 0
                )
                details = f"Agregados: {len(data.get('eventos_agregados', []))}, Omitidos: {len(data.get('eventos_omitidos', []))}"
            else:
                success = False
                details = f"Error HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            duration = time.time() - start_time
            success = False
            details = f"Excepción: {str(e)}"
        
        self.log_result("Caso 1 - Usuario Nuevo", success, details, duration)
        return success

    def test_caso_2_usuario_existente_sin_conflictos(self, eventos):
        """Prueba: Usuario existente agregando charlas sin conflictos"""
        correo_test = "existente_test@expokossodo.com"
        self.limpiar_usuario_test(correo_test)
        
        # Primer registro con algunos eventos
        eventos_iniciales = [eventos[0]['id']] if eventos else []
        payload_inicial = {
            "nombres": "Usuario",
            "apellidos": "Existente Test",
            "correo": correo_test,
            "telefono": "987654321",
            "numero": "87654321",
            "empresa": "Existing Company",
            "cargo": "Senior Tester",
            "eventos_seleccionados": eventos_iniciales
        }
        
        # Realizar primer registro
        response1 = requests.post(f"{self.api_url}/registro", json=payload_inicial)
        
        if response1.status_code != 200:
            self.log_result("Caso 2 - Setup Inicial", False, f"Setup falló: {response1.text}", 0)
            return False
        
        # Segundo registro con eventos adicionales (diferentes horarios)
        eventos_adicionales = [eventos[3]['id'], eventos[4]['id']] if len(eventos) >= 5 else [eventos[1]['id']]
        payload_adicional = {
            "nombres": "Usuario",
            "apellidos": "Existente Test",
            "correo": correo_test,
            "telefono": "987654321",
            "numero": "87654321", 
            "empresa": "Existing Company",
            "cargo": "Senior Tester",
            "eventos_seleccionados": eventos_adicionales
        }
        
        start_time = time.time()
        try:
            response = requests.post(f"{self.api_url}/registro", json=payload_adicional)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                success = (
                    data.get('success', False) and
                    data.get('modo') == 'actualizado' and
                    len(data.get('eventos_agregados', [])) > 0
                )
                details = f"Modo: {data.get('modo')}, Agregados: {len(data.get('eventos_agregados', []))}"
            else:
                success = False
                details = f"Error HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            duration = time.time() - start_time
            success = False
            details = f"Excepción: {str(e)}"
        
        self.log_result("Caso 2 - Usuario Existente Sin Conflictos", success, details, duration)
        return success

    def test_caso_3_usuario_existente_con_conflictos(self, eventos):
        """Prueba: Usuario existente con conflictos parciales"""
        correo_test = "conflictos_test@expokossodo.com"
        self.limpiar_usuario_test(correo_test)
        
        # Primer registro
        eventos_iniciales = [eventos[0]['id'], eventos[1]['id']] if len(eventos) >= 2 else [eventos[0]['id']]
        payload_inicial = {
            "nombres": "Usuario",
            "apellidos": "Conflictos Test",
            "correo": correo_test,
            "telefono": "555666777",
            "numero": "55566677",
            "empresa": "Conflicts Inc",
            "cargo": "Conflict Tester",
            "eventos_seleccionados": eventos_iniciales
        }
        
        response1 = requests.post(f"{self.api_url}/registro", json=payload_inicial)
        
        if response1.status_code != 200:
            self.log_result("Caso 3 - Setup Inicial", False, f"Setup falló: {response1.text}", 0)
            return False
        
        # Segundo registro con mix de eventos (algunos duplicados, otros nuevos)
        eventos_mixtos = [eventos[0]['id'], eventos[2]['id']] if len(eventos) >= 3 else [eventos[0]['id']]  # Incluye duplicado
        payload_mixto = {
            "nombres": "Usuario",
            "apellidos": "Conflictos Test",
            "correo": correo_test,
            "telefono": "555666777",
            "numero": "55566677",
            "empresa": "Conflicts Inc", 
            "cargo": "Conflict Tester",
            "eventos_seleccionados": eventos_mixtos
        }
        
        start_time = time.time()
        try:
            response = requests.post(f"{self.api_url}/registro", json=payload_mixto)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                # En este caso esperamos algunos eventos agregados y algunos omitidos
                agregados = len(data.get('eventos_agregados', []))
                omitidos = len(data.get('eventos_omitidos', []))
                success = (
                    data.get('success', False) and
                    data.get('modo') == 'actualizado'
                )
                details = f"Agregados: {agregados}, Omitidos: {omitidos}"
            else:
                success = False
                details = f"Error HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            duration = time.time() - start_time
            success = False
            details = f"Excepción: {str(e)}"
        
        self.log_result("Caso 3 - Usuario Existente Con Conflictos", success, details, duration)
        return success

    def test_caso_4_todos_conflictos(self, eventos):
        """Prueba: Usuario existente intentando registrar solo eventos duplicados"""
        correo_test = "todos_conflictos_test@expokossodo.com"
        self.limpiar_usuario_test(correo_test)
        
        # Primer registro
        eventos_iniciales = [eventos[0]['id'], eventos[1]['id']] if len(eventos) >= 2 else [eventos[0]['id']]
        payload_inicial = {
            "nombres": "Usuario",
            "apellidos": "Todos Conflictos Test",
            "correo": correo_test,
            "telefono": "111222333",
            "numero": "11122233",
            "empresa": "All Conflicts Corp",
            "cargo": "Full Conflict Tester",
            "eventos_seleccionados": eventos_iniciales
        }
        
        response1 = requests.post(f"{self.api_url}/registro", json=payload_inicial)
        
        if response1.status_code != 200:
            self.log_result("Caso 4 - Setup Inicial", False, f"Setup falló: {response1.text}", 0)
            return False
        
        # Segundo registro con los mismos eventos (todos conflictos)
        payload_duplicados = {
            "nombres": "Usuario",
            "apellidos": "Todos Conflictos Test",
            "correo": correo_test,
            "telefono": "111222333",
            "numero": "11122233",
            "empresa": "All Conflicts Corp",
            "cargo": "Full Conflict Tester",
            "eventos_seleccionados": eventos_iniciales  # Mismos eventos = todos conflictos
        }
        
        start_time = time.time()
        try:
            response = requests.post(f"{self.api_url}/registro", json=payload_duplicados)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                # Esperamos que no se agregue nada pero la respuesta sea exitosa
                success = (
                    data.get('success', False) and
                    len(data.get('eventos_agregados', [])) == 0 and
                    len(data.get('eventos_omitidos', [])) > 0
                )
                details = f"Agregados: {len(data.get('eventos_agregados', []))}, Omitidos: {len(data.get('eventos_omitidos', []))}"
            else:
                success = False
                details = f"Error HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            duration = time.time() - start_time
            success = False
            details = f"Excepción: {str(e)}"
        
        self.log_result("Caso 4 - Todos Conflictos", success, details, duration)
        return success

    def generar_reporte(self):
        """Genera reporte final de testing"""
        total_tests = len(self.test_results)
        exitosos = sum(1 for r in self.test_results if r['success'])
        fallidos = total_tests - exitosos
        tiempo_total = sum(r['duration'] for r in self.test_results)
        
        print("\n" + "="*60)
        print("REPORTE FINAL DE TESTING")
        print("="*60)
        print(f"Tests ejecutados: {total_tests}")
        print(f"Exitosos: {exitosos} ({exitosos/total_tests*100:.1f}%)")
        print(f"Fallidos: {fallidos} ({fallidos/total_tests*100:.1f}%)")
        print(f"Tiempo total: {tiempo_total:.2f} segundos")
        print(f"Tiempo promedio: {tiempo_total/total_tests:.2f} segundos")
        
        print("\nDETALLE DE RESULTADOS:")
        print("-"*60)
        for result in self.test_results:
            status = "[OK]" if result['success'] else "[FALLO]"
            print(f"{status} {result['test']}: {result['details']} ({result['duration']:.2f}s)")
        
        # Guardar reporte en archivo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_report_venv_{timestamp}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, indent=2, ensure_ascii=False)
        print(f"\nReporte detallado guardado en: {filename}")

    def ejecutar_suite_completa(self):
        """Ejecuta toda la suite de testing"""
        print("INICIANDO SUITE DE TESTING DEL SISTEMA DE REGISTRO")
        print("="*60)
        
        # Verificaciones preliminares
        if not self.verificar_servidor():
            print("[ERROR] No se puede continuar sin el servidor Flask")
            return False
            
        if not self.verificar_base_datos():
            print("[ERROR] No se puede continuar sin conexión a la base de datos")
            return False
        
        # Obtener eventos para testing
        eventos = self.obtener_eventos_disponibles()
        if len(eventos) < 5:
            print(f"[WARNING] Solo {len(eventos)} eventos disponibles. Se recomienda al menos 5 para testing completo.")
        
        print(f"\nEjecutando tests con {len(eventos)} eventos disponibles...")
        print("-"*60)
        
        # Ejecutar casos de prueba
        self.test_caso_1_usuario_nuevo(eventos)
        self.test_caso_2_usuario_existente_sin_conflictos(eventos)
        self.test_caso_3_usuario_existente_con_conflictos(eventos)
        self.test_caso_4_todos_conflictos(eventos)
        
        # Generar reporte
        self.generar_reporte()
        
        return True

def main():
    """Función principal"""
    print("Testing del Sistema de Registro con Entorno Virtual")
    print("Asegurate de que el servidor Flask este ejecutandose en puerto 5000")
    print()
    
    tester = TestSistemaRegistro()
    tester.ejecutar_suite_completa()

if __name__ == "__main__":
    main()