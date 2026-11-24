<div align="center">

# PotholeAI

### Real-time pothole intelligence for road, camera, and video workflows

[![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Ultralytics](https://img.shields.io/badge/YOLO11-Ultralytics-00EEFF?style=flat-square&logo=yolo&logoColor=black)](https://www.ultralytics.com)
[![Flask](https://img.shields.io/badge/Flask-SocketIO-000000?style=flat-square&logo=flask&logoColor=white)](https://flask-socketio.readthedocs.io/)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org)

</div>

PotholeAI combines a fine-tuned YOLO11n pothole detector with live camera and video tracking, mobile-first inspection tools, severity grading, snapshot archives, GPS metadata, and downloadable reports.

## Features

### Live road scanner

- Webcam and rear-camera support on supported phones and laptops
- Bundled `p.mp4` demo stream
- Local MP4 or video-file playback
- Live YOLO bounding boxes, confidence, severity, and latency
- Flip lens, snapshot, pause/resume, and acoustic alert controls
- Adjustable inference interval from high-frequency to power-saving mode

### Smooth pothole tracking

- Centroid and IoU matching for persistent pothole identities
- Velocity prediction between inference replies
- Camera-motion detection and shake compensation
- Predictive canvas rendering for smooth moving boxes
- Confirmation filtering to avoid counting transient false detections
- Session encounter and active-pothole telemetry

### Pothole analysis

- Minor, moderate, and critical severity classification
- Road surface hazard index
- Relative damage area
- Risk score out of 10
- Confidence presets: 15%, 25%, 50%, and 75%
- Suggested repair or municipal action

### Image inspection studio

- Curated built-in evaluation samples
- JPG, PNG, and WEBP image uploads
- Drag-and-drop upload support
- Annotated and original image views
- Pothole inventory with confidence, severity, risk, dimensions, and coordinates
- Individual inspection modal with crop preview and repair guidance
- Annotated JPEG export
- Structured JSON audit export

### Live detection archive

- Confirmed live detections are captured as snapshots
- Snapshots include confidence, severity, timestamp, crop, and optional GPS coordinates
- Cards remain available during the browser session
- Hover highlights the matching live box
- Clicking a snapshot opens it in the Inspection Studio
- Settings include an action to clear saved snapshot data

### Mobile experience

- Compact responsive navigation
- Full-width live and portrait video stages
- Bottom-sheet inspection and settings dialogs
- Scrollable mobile inventory cards
- Full-width export and report actions
- Compact labels, telemetry, and preset controls

## App workflow

1. Open PotholeAI in a browser.
2. Choose **Live Camera Scan**, **Run p.mp4 Video Test**, or select a local video.
3. Set the confidence threshold or choose a preset.
4. Confirmed detections receive stable track IDs and appear in live telemetry and the event stream.
5. Use **Audit Still** to send the current frame to the **Image Inspection** studio.
6. Inspect individual potholes, review risk and coordinates, then export an image or JSON report.
7. Live captures appear in **Real-Time Captured Potholes** until cleared in Settings.

## Quick start

### Install dependencies

```bash
git clone https://github.com/princekumar-dev/YOLO_pothole.git
cd YOLO_pothole
pip install -r requirements.txt
```

### Run the web app

```bash
python app.py
```

Open `http://localhost:5000`.

For camera access on a phone or tablet, open the app from a LAN address or a secure localhost context. Some mobile browsers require HTTPS for physical camera access.

The server provides:

- `POST /api/detect/image`
- `GET /api/samples`
- `GET /api/model/metrics`
- `GET /api/health`
- `GET /health`

### Run the standalone video demo

```bash
python seg.py
```

The script displays detection boxes over `p.mp4` in an OpenCV window.

## Image detection API

Send a built-in sample:

```bash
curl -X POST http://localhost:5000/api/detect/image \
  -H "Content-Type: application/json" \
  -d '{"sample_id":"sample1_complex","conf":0.25,"iou":0.45,"max_det":50}'
```

Send an uploaded image as base64:

```json
{
  "image_base64": "data:image/jpeg;base64,...",
  "conf": 0.25,
  "iou": 0.45,
  "max_det": 50
}
```

The response contains:

- Detection count and severity totals
- Overall road status and hazard score
- Inference time and image dimensions
- Bounding boxes and confidence
- Area percentage and risk score
- Repair recommendation
- Cropped thumbnails
- Annotated image

## Project structure

```text
YOLO_pothole/
├── app.py
├── templates/
│   └── index.html
├── static/
│   ├── app.js
│   ├── style.css
│   ├── samples/
│   └── metrics/
├── seg.py
├── train-pothole.py
├── voc2yolo.py
├── pothole.yaml
├── requirements.txt
├── yolo11n.pt
├── p.mp4
├── images/
├── labels/
└── runs/detect/runs/pothole/yolo11n-pothole/weights/best.pt
```

## Training

```bash
python train-pothole.py
```

| Setting | Value |
|---------|-------|
| Base model | YOLO11n |
| Dataset | `pothole.yaml` |
| Training images | 665 |
| Epochs | 50 |
| Input size | 640 |
| Batch | 16 |
| Output | `runs/detect/runs/pothole/yolo11n-pothole/weights/best.pt` |

Pascal VOC labels can be converted to YOLO format:

```bash
python voc2yolo.py
```

## Configuration

| File | Purpose |
|------|---------|
| `app.py` | Flask routes, YOLO loading, inference, severity, and API responses |
| `templates/index.html` | App layout and modal structure |
| `static/app.js` | Live capture, tracking, archive, exports, and UI behavior |
| `static/style.css` | Responsive desktop/mobile design |
| `train-pothole.py` | Model training settings |
| `pothole.yaml` | Dataset and class configuration |

## Dataset

- 665 pothole images and matching YOLO labels
- Single class: `0: pothole`
- Bounding boxes use YOLO normalized center format

## License

All rights reserved.
