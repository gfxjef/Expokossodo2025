import win32print
import qrcode
from PIL import Image
import os

def generate_qr_bitmap_data(qr_text):
    """Generar datos bitmap del QR en formato TSPL"""
    # Crear QR
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=3,
        border=2,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    
    # Crear imagen monocroma
    img = qr.make_image(fill_color="black", back_color="white").convert('1')
    
    # Redimensionar para TSPL (múltiplo de 8)
    width, height = img.size
    if width % 8 != 0:
        new_width = ((width // 8) + 1) * 8
        new_img = Image.new("1", (new_width, height), 1)  # Blanco
        new_img.paste(img, (0, 0))
        img = new_img
        width = new_width
    
    # Convertir a datos bitmap
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

def print_qr_label_simple():
    """Imprimir etiqueta QR usando tu código simple exitoso + QR bitmap"""
    
    PRINTER_NAME = "4BARCODE 3B-303B"
    QR_TEXT = "TEST|123456|DEMO|EXPO|1234567890"
    
    # Generar datos QR
    qr_width, qr_height, qr_bitmap = generate_qr_bitmap_data(QR_TEXT)
    
    print(f"QR generado: {qr_width}x{qr_height}, {len(qr_bitmap)} bytes")
    
    hPrinter = win32print.OpenPrinter(PRINTER_NAME)
    try:
        hJob = win32print.StartDocPrinter(hPrinter, 1, ("QR_TestJob", None, "RAW"))
        win32print.StartPagePrinter(hPrinter)
        
        # Comandos TSPL básicos (tu código que funciona)
        commands = []
        commands.append(b"SIZE 50 mm,50 mm\n")
        commands.append(b"GAP 2 mm,0 mm\n")
        commands.append(b"DIRECTION 0\n")  # Orientación correcta
        commands.append(b"CLS\n")
        
        # Título
        commands.append(b'TEXT 150,30,"3",0,1,1,"EXPOKOSSODO 2025"\n')
        
        # Código QR usando BITMAP con datos binarios
        qr_x = 120  # Posición X del QR
        qr_y = 70   # Posición Y del QR
        
        # BITMAP x,y,width,height,mode,data
        bitmap_cmd = f"BITMAP {qr_x},{qr_y},{qr_width},{qr_height},1,".encode('ascii')
        commands.append(bitmap_cmd)
        commands.append(qr_bitmap)
        commands.append(b"\n")
        
        # Información adicional
        commands.append(b'TEXT 150,220,"2",0,1,1,"PRUEBA QR"\n')
        commands.append(b'TEXT 150,250,"1",0,1,1,"ExpoKossodo"\n')
        commands.append(b'TEXT 150,270,"1",0,1,1,"Test Print"\n')
        
        # Código en texto pequeño
        qr_short = QR_TEXT[:25].encode('ascii')
        commands.append(b'TEXT 150,300,"0",0,1,1,"' + qr_short + b'"\n')
        
        # Imprimir
        commands.append(b"PRINT 1\n")
        
        # Enviar todos los comandos
        for cmd in commands:
            win32print.WritePrinter(hPrinter, cmd)
        
        win32print.EndPagePrinter(hPrinter)
        win32print.EndDocPrinter(hPrinter)
        
        print("[OK] Etiqueta con QR enviada correctamente")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False
    finally:
        win32print.ClosePrinter(hPrinter)

if __name__ == "__main__":
    print("Imprimiendo etiqueta QR simple...")
    result = print_qr_label_simple()
    if result:
        print("Impresion exitosa!")
    else:
        print("Fallo la impresion.")