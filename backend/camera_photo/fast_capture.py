import cv2
import datetime
import threading

class FastCapture:
    def __init__(self, camera_index=0):
        self.camera_index = camera_index
        self.cap = None
        self.last_frame = None
        self.running = False
        self.thread = None
        
    def start_streaming(self):
        """Inicia streaming continuo en background para captura instantánea"""
        self.cap = cv2.VideoCapture(self.camera_index)
        
        if not self.cap.isOpened():
            print(f"[X] No se pudo abrir la camara {self.camera_index}")
            return False
        
        # Configuraciones de velocidad máxima
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FPS, 60)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)  # Muy baja para máxima velocidad
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
        
        self.running = True
        self.thread = threading.Thread(target=self._update_frame)
        self.thread.daemon = True
        self.thread.start()
        
        print(f"[OK] Streaming iniciado en camara {self.camera_index}")
        return True
    
    def _update_frame(self):
        """Actualiza continuamente el último frame en background"""
        while self.running:
            ret, frame = self.cap.read()
            if ret:
                self.last_frame = frame
    
    def capture_instant(self):
        """Captura instantánea desde el último frame disponible"""
        if self.last_frame is None:
            print("[X] No hay frame disponible")
            return False
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # microsegundos
        filename = f"foto_instant_{timestamp}.jpg"
        
        # Captura instantánea sin demora
        cv2.imwrite(filename, self.last_frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        
        height, width, channels = self.last_frame.shape
        print(f"[OK] Captura instantánea: {filename}")
        print(f"     Resolución: {width}x{height}")
        
        return True
    
    def stop_streaming(self):
        """Detiene el streaming"""
        self.running = False
        if self.thread:
            self.thread.join()
        if self.cap:
            self.cap.release()
        print("[*] Streaming detenido")

def ultra_fast_capture(camera_index=0):
    """Función de captura ultrarrápida usando streaming"""
    capturer = FastCapture(camera_index)
    
    if not capturer.start_streaming():
        return False
    
    # Esperar mínimo para que se capture el primer frame
    import time
    time.sleep(0.1)
    
    # Captura instantánea
    result = capturer.capture_instant()
    
    # Limpiar recursos
    capturer.stop_streaming()
    
    return result

if __name__ == "__main__":
    print("=== Captura Ultra Rápida ===\n")
    
    # Modo 1: Captura única ultrarrápida
    print("1. Captura única ultrarrápida:")
    ultra_fast_capture(0)
    
    print("\n2. Modo streaming para capturas múltiples:")
    # Modo 2: Streaming para múltiples capturas
    capturer = FastCapture(0)
    if capturer.start_streaming():
        import time
        time.sleep(0.2)  # Esperar inicialización
        
        # Múltiples capturas instantáneas
        for i in range(3):
            print(f"   Captura {i+1}:")
            capturer.capture_instant()
            time.sleep(0.5)  # Pequeña pausa entre capturas
        
        capturer.stop_streaming()