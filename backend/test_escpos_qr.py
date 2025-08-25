"""
Implementación ESC/POS correcta para imprimir QR real en 4BARCODE
Usa la librería escpos-python para renderizar imagen QR
"""
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps
from escpos.printer import Win32Raw
import os
import time

def test_escpos_qr_print():
    """Prueba de impresión QR usando ESC/POS con imagen"""
    
    print("=== PRUEBA ESC/POS QR PARA 4BARCODE ===")
    
    # Datos de prueba
    qr_text = "JEF|+51938101013|admin|A Tu Salud|1756136087"
    nombre = "JEFF GUERRERO"
    empresa = "A Tu Salud"
    cargo = "admin"
    
    printer_name = "4BARCODE 3B-303B"
    
    try:
        print(f"[QR] Generando código QR para: {qr_text}")
        
        # 1. Generar código QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,  # Tamaño de cada módulo
            border=2,
        )
        qr.add_data(qr_text)
        qr.make(fit=True)
        
        # Crear imagen QR en escala de grises
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("L")
        
        # Redimensionar QR para que salga bien en la etiqueta (más grande)
        qr_size = 250  # pixels
        qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
        
        print(f"[QR] QR generado: {qr_img.size} pixels")
        
        # 2. Crear layout completo de la etiqueta
        # Intentar cargar fuente del sistema
        font_large = None
        font_small = None
        
        for font_path in [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\calibri.ttf"]:
            if os.path.exists(font_path):
                try:
                    font_large = ImageFont.truetype(font_path, 20)
                    font_small = ImageFont.truetype(font_path, 14)
                    print(f"[FONT] Usando fuente: {font_path}")
                    break
                except:
                    continue
        
        if not font_large:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
            print("[FONT] Usando fuente por defecto")
        
        # Calcular dimensiones del texto
        temp_img = Image.new("L", (10, 10), 255)
        temp_draw = ImageDraw.Draw(temp_img)
        
        # Medir textos
        title_bbox = temp_draw.textbbox((0, 0), "EXPOKOSSODO 2025", font=font_large)
        title_w, title_h = title_bbox[2] - title_bbox[0], title_bbox[3] - title_bbox[1]
        
        name_bbox = temp_draw.textbbox((0, 0), nombre, font=font_large)
        name_w, name_h = name_bbox[2] - name_bbox[0], name_bbox[3] - name_bbox[1]
        
        empresa_bbox = temp_draw.textbbox((0, 0), empresa, font=font_small)
        empresa_w, empresa_h = empresa_bbox[2] - empresa_bbox[0], empresa_bbox[3] - empresa_bbox[1]
        
        cargo_bbox = temp_draw.textbbox((0, 0), cargo, font=font_small)
        cargo_w, cargo_h = cargo_bbox[2] - cargo_bbox[0], cargo_bbox[3] - cargo_bbox[1]
        
        # 3. Crear canvas para etiqueta completa
        # Ancho: 50mm = ~394 pixels @ 203 DPI (usar múltiplo de 8)
        canvas_width = 400  # múltiplo de 8
        canvas_height = 20 + title_h + 15 + name_h + 10 + qr_size + 10 + empresa_h + cargo_h + 20
        
        canvas = Image.new("L", (canvas_width, canvas_height), 255)  # Fondo blanco
        draw = ImageDraw.Draw(canvas)
        
        y_pos = 20
        
        # Título centrado
        title_x = (canvas_width - title_w) // 2
        draw.text((title_x, y_pos), "EXPOKOSSODO 2025", fill=0, font=font_large)
        y_pos += title_h + 15
        
        # Nombre centrado
        name_x = (canvas_width - name_w) // 2
        draw.text((name_x, y_pos), nombre, fill=0, font=font_large)
        y_pos += name_h + 10
        
        # QR centrado
        qr_x = (canvas_width - qr_size) // 2
        canvas.paste(qr_img, (qr_x, y_pos))
        y_pos += qr_size + 10
        
        # Empresa centrada
        empresa_x = (canvas_width - empresa_w) // 2
        draw.text((empresa_x, y_pos), empresa, fill=0, font=font_small)
        y_pos += empresa_h
        
        # Cargo centrado
        cargo_x = (canvas_width - cargo_w) // 2
        draw.text((cargo_x, y_pos), cargo, fill=0, font=font_small)
        
        # Convertir a imagen 1-bit (blanco y negro puro)
        final_img = canvas.convert("1")
        
        print(f"[LAYOUT] Etiqueta creada: {final_img.size} pixels")
        
        # 4. Enviar a impresora usando ESC/POS
        print(f"[PRINT] Enviando a impresora: {printer_name}")
        
        printer = Win32Raw(printer_name)
        
        # Reset de impresora
        printer._raw(b"\x1b@")  # ESC @
        
        # Enviar imagen
        printer.image(final_img)
        
        # Nueva línea y posible corte
        printer.text("\n\n")
        # printer._raw(b"\x1dV\x00")  # Corte automático si lo soporta
        
        print("[SUCCESS] ¡Etiqueta ESC/POS enviada correctamente!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error en impresión ESC/POS: {e}")
        return False

if __name__ == "__main__":
    success = test_escpos_qr_print()
    
    if success:
        print("\n" + "="*60)
        print("PRUEBA ESC/POS COMPLETADA")
        print("Revisa la etiqueta impresa:")
        print("- Debe aparecer el código QR como imagen cuadrada")
        print("- Debe poder escanearse con el celular")
        print("- Debe mostrar todos los datos del usuario")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("PRUEBA FALLIDA - Revisa los errores arriba")
        print("="*60)