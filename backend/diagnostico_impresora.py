"""
Diagnóstico completo de la impresora 4BARCODE 3B-303B
Verificar estado, cola de impresión y conectividad
"""
import win32print
import win32api
import time

def diagnostico_completo_impresora():
    """Diagnóstico completo de la impresora"""
    
    print("=== DIAGNOSTICO COMPLETO IMPRESORA 4BARCODE ===")
    
    printer_name = "4BARCODE 3B-303B"
    
    # 1. Verificar si la impresora existe
    print("\n1. VERIFICANDO EXISTENCIA DE IMPRESORA...")
    try:
        printers = [printer[2] for printer in win32print.EnumPrinters(2)]
        if printer_name in printers:
            print(f"✅ Impresora '{printer_name}' ENCONTRADA")
        else:
            print(f"❌ Impresora '{printer_name}' NO ENCONTRADA")
            print("Impresoras disponibles:")
            for p in printers:
                print(f"   - {p}")
            return False
    except Exception as e:
        print(f"❌ Error listando impresoras: {e}")
        return False
    
    # 2. Verificar estado de la impresora
    print("\n2. VERIFICANDO ESTADO DE LA IMPRESORA...")
    try:
        handle = win32print.OpenPrinter(printer_name)
        
        try:
            printer_info = win32print.GetPrinter(handle, 2)
            
            print(f"Nombre: {printer_info['pPrinterName']}")
            print(f"Puerto: {printer_info['pPortName']}")
            print(f"Controlador: {printer_info['pDriverName']}")
            
            status = printer_info['Status']
            print(f"Estado numérico: {status}")
            
            # Decodificar estados
            if status == 0:
                print("✅ Estado: LISTA (Ready)")
            else:
                print("⚠️ Estado con problemas:")
                if status & 0x00000001: print("   - En pausa")
                if status & 0x00000002: print("   - Error")
                if status & 0x00000004: print("   - Eliminando trabajos")
                if status & 0x00000008: print("   - Atasco de papel")
                if status & 0x00000010: print("   - Sin papel")
                if status & 0x00000020: print("   - Alimentación manual requerida")
                if status & 0x00000040: print("   - Problema con papel")
                if status & 0x00000080: print("   - Offline")
                if status & 0x00000100: print("   - IO Activo")
                if status & 0x00000200: print("   - Ocupada")
                if status & 0x00000400: print("   - Imprimiendo")
                if status & 0x00000800: print("   - Salida llena")
                if status & 0x00001000: print("   - No disponible")
                if status & 0x00002000: print("   - Esperando")
                if status & 0x00004000: print("   - Procesando")
                if status & 0x00008000: print("   - Inicializando")
                if status & 0x00010000: print("   - Calentando")
                if status & 0x00020000: print("   - Tóner bajo")
                if status & 0x00040000: print("   - Sin tóner")
                if status & 0x00080000: print("   - Página punt")
                if status & 0x00100000: print("   - Intervención del usuario requerida")
                if status & 0x00200000: print("   - Sin memoria")
                if status & 0x00400000: print("   - Puerta abierta")
                if status & 0x00800000: print("   - Error servidor desconocido")
                if status & 0x01000000: print("   - Modo de ahorro de energía")
                
        finally:
            win32print.ClosePrinter(handle)
            
    except Exception as e:
        print(f"❌ Error verificando estado: {e}")
    
    # 3. Verificar cola de impresión
    print("\n3. VERIFICANDO COLA DE IMPRESIÓN...")
    try:
        handle = win32print.OpenPrinter(printer_name)
        
        try:
            jobs = win32print.EnumJobs(handle, 0, -1, 1)
            
            if len(jobs) == 0:
                print("✅ Cola de impresión VACÍA")
            else:
                print(f"⚠️ Hay {len(jobs)} trabajos en cola:")
                for i, job in enumerate(jobs, 1):
                    print(f"   {i}. ID: {job['JobId']}, Estado: {job['Status']}")
                    print(f"      Documento: {job['pDocument']}")
                    print(f"      Usuario: {job['pUserName']}")
                    print(f"      Páginas: {job['TotalPages']}")
                    
                    # Intentar cancelar trabajos atascados
                    try:
                        win32print.SetJob(handle, job['JobId'], 0, None, win32print.JOB_CONTROL_CANCEL)
                        print(f"      → Trabajo {job['JobId']} CANCELADO")
                    except:
                        print(f"      → No se pudo cancelar trabajo {job['JobId']}")
                    
        finally:
            win32print.ClosePrinter(handle)
            
    except Exception as e:
        print(f"❌ Error verificando cola: {e}")
    
    # 4. Prueba de conectividad básica
    print("\n4. PRUEBA DE CONECTIVIDAD...")
    try:
        handle = win32print.OpenPrinter(printer_name)
        win32print.ClosePrinter(handle)
        print("✅ Conexión con impresora EXITOSA")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False
    
    # 5. Verificar si es impresora por defecto
    print("\n5. VERIFICANDO IMPRESORA POR DEFECTO...")
    try:
        default = win32print.GetDefaultPrinter()
        if default == printer_name:
            print(f"✅ '{printer_name}' ES la impresora por defecto")
        else:
            print(f"⚠️ Impresora por defecto: '{default}'")
            print(f"⚠️ '{printer_name}' NO es la predeterminada")
            
            # Ofrecer cambiarla
            print("\n¿Quieres establecer 4BARCODE como predeterminada? (s/n)")
            
    except Exception as e:
        print(f"❌ Error verificando impresora por defecto: {e}")
    
    print("\n" + "="*60)
    print("DIAGNÓSTICO COMPLETADO")
    print("Si hay trabajos en cola, fueron cancelados automáticamente")
    print("Si la impresora está offline o con error, revisa:")
    print("- Cable USB conectado")
    print("- Impresora encendida")
    print("- Papel/etiquetas cargadas correctamente")
    print("- No hay atascos")
    print("="*60)
    
    return True

if __name__ == "__main__":
    diagnostico_completo_impresora()