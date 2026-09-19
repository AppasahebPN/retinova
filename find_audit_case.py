import json
import os

db_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\data\db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        d = json.load(f)
    
    screenings = d.get("screenings", [])
    print(f"Total screenings in db.json: {len(screenings)}")
    for s in screenings:
        sid = s.get("id")
        seg = s.get("segmentation") or {}
        vmetrics = seg.get("vessel_metrics") or seg.get("vesselMetrics") or {}
        bp = vmetrics.get("branchingComplexity") or seg.get("branchingComplexity")
        cov = seg.get("vessel_coverage") or seg.get("vesselCoverage")
        iou = seg.get("gradcam_lesion_iou") or seg.get("gradcamLesionIoU")
        img_rec = s.get("image") or {}
        fn = img_rec.get("original_filename") or img_rec.get("storage_url")
        grade = s.get("classification", {}).get("predicted_grade")
        print(f"ID: {sid} | File: {fn} | Grade: {grade} | Cov: {cov}% | BP: {bp} | IoU: {iou}")
else:
    print(f"db.json not found at {db_path}")
