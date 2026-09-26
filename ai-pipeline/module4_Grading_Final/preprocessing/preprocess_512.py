import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def crop_retina_fov_pil(img_pil, tol=7):
    """
    Detects retinal fundus mask and crops surrounding black borders using PIL & numpy.
    Preserves true aspect ratio and field of view.
    """
    img_arr = np.array(img_pil)
    if len(img_arr.shape) == 3:
        # Grayscale approximation
        gray = np.mean(img_arr[:, :, :3], axis=2)
    else:
        gray = img_arr
        
    mask = gray > tol
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    
    if not np.any(rows) or not np.any(cols):
        return img_pil
        
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    
    # Add a small buffer if possible
    h, w = gray.shape[:2]
    ymin = max(0, ymin - 2)
    ymax = min(h, ymax + 3)
    xmin = max(0, xmin - 2)
    xmax = min(w, xmax + 3)
    
    return img_pil.crop((xmin, ymin, xmax, ymax))

def pad_and_resize_pil(img_pil, target_size=512):
    """
    Pads to square preserving aspect ratio, then resizes to exactly target_size x target_size
    using high-quality Bicubic resampling.
    """
    w, h = img_pil.size
    max_dim = max(w, h)
    
    square_img = Image.new("RGB", (max_dim, max_dim), (0, 0, 0))
    dx = (max_dim - w) // 2
    dy = (max_dim - h) // 2
    square_img.paste(img_pil, (dx, dy))
    
    resized_img = square_img.resize((target_size, target_size), Image.Resampling.BICUBIC)
    return resized_img

def preprocess_image_512(img_path, target_size=512):
    """
    Full clinical 512x512 preprocessing pipeline:
    1. Read RGB image via PIL
    2. Circular FOV crop
    3. Aspect-preserving square pad
    4. Bicubic resize to 512x512
    5. Return PIL Image (for preview) and normalized float32 tensor (C, H, W)
    """
    img_pil = Image.open(img_path).convert('RGB')
    cropped = crop_retina_fov_pil(img_pil)
    resized_pil = pad_and_resize_pil(cropped, target_size=target_size)
    
    # Normalize to float32 tensor
    arr = np.array(resized_pil, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm_arr = (arr - mean) / std
    
    # (H, W, C) -> (C, H, W)
    norm_tensor = np.transpose(norm_arr, (2, 0, 1))
    
    return resized_pil, norm_tensor

def generate_preview_panel(manifest_csv, out_path, num_samples_per_ds=2):
    """
    Generates a preview comparison grid showing raw vs 512x512 preprocessed images
    across APTOS, EyeQ, and IDRiD using PIL Image stitching.
    """
    import pandas as pd
    
    df = pd.read_csv(manifest_csv)
    datasets = ['APTOS', 'EyeQ', 'IDRiD', 'IDRiD_Locked_Test']
    
    selected_rows = []
    for d in datasets:
        sub = df[df['dataset'] == d]
        if len(sub) > 0:
            selected_rows.extend(sub.head(num_samples_per_ds).to_dict('records'))
            
    n_rows = len(selected_rows)
    cell_w, cell_h = 320, 320
    header_h = 40
    margin = 15
    
    grid_w = margin * 3 + cell_w * 2
    grid_h = margin + n_rows * (cell_h + header_h + margin)
    
    canvas = Image.new("RGB", (grid_w, grid_h), (25, 25, 30))
    draw = ImageDraw.Draw(canvas)
    
    root = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
    
    for idx, row in enumerate(selected_rows):
        fpath = os.path.join(root, row['rel_path']) if not os.path.isabs(row['rel_path']) else row['rel_path']
        raw_pil = Image.open(fpath).convert('RGB')
        prep_pil, _ = preprocess_image_512(fpath, target_size=512)
        
        # Fit raw into cell_w, cell_h
        raw_thumb = raw_pil.copy()
        raw_thumb.thumbnail((cell_w, cell_h), Image.Resampling.BILINEAR)
        raw_cell = Image.new("RGB", (cell_w, cell_h), (0, 0, 0))
        raw_cell.paste(raw_thumb, ((cell_w - raw_thumb.width) // 2, (cell_h - raw_thumb.height) // 2))
        
        # Fit prep 512 into cell_w, cell_h
        prep_cell = prep_pil.resize((cell_w, cell_h), Image.Resampling.BILINEAR)
        
        y_top = margin + idx * (cell_h + header_h + margin)
        
        # Header text
        ref_str = "REFERABLE" if row['is_referable'] == 1 else "Non-Referable"
        label_raw = f"RAW: {row['dataset']} | {row['image_id']} ({raw_pil.width}x{raw_pil.height})"
        label_prep = f"PREP 512x512 | Grade G{row['dr_grade']} [{ref_str}]"
        
        draw.text((margin, y_top), label_raw, fill=(220, 220, 220))
        draw.text((margin * 2 + cell_w, y_top), label_prep, fill=(100, 220, 100) if row['is_referable'] else (200, 200, 255))
        
        canvas.paste(raw_cell, (margin, y_top + header_h - 15))
        canvas.paste(prep_cell, (margin * 2 + cell_w, y_top + header_h - 15))
        
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, format="PNG")
    print(f"Saved preprocessing preview panel to {out_path} ({grid_w}x{grid_h})")

if __name__ == '__main__':
    manifest_file = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module4_Grading_Final\manifest\master_manifest.csv"
    preview_file = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module4_Grading_Final\preprocessing\preview_512.png"
    if os.path.exists(manifest_file):
        generate_preview_panel(manifest_file, preview_file)
    else:
        print(f"Manifest not yet generated at {manifest_file}")
