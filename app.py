import base64
import io
import numpy as np
import cv2
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
from PIL import Image

app = Flask(__name__)
app.config['SECRET_KEY'] = 'pothole-detect-secret'
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

# Load model once at startup
print("Loading pothole detection model...")
model = YOLO('runs/detect/runs/pothole/yolo11n-pothole/weights/best.pt')
print("Model loaded successfully!")


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('frame')
def handle_frame(data):
    try:
        # Decode base64 image from browser
        img_data = base64.b64decode(data.split(',')[1])
        img = Image.open(io.BytesIO(img_data)).convert('RGB')
        frame = np.array(img)
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # Run YOLO inference
        results = model(frame, conf=0.25, classes=[0], verbose=False)
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    detections.append({
                        'x1': x1,
                        'y1': y1,
                        'x2': x2,
                        'y2': y2,
                        'conf': round(conf * 100, 1),
                        'label': 'Pothole'
                    })

        emit('detections', {'boxes': detections})

    except Exception as e:
        emit('error', {'message': str(e)})


if __name__ == '__main__':
    import socket
    import ssl
    import os

    # Generate a simple self-signed cert so mobile browsers allow camera access (requires HTTPS)
    cert_file = 'cert.pem'
    key_file = 'key.pem'
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("Generating self-signed SSL certificate for mobile camera access...")
        os.system('openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 -subj "/CN=localhost"')

    # Get local IP
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()

    print("\n" + "="*50)
    print("🚗 PotholeAI is ready!")
    print(f"📱 To use your phone camera, open this exact link on your phone:")
    print(f"👉 https://{IP}:5000 👈")
    print("   (Ignore the 'Not Secure' warning in the browser, it's safe)")
    print("="*50 + "\n")

    # Run with SSL
    if os.path.exists(cert_file) and os.path.exists(key_file):
        socketio.run(app, host='0.0.0.0', port=5000, debug=False, ssl_context=(cert_file, key_file))
    else:
        print("Warning: SSL certs not found, fallback to HTTP (mobile camera might fail)")
        socketio.run(app, host='0.0.0.0', port=5000, debug=False)
