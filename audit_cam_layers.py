import os
import sys
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
import scipy.ndimage as ndimage
import matplotlib.pyplot as plt

ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from module4_Grading_Final.models.swinv2_tiny import SwinV2TinyDR
from module4_Grading_Final.preprocessing.preprocess_512 import crop_retina_fov_pil, pad_and_resize_pil

UPLOADS_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads"
ARTIFACTS_DIR = r"C:\Users\Appasaheb\.gemini\antigravity-ide\brain\e8d45aaa-5f53-446a-98ab-b9ea21a0456a"
RUN_ID = "cc05b2b7"
CKPT_PATH = os.path.join(ROOT_DIR, "module4_Grading_Final", "checkpoints", "best_model.pt")
ORIG_PATH = os.path.join(UPLOADS_DIR, "fundus_upload_9c1e0b5b-8393-43ff-a90a-0842b133c590.jpeg")
ENH_PATH = os.path.join(UPLOADS_DIR, f"enhanced_{RUN_ID}.png")
LES_PATH = os.path.join(UPLOADS_DIR, f"lesions_{RUN_ID}.png")

def compute_retinal_fov_mask(img_np):
    gray = (0.299 * img_np[:, :, 0] + 0.587 * img_np[:, :, 1] + 0.114 * img_np[:, :, 2]).astype(np.float32)
    mask = (gray > 12.0).astype(np.float32)
    mask = ndimage.binary_fill_holes(mask).astype(np.float32)
    mask = ndimage.binary_erosion(mask, iterations=3).astype(np.float32)
    return mask

def run_layer_audit():
    print("=" * 60)
    print("PROBLEM A - STEP 10: MULTI-LAYER GRAD-CAM COMPARISON")
    print("=" * 60)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SwinV2TinyDR(pretrained=False, use_grad_checkpointing=False).to(device)
    ckpt = torch.load(CKPT_PATH, map_location='cpu', weights_only=False)
    if 'model_state_dict' in ckpt:
        model.load_state_dict(ckpt['model_state_dict'])
    else:
        model.load_state_dict(ckpt)
    model.eval()

    # Preprocess image
    img_pil = Image.open(ENH_PATH).convert('RGB')
    w_enh, h_enh = img_pil.size
    
    # Compute registration parameters
    img_arr = np.array(img_pil)
    gray = np.mean(img_arr[:, :, :3], axis=2)
    mask_ret = gray > 7
    rows = np.any(mask_ret, axis=1)
    cols = np.any(mask_ret, axis=0)
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

    cropped = img_pil.crop((xmin, ymin, xmax, ymax))
    resized_pil = pad_and_resize_pil(cropped, target_size=512)
    arr = np.array(resized_pil, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm_arr = (arr - mean) / std
    tensor = torch.from_numpy(np.transpose(norm_arr, (2, 0, 1))).unsqueeze(0).float().to(device)

    # Candidate lesions
    les_img = Image.open(LES_PATH).convert("L")
    lesion_arr = np.array(les_img) > 0
    lesion_px = int(np.sum(lesion_arr))
    total_px = w_enh * h_enh

    # Retinal FOV in 512 space
    fundus_np = np.array(resized_pil, dtype=np.uint8)
    fov_mask_512 = compute_retinal_fov_mask(fundus_np)

    # Function to map 512 CAM back to native fundus space
    def register_cam_to_native(cam_512):
        pil_cam = Image.fromarray((cam_512 * 255.0).astype(np.uint8))
        cam_sq = pil_cam.resize((max_dim, max_dim), Image.Resampling.BILINEAR)
        cam_cr = cam_sq.crop((dx, dy, dx + crop_w, dy + crop_h))
        cam_reg = Image.new("L", (w_enh, h_enh), 0)
        cam_reg.paste(cam_cr, (xmin, ymin))
        return np.array(cam_reg) / 255.0

    # Test candidate layers
    # features[3]: Stage 2 (earlier, 64x64)
    # features[5]: Stage 3 (intermediate, 32x32)
    # features[7]: Stage 4 (later, 16x16)
    # fused: 0.6 * features[5] + 0.4 * features[7] (current production)
    layer_configs = [
        ("Earlier: Stage 2 (features[3], 64x64)", [3], None),
        ("Intermediate: Stage 3 (features[5], 32x32)", [5], None),
        ("Later: Stage 4 (features[7], 16x16)", [7], None),
        ("Current Prod: Multi-Scale (features[5]+[7])", [5, 7], "fused")
    ]

    results = []

    for name, layer_indices, mode in layer_configs:
        acts = {}
        hooks = []
        for idx in layer_indices:
            def make_hook(key):
                def hook_fn(m, inp, out):
                    acts[key] = out
                    out.retain_grad()
                return hook_fn
            h = model.backbone.features[idx].register_forward_hook(make_hook(f"s{idx}"))
            hooks.append(h)

        t_in = tensor.clone().detach().requires_grad_(True)
        out = model(t_in)
        logit_ref = out['logit_referable'][0, 0]

        model.zero_grad()
        logit_ref.backward()

        for h in hooks:
            h.remove()

        cams_res = {}
        for idx in layer_indices:
            act = acts[f"s{idx}"]
            grad = act.grad
            w = grad.mean(dim=(1, 2), keepdim=True)
            cam = F.relu((act * w).sum(dim=-1)).squeeze().detach().cpu().numpy()
            if cam.max() > cam.min():
                cam = (cam - cam.min()) / (cam.max() - cam.min())
            else:
                cam = np.zeros_like(cam)
            cams_res[idx] = cam

        if mode == "fused":
            cam3 = cams_res[5]
            cam4 = cams_res[7]
            cam4_t = torch.from_numpy(cam4).unsqueeze(0).unsqueeze(0).float()
            cam4_up = F.interpolate(cam4_t, size=(32, 32), mode='bilinear', align_corners=False).squeeze().numpy()
            cam_map_raw = 0.6 * cam3 + 0.4 * cam4_up
        else:
            cam_map_raw = cams_res[layer_indices[0]]

        cam_map_raw = (cam_map_raw - cam_map_raw.min()) / (cam_map_raw.max() - cam_map_raw.min() + 1e-8)

        # Upsample to 512
        cam_t = torch.from_numpy(cam_map_raw).unsqueeze(0).unsqueeze(0).float()
        cam_512 = F.interpolate(cam_t, size=(512, 512), mode='bicubic', align_corners=False).squeeze().numpy()
        cam_smooth = ndimage.gaussian_filter(cam_512, sigma=6.0)
        cam_smooth = np.clip(cam_smooth, 0, None)

        cam_fov = cam_smooth * fov_mask_512
        fov_idx = fov_mask_512 > 0.1
        if np.any(fov_idx):
            v_min, v_max = cam_fov[fov_idx].min(), cam_fov[fov_idx].max()
            cam_final = np.clip((cam_fov - v_min) / (v_max - v_min), 0.0, 1.0) * fov_mask_512 if v_max > v_min else np.zeros_like(cam_fov)
        else:
            cam_final = np.zeros_like(cam_fov)

        # Register to native space
        cam_registered = register_cam_to_native(cam_final)

        # Compute metrics
        thresh = max(0.40, float(np.percentile(cam_registered[cam_registered > 0], 75.0)))
        cam_bin = cam_registered >= thresh
        cam_px = int(np.sum(cam_bin))
        intersection = int(np.logical_and(cam_bin, lesion_arr).sum())
        union = int(np.logical_or(cam_bin, lesion_arr).sum())
        iou = intersection / union if union > 0 else 0.0
        dice = (2.0 * intersection) / (cam_px + lesion_px) if (cam_px + lesion_px) > 0 else 0.0
        cam_in_les = (intersection / cam_px * 100.0) if cam_px > 0 else 0.0
        les_in_cam = (intersection / lesion_px * 100.0) if lesion_px > 0 else 0.0

        if cam_px > 0 and lesion_px > 0:
            cy, cx = np.where(cam_bin)
            ly, lx = np.where(lesion_arr)
            c_cam = np.array([np.mean(cx), np.mean(cy)])
            c_les = np.array([np.mean(lx), np.mean(ly)])
            cdist = float(np.linalg.norm(c_cam - c_les))
        else:
            cdist = np.nan
            c_cam = np.array([0, 0])

        res = {
            "name": name,
            "cam_px": cam_px,
            "cam_pct": cam_px / total_px * 100.0,
            "intersection": intersection,
            "union": union,
            "iou": iou,
            "dice": dice,
            "cam_in_les": cam_in_les,
            "les_in_cam": les_in_cam,
            "cdist": cdist,
            "centroid_cam": c_cam,
            "cam_registered": cam_registered,
            "cam_bin": cam_bin
        }
        results.append(res)
        print(f"\nLayer: {name}")
        print(f"  CAM Area: {cam_px:,} px ({cam_px/total_px*100:.2f}%)")
        print(f"  Intersection: {intersection:,} px | Union: {union:,} px")
        print(f"  IoU: {iou:.6f} ({iou*100:.3f}%) | Dice: {dice:.6f}")
        print(f"  % Lesion in CAM: {les_in_cam:.2f}% | % CAM in Lesion: {cam_in_les:.3f}%")
        print(f"  Centroid Dist: {cdist:.1f} px | CAM Centroid: ({c_cam[0]:.1f}, {c_cam[1]:.1f})")

    # Generate multi-layer comparison visualization
    fig, axes = plt.subplots(2, 4, figsize=(22, 10), dpi=150)
    fig.suptitle(f"RETINOVA Problem A: Swin V2 Tiny Grad-CAM Layer Comparison (Run: {RUN_ID})\n"
                 f"Lesion Total Area = {lesion_px:,} px (0.82% of Fundus) | Lesion Centroid = (1091.6, 1146.8)",
                 fontsize=14, fontweight="bold")

    for col, res in enumerate(results):
        # Top row: Heatmap overlaid on fundus
        axes[0, col].imshow(img_pil)
        axes[0, col].imshow(res["cam_registered"], cmap="inferno", alpha=0.55)
        axes[0, col].set_title(f"{res['name']}\nIoU: {res['iou']:.4f} | Dice: {res['dice']:.4f}", fontsize=11, fontweight="bold")
        axes[0, col].axis("off")

        # Bottom row: Binary CAM + Lesions (Red)
        overlay_bin = np.zeros((h_enh, w_enh, 3), dtype=np.uint8)
        # Background dark gray
        overlay_bin[:] = [20, 20, 25]
        # CAM in Yellow
        overlay_bin[res["cam_bin"]] = [220, 180, 20]
        # Lesion in Red
        overlay_bin[lesion_arr] = [255, 40, 40]
        # Intersection in Bright White/Cyan
        inter = np.logical_and(res["cam_bin"], lesion_arr)
        overlay_bin[inter] = [0, 255, 255]

        axes[1, col].imshow(overlay_bin)
        axes[1, col].set_title(f"CAM (Yellow) + Lesions (Red) + Overlap (Cyan)\nOverlap: {res['intersection']:,} px | Lesion in CAM: {res['les_in_cam']:.1f}%",
                               fontsize=10)
        axes[1, col].axis("off")

    plt.tight_layout()
    comp_art = os.path.join(ARTIFACTS_DIR, f"debug_cam_layer_comparison_{RUN_ID}.png")
    comp_upl = os.path.join(UPLOADS_DIR, f"debug_cam_layer_comparison_{RUN_ID}.png")
    plt.savefig(comp_art, dpi=150, bbox_inches="tight")
    plt.savefig(comp_upl, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"\nSaved layer comparison artifact to: {comp_art}")

if __name__ == "__main__":
    run_layer_audit()
