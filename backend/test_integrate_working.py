"""
Integrar exactamente lo que funciona de test_escpos_50mm.py
"""

# Simular función send_raw de test_escpos_50mm.py
def send_raw_simulation(printer_name, data, job_name="Test"):
    """
    Simulación de lo que hace test_escpos_50mm.py
    Crear archivo .py temporal que use win32print y ejecutarlo
    """
    import tempfile
    import subprocess
    import os
    
    # Crear script temporal que use win32print
    script_content = f'''
import win32print

PRINTER_NAME = "{printer_name}"

def send_raw(printer_name, data, job_name="{job_name}"):
    h = win32print.OpenPrinter(printer_name)
    try:
        docinfo = (job_name, None, "RAW")
        win32print.StartDocPrinter(h, 1, docinfo)
        win32print.StartPagePrinter(h)
        win32print.WritePrinter(h, data)
        win32print.EndPagePrinter(h)
        win32print.EndDocPrinter(h)
        return True
    except Exception as e:
        print(f"Error: {{e}}")
        return False
    finally:
        win32print.ClosePrinter(h)

# Datos a enviar
data = {repr(data)}

# Enviar
try:
    result = send_raw(PRINTER_NAME, data)
    print(f"[TEMP_SCRIPT] Resultado: {{result}}")
except Exception as e:
    print(f"[TEMP_SCRIPT] Error: {{e}}")
'''
    
    try:
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.py') as f:
            f.write(script_content)
            temp_script = f.name
        
        # Ejecutar el script temporal
        result = subprocess.run(['python', temp_script], 
                              capture_output=True, text=True, timeout=10)
        
        # Limpiar
        os.remove(temp_script)
        
        # Verificar resultado
        if result.returncode == 0 and "[TEMP_SCRIPT] Resultado: True" in result.stdout:
            return {"success": True, "message": "Enviado via script temporal"}
        else:
            return {
                "success": False, 
                "error": "Script temporal falló",
                "details": result.stderr + result.stdout
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

# Generar comandos ESC/POS como en test que funciona
def generate_working_escpos(qr_text, user_data):
    ESC = b'\x1b'
    GS = b'\x1d'
    
    commands = []
    
    # Exacto como test_escpos_50mm.py
    commands.append(ESC + b'@')  # Reset
    commands.append(ESC + b'a' + b'\x01')  # Center align
    
    # Título
    commands.append(ESC + b'!' + b'\x10')  # Doble altura
    commands.append(b'EXPOKOSSODO 2025\\n')
    commands.append(ESC + b'!' + b'\x00')  # Normal
    
    # Línea separadora
    commands.append(b'-' * 32 + b'\\n')
    
    # Usuario
    nombre = user_data.get('nombres', 'Usuario')[:25]
    empresa = user_data.get('empresa', '')
    cargo = user_data.get('cargo', '')
    
    if nombre:
        commands.append(f'{nombre}\\n'.encode('utf-8', errors='ignore'))
    if empresa:
        commands.append(f'{empresa}\\n'.encode('utf-8', errors='ignore'))
    if cargo:
        commands.append(f'{cargo}\\n'.encode('utf-8', errors='ignore'))
    
    commands.append(b'Etiqueta 50x50mm\\n')
    commands.append(b'\\n')
    
    # QR (exacto como test)
    qr_data = qr_text.encode('utf-8')
    qr_len = len(qr_data) + 3
    pL = qr_len & 0xFF
    pH = (qr_len >> 8) & 0xFF
    
    commands.append(GS + b'(k' + bytes([4, 0, 49, 65, 50, 0]))  # Modelo 2
    commands.append(GS + b'(k' + bytes([3, 0, 49, 67, 4]))      # Tamaño 4
    commands.append(GS + b'(k' + bytes([3, 0, 49, 69, 48]))     # Error L
    commands.append(GS + b'(k' + bytes([pL, pH, 49, 80, 48]) + qr_data)
    commands.append(GS + b'(k' + bytes([3, 0, 49, 81, 48]))
    
    # Final
    commands.append(b'\\n')
    commands.append(qr_text[:25].encode('utf-8', errors='ignore'))
    commands.append(b'\\n')
    commands.append(b'\\n\\n\\n')
    
    return b''.join(commands)

# Probar
if __name__ == "__main__":
    print("=== PRUEBA DE INTEGRACIÓN ===")
    
    user_data = {
        "nombres": "JEFFERSON CAMACHO",
        "empresa": "A TU SALUD",
        "cargo": "ADMIN"
    }
    
    qr_text = "JEF|938101013|ADMIN|ATUSALUD|123456"
    
    commands = generate_working_escpos(qr_text, user_data)
    result = send_raw_simulation("4BARCODE 3B-303B", commands)
    
    print(f"Resultado: {result}")
    print("Si funciona, adaptar este método al sistema principal.")