import os
import sys
import pandas as pd
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
sys.path.insert(0, ROOT_DIR)
from module4_Grading_Final.preprocessing.preprocess_512 import crop_retina_fov_pil, pad_and_resize_pil

df = pd.read_csv(os.path.join(ROOT_DIR, 'module4_Grading_Final/manifest/master_manifest.csv'))

idrid_train = df[(df['dataset'] == 'IDRiD') & (df['split'] == 'train')].reset_index(drop=True)
idrid_val = df[(df['dataset'] == 'IDRiD') & (df['split'].str.startswith('val'))].reset_index(drop=True)
idrid_test = df[df['split'] == 'test_locked'].reset_index(drop=True)

def compute_image_stats(df_subset, max_samples=None):
    if max_samples and len(df_subset) > max_samples:
        df_subset = df_subset.sample(max_samples, random_state=42)
    
    stats = []
    for _, row in df_subset.iterrows():
        fpath = os.path.join(ROOT_DIR, row['rel_path']) if not os.path.isabs(row['rel_path']) else row['rel_path']
        if not os.path.exists(fpath):
            continue
        img = Image.open(fpath).convert('RGB')
        orig_w, orig_h = img.size
        
        cropped = crop_retina_fov_pil(img)
        crop_w, crop_h = cropped.size
        crop_scale = (crop_w * crop_h) / (orig_w * orig_h)
        
        resized = pad_and_resize_pil(cropped, 512)
        arr = np.array(resized)
        
        # Grayscale approximation
        gray = 0.2989 * arr[:, :, 0] + 0.5870 * arr[:, :, 1] + 0.1140 * arr[:, :, 2]
        fg_mask = gray > 10
        if fg_mask.sum() == 0:
            continue
            
        mean_r = arr[:, :, 0][fg_mask].mean()
        mean_g = arr[:, :, 1][fg_mask].mean()
        mean_b = arr[:, :, 2][fg_mask].mean()
        luminance = gray[fg_mask].mean()
        contrast = gray[fg_mask].std()
        laplacian = ndimage.laplace(gray)
        laplacian_var = laplacian[fg_mask].var()
        
        stats.append({
            'image_id': row['image_id'],
            'mean_r': mean_r,
            'mean_g': mean_g,
            'mean_b': mean_b,
            'luminance': luminance,
            'contrast': contrast,
            'laplacian_var': laplacian_var,
            'crop_scale': crop_scale,
            'dr_grade': row['dr_grade']
        })
    return pd.DataFrame(stats)

print("Computing stats for IDRiD train...")
df_stats_train = compute_image_stats(idrid_train)
print("Computing stats for IDRiD val...")
df_stats_val = compute_image_stats(idrid_val)
print("Computing stats for IDRiD test...")
df_stats_test = compute_image_stats(idrid_test)

print("\n--- Comparative Summary ---")
for name, s in [('IDRiD Train', df_stats_train), ('IDRiD Val', df_stats_val), ('IDRiD Test Locked', df_stats_test)]:
    print(f"\n{name} (N={len(s)}):")
    print(f"  Luminance:     {s['luminance'].mean():.2f} +/- {s['luminance'].std():.2f}")
    print(f"  Contrast:      {s['contrast'].mean():.2f} +/- {s['contrast'].std():.2f}")
    print(f"  Sharpness(Lap):{s['laplacian_var'].mean():.2f} +/- {s['laplacian_var'].std():.2f}")
    print(f"  Red Channel:   {s['mean_r'].mean():.2f} +/- {s['mean_r'].std():.2f}")
    print(f"  Green Channel: {s['mean_g'].mean():.2f} +/- {s['mean_g'].std():.2f}")
    print(f"  Blue Channel:  {s['mean_b'].mean():.2f} +/- {s['mean_b'].std():.2f}")
    print(f"  Crop Ratio:    {s['crop_scale'].mean():.4f} +/- {s['crop_scale'].std():.4f}")

# Check the 7 FP cases specifically
fp_ids = ['IDRiD_052', 'IDRiD_054', 'IDRiD_073', 'IDRiD_085', 'IDRiD_097', 'IDRiD_098', 'IDRiD_101']
fn_ids = ['IDRiD_012', 'IDRiD_060', 'IDRiD_064', 'IDRiD_076', 'IDRiD_081', 'IDRiD_084']

fp_stats = df_stats_test[df_stats_test['image_id'].isin(fp_ids)]
fn_stats = df_stats_test[df_stats_test['image_id'].isin(fn_ids)]
tn_stats = df_stats_test[~df_stats_test['image_id'].isin(fp_ids + fn_ids) & (df_stats_test['dr_grade'] <= 1)]

print("\n--- FP Specific Stats (N=7) ---")
print(f"  Luminance:     {fp_stats['luminance'].mean():.2f} (TN: {tn_stats['luminance'].mean():.2f})")
print(f"  Contrast:      {fp_stats['contrast'].mean():.2f} (TN: {tn_stats['contrast'].mean():.2f})")
print(f"  Sharpness:     {fp_stats['laplacian_var'].mean():.2f} (TN: {tn_stats['laplacian_var'].mean():.2f})")
print(f"  Red:           {fp_stats['mean_r'].mean():.2f} (TN: {tn_stats['mean_r'].mean():.2f})")
print(f"  Green:         {fp_stats['mean_g'].mean():.2f} (TN: {tn_stats['mean_g'].mean():.2f})")
print(f"  Blue:          {fp_stats['mean_b'].mean():.2f} (TN: {tn_stats['mean_b'].mean():.2f})")

print("\n--- FN Specific Stats (N=6) ---")
tp_stats = df_stats_test[~df_stats_test['image_id'].isin(fp_ids + fn_ids) & (df_stats_test['dr_grade'] >= 2)]
print(f"  Luminance:     {fn_stats['luminance'].mean():.2f} (TP: {tp_stats['luminance'].mean():.2f})")
print(f"  Contrast:      {fn_stats['contrast'].mean():.2f} (TP: {tp_stats['contrast'].mean():.2f})")
print(f"  Sharpness:     {fn_stats['laplacian_var'].mean():.2f} (TP: {tp_stats['laplacian_var'].mean():.2f})")
