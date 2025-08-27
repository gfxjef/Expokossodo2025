
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def analizar_nombres_charlas():
    """
    Se conecta a la BD y obtiene los nombres de las charlas desde 'fb_leads' 
    y 'expokossodo_eventos' para facilitar su comparación y posterior match.
    """
    connection = None
    cursor = None
    try:
        # Conexión a la base de datos usando variables de entorno
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT', 3306))
        )

        if connection.is_connected():
            print("[OK] Conexión a la base de datos exitosa.")
            cursor = connection.cursor(dictionary=True)

            # 1. Obtener nombres de anuncios de la tabla fb_leads
            print("\n--- Nombres de anuncios (posibles charlas) en 'fb_leads' ---")
            query_leads = "SELECT DISTINCT ad_name, sala FROM fb_leads ORDER BY sala, ad_name LIMIT 100"
            cursor.execute(query_leads)
            lead_ad_names = cursor.fetchall()

            if lead_ad_names:
                print(f"Mostrando {len(lead_ad_names)} nombres de anuncios distintos encontrados:")
                print("-" * 80)
                print(f"{ 'SALA':<8} | {'NOMBRE DEL ANUNCIO EN FACEBOOK (ad_name)'}")
                print("-" * 80)
                for row in lead_ad_names:
                    print(f"{row['sala']:<8} | {row['ad_name']}")
                print("-" * 80)
            else:
                print("[AVISO] No se encontraron registros en 'fb_leads'.")

            # 2. Obtener títulos oficiales de la tabla expokossodo_eventos
            print("\n\n--- Títulos oficiales de las charlas en 'expokossodo_eventos' ---")
            query_eventos = "SELECT id, titulo_charla, sala FROM expokossodo_eventos ORDER BY sala, titulo_charla"
            cursor.execute(query_eventos)
            eventos = cursor.fetchall()

            if eventos:
                print(f"Mostrando {len(eventos)} eventos encontrados:")
                print("-" * 80)
                print(f"{ 'ID':<5} | {'SALA':<8} | {'TÍTULO OFICIAL DE LA CHARLA'}")
                print("-" * 80)
                for evento in eventos:
                    print(f"{evento['id']:<5} | {evento['sala']:<8} | {evento['titulo_charla']}")
                print("-" * 80)
            else:
                print("[AVISO] No se encontraron eventos en 'expokossodo_eventos'.")

    except Error as e:
        print(f"\n[ERROR] Ocurrió un error durante la ejecución: {e}")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("\n[INFO] Conexión a la base de datos cerrada.")

if __name__ == '__main__':
    analizar_nombres_charlas()
