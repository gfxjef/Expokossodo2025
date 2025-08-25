"""
Prueba TSPL para etiqueta de 50x50mm
"""
import win32print

PRINTER_NAME = "4BARCODE 3B-303B"  # Nombre exacto detectado

def send_raw(printer_name, data, job_name="TSPL Test"):
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

# Comandos TSPL para 50x50mm
tspl_commands = """SIZE 50 mm, 50 mm
GAP 2 mm, 0 mm
SPEED 3
DENSITY 8
DIRECTION 1
REFERENCE 0,0
CLS
TEXT 200,50,"3",0,1,1,"TEST 50mm"
TEXT 200,100,"2",0,1,1,"EXPOKOSSODO"
TEXT 200,130,"1",0,1,1,"2025"
BOX 50,30,350,250,2
QRCODE 150,160,"L",4,"A",0,"TEST123"
TEXT 200,320,"0",0,1,1,"PRUEBA TSPL"
PRINT 1,1
"""

# Convertir a bytes
data = tspl_commands.encode('utf-8')

try:
    send_raw(PRINTER_NAME, data)
    print("[OK] Enviado TSPL a:", PRINTER_NAME)
    print("Si ves una caja con texto y QR, TSPL funciona.")
    print("Si no imprime, tu impresora está en modo ESC/POS.")
except Exception as e:
    print(f"[ERROR] {e}")