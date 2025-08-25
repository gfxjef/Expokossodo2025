import win32print

# Tu código base que funciona - solo agregando más texto
PRINTER_NAME = "4BARCODE 3B-303B"

QR_TEXT = "TEST|123456|DEMO|EXPO"

hPrinter = win32print.OpenPrinter(PRINTER_NAME)
try:
    hJob = win32print.StartDocPrinter(hPrinter, 1, ("TestJob", None, "RAW"))
    win32print.StartPagePrinter(hPrinter)
    
    # Tu código exacto + líneas adicionales de texto
    commands = f"""SIZE 50 mm,50 mm
GAP 2 mm,0 mm
DIRECTION 0
CLS
TEXT 50,30,"3",0,1,1,"EXPOKOSSODO"
TEXT 50,60,"2",0,1,1,"TEST USER"
TEXT 50,90,"1",0,1,1,"Empresa Test"
TEXT 50,120,"1",0,1,1,"Cargo Test"
TEXT 50,150,"0",0,1,1,"{QR_TEXT}"
PRINT 1
""".encode('ascii')
    
    win32print.WritePrinter(hPrinter, commands)
    
    win32print.EndPagePrinter(hPrinter)
    win32print.EndDocPrinter(hPrinter)
    
    print("Etiqueta de texto enviada")
    
finally:
    win32print.ClosePrinter(hPrinter)