import os
import sys
import time
import json
import urllib.request
import urllib.error

# Paths
MATLAB_PROJECT_PATH = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
TEST_IMG_GOOD = os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", "002c21358ce6.png")
TEST_IMG_REJECT = os.path.join(MATLAB_PROJECT_PATH, "data", "EyePACS", "download", "train", "extracted", "train", "10_left.jpeg")

def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=120) as resp:
        duration = time.perf_counter() - t0
        body = resp.read().decode("utf-8")
        return json.loads(body), duration

def get_text(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")

def main():
    print("============================================================")
    print("AUTOMATED VERIFICATION RUNNER")
    print("============================================================")

    # 1. Health check
    try:
        health_resp = get_text("http://127.0.0.1:8000/api/health")
        health = json.loads(health_resp)
        print(f"Health Check: status={health.get('status')}, matlab_engine={health.get('matlab_engine')}, persistent={health.get('persistent_engine')}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return

    # 2. First Run: 002c21358ce6.png (Good Image)
    print(f"\n--- TEST 1: First Run for 002c21358ce6.png ---")
    data_good_1, api_time_1 = post_json("http://127.0.0.1:8000/api/screen", {"imagePath": TEST_IMG_GOOD})
    print(f"First Request API Response Time : {api_time_1*1000:.2f} ms ({api_time_1:.2f} s)")
    print(f"First Request MATLAB totalTime  : {data_good_1.get('totalTime', 0)*1000:.2f} ms ({data_good_1.get('totalTime', 0):.2f} s)")
    print(f"First Request Decision          : {data_good_1.get('finalDecision')}")
    print(f"First Request Quality Class     : {data_good_1.get('quality', {}).get('qualityClass')}")
    print(f"First Request DR Grade          : {data_good_1.get('grading', {}).get('predicted_grade')}")
    print(f"First Request DR Confidence     : {data_good_1.get('grading', {}).get('confidence')}")

    # 3. Second Run: 002c21358ce6.png (Warm Run)
    print(f"\n--- TEST 1: Second Run (Warm Run) for 002c21358ce6.png ---")
    data_good_2, api_time_2 = post_json("http://127.0.0.1:8000/api/screen", {"imagePath": TEST_IMG_GOOD})
    print(f"Second Request API Response Time: {api_time_2*1000:.2f} ms ({api_time_2:.2f} s)")
    print(f"Second Request MATLAB totalTime : {data_good_2.get('totalTime', 0)*1000:.2f} ms ({data_good_2.get('totalTime', 0):.2f} s)")
    print(f"Second Request Decision         : {data_good_2.get('finalDecision')}")
    print(f"Second Request Quality Class    : {data_good_2.get('quality', {}).get('qualityClass')}")
    print(f"Second Request DR Grade         : {data_good_2.get('grading', {}).get('predicted_grade')}")
    print(f"Second Request DR Confidence    : {data_good_2.get('grading', {}).get('confidence')}")

    # 4. Fetch HTML Report for Good Image
    screening_id_good = data_good_2.get("screeningId") or data_good_2.get("screening_id")
    good_report_html = get_text(f"http://127.0.0.1:8000/api/reports/{screening_id_good}/html")
    with open("report_good_test.html", "w", encoding="utf-8") as f:
        f.write(good_report_html)
    print(f"Saved good screening report HTML ({len(good_report_html)} bytes)")

    # 5. Run Reject Test: 10_left.jpeg
    print(f"\n--- TEST 2: Run for 10_left.jpeg (Reject Image) ---")
    data_reject, api_time_reject = post_json("http://127.0.0.1:8000/api/screen", {"imagePath": TEST_IMG_REJECT})
    print(f"Reject Request API Response Time: {api_time_reject*1000:.2f} ms ({api_time_reject:.2f} s)")
    print(f"Reject Request MATLAB totalTime : {data_reject.get('totalTime', 0)*1000:.2f} ms ({data_reject.get('totalTime', 0):.2f} s)")
    print(f"Reject Request Quality Class    : {data_reject.get('quality', {}).get('qualityClass')}")
    print(f"Reject Request Decision         : {data_reject.get('finalDecision')}")
    print(f"Reject Has Grading Field?       : {'grading' in data_reject}")
    print(f"Reject Has Grad-CAM Field?      : {'explainability' in data_reject}")

    # 6. Fetch HTML Report for Reject Image
    screening_id_reject = data_reject.get("screeningId") or data_reject.get("screening_id")
    reject_report_html = get_text(f"http://127.0.0.1:8000/api/reports/{screening_id_reject}/html")
    with open("report_reject_test.html", "w", encoding="utf-8") as f:
        f.write(reject_report_html)
    print(f"Saved reject screening report HTML ({len(reject_report_html)} bytes)")

    # 7. Prohibited strings check on HTML reports
    prohibited_strings = [
        "Rameshwar", "Tukaram", "Jadhav", "Nanded", "Wadgaon", "PHC-04",
        "DR-MH-2026", "9937", "9996", "38135", "Annual routine",
        "glycemic control", "No Referral", "Platt-Calibrated", "CAM-RENOVA", "9500"
    ]

    print("\n--- STRING AUDIT ON GENERATED HTML REPORTS ---")
    violations = []
    for s in prohibited_strings:
        if s.lower() in good_report_html.lower():
            violations.append(f"Found '{s}' in Good Report HTML")
        if s.lower() in reject_report_html.lower():
            violations.append(f"Found '{s}' in Reject Report HTML")

    if violations:
        print("FAIL - String violations found:")
        for v in violations:
            print("  - " + v)
    else:
        print("PASS - Zero prohibited strings found in generated reports!")

    print("\n============================================================")
    print("VERIFICATION COMPLETED")
    print("============================================================")

if __name__ == "__main__":
    main()
