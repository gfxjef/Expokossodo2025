"""
Prueba final de impresión QR usando ESC/POS híbrido
Esta implementación debería funcionar correctamente con 4BARCODE
"""
from thermal_printer import TermalPrinter4BARCODE

def test_final_escpos():
    """Prueba final de impresión QR con ESC/POS"""
    
    print("=== PRUEBA FINAL ESC/POS HIBRIDO ===")
    
    # Datos de prueba (mismo formato que usa la app)
    qr_text = "JEF|+51938101013|admin|A Tu Salud|1756136087"
    user_data = {
        "nombres": "JEFF GUERRERO",
        "empresa": "A Tu Salud", 
        "cargo": "admin",
        "numero": "+51938101013"
    }
    
    try:
        # Inicializar impresora
        printer = TermalPrinter4BARCODE()
        print(f"[PRINTER] Usando: {printer.printer_name}")
        
        # Usar el método ESC/POS híbrido (nuevo por defecto)
        print(f"[PRINT] Imprimiendo con ESC/POS híbrido...")
        result = printer.print_qr_label(qr_text, user_data, 'ESCPOS')
        
        if result['success']:
            print(f"[SUCCESS] ¡Etiqueta ESC/POS enviada correctamente!")
            print(f"[SUCCESS] Impresora: {result.get('printer', 'N/A')}")
            print(f"[SUCCESS] Mensaje: {result.get('message', '')}")
            return True
        else:
            print(f"[ERROR] Fallo en impresión: {result.get('error', 'Desconocido')}")
            print(f"[DETAILS] {result.get('details', '')}")
            return False
            
    except Exception as e:
        print(f"[EXCEPTION] Error general: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_final_escpos()
    
    print("\n" + "="*60)
    if success:
        print("PRUEBA EXITOSA - ESC/POS HIBRIDO")
        print("Revisa la etiqueta impresa:")
        print("- Debe aparecer 'EXPOKOSSODO 2025' en la parte superior")
        print("- Debe aparecer 'JEFF GUERRERO' debajo del título")
        print("- Debe aparecer el código QR como imagen cuadrada") 
        print("- Debe aparecer 'A Tu Salud' y 'admin' debajo del QR")
        print("- El QR debe ser escaneable con el celular")
        print("")
        print("Si ves todo esto, EL PROBLEMA ESTA SOLUCIONADO!")
    else:
        print("PRUEBA FALLIDA")
        print("Revisa los logs de error arriba")
    print("="*60)