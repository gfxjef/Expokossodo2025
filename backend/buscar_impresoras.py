"""
Buscar todas las impresoras disponibles en el sistema
"""
import win32print

def buscar_impresoras():
    """Buscar y mostrar todas las impresoras disponibles"""
    
    print("=== BÚSQUEDA DE IMPRESORAS DISPONIBLES ===")
    
    try:
        # Obtener lista de impresoras
        printers = [printer[2] for printer in win32print.EnumPrinters(2)]
        
        print(f"\nSe encontraron {len(printers)} impresoras:")
        print("-" * 50)
        
        for i, printer in enumerate(printers, 1):
            print(f"{i}. {printer}")
            
            # Verificar si es la impresora por defecto
            try:
                default_printer = win32print.GetDefaultPrinter()
                if printer == default_printer:
                    print(f"   *** IMPRESORA POR DEFECTO ***")
            except:
                pass
            
            # Buscar palabras clave de impresora térmica
            thermal_keywords = ['4BARCODE', '3B-303B', 'Thermal', 'Label', 'TSPL', 'Zebra', 'Brother']
            for keyword in thermal_keywords:
                if keyword.upper() in printer.upper():
                    print(f"   → Posible impresora térmica (contiene '{keyword}')")
                    break
            
            print()
        
        # Mostrar impresora por defecto
        print("-" * 50)
        try:
            default = win32print.GetDefaultPrinter()
            print(f"Impresora por defecto del sistema: {default}")
        except Exception as e:
            print(f"No se pudo obtener impresora por defecto: {e}")
        
        print("\n=== RECOMENDACIÓN ===")
        print("Busca en la lista:")
        print("1. Impresoras que contengan '4BARCODE' o '3B-303B'")
        print("2. Impresoras que contengan 'Thermal' o 'Label'")
        print("3. La impresora que esté marcada como 'POR DEFECTO'")
        
        return printers
        
    except Exception as e:
        print(f"Error buscando impresoras: {e}")
        return []

if __name__ == "__main__":
    impresoras = buscar_impresoras()
    
    if impresoras:
        print(f"\nTotal de impresoras encontradas: {len(impresoras)}")
    else:
        print("\nNo se encontraron impresoras disponibles")