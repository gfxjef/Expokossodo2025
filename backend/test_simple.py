"""
Prueba simple con win32print directamente
"""
import win32print
import time

PRINTER_NAME = "4BARCODE 3B-303B"

def send_tspl_simple():
    """Enviar comando TSPL minimo para 50x50mm"""
    commands = [
        "SIZE 50 mm, 50 mm",
        "CLS",
        "TEXT 100,100,\"3\",0,1,1,\"TEST\"",
        "PRINT 1",
        ""
    ]
    
    tspl = "\r\n".join(commands)
    data = tspl.encode('utf-8')
    
    try:
        h = win32print.OpenPrinter(PRINTER_NAME)
        job = win32print.StartDocPrinter(h, 1, ("Test50mm", None, "RAW"))
        win32print.StartPagePrinter(h)
        win32print.WritePrinter(h, data)
        win32print.EndPagePrinter(h)
        win32print.EndDocPrinter(h)
        win32print.ClosePrinter(h)
        print(f"[OK] TSPL enviado a {PRINTER_NAME}")
        return True
    except Exception as e:
        print(f"[ERROR] TSPL: {e}")
        return False

def send_escpos_simple():
    """Enviar comando ESC/POS minimo"""
    ESC = b'\x1b'
    
    commands = [
        ESC + b'@',           # Reset
        b'TEST 50mm\n',       # Texto simple
        b'\n\n\n\n'          # Avance papel
    ]
    
    data = b''.join(commands)
    
    try:
        h = win32print.OpenPrinter(PRINTER_NAME)
        job = win32print.StartDocPrinter(h, 1, ("Test50mm", None, "RAW"))
        win32print.StartPagePrinter(h)
        win32print.WritePrinter(h, data)
        win32print.EndPagePrinter(h)
        win32print.EndDocPrinter(h)
        win32print.ClosePrinter(h)
        print(f"[OK] ESC/POS enviado a {PRINTER_NAME}")
        return True
    except Exception as e:
        print(f"[ERROR] ESC/POS: {e}")
        return False

# Ejecutar pruebas
print("=== PRUEBA 1: TSPL ===")
send_tspl_simple()

print("\n=== PRUEBA 2: ESC/POS ===")
send_escpos_simple()

print("\nRevisa cual imprimio:")
print("- Si imprimio TSPL: tu impresora esta en modo etiquetas")
print("- Si imprimio ESC/POS: tu impresora esta en modo recibo")
print("- Si no imprimio ninguno: verificar driver/configuracion")