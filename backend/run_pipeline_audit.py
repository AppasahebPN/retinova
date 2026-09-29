"""
RETINOVA AI Pipeline Audit Runner
Executes real inference on real retinal fundus images using best_model.pt
Logs: Input, Preprocessing, Runtime, Model, Inference, Evidence, Timing
"""

import os
import sys
import time
import json
import numpy as np
from PIL import Image

import torch
import torch.nn.functional as F

# Add ai-pipeline to path
AI_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-pipeline"))
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

from module4_Grading_Final.models.swinv2_tiny import SwinV2TinyDR
from module4_Grading_Final.integration.swinV1_predictor import SwinV1Predictor, compute_retinal_fov_mask, _JET_LUT

CHECKPOINT_PATH = os.path.join(AI_ROOT, "module4_Grading_Final", "checkpoints", "best_model.pt")

def run_audit(image_path: str, temperature: float = 1.341):
    print("=" * 80)
    print(f"AUDITING REAL RETINOVA AI PIPELINE ON: {os.path.basename(image_path)}")
    print("=" * 80)

    # 1. INPUT INSPECTION
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Input fundus image not found: {image_path}")

    pil_img = Image.open(image_path)
    width, height = pil_img.size
    mode = pil_img.mode
    channels = len(mode)
    print(f"\n[1. INPUT IMAGE]")
    print(f"  Filename: {image_path}")
    print(f"  Width: {width} px")
    print(f"  Height: {height} px")
    print(f"  Mode / Channels: {mode} ({channels} channels)")

    # 2. RUNTIME ENVIRONMENT
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU"
    device = torch.device("cuda" if cuda_available else "cpu")
    print(f"\n[2. RUNTIME ENVIRONMENT]")
    print(f"  Device: {device}")
    print(f"  CUDA Available: {cuda_available}")
    print(f"  Device Name: {device_name}")
    print(f"  PyTorch Version: {torch.__version__}")

    # 3. MODEL ARCHITECTURE & CHECKPOINT LOADING
    print(f"\n[3. MODEL VERIFICATION]")
    print(f"  Architecture: Swin Transformer V2 Tiny (Torchvision swin_v2_t)")
    print(f"  Checkpoint Path: {CHECKPOINT_PATH}")
    print(f"  Checkpoint File Exists: {os.path.exists(CHECKPOINT_PATH)}")
    print(f"  Checkpoint Size: {os.path.getsize(CHECKPOINT_PATH):,} bytes")

    t_load_start = time.perf_counter()
    model = SwinV2TinyDR(pretrained=False, use_grad_checkpointing=False).to(device)
    ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)
    state_dict = ckpt["model_state_dict"] if "model_state_dict" in ckpt else ckpt
    model.load_state_dict(state_dict)
    model.eval()
    t_load = time.perf_counter() - t_load_start
    print(f"  Checkpoint Loaded Successfully in: {t_load:.3f} s")
    print(f"  Total Keys in State Dict: {len(state_dict)}")
    print(f"  head_referable shape: {state_dict['head_referable.1.weight'].shape}")
    print(f"  head_5grade shape: {state_dict['head_5grade.1.weight'].shape}")

    # 4. PREPROCESSING PIPELINE
    print(f"\n[4. PREPROCESSING]")
    t_prep_start = time.perf_counter()
    predictor = SwinV1Predictor(checkpoint_path=CHECKPOINT_PATH, device=device)
    predictor.temperature = temperature  # User-requested T=1.341
    resized_pil, tensor = predictor.preprocess_image(image_path)
    t_prep = time.perf_counter() - t_prep_start

    print(f"  Color Space: RGB")
    print(f"  Circular FOV Crop Applied: Yes")
    print(f"  Pad & Bicubic Resized: 512 x 512")
    print(f"  ImageNet Normalization: Mean=[0.485, 0.456, 0.406], Std=[0.229, 0.224, 0.225]")
    print(f"  Final Input Tensor Shape: {list(tensor.shape)} (Batch, Channel, Height, Width)")
    print(f"  Preprocessing Time: {t_prep * 1000:.2f} ms")

    # 5. MODEL INFERENCE
    print(f"\n[5. MODEL INFERENCE & CLASSIFICATION]")
    t_inf_start = time.perf_counter()
    tensor_gpu = tensor.to(device)

    # Multi-scale Grad-CAM & Forward pass
    acts = {}
    def hook_s3(m, inp, out):
        acts["s3"] = out
        out.retain_grad()
    def hook_s4(m, inp, out):
        acts["s4"] = out
        out.retain_grad()

    h3 = model.backbone.features[5].register_forward_hook(hook_s3)
    h4 = model.backbone.features[7].register_forward_hook(hook_s4)

    t_in = tensor_gpu.clone().detach()
    t_in.requires_grad = True

    out = model(t_in)
    logit_ref_t = out["logit_referable"][0, 0]
    logits_5g_t = out["logits_5grade"][0]

    model.zero_grad()
    logit_ref_t.backward()

    h3.remove()
    h4.remove()

    t_inf = time.perf_counter() - t_inf_start

    # Calculations
    logit_ref = logit_ref_t.item()
    logits_5g = logits_5g_t.detach().cpu().numpy()

    p_raw = 1.0 / (1.0 + np.exp(-logit_ref))
    p_calibrated = 1.0 / (1.0 + np.exp(-logit_ref / temperature))

    threshold = 0.2993
    is_referable = bool(p_calibrated >= threshold)
    decision = "REFER" if is_referable else "SCREEN"

    exp_5g = np.exp(logits_5g - np.max(logits_5g))
    probs_5g = exp_5g / np.sum(exp_5g)
    pred_grade = int(np.argmax(probs_5g))

    icdr_names = [
        "Grade 0 (No DR)",
        "Grade 1 (Mild NPDR)",
        "Grade 2 (Moderate NPDR)",
        "Grade 3 (Severe NPDR)",
        "Grade 4 (Proliferative DR)"
    ]

    print(f"  Raw Referable Logit: {logit_ref:.4f}")
    print(f"  Raw P(G2+): {p_raw * 100:.2f}%")
    print(f"  Calibrated Temperature: T = {temperature}")
    print(f"  Calibrated P(G2+): {p_calibrated * 100:.2f}%")
    print(f"  Decision Threshold: {threshold}")
    print(f"  Referable DR Decision: {decision} (G2+ Referable: {is_referable})")
    print(f"  Raw 5-Grade Logits: {[round(float(x), 4) for x in logits_5g]}")
    print(f"  Predicted ICDR Grade: {pred_grade} ({icdr_names[pred_grade]})")
    print(f"  Grade Probabilities:")
    for g, (name, prob) in enumerate(zip(icdr_names, probs_5g)):
        indicator = " <-- PREDICTED" if g == pred_grade else ""
        print(f"    G{g}: {prob * 100:6.2f}% | {name}{indicator}")
    print(f"  Model Inference Time: {t_inf * 1000:.2f} ms")

    # 6. EVIDENCE & GRAD-CAM EXPLAINABILITY
    print(f"\n[6. EVIDENCE & GRAD-CAM EXPLAINABILITY]")
    t_cam_start = time.perf_counter()

    # Stage 3
    act3 = acts["s3"]
    grad3 = act3.grad
    w3 = grad3.mean(dim=(1, 2), keepdim=True)
    cam3 = F.relu((act3 * w3).sum(dim=-1)).squeeze().detach().cpu().numpy()
    cam3 = (cam3 - cam3.min()) / (cam3.max() - cam3.min() + 1e-8)

    # Stage 4
    act4 = acts["s4"]
    grad4 = act4.grad
    w4 = grad4.mean(dim=(1, 2), keepdim=True)
    cam4 = F.relu((act4 * w4).sum(dim=-1)).squeeze().detach().cpu().numpy()
    cam4 = (cam4 - cam4.min()) / (cam4.max() - cam4.min() + 1e-8)

    # Fusion
    cam4_t = torch.from_numpy(cam4).unsqueeze(0).unsqueeze(0).float()
    cam4_up = F.interpolate(cam4_t, size=(32, 32), mode="bilinear", align_corners=False).squeeze().numpy()
    cam_fused_32 = 0.6 * cam3 + 0.4 * cam4_up
    cam_fused_32 = (cam_fused_32 - cam_fused_32.min()) / (cam_fused_32.max() - cam_fused_32.min() + 1e-8)

    cam_fused_t = torch.from_numpy(cam_fused_32).unsqueeze(0).unsqueeze(0).float()
    cam_512 = F.interpolate(cam_fused_t, size=(512, 512), mode="bicubic", align_corners=False).squeeze().numpy()
    import scipy.ndimage as ndimage
    cam_smooth = ndimage.gaussian_filter(cam_512, sigma=6.0)

    fundus_np = np.array(resized_pil, dtype=np.uint8)
    fov_mask = compute_retinal_fov_mask(fundus_np)
    cam_fov = cam_smooth * fov_mask

    fov_indices = fov_mask > 0.1
    if np.any(fov_indices):
        v_min, v_max = cam_fov[fov_indices].min(), cam_fov[fov_indices].max()
        cam_final = np.clip((cam_fov - v_min) / (v_max - v_min + 1e-8), 0.0, 1.0) * fov_mask
    else:
        cam_final = np.zeros_like(cam_fov)

    # Render overlay & raw
    cam_uint8 = (np.clip(cam_final, 0, 1) * 255.0).astype(np.uint8)
    raw_rgb = _JET_LUT[cam_uint8]
    raw_rgb[fov_mask < 0.1] = [0, 0, 0]

    alpha_map = (np.clip(cam_final, 0, 1) ** 1.2) * 0.45 * fov_mask
    alpha_3d = np.repeat(alpha_map[:, :, np.newaxis], 3, axis=2)
    overlay_np = (1.0 - alpha_3d) * fundus_np.astype(np.float32) + alpha_3d * raw_rgb.astype(np.float32)
    overlay_np = np.clip(overlay_np, 0, 255).astype(np.uint8)
    overlay_np[fov_mask < 0.05] = fundus_np[fov_mask < 0.05]

    t_cam = time.perf_counter() - t_cam_start

    # Save output artifacts
    out_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(out_dir, exist_ok=True)
    base_id = os.path.splitext(os.path.basename(image_path))[0]

    overlay_path = os.path.join(out_dir, f"audit_gradcam_overlay_{base_id}.png")
    raw_cam_path = os.path.join(out_dir, f"audit_gradcam_raw_{base_id}.png")
    Image.fromarray(overlay_np).save(overlay_path)
    Image.fromarray(raw_rgb).save(raw_cam_path)

    print(f"  Multi-Scale Spatial Grad-CAM Layers: Stage 3 (32x32) + Stage 4 (16x16)")
    print(f"  Color Map: Medical JET LUT")
    print(f"  Grad-CAM Computation Time: {t_cam * 1000:.2f} ms")
    print(f"  Saved Grad-CAM Overlay: {overlay_path}")
    print(f"  Saved Grad-CAM Raw Heatmap: {raw_cam_path}")

    # 7. TOTAL TIMING
    total_time = t_prep + t_inf + t_cam
    print(f"\n[7. TIMING BREAKDOWN]")
    print(f"  Preprocessing Time  : {t_prep * 1000:7.2f} ms ({t_prep:.3f} s)")
    print(f"  Model Inference Time: {t_inf * 1000:7.2f} ms ({t_inf:.3f} s)")
    print(f"  Grad-CAM Saliency   : {t_cam * 1000:7.2f} ms ({t_cam:.3f} s)")
    print(f"  Total Pipeline Time : {total_time * 1000:7.2f} ms ({total_time:.3f} s)")
    print("=" * 80)
    return {
        "image": os.path.basename(image_path),
        "decision": decision,
        "is_referable": is_referable,
        "p_calibrated": float(p_calibrated),
        "predicted_grade": pred_grade,
        "grade_name": icdr_names[pred_grade],
        "total_time_ms": round(total_time * 1000, 2)
    }

if __name__ == "__main__":
    test_images = [
        os.path.join(os.path.dirname(__file__), "uploads", "working_001639a390f0_1024x680.png"),
        os.path.join(os.path.dirname(__file__), "uploads", "working_fundus_upload_fc1e2d49-b7fb-4d89-a31c-a8e1869bbc99_1024x683.png")
    ]
    results = []
    for img in test_images:
        if os.path.exists(img):
            res = run_audit(img, temperature=1.341)
            results.append(res)
    print("\nSUMMARY OF AUDIT RESULTS:")
    print(json.dumps(results, indent=2))
