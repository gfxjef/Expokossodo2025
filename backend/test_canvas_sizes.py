"""
Prueba con diferentes tamaños de canvas para encontrar 
el ancho correcto que centra en etiqueta 50x50mm
"""
from thermal_printer import TermalPrinter4BARCODE
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps
import os

def test_canvas_size(canvas_width, test_name):
    """Probar diferentes anchos de canvas"""
    
    print(f"=== PRUEBA {test_name}: CANVAS {canvas_width}px ===")
    
    qr_text = "TEST|50mm|CENTRADO|" + str(canvas_width)
    
    try:
        printer = TermalPrinter4BARCODE()
        
        # Crear QR pequeño para que quepa
        qr = qrcode.QRCode(version=1, box_size=3, border=1)
        qr.add_data(qr_text)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("L")
        qr_size = 100
        qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
        
        # Canvas de prueba
        canvas_height = 150  # Altura reducida para prueba
        canvas = Image.new("L", (canvas_width, canvas_height), 255)
        draw = ImageDraw.Draw(canvas)
        
        # Cargar fuente
        font = None
        for font_path in [r"C:\Windows\Fonts\arial.ttf"]:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, 14)
                    break
                except:
                    pass
        if not font:
            font = ImageFont.load_default()
        
        # Título indicando el ancho
        title = f"{test_name}: {canvas_width}px"
        temp_img = Image.new("L", (10, 10), 255)
        temp_draw = ImageDraw.Draw(temp_img)
        title_bbox = temp_draw.textbbox((0, 0), title, font=font)
        title_w = title_bbox[2] - title_bbox[0]
        
        y_pos = 10
        
        # Título centrado
        title_x = (canvas_width - title_w) // 2
        draw.text((title_x, y_pos), title, fill=0, font=font)
        y_pos += 25
        
        # QR centrado
        qr_x = (canvas_width - qr_size) // 2
        canvas.paste(qr_img, (qr_x, y_pos))
        
        # Dibujar líneas de referencia (bordes)
        draw.line([(0, 0), (0, canvas_height-1)], fill=0, width=2)  # Izquierda
        draw.line([(canvas_width-1, 0), (canvas_width-1, canvas_height-1)], fill=0, width=2)  # Derecha
        
        # Convertir
        final_img = ImageOps.autocontrast(canvas).convert("1")
        
        # Generar comandos ESC/POS
        commands = []
        commands.append(b'\x1b@')  # Reset
        commands.append(b'\x1ba\x01')  # Centrar
        
        img_commands = printer._image_to_escpos_raster(final_img)
        commands.extend(img_commands)
        commands.append(b'\n\n')
        
        raw_data = b''.join(commands)
        result = printer.send_raw_data_bytes(raw_data)
        
        if result['success']:
            print(f"[OK] {test_name} enviado correctamente")
            return True
        else:
            print(f"[ERROR] {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

if __name__ == "__main__":
    print("DIAGNOSTICO DE ANCHO DE CANVAS PARA 50x50mm")
    print("Vamos a probar diferentes anchos para ver cuál centra mejor\n")
    
    # Diferentes anchos de prueba
    tests = [
        (200, "A - 200px (muy angosto)"),
        (300, "B - 300px (angosto)"), 
        (350, "C - 350px (medio)"),
        (384, "D - 384px (actual)"),
        (400, "E - 400px (cuadrado)"),
        (450, "F - 450px (ancho)"),
        (500, "G - 500px (muy ancho)")
    ]
    
    for width, name in tests:
        test_canvas_size(width, name)
        input(f"Revisa etiqueta {name} y presiona Enter...")
    
    print("\n" + "="*60)
    print("ANÁLISIS:")
    print("- Busca la etiqueta donde el TÍTULO y QR estén CENTRADOS")
    print("- Las líneas verticales (bordes) te ayudan a ver los límites")
    print("- ¿Cuál etiqueta se ve perfectamente centrada?")
    print("")
    print("Ejemplo: 'La etiqueta D se ve centrada' = usamos 384px")
    print("="*60)