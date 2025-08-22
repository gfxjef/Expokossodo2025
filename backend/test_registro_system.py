#!/usr/bin/env python3
"""
Test Suite para el Sistema de Registro ExpoKossodo 2025
Basado en las especificaciones del agente registro-system-tester.md

Este script realiza testing exhaustivo de la nueva lógica de registro que permite:
1. Re-registro con el mismo correo electrónico
2. Validación inteligente de conflictos de horario
3. Registro parcial de charlas válidas
4. Actualización de registros existentes
"""

import requests
import json
import mysql.connector
import time
import datetime
from typing import Dict, List, Tuple, Any
import os
from dotenv import load_dotenv
import uuid
import traceback

# Cargar variables de entorno
load_dotenv()

class RegistroSystemTester:
    def __init__(self, api_url: str = "http://localhost:5000/api", test_mode: bool = True):
        """
        Inicializar tester del sistema de registro
        
        Args:
            api_url: URL base de la API
            test_mode: Si está en modo de testing (usa datos de prueba)
        """
        self.api_url = api_url
        self.test_mode = test_mode
        self.test_results = []
        self.db_connection = None
        self.test_prefix = f"test_{int(time.time())}_"
        
        # Configuración de base de datos
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME', 'expokossodo_test'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
        
        # Datos de prueba base
        self.test_users = {
            'nuevo': {
                'nombres': 'Juan Carlos Testero',
                'correo': f'{self.test_prefix}nuevo@test.com',
                'empresa': 'TestCorp',
                'cargo': 'Tester Senior',
                'numero': '+56912345678',
                'eventos_seleccionados': []
            },
            'existente': {
                'nombres': 'Maria Existente Prueba',
                'correo': f'{self.test_prefix}existente@test.com',
                'empresa': 'ExistCorp',
                'cargo': 'QA Lead',
                'numero': '+56987654321',
                'eventos_seleccionados': []
            }
        }
        
        # Eventos de prueba (se obtendrán de la BD)
        self.test_events = []
        
    def connect_db(self) -> bool:
        """Conectar a la base de datos para validaciones"""
        try:
            self.db_connection = mysql.connector.connect(**self.db_config)
            return True
        except mysql.connector.Error as e:
            print(f"❌ Error conectando a la base de datos: {e}")
            return False
    
    def disconnect_db(self):
        """Desconectar de la base de datos"""
        if self.db_connection and self.db_connection.is_connected():
            self.db_connection.close()
    
    def setup_test_data(self) -> bool:
        """
        Configurar datos de prueba consistentes
        - Obtener eventos disponibles
        - Crear usuario existente base
        """
        print("[SETUP] Configurando datos de prueba...")
        
        try:
            # 1. Obtener eventos disponibles
            response = requests.get(f"{self.api_url}/eventos")
            if response.status_code != 200:
                print(f"❌ Error obteniendo eventos: {response.status_code}")
                return False
            
            eventos_data = response.json()
            
            # Buscar eventos en diferentes horarios para testing
            self.test_events = []
            for fecha in eventos_data:
                for evento in eventos_data[fecha]:
                    if len(self.test_events) < 10:  # Limitamos a 10 eventos para testing
                        self.test_events.append(evento)
            
            if len(self.test_events) < 6:
                print(f"❌ Se necesitan al menos 6 eventos para testing, encontrados: {len(self.test_events)}")
                return False
            
            print(f"✅ Encontrados {len(self.test_events)} eventos para testing")
            
            # 2. Crear usuario existente base con eventos iniciales
            user_existente = self.test_users['existente'].copy()
            user_existente['eventos_seleccionados'] = [
                self.test_events[0]['id'],  # Evento 1
                self.test_events[1]['id']   # Evento 2
            ]
            
            response = requests.post(f"{self.api_url}/registro", json=user_existente)
            if response.status_code not in [200, 201]:
                print(f"❌ Error creando usuario existente base: {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            print("✅ Usuario existente base creado exitosamente")
            return True
            
        except Exception as e:
            print(f"❌ Error en setup_test_data: {e}")
            return False
    
    def cleanup_test_data(self):
        """Limpiar datos de prueba creados durante los tests"""
        print("🧹 Limpiando datos de prueba...")
        
        if not self.connect_db():
            return
        
        try:
            cursor = self.db_connection.cursor()
            
            # Eliminar registros de prueba
            test_emails = [user['correo'] for user in self.test_users.values()]
            placeholders = ','.join(['%s'] * len(test_emails))
            
            # Primero eliminar de registro_eventos
            cursor.execute(f"""
                DELETE re FROM expokossodo_registro_eventos re
                INNER JOIN expokossodo_registros r ON re.registro_id = r.id
                WHERE r.correo IN ({placeholders})
            """, test_emails)
            
            # Luego eliminar registros
            cursor.execute(f"""
                DELETE FROM expokossodo_registros 
                WHERE correo IN ({placeholders})
            """, test_emails)
            
            self.db_connection.commit()
            print(f"✅ Eliminados registros de prueba: {test_emails}")
            
        except mysql.connector.Error as e:
            print(f"❌ Error limpiando datos: {e}")
        finally:
            cursor.close()
            self.disconnect_db()
    
    def validate_database_integrity(self, test_name: str, expected_events: List[int], user_email: str) -> Dict[str, Any]:
        """
        Validar integridad de datos en la base de datos
        
        Args:
            test_name: Nombre del test
            expected_events: Lista de eventos esperados
            user_email: Email del usuario a validar
        
        Returns:
            Dict con resultados de validación
        """
        if not self.connect_db():
            return {'success': False, 'error': 'No se pudo conectar a la BD'}
        
        try:
            cursor = self.db_connection.cursor(dictionary=True)
            
            # 1. Verificar que el registro existe
            cursor.execute("""
                SELECT id, nombres, correo, eventos_seleccionados 
                FROM expokossodo_registros 
                WHERE correo = %s
            """, (user_email,))
            
            registro = cursor.fetchone()
            if not registro:
                return {'success': False, 'error': 'Registro no encontrado en BD'}
            
            # 2. Verificar eventos_seleccionados JSON
            eventos_json = json.loads(registro['eventos_seleccionados'] or '[]')
            eventos_json_set = set(eventos_json)
            expected_set = set(expected_events)
            
            # 3. Verificar relaciones en expokossodo_registro_eventos
            cursor.execute("""
                SELECT evento_id FROM expokossodo_registro_eventos 
                WHERE registro_id = %s
            """, (registro['id'],))
            
            eventos_relaciones = [row['evento_id'] for row in cursor.fetchall()]
            eventos_relaciones_set = set(eventos_relaciones)
            
            # 4. Validar consistencia
            validation_result = {
                'success': True,
                'registro_id': registro['id'],
                'eventos_json': eventos_json,
                'eventos_relaciones': eventos_relaciones,
                'json_consistent': eventos_json_set == expected_set,
                'relations_consistent': eventos_relaciones_set == expected_set,
                'json_relations_match': eventos_json_set == eventos_relaciones_set,
                'expected_events': expected_events,
                'missing_in_json': list(expected_set - eventos_json_set),
                'extra_in_json': list(eventos_json_set - expected_set),
                'missing_in_relations': list(expected_set - eventos_relaciones_set),
                'extra_in_relations': list(eventos_relaciones_set - expected_set)
            }
            
            # Marcar como fallido si hay inconsistencias
            if not (validation_result['json_consistent'] and 
                   validation_result['relations_consistent'] and 
                   validation_result['json_relations_match']):
                validation_result['success'] = False
            
            return validation_result
            
        except Exception as e:
            return {'success': False, 'error': f'Error validando BD: {str(e)}'}
        finally:
            cursor.close()
            self.disconnect_db()
    
    def validate_api_response(self, response: requests.Response, expected_structure: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validar estructura y contenido de respuesta API
        
        Args:
            response: Respuesta HTTP
            expected_structure: Estructura esperada de la respuesta
        
        Returns:
            Dict con resultados de validación
        """
        validation_result = {
            'success': True,
            'status_code': response.status_code,
            'content_type': response.headers.get('content-type', ''),
            'response_size': len(response.content),
            'errors': []
        }
        
        try:
            # 1. Validar que sea JSON
            if 'application/json' not in validation_result['content_type']:
                validation_result['errors'].append('Content-Type no es application/json')
                validation_result['success'] = False
            
            # 2. Parsear JSON
            try:
                response_data = response.json()
                validation_result['response_data'] = response_data
            except json.JSONDecodeError as e:
                validation_result['errors'].append(f'Error parseando JSON: {e}')
                validation_result['success'] = False
                return validation_result
            
            # 3. Validar estructura esperada
            for key, expected_type in expected_structure.items():
                if key not in response_data:
                    validation_result['errors'].append(f'Campo faltante: {key}')
                    validation_result['success'] = False
                elif expected_type and not isinstance(response_data[key], expected_type):
                    validation_result['errors'].append(
                        f'Tipo incorrecto para {key}: esperado {expected_type}, recibido {type(response_data[key])}'
                    )
                    validation_result['success'] = False
            
            return validation_result
            
        except Exception as e:
            validation_result['errors'].append(f'Error validando respuesta: {str(e)}')
            validation_result['success'] = False
            return validation_result
    
    def measure_performance(self, func, *args, **kwargs) -> Tuple[Any, float]:
        """Medir tiempo de ejecución de una función"""
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        return result, end_time - start_time
    
    def test_caso_1_usuario_nuevo(self) -> Dict[str, Any]:
        """
        Caso 1: Usuario Completamente Nuevo
        Debe registrarse exitosamente con todos los eventos seleccionados
        """
        print("\n🧪 Test Caso 1: Usuario Completamente Nuevo")
        
        test_result = {
            'test_name': 'Caso 1: Usuario Completamente Nuevo',
            'success': False,
            'errors': [],
            'performance_ms': 0,
            'db_validation': {},
            'api_validation': {}
        }
        
        try:
            # Preparar datos de usuario nuevo
            user_nuevo = self.test_users['nuevo'].copy()
            user_nuevo['eventos_seleccionados'] = [
                self.test_events[0]['id'],  # Evento 1
                self.test_events[2]['id'],  # Evento 3
                self.test_events[4]['id']   # Evento 5
            ]
            
            # Realizar petición y medir performance
            response, performance_time = self.measure_performance(
                requests.post, f"{self.api_url}/registro", json=user_nuevo
            )
            test_result['performance_ms'] = performance_time * 1000
            
            # Validar respuesta API
            expected_structure = {
                'success': bool,
                'message': str,
                'eventos_agregados': list,
                'eventos_omitidos': list,
                'modo': str
            }
            
            api_validation = self.validate_api_response(response, expected_structure)
            test_result['api_validation'] = api_validation
            
            # Verificar que la respuesta sea exitosa
            if response.status_code not in [200, 201]:
                test_result['errors'].append(f'Status code incorrecto: {response.status_code}')
                test_result['errors'].append(f'Response: {response.text}')
                return test_result
            
            response_data = response.json()
            
            # Verificar que todos los eventos fueron agregados
            if not response_data.get('success'):
                test_result['errors'].append('El registro no fue exitoso según la respuesta')
                return test_result
            
            eventos_agregados = response_data.get('eventos_agregados', [])
            if len(eventos_agregados) != 3:
                test_result['errors'].append(f'Se esperaban 3 eventos agregados, se obtuvieron {len(eventos_agregados)}')
            
            eventos_omitidos = response_data.get('eventos_omitidos', [])
            if len(eventos_omitidos) > 0:
                test_result['errors'].append(f'No se esperaban eventos omitidos, se obtuvieron {len(eventos_omitidos)}')
            
            # Validar integridad de base de datos
            db_validation = self.validate_database_integrity(
                'Caso 1', user_nuevo['eventos_seleccionados'], user_nuevo['correo']
            )
            test_result['db_validation'] = db_validation
            
            if not db_validation['success']:
                test_result['errors'].append(f"Error en validación de BD: {db_validation.get('error', 'Unknown')}")
            
            # Determinar éxito del test
            test_result['success'] = (
                len(test_result['errors']) == 0 and
                api_validation['success'] and
                db_validation['success']
            )
            
            return test_result
            
        except Exception as e:
            test_result['errors'].append(f'Excepción durante el test: {str(e)}')
            test_result['errors'].append(f'Traceback: {traceback.format_exc()}')
            return test_result
    
    def test_caso_2_usuario_existente_sin_conflictos(self) -> Dict[str, Any]:
        """
        Caso 2: Usuario Existente - Sin Conflictos
        Debe agregar nuevos eventos sin conflictos de horario
        """
        print("\n🧪 Test Caso 2: Usuario Existente - Sin Conflictos")
        
        test_result = {
            'test_name': 'Caso 2: Usuario Existente - Sin Conflictos',
            'success': False,
            'errors': [],
            'performance_ms': 0,
            'db_validation': {},
            'api_validation': {}
        }
        
        try:
            # Preparar datos para actualización (eventos sin conflictos)
            user_existente = self.test_users['existente'].copy()
            
            # Eventos nuevos que no conflictan con los existentes (eventos 0 y 1)
            eventos_nuevos = [
                self.test_events[3]['id'],  # Evento 4
                self.test_events[5]['id'],  # Evento 6
            ]
            
            user_existente['eventos_seleccionados'] = eventos_nuevos
            
            # Realizar petición
            response, performance_time = self.measure_performance(
                requests.post, f"{self.api_url}/registro", json=user_existente
            )
            test_result['performance_ms'] = performance_time * 1000
            
            # Validar respuesta API
            expected_structure = {
                'success': bool,
                'message': str,
                'eventos_agregados': list,
                'eventos_omitidos': list,
                'modo': str
            }
            
            api_validation = self.validate_api_response(response, expected_structure)
            test_result['api_validation'] = api_validation
            
            if response.status_code not in [200, 201]:
                test_result['errors'].append(f'Status code incorrecto: {response.status_code}')
                test_result['errors'].append(f'Response: {response.text}')
                return test_result
            
            response_data = response.json()
            
            # Verificar que la actualización fue exitosa
            if not response_data.get('success'):
                test_result['errors'].append('La actualización no fue exitosa según la respuesta')
                return test_result
            
            # Verificar eventos agregados
            eventos_agregados = response_data.get('eventos_agregados', [])
            if len(eventos_agregados) != 2:
                test_result['errors'].append(f'Se esperaban 2 eventos agregados, se obtuvieron {len(eventos_agregados)}')
            
            # No debe haber eventos omitidos
            eventos_omitidos = response_data.get('eventos_omitidos', [])
            if len(eventos_omitidos) > 0:
                test_result['errors'].append(f'No se esperaban eventos omitidos, se obtuvieron {len(eventos_omitidos)}')
            
            # Los eventos finales deben incluir los anteriores + nuevos
            eventos_esperados = [
                self.test_events[0]['id'],  # Evento original 1
                self.test_events[1]['id'],  # Evento original 2
                self.test_events[3]['id'],  # Evento nuevo 4
                self.test_events[5]['id']   # Evento nuevo 6
            ]
            
            # Validar integridad de base de datos
            db_validation = self.validate_database_integrity(
                'Caso 2', eventos_esperados, user_existente['correo']
            )
            test_result['db_validation'] = db_validation
            
            if not db_validation['success']:
                test_result['errors'].append(f"Error en validación de BD: {db_validation.get('error', 'Unknown')}")
            
            # Determinar éxito del test
            test_result['success'] = (
                len(test_result['errors']) == 0 and
                api_validation['success'] and
                db_validation['success']
            )
            
            return test_result
            
        except Exception as e:
            test_result['errors'].append(f'Excepción durante el test: {str(e)}')
            test_result['errors'].append(f'Traceback: {traceback.format_exc()}')
            return test_result
    
    def test_caso_3_usuario_existente_conflictos_parciales(self) -> Dict[str, Any]:
        """
        Caso 3: Usuario Existente - Conflictos Parciales
        Debe agregar solo eventos válidos, omitiendo los que tienen conflictos
        """
        print("\n🧪 Test Caso 3: Usuario Existente - Conflictos Parciales")
        
        test_result = {
            'test_name': 'Caso 3: Usuario Existente - Conflictos Parciales',
            'success': False,
            'errors': [],
            'performance_ms': 0,
            'db_validation': {},
            'api_validation': {}
        }
        
        try:
            # Preparar datos con conflictos parciales
            user_existente = self.test_users['existente'].copy()
            
            # Incluir un evento que ya tiene (conflicto) y uno nuevo (válido)
            eventos_con_conflicto = [
                self.test_events[0]['id'],  # Ya lo tiene - CONFLICTO
                self.test_events[7]['id'] if len(self.test_events) > 7 else self.test_events[2]['id'],  # Nuevo - VÁLIDO
            ]
            
            user_existente['eventos_seleccionados'] = eventos_con_conflicto
            
            # Realizar petición
            response, performance_time = self.measure_performance(
                requests.post, f"{self.api_url}/registro", json=user_existente
            )
            test_result['performance_ms'] = performance_time * 1000
            
            # Validar respuesta API
            expected_structure = {
                'success': bool,
                'message': str,
                'eventos_agregados': list,
                'eventos_omitidos': list,
                'modo': str
            }
            
            api_validation = self.validate_api_response(response, expected_structure)
            test_result['api_validation'] = api_validation
            
            if response.status_code not in [200, 201]:
                test_result['errors'].append(f'Status code incorrecto: {response.status_code}')
                test_result['errors'].append(f'Response: {response.text}')
                return test_result
            
            response_data = response.json()
            
            # Verificar que hay eventos agregados y omitidos
            eventos_agregados = response_data.get('eventos_agregados', [])
            eventos_omitidos = response_data.get('eventos_omitidos', [])
            
            if len(eventos_agregados) != 1:
                test_result['errors'].append(f'Se esperaba 1 evento agregado, se obtuvieron {len(eventos_agregados)}')
            
            if len(eventos_omitidos) != 1:
                test_result['errors'].append(f'Se esperaba 1 evento omitido, se obtuvieron {len(eventos_omitidos)}')
            
            # Verificar que el evento omitido es el conflictivo
            if len(eventos_omitidos) > 0:
                evento_omitido = eventos_omitidos[0]
                if evento_omitido.get('id') != self.test_events[0]['id']:
                    test_result['errors'].append('El evento omitido no es el que se esperaba')
                
                if 'conflicto' not in evento_omitido.get('motivo', '').lower():
                    test_result['errors'].append('El motivo de omisión no indica conflicto')
            
            # Calcular eventos esperados finales
            eventos_base = [self.test_events[0]['id'], self.test_events[1]['id']]  # Originales del caso 2
            if len(self.test_events) > 7:
                eventos_base.extend([self.test_events[3]['id'], self.test_events[5]['id']])  # Del caso 2
                eventos_base.append(self.test_events[7]['id'])  # Nuevo agregado
            else:
                eventos_base.extend([self.test_events[3]['id'], self.test_events[5]['id']])  # Del caso 2
                eventos_base.append(self.test_events[2]['id'])  # Nuevo agregado
            
            eventos_esperados = list(set(eventos_base))  # Remover duplicados
            
            # Validar integridad de base de datos
            db_validation = self.validate_database_integrity(
                'Caso 3', eventos_esperados, user_existente['correo']
            )
            test_result['db_validation'] = db_validation
            
            if not db_validation['success']:
                test_result['errors'].append(f"Error en validación de BD: {db_validation.get('error', 'Unknown')}")
            
            # Determinar éxito del test
            test_result['success'] = (
                len(test_result['errors']) == 0 and
                api_validation['success'] and
                db_validation['success']
            )
            
            return test_result
            
        except Exception as e:
            test_result['errors'].append(f'Excepción durante el test: {str(e)}')
            test_result['errors'].append(f'Traceback: {traceback.format_exc()}')
            return test_result
    
    def test_caso_4_usuario_existente_todos_conflictos(self) -> Dict[str, Any]:
        """
        Caso 4: Usuario Existente - Todos Conflictos
        Debe rechazar todos los eventos por conflictos y mantener el registro original
        """
        print("\n🧪 Test Caso 4: Usuario Existente - Todos Conflictos")
        
        test_result = {
            'test_name': 'Caso 4: Usuario Existente - Todos Conflictos',
            'success': False,
            'errors': [],
            'performance_ms': 0,
            'db_validation': {},
            'api_validation': {}
        }
        
        try:
            # Obtener estado actual de eventos del usuario existente
            if not self.connect_db():
                test_result['errors'].append('No se pudo conectar a la BD para obtener estado actual')
                return test_result
            
            cursor = self.db_connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT eventos_seleccionados FROM expokossodo_registros 
                WHERE correo = %s
            """, (self.test_users['existente']['correo'],))
            
            registro_actual = cursor.fetchone()
            cursor.close()
            self.disconnect_db()
            
            if not registro_actual:
                test_result['errors'].append('Usuario existente no encontrado para test de conflictos')
                return test_result
            
            eventos_actuales = json.loads(registro_actual['eventos_seleccionados'] or '[]')
            
            # Preparar datos con todos conflictos (intentar re-registrar eventos que ya tiene)
            user_existente = self.test_users['existente'].copy()
            user_existente['eventos_seleccionados'] = eventos_actuales  # Mismos eventos que ya tiene
            
            # Realizar petición
            response, performance_time = self.measure_performance(
                requests.post, f"{self.api_url}/registro", json=user_existente
            )
            test_result['performance_ms'] = performance_time * 1000
            
            # Para este caso, esperamos un status 400 (Bad Request) porque no hay eventos válidos
            expected_structure = {
                'success': bool,
                'message': str,
                'eventos_agregados': list,
                'eventos_omitidos': list,
                'modo': str
            }
            
            api_validation = self.validate_api_response(response, expected_structure)
            test_result['api_validation'] = api_validation
            
            # Este caso debe retornar 400 porque no hay eventos válidos para agregar
            if response.status_code != 400:
                test_result['errors'].append(f'Status code incorrecto: esperado 400, obtenido {response.status_code}')
                test_result['errors'].append(f'Response: {response.text}')
                return test_result
            
            response_data = response.json()
            
            # Verificar que no hay eventos agregados
            eventos_agregados = response_data.get('eventos_agregados', [])
            if len(eventos_agregados) > 0:
                test_result['errors'].append(f'No se esperaban eventos agregados, se obtuvieron {len(eventos_agregados)}')
            
            # Debe haber eventos omitidos
            eventos_omitidos = response_data.get('eventos_omitidos', [])
            if len(eventos_omitidos) != len(eventos_actuales):
                test_result['errors'].append(f'Se esperaban {len(eventos_actuales)} eventos omitidos, se obtuvieron {len(eventos_omitidos)}')
            
            # Verificar que success es False
            if response_data.get('success', True):
                test_result['errors'].append('El campo success debería ser False cuando no se agregan eventos')
            
            # Verificar mensaje apropiado
            message = response_data.get('message', '').lower()
            if 'conflicto' not in message and 'sin cambios' not in message:
                test_result['errors'].append('El mensaje no indica apropiadamente el problema de conflictos')
            
            # Validar que la BD mantiene el estado original
            db_validation = self.validate_database_integrity(
                'Caso 4', eventos_actuales, user_existente['correo']
            )
            test_result['db_validation'] = db_validation
            
            if not db_validation['success']:
                test_result['errors'].append(f"Error en validación de BD: {db_validation.get('error', 'Unknown')}")
            
            # Determinar éxito del test
            test_result['success'] = (
                len(test_result['errors']) == 0 and
                api_validation['success'] and
                db_validation['success']
            )
            
            return test_result
            
        except Exception as e:
            test_result['errors'].append(f'Excepción durante el test: {str(e)}')
            test_result['errors'].append(f'Traceback: {traceback.format_exc()}')
            return test_result
    
    def run_full_test_suite(self) -> Dict[str, Any]:
        """
        Ejecutar suite completa de pruebas
        
        Returns:
            Dict con resultados completos de todos los tests
        """
        print("🚀 Iniciando Suite Completa de Testing del Sistema de Registro")
        print("=" * 70)
        
        suite_result = {
            'start_time': datetime.datetime.now().isoformat(),
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'total_performance_ms': 0,
            'average_performance_ms': 0,
            'test_results': [],
            'overall_success': False,
            'errors': []
        }
        
        try:
            # 1. Setup de datos de prueba
            if not self.setup_test_data():
                suite_result['errors'].append('Error en setup de datos de prueba')
                return suite_result
            
            # 2. Ejecutar casos de prueba en secuencia
            test_cases = [
                self.test_caso_1_usuario_nuevo,
                self.test_caso_2_usuario_existente_sin_conflictos,
                self.test_caso_3_usuario_existente_conflictos_parciales,
                self.test_caso_4_usuario_existente_todos_conflictos
            ]
            
            for test_func in test_cases:
                try:
                    result = test_func()
                    self.test_results.append(result)
                    suite_result['test_results'].append(result)
                    suite_result['tests_run'] += 1
                    
                    if result['success']:
                        suite_result['tests_passed'] += 1
                        print(f"✅ {result['test_name']} - PASSED ({result['performance_ms']:.2f}ms)")
                    else:
                        suite_result['tests_failed'] += 1
                        print(f"❌ {result['test_name']} - FAILED")
                        for error in result['errors']:
                            print(f"   💥 {error}")
                    
                    suite_result['total_performance_ms'] += result['performance_ms']
                    
                except Exception as e:
                    suite_result['tests_failed'] += 1
                    suite_result['errors'].append(f'Error ejecutando {test_func.__name__}: {str(e)}')
                    print(f"❌ Error ejecutando {test_func.__name__}: {e}")
            
            # 3. Calcular métricas finales
            if suite_result['tests_run'] > 0:
                suite_result['average_performance_ms'] = suite_result['total_performance_ms'] / suite_result['tests_run']
            
            suite_result['overall_success'] = suite_result['tests_failed'] == 0
            suite_result['end_time'] = datetime.datetime.now().isoformat()
            
            return suite_result
            
        except Exception as e:
            suite_result['errors'].append(f'Error crítico en suite de testing: {str(e)}')
            suite_result['end_time'] = datetime.datetime.now().isoformat()
            return suite_result
        
        finally:
            # 4. Cleanup (opcional en modo test)
            if self.test_mode:
                try:
                    self.cleanup_test_data()
                except Exception as e:
                    print(f"⚠️ Error durante cleanup: {e}")
    
    def generate_test_report(self, suite_result: Dict[str, Any]) -> str:
        """
        Generar reporte detallado de resultados de testing
        
        Args:
            suite_result: Resultados del suite de testing
        
        Returns:
            String con reporte formateado
        """
        report = []
        report.append("=" * 70)
        report.append("REPORTE DE TESTING - SISTEMA DE REGISTRO EXPOKOSSODO 2025")
        report.append("=" * 70)
        report.append(f"Fecha de ejecución: {suite_result['start_time']}")
        report.append(f"API URL: {self.api_url}")
        report.append(f"Modo de testing: {'Enabled' if self.test_mode else 'Disabled'}")
        report.append("")
        
        # Resumen ejecutivo
        report.append("📊 RESUMEN EJECUTIVO")
        report.append("-" * 20)
        report.append(f"Tests ejecutados: {suite_result['tests_run']}")
        report.append(f"Tests exitosos: {suite_result['tests_passed']}")
        report.append(f"Tests fallidos: {suite_result['tests_failed']}")
        report.append(f"Tasa de éxito: {(suite_result['tests_passed']/suite_result['tests_run']*100):.1f}%" if suite_result['tests_run'] > 0 else "0%")
        report.append(f"Performance promedio: {suite_result['average_performance_ms']:.2f}ms")
        report.append(f"Estado general: {'✅ EXITOSO' if suite_result['overall_success'] else '❌ FALLIDO'}")
        report.append("")
        
        # Detalles por test
        report.append("🔍 DETALLES POR TEST")
        report.append("-" * 20)
        
        for test_result in suite_result['test_results']:
            report.append(f"\n🧪 {test_result['test_name']}")
            report.append(f"Estado: {'✅ PASSED' if test_result['success'] else '❌ FAILED'}")
            report.append(f"Performance: {test_result['performance_ms']:.2f}ms")
            
            # API Validation
            api_val = test_result['api_validation']
            report.append(f"Validación API: {'✅' if api_val.get('success') else '❌'}")
            if api_val.get('errors'):
                for error in api_val['errors']:
                    report.append(f"  🔸 {error}")
            
            # DB Validation
            db_val = test_result['db_validation']
            report.append(f"Validación BD: {'✅' if db_val.get('success') else '❌'}")
            if not db_val.get('success') and db_val.get('error'):
                report.append(f"  🔸 {db_val['error']}")
            
            # Errores del test
            if test_result['errors']:
                report.append("Errores:")
                for error in test_result['errors']:
                    report.append(f"  💥 {error}")
        
        # Análisis de integridad de datos
        report.append("\n🔐 ANÁLISIS DE INTEGRIDAD DE DATOS")
        report.append("-" * 30)
        
        integrity_issues = []
        for test_result in suite_result['test_results']:
            db_val = test_result.get('db_validation', {})
            if not db_val.get('json_consistent', True):
                integrity_issues.append(f"{test_result['test_name']}: Inconsistencia en eventos_seleccionados JSON")
            if not db_val.get('relations_consistent', True):
                integrity_issues.append(f"{test_result['test_name']}: Inconsistencia en relaciones de BD")
            if not db_val.get('json_relations_match', True):
                integrity_issues.append(f"{test_result['test_name']}: JSON no coincide con relaciones")
        
        if integrity_issues:
            report.append("❌ Se encontraron problemas de integridad:")
            for issue in integrity_issues:
                report.append(f"  🔸 {issue}")
        else:
            report.append("✅ Todos los tests mantuvieron integridad de datos")
        
        # Análisis de performance
        report.append("\n⚡ ANÁLISIS DE PERFORMANCE")
        report.append("-" * 25)
        
        performances = [t['performance_ms'] for t in suite_result['test_results']]
        if performances:
            report.append(f"Tiempo mínimo: {min(performances):.2f}ms")
            report.append(f"Tiempo máximo: {max(performances):.2f}ms")
            report.append(f"Tiempo promedio: {sum(performances)/len(performances):.2f}ms")
            
            # Alerta si hay performance issues
            slow_tests = [t for t in suite_result['test_results'] if t['performance_ms'] > 2000]
            if slow_tests:
                report.append("⚠️ Tests lentos (>2s):")
                for test in slow_tests:
                    report.append(f"  🐌 {test['test_name']}: {test['performance_ms']:.2f}ms")
        
        # Errores del suite
        if suite_result['errors']:
            report.append("\n❌ ERRORES DEL SUITE")
            report.append("-" * 20)
            for error in suite_result['errors']:
                report.append(f"💥 {error}")
        
        # Recomendaciones
        report.append("\n💡 RECOMENDACIONES")
        report.append("-" * 15)
        
        if suite_result['overall_success']:
            report.append("✅ El sistema de registro está funcionando correctamente")
            report.append("✅ Todas las validaciones de integridad pasaron")
            report.append("✅ Los casos de conflicto se manejan apropiadamente")
        else:
            report.append("❌ Se requiere atención en las áreas fallidas")
            report.append("🔧 Revisar logs detallados para troubleshooting")
            
        if suite_result['average_performance_ms'] > 1500:
            report.append("⚠️ Considerar optimización de performance")
        
        report.append("")
        report.append("=" * 70)
        report.append(f"Reporte generado: {datetime.datetime.now().isoformat()}")
        report.append("=" * 70)
        
        return "\n".join(report)

def main():
    """Función principal para ejecutar el testing"""
    print("🎯 ExpoKossodo 2025 - Registro System Tester")
    print("Basado en especificaciones de registro-system-tester.md")
    print()
    
    # Configuración
    api_url = os.getenv('TEST_API_URL', 'http://localhost:5000/api')
    test_mode = os.getenv('TEST_MODE', 'true').lower() == 'true'
    
    # Inicializar tester
    tester = RegistroSystemTester(api_url=api_url, test_mode=test_mode)
    
    try:
        # Ejecutar suite completa
        suite_result = tester.run_full_test_suite()
        
        # Generar y mostrar reporte
        report = tester.generate_test_report(suite_result)
        print(report)
        
        # Guardar reporte en archivo
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"test_report_registro_system_{timestamp}.txt"
        
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📄 Reporte guardado en: {report_filename}")
        
        # Exit code basado en resultados
        exit_code = 0 if suite_result['overall_success'] else 1
        return exit_code
        
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrumpido por el usuario")
        return 1
    except Exception as e:
        print(f"\n❌ Error crítico durante testing: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)