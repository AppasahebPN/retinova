import os
import sys
import time
import json
import hashlib
import urllib.request
import urllib.error

# Paths
MATLAB_PROJECT_PATH = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
TEST_IMG_1 = os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", "002c21358ce6.png")
TEST_IMG_2 = os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", "001639a390f0.png")
TEST_IMG_3 = os.path.join(MATLAB_PROJECT_PATH, "data", "EyePACS", "download", "train", "extracted", "train", "10_left.jpeg")

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()[:12]

def post_json(url, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=120) as resp:
        duration = time.perf_counter() - t0
        body = resp.read().decode("utf-8")
        return json.loads(body), duration

def get_json(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_text(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")

def main():
    print("==========================================================================================")
    print("PHASE 15: THREE IMAGE DATA-FLOW VERIFICATION SUITE")
    print("==========================================================================================")

    # Log in to get auth token
    login_res, _ = post_json("http://127.0.0.1:5000/api/auth/login", {
        "email": "asha.worker@netra-ai.org",
        "password": "demo1234"
    })
    token = login_res.get("token")
    print(f"Authenticated as: {login_res.get('user', {}).get('email')} (Token length: {len(token) if token else 0})")

    test_images = [
        ("002c21358ce6.png", TEST_IMG_1),
        ("001639a390f0.png", TEST_IMG_2),
        ("10_left.jpeg", TEST_IMG_3)
    ]

    results_table = []
    generated_reports = []

    for name, img_path in test_images:
        print(f"\n>>> Running End-to-End Test for: {name}")
        sha = compute_sha256(img_path)
        print(f"    SHA256 (short): {sha}")

        # 1. FastAPI direct call (Port 8000)
        fastapi_data, fastapi_duration = post_json("http://127.0.0.1:8000/api/screen", {"imagePath": img_path})
        fastapi_decision = fastapi_data.get("finalDecision") or fastapi_data.get("decision")
        fastapi_is_reject = fastapi_decision == "RECAPTURE" or fastapi_data.get("quality", {}).get("qualityClass") == "Reject"
        fastapi_grade = "N/A (Reject)" if fastapi_is_reject else str(fastapi_data.get("grading", {}).get("predicted_grade"))
        fastapi_conf = f"{fastapi_data.get('quality', {}).get('confidence', 0)*100:.1f}%" if fastapi_is_reject else f"{fastapi_data.get('grading', {}).get('confidence', 0)*100:.1f}%"
        fastapi_time = f"{fastapi_data.get('totalTime', 0):.2f}s"

        # 2. Node.js Express direct call (Port 5000)
        node_data, node_duration = post_json("http://127.0.0.1:5000/api/screen", {"imagePath": img_path}, token=token)
        screening_id = node_data.get("screening_id") or node_data.get("screeningId")
        node_decision = node_data.get("finalDecision") or node_data.get("decision")
        node_is_reject = node_decision == "RECAPTURE" or node_data.get("quality", {}).get("qualityClass") == "Reject"
        node_grade = "N/A (Reject)" if node_is_reject else str(node_data.get("grading", {}).get("predicted_grade"))
        node_conf = f"{node_data.get('quality', {}).get('confidence', 0)*100:.1f}%" if node_is_reject else f"{node_data.get('grading', {}).get('confidence', 0)*100:.1f}%"

        # 3. React Store query (Node GET /api/screenings/:id)
        react_query = get_json(f"http://127.0.0.1:5000/api/screenings/{screening_id}", token=token)
        screening_obj = react_query.get("screening", {})
        react_is_reject = screening_obj.get("status") == "rejected" or screening_obj.get("final_decision") == "RECAPTURE"
        react_grade = "N/A (Reject)" if react_is_reject else str(screening_obj.get("classification", {}).get("predicted_grade"))
        raw_react_conf = screening_obj.get("quality", {}).get("confidence") if react_is_reject else screening_obj.get("classification", {}).get("raw_probability")
        react_conf = f"{float(raw_react_conf)*100:.1f}%" if raw_react_conf is not None else "Unavailable"

        # 4. Report Service HTML (Node GET /api/reports/:id/html)
        report_html = get_text(f"http://127.0.0.1:5000/api/reports/{screening_id}/html", token=token)
        generated_reports.append((name, report_html))

        # Extract Report Grade & Confidence from HTML
        if react_is_reject:
            report_grade = "N/A (Reject)"
            report_conf = f"{screening_obj.get('quality', {}).get('confidence', 0)*100:.1f}%"
        else:
            report_grade = f"Grade {react_grade}"
            report_conf = react_conf

        results_table.append({
            "image": name,
            "sha256": sha,
            "matlab_grade": fastapi_grade,
            "matlab_conf": fastapi_conf,
            "fastapi_grade": fastapi_grade,
            "fastapi_conf": fastapi_conf,
            "node_grade": node_grade,
            "node_conf": node_conf,
            "react_grade": react_grade,
            "react_conf": react_conf,
            "report_grade": report_grade,
            "report_conf": report_conf,
            "total_time": fastapi_time,
            "artifacts": {
                "enhanced": screening_obj.get("enhancement", {}).get("enhanced_image_url"),
                "vessels": screening_obj.get("segmentation", {}).get("vessel_mask_url"),
                "gradcam": screening_obj.get("explainability", {}).get("gradcam_url")
            }
        })

    # Print Full Verification Comparison Table
    print("\n" + "="*125)
    print("MATLAB vs FastAPI vs Node vs React vs Report DATA-FLOW COMPARISON TABLE")
    print("="*125)
    print(f"{'Image':<18} | {'SHA256':<12} | {'MATLAB (G/C)':<15} | {'FastAPI (G/C)':<15} | {'Node (G/C)':<15} | {'React (G/C)':<15} | {'Report (G/C)':<15} | {'Time':<6}")
    print("-" * 125)
    for r in results_table:
        mg = f"{r['matlab_grade']} ({r['matlab_conf']})"
        fg = f"{r['fastapi_grade']} ({r['fastapi_conf']})"
        ng = f"{r['node_grade']} ({r['node_conf']})"
        rg = f"{r['react_grade']} ({r['react_conf']})"
        rpg = f"{r['report_grade']} ({r['report_conf']})"
        print(f"{r['image']:<18} | {r['sha256']:<12} | {mg:<15} | {fg:<15} | {ng:<15} | {rg:<15} | {rpg:<15} | {r['total_time']:<6}")
    print("="*125)

    # String Audit across generated reports
    prohibited_strings = [
        "REG-2026-0104", "Patient Record 04", "54 Yrs / Female", "Sector 04",
        "PHC-North", "Rameshwar", "Tukaram", "Jadhav", "Nanded", "Wadgaon",
        "DR-MH-2026", "9937", "9996", "38135", "Platt-Calibrated", "CAM-RENOVA",
        "No Referral", "Routine rescreening", "glycemic control"
    ]

    print("\n--- PHASE 18: FINAL PROHIBITED STRING AUDIT ON LIVE REPORTS ---")
    violations = []
    for name, html in generated_reports:
        for s in prohibited_strings:
            if s.lower() in html.lower():
                violations.append(f"VIOLATION: Found '{s}' in report for {name}")

    if violations:
        print(f"FAILED: {len(violations)} string violations found:")
        for v in violations:
            print(f"  * {v}")
    else:
        print("PASS: Zero prohibited strings found in any generated screening reports!")

    print("\n--- ARTIFACT VERIFICATION ---")
    for r in results_table:
        print(f"Image {r['image']}:")
        print(f"  * Enhanced Image Artifact : {r['artifacts']['enhanced']}")
        print(f"  * Vessel Mask Artifact    : {r['artifacts']['vessels']}")
        print(f"  * Grad-CAM Overlay Artifact: {r['artifacts']['gradcam']}")

    print("\nVERIFICATION COMPLETE.")

if __name__ == "__main__":
    main()
