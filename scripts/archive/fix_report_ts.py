report_ts_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts"

with open(report_ts_path, "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("const ref = screening.referral || {};", "const ref: any = screening.referral || {};")
code = code.replace("const q = screening.quality || {};", "const q: any = screening.quality || {};")
code = code.replace("screening.explainability?.gradcam_lesion_iou", "(screening.explainability as any)?.gradcam_lesion_iou")

with open(report_ts_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Updated typings in reportService.ts!")
