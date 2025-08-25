"""
Sistema de impresión térmica alternativo usando subprocess
Para cuando win32print no está disponible
"""

import subprocess
import os
import time
import tempfile

class TermalPrinter4BARCODE:
    """
    Manejador alternativo usando comandos de Windows
    """
    
    def __init__(self, printer_name=None):
        self.printer_name = printer_name or self._find_thermal_printer()
        self.dpi = 203
        self.label_width_mm = 50
        self.label_height_mm = 50
        
    def _find_thermal_printer(self):
        """Buscar impresora térmica - priorizar RAW si existe"""
        try:
            # Obtener lista de impresoras
            cmd = 'wmic printer get name'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            printers = result.stdout
            
            # Priorizar impresora RAW si existe
            if "4BARCODE_RAW" in printers:
                print("[PRINTER] Usando impresora RAW: 4BARCODE_RAW")
                return "4BARCODE_RAW"
            elif "4BARCODE 3B-303B" in printers:
                print("[PRINTER] Usando impresora original: 4BARCODE 3B-303B")
                return "4BARCODE 3B-303B"
            else:
                print("[PRINTER] Impresora no encontrada, usando por defecto")
                return "4BARCODE 3B-303B"
                
        except:
            return "4BARCODE 3B-303B"
    
    def generate_tspl_commands(self, qr_text, user_data):
        """Generar comandos TSPL para etiqueta de 50x50mm"""
        commands = []
        
        # Configuración inicial
        commands.append("SIZE 50 mm, 50 mm")
        commands.append("GAP 2 mm, 0 mm")
        commands.append("SPEED 3")
        commands.append("DENSITY 8")
        commands.append("DIRECTION 1")
        commands.append("REFERENCE 0,0")
        commands.append("CLS")
        
        # Título
        commands.append('TEXT 200,30,"3",0,1,1,"EXPOKOSSODO 2025"')
        
        # QR Code
        commands.append(f'QRCODE 150,100,"L",4,"A",0,"{qr_text}"')
        
        # Datos usuario
        nombre = user_data.get('nombres', 'Usuario')[:20]
        empresa = user_data.get('empresa', '')[:18]
        cargo = user_data.get('cargo', '')[:18]
        
        commands.append(f'TEXT 200,240,"2",0,1,1,"{nombre}"')
        
        if empresa:
            commands.append(f'TEXT 200,270,"1",0,1,1,"{empresa}"')
        if cargo:
            commands.append(f'TEXT 200,295,"1",0,1,1,"{cargo}"')
        
        # QR texto
        qr_short = qr_text[:25] if len(qr_text) > 25 else qr_text
        commands.append(f'TEXT 200,325,"0",0,1,1,"{qr_short}"')
        
        # Fecha/hora
        timestamp = time.strftime("%d/%m %H:%M")
        commands.append(f'TEXT 200,350,"0",0,1,1,"{timestamp}"')
        
        commands.append("PRINT 1,1")
        
        return "\r\n".join(commands)
    
    def send_raw_data(self, raw_data):
        """Enviar datos usando archivo temporal y comando print"""
        try:
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.txt') as f:
                if isinstance(raw_data, str):
                    raw_data = raw_data.encode('utf-8')
                f.write(raw_data)
                temp_file = f.name
            
            # Primero intentar con comando print de Windows
            try:
                # Opción 1: Usar comando print directo
                cmd = f'print /D:"{self.printer_name}" "{temp_file}"'
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
                
                if result.returncode == 0 or "1 file(s) copied" in result.stdout:
                    os.remove(temp_file)
                    return {
                        "success": True,
                        "message": "Impresión enviada correctamente (print)",
                        "printer": self.printer_name
                    }
            except:
                pass
            
            # Opción 2: Usar copy /b para envío RAW
            try:
                # Compartir la impresora primero
                share_cmd = f'net share "{self.printer_name}"="{self.printer_name}" /GRANT:Everyone,FULL 2>nul'
                subprocess.run(share_cmd, shell=True, capture_output=True)
                
                # Enviar usando copy
                cmd = f'copy /b "{temp_file}" "\\\\localhost\\{self.printer_name}"'
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
                
                if "1 file(s) copied" in result.stdout:
                    os.remove(temp_file)
                    return {
                        "success": True,
                        "message": "Impresión enviada correctamente (copy)",
                        "printer": self.printer_name
                    }
            except:
                pass
            
            # Opción 3: Usar PowerShell
            try:
                ps_cmd = f'powershell -Command "Get-Content -Path \'{temp_file}\' -Encoding Byte | Out-Printer -Name \'{self.printer_name}\'"'
                result = subprocess.run(ps_cmd, shell=True, capture_output=True, text=True, timeout=5)
                
                if result.returncode == 0:
                    os.remove(temp_file)
                    return {
                        "success": True,
                        "message": "Impresión enviada correctamente (PowerShell)",
                        "printer": self.printer_name
                    }
            except:
                pass
            
            # Si todas las opciones fallan
            try:
                os.remove(temp_file)
            except:
                pass
            
            return {
                "success": False,
                "error": "No se pudo enviar a la impresora",
                "details": "Intente instalar pywin32: pip install pywin32"
            }
                
        except Exception as e:
            return {
                "success": False,
                "error": "Error al imprimir",
                "details": str(e)
            }
    
    def print_qr_label(self, qr_text, user_data, mode='TSPL'):
        """Imprimir etiqueta con QR y datos del usuario"""
        try:
            commands = self.generate_tspl_commands(qr_text, user_data)
            result = self.send_raw_data(commands)
            
            if result['success']:
                print(f"[OK] Etiqueta impresa: {user_data.get('nombres', 'Usuario')}")
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": "Error generando comandos de impresión",
                "details": str(e)
            }
    
    def test_print(self):
        """Imprimir etiqueta de prueba"""
        test_data = {
            "nombres": "PRUEBA SISTEMA",
            "empresa": "ExpoKossodo",
            "cargo": "Test Print"
        }
        test_qr = "TEST|123456|DEMO|EXPO|" + str(int(time.time()))
        
        return self.print_qr_label(test_qr, test_data)
    
    def get_printer_status(self):
        """Obtener estado básico de la impresora"""
        try:
            # Verificar si la impresora existe usando wmic
            cmd = 'wmic printer get name,status,workoffline'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if self.printer_name in result.stdout:
                return {
                    "success": True,
                    "printer": self.printer_name,
                    "status": 0,
                    "status_text": "Lista (verificación básica)",
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
        result = printer.test_print()
        print(f"Resultado de prueba: {result}")
    
    return status

if __name__ == "__main__":
    test_thermal_printer()