"""
Diagnóstico simple de impresora 4BARCODE sin caracteres especiales
"""
import win32print

def diagnostico_simple():
    print("=== DIAGNOSTICO IMPRESORA 4BARCODE ===")
    
    printer_name = "4BARCODE 3B-303B"
    
    # 1. Verificar existencia
    print("\n1. Verificando impresora...")
    try:
        printers = [printer[2] for printer in win32print.EnumPrinters(2)]
        if printer_name in printers:
            print(f"[OK] Impresora '{printer_name}' encontrada")
        else:
            print(f"[ERROR] Impresora '{printer_name}' NO encontrada")
            print("Impresoras disponibles:")
            for p in printers:
                print(f"   - {p}")
            return False
    except Exception as e:
        print(f"[ERROR] Error listando impresoras: {e}")
        return False
    
    # 2. Verificar estado
    print("\n2. Verificando estado...")
    try:
        handle = win32print.OpenPrinter(printer_name)
        
        try:
            printer_info = win32print.GetPrinter(handle, 2)
            
            print(f"Nombre: {printer_info['pPrinterName']}")
            print(f"Puerto: {printer_info['pPortName']}")
            print(f"Controlador: {printer_info['pDriverName']}")
            
            status = printer_info['Status']
            print(f"Codigo de estado: {status}")
            
            if status == 0:
                print("[OK] Impresora LISTA para imprimir")
            else:
                print("[WARNING] Impresora con problemas:")
                if status & 0x00000001: print("   - En pausa")
                if status & 0x00000002: print("   - Error")
                if status & 0x00000010: print("   - Sin papel")
                if status & 0x00000080: print("   - Offline")
                if status & 0x00000400: print("   - Imprimiendo")
                
        finally:
            win32print.ClosePrinter(handle)
            
    except Exception as e:
        print(f"[ERROR] No se pudo verificar estado: {e}")
    
    # 3. Verificar cola de impresión
    print("\n3. Verificando cola de impresion...")
    try:
        handle = win32print.OpenPrinter(printer_name)
        
        try:
            jobs = win32print.EnumJobs(handle, 0, -1, 1)
            
            if len(jobs) == 0:
                print("[OK] Cola de impresion vacia")
            else:
                print(f"[WARNING] Hay {len(jobs)} trabajos en cola:")
                for i, job in enumerate(jobs, 1):
                    print(f"   {i}. ID: {job['JobId']}")
                    print(f"      Documento: {job['pDocument']}")
                    print(f"      Estado: {job['Status']}")
                    
                    # Cancelar trabajos atascados
                    try:
                        win32print.SetJob(handle, job['JobId'], 0, None, win32print.JOB_CONTROL_CANCEL)
                        print(f"      [OK] Trabajo {job['JobId']} cancelado")
                    except:
                        print(f"      [ERROR] No se pudo cancelar trabajo {job['JobId']}")
                    
        finally:
            win32print.ClosePrinter(handle)
            
    except Exception as e:
        print(f"[ERROR] Error verificando cola: {e}")
    
    # 4. Prueba de conectividad
    print("\n4. Probando conectividad...")
    try:
        handle = win32print.OpenPrinter(printer_name)
        win32print.ClosePrinter(handle)
        print("[OK] Conexion con impresora exitosa")
    except Exception as e:
        print(f"[ERROR] Error de conexion: {e}")
        return False
    
    # 5. Verificar impresora por defecto
    print("\n5. Verificando impresora por defecto...")
    try:
        default = win32print.GetDefaultPrinter()
        if default == printer_name:
            print(f"[OK] '{printer_name}' ES la impresora por defecto")
        else:
            print(f"[WARNING] Impresora por defecto actual: '{default}'")
            print(f"[WARNING] '{printer_name}' NO es la predeterminada")
            
    except Exception as e:
        print(f"[ERROR] Error verificando impresora por defecto: {e}")
    
    print("\n" + "="*50)
    print("RESUMEN DEL DIAGNOSTICO:")
    print("- Si hay [OK] en todo, la impresora deberia funcionar")
    print("- Si hay [ERROR], revisa la conexion USB y que este encendida")
    print("- Si hay [WARNING], puede haber trabajos atascados o papel")
    print("- Trabajos en cola fueron cancelados automaticamente")
    print("="*50)
    
    return True

if __name__ == "__main__":
    diagnostico_simple()