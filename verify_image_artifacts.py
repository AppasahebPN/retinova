import json
import os

db_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\data\db.json"
uploads_dir = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads"

with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

screenings = db.get("screenings", [])
print(f"Total screenings in database: {len(screenings)}")

# Find canonical Grade 4 case
g4_cases = [s for s in screenings if s.get("ai_result", {}).get("grade") == 4]
print(f"Total Grade 4 cases: {len(g4_cases)}")

for s in g4_cases:
    sid = s["id"]
    short_id = sid[:8]
    ai = s.get("ai_result", {})
    clf = ai.get("classification", {})
    ev = ai.get("retinal_evidence", {})
    enh = s.get("enhancement", {})
    
    print(f"\n--- Checking Grade 4 Screening: {sid} ---")
    print(f"Decision: {s.get('decision')}, Grade: {clf.get('grade')}, P(G2+): {clf.get('referral_probability')}")
    
    orig_url = s.get("image", {}).get("file_path") or s.get("image", {}).get("url")
    enh_url = enh.get("enhanced_image_url") or enh.get("enhanced_url") or s.get("enhanced_image_url")
    cam_url = ev.get("gradcam_url") or ai.get("gradcam_url")
    vessel_url = ev.get("vessel_map_url") or ai.get("vessel_map_url")
    lesion_url = ev.get("lesion_map_url") or ai.get("lesion_map_url")
    composite_url = ev.get("composite_map_url") or ai.get("composite_map_url") or s.get("evidence_map_url")
    
    artifacts = {
        "Original": orig_url,
        "Enhanced": enh_url,
        "Grad-CAM": cam_url,
        "Vessels": vessel_url,
        "Candidate Lesions": lesion_url,
        "Composite": composite_url
    }
    
    all_matched = True
    for name, path in artifacts.items():
        if not path:
            print(f"  [MISSING] {name}: URL is empty")
            all_matched = False
            continue
        # Check if filename contains matching short_id (except original fundus which is patient image)
        fname = os.path.basename(path)
        full_path = os.path.join(uploads_dir, fname)
        exists = os.path.isfile(full_path)
        size = os.path.getsize(full_path) if exists else 0
        
        # Check cross-screening artifact check:
        # If artifact has a hex UUID prefix, it must match short_id!
        is_cross = False
        for other_s in screenings:
            other_short = other_s["id"][:8]
            if other_short != short_id and other_short in fname:
                is_cross = True
                print(f"  [CROSS-SCREENING ERROR] {name} ({fname}) contains {other_short} instead of {short_id}!")
                break
                
        status = "OK" if (exists and not is_cross) else "FAIL"
        print(f"  [{status}] {name}: {fname} (exists={exists}, size={size} bytes)")
        if not exists or is_cross:
            all_matched = False
            
    if all_matched:
        print(f"Screening {sid}: ALL 6 ARTIFACTS VERIFIED & BELONG TO SAME SCREENING!")

# Find canonical Grade 0 case
g0_cases = [s for s in screenings if s.get("ai_result", {}).get("grade") == 0]
print(f"\nTotal Grade 0 cases: {len(g0_cases)}")
for s in g0_cases[:2]:
    sid = s["id"]
    ai = s.get("ai_result", {})
    clf = ai.get("classification", {})
    print(f"Grade 0 Screening: {sid}, Decision: {s.get('decision')}, Grade: {clf.get('grade')}, P(G2+): {clf.get('referral_probability')}")
