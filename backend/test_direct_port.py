"""
Prueba enviando directamente al puerto de la impresora
"""
import subprocess

PRINTER_NAME = "4BARCODE 3B-303B"

# Comandos TSPL compactos
tspl_commands = """SIZE 50 mm,50 mm
CLS
TEXT 200,50,"2",0,1,1,"TEST API"
TEXT 200,100,"1",0,1,1,"EXPOKOSSODO"
QRCODE 150,150,"L",4,"A",0,"TEST123"
PRINT 1,1
"""

# Crear archivo temporal y enviarlo usando echo + copy
try:
    # Método usando echo y redireccionamiento
    cmd_parts = [
        'cmd', '/c',
        f'echo {tspl_commands.replace(chr(10), " & echo ")} | clip && clip | copy con "{PRINTER_NAME}"'
    ]
    
    # Intentar con redirección directa
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.prn') as f:
        f.write(tspl_commands)
        temp_file = f.name
    
    # Usar type + copy para envío RAW
    cmd = f'type "{temp_file}" | copy con "{PRINTER_NAME}" /b'
    print(f"Ejecutando: {cmd}")
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"Resultado: {result.returncode}")
    print(f"Salida: {result.stdout}")
    print(f"Error: {result.stderr}")
    
    import os
    os.remove(temp_file)
    
except Exception as e:
    print(f"Error: {e}")

print("Revisa si se imprimió")