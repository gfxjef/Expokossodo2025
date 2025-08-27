
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import json

# Cargar variables de entorno desde .env
load_dotenv()

def analizar_fb_leads():
    """
    Se conecta a la base de datos y obtiene los primeros 15 registros
    de la tabla fb_leads para su análisis.
    """
    connection = None
    cursor = None
    try:
        # Usar las variables de entorno para la conexión
        print("[INFO] Intentando conectar a la base de datos...")
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT', 3306))
        )

        if connection.is_connected():
            print("[OK] Conexión exitosa a la base de datos.")
            cursor = connection.cursor(dictionary=True)
            
            # Query para obtener los 15 primeros registros de fb_leads
            query = "SELECT * FROM fb_leads LIMIT 15"
            
            print(f"[INFO] Ejecutando consulta: {query}")
            cursor.execute(query)
            
            records = cursor.fetchall()
            
            if not records:
                print("\n[WARN] No se encontraron registros en la tabla 'fb_leads'.")
                return

            print("\n--- Mostrando los primeros 15 registros de 'fb_leads' ---")
            for i, record in enumerate(records):
                print(f"\n--- Registro #{i+1} ---")
                for key, value in record.items():
                    # Decodificar bytes y manejar JSON de forma segura
                    val_str = value
                    if isinstance(value, bytearray):
                        try:
                            val_str = value.decode('utf-8')
                        except UnicodeDecodeError:
                            val_str = repr(value) # Mostrar representación si no es utf-8
                    
                    # Intentar formatear si es un string JSON
                    if isinstance(val_str, str) and (val_str.startswith('{') or val_str.startswith('[')):
                        try:
                            parsed_json = json.loads(val_str)
                            print(f"  {key}:")
                            print(json.dumps(parsed_json, indent=2, ensure_ascii=False))
                        except json.JSONDecodeError:
                            print(f"  {key}: {val_str}") # Imprimir como texto si no es JSON válido
                    else:
                        print(f"  {key}: {val_str}")

            print("\n----------------------------------------------------")

    except Error as e:
        print(f"\n[ERROR] No se pudo conectar o consultar la base de datos.")
        print(f"Detalles del error: {e}")
        print("\nPor favor, verifica lo siguiente:")
        print("1. Que la tabla 'fb_leads' exista en la base de datos.")
        print("2. Que las credenciales en tu archivo .env son correctas y tienen permisos.")
        print("3. Que el servidor de la base de datos es accesible (firewall, etc.).")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("\n[INFO] Conexión a la base de datos cerrada.")

if __name__ == '__main__':
    analizar_fb_leads()
