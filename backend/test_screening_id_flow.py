import os
import sys
import time
import json
import urllib.request

def main():
    print("Testing full browser-equivalent screening workflow...")
    
    # 1. Login
    login_data = json.dumps({"email": "asha.worker@netra-ai.org", "password": "demo1234"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:5000/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    token = ""
    try:
        with urllib.request.urlopen(req) as resp:
            token = json.loads(resp.read().decode('utf-8'))["token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    # 2. Get Patients & Facilities
    req_p = urllib.request.Request("http://localhost:5000/api/patients", headers=headers)
    with urllib.request.urlopen(req_p) as resp:
        patients = json.loads(resp.read().decode('utf-8'))["patients"]
        patient_id = patients[0]["id"]
        
    req_f = urllib.request.Request("http://localhost:5000/api/facilities", headers=headers)
    with urllib.request.urlopen(req_f) as resp:
        facilities = json.loads(resp.read().decode('utf-8'))["facilities"]
        facility_id = facilities[0]["id"]

    # 3. Create Screening Session
    create_body = json.dumps({
        "patientId": patient_id,
        "facilityId": facility_id,
        "eye": "left",
        "imageStorageUrl": "/uploads/002c21358ce6.png",
        "originalFilename": "002c21358ce6.png"
    }).encode('utf-8')
    req_create = urllib.request.Request("http://localhost:5000/api/screenings", data=create_body, headers=headers)
    screening_id = ""
    with urllib.request.urlopen(req_create) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        screening_id = res["screening"]["id"]
        print(f"Created screening ID: {screening_id}")

    # 4. Trigger Analysis (POST /api/screenings/:id/analyze)
    req_analyze = urllib.request.Request(f"http://localhost:5000/api/screenings/{screening_id}/analyze", data=b"{}", headers=headers)
    with urllib.request.urlopen(req_analyze) as resp:
        analyze_res = json.loads(resp.read().decode('utf-8'))
        print("Analysis response received successfully.")

    # 5. Fetch Final Screening Object as React does (GET /api/screenings/:id)
    req_get = urllib.request.Request(f"http://localhost:5000/api/screenings/{screening_id}", headers=headers)
    with urllib.request.urlopen(req_get) as resp:
        screening = json.loads(resp.read().decode('utf-8'))["screening"]
        
    print("\n--- SCREENING OBJECT INSPECTION (React Source of Truth) ---")
    print(f"ID                : {screening.id if hasattr(screening, 'id') else screening.get('id')}")
    print(f"Status            : {screening.get('status')}")
    print(f"Quality Score     : {screening.get('quality', {}).get('quality_score')}%")
    print(f"Quality Gate      : {screening.get('quality', {}).get('quality_gate')}")
    print(f"Final Decision    : {screening.get('final_decision')}")
    print(f"Predicted Grade   : {screening.get('classification', {}).get('predicted_grade')}")
    print(f"Calibrated Conf   : {screening.get('classification', {}).get('calibrated_confidence')}%")
    print(f"Enhanced Image    : {screening.get('enhancement', {}).get('enhanced_image_url')}")
    print(f"Vessel Mask       : {screening.get('segmentation', {}).get('vessel_mask_url')}")
    print(f"Grad-CAM URL      : {screening.get('explainability', {}).get('gradcam_url')}")
    print(f"Processing Time   : {screening.get('processing_time_ms')} ms")
    
    assert screening.get('classification', {}).get('predicted_grade') == 0, "Expected Grade 0"
    assert screening.get('classification', {}).get('calibrated_confidence') is not None, "Expected valid confidence"
    assert screening.get('quality', {}).get('quality_gate') == 'good', "Expected Good quality gate"
    print("\nALL ASSERTIONS PASSED! React receives complete MATLAB inference output.")

if __name__ == "__main__":
    main()
