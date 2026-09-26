"""
Swin V2 Tiny V1 Frozen Model Predictor for NetraAI Production Integration.
SIH26038: Explainable AI for Diabetic Retinopathy Screening in Rural India.

LOCKED PRODUCTION MODEL:
- Architecture: Swin V2 Tiny (Torchvision swin_v2_t)
- Input: Exactly 512x512 RGB
- Checkpoint: module4_Grading_Final/checkpoints/best_model.pt
- Calibration Temperature: T = 1.4555
- Decision Threshold: tau = 0.2993
- Decision Rule: P(G2+) >= 0.2993 -> REFER, else SCREEN
"""

import os
import sys
import time
import json
import numpy as np
from PIL import Image

import torch
import torch.nn.functional as F

import scipy.ndimage as ndimage

ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
if not os.path.exists(ROOT_DIR):
    ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from module4_Grading_Final.models.swinv2_tiny import SwinV2TinyDR
from module4_Grading_Final.preprocessing.preprocess_512 import crop_retina_fov_pil, pad_and_resize_pil

DEFAULT_CHECKPOINT = os.path.join(ROOT_DIR, "module4_Grading_Final", "checkpoints", "best_model.pt")
TEMPERATURE = 1.4555
THRESHOLD = 0.2993
TARGET_SIZE = 512
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def get_medical_jet_lut():
    lut = np.zeros((256, 3), dtype=np.uint8)
    for i in range(256):
        val = i / 255.0
        if val < 0.25:
            # Dark Blue to Cyan
            lut[i] = [0, int(val * 4 * 255), 255]
        elif val < 0.5:
            # Cyan to Green
            lut[i] = [0, 255, int((1 - (val - 0.25) * 4) * 255)]
        elif val < 0.75:
            # Green to Yellow
            lut[i] = [int((val - 0.5) * 4 * 255), 255, 0]
        else:
            # Yellow to Red
            lut[i] = [255, int((1 - (val - 0.75) * 4) * 255), 0]
    return lut

_JET_LUT = get_medical_jet_lut()

def compute_retinal_fov_mask(img_np):
    gray = (0.299 * img_np[:, :, 0] + 0.587 * img_np[:, :, 1] + 0.114 * img_np[:, :, 2]).astype(np.float32)
    mask = (gray > 12.0).astype(np.float32)
    mask = ndimage.binary_fill_holes(mask).astype(np.float32)
    mask = ndimage.binary_erosion(mask, iterations=3).astype(np.float32)
    mask_smooth = ndimage.gaussian_filter(mask, sigma=2.0)
    return mask_smooth

class SwinV1Predictor:
    """
    Singleton / Cached Predictor for Swin V2 Tiny V1.
    Loads PyTorch weights once and provides thread-safe, fast inference.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(SwinV1Predictor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, checkpoint_path=None, device=None):
        if self._initialized:
            return
            
        self.checkpoint_path = checkpoint_path or DEFAULT_CHECKPOINT
        if not os.path.isabs(self.checkpoint_path):
            self.checkpoint_path = os.path.join(ROOT_DIR, self.checkpoint_path)
            
        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(f"Checkpoint not found at {self.checkpoint_path}")
            
        self.device = device or (torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
        self.model = SwinV2TinyDR(pretrained=False, use_grad_checkpointing=False).to(self.device)
        
        ckpt = torch.load(self.checkpoint_path, map_location='cpu', weights_only=False)
        if 'model_state_dict' in ckpt:
            self.model.load_state_dict(ckpt['model_state_dict'])
        else:
            self.model.load_state_dict(ckpt)
            
        self.model.eval()
        self.temperature = TEMPERATURE
        self.threshold = THRESHOLD
        self.input_resolution = [TARGET_SIZE, TARGET_SIZE, 3]
        self.model_name = "Swin V2 Tiny (Torchvision swin_v2_t)"
        self._initialized = True

    def preprocess_image(self, image_input):
        """
        Applies locked clinical preprocessing:
        1. Accept file path, PIL Image, or numpy array
        2. Circular FOV crop
        3. Aspect-preserving square reflection/black pad
        4. Bicubic resize to 512x512
        5. Normalization with ImageNet mean/std
        """
        if isinstance(image_input, str):
            if not os.path.isabs(image_input):
                image_input = os.path.join(ROOT_DIR, image_input)
            img_pil = Image.open(image_input).convert('RGB')
        elif isinstance(image_input, Image.Image):
            img_pil = image_input.convert('RGB')
        elif isinstance(image_input, np.ndarray):
            arr = image_input.copy()
            if arr.dtype == np.float32 or arr.dtype == np.float64:
                if arr.max() <= 1.0:
                    arr = (arr * 255.0).astype(np.uint8)
                else:
                    arr = arr.astype(np.uint8)
            elif arr.dtype != np.uint8:
                arr = arr.astype(np.uint8)
            if len(arr.shape) == 2:
                img_pil = Image.fromarray(arr).convert('RGB')
            elif len(arr.shape) == 3 and arr.shape[2] == 1:
                img_pil = Image.fromarray(arr[:, :, 0]).convert('RGB')
            else:
                img_pil = Image.fromarray(arr[:, :, :3]).convert('RGB')
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        cropped = crop_retina_fov_pil(img_pil)
        resized_pil = pad_and_resize_pil(cropped, target_size=TARGET_SIZE)
        
        arr = np.array(resized_pil, dtype=np.float32) / 255.0
        norm_arr = (arr - MEAN) / STD
        tensor = torch.from_numpy(np.transpose(norm_arr, (2, 0, 1))).unsqueeze(0).float()
        return resized_pil, tensor

    def predict(self, image_input, return_cam=False):
        """
        Executes single frozen-model inference.
        Returns dictionary matching exact required MATLAB result structure.
        """
        t0 = time.time()
        resized_pil, tensor = self.preprocess_image(image_input)
        tensor = tensor.to(self.device)
        
        gradcam_map = None
        gradcam_overlay = None
        gradcam_raw = None
        feature_layer_name = "backbone.features"
        
        if return_cam:
            # Multi-scale Grad-CAM from Stage 3 (features[5], 32x32) & Stage 4 (features[7], 16x16)
            acts = {}
            def hook_s3(m, inp, out):
                acts['s3'] = out
                out.retain_grad()
            def hook_s4(m, inp, out):
                acts['s4'] = out
                out.retain_grad()
                
            h3 = self.model.backbone.features[5].register_forward_hook(hook_s3)
            h4 = self.model.backbone.features[7].register_forward_hook(hook_s4)
            
            t_in = tensor.clone().detach()
            t_in.requires_grad = True
            
            out = self.model(t_in)
            logit_ref_t = out['logit_referable'][0, 0]
            
            self.model.zero_grad()
            logit_ref_t.backward()
            
            h3.remove()
            h4.remove()
            
            # 1. Stage 3 (32x32)
            act3 = acts['s3']
            grad3 = act3.grad
            w3 = grad3.mean(dim=(1, 2), keepdim=True)
            cam3 = F.relu((act3 * w3).sum(dim=-1)).squeeze().detach().cpu().numpy()
            if cam3.max() > cam3.min():
                cam3 = (cam3 - cam3.min()) / (cam3.max() - cam3.min())
            else:
                cam3 = np.zeros_like(cam3)

            # 2. Stage 4 (16x16)
            act4 = acts['s4']
            grad4 = act4.grad
            w4 = grad4.mean(dim=(1, 2), keepdim=True)
            cam4 = F.relu((act4 * w4).sum(dim=-1)).squeeze().detach().cpu().numpy()
            if cam4.max() > cam4.min():
                cam4 = (cam4 - cam4.min()) / (cam4.max() - cam4.min())
            else:
                cam4 = np.zeros_like(cam4)

            # Bilinear upsample Stage 4 to 32x32 to fuse with Stage 3
            cam4_t = torch.from_numpy(cam4).unsqueeze(0).unsqueeze(0).float()
            cam4_up = F.interpolate(cam4_t, size=(32, 32), mode='bilinear', align_corners=False).squeeze().numpy()

            # Fused multi-scale map: fine spatial + global semantics
            cam_fused_32 = 0.6 * cam3 + 0.4 * cam4_up
            cam_fused_32 = (cam_fused_32 - cam_fused_32.min()) / (cam_fused_32.max() - cam_fused_32.min() + 1e-8)

            # Smooth bicubic upsampling to 512x512 with Gaussian smoothing
            cam_fused_t = torch.from_numpy(cam_fused_32).unsqueeze(0).unsqueeze(0).float()
            cam_512 = F.interpolate(cam_fused_t, size=(512, 512), mode='bicubic', align_corners=False).squeeze().numpy()
            cam_smooth = ndimage.gaussian_filter(cam_512, sigma=6.0)
            cam_smooth = np.clip(cam_smooth, 0, None)

            # Retinal FOV masking
            fundus_np = np.array(resized_pil, dtype=np.uint8)
            fov_mask = compute_retinal_fov_mask(fundus_np)
            cam_fov = cam_smooth * fov_mask

            fov_indices = fov_mask > 0.1
            if np.any(fov_indices):
                v_min = cam_fov[fov_indices].min()
                v_max = cam_fov[fov_indices].max()
                if v_max > v_min:
                    cam_final = np.clip((cam_fov - v_min) / (v_max - v_min), 0.0, 1.0) * fov_mask
                else:
                    cam_final = np.zeros_like(cam_fov)
            else:
                cam_final = np.zeros_like(cam_fov)

            gradcam_map = cam_final

            # Render Raw Heatmap (RGB)
            cam_uint8 = (np.clip(cam_final, 0, 1) * 255.0).astype(np.uint8)
            raw_rgb = _JET_LUT[cam_uint8]
            raw_rgb[fov_mask < 0.1] = [0, 0, 0]
            gradcam_raw = raw_rgb

            # Render Overlay (Original fundus + semi-transparent heatmap)
            alpha_map = (np.clip(cam_final, 0, 1) ** 1.2) * 0.45 * fov_mask
            alpha_3d = np.repeat(alpha_map[:, :, np.newaxis], 3, axis=2)
            overlay_np = (1.0 - alpha_3d) * fundus_np.astype(np.float32) + alpha_3d * raw_rgb.astype(np.float32)
            overlay_np = np.clip(overlay_np, 0, 255).astype(np.uint8)
            overlay_np[fov_mask < 0.05] = fundus_np[fov_mask < 0.05]
            gradcam_overlay = overlay_np

            feature_layer_name = "backbone.features[5]+[7] (Multi-Scale Spatial Grad-CAM)"
            logit_ref = logit_ref_t.item()
            logits_5g = out['logits_5grade'][0].detach().cpu().numpy()
        else:
            with torch.no_grad():
                if self.device.type == 'cuda':
                    with torch.amp.autocast('cuda', dtype=torch.float16):
                        out = self.model(tensor)
                else:
                    out = self.model(tensor)
                    
            logit_ref = out['logit_referable'].cpu().item()
            logits_5g = out['logits_5grade'].cpu().numpy().flatten()
            
        inference_time = time.time() - t0
        
        # 1. Raw G2+ Probability
        p_raw = 1.0 / (1.0 + np.exp(-logit_ref))
        
        # 2. Calibrated G2+ Probability (Temperature Scaling)
        p_calibrated = 1.0 / (1.0 + np.exp(-logit_ref / self.temperature))
        
        # 3. Primary Screening Decision (Threshold = 0.2993)
        is_referable = bool(p_calibrated >= self.threshold)
        decision = "REFER" if is_referable else "SCREEN"
        
        # 4. 5-Grade Probabilities (Softmax)
        exp_5g = np.exp(logits_5g - np.max(logits_5g))
        probs_5g = exp_5g / np.sum(exp_5g)
        pred_grade = int(np.argmax(probs_5g))
        grade_probs_list = [float(p) for p in probs_5g]
        
        result = {
            "model_name": self.model_name,
            "input_resolution": self.input_resolution,
            "g2plus_probability_raw": float(p_raw),
            "temperature": float(self.temperature),
            "g2plus_probability_calibrated": float(p_calibrated),
            "threshold": float(self.threshold),
            "referable": is_referable,
            "decision": decision,
            "grade": pred_grade,
            "grade_probabilities": grade_probs_list,
            "inference_time": float(inference_time),
            "attribution_available": (gradcam_map is not None),
            "feature_layer": feature_layer_name
        }
        
        if gradcam_map is not None:
            result["gradcam_heatmap"] = gradcam_map.tolist()
        if gradcam_overlay is not None:
            result["gradcam_overlay"] = gradcam_overlay.tolist()
        if gradcam_raw is not None:
            result["gradcam_raw"] = gradcam_raw.tolist()
            
        return result

# Global convenience function
_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        _predictor = SwinV1Predictor()
    return _predictor

def predict_image(image_input, return_cam=False):
    """
    Direct function interface for MATLAB py.importlib calls.
    Returns python dict easily converted to MATLAB struct.
    """
    pred = get_predictor()
    return pred.predict(image_input, return_cam=return_cam)
