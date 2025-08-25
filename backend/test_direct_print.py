"""
Prueba directa usando el método que sí funcionó
"""
import subprocess
import tempfile
import os

PRINTER_NAME = "4BARCODE 3B-303B"

# Comandos TSPL que sabemos que funcionan
tspl_commands = """SIZE 50 mm, 50 mm
GAP 2 mm, 0 mm
SPEED 3
DENSITY 8
DIRECTION 1
REFERENCE 0,0
CLS
TEXT 200,30,"3",0,1,1,"EXPOKOSSODO 2025"
TEXT 200,100,"2",0,1,1,"JEFFERSON CAMACHO"
TEXT 200,130,"1",0,1,1,"A TU SALUD"
TEXT 200,160,"1",0,1,1,"ADMIN"
QRCODE 150,200,"L",4,"A",0,"JEF|938101013|ADMIN|ATUSALUD|123456"
TEXT 200,350,"0",0,1,1,"25/08 15:25"
PRINT 1,1
"""

print(f"Enviando a: {PRINTER_NAME}")

# Método 1: Archivo temporal + print
try:
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
        f.write(tspl_commands)
        temp_file = f.name
    
    cmd = f'print /D:"{PRINTER_NAME}" "{temp_file}"'
    print(f"Comando: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"Salida: {result.stdout}")
    print(f"Error: {result.stderr}")
    print(f"Código: {result.returncode}")
    
    os.remove(temp_file)
    print("[OK] Enviado con print")
except Exception as e:
    print(f"[ERROR] Método 1: {e}")

# Método 2: PowerShell
try:
    ps_script = f"""
$printer = "{PRINTER_NAME}"
$data = @'
{tspl_commands}
'@
$bytes = [System.Text.Encoding]::UTF8.GetBytes($data)
$printerPath = "\\\\$env:COMPUTERNAME\\$printer"
[System.IO.File]::WriteAllBytes("temp.prn", $bytes)
Copy-Item -Path "temp.prn" -Destination $printerPath -Force
Remove-Item "temp.prn"
"""
    
    result = subprocess.run(['powershell', '-Command', ps_script], capture_output=True, text=True)
    if result.returncode == 0:
        print("[OK] Enviado con PowerShell")
    else:
        print(f"[ERROR] PowerShell: {result.stderr}")
except Exception as e:
    print(f"[ERROR] Método 2: {e}")

print("\nRevisa si imprimió la etiqueta")