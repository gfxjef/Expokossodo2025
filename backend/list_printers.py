import win32print

flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
print("=== Impresoras instaladas ===")
print("-" * 50)
printers = win32print.EnumPrinters(flags)
for i, (flags, description, name, comment) in enumerate(printers):
    print(f"{i+1}. Nombre: {name}")
    if description:
        print(f"   Descripción: {description}")
    if comment:
        print(f"   Comentario: {comment}")
    print("-" * 50)

# También obtener impresora por defecto
default_printer = win32print.GetDefaultPrinter()
print(f"\nImpresora por defecto: {default_printer}")
print("\n=== Copiar el nombre EXACTO de tu impresora 4BARCODE para las pruebas ===")