"""
Prueba simple de texto para verificar si la impresora imprime físicamente
"""
import win32print

def test_simple_print():
    print("=== PRUEBA SIMPLE DE TEXTO ===")
    
    printer_name = "4BARCODE 3B-303B"
    
    # Texto simple de prueba
    test_data = b"""
PRUEBA SIMPLE
4BARCODE 3B-303B
Fecha/Hora: 2025-08-25
Estado: FUNCIONANDO

Este es un test basico
para verificar impresion.

Si ves esto, la impresora
esta funcionando correctamente.

"""
    
    try:
        # Abrir impresora
        hPrinter = win32print.OpenPrinter(printer_name)
        
        try:
            # Iniciar documento
            hJob = win32print.StartDocPrinter(
                hPrinter, 
                1, 
                ("Test_Simple_4BARCODE", None, "RAW")
            )
            
            try:
                # Iniciar página
                win32print.StartPagePrinter(hPrinter)
                
                # Enviar datos
                win32print.WritePrinter(hPrinter, test_data)
                
                # Finalizar página
                win32print.EndPagePrinter(hPrinter)
                
                print("[OK] Datos enviados a la impresora")
                print("[INFO] Si no sale nada fisico, revisa:")
                print("   - Papel/etiquetas cargadas")
                print("   - Impresora encendida") 
                print("   - Configuracion de tamaño papel")
                
                return True
                
            finally:
                win32print.EndDocPrinter(hPrinter)
                
        finally:
            win32print.ClosePrinter(hPrinter)
            
    except Exception as e:
        print(f"[ERROR] Error enviando a impresora: {e}")
        return False

if __name__ == "__main__":
    test_simple_print()