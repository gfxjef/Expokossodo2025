import win32print

# Tu código base que funciona
PRINTER_NAME = "4BARCODE 3B-303B"

# Texto para el QR
QR_TEXT = "TEST|123456|DEMO|EXPO|1234567890"

print(f"Imprimiendo QR: {QR_TEXT}")

hPrinter = win32print.OpenPrinter(PRINTER_NAME)
try:
    hJob = win32print.StartDocPrinter(hPrinter, 1, ("TestJob", None, "RAW"))
    win32print.StartPagePrinter(hPrinter)
    
    # Tu comando base + comando QRCODE nativo TSPL
    commands = f"""SIZE 50 mm,50 mm
GAP 2 mm,0 mm
DIRECTION 0
CLS
TEXT 50,50,"3",0,1,1,"TEST"
QRCODE 50,90,M,4,A,0,"{QR_TEXT}"
PRINT 1
"""
    
    win32print.WritePrinter(hPrinter, commands.encode('ascii'))
    
    win32print.EndPagePrinter(hPrinter)
    win32print.EndDocPrinter(hPrinter)
    
    print("Comando QR enviado correctamente")
    
finally:
    win32print.ClosePrinter(hPrinter)