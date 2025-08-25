import win32print

PRINTER_NAME = "4BARCODE 3B-303B"

hPrinter = win32print.OpenPrinter(PRINTER_NAME)
try:
    hJob = win32print.StartDocPrinter(hPrinter, 1, ("TestJob", None, "RAW"))
    win32print.StartPagePrinter(hPrinter)
    win32print.WritePrinter(hPrinter, b"SIZE 50 mm,50 mm\nGAP 2 mm,0 mm\nCLS\nTEXT 50,50,\"3\",0,1,1,\"TEST\"\nPRINT 1\n")
    win32print.EndPagePrinter(hPrinter)
    win32print.EndDocPrinter(hPrinter)
finally:
    win32print.ClosePrinter(hPrinter)
