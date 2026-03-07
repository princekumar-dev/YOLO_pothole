import cv2
from ultralytics import YOLO

# Load your trained YOLO11 pothole model
model = YOLO('runs/detect/runs/pothole/yolo11n-pothole/weights/best.pt')

cap = cv2.VideoCapture('p.mp4')
w, h = 1020, 500

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.resize(frame, (w, h))
    # Run inference with a lower confidence threshold and only the pothole class (id 0)
    results = model(frame, conf=0.1, classes=[0])
    aframe = results[0].plot()

    cv2.imshow('FRAME', aframe)
    # waitKey(1) gives near-real-time playback; ESC to exit
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()