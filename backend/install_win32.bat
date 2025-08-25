@echo off
cd /d "C:\Users\USER\Desktop\python projects\Expokossodo2025\backend"
call venv\Scripts\activate.bat
pip install pywin32
python -c "import win32print; print('OK: win32print instalado correctamente')"
pause