"""Convert Pascal VOC XML annotations in ./annotations into YOLO TXT labels.

Usage (from this folder):
    C:/Users/princ/AppData/Local/Python/pythoncore-3.14-64/python.exe voc2yolo.py

This script assumes:
- Images are in ./images with names like potholes0.png
- Annotations are in ./annotations with matching potholes0.xml
- Single class: 'pothole' -> class id 0

It will create ./labels and write one TXT file per image
with YOLO-format bounding boxes.
"""

import os
import xml.etree.ElementTree as ET
from pathlib import Path

# Folders
ANNOT_DIR = Path("annotations")
LABEL_DIR = Path("labels")

# Class mapping
CLASS_MAP = {"pothole": 0}


def convert_annotation(xml_path: Path) -> None:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    filename = root.findtext("filename")
    size = root.find("size")
    if size is None or filename is None:
        return

    img_w = float(size.findtext("width", default="0"))
    img_h = float(size.findtext("height", default="0"))
    if img_w <= 0 or img_h <= 0:
        return

    stem = Path(filename).stem  # e.g. potholes0
    label_path = LABEL_DIR / f"{stem}.txt"

    lines: list[str] = []

    for obj in root.findall("object"):
        name = obj.findtext("name")
        if name is None:
            continue
        if name not in CLASS_MAP:
            # Skip unknown classes
            continue
        cls_id = CLASS_MAP[name]

        bnd = obj.find("bndbox")
        if bnd is None:
            continue

        xmin = float(bnd.findtext("xmin", default="0"))
        ymin = float(bnd.findtext("ymin", default="0"))
        xmax = float(bnd.findtext("xmax", default="0"))
        ymax = float(bnd.findtext("ymax", default="0"))

        # Clip to image
        xmin = max(0.0, min(xmin, img_w))
        xmax = max(0.0, min(xmax, img_w))
        ymin = max(0.0, min(ymin, img_h))
        ymax = max(0.0, min(ymax, img_h))

        bw = xmax - xmin
        bh = ymax - ymin
        if bw <= 0 or bh <= 0:
            continue

        x_c = xmin + bw / 2.0
        y_c = ymin + bh / 2.0

        # Normalize
        x_c /= img_w
        y_c /= img_h
        bw /= img_w
        bh /= img_h

        lines.append(f"{cls_id} {x_c:.6f} {y_c:.6f} {bw:.6f} {bh:.6f}\n")

    LABEL_DIR.mkdir(exist_ok=True)
    with label_path.open("w", encoding="utf-8") as f:
        f.writelines(lines)


def main() -> None:
    if not ANNOT_DIR.is_dir():
        print(f"Annotation directory not found: {ANNOT_DIR}")
        return

    xml_files = sorted(ANNOT_DIR.glob("*.xml"))
    if not xml_files:
        print("No XML files found in annotations/")
        return

    print(f"Converting {len(xml_files)} XML files from {ANNOT_DIR} to YOLO labels in {LABEL_DIR}...")
    for xml in xml_files:
        convert_annotation(xml)
    print("Done.")


if __name__ == "__main__":
    main()
