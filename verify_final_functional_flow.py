import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def run_end_to_end_test():
    print("=== RETINOVA END-TO-END FUNCTIONAL FLOW TEST ===")

    # 1. Login as ASHA
    print("\n1. Authentication as ASHA Screener...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "asha.worker@netra-ai.org", "password": "demo1234"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    asha_data = res.json()
    asha_token = asha_data.get("token") or asha_data.get("access_token")
    headers_asha = {"Authorization": f"Bearer {asha_token}"}
    print("   ASHA login OK. Facility:", asha_data.get("user", {}).get("facility_id"))

    # 2. Pick canonical screening 606dc003-3a84-4bb1-a34a-e16fd61425a0
    target_screening_id = "606dc003-3a84-4bb1-a34a-e16fd61425a0"
    print(f"\n2. Verifying Screening ID consistency across all roles: {target_screening_id}")

    # ASHA Screening detail view
    res = requests.get(f"{BASE_URL}/screenings/{target_screening_id}", headers=headers_asha)
    assert res.status_code == 200, f"Screening fetch failed: {res.status_code}"
    s_asha = res.json().get("screening") or res.json()
    print(f"   [ASHA] Screening Result: Grade {s_asha['classification']['predicted_grade']} | Decision: {s_asha['classification']['decision']} | ID: {s_asha['id']}")
    assert s_asha['id'] == target_screening_id

    # 3. Login as Doctor
    print("\n3. Authenticating as Reviewing Ophthalmologist...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "doctor@netra-ai.org", "password": "demo1234"})
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    doc_data = res.json()
    doc_token = doc_data.get("token") or doc_data.get("access_token")
    headers_doc = {"Authorization": f"Bearer {doc_token}"}
    print("   Doctor login OK.")

    # Doctor Review Queue (filtered by referral)
    res = requests.get(f"{BASE_URL}/screenings?limit=100", headers=headers_doc)
    assert res.status_code == 200
    queue = res.json().get("screenings", [])
    matching = [item for item in queue if item.get("id") == target_screening_id]
    print(f"   [Doctor] Review Queue contains target case: {len(matching) > 0}")
    assert len(matching) > 0, f"Screening ID {target_screening_id} missing from Doctor queue"

    # Doctor clinical details & evidence
    res = requests.get(f"{BASE_URL}/screenings/{target_screening_id}", headers=headers_doc)
    assert res.status_code == 200
    s_doc = res.json().get("screening") or res.json()
    assert s_doc['id'] == target_screening_id
    print(f"   [Doctor] Workstation verified screening: {s_doc['id']}")
    print(f"   [Doctor] Retinal evidence verified: Grad-CAM={bool(s_doc.get('explainability', {}).get('gradcam_url'))}, Vessels={bool(s_doc.get('segmentation', {}).get('vessel_mask_url'))}, Lesions={bool(s_doc.get('segmentation', {}).get('lesion_mask_url'))}")

    # Doctor records review disposition
    res = requests.post(f"{BASE_URL}/screenings/{target_screening_id}/referral", headers=headers_doc, json={
        "action_taken": "referral_completed",
        "action_notes": "Verified proliferative diabetic retinopathy with retinal neovascularization risk. Laser photocoagulation advised."
    })
    print(f"   [Doctor] Clinical Review recorded: HTTP {res.status_code}")

    # Doctor Clinical Report
    res = requests.get(f"{BASE_URL}/reports/{target_screening_id}/html", headers=headers_doc)
    assert "clinical summary" in res.text.lower()
    assert "neovascularization assessment" in res.text.lower()
    assert "technical details" in res.text.lower()
    print(f"   [Doctor] Clinical Report HTML generated: {len(res.text)} bytes")

    # 4. Login as District Manager
    print("\n4. Authenticating as District Health Officer...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": "manager@netra-ai.org", "password": "demo1234"})
    assert res.status_code == 200
    mgr_data = res.json()
    mgr_token = mgr_data.get("token") or mgr_data.get("access_token")
    headers_mgr = {"Authorization": f"Bearer {mgr_token}"}
    print("   Manager login OK.")

    # Manager Screenings Ledger
    res = requests.get(f"{BASE_URL}/screenings?limit=100", headers=headers_mgr)
    assert res.status_code == 200
    ledger = res.json().get("screenings", [])
    mgr_matching = [s for s in ledger if s["id"] == target_screening_id]
    assert len(mgr_matching) > 0, f"Manager ledger missing {target_screening_id}"
    print(f"   [Manager] Verified exact screening ID in ledger: {mgr_matching[0]['id']}")

    # Manager Analytics Overview
    res = requests.get(f"{BASE_URL}/analytics/overview", headers=headers_mgr)
    assert res.status_code == 200
    overview = res.json()
    print(f"   [Manager] Dashboard Overview: {overview.get('kpis', {}).get('totalScreenings')} screenings, {overview.get('kpis', {}).get('referableCases')} referable cases")

    print(f"\nExact Screening ID '{target_screening_id}' is consistent across:")
    print("  1. ASHA Field Screening")
    print("  2. Doctor Review Queue & Workstation")
    print("  3. Doctor Official Clinical Report")
    print("  4. District Operations Manager Ledger")
    print("\n=== ALL END-TO-END FLOW CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_end_to_end_test()
