import os
import sys
import time

MATLAB_DIST_PATH = r"C:\Program Files\MATLAB\R2026a\extern\engines\python\dist"
if MATLAB_DIST_PATH not in sys.path:
    sys.path.append(MATLAB_DIST_PATH)

import matlab.engine

MATLAB_PROJECT_PATH = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"

images = [
    os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", "002c21358ce6.png"),
    os.path.join(MATLAB_PROJECT_PATH, "data", "EyePACS", "download", "train", "extracted", "train", "10_left.jpeg"),
    os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", "001639a390f0.png"),
]

print("="*80)
print("PHASE 6: DIRECT MATLAB VERIFICATION (RESTORED ENGINE)")
print("="*80)

eng = matlab.engine.start_matlab()
eng.addpath(MATLAB_PROJECT_PATH, nargout=0)
eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module1_IQA"), nargout=0)
eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module2_Enhancement"), nargout=0)
eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module3_Segmentation"), nargout=0)
eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module4_Grading"), nargout=0)
eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module5_Explainability"), nargout=0)
eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module6_Simulink"), nargout=0)

results_summary = []

for img_path in images:
    base = os.path.basename(img_path)
    print("\n" + "="*70)
    print(f"TESTING IMAGE: {base}")
    print(f"Path: {img_path}")
    print("="*70)
    
    t0 = time.perf_counter()
    res = eng.run_DR_Screening(img_path, nargout=1)
    duration = time.perf_counter() - t0
    
    field_names = list(res.keys())
    print(f"Execution Duration: {duration:.2f} s")
    print(f"fieldnames(result): {field_names}")
    
    q_class = res.get("quality", {}).get("qualityClass", "N/A") if isinstance(res.get("quality"), dict) else getattr(res.get("quality"), "qualityClass", "N/A")
    q_conf = res.get("quality", {}).get("confidence", 0.0) if isinstance(res.get("quality"), dict) else getattr(res.get("quality"), "confidence", 0.0)
    q_dec = res.get("quality", {}).get("decision", "N/A") if isinstance(res.get("quality"), dict) else getattr(res.get("quality"), "decision", "N/A")
    
    g_grade = "N/A (Reject)"
    g_conf = "N/A (Reject)"
    g_class = "N/A"
    if "grading" in res:
        g = res["grading"]
        g_grade = str(int(g.get("grade", 0))) if isinstance(g, dict) else str(int(getattr(g, "grade", 0)))
        raw_conf = g.get("confidence", 0.0) if isinstance(g, dict) else getattr(g, "confidence", 0.0)
        g_conf = f"{raw_conf * 100:.2f}%"
        g_class = g.get("predictedClass", "N/A") if isinstance(g, dict) else getattr(g, "predictedClass", "N/A")

    cam_status = "NOT RUN"
    if "explainability" in res:
        cam = res["explainability"]
        cam_status = cam.get("status", "N/A") if isinstance(cam, dict) else getattr(cam, "status", "N/A")

    final_dec = res.get("finalDecision", "N/A")
    pipe_status = res.get("status", "N/A")
    
    print(f"  qualityClass      : {q_class}")
    print(f"  qualityConfidence : {float(q_conf)*100:.2f}%")
    print(f"  qualityDecision   : {q_dec}")
    print(f"  finalDecision     : {final_dec}")
    print(f"  status            : {pipe_status}")
    print(f"  predictedGrade    : {g_grade}")
    print(f"  gradingConfidence : {g_conf}")
    print(f"  Grad-CAM status   : {cam_status}")
    
    results_summary.append({
        "image": base,
        "quality": f"{q_class} ({float(q_conf)*100:.2f}%)",
        "grade": g_grade,
        "confidence": g_conf,
        "cam": cam_status,
        "time": f"{duration:.2f}s"
    })

eng.quit()

print("\n" + "="*80)
print("MATLAB DIRECT SANITY REGRESSION TABLE")
print("="*80)
print(f"{'Image':<20} | {'Quality':<18} | {'Grade':<15} | {'Confidence':<15} | {'Grad-CAM':<12} | {'Time':<8}")
print("-" * 80)
for r in results_summary:
    print(f"{r['image']:<20} | {r['quality']:<18} | {r['grade']:<15} | {r['confidence']:<15} | {r['cam']:<12} | {r['time']:<8}")
print("="*80)
