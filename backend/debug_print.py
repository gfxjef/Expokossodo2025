"""
Debug: Probar qué método SÍ imprime en la 4BARCODE 3B-303B
"""
import subprocess
import tempfile
import os
import time

PRINTER_NAME = "4BARCODE 3B-303B"

print("=== DIAGNÓSTICO DE IMPRESIÓN 4BARCODE 3B-303B ===")
print()

# TEST 1: ESC/POS simple
print("TEST 1: ESC/POS básico")
escpos_data = b'\x1b@Hello World\nTEST\n\n\n'
try:
    with tempfile.NamedTemporaryFile(mode='wb', delete=False) as f:
        f.write(escpos_data)
        temp1 = f.name
    
    cmd = f'copy /b "{temp1}" "{PRINTER_NAME}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"   Enviado ESC/POS: {result.returncode == 0}")
    print(f"   Salida: {result.stdout.strip()}")
    os.remove(temp1)
    time.sleep(2)
except Exception as e:
    print(f"   Error: {e}")

print()

# TEST 2: TSPL con terminadores correctos
print("TEST 2: TSPL con \\r\\n")
tspl_data = "SIZE 50 mm,50 mm\r\nCLS\r\nTEXT 100,100,\"2\",0,1,1,\"TSPL TEST\"\r\nPRINT 1,1\r\n"
try:
    with tempfile.NamedTemporaryFile(mode='wb', delete=False) as f:
        f.write(tspl_data.encode('utf-8'))
        temp2 = f.name
    
    cmd = f'copy /b "{temp2}" "{PRINTER_NAME}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"   Enviado TSPL: {result.returncode == 0}")
    print(f"   Salida: {result.stdout.strip()}")
    os.remove(temp2)
    time.sleep(2)
except Exception as e:
    print(f"   Error: {e}")

print()

# TEST 3: Comando de reset para cambiar modo
print("TEST 3: Reset + cambio de modo")
reset_cmds = [
    b'\x1b\x40',  # ESC @ reset
    b'~SD\r\n',   # Set TSPL mode
    'SIZE 50 mm,50 mm\r\nCLS\r\nTEXT 100,100,"2",0,1,1,"RESET TEST"\r\nPRINT 1,1\r\n'.encode('utf-8')
]

for i, cmd_data in enumerate(reset_cmds):
    try:
        with tempfile.NamedTemporaryFile(mode='wb', delete=False) as f:
            f.write(cmd_data)
            temp = f.name
        
        cmd = f'copy /b "{temp}" "{PRINTER_NAME}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        print(f"   Comando {i+1}: {'OK' if result.returncode == 0 else 'FAIL'}")
        os.remove(temp)
        time.sleep(1)
    except Exception as e:
        print(f"   Error comando {i+1}: {e}")

print()

# TEST 4: ZPL (otro lenguaje común)
print("TEST 4: ZPL básico")
zpl_data = "^XA^FO50,50^AD^FDZPL TEST^FS^XZ"
try:
    with tempfile.NamedTemporaryFile(mode='wb', delete=False) as f:
        f.write(zpl_data.encode('utf-8'))
        temp4 = f.name
    
    cmd = f'copy /b "{temp4}" "{PRINTER_NAME}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"   Enviado ZPL: {result.returncode == 0}")
    print(f"   Salida: {result.stdout.strip()}")
    os.remove(temp4)
except Exception as e:
    print(f"   Error: {e}")

print()
print("=== RESULTADOS ===")
print("Revisa cuál de los 4 tests imprimió algo:")
print("1. ESC/POS: Texto simple 'Hello World'")
print("2. TSPL: 'TSPL TEST'")
print("3. Reset: 'RESET TEST'")
print("4. ZPL: 'ZPL TEST'")
print()
print("El que funcione nos dirá qué lenguaje usar.")