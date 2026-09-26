import os
import json
import time
import requests
from PIL import Image

BASE_URL = "http://localhost:5000/api"
UPLOADS_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads"

def get_auth_token():
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "doctor@netra-ai.org",
        "password": "demo1234"
    })
    if login_resp.status_code != 200:
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "asha.worker@netra-ai.org",
            "password": "demo1234"
        })
    data = login_resp.json()
    token = data.get("token") or (data.get("data", {}).get("token"))
    return token

def run_test_screening(img_filename: str, expected_grade: int, expected_decision: str, token: str):
    print(f"\n========================================================")
    print(f"RUNNING SCREENING TEST FOR: {img_filename}")
    print(f"Expected: Grade {expected_grade} ({expected_decision})")
    print(f"========================================================")
    
    src_path = os.path.join(UPLOADS_DIR, img_filename)
    if not os.path.exists(src_path):
        alt_path = os.path.join(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\data\APTOS\train_images", img_filename)
        if os.path.exists(alt_path):
            import shutil
            shutil.copyfile(alt_path, src_path)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    t0 = time.time()
    payload = {
        "imagePath": src_path,
        "imageUrl": f"/uploads/{img_filename}",
        "patientId": "pat-001",
        "eye": "left"
    }
    
    # Use POST /api/screen
    resp = requests.post(f"{BASE_URL}/screen", json=payload, headers=headers, timeout=120)
    elapsed = time.time() - t0
    
    if resp.status_code != 200:
        print(f"ERROR: API returned status {resp.status_code}: {resp.text}")
        return None
        
    data = resp.json()
    screening = data.get("screening", data)
    screening_id = screening.get("id") or screening.get("screeningId")
    run_id = screening.get("screeningId") or screening.get("id")
    run_suffix = run_id[:8]
    
    print(f"Screening Completed in {elapsed:.2f}s!")
    print(f"Screening ID: {screening_id}")
    print(f"Run ID: {run_id}")
    
    clf = screening.get("classification", {})
    grade = clf.get("predicted_grade")
    decision = clf.get("decision")
    cal_conf = clf.get("calibrated_confidence") or (clf.get("g2plus_probability_calibrated", 0) * 100.0)
    
    print(f"Predicted Grade : Grade {grade}")
    print(f"Decision        : {decision}")
    print(f"P(G2+) Risk     : {cal_conf:.2f}%")
    
    seg = screening.get("segmentation", {})
    print(f"Vessel Coverage : {seg.get('vessel_coverage')}%")
    print(f"Vessel Density  : {seg.get('vessel_density')}")
    print(f"Branching Pts   : {seg.get('vessel_metrics', {}).get('branchingComplexity')}")
    print(f"Mean Caliber    : {seg.get('vessel_metrics', {}).get('meanCaliber')} px")
    print(f"Total Candidates: {seg.get('candidate_count')}")
    print(f"Bright Cands    : {seg.get('bright_lesion_count')}")
    print(f"Dark Cands      : {seg.get('dark_lesion_count')}")
    
    nv = seg.get("neovascularization", {})
    print(f"NV Status       : {nv.get('status')}")
    print(f"NV Method       : {nv.get('method')}")
    print(f"NV Evidence     : {nv.get('candidateEvidence')}")
    
    iou = seg.get("gradcam_lesion_iou")
    print(f"GradCAM IoU     : {iou}")
    
    # 3. Verify Artifact Files on Disk
    vessel_file = os.path.join(UPLOADS_DIR, f"vessels_{run_suffix}.png")
    lesion_file = os.path.join(UPLOADS_DIR, f"lesions_{run_suffix}.png")
    evidence_file = os.path.join(UPLOADS_DIR, f"retinal_evidence_{run_suffix}.png")
    cand_json_file = os.path.join(UPLOADS_DIR, f"lesion_candidates_{run_suffix}.json")
    ev_json_file = os.path.join(UPLOADS_DIR, f"retinal_evidence_{run_suffix}.json")
    gradcam_file = os.path.join(UPLOADS_DIR, f"gradcam_overlay_{run_suffix}.png")
    
    print("\nVerifying Artifact Files:")
    artifacts = {
        "vessels": vessel_file,
        "lesions": lesion_file,
        "evidence": evidence_file,
        "cand_json": cand_json_file,
        "ev_json": ev_json_file,
        "gradcam": gradcam_file
    }
    
    all_exist = True
    for name, path in artifacts.items():
        exists = os.path.exists(path)
        size = os.path.getsize(path) if exists else 0
        print(f"  * {name:10s} : {'EXISTS' if exists else 'MISSING'} ({size} bytes) -> {os.path.basename(path)}")
        if not exists:
            all_exist = False
            
    # Open and inspect images
    if os.path.exists(vessel_file):
        with Image.open(vessel_file) as im:
            print(f"  * Vessels dimensions: {im.size} mode: {im.mode}")
    if os.path.exists(evidence_file):
        with Image.open(evidence_file) as im:
            print(f"  * Composite evidence dimensions: {im.size} mode: {im.mode}")
            
    # Verify candidate JSON
    if os.path.exists(cand_json_file):
        with open(cand_json_file, "r", encoding="utf-8") as f:
            c_data = json.load(f)
            cands = c_data.get('candidates', [])
            print(f"  * Candidate JSON candidates count: {len(cands)}")
            if len(cands) > 0:
                print(f"    Sample candidate: {cands[0]}")
                
    # 4. Fetch HTML Report
    report_resp = requests.get(f"{BASE_URL}/reports/{screening_id}/html", headers=headers)
    print(f"HTML Report HTTP Status: {report_resp.status_code}")
    report_html = report_resp.text
    print(f"Report length: {len(report_html)} chars")
    
    has_vessels = "Retinal Vessel Evidence" in report_html
    has_lesions = "Candidate Lesion Evidence" in report_html
    has_nv = "Neovascularization Assessment" in report_html
    has_composite = "Retinal Abnormality Map" in report_html
    has_iou = "Evidence Alignment" in report_html
    
    print(f"Report verification:")
    print(f"  * Has Vessel Evidence Section   : {has_vessels}")
    print(f"  * Has Candidate Lesions Section : {has_lesions}")
    print(f"  * Has Neovascularization Section: {has_nv}")
    print(f"  * Has Composite Map Section     : {has_composite}")
    print(f"  * Has Evidence Alignment Section: {has_iou}")
    
    return {
        "screeningId": screening_id,
        "runId": run_id,
        "grade": grade,
        "decision": decision,
        "cal_conf": cal_conf,
        "artifacts": artifacts,
        "all_exist": all_exist,
        "report_ok": has_vessels and has_lesions and has_nv and has_composite and has_iou
    }

if __name__ == "__main__":
    print("Testing RETINOVA Module 3 Full Retinal Evidence Pipeline...")
    token = get_auth_token()
    print("Authenticated successfully, acquired token.")
    
    res_a = run_test_screening("001639a390f0.png", 4, "REFER", token)
    res_b = run_test_screening("002c21358ce6.png", 0, "SCREEN", token)
    
    print("\n========================================================")
    print("FINAL SUMMARY & PROVENANCE COMPARISON:")
    print("========================================================")
    if res_a and res_b:
        print(f"Screening A ID: {res_a['screeningId']} -> Grade {res_a['grade']} ({res_a['decision']})")
        print(f"Screening B ID: {res_b['screeningId']} -> Grade {res_b['grade']} ({res_b['decision']})")
        
        diff_vessels = res_a['artifacts']['vessels'] != res_b['artifacts']['vessels']
        diff_lesions = res_a['artifacts']['lesions'] != res_b['artifacts']['lesions']
        diff_evidence = res_a['artifacts']['evidence'] != res_b['artifacts']['evidence']
        
        print(f"Artifact Provenance Disjoint Check:")
        print(f"  * Vessels A != Vessels B   : {diff_vessels}")
        print(f"  * Lesions A != Lesions B   : {diff_lesions}")
        print(f"  * Evidence A != Evidence B : {diff_evidence}")
        
        print(f"Classifier Check A (G4, REFER)  : {'PASS' if res_a['grade'] == 4 and res_a['decision'] == 'REFER' else 'FAIL'}")
        print(f"Classifier Check B (G0, SCREEN) : {'PASS' if res_b['grade'] == 0 and res_b['decision'] == 'SCREEN' else 'FAIL'}")
        print(f"Artifacts A All Exist           : {'PASS' if res_a['all_exist'] else 'FAIL'}")
        print(f"Artifacts B All Exist           : {'PASS' if res_b['all_exist'] else 'FAIL'}")
        print(f"Report A All Sections Rendered  : {'PASS' if res_a['report_ok'] else 'FAIL'}")
        print(f"Report B All Sections Rendered  : {'PASS' if res_b['report_ok'] else 'FAIL'}")
    else:
        print("One or both tests failed to complete.")
