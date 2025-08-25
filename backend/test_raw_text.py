"""
Probar impresión en modo RAW de texto plano
Para verificar si la impresora procesa comandos directos
"""
import win32print

def test_raw_text():
    print("=== PRUEBA RAW TEXT ===")
    
    printer_name = "4BARCODE 3B-303B"
    
    # Comandos simples de texto
    raw_text = b"""
EXPOKOSSODO 2025
PRUEBA RAW TEXT

JEFF GUERRERO
A Tu Salud - admin

Telefono: +51938101013

Este texto debe salir
directamente sin formato.

Si ves esto, el modo RAW
funciona correctamente.


"""
    
    try:
        hPrinter = win32print.OpenPrinter(printer_name)
        
        try:
            # IMPORTANTE: Usar datatype "RAW" 
            hJob = win32print.StartDocPrinter(
                hPrinter, 
                1, 
                ("RAW_Text_Test", None, "RAW")  # <-- Modo RAW
            )
            
            try:
                win32print.StartPagePrinter(hPrinter)
                win32print.WritePrinter(hPrinter, raw_text)
                win32print.EndPagePrinter(hPrinter)
                
                print("[OK] Texto RAW enviado")
                print("[INFO] Si esto imprime, el problema es el formato ESC/POS")
                print("[INFO] Si esto NO imprime, la impresora no acepta RAW")
                
            finally:
                win32print.EndDocPrinter(hPrinter)
                
        finally:
            win32print.ClosePrinter(hPrinter)
            
        return True
        
    except Exception as e:
        print(f"[ERROR] Error en modo RAW: {e}")
        return False

# También probar con modo normal (no RAW)
def test_normal_text():
    print("\n=== PRUEBA TEXTO NORMAL ===")
    
    printer_name = "4BARCODE 3B-303B"
    
    # Texto normal (como página de prueba)
    normal_text = """EXPOKOSSODO 2025 - PRUEBA NORMAL

Nombre: JEFF GUERRERO
Empresa: A Tu Salud
Cargo: admin
Telefono: +51938101013

Esta es una prueba de impresión normal
similar a una página de prueba.

Si esto imprime pero el RAW no,
entonces la impresora solo acepta
comandos de Windows, no ESC/POS.
"""
    
    try:
        hPrinter = win32print.OpenPrinter(printer_name)
        
        try:
            # SIN especificar RAW (modo Windows normal)
            hJob = win32print.StartDocPrinter(
                hPrinter, 
                1, 
                ("Normal_Text_Test", None, None)  # <-- Modo Windows
            )
            
            try:
                win32print.StartPagePrinter(hPrinter)
                win32print.WritePrinter(hPrinter, normal_text.encode('utf-8'))
                win32print.EndPagePrinter(hPrinter)
                
                print("[OK] Texto normal enviado")
                
            finally:
                win32print.EndDocPrinter(hPrinter)
                
        finally:
            win32print.ClosePrinter(hPrinter)
            
        return True
        
    except Exception as e:
        print(f"[ERROR] Error en modo normal: {e}")
        return False

if __name__ == "__main__":
    print("Probando dos modos de impresión:")
    print("1. RAW (comandos directos)")
    print("2. Normal (Windows GDI)")
    print("\nEsto nos ayudará a saber qué modo acepta la impresora\n")
    
    test_raw_text()
    input("Presiona Enter después de revisar si salió algo...")
    
    test_normal_text()
    print("\nRevisa qué impresión salió:")
    print("- Si solo salió la NORMAL: impresora en modo Windows")
    print("- Si salieron ambas: impresora acepta RAW y Windows")
    print("- Si no salió ninguna: problema de configuración")