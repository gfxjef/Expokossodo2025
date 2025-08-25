"""
Prueba específica para corregir renderizado de QR en 4BARCODE
Prueba diferentes sintaxis de comando QRCODE en TSPL
"""
import win32print

PRINTER_NAME = "4BARCODE 3B-303B"

def send_raw(printer_name, data, job_name="QR Fix Test"):
    h = win32print.OpenPrinter(printer_name)
    try:
        docinfo = (job_name, None, "RAW")
        win32print.StartDocPrinter(h, 1, docinfo)
        win32print.StartPagePrinter(h)
        win32print.WritePrinter(h, data)
        win32print.EndPagePrinter(h)
        win32print.EndDocPrinter(h)
    finally:
        win32print.ClosePrinter(h)

# QR text de prueba (mismo formato que usa la app)
qr_test = "JEF|+51938101013|admin|A Tu Salud|1756136087"

print("=== PROBANDO DIFERENTES SINTAXIS DE QRCODE ===")

# Test 1: Sintaxis original (la que está fallando)
print("\n1. Probando sintaxis original...")
tspl_v1 = f"""SIZE 50 mm, 50 mm
GAP 2 mm, 0 mm
SPEED 3
DENSITY 8
DIRECTION 1
REFERENCE 0,0
CLS
TEXT 200,30,"2",0,1,1,"TEST 1: Original"
QRCODE 150,100,"L",4,"A",0,"{qr_test}"
PRINT 1,1
"""

# Test 2: Sintaxis mejorada
print("2. Probando sintaxis mejorada...")
tspl_v2 = f"""SIZE 50 mm, 50 mm
GAP 2 mm, 0 mm
SPEED 3
DENSITY 8
DIRECTION 1
REFERENCE 0,0
CLS
TEXT 200,30,"2",0,1,1,"TEST 2: Mejorada"
QRCODE 150,100,"H",4,"A",0,"M2","{qr_test}"
PRINT 1,1
"""

# Test 3: Sintaxis alternativa
print("3. Probando sintaxis alternativa...")
tspl_v3 = f"""SIZE 50 mm, 50 mm
GAP 2 mm, 0 mm
SPEED 3
DENSITY 8
DIRECTION 1
REFERENCE 0,0
CLS
TEXT 200,30,"2",0,1,1,"TEST 3: Alternativa"
QRCODE 150,100,"M",6,"A",0,"{qr_test}"
PRINT 1,1
"""

# Test 4: Sintaxis simple
print("4. Probando sintaxis simple...")
tspl_v4 = f"""SIZE 50 mm, 50 mm
GAP 2 mm, 0 mm
SPEED 3
DENSITY 8
DIRECTION 1
REFERENCE 0,0
CLS
TEXT 200,30,"2",0,1,1,"TEST 4: Simple"
QRCODE 150,100,"M",5,"{qr_test}"
PRINT 1,1
"""

tests = [
    ("Sintaxis Original", tspl_v1),
    ("Sintaxis Mejorada", tspl_v2), 
    ("Sintaxis Alternativa", tspl_v3),
    ("Sintaxis Simple", tspl_v4)
]

for name, commands in tests:
    try:
        print(f"\n[>>] Enviando: {name}")
        send_raw(PRINTER_NAME, commands.encode('utf-8'))
        print(f"[OK] {name} enviado correctamente")
        input("Presiona Enter después de revisar la etiqueta...")
    except Exception as e:
        print(f"[ERROR] Error en {name}: {e}")

print("\n=== PRUEBA COMPLETADA ===")
print("Revisa las etiquetas impresas:")
print("- ¿Cuál renderizó el QR como imagen correctamente?")
print("- ¿Cuál mostró solo texto en lugar del código QR?")