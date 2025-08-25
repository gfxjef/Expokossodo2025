"""
Script para crear impresora Generic/Text Only que bypasee drivers
"""
import subprocess
import time

print("=== CREANDO IMPRESORA RAW PARA 4BARCODE ===")

# 1. Obtener puerto de la impresora actual
print("1. Verificando puerto de 4BARCODE...")
cmd_port = 'wmic printer where "name=\'4BARCODE 3B-303B\'" get portname'
result = subprocess.run(cmd_port, shell=True, capture_output=True, text=True)
print("Información de puerto:")
print(result.stdout)

# 2. Listar puertos disponibles
print("\n2. Puertos disponibles:")
cmd_ports = 'wmic path win32_tcpipprinterport get name,hostaddress || wmic path win32_serialport get deviceid || echo "Puertos USB: USB001, USB002, etc"'
result = subprocess.run(cmd_ports, shell=True, capture_output=True, text=True)
print(result.stdout)

print("\n=== INSTRUCCIONES MANUALES ===")
print("Para crear impresora RAW que funcione:")
print()
print("1. Ir a 'Configuración' > 'Impresoras y escáneres'")
print("2. Click 'Agregar impresora o escáner'")
print("3. Click 'La impresora que busco no está en la lista'")
print("4. Seleccionar 'Agregar una impresora local o de red con configuración manual'")
print("5. Usar puerto existente: USB001 (o el que use 4BARCODE)")
print("6. Fabricante: 'Generic'")
print("7. Impresora: 'Generic / Text Only'")
print("8. Nombre: '4BARCODE_RAW'")
print("9. NO compartir")
print("10. NO imprimir página de prueba")
print()
print("Luego ejecutar: python test_raw_printer.py")

# Crear script de prueba para la nueva impresora
test_script = '''"""
Prueba con impresora Generic/Text Only
"""
import subprocess
import tempfile

PRINTER_RAW = "4BARCODE_RAW"  # Cambiar por el nombre que pongas

def test_raw_printer():
    # TSPL simple
    tspl = "SIZE 50 mm,50 mm\\r\\nCLS\\r\\nTEXT 100,100,\\"2\\",0,1,1,\\"RAW OK\\"\\r\\nPRINT 1,1\\r\\n"
    
    try:
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.prn') as f:
            f.write(tspl)
            temp_file = f.name
        
        cmd = f'copy /b "{temp_file}" "{PRINTER_RAW}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if "1 file(s) copied" in result.stdout:
            print("[OK] Enviado a impresora RAW")
            print("Si imprime 'RAW OK', la impresora Generic funciona")
        else:
            print(f"[ERROR] {result.stderr}")
            
        import os
        os.remove(temp_file)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_raw_printer()
'''

with open('test_raw_printer.py', 'w') as f:
    f.write(test_script)

print("Script 'test_raw_printer.py' creado.")
print("\nDespués de crear la impresora Generic, ejecuta:")
print("python test_raw_printer.py")