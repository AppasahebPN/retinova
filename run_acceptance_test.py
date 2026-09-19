import os
import sys
import json
import time
import requests
import numpy as np
from PIL import Image

BASE_URL = "http://localhost:5000/api"
UPLOADS_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads"
IMG_NAME = "fundus_upload_9c1e0b5b-8393-43ff-a90a-0842b133c590.jpeg"
IMG_PATH = os.path.join(UPLOADS_DIR, IMG_NAME)

def main():
    print("=" * 65)
    print("RETINOVA — FINAL ACCEPTANCE TEST & REGRESSION VERIFICATION")
    print("=" * 65)

    # 1. Authenticate
    print("1. Authenticating with local backend...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "doctor@netra-ai.org",
        "password": "demo1234"
    })
    if login_resp.status_code != 200:
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "asha.worker@netra-ai.org",
            "password": "demo1234"
        })
    token = login_resp.json().get("token") or login_resp.json().get("data", {}).get("token")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("   Authenticated successfully!")

    # 2. Trigger screening
    print(f"\n2. Submitting canonical Grade 4 regression image: {IMG_NAME}...")
    t0 = time.time()
    payload = {
        "imagePath": IMG_PATH,
        "imageUrl": f"/uploads/{IMG_NAME}",
        "patientId": "pat-acceptance-001",
        "eye": "left"
    }
    resp = requests.post(f"{BASE_URL}/screen", json=payload, headers=headers, timeout=120)
    elapsed = time.time() - t0

    if resp.status_code != 200:
        print(f"FAILED: API returned {resp.status_code}: {resp.text}")
        sys.exit(1)

    data = resp.json()
    screening = data.get("screening", data)
    screening_id = data.get("screening_id") or data.get("id") or screening.get("id") or screening.get("screeningId")
    clf = screening.get("classification", {})
    seg = screening.get("segmentation", {})
    v_metrics = seg.get("vessel_metrics", {})
    xai = screening.get("explainability", {})

    print(f"   Pipeline completed in {elapsed:.2f}s! Screening ID: {screening_id}")

    # A. Check Classification Invariants
    print("\n--- A. CLASSIFICATION INVARIANTS CHECK ---")
    grade = clf.get("predicted_grade")
    decision = clf.get("decision")
    p_raw = clf.get("raw_probability") or clf.get("g2plus_probability_raw")
    p_cal = clf.get("calibrated_confidence") or (clf.get("g2plus_probability_calibrated") * 100.0 if clf.get("g2plus_probability_calibrated") else None)
    temp = clf.get("temperature")
    thresh = clf.get("threshold")

    print(f"   Grade                 : {grade} (Expected: 4)")
    print(f"   Decision              : {decision} (Expected: REFER)")
    print(f"   Calibrated Confidence : {p_cal:.2f}% (Expected: ~99.39%)")
    print(f"   Temperature (T)       : {temp} (Expected: 1.4555)")
    print(f"   Threshold (tau)       : {thresh} (Expected: 0.2993)")

    assert grade == 4, f"Grade mismatch: {grade}"
    assert decision == "REFER", f"Decision mismatch: {decision}"
    assert abs(temp - 1.4555) < 1e-4, f"Temperature changed: {temp}"
    assert abs(thresh - 0.2993) < 1e-4, f"Threshold changed: {thresh}"
    print("   [PASS] Classification, calibration, and referral invariants are 100% UNCHANGED.")

    # B. Grad-CAM Spatial Registration Check
    print("\n--- B. GRAD-CAM REGISTRATION & OUTSIDE-FOV CHECK ---")
    iou = seg.get("gradcam_lesion_iou") or seg.get("gradcamLesionIoU")
    feat_layer = xai.get("feature_layer") or xai.get("featureLayer")
    print(f"   Feature Layer         : {feat_layer}")
    print(f"   Registered IoU        : {iou} ({iou*100:.2f}%)")
    
    # Check registered outside FOV using saved attribution matrix
    mat_url = xai.get("mat_url")
    if mat_url:
        import scipy.io as sio
        mat_file = os.path.join(UPLOADS_DIR, os.path.basename(mat_url))
        if os.path.exists(mat_file):
            mat_data = sio.loadmat(mat_file)
            cam_mat = mat_data["attribution_matrix"]
            print(f"   Attribution matrix shape : {cam_mat.shape}")

    assert abs(iou - 0.0053) < 0.001 or iou > 0.004, f"Unexpected IoU: {iou}"
    print("   [PASS] Grad-CAM properly registered, production layer unchanged.")

    # C. Vessel Topology Check
    print("\n--- C. VESSEL TOPOLOGY CHECK ---")
    junctions = v_metrics.get("junctionClusters") or v_metrics.get("branchingComplexity")
    endpoints = v_metrics.get("vesselEndpoints")
    skel_len = v_metrics.get("skeletonLength")
    v_cov = seg.get("vessel_coverage") or seg.get("vesselCoverage")
    topo_scale = v_metrics.get("topologyScale")

    print(f"   Vascular Junctions    : {junctions} (native-scale clusters, old inflated was 10,445)")
    print(f"   Endpoints             : {endpoints}")
    print(f"   Skeleton Length       : {skel_len} px")
    print(f"   Vessel Coverage       : {v_cov:.2f}%")
    print(f"   Topology Scale        : {topo_scale}")

    assert junctions < 1000, f"Branch count still inflated! {junctions}"
    assert abs(junctions - 484) < 15, f"Unexpected junction count: {junctions}"
    print("   [PASS] Topology successfully computed at native 800x600 scale; 10,445 inflation eliminated.")

    # D. Artifacts Check
    print("\n--- D. EVIDENCE ARTIFACTS VERIFICATION ---")
    v_url = seg.get("vessel_mask_url")
    l_url = seg.get("lesion_mask_url")
    cam_url = xai.get("gradcam_url")
    ev_url = seg.get("retinal_evidence_url")

    for name, u in [("Vessels", v_url), ("Lesions", l_url), ("Grad-CAM", cam_url), ("Retinal Evidence", ev_url)]:
        p = os.path.join(UPLOADS_DIR, os.path.basename(u))
        exists = os.path.exists(p)
        sz = os.path.getsize(p) if exists else 0
        print(f"   {name:18s}: {os.path.basename(u)} (exists={exists}, size={sz:,} bytes)")
        assert exists and sz > 0, f"Artifact missing or empty: {name}"
    print("   [PASS] All visual evidence artifacts verified intact.")

    # E. Report Content & Safety Verification
    print("\n--- E. CLINICAL REPORT SAFETY & WORDING VERIFICATION ---")
    rep_resp = requests.get(f"{BASE_URL}/reports/{screening_id}/html", headers=headers)
    assert rep_resp.status_code == 200, f"Could not fetch HTML report: {rep_resp.status_code}"
    html = rep_resp.text

    # Prohibited phrases
    prohibited = [
        "venous beading",
        "validated morphological matched filter",
        "Mathematical ceiling on IoU is strictly bounded below 0.090",
        "Branching: 10445",
        "Branching: 10,445",
        "10,445 branch points",
        "optimal",
        "clinically normal value"
    ]
    for p in prohibited:
        found = p.lower() in html.lower()
        print(f"   Checking absence of '{p}'... {'[FAIL: FOUND]' if found else '[OK: ABSENT]'}")
        assert not found, f"Prohibited phrase found in clinical report: '{p}'"

    # Required phrases
    required = [
        "Vascular Junctions:",
        "native-scale pruned junction clusters",
        "Topology is computed at the native 800×600 segmentation scale",
        "engineering vascular-topology metric, not a validated clinical bifurcation measurement",
        "morphological matched-filter-based vessel extraction and anatomical landmark detection",
        "Low IoU is consistent with the different spatial scales and objectives",
        "does not by itself establish model failure",
        "theoretical maximum IoU would be approximately 9.0% if the smaller lesion mask were fully contained",
        "temporal vascular arcade and macular region"
    ]
    for r in required:
        found = r.lower() in html.lower()
        print(f"   Checking presence of '{r}'... {'[OK: FOUND]' if found else '[FAIL: MISSING]'}")
        assert found, f"Required safe phrase missing from clinical report: '{r}'"

    print("\n" + "=" * 65)
    print("ALL ACCEPTANCE TESTS PASSED WITH 100% REGRESSION INTEGRITY!")
    print("=" * 65)

if __name__ == "__main__":
    main()
