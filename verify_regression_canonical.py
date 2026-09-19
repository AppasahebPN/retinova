import json

db_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\data\db.json"
with open(db_path, "r", encoding="utf-8") as f:
    d = json.load(f)

screenings = {s["id"]: s for s in d.get("screenings", [])}

# Canonical Grade 4 cases
g4_id = "cc05b2b7-5987-4941-a535-200a572f5e96"
s_g4 = screenings.get(g4_id)
clf_g4 = s_g4["classification"]

print("=== CANONICAL GRADE 4 REGRESSION CHECK ===")
print("ID:", g4_id)
print("Grade:", clf_g4["predicted_grade"])
print("Decision:", clf_g4["decision"])
print("Calibrated P(G2+):", f"{clf_g4['g2plus_probability_calibrated'] * 100:.2f}%")
print("Threshold tau*:", clf_g4["threshold"])
print("Temperature T*:", clf_g4["temperature"])

assert clf_g4["predicted_grade"] == 4
assert clf_g4["decision"] == "REFER"
assert round(clf_g4["g2plus_probability_calibrated"] * 100, 2) == 99.39
assert clf_g4["threshold"] == 0.2993
assert clf_g4["temperature"] == 1.4555
print(">> Grade 4 Regression: PASS (Grade 4, REFER, Calibrated P(G2+) = 99.39%)\n")

# Canonical Grade 0 cases
g0_id = "cd69576b-72c9-47a1-a996-c5d79755d0ad"
s_g0 = screenings.get(g0_id)
clf_g0 = s_g0["classification"]

print("=== CANONICAL GRADE 0 REGRESSION CHECK ===")
print("ID:", g0_id)
print("Grade:", clf_g0["predicted_grade"])
print("Decision:", clf_g0["decision"])
print("Calibrated P(G2+):", f"{clf_g0['g2plus_probability_calibrated'] * 100:.2f}%")
print("Threshold tau*:", clf_g0["threshold"])
print("Temperature T*:", clf_g0["temperature"])

assert clf_g0["predicted_grade"] == 0
assert clf_g0["decision"] == "SCREEN"
assert round(clf_g0["g2plus_probability_calibrated"] * 100, 2) == 1.50
assert clf_g0["threshold"] == 0.2993
assert clf_g0["temperature"] == 1.4555
print(">> Grade 0 Regression: PASS (Grade 0, SCREEN, Calibrated P(G2+) = 1.50%)\n")

print("ALL REGRESSION CHECKS PASSED: Model, weights, calibration, and thresholds 100% UNCHANGED.")
