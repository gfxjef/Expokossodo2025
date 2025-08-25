"""
Prueba ESC/POS para etiqueta de 50x50mm
"""
import win32print

PRINTER_NAME = "4BARCODE 3B-303B"  # Nombre exacto detectado

def send_raw(printer_name, data, job_name="ESC/POS Test"):
    h = win32print.OpenPrinter(printer_name)
    try:
        docinfo = (job_name, None, "RAW")
        win32print.StartDocPrinter(h, 1, docinfo)
        win32print.StartPagePrinter(h)
        win32print.WritePrinter(h, data)
        win32print.EndPagePrinter(h)
        win32print.EndDocPrinter(h)
    finally:
        win32print.ClosePrinter(h)

# Comandos ESC/POS básicos
ESC = b'\x1b'
GS = b'\x1d'

commands = []

# Inicializar
commands.append(ESC + b'@')  # Reset

# Centrar texto
commands.append(ESC + b'a' + b'\x01')  # Center align

# Título
commands.append(ESC + b'!' + b'\x10')  # Doble altura
commands.append(b'TEST 50mm\n')
commands.append(ESC + b'!' + b'\x00')  # Normal

# Línea separadora
commands.append(b'-' * 32 + b'\n')

# Texto normal
commands.append(b'EXPOKOSSODO 2025\n')
commands.append(b'Prueba ESC/POS\n')
commands.append(b'Etiqueta 50x50mm\n')

# Espacio
commands.append(b'\n\n')

# QR Code simple (si soporta)
qr_data = b'TEST123'
qr_len = len(qr_data) + 3
pL = qr_len & 0xFF
pH = (qr_len >> 8) & 0xFF

# Configurar QR
commands.append(GS + b'(k' + bytes([4, 0, 49, 65, 50, 0]))  # Modelo 2
commands.append(GS + b'(k' + bytes([3, 0, 49, 67, 4]))      # Tamaño 4
commands.append(GS + b'(k' + bytes([3, 0, 49, 69, 48]))     # Error L

# Almacenar datos
commands.append(GS + b'(k' + bytes([pL, pH, 49, 80, 48]) + qr_data)

# Imprimir QR
commands.append(GS + b'(k' + bytes([3, 0, 49, 81, 48]))

# Texto final
commands.append(b'\n')
commands.append(b'FIN PRUEBA\n')

# Avance de papel
commands.append(b'\n\n\n')

# Unir comandos
data = b''.join(commands)

# Enviar
try:
    send_raw(PRINTER_NAME, data)
    print("[OK] Enviado ESC/POS a:", PRINTER_NAME)
    print("Si ves texto impreso, ESC/POS funciona.")
    print("Si no imprime nada, probar modo TSPL.")
except Exception as e:
    print(f"[ERROR] {e}")