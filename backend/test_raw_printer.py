"""
Prueba con impresora Generic/Text Only
"""
import subprocess
import tempfile

PRINTER_RAW = "4BARCODE_RAW"  # Cambiar por el nombre que pongas

def test_raw_printer():
    # TSPL simple
    tspl = "SIZE 50 mm,50 mm\r\nCLS\r\nTEXT 100,100,\"2\",0,1,1,\"RAW OK\"\r\nPRINT 1,1\r\n"
    
    try:
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.prn') as f:
            f.write(tspl)
            temp_file = f.name
        
        cmd = f'copy /b "{temp_file}" "{PRINTER_RAW}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if "1 file(s) copied" in result.stdout:
            print("[OK] Enviado a impresora RAW")
            print("Si imprime 'RAW OK', la impresora Generic funciona")
        else:
            print(f"[ERROR] {result.stderr}")
            
        import os
        os.remove(temp_file)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_raw_printer()
