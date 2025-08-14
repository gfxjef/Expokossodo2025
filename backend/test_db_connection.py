#!/usr/bin/env python3
"""
Script de prueba de conexión a base de datos MySQL
Verifica conectividad, latencia y permisos
"""

import mysql.connector
from mysql.connector import Error
import socket
import time
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'to1.fcomet.com'),
    'database': os.getenv('DB_NAME', 'atusalud_kossomet'),
    'user': os.getenv('DB_USER', 'atusalud_atusalud'),
    'password': os.getenv('DB_PASSWORD', 'kmachin1'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def test_dns_resolution():
    """Prueba resolución DNS del host"""
    print("\n1. PRUEBA DE RESOLUCIÓN DNS")
    print("-" * 40)
    try:
        ip = socket.gethostbyname(DB_CONFIG['host'])
        print(f"[OK] Host {DB_CONFIG['host']} resuelve a IP: {ip}")
        return True
    except socket.gaierror as e:
        print(f"[ERROR] Error resolviendo DNS: {e}")
        return False

def test_port_connectivity():
    """Prueba conectividad al puerto MySQL"""
    print("\n2. PRUEBA DE CONECTIVIDAD AL PUERTO")
    print("-" * 40)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((DB_CONFIG['host'], DB_CONFIG['port']))
        sock.close()
        
        if result == 0:
            print(f"[OK] Puerto {DB_CONFIG['port']} está abierto en {DB_CONFIG['host']}")
            return True
        else:
            print(f"[ERROR] Puerto {DB_CONFIG['port']} está cerrado o bloqueado")
            print(f"  Código de error: {result}")
            return False
    except Exception as e:
        print(f"[ERROR] Error probando conectividad: {e}")
        return False

def test_mysql_connection():
    """Prueba conexión MySQL con credenciales"""
    print("\n3. PRUEBA DE CONEXIÓN MySQL")
    print("-" * 40)
    
    try:
        print(f"Intentando conectar a {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
        
        # Intentar conexión con diferentes timeouts
        for timeout in [5, 10, 20]:
            try:
                print(f"\nIntentando con timeout de {timeout} segundos...")
                connection = mysql.connector.connect(
                    host=DB_CONFIG['host'],
                    database=DB_CONFIG['database'],
                    user=DB_CONFIG['user'],
                    password=DB_CONFIG['password'],
                    port=DB_CONFIG['port'],
                    connection_timeout=timeout,
                    autocommit=True,
                    use_pure=True  # Usar implementación Python pura
                )
                
                if connection.is_connected():
                    print(f"[OK] Conexión exitosa con timeout de {timeout}s")
                    
                    # Obtener información del servidor
                    cursor = connection.cursor()
                    cursor.execute("SELECT VERSION()")
                    version = cursor.fetchone()
                    print(f"[OK] Versión de MySQL: {version[0]}")
                    
                    # Verificar privilegios
                    cursor.execute("SHOW GRANTS FOR CURRENT_USER()")
                    grants = cursor.fetchall()
                    print("\n[OK] Privilegios del usuario:")
                    for grant in grants:
                        print(f"  - {grant[0][:100]}...")
                    
                    # Listar tablas
                    cursor.execute("SHOW TABLES")
                    tables = cursor.fetchall()
                    print(f"\n[OK] Tablas encontradas: {len(tables)}")
                    if tables:
                        print("  Primeras 5 tablas:")
                        for i, table in enumerate(tables[:5]):
                            print(f"    - {table[0]}")
                    
                    cursor.close()
                    connection.close()
                    return True
                    
            except Error as e:
                if "2003" in str(e):
                    print(f"[ERROR] No se puede conectar al servidor MySQL (timeout {timeout}s)")
                elif "1045" in str(e):
                    print(f"[ERROR] Acceso denegado - credenciales incorrectas")
                elif "1049" in str(e):
                    print(f"[ERROR] Base de datos '{DB_CONFIG['database']}' no existe")
                else:
                    print(f"[ERROR] Error: {e}")
                continue
                
    except Exception as e:
        print(f"[ERROR] Error inesperado: {e}")
        return False
    
    return False

def test_alternative_connection():
    """Prueba conexión sin especificar base de datos"""
    print("\n4. PRUEBA DE CONEXIÓN ALTERNATIVA (sin DB)")
    print("-" * 40)
    
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port'],
            connection_timeout=10
        )
        
        if connection.is_connected():
            print("[OK] Conexión exitosa sin especificar base de datos")
            
            cursor = connection.cursor()
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            print(f"\n[OK] Bases de datos disponibles: {len(databases)}")
            for db in databases:
                if 'kossodo' in db[0].lower() or 'atusalud' in db[0].lower():
                    print(f"    - {db[0]} <-- Relacionada con el proyecto")
                    
            cursor.close()
            connection.close()
            return True
            
    except Error as e:
        print(f"✗ Error: {e}")
        return False

def main():
    print("=" * 50)
    print("DIAGNÓSTICO DE CONEXIÓN A BASE DE DATOS MySQL")
    print("=" * 50)
    
    print("\nCONFIGURACIÓN ACTUAL:")
    print(f"  Host: {DB_CONFIG['host']}")
    print(f"  Puerto: {DB_CONFIG['port']}")
    print(f"  Usuario: {DB_CONFIG['user']}")
    print(f"  Base de datos: {DB_CONFIG['database']}")
    print(f"  Password: {'*' * len(DB_CONFIG['password'])}")
    
    # Ejecutar pruebas
    dns_ok = test_dns_resolution()
    
    if dns_ok:
        port_ok = test_port_connectivity()
        
        if port_ok:
            mysql_ok = test_mysql_connection()
            
            if not mysql_ok:
                test_alternative_connection()
    
    # Resumen
    print("\n" + "=" * 50)
    print("RESUMEN Y RECOMENDACIONES")
    print("=" * 50)
    
    if not dns_ok:
        print("\n[ADVERTENCIA] PROBLEMA: No se puede resolver el host")
        print("   SOLUCIONES:")
        print("   1. Verificar conexión a internet")
        print("   2. Verificar que el host 'to1.fcomet.com' sea correcto")
        print("   3. Probar con nslookup to1.fcomet.com")
        
    elif not port_ok:
        print("\n[ADVERTENCIA] PROBLEMA: Puerto MySQL no accesible")
        print("   POSIBLES CAUSAS:")
        print("   1. Firewall bloqueando puerto 3306")
        print("   2. Servidor MySQL no acepta conexiones remotas")
        print("   3. ISP bloqueando puerto 3306")
        print("   SOLUCIONES:")
        print("   1. Contactar al proveedor de hosting")
        print("   2. Verificar reglas de firewall del servidor")
        print("   3. Considerar usar túnel SSH o VPN")
        
    else:
        print("\n[OK] Diagnóstico completado")

if __name__ == "__main__":
    main()