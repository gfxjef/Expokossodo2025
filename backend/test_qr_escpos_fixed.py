"""
Prueba QR ESC/POS corregida - sin bytes basura
Usa python-escpos correctamente para evitar caracteres aleatorios
"""
from escpos.printer import Win32Raw
from PIL import Image, ImageDraw, ImageFont, ImageOps
import qrcode
import os

def test_qr_escpos_fixed():
    """Prueba QR con ESC/POS usando python-escpos (sin bytes basura)"""
    
    print("=== PRUEBA QR ESC/POS CORREGIDA ===")
    
    printer_name = "4BARCODE 3B-303B"
    
    # Datos de prueba
    qr_text = "JEF|+51938101013|admin|A Tu Salud|1756136087"
    nombre = "JEFF GUERRERO"
    empresa = "A Tu Salud"
    
    try:
        print(f"[QR] Generando código QR: {qr_text}")
        
        # 1. Generar QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,
            border=2,
        )
        qr.add_data(qr_text)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("L")
        qr_size = 180  # Tamaño para 50mm
        qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
        
        print(f"[QR] QR generado: {qr_img.size}")
        
        # 2. Crear layout con texto
        font_large = None
        font_small = None
        
        # Cargar fuente si está disponible
        for font_path in [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\calibri.ttf"]:
            if os.path.exists(font_path):
                try:
                    font_large = ImageFont.truetype(font_path, 16)
                    font_small = ImageFont.truetype(font_path, 12)
                    break
                except:
                    continue
        
        if not font_large:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Medir texto
        temp_img = Image.new("L", (10, 10), 255)
        temp_draw = ImageDraw.Draw(temp_img)
        
        title_bbox = temp_draw.textbbox((0, 0), "EXPOKOSSODO 2025", font=font_large)
        title_w, title_h = title_bbox[2] - title_bbox[0], title_bbox[3] - title_bbox[1]
        
        name_bbox = temp_draw.textbbox((0, 0), nombre, font=font_large)  
        name_w, name_h = name_bbox[2] - name_bbox[0], name_bbox[3] - name_bbox[1]
        
        empresa_bbox = temp_draw.textbbox((0, 0), empresa, font=font_small)
        empresa_w, empresa_h = empresa_bbox[2] - empresa_bbox[0], empresa_bbox[3] - empresa_bbox[1]
        
        # 3. Crear canvas (ancho múltiplo de 8)
        canvas_width = 384  # 48mm @ 203 DPI
        canvas_height = title_h + name_h + qr_size + empresa_h + 60  # Espacios
        
        canvas = Image.new("L", (canvas_width, canvas_height), 255)  # Blanco
        draw = ImageDraw.Draw(canvas)
        
        y_pos = 15
        
        # Título
        title_x = (canvas_width - title_w) // 2
        draw.text((title_x, y_pos), "EXPOKOSSODO 2025", fill=0, font=font_large)
        y_pos += title_h + 8
        
        # Nombre  
        name_x = (canvas_width - name_w) // 2
        draw.text((name_x, y_pos), nombre, fill=0, font=font_large)
        y_pos += name_h + 10
        
        # QR centrado
        qr_x = (canvas_width - qr_size) // 2
        canvas.paste(qr_img, (qr_x, y_pos))
        y_pos += qr_size + 10
        
        # Empresa
        empresa_x = (canvas_width - empresa_w) // 2
        draw.text((empresa_x, y_pos), empresa, fill=0, font=font_small)
        
        # Convertir a 1-bit (blanco/negro puro)
        final_img = ImageOps.autocontrast(canvas).convert("1")
        
        print(f"[LAYOUT] Etiqueta creada: {final_img.size}")
        
        # 4. Imprimir con python-escpos (comando gráfico correcto)
        print(f"[PRINT] Enviando a: {printer_name}")
        
        printer = Win32Raw(printer_name)
        
        # Reset
        printer._raw(b"\x1b@")  # ESC @
        
        # Centrar
        printer._raw(b"\x1ba\x01")  # ESC a 1
        
        # IMPORTANTE: Usar printer.image() - esto usa el comando gráfico ESC/POS correcto
        # NO enviar bytes de imagen directamente
        printer.image(final_img)
        
        # Líneas finales
        printer.text("\n\n")
        
        print("[SUCCESS] ¡Etiqueta QR enviada con ESC/POS correcto!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_qr_escpos_fixed()
    
    print("\n" + "="*50)
    if success:
        print("SOLUCION ESC/POS APLICADA")
        print("Revisa la etiqueta:")
        print("- NO debe haber caracteres basura")
        print("- Debe verse el QR como imagen cuadrada")
        print("- Debe poder escanearse")
        print("- Texto debe estar legible")
    else:
        print("ERROR EN LA CORRECCION")
    print("="*50)