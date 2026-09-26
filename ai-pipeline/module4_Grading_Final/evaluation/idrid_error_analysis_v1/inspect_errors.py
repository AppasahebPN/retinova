import os
import sys
import json
import pandas as pd
import numpy as np
import scipy.io as sio

ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
sys.path.insert(0, ROOT_DIR)

mat = sio.loadmat(os.path.join(ROOT_DIR, 'module4_Grading_Final/FINAL_MODEL_SUMMARY.mat'))
idrid = mat['idrid_locked_test']
probs = idrid['calibrated_probs'][0, 0].flatten()
targets_ref = idrid['targets_ref'][0, 0].flatten()
targets_5g = idrid['targets_5g'][0, 0].flatten()
preds_5g = idrid['preds_5g'][0, 0].flatten()
thresh = float(mat['frozen_threshold'][0, 0])

df = pd.read_csv(os.path.join(ROOT_DIR, 'module4_Grading_Final/manifest/master_manifest.csv'))
test_df = df[df['split'] == 'test_locked'].reset_index(drop=True)

test_df['calibrated_p_ref'] = probs
test_df['pred_ref'] = (probs >= thresh).astype(int)
test_df['pred_5g'] = preds_5g
test_df['margin'] = probs - thresh

fps = test_df[(test_df['is_referable'] == 0) & (test_df['pred_ref'] == 1)].copy().reset_index(drop=True)
fns = test_df[(test_df['is_referable'] == 1) & (test_df['pred_ref'] == 0)].copy().reset_index(drop=True)

print(f"Total Test Images: {len(test_df)}")
print(f"Total FP: {len(fps)}")
print(f"Total FN: {len(fns)}")
print(f"Frozen Threshold: {thresh:.4f}")

print("\n=== 7 FALSE POSITIVES ===")
for i, r in fps.iterrows():
    print(f"FP_{i+1:02d}: {r['image_id']} | GT Grade: {r['dr_grade']} | Pred Grade: {r['pred_5g']} | P_ref: {r['calibrated_p_ref']:.4f} | Margin: {r['margin']:+.4f} | File: {os.path.basename(r['rel_path'])}")

print("\n=== 6 FALSE NEGATIVES ===")
for i, r in fns.iterrows():
    print(f"FN_{i+1:02d}: {r['image_id']} | GT Grade: {r['dr_grade']} | Pred Grade: {r['pred_5g']} | P_ref: {r['calibrated_p_ref']:.4f} | Margin: {r['margin']:+.4f} | File: {os.path.basename(r['rel_path'])}")

# Check summary statistics
print("\n--- FP Summary ---")
print(f"Mean P_ref for FP: {fps['calibrated_p_ref'].mean():.4f}")
print(f"FP by GT grade: {fps['dr_grade'].value_counts().to_dict()}")
print(f"FP near threshold (|margin| <= 0.10): {(fps['margin'].abs() <= 0.10).sum()} / {len(fps)}")

print("\n--- FN Summary ---")
print(f"Mean P_ref for FN: {fns['calibrated_p_ref'].mean():.4f}")
print(f"FN by GT grade: {fns['dr_grade'].value_counts().to_dict()}")
print(f"FN near threshold (|margin| <= 0.10): {(fns['margin'].abs() <= 0.10).sum()} / {len(fns)}")
