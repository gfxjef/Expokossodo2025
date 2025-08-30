import cv2

def test_camera_indices():
    """Prueba qué índices de cámara están disponibles"""
    available_cameras = []
    
    for i in range(10):  # Prueba los primeros 10 índices
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                print(f"[OK] Camara {i} disponible - Resolucion: {width}x{height}")
                available_cameras.append(i)
            else:
                print(f"[!] Camara {i} se abre pero no puede leer frames")
            cap.release()
        else:
            print(f"[X] Camara {i} no disponible")
    
    return available_cameras

if __name__ == "__main__":
    print("=== Detectando camaras disponibles ===\n")
    cameras = test_camera_indices()
    
    if cameras:
        print(f"\n[OK] Total de camaras encontradas: {len(cameras)}")
        print(f"     Indices disponibles: {cameras}")
    else:
        print("\n[X] No se encontraron camaras disponibles")
        print("    Verifica que tu camara este conectada y no este siendo usada por otra aplicacion")