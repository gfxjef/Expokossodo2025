"""
Prueba de posicionamiento para etiqueta 50x50mm
Permite ajustar la posición horizontal y vertical del contenido
"""
from thermal_printer import TermalPrinter4BARCODE

def test_positioning(offset_x=20, offset_y=0):
    """
    Probar diferentes posicionamientos en la etiqueta
    
    Args:
        offset_x: Desplazamiento horizontal (positivo = derecha)
        offset_y: Desplazamiento vertical (positivo = abajo)
    """
    
    print(f"=== PRUEBA POSICIONAMIENTO (X:{offset_x}, Y:{offset_y}) ===")
    
    # Datos de prueba
    qr_text = "JEF|+51938101013|admin|A Tu Salud|1756136087"
    user_data = {
        "nombres": "JEFF GUERRERO",
        "empresa": "A Tu Salud", 
        "cargo": "admin",
        "numero": "+51938101013"
    }
    
    try:
        # Modificar temporalmente el offset en la clase
        printer = TermalPrinter4BARCODE()
        
        # Crear versión personalizada del método con offset configurable
        import qrcode
        from PIL import Image, ImageDraw, ImageFont, ImageOps
        import os
        
        print(f"[PRINT] Generando etiqueta con offset X:{offset_x}, Y:{offset_y}")
        
        # Generar QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,
            border=2,
        )
        qr.add_data(qr_text)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("L")
        qr_size = 160  # Tamaño QR optimizado para 50mm
        qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
        
        # Cargar fuentes
        font_large = None
        font_small = None
        
        for font_path in [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\calibri.ttf"]:
            if os.path.exists(font_path):
                try:
                    font_large = ImageFont.truetype(font_path, 16)
                    font_small = ImageFont.truetype(font_path, 11)
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
        
        name_bbox = temp_draw.textbbox((0, 0), user_data["nombres"], font=font_large)
        name_w, name_h = name_bbox[2] - name_bbox[0], name_bbox[3] - name_bbox[1]
        
        # Canvas 50x50mm
        canvas_width = 400
        canvas_height = 400
        
        canvas = Image.new("L", (canvas_width, canvas_height), 255)
        draw = ImageDraw.Draw(canvas)
        
        # Calcular centro vertical
        total_content_height = title_h + name_h + qr_size + 35
        start_y = (canvas_height - total_content_height) // 2 + offset_y
        
        y_pos = start_y
        
        # Título
        title_x = (canvas_width - title_w) // 2 + offset_x
        draw.text((title_x, y_pos), "EXPOKOSSODO 2025", fill=0, font=font_large)
        y_pos += title_h + 4
        
        # Nombre
        name_x = (canvas_width - name_w) // 2 + offset_x
        draw.text((name_x, y_pos), user_data["nombres"], fill=0, font=font_large)
        y_pos += name_h + 6
        
        # QR
        qr_x = (canvas_width - qr_size) // 2 + offset_x
        canvas.paste(qr_img, (qr_x, y_pos))
        y_pos += qr_size + 4
        
        # Empresa
        if user_data.get("empresa"):
            empresa_bbox = temp_draw.textbbox((0, 0), user_data["empresa"], font=font_small)
            empresa_w = empresa_bbox[2] - empresa_bbox[0]
            empresa_x = (canvas_width - empresa_w) // 2 + offset_x
            draw.text((empresa_x, y_pos), user_data["empresa"], fill=0, font=font_small)
            y_pos += 10
            
        # Cargo
        if user_data.get("cargo"):
            cargo_bbox = temp_draw.textbbox((0, 0), user_data["cargo"], font=font_small)
            cargo_w = cargo_bbox[2] - cargo_bbox[0]
            cargo_x = (canvas_width - cargo_w) // 2 + offset_x
            draw.text((cargo_x, y_pos), user_data["cargo"], fill=0, font=font_small)
        
        # Convertir y enviar
        final_img = ImageOps.autocontrast(canvas).convert("1")
        
        # Generar comandos ESC/POS
        commands = []
        commands.append(b'\x1b@')  # Reset
        commands.append(b'\x1ba\x01')  # Centrar
        
        # Convertir imagen
        img_commands = printer._image_to_escpos_raster(final_img)
        commands.extend(img_commands)
        commands.append(b'\n\n\n')
        
        raw_data = b''.join(commands)
        
        # Enviar
        result = printer.send_raw_data_bytes(raw_data)
        
        if result['success']:
            print(f"[SUCCESS] Etiqueta enviada con posicionamiento X:{offset_x}, Y:{offset_y}")
            return True
        else:
            print(f"[ERROR] {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

if __name__ == "__main__":
    print("PRUEBAS DE POSICIONAMIENTO PARA 50x50mm\n")
    
    # Prueba 1: Centrado (offset 0)
    print("1. Centrado perfectamente:")
    test_positioning(0, 0)
    input("Presiona Enter para continuar...")
    
    # Prueba 2: Hacia la derecha
    print("\n2. Desplazado hacia la derecha:")
    test_positioning(30, 0)
    input("Presiona Enter para continuar...")
    
    # Prueba 3: Más hacia la derecha
    print("\n3. Más hacia la derecha:")
    test_positioning(50, 0)
    input("Presiona Enter para continuar...")
    
    # Prueba 4: Hacia abajo
    print("\n4. Centrado pero hacia abajo:")
    test_positioning(20, 20)
    
    print("\n¿Cuál posición se ve mejor en tu etiqueta de 50x50mm?")
    print("Podemos ajustar el código con los valores que funcionen mejor.")