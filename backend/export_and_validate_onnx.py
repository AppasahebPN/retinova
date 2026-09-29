"""
Export Swin V2 Tiny to ONNX and perform multi-model validation.
Compares:
A. Original PyTorch best_model.pt
B. ONNX FP32 (swinv2_tiny_dr.onnx)
C. ONNX INT8 (swinv2_tiny_dr_int8.onnx)
"""

import os
import sys
import time
import json
import numpy as np
from PIL import Image

import torch
import torch.nn.functional as F

import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

# Project paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "ai-pipeline"))
if AI_ROOT not in sys.path:
    sys.path.insert(0, AI_ROOT)

from module4_Grading_Final.models.swinv2_tiny import SwinV2TinyDR
from module4_Grading_Final.integration.swinV1_predictor import SwinV1Predictor

CHECKPOINT_PATH = os.path.join(AI_ROOT, "module4_Grading_Final", "checkpoints", "best_model.pt")
ONNX_FP32_PATH = os.path.join(BASE_DIR, "swinv2_tiny_dr.onnx")
ONNX_INT8_PATH = os.path.join(BASE_DIR, "swinv2_tiny_dr_int8.onnx")

def export_models():
    print("=" * 80)
    print("PHASE 1: EXPORTING SWIN V2 TINY TO ONNX")
    print("=" * 80)

    # 1. Load PyTorch model
    print(f"Loading checkpoint: {CHECKPOINT_PATH}")
    model = SwinV2TinyDR(pretrained=False, use_grad_checkpointing=False)
    ckpt = torch.load(CHECKPOINT_PATH, map_location='cpu', weights_only=False)
    state_dict = ckpt['model_state_dict'] if 'model_state_dict' in ckpt else ckpt
    model.load_state_dict(state_dict)
    model.eval()

    # 2. Export FP32 ONNX
    dummy_input = torch.randn(1, 3, 512, 512, dtype=torch.float32)
    print(f"Exporting FP32 model to: {ONNX_FP32_PATH}")
    torch.onnx.export(
        model,
        dummy_input,
        ONNX_FP32_PATH,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['features', 'logit_referable', 'logits_5grade'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'features': {0: 'batch_size'},
            'logit_referable': {0: 'batch_size'},
            'logits_5grade': {0: 'batch_size'}
        }
    )

    fp32_size = os.path.getsize(ONNX_FP32_PATH)
    print(f"FP32 Export Complete! File size: {fp32_size:,} bytes (~ {fp32_size / (1024*1024):.1f} MB)")

    # 3. Verify ONNX Graph
    onnx_model = onnx.load(ONNX_FP32_PATH)
    onnx.checker.check_model(onnx_model)
    print("ONNX checker passed successfully!")

    # 4. Quantize to INT8
    print(f"\nQuantizing model to INT8: {ONNX_INT8_PATH}")
    quantize_dynamic(
        model_input=ONNX_FP32_PATH,
        model_output=ONNX_INT8_PATH,
        weight_type=QuantType.QUInt8
    )
    int8_size = os.path.getsize(ONNX_INT8_PATH)
    print(f"INT8 Quantization Complete! File size: {int8_size:,} bytes (~ {int8_size / (1024*1024):.1f} MB)")
    print(f"Size reduction: {((fp32_size - int8_size) / fp32_size) * 100:.1f}%")

def evaluate_models_on_images():
    print("\n" + "=" * 80)
    print("PHASE 2: TRIPLE MODEL COMPARISON (PyTorch FP32 vs ONNX FP32 vs ONNX INT8)")
    print("=" * 80)

    # Load PyTorch model
    pt_model = SwinV2TinyDR(pretrained=False, use_grad_checkpointing=False)
    ckpt = torch.load(CHECKPOINT_PATH, map_location='cpu', weights_only=False)
    pt_model.load_state_dict(ckpt['model_state_dict'] if 'model_state_dict' in ckpt else ckpt)
    pt_model.eval()

    # Load ONNX sessions
    sess_fp32 = ort.InferenceSession(ONNX_FP32_PATH, providers=['CPUExecutionProvider'])
    sess_int8 = ort.InferenceSession(ONNX_INT8_PATH, providers=['CPUExecutionProvider'])

    predictor = SwinV1Predictor(checkpoint_path=CHECKPOINT_PATH, device=torch.device('cpu'))
    temp = 1.341
    threshold = 0.2993

    test_images = [
        ("working_001639a390f0_1024x680.png", "G4 (Proliferative DR)"),
        ("working_fundus_upload_a8903042-0378-41a3-be1c-cb4c7e598aca_1024x683.png", "G3 (Severe NPDR)"),
        ("working_panel_G0_Normal_1024x677.png", "G0 (Normal / No DR)")
    ]

    all_comparisons = []

    for img_name, expected_note in test_images:
        img_path = os.path.join(BASE_DIR, "uploads", img_name)
        if not os.path.exists(img_path):
            print(f"Skipping {img_name}: file not found.")
            continue

        print(f"\n--- Testing on: {img_name} ({expected_note}) ---")
        resized_pil, tensor = predictor.preprocess_image(img_path)
        input_np = tensor.numpy() # shape (1, 3, 512, 512)

        # 1. PyTorch inference
        t0 = time.perf_counter()
        with torch.no_grad():
            out_pt = pt_model(tensor)
        t_pt = time.perf_counter() - t0
        pt_ref_logit = out_pt['logit_referable'][0, 0].item()
        pt_5g_logits = out_pt['logits_5grade'][0].numpy()
        pt_p_cal = float(1.0 / (1.0 + np.exp(-pt_ref_logit / temp)))
        pt_decision = "REFER" if pt_p_cal >= threshold else "SCREEN"
        pt_exp = np.exp(pt_5g_logits - np.max(pt_5g_logits))
        pt_probs = pt_exp / np.sum(pt_exp)
        pt_grade = int(np.argmax(pt_probs))

        # 2. ONNX FP32 inference
        t0 = time.perf_counter()
        out_onnx = sess_fp32.run(None, {'input': input_np})
        t_onnx = time.perf_counter() - t0
        onnx_ref_logit = float(out_onnx[1][0, 0])
        onnx_5g_logits = out_onnx[2][0]
        onnx_p_cal = float(1.0 / (1.0 + np.exp(-onnx_ref_logit / temp)))
        onnx_decision = "REFER" if onnx_p_cal >= threshold else "SCREEN"
        onnx_exp = np.exp(onnx_5g_logits - np.max(onnx_5g_logits))
        onnx_probs = onnx_exp / np.sum(onnx_exp)
        onnx_grade = int(np.argmax(onnx_probs))

        # 3. ONNX INT8 inference
        t0 = time.perf_counter()
        out_int8 = sess_int8.run(None, {'input': input_np})
        t_int8 = time.perf_counter() - t0
        int8_ref_logit = float(out_int8[1][0, 0])
        int8_5g_logits = out_int8[2][0]
        int8_p_cal = float(1.0 / (1.0 + np.exp(-int8_ref_logit / temp)))
        int8_decision = "REFER" if int8_p_cal >= threshold else "SCREEN"
        int8_exp = np.exp(int8_5g_logits - np.max(int8_5g_logits))
        int8_probs = int8_exp / np.sum(int8_exp)
        int8_grade = int(np.argmax(int8_probs))

        # Discrepancy metrics
        diff_ref_fp32 = abs(pt_ref_logit - onnx_ref_logit)
        diff_5g_fp32 = np.max(np.abs(pt_5g_logits - onnx_5g_logits))
        diff_ref_int8 = abs(pt_ref_logit - int8_ref_logit)
        diff_5g_int8 = np.max(np.abs(pt_5g_logits - int8_5g_logits))

        print(f"  PyTorch FP32: Logit_ref={pt_ref_logit:.4f}, P(G2+)={pt_p_cal*100:.2f}%, Dec={pt_decision}, Grade={pt_grade} ({pt_probs[pt_grade]*100:.1f}%), Latency={t_pt*1000:.1f}ms")
        print(f"  ONNX FP32   : Logit_ref={onnx_ref_logit:.4f}, P(G2+)={onnx_p_cal*100:.2f}%, Dec={onnx_decision}, Grade={onnx_grade} ({onnx_probs[onnx_grade]*100:.1f}%), Latency={t_onnx*1000:.1f}ms")
        print(f"  ONNX INT8   : Logit_ref={int8_ref_logit:.4f}, P(G2+)={int8_p_cal*100:.2f}%, Dec={int8_decision}, Grade={int8_grade} ({int8_probs[int8_grade]*100:.1f}%), Latency={t_int8*1000:.1f}ms")
        print(f"  Max Diff FP32: Ref={diff_ref_fp32:.6f}, 5G={diff_5g_fp32:.6f}")
        print(f"  Max Diff INT8: Ref={diff_ref_int8:.6f}, 5G={diff_5g_int8:.6f}")

        row = {
            "image": img_name,
            "expected": expected_note,
            "pytorch": {
                "ref_logit": round(pt_ref_logit, 4),
                "p_cal": round(pt_p_cal, 4),
                "decision": pt_decision,
                "grade": pt_grade,
                "confidence": round(float(pt_probs[pt_grade]), 4),
                "latency_ms": round(t_pt * 1000, 1)
            },
            "onnx_fp32": {
                "ref_logit": round(onnx_ref_logit, 4),
                "p_cal": round(onnx_p_cal, 4),
                "decision": onnx_decision,
                "grade": onnx_grade,
                "confidence": round(float(onnx_probs[onnx_grade]), 4),
                "latency_ms": round(t_onnx * 1000, 1),
                "max_diff_logits": round(float(diff_5g_fp32), 6)
            },
            "onnx_int8": {
                "ref_logit": round(int8_ref_logit, 4),
                "p_cal": round(int8_p_cal, 4),
                "decision": int8_decision,
                "grade": int8_grade,
                "confidence": round(float(int8_probs[int8_grade]), 4),
                "latency_ms": round(t_int8 * 1000, 1),
                "max_diff_logits": round(float(diff_5g_int8), 6)
            }
        }
        all_comparisons.append(row)

    comp_report_path = os.path.join(BASE_DIR, "model_comparison_report.json")
    with open(comp_report_path, "w") as f:
        json.dump(all_comparisons, f, indent=2)
    print(f"\nSaved detailed comparison report to: {comp_report_path}")

if __name__ == "__main__":
    export_models()
    evaluate_models_on_images()
