import win32print
import qrcode
from PIL import Image

def generate_qr_bitmap_tspl(qr_text):
    """Generar QR bitmap en formato TSPL correcto"""
    # Crear QR
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=2,  # Más pequeño para 50mm
        border=1,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    
    # Crear imagen monocroma
    img = qr.make_image(fill_color="black", back_color="white").convert('1')
    
    # Ajustar tamaño para que quepa en 50mm
    img = img.resize((80, 80), Image.NEAREST)  # QR pequeño para 50mm
    
    width, height = img.size
    
    # Asegurar múltiplo de 8 para TSPL
    if width % 8 != 0:
        new_width = ((width // 8) + 1) * 8
        new_img = Image.new("1", (new_width, height), 1)  # Blanco
        new_img.paste(img, (0, 0))
        img = new_img
        width = new_width
    
    # Convertir a datos bitmap (invertir orientación)
    bitmap_data = []
    for y in range(height):
        for x in range(0, width, 8):
            byte_val = 0
            for bit in range(8):
                if x + bit < width:
                    pixel = img.getpixel((x + bit, y))
                    if pixel == 0:  # Negro
                        byte_val |= (1 << (7 - bit))
            bitmap_data.append(byte_val)
    
    return width, height, bytes(bitmap_data)

# Tu código base que funciona
PRINTER_NAME = "4BARCODE 3B-303B"

# Generar QR
QR_TEXT = "TEST|123456|DEMO|EXPO|1234567890"
qr_width, qr_height, qr_bitmap = generate_qr_bitmap_tspl(QR_TEXT)

print(f"QR: {qr_width}x{qr_height}, {len(qr_bitmap)} bytes")

hPrinter = win32print.OpenPrinter(PRINTER_NAME)
try:
    hJob = win32print.StartDocPrinter(hPrinter, 1, ("TestJob", None, "RAW"))
    win32print.StartPagePrinter(hPrinter)
    
    # Tu comando base + QR bitmap
    commands = b"SIZE 50 mm,50 mm\nGAP 2 mm,0 mm\nDIRECTION 0\nCLS\nTEXT 50,50,\"3\",0,1,1,\"TEST\"\n"
    
    # Agregar QR bitmap debajo del texto TEST
    bitmap_cmd = f"BITMAP 50,80,{qr_width},{qr_height},1,".encode('ascii')
    
    # Enviar comandos base
    win32print.WritePrinter(hPrinter, commands)
    
    # Enviar comando bitmap
    win32print.WritePrinter(hPrinter, bitmap_cmd)
    
    # Enviar datos del QR
    win32print.WritePrinter(hPrinter, qr_bitmap)
    
    # Finalizar
    win32print.WritePrinter(hPrinter, b"\nPRINT 1\n")
    
    win32print.EndPagePrinter(hPrinter)
    win32print.EndDocPrinter(hPrinter)
    
    print("Impresion QR enviada correctamente")
    
finally:
    win32print.ClosePrinter(hPrinter)