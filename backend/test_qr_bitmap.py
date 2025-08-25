"""
Prueba de la nueva implementación QR con BITMAP para 4BARCODE
Genera imagen QR temporal y la imprime usando comando BITMAP
"""
import sys
import os

# Importar la clase actualizada
from thermal_printer import TermalPrinter4BARCODE

def test_bitmap_qr():
    """Probar impresión de QR usando BITMAP"""
    
    print("=== PRUEBA QR BITMAP PARA 4BARCODE ===")
    
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
        print(f"[TEMP] Directorio QR: {printer.temp_dir}")
        
        # Probar generación de QR bitmap
        print(f"\n[QR] Generando imagen para: {qr_text}")
        qr_file = printer._generate_qr_bitmap(qr_text)
        
        if qr_file:
            print(f"[OK] QR bitmap generado: {qr_file}")
            
            # Verificar que el archivo existe
            if os.path.exists(qr_file):
                file_size = os.path.getsize(qr_file)
                print(f"[INFO] Tamaño archivo: {file_size} bytes")
            else:
                print("[ERROR] El archivo QR no existe!")
                return False
                
            # Probar impresión completa
            print(f"\n[PRINT] Imprimiendo etiqueta completa...")
            result = printer.print_qr_label(qr_text, user_data, 'TSPL')
            
            if result['success']:
                print(f"[SUCCESS] ¡Etiqueta enviada correctamente!")
                print(f"[SUCCESS] Impresora: {result.get('printer', 'N/A')}")
                return True
            else:
                print(f"[ERROR] Fallo en impresión: {result.get('error', 'Desconocido')}")
                print(f"[DETAILS] {result.get('details', '')}")
                return False
                
        else:
            print("[ERROR] No se pudo generar QR bitmap")
            return False
            
    except Exception as e:
        print(f"[EXCEPTION] Error general: {e}")
        return False

if __name__ == "__main__":
    success = test_bitmap_qr()
    
    if success:
        print("\n" + "="*50)
        print("✅ PRUEBA EXITOSA")
        print("Revisa la etiqueta impresa:")
        print("- ¿Aparece el código QR como imagen cuadrada?")
        print("- ¿Se puede escanear con el celular?")
        print("- ¿Están todos los datos del usuario?")
        print("="*50)
    else:
        print("\n" + "="*50)
        print("❌ PRUEBA FALLIDA") 
        print("Revisa los logs de error arriba")
        print("="*50)