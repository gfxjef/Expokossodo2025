import cv2
import datetime

def capture_photo(camera_index=0):
    """Captura una foto de la camara y la guarda"""
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"[X] No se pudo abrir la camara {camera_index}")
        return False
    
    # Configuraciones para optimizar velocidad
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Buffer mínimo para reducir latencia
    cap.set(cv2.CAP_PROP_FPS, 30)        # FPS alto para respuesta rápida
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)   # Resolución más baja para velocidad
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print(f"[*] Capturando foto desde camara {camera_index}...")
    
    # Solo 1 intento de captura para máxima velocidad
    ret, frame = cap.read()
    if ret:
        # Generar nombre unico para la foto
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"foto_{timestamp}.jpg"
        
        # Guardar con compresión optimizada para velocidad
        cv2.imwrite(filename, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        # Obtener informacion de la imagen
        height, width, channels = frame.shape
        print(f"[OK] Foto guardada: {filename}")
        print(f"     Resolucion: {width}x{height}")
        print(f"     Canales: {channels}")
        
        cap.release()
        return True
    
    print("[X] No se pudo capturar frame de la camara")
    cap.release()
    return False

if __name__ == "__main__":
    print("=== Captura de Foto ===\n")
    
    # Intentar con la camara principal
    success = capture_photo(0)
    
    if not success:
        print("\nIntentando con otros indices de camara...")
        for i in range(1, 5):
            if capture_photo(i):
                break