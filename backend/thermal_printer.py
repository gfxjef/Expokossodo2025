import win32print

PRN = "4BARCODE 3B-303B"  # nombre exacto de tu impresora
QR  = "JEF|+51938101013|admin|A Tu Salud|1756136087"
NOMBRE = "Jefferson Camacho Portillo"

# cortar nombre a 10 caracteres máximo
NOMBRE_CORTO = NOMBRE[:15]

def send(raw: bytes):
    h = win32print.OpenPrinter(PRN, {"DesiredAccess": win32print.PRINTER_ACCESS_USE})
    win32print.StartDocPrinter(h, 1, ("TSPL_QR", None, "RAW"))
    win32print.StartPagePrinter(h)
    win32print.WritePrinter(h, raw)
    win32print.EndPagePrinter(h)
    win32print.EndDocPrinter(h)
    win32print.ClosePrinter(h)

# === Parámetros del layout ===
QR_X = 60
QR_Y = 60    # antes era 100 → lo subimos 40 px
QR_SIZE = 10   # celda QR grande

# ancho aprox. por caracter en fuente "3"
char_width = 20
text_width = len(NOMBRE_CORTO) * char_width

# centrar texto encima del QR (QR mide ~200 px aprox)
center_x = QR_X + (QR_SIZE * 8 * 3) // 2 - text_width // 2

tspl = (
    "SIZE 50 mm,50 mm\r\n"
    "GAP 2 mm,0 mm\r\n"
    "SPEED 3\r\n"
    "DENSITY 12\r\n"
    "DIRECTION 1\r\n"
    "REFERENCE 0,0\r\n"
    "CLS\r\n"
    # Nombre en grande, centrado sobre el QR
    f'TEXT {center_x},{QR_Y-50},"3",0,1,1,"{NOMBRE_CORTO}"\r\n'
    # QR debajo
    f'QRCODE {QR_X},{QR_Y},M,{QR_SIZE},A,0,"{QR}"\r\n'
    "PRINT 1\r\n"
).encode("ascii")

send(tspl)
print(f"[OK] Nombre centrado ({NOMBRE_CORTO}) + QR enviados (más arriba)")
