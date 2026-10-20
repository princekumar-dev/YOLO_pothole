<div align="center">

# PotholeAI — YOLO Pothole Detector

### Real-time pothole detection from a phone or laptop camera

[![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Ultralytics](https://img.shields.io/badge/YOLO11-Ultralytics-00EEFF?style=flat-square&logo=yolo&logoColor=black)](https://www.ultralytics.com)
[![Flask](https://img.shields.io/badge/Flask-SocketIO-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org)

</div>

## 🎯 Overview

**PotholeAI** fine-tunes a **YOLO11nano** detector on a 665-image pothole dataset and puts it to work in three ways, all included in this repo:

1. 📱 **Live web app** — point your **phone's camera** at the road and watch bounding boxes stream back in real time (Flask + SocketIO + browser WebSocket)
2. 🎥 **Video demo** — run detection over `p.mp4` in an OpenCV window
3. 🏋️ **Training pipeline** — dataset in YOLO format, VOC→YOLO label converter, and a one-command training script

## ✨ Features

- **Real-time inference** — browser captures frames → WebSocket → YOLO → boxes drawn back at ~interactive speed (confidence threshold 0.25)
- **Phone-friendly** — `app.py` auto-generates a self-signed HTTPS certificate so mobile browsers allow camera access, then prints your LAN URL to open on your phone
- **Fine-tuned YOLO11n** — nano variant for speed; trained weights (`best.pt`) are committed so the app runs instantly
- **Included dataset** — 665 image/label pairs in YOLO format (`images/` + `labels/`)
- **VOC → YOLO converter** — `voc2yolo.py` turns Pascal VOC XML annotations into YOLO txt labels
- **Reproducible training** — `train-pothole.py`: 50 epochs, 640px, batch 16, output under `runs/`

## 🧱 Project Structure

```
YOLO_pothole/
├── app.py                  # Flask + SocketIO live detection server (HTTPS on :5000)
├── seg.py                  # OpenCV video demo (p.mp4 → annotated frames)
├── train-pothole.py        # YOLO11n training script
├── voc2yolo.py             # Pascal VOC XML → YOLO txt label converter
├── pothole.yaml            # Dataset config (single class: pothole)
├── requirements.txt
├── images/ · labels/       # 665 training images + YOLO labels
├── runs/detect/runs/pothole/yolo11n-pothole/
│   └── weights/best.pt     # Fine-tuned model (loaded by app.py & seg.py)
├── yolo11n.pt              # Base Ultralytics weights
├── p.mp4                   # Sample road video for seg.py
├── templates/index.html    # Web app UI
└── static/                 # app.js (frame capture + box overlay) & styles
```

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/princekumar-dev/YOLO_pothole.git
cd YOLO_pothole
pip install -r requirements.txt
```

### 2. Live webcam app

```bash
python app.py
```

- Opens **https://localhost:5000** on your computer
- The console also prints a **LAN URL** (e.g. `https://192.168.x.x:5000`) — open it on your phone to use its camera
- Accept the self-signed certificate warning (it's generated locally; mobile browsers require HTTPS for camera access)
- `openssl` must be on your PATH to generate the certificate (on Windows, e.g. via Git for Windows)

### 3. Video demo

```bash
python seg.py
```

Runs detection on `p.mp4` and shows annotated frames in an OpenCV window.

## 🏋️ Training

```bash
python train-pothole.py
```

| Setting | Value |
|---------|-------|
| Base model | `yolo11n.pt` (nano) |
| Dataset | `pothole.yaml` → `images/` + `labels/` |
| Epochs | 50 |
| Image size | 640 |
| Batch | 16 |
| Output | `runs/pothole/yolo11n-pothole/weights/best.pt` |

> 💡 **Note:** `pothole.yaml` currently uses all images for both train and val (quick demo split). For honest metrics, split into `images/train` and `images/val` and update the YAML accordingly.

Have Pascal VOC annotations? Convert them first:

```bash
python voc2yolo.py    # ./annotations/*.xml → ./labels/*.txt
```

## 📊 Dataset

- **665 images** of road potholes with matching YOLO-format labels
- Single class: `0: pothole`
- Bounding-box format: `class x_center y_center width height` (normalized)

## ⚙️ Configuration

| File | What to tweak |
|------|---------------|
| `app.py` | `conf=0.25` detection threshold, model path |
| `train-pothole.py` | epochs, batch, image size, model variant (`yolo11s.pt`…) |
| `pothole.yaml` | dataset paths and class names |

## 📄 License

All rights reserved.
