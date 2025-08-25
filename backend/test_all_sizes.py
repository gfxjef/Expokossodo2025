"""
Imprimir todas las etiquetas de prueba de una vez
Para diagnosticar el ancho correcto de canvas
"""
from thermal_printer import TermalPrinter4BARCODE
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps
import os
import time

def create_test_label(canvas_width, test_name):
    """Crear etiqueta de prueba con ancho específico"""
    
    qr_text = f"TEST|{canvas_width}px|{test_name}"
    
    # Crear QR pequeño
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(qr_text)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("L")
    qr_size = 80  # QR más pequeño
    qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
    
    # Canvas
    canvas_height = 120
    canvas = Image.new("L", (canvas_width, canvas_height), 255)
    draw = ImageDraw.Draw(canvas)
    
    # Fuente
    font = None
    for font_path in [r"C:\Windows\Fonts\arial.ttf"]:
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, 12)
                break
            except:
                pass
    if not font:
        font = ImageFont.load_default()
    
    # Título
    title = f"{test_name}"
    temp_img = Image.new("L", (10, 10), 255)
    temp_draw = ImageDraw.Draw(temp_img)
    title_bbox = temp_draw.textbbox((0, 0), title, font=font)
    title_w = title_bbox[2] - title_bbox[0]
    
    # Centrar título
    title_x = (canvas_width - title_w) // 2
    draw.text((title_x, 8), title, fill=0, font=font)
    
    # Centrar QR
    qr_x = (canvas_width - qr_size) // 2
    canvas.paste(qr_img, (qr_x, 30))
    
    # Líneas de referencia (bordes)
    draw.line([(0, 0), (0, canvas_height-1)], fill=0, width=1)  # Izquierda
    draw.line([(canvas_width-1, 0), (canvas_width-1, canvas_height-1)], fill=0, width=1)  # Derecha
    
    return canvas.convert("1")

def main():
    print("IMPRIMIENDO TODAS LAS ETIQUETAS DE PRUEBA...")
    
    printer = TermalPrinter4BARCODE()
    
    # Todas las pruebas
    tests = [
        (200, "A-200px"),
        (250, "B-250px"),
        (300, "C-300px"), 
        (350, "D-350px"),
        (384, "E-384px"),
        (400, "F-400px"),
        (450, "G-450px")
    ]
    
    for i, (width, name) in enumerate(tests):
        print(f"[{i+1}/7] Imprimiendo {name}...")
        
        try:
            # Crear imagen
            img = create_test_label(width, name)
            
            # Generar comandos ESC/POS
            commands = []
            commands.append(b'\x1b@')  # Reset
            commands.append(b'\x1ba\x01')  # Centrar
            
            # Imagen
            img_commands = printer._image_to_escpos_raster(img)
            commands.extend(img_commands)
            commands.append(b'\n\n')
            
            # Enviar
            raw_data = b''.join(commands)
            result = printer.send_raw_data_bytes(raw_data)
            
            if result['success']:
                print(f"[OK] {name} enviado")
            else:
                print(f"[ERROR] {name}: {result.get('error')}")
                
            # Pausa breve entre impresiones
            time.sleep(0.5)
            
        except Exception as e:
            print(f"[ERROR] {name}: {e}")
    
    print("\n" + "="*50)
    print("¡LISTO! Se imprimieron 7 etiquetas de prueba:")
    print("A-200px, B-250px, C-300px, D-350px, E-384px, F-400px, G-450px")
    print("")
    print("REVISA LAS ETIQUETAS:")
    print("- Cada una tiene su nombre (A, B, C, etc.)")
    print("- Busca cuál está CENTRADA en tu etiqueta 50x50mm")
    print("- Las líneas verticales muestran los bordes del canvas")
    print("")
    print("¿Cuál etiqueta (A, B, C, D, E, F, G) se ve centrada?")
    print("="*50)

if __name__ == "__main__":
    main()