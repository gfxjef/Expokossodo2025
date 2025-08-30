import cv2

# Abrir la cámara (0 = cámara principal)
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("No se pudo abrir la cámara")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("No se pudo leer el frame")
        break

    cv2.imshow("Camara - Presiona Q para salir", frame)

    # Presiona "q" para cerrar
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()