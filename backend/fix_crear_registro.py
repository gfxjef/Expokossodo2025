#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Archivo con la función crear_registro corregida para reemplazar en app.py
Corrige el error 500 causado por "Unread result found" en MySQL
"""

def validar_conflictos_horario(eventos_inscritos, eventos_nuevos, cursor):
    """
    Valida conflictos de horario entre eventos existentes y nuevos
    
    CORREGIDO: Consumir todos los resultados del cursor antes de ejecutar nueva query
    """
    # Crear mapa de horarios ocupados
    horarios_ocupados = {}
    for evento in eventos_inscritos:
        evento_id, fecha, hora = evento['id'], evento['fecha'], evento['hora']
        # Manejar fecha como string si ya viene como string
        if isinstance(fecha, str):
            fecha_str = fecha
        else:
            fecha_str = fecha.strftime('%Y-%m-%d')
        
        if fecha_str not in horarios_ocupados:
            horarios_ocupados[fecha_str] = set()
        horarios_ocupados[fecha_str].add(str(hora))  # Asegurar que hora sea string
    
    # Validar eventos nuevos
    eventos_validos = []
    eventos_conflictivos = []
    
    if eventos_nuevos:
        placeholders = ','.join(['%s'] * len(eventos_nuevos))
        cursor.execute(f"""
            SELECT id, fecha, hora, titulo_charla, sala, slots_disponibles, slots_ocupados
            FROM expokossodo_eventos 
            WHERE id IN ({placeholders})
        """, eventos_nuevos)
        
        # IMPORTANTE: Consumir todos los resultados de una vez
        eventos_nuevos_detalles = cursor.fetchall()
        
        for evento in eventos_nuevos_detalles:
            evento_id = evento['id']
            fecha = evento['fecha']
            hora = evento['hora']
            titulo = evento['titulo_charla']
            sala = evento['sala']
            slots_disponibles = evento['slots_disponibles']
            slots_ocupados = evento['slots_ocupados']
            
            # Manejar fecha como string si es necesario
            if isinstance(fecha, str):
                fecha_str = fecha
            else:
                fecha_str = fecha.strftime('%Y-%m-%d')
            
            hora_str = str(hora)  # Asegurar que hora sea string
            
            # Verificar conflictos
            if (fecha_str in horarios_ocupados and 
                hora_str in horarios_ocupados[fecha_str]):
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo_charla': titulo,
                    'sala': sala,
                    'fecha': fecha_str,
                    'hora': hora_str,
                    'motivo': f'Conflicto de horario: ya tienes un evento registrado a las {hora_str} el {fecha_str}'
                })
            elif slots_ocupados >= slots_disponibles:
                eventos_conflictivos.append({
                    'id': evento_id,
                    'titulo_charla': titulo,
                    'sala': sala,
                    'fecha': fecha_str,
                    'hora': hora_str,
                    'motivo': f'Evento lleno: {slots_ocupados}/{slots_disponibles} cupos ocupados'
                })
            else:
                eventos_validos.append(evento_id)
    
    return eventos_validos, eventos_conflictivos


def obtener_eventos_usuario(registro_id, cursor):
    """
    Obtiene los eventos actuales de un usuario registrado
    
    CORREGIDO: Consumir todos los resultados inmediatamente
    """
    cursor.execute("""
        SELECT e.id, e.fecha, e.hora, e.titulo_charla, e.sala
        FROM expokossodo_eventos e
        INNER JOIN expokossodo_registro_eventos re ON e.id = re.evento_id
        WHERE re.registro_id = %s
        ORDER BY e.fecha, e.hora
    """, (registro_id,))
    
    # Consumir todos los resultados inmediatamente
    resultados = cursor.fetchall()
    return resultados


# NOTA IMPORTANTE PARA LA CORRECCIÓN EN app.py:
# 
# El problema principal está en el uso del cursor con dictionary=True
# y múltiples queries sin consumir todos los resultados.
# 
# Cambios necesarios en crear_registro():
# 
# 1. En la línea donde se verifica si existe relación (alrededor de línea 1669):
#    Cambiar el COUNT(*) por una verificación más simple
# 
# 2. Asegurarse de consumir todos los fetchone() y fetchall() antes de ejecutar
#    otra query
# 
# 3. Considerar usar buffered=True en el cursor si el problema persiste

print("""
CORRECCIONES NECESARIAS EN app.py:

1. En la función validar_conflictos_horario():
   - Línea ~1460: Manejar fecha como string si es necesario
   - Línea ~1487: Usar isinstance(fecha, str) para verificar tipo
   
2. En la función crear_registro():
   - Línea ~1560: Cambiar a cursor = connection.cursor(dictionary=True, buffered=True)
   - Línea ~1668-1673: Simplificar la verificación de existencia:
   
   En lugar de:
   ```python
   cursor.execute("SELECT COUNT(*) as count FROM ...")
   if cursor.fetchone()['count'] == 0:
   ```
   
   Usar:
   ```python
   cursor.execute("SELECT 1 FROM expokossodo_registro_eventos WHERE registro_id = %s AND evento_id = %s LIMIT 1", 
                  (registro_id, evento_id))
   existe = cursor.fetchone()
   if not existe:
   ```

3. Asegurarse de que todos los fetchone() y fetchall() se consuman completamente
   antes de ejecutar la siguiente query.
""")