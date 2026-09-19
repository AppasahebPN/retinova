import os
import sys
import json
import numpy as np
from PIL import Image, ImageDraw
import scipy.io as sio
import scipy.ndimage as ndimage
import matplotlib.pyplot as plt

# Paths
ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

UPLOADS_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads"
ARTIFACTS_DIR = r"C:\Users\Appasaheb\.gemini\antigravity-ide\brain\e8d45aaa-5f53-446a-98ab-b9ea21a0456a"

RUN_ID = "cc05b2b7"
ORIG_PATH = os.path.join(UPLOADS_DIR, "fundus_upload_9c1e0b5b-8393-43ff-a90a-0842b133c590.jpeg")
ENH_PATH = os.path.join(UPLOADS_DIR, f"enhanced_{RUN_ID}.png")
VES_PATH = os.path.join(UPLOADS_DIR, f"vessels_{RUN_ID}.png")
LES_PATH = os.path.join(UPLOADS_DIR, f"lesions_{RUN_ID}.png")
MAT_PATH = os.path.join(UPLOADS_DIR, f"attribution_matrix_{RUN_ID}.mat")

def run_audit_a():
    print("=" * 60)
    print("PROBLEM A: GRAD-CAM / LESION ALIGNMENT AUDIT")
    print("=" * 60)

    # 1. Load images and masks
    orig_img = Image.open(ORIG_PATH).convert("RGB")
    enh_img = Image.open(ENH_PATH).convert("RGB")
    ves_img = Image.open(VES_PATH).convert("L")
    les_img = Image.open(LES_PATH).convert("L")
    mat_data = sio.loadmat(MAT_PATH)
    raw_cam = mat_data["attribution_matrix"].astype(np.float32)

    w_orig, h_orig = orig_img.size
    w_enh, h_enh = enh_img.size
    w_les, h_les = les_img.size
    h_cam_raw, w_cam_raw = raw_cam.shape

    print(f"1. DIMENSIONS:")
    print(f"   Original fundus:           {w_orig} x {h_orig} (W x H)")
    print(f"   Module 2 enhanced:         {w_enh} x {h_enh} (W x H)")
    print(f"   Candidate lesion mask:     {w_les} x {h_les} (W x H)")
    print(f"   Grad-CAM raw tensor (MAT): {w_cam_raw} x {h_cam_raw} (W x H, shape={raw_cam.shape})")

    # 2. Coordinate Transformation Analysis
    print("\n2. COORDINATE CONVENTIONS & PREPROCESSING PIPELINE:")
    # Replicate Swin crop & pad logic from preprocess_512.py
    enh_arr = np.array(enh_img)
    gray = np.mean(enh_arr[:, :, :3], axis=2)
    tol = 7
    mask_retina = gray > tol
    rows = np.any(mask_retina, axis=1)
    cols = np.any(mask_retina, axis=0)

    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    ymin = max(0, ymin - 2)
    ymax = min(h_enh, ymax + 3)
    xmin = max(0, xmin - 2)
    xmax = min(w_enh, xmax + 3)

    crop_w = xmax - xmin
    crop_h = ymax - ymin
    max_dim = max(crop_w, crop_h)
    dx = (max_dim - crop_w) // 2
    dy = (max_dim - crop_h) // 2

    print(f"   Native image size:         {w_enh} x {h_enh}")
    print(f"   Crop bounding box:         xmin={xmin}, ymin={ymin}, xmax={xmax}, ymax={ymax}")
    print(f"   Cropped dimensions:        {crop_w} x {crop_h}")
    print(f"   Square pad:                {max_dim} x {max_dim}, pad dx={dx}, dy={dy}")
    print(f"   Resized to Swin input:     512 x 512")
    
    # 3. Compare NAIVE RESIZE vs TRUE INVERSE TRANSFORM RESIZE
    print("\n3. NAIVE RESIZE vs PROPER INVERSE TRANSFORM:")
    # A. Naive resize (as performed in matlab_bridge.py lines 358-361)
    pil_cam_raw = Image.fromarray((raw_cam * 255.0).astype(np.uint8))
    cam_naive_native = np.array(pil_cam_raw.resize((w_enh, h_enh), Image.Resampling.BILINEAR)) / 255.0

    # B. Inverse transform:
    # 512x512 -> max_dim x max_dim -> crop out (dx, dy, dx+crop_w, dy+crop_h) -> paste into (xmin, ymin) on w_enh x h_enh
    cam_sq_pil = pil_cam_raw.resize((max_dim, max_dim), Image.Resampling.BILINEAR)
    cam_cropped = cam_sq_pil.crop((dx, dy, dx + crop_w, dy + crop_h))
    cam_registered_pil = Image.new("L", (w_enh, h_enh), 0)
    cam_registered_pil.paste(cam_cropped, (xmin, ymin))
    cam_registered_native = np.array(cam_registered_pil) / 255.0

    # Retinal FOV in native space
    native_fov_mask = (gray > 15.0).astype(np.float32)
    native_fov_mask = ndimage.binary_fill_holes(native_fov_mask).astype(np.float32)
    native_fov_mask = ndimage.binary_erosion(native_fov_mask, iterations=5).astype(np.float32)

    # Lesion binary mask
    lesion_arr = np.array(les_img) > 0
    lesion_px = int(np.sum(lesion_arr))
    total_px = w_enh * h_enh

    print(f"   Lesion total positive pixels: {lesion_px:,} ({lesion_px / total_px * 100:.3f}% of fundus)")

    # Metrics helper
    def compute_metrics(cam_map, name, thresh_mode="percentile75"):
        if thresh_mode == "percentile75":
            cam_thresh = max(0.40, float(np.percentile(cam_map[cam_map > 0], 75.0)) if np.any(cam_map > 0) else 0.40)
        elif thresh_mode == "fixed04":
            cam_thresh = 0.40
        elif thresh_mode == "fixed02":
            cam_thresh = 0.20
        elif thresh_mode == "top10pct":
            cam_thresh = float(np.percentile(cam_map[cam_map > 0], 90.0))
            
        cam_bin = cam_map >= cam_thresh
        cam_px = int(np.sum(cam_bin))
        intersection = int(np.logical_and(cam_bin, lesion_arr).sum())
        union = int(np.logical_or(cam_bin, lesion_arr).sum())
        iou = intersection / union if union > 0 else 0.0
        dice = (2.0 * intersection) / (cam_px + lesion_px) if (cam_px + lesion_px) > 0 else 0.0
        
        cam_inside_lesion = (intersection / cam_px * 100.0) if cam_px > 0 else 0.0
        lesion_inside_cam = (intersection / lesion_px * 100.0) if lesion_px > 0 else 0.0
        
        # Centroid distance
        if cam_px > 0 and lesion_px > 0:
            cam_y, cam_x = np.where(cam_bin)
            les_y, les_x = np.where(lesion_arr)
            c_cam = np.array([np.mean(cam_x), np.mean(cam_y)])
            c_les = np.array([np.mean(les_x), np.mean(les_y)])
            centroid_dist = float(np.linalg.norm(c_cam - c_les))
        else:
            centroid_dist = np.nan
            c_cam, c_les = (0, 0), (0, 0)
            
        # CAM outside FOV
        outside_fov_mask = (native_fov_mask < 0.1)
        cam_outside_fov_px = int(np.sum(np.logical_and(cam_bin, outside_fov_mask)))
        cam_outside_fov_pct = (cam_outside_fov_px / cam_px * 100.0) if cam_px > 0 else 0.0

        return {
            "name": name,
            "threshold": cam_thresh,
            "cam_px": cam_px,
            "cam_pct": cam_px / total_px * 100.0,
            "intersection_px": intersection,
            "union_px": union,
            "iou": iou,
            "dice": dice,
            "cam_inside_lesion_pct": cam_inside_lesion,
            "lesion_inside_cam_pct": lesion_inside_cam,
            "centroid_dist_px": centroid_dist,
            "centroid_cam": c_cam,
            "centroid_lesion": c_les,
            "cam_outside_fov_pct": cam_outside_fov_pct,
            "cam_bin": cam_bin
        }

    m_naive = compute_metrics(cam_naive_native, "NAIVE DIRECT RESIZE (Production Bug)", "percentile75")
    m_reg = compute_metrics(cam_registered_native, "INVERSE-TRANSFORM REGISTERED", "percentile75")
    m_reg_04 = compute_metrics(cam_registered_native, "INVERSE-TRANSFORM (Fixed >=0.40)", "fixed04")

    print("\n4. QUANTITATIVE METRICS COMPARISON:")
    for m in [m_naive, m_reg, m_reg_04]:
        print(f"\n--- {m['name']} ---")
        print(f"    Threshold:                     {m['threshold']:.4f}")
        print(f"    Grad-CAM positive area:        {m['cam_px']:,} px ({m['cam_pct']:.2f}%)")
        print(f"    Lesion positive area:          {lesion_px:,} px ({lesion_px / total_px * 100:.3f}%)")
        print(f"    Intersection area:             {m['intersection_px']:,} px")
        print(f"    Union area:                    {m['union_px']:,} px")
        print(f"    IoU:                           {m['iou']:.6f} ({m['iou']*100:.3f}%)")
        print(f"    Dice coefficient:              {m['dice']:.6f}")
        print(f"    Centroid distance:             {m['centroid_dist_px']:.1f} px")
        print(f"    % Grad-CAM inside lesion mask: {m['cam_inside_lesion_pct']:.3f}%")
        print(f"    % Lesion pixels inside Grad-CAM:{m['lesion_inside_cam_pct']:.2f}%")
        print(f"    % Grad-CAM outside retinal FOV:{m['cam_outside_fov_pct']:.2f}%")

    # 5. Spatial Focus Breakdown
    print("\n5. SPATIAL ATTENTION FOCUS BREAKDOWN:")
    # Check vessel overlap
    ves_arr = np.array(ves_img) > 0
    ves_px = int(np.sum(ves_arr))
    cam_in_vessels = int(np.logical_and(m_reg['cam_bin'], ves_arr).sum())
    print(f"    Grad-CAM inside blood vessels: {cam_in_vessels:,} px ({cam_in_vessels / m_reg['cam_px'] * 100:.2f}%)")

    # Check Optic Disc / Macula region
    # Load retinal evidence JSON if available to get anatomical coordinates
    json_path = os.path.join(UPLOADS_DIR, f"retinal_evidence_{RUN_ID}.json")
    od_center = None
    mac_center = None
    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            ev_json = json.load(f)
            od = ev_json.get("opticDisc", {})
            mac = ev_json.get("macula", {})
            if "center" in od:
                od_center = od["center"]
            if "center" in mac:
                mac_center = mac["center"]

    print(f"    Optic Disc detected center:    {od_center}")
    print(f"    Macula detected center:        {mac_center}")
    print(f"    Grad-CAM centroid:             ({m_reg['centroid_cam'][0]:.1f}, {m_reg['centroid_cam'][1]:.1f})")
    print(f"    Lesion mask centroid:          ({m_reg['centroid_lesion'][0]:.1f}, {m_reg['centroid_lesion'][1]:.1f})")

    # 6. GENERATE DEBUG ARTIFACT: debug_cam_lesion_alignment_<runId>.png
    print("\n6. GENERATING DEBUG ARTIFACT: debug_cam_lesion_alignment_<runId>.png")
    fig, axes = plt.subplots(2, 3, figsize=(18, 12), dpi=150)
    fig.suptitle(f"RETINOVA Problem A Audit — Grad-CAM vs Candidate Lesions (Run: {RUN_ID})\n"
                 f"Naive IoU = {m_naive['iou']:.4f} | Registered IoU = {m_reg['iou']:.4f} | Lesion Coverage = {lesion_px/total_px*100:.2f}%",
                 fontsize=14, fontweight="bold")

    # Panel A: Original fundus
    axes[0, 0].imshow(orig_img)
    axes[0, 0].set_title("A. Original Fundus Image (2592 x 1944)", fontsize=11, fontweight="bold")
    axes[0, 0].axis("off")

    # Panel B: Grad-CAM mask only
    axes[0, 1].imshow(m_reg["cam_bin"], cmap="inferno")
    axes[0, 1].set_title(f"B. Grad-CAM Mask (Registered, Top 25%)\nArea: {m_reg['cam_px']:,} px ({m_reg['cam_pct']:.1f}%)",
                          fontsize=11, fontweight="bold")
    axes[0, 1].axis("off")

    # Panel C: Candidate lesion mask only
    axes[0, 2].imshow(lesion_arr, cmap="hot")
    axes[0, 2].set_title(f"C. Candidate Lesions (Module 3)\nArea: {lesion_px:,} px ({lesion_px/total_px*100:.2f}%)",
                          fontsize=11, fontweight="bold")
    axes[0, 2].axis("off")

    # Panel D: Overlay (Fundus + CAM in Yellow + Lesions in Cyan)
    overlay_rgb = np.array(orig_img).copy()
    # Yellow for CAM
    cam_mask = m_reg["cam_bin"]
    overlay_rgb[cam_mask, 0] = np.clip(overlay_rgb[cam_mask, 0] * 0.4 + 255 * 0.6, 0, 255).astype(np.uint8)
    overlay_rgb[cam_mask, 1] = np.clip(overlay_rgb[cam_mask, 1] * 0.4 + 200 * 0.6, 0, 255).astype(np.uint8)
    overlay_rgb[cam_mask, 2] = np.clip(overlay_rgb[cam_mask, 2] * 0.4, 0, 255).astype(np.uint8)
    # Cyan/Red for Lesions
    overlay_rgb[lesion_arr, 0] = 255
    overlay_rgb[lesion_arr, 1] = 40
    overlay_rgb[lesion_arr, 2] = 40
    axes[1, 0].imshow(overlay_rgb)
    axes[1, 0].set_title("D. Overlay: Fundus + CAM (Yellow) + Lesions (Red)", fontsize=11, fontweight="bold")
    axes[1, 0].axis("off")

    # Panel E: Binary intersection mask
    intersection_mask = np.logical_and(m_reg["cam_bin"], lesion_arr)
    axes[1, 1].imshow(intersection_mask, cmap="Greens")
    axes[1, 1].set_title(f"E. Binary Intersection Mask (CAM ∩ Lesions)\nOverlap: {m_reg['intersection_px']:,} px | Dice: {m_reg['dice']:.4f}",
                          fontsize=11, fontweight="bold")
    axes[1, 1].axis("off")

    # Panel F: Bounding boxes
    axes[1, 2].imshow(orig_img)
    # Get bounding box of CAM
    if m_reg['cam_px'] > 0:
        cy, cx = np.where(m_reg['cam_bin'])
        cam_bbox = [np.min(cx), np.min(cy), np.max(cx) - np.min(cx), np.max(cy) - np.min(cy)]
        rect_cam = plt.Rectangle((cam_bbox[0], cam_bbox[1]), cam_bbox[2], cam_bbox[3],
                                 linewidth=2, edgecolor='yellow', facecolor='none', label='Grad-CAM BBox')
        axes[1, 2].add_patch(rect_cam)
        axes[1, 2].plot(m_reg['centroid_cam'][0], m_reg['centroid_cam'][1], 'y*', markersize=12, label='CAM Centroid')

    if lesion_px > 0:
        ly, lx = np.where(lesion_arr)
        les_bbox = [np.min(lx), np.min(ly), np.max(lx) - np.min(lx), np.max(ly) - np.min(ly)]
        rect_les = plt.Rectangle((les_bbox[0], les_bbox[1]), les_bbox[2], les_bbox[3],
                                 linewidth=2, edgecolor='red', facecolor='none', label='Lesions BBox')
        axes[1, 2].add_patch(rect_les)
        axes[1, 2].plot(m_reg['centroid_lesion'][0], m_reg['centroid_lesion'][1], 'r+', markersize=12, label='Lesion Centroid')

    axes[1, 2].legend(loc="upper right", fontsize=9)
    axes[1, 2].set_title(f"F. Spatial Bounding Boxes & Centroids\nCentroid Distance: {m_reg['centroid_dist_px']:.1f} px",
                          fontsize=11, fontweight="bold")
    axes[1, 2].axis("off")

    plt.tight_layout()
    out_align_art = os.path.join(ARTIFACTS_DIR, f"debug_cam_lesion_alignment_{RUN_ID}.png")
    out_align_upl = os.path.join(UPLOADS_DIR, f"debug_cam_lesion_alignment_{RUN_ID}.png")
    plt.savefig(out_align_art, dpi=150, bbox_inches="tight")
    plt.savefig(out_align_upl, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"   Saved {out_align_art}")

    # 7. GENERATE DEBUG ARTIFACT: debug_cam_artifact_focus_<runId>.png
    print("\n7. GENERATING DEBUG ARTIFACT: debug_cam_artifact_focus_<runId>.png")
    fig, axes = plt.subplots(1, 4, figsize=(20, 5), dpi=150)
    fig.suptitle(f"RETINOVA FOV & Artifact Attention Analysis (Run: {RUN_ID})", fontsize=14, fontweight="bold")

    # 1. Retinal FOV
    axes[0].imshow(native_fov_mask, cmap="Blues")
    axes[0].set_title("1. Retinal Field-of-View Mask", fontsize=11, fontweight="bold")
    axes[0].axis("off")

    # 2. CAM Activation heatmap
    axes[1].imshow(cam_registered_native, cmap="inferno")
    axes[1].set_title("2. Registered Grad-CAM Activation Heatmap", fontsize=11, fontweight="bold")
    axes[1].axis("off")

    # 3. Non-retinal / Background area
    non_retina = (native_fov_mask < 0.1).astype(np.float32)
    cam_in_bg = cam_registered_native * non_retina
    axes[2].imshow(cam_in_bg, cmap="magma")
    axes[2].set_title(f"3. CAM in Non-Retinal Background\n({m_reg['cam_outside_fov_pct']:.2f}% outside FOV)", fontsize=11, fontweight="bold")
    axes[2].axis("off")

    # 4. Image-border / Lens notch region
    border_zone = np.zeros_like(native_fov_mask)
    border_zone[:100, :] = 1.0
    border_zone[-100:, :] = 1.0
    border_zone[:, :100] = 1.0
    border_zone[:, -100:] = 1.0
    cam_in_border = cam_registered_native * border_zone
    axes[3].imshow(cam_in_border, cmap="hot")
    border_pct = (np.sum(cam_in_border > 0.2) / np.sum(cam_registered_native > 0.2) * 100.0) if np.sum(cam_registered_native > 0.2) > 0 else 0.0
    axes[3].set_title(f"4. Image Border Region Attention\n({border_pct:.2f}% in 100px periphery)", fontsize=11, fontweight="bold")
    axes[3].axis("off")

    plt.tight_layout()
    out_foc_art = os.path.join(ARTIFACTS_DIR, f"debug_cam_artifact_focus_{RUN_ID}.png")
    out_foc_upl = os.path.join(UPLOADS_DIR, f"debug_cam_artifact_focus_{RUN_ID}.png")
    plt.savefig(out_foc_art, dpi=150, bbox_inches="tight")
    plt.savefig(out_foc_upl, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"   Saved {out_foc_art}")

    return {
        "m_naive": m_naive,
        "m_reg": m_reg,
        "m_reg_04": m_reg_04,
        "xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax,
        "crop_w": crop_w, "crop_h": crop_h,
        "dx": dx, "dy": dy, "max_dim": max_dim,
        "lesion_px": lesion_px, "total_px": total_px
    }

if __name__ == "__main__":
    run_audit_a()
