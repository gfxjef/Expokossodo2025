"""
Sistema de impresión térmica usando ESC/POS
Basado en test_escpos_50mm.py que SÍ funciona en 4BARCODE 3B-303B
"""

import subprocess
import os
import time
import tempfile

class TermalPrinter4BARCODE:
    """
    Manejador de impresora térmica usando ESC/POS (que funciona)
    """
    
    def __init__(self, printer_name=None):
        self.printer_name = printer_name or self._find_thermal_printer()
        self.dpi = 203
        self.label_width_mm = 50
        self.label_height_mm = 50
        
    def _find_thermal_printer(self):
        """Buscar impresora térmica"""
        return "4BARCODE 3B-303B"
    
    def generate_escpos_commands(self, qr_text, user_data):
        """
        Generar comandos ESC/POS optimizados para 4BARCODE 3B-303B
        Basado en test_escpos_50mm.py que SÍ funciona
        """
        ESC = b'\x1b'
        GS = b'\x1d'
        
        commands = []
        
        # INICIALIZAR (exacto como en test que funciona)
        commands.append(ESC + b'@')  # Reset
        
        # CENTRAR TEXTO
        commands.append(ESC + b'a' + b'\x01')  # Center align
        
        # TÍTULO PRINCIPAL
        commands.append(ESC + b'!' + b'\x10')  # Doble altura
        commands.append(b'EXPOKOSSODO 2025\n')
        commands.append(ESC + b'!' + b'\x00')  # Normal
        
        # Línea separadora (como en test)
        commands.append(b'-' * 32 + b'\n')
        
        # INFORMACIÓN DEL USUARIO
        nombre = user_data.get('nombres', 'Usuario')[:25]
        empresa = user_data.get('empresa', '')[:20] 
        cargo = user_data.get('cargo', '')[:20]
        
        # Texto del usuario
        if nombre:
            commands.append(f'{nombre}\n'.encode('utf-8', errors='ignore'))
        if empresa:
            commands.append(f'{empresa}\n'.encode('utf-8', errors='ignore'))
        if cargo:
            commands.append(f'{cargo}\n'.encode('utf-8', errors='ignore'))
        
        # Espacio (como en test)
        commands.append(b'\n')
        
        # CÓDIGO QR (EXACTO como en test que funciona)
        try:
            qr_data = qr_text.encode('utf-8')
            qr_len = len(qr_data) + 3
            pL = qr_len & 0xFF
            pH = (qr_len >> 8) & 0xFF
            
            # Configurar QR (EXACTO como test_escpos_50mm.py)
            commands.append(GS + b'(k' + bytes([4, 0, 49, 65, 50, 0]))  # Modelo 2
            commands.append(GS + b'(k' + bytes([3, 0, 49, 67, 4]))      # Tamaño 4
            commands.append(GS + b'(k' + bytes([3, 0, 49, 69, 48]))     # Error L
            
            # Almacenar datos
            commands.append(GS + b'(k' + bytes([pL, pH, 49, 80, 48]) + qr_data)
            
            # Imprimir QR
            commands.append(GS + b'(k' + bytes([3, 0, 49, 81, 48]))
            
        except Exception as e:
            print(f"[WARN] Error generando QR: {e}")
            # Si falla QR, al menos imprimir texto
            commands.append(b'QR Code Error\n')
        
        # TEXTO FINAL (como en test)
        commands.append(b'\n')
        qr_display = qr_text[:25] if len(qr_text) > 25 else qr_text
        commands.append(qr_display.encode('utf-8', errors='ignore'))
        commands.append(b'\n')
        
        # Fecha y hora
        timestamp = time.strftime("%d/%m/%Y %H:%M")
        commands.append(timestamp.encode('utf-8'))
        commands.append(b'\n')
        
        # AVANCE DE PAPEL (exacto como test que funciona)
        commands.append(b'\n\n\n')
        
        return b''.join(commands)
    
    def send_raw_data(self, raw_data):
        """Enviar datos RAW usando el método que funciona"""
        try:
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(mode='wb', delete=False) as f:
                if isinstance(raw_data, str):
                    raw_data = raw_data.encode('utf-8')
                f.write(raw_data)
                temp_file = f.name
            
            # Usar método copy /b que funciona
            cmd = f'copy /b "{temp_file}" "{self.printer_name}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            
            # Limpiar archivo
            try:
                os.remove(temp_file)
            except:
                pass
            
            if "1 file(s) copied" in result.stdout:
                return {
                    "success": True,
                    "message": "Impresión enviada correctamente (ESC/POS)",
                    "printer": self.printer_name
                }
            else:
                return {
                    "success": False,
                    "error": "Error al enviar a impresora",
                    "details": result.stderr
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": "Error al imprimir",
                "details": str(e)
            }
    
    def print_qr_label(self, qr_text, user_data, mode='ESCPOS'):
        """Imprimir etiqueta con QR y datos del usuario usando ESC/POS"""
        try:
            # USAR ESC/POS que sabemos que funciona
            commands = self.generate_escpos_commands(qr_text, user_data)
            result = self.send_raw_data(commands)
            
            if result['success']:
                print(f"[OK] Etiqueta ESC/POS impresa: {user_data.get('nombres', 'Usuario')}")
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": "Error generando comandos ESC/POS",
                "details": str(e)
            }
    
    def test_print(self):
        """Imprimir etiqueta de prueba usando ESC/POS"""
        test_data = {
            "nombres": "PRUEBA ESC/POS",
            "empresa": "ExpoKossodo",
            "cargo": "Test System"
        }
        test_qr = "TEST|123456|DEMO|EXPO|" + str(int(time.time()))
        
        return self.print_qr_label(test_qr, test_data)
    
    def get_printer_status(self):
        """Obtener estado básico de la impresora"""
        try:
            cmd = 'wmic printer get name,status,workoffline'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if self.printer_name in result.stdout:
                return {
                    "success": True,
                    "printer": self.printer_name,
                    "status": 0,
                    "status_text": "Lista (ESC/POS Ready)",
                    "jobs": 0
                }
            else:
                return {
                    "success": False,
                    "error": "Impresora no encontrada"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": "No se pudo obtener estado de impresora",
                "details": str(e)
            }

def test_thermal_printer():
    """Función de prueba"""
    printer = TermalPrinter4BARCODE()
    
    status = printer.get_printer_status()
    print(f"Estado de impresora: {status}")
    
    if status['success']:
        print("Enviando prueba ESC/POS...")
        result = printer.test_print()
        print(f"Resultado: {result}")
    
    return status

if __name__ == "__main__":
    test_thermal_printer()