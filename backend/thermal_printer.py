import win32print

PRN = "4BARCODE 3B-303B"

# --- DATOS ---
QR      = "FAN|933663676|GERENTE|FAINGENIEROS SAC|1752206278"
NOMBRE  = "FANNY BLAS RODRIGUEZ"

# --- AJUSTES RÁPIDOS (solo posición y tamaño) ---
QR_X        = 70    # antes 80 → lo movemos un poco a la izquierda
QR_Y        = 70    # antes 60 → lo bajamos leve para más margen arriba
QR_CELL     = 8     # antes 10 → apenas más chico para evitar mordiscos
FONT        = "3"   # 0..7 (3 = grande/legible)
CHAR_W      = 20    # ancho aprox por carácter en font "3"
TEXT_OFFSET = 50    # nombre a 50 dots por encima del QR
MAX_NAME    = 10    # máximo de caracteres visibles en el nombre

# ----

nombre_corto = (NOMBRE or "INVITADO")[:MAX_NAME]
text_width   = len(nombre_corto) * CHAR_W

# Estimación del ancho del QR para centrar el texto respecto al bloque del QR
qr_est_ancho = QR_CELL * 24   # ~24 módulos típico; funciona bien como aproximación
center_x     = QR_X + (qr_est_ancho // 2) - (text_width // 2)

def send(raw: bytes):
    h = win32print.OpenPrinter(PRN, {"DesiredAccess": win32print.PRINTER_ACCESS_USE})
    try:
        win32print.StartDocPrinter(h, 1, ("TSPL_QR", None, "RAW"))
        win32print.StartPagePrinter(h)
        win32print.WritePrinter(h, raw)
        win32print.EndPagePrinter(h)
        win32print.EndDocPrinter(h)
    finally:
        win32print.ClosePrinter(h)

tspl = (
    "SIZE 50 mm,50 mm\r\n"
    "GAP 2 mm,0 mm\r\n"
    "SPEED 3\r\n"
    "DENSITY 12\r\n"
    "DIRECTION 1\r\n"
    "REFERENCE 0,0\r\n"
    "CLS\r\n"
    # Nombre centrado con respecto al QR (mismo espaciado)
    f'TEXT {center_x},{QR_Y - TEXT_OFFSET},"{FONT}",0,1,1,"{nombre_corto}"\r\n'
    # QR nativo grande (colores correctos)
    f'QRCODE {QR_X},{QR_Y},M,{QR_CELL},A,0,"{QR}"\r\n'
    "PRINT 1\r\n"
).encode("ascii")

send(tspl)
print(f"[OK] Enviado. Nombre='{nombre_corto}' | QR cell={QR_CELL} | pos=({QR_X},{QR_Y})")
