"""
Prueba con imagen PRUEBAS.png usando ESC/POS correcto
Corrige el problema de bytes basura usando comandos gráficos adecuados
"""
from escpos.printer import Win32Raw
from PIL import Image, ImageOps
import os

def test_image_escpos():
    """Probar impresión de imagen usando ESC/POS con python-escpos"""
    
    print("=== PRUEBA IMAGEN ESC/POS CORRECTA ===")
    
    printer_name = "4BARCODE 3B-303B"
    image_path = r"C:\Users\USER\Desktop\python projects\Expokossodo2025\backend\PRUEBAS.png"
    
    try:
        # Verificar que la imagen existe
        if not os.path.exists(image_path):
            print(f"[ERROR] No se encuentra la imagen: {image_path}")
            return False
        
        print(f"[IMAGE] Cargando imagen: {image_path}")
        
        # Cargar y procesar imagen
        img = Image.open(image_path)
        print(f"[IMAGE] Imagen original: {img.size} pixels, modo: {img.mode}")
        
        # Convertir a escala de grises
        img = img.convert("L")
        
        # Redimensionar si es necesario para 50mm (≈394 pixels @ 203 DPI)
        max_width = 384  # Múltiplo de 8 para ESC/POS
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)
            print(f"[IMAGE] Redimensionada a: {img.size}")
        
        # Mejorar contraste y convertir a 1-bit (blanco y negro puro)
        img = ImageOps.autocontrast(img).convert("1")
        print(f"[IMAGE] Procesada final: {img.size}, modo: {img.mode}")
        
        # Imprimir usando python-escpos (ESC/POS correcto)
        print(f"[PRINT] Enviando a impresora: {printer_name}")
        
        printer = Win32Raw(printer_name)
        
        # Reset impresora
        printer._raw(b"\x1b@")  # ESC @
        print("[PRINT] Reset enviado")
        
        # Centrar
        printer._raw(b"\x1ba\x01")  # ESC a 1 (centrar)
        print("[PRINT] Alineación centrada")
        
        # Enviar imagen usando comando gráfico ESC/POS correcto
        printer.image(img)
        print("[PRINT] Imagen enviada con comando gráfico ESC/POS")
        
        # Líneas finales
        printer.text("\n\n")
        print("[PRINT] Finalizado")
        
        # Opcional: corte automático
        # printer._raw(b"\x1dV\x00")  # GS V 0 (corte)
        
        print("[SUCCESS] ¡Imagen enviada correctamente con ESC/POS!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error en impresión ESC/POS: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_image_escpos()
    
    print("\n" + "="*60)
    if success:
        print("PRUEBA EXITOSA - IMAGEN ESC/POS")
        print("Revisa la etiqueta impresa:")
        print("- Debe aparecer la imagen PRUEBAS.png correctamente")
        print("- NO debe aparecer caracteres basura o símbolos raros")
        print("- La imagen debe estar centrada")
        print("- Debe verse nítida en blanco y negro")
        print("")
        print("Si la imagen se ve bien, podemos aplicar esto al QR")
    else:
        print("PRUEBA FALLIDA")
        print("Revisa los logs de error y la configuración de impresora")
    print("="*60)