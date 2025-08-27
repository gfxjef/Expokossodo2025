import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import re

# Cargar variables de entorno
load_dotenv()

def normalize_by_45_char(title):
    """Limpia sufijos y corta a 45 caracteres."""
    if not title: return ""
    cleaned = re.sub(r'\s*-\s*copia.*$', '', title.strip(), flags=re.IGNORECASE)
    return cleaned[:45].lower()

def normalize_by_colon(title):
    """Toma el texto antes de los dos puntos y lo limpia."""
    if not title: return ""
    if ':' in title:
        return title.split(':')[0].strip().lower()
    return None # Devuelve None si no hay dos puntos

def match_leads_with_two_steps():
    """
    Realiza un match en dos fases para encontrar el ID de evento para los primeros 20 leads.
    """
    date_map = {'dia 1': '2025-09-02', 'dia 2': '2025-09-03', 'dia 3': '2025-09-04'}
    sala_map = {'s1': 'sala1', 's2': 'sala2', 's3': 'sala3', 's4': 'sala4'}

    connection = None
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'), database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        cursor = connection.cursor(dictionary=True)

        # --- CAMBIO AQUÍ: Aumentado el límite a 20 ---
        cursor.execute("SELECT id, ad_name, adset_name, sala FROM fb_leads LIMIT 20")
        leads_to_check = cursor.fetchall()
        cursor.execute("SELECT id, titulo_charla, fecha, sala FROM expokossodo_eventos")
        all_events = cursor.fetchall()

        print(f"[INFO] Iniciando análisis de match para los primeros {len(leads_to_check)} leads...")
        print("-" * 180)

        final_report = []
        for lead in leads_to_check:
            target_date = date_map.get(lead['adset_name'].lower() if lead['adset_name'] else '')
            target_sala = sala_map.get(lead['sala'].lower() if lead['sala'] else '')
            
            match_result = "NO ENCONTRADO"
            match_method = "N/A"

            if not target_date or not target_sala:
                match_result = f"ERROR: No se pudo mapear Día o Sala"
            else:
                # Intento #1: 45 Caracteres
                normalized_lead_title_45 = normalize_by_45_char(lead['ad_name'])
                found_events_45 = []
                for event in all_events:
                    if (target_date == (event['fecha'].strftime('%Y-%m-%d') if event['fecha'] else '') and
                        target_sala == event['sala'] and
                        normalized_lead_title_45 == normalize_by_45_char(event['titulo_charla'])):
                        found_events_45.append(f"ID: {event['id']} - {event['titulo_charla']}")
                
                if len(found_events_45) == 1:
                    match_result = found_events_45[0]
                    match_method = "45 Caracteres"
                
                # Intento #2: Dos Puntos (si el #1 falló)
                if not match_method.startswith("45"):
                    normalized_lead_title_colon = normalize_by_colon(lead['ad_name'])
                    if normalized_lead_title_colon:
                        found_events_colon = []
                        for event in all_events:
                            normalized_event_title_colon = normalize_by_colon(event['titulo_charla'])
                            if (normalized_event_title_colon and
                                target_date == (event['fecha'].strftime('%Y-%m-%d') if event['fecha'] else '') and
                                target_sala == event['sala'] and
                                normalized_lead_title_colon == normalized_event_title_colon):
                                found_events_colon.append(f"ID: {event['id']} - {event['titulo_charla']}")
                        
                        if len(found_events_colon) == 1:
                            match_result = found_events_colon[0]
                            match_method = "Dos Puntos"

            final_report.append({
                "lead_id": lead['id'],
                "lead_ad_name": lead['ad_name'],
                "match_result": match_result,
                "match_method": match_method
            })

        # Imprimir reporte
        print(f"{ 'LEAD ID':<18} | {'NOMBRE DEL ANUNCIO (LEAD)':<70} | {'EVENTO ENCONTRADO (MATCH)':<70} | {'MÉTODO'}")
        print("-" * 180)
        for item in final_report:
            print(f"{item['lead_id']:<18} | {item['lead_ad_name']:<70} | {item['match_result']:<70} | {item['match_method']}")
        print("-" * 180)

    except Error as e:
        print(f"\n[ERROR] Ocurrió un error en la base de datos: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("\n[INFO] Conexión a la base de datos cerrada.")

if __name__ == '__main__':
    match_leads_with_two_steps()
