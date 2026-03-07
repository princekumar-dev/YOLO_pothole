"""Train a YOLO11 model for pothole detection.

Before running this script, make sure you have:

1. Installed ultralytics:
   pip install -U ultralytics

2. Prepared a dataset YAML file (e.g. pothole.yaml), for example:

   path: dataset
   train: images/train
   val: images/val

   names:
     0: pothole

3. Organised your dataset in YOLO format:
   dataset/
     images/train/*.jpg
     images/val/*.jpg
     labels/train/*.txt
     labels/val/*.txt

Then run this script with:
   python train-pothole.py
"""

from ultralytics import YOLO


def main() -> None:
    # Path to your dataset YAML file
    data_yaml = "pothole.yaml"  # change if your YAML has a different name or path

    # Choose a YOLO11 model variant; you can use yolo11s.pt, yolo11m.pt, etc.
    # For segmentation instead of detection, use a *-seg model, e.g. "yolo11n-seg.pt".
    model = YOLO("yolo11n.pt")

    # Basic training configuration; adjust as needed
    model.train(
        data=data_yaml,
        epochs=50,        # increase for better results if you have time
        imgsz=640,
        batch=16,
        project="runs/pothole",  # output directory
        name="yolo11n-pothole",  # experiment name
        exist_ok=True,            # overwrite existing run with same name
    )


if __name__ == "__main__":
    main()
