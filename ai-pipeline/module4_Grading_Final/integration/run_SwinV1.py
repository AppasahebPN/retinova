"""
CLI runner for Swin V2 Tiny V1 Prediction.
Can be called from shell, Python, or MATLAB system() command.
"""

import os
import sys
import json
import argparse
import scipy.io as sio
import numpy as np

ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
if not os.path.exists(ROOT_DIR):
    ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from module4_Grading_Final.integration.swinV1_predictor import get_predictor

def main():
    parser = argparse.ArgumentParser(description="Run Swin V2 Tiny V1 DR Screening Inference")
    parser.add_argument("--image", type=str, required=True, help="Path to input retinal fundus image")
    parser.add_argument("--output_json", type=str, default=None, help="Optional path to write result JSON")
    parser.add_argument("--output_mat", type=str, default=None, help="Optional path to write result MAT file")
    parser.add_argument("--cam", action="store_true", help="Whether to generate Grad-CAM attribution heatmap")
    
    args = parser.parse_args()
    
    predictor = get_predictor()
    res = predictor.predict(args.image, return_cam=args.cam)
    
    # Print JSON output to stdout for CLI capture
    print("--- RESULT_START ---")
    print(json.dumps(res))
    print("--- RESULT_END ---")
    
    if args.output_json:
        with open(args.output_json, 'w') as f:
            json.dump(res, f, indent=2)
            
    if args.output_mat:
        mat_dict = {
            'model_name': res['model_name'],
            'input_resolution': np.array(res['input_resolution']),
            'g2plus_probability_raw': res['g2plus_probability_raw'],
            'temperature': res['temperature'],
            'g2plus_probability_calibrated': res['g2plus_probability_calibrated'],
            'threshold': res['threshold'],
            'referable': 1 if res['referable'] else 0,
            'decision': res['decision'],
            'grade': res['grade'],
            'grade_probabilities': np.array(res['grade_probabilities']),
            'inference_time': res['inference_time']
        }
        if 'gradcam_heatmap' in res:
            mat_dict['gradcam_heatmap'] = np.array(res['gradcam_heatmap'])
        if 'gradcam_overlay' in res:
            mat_dict['gradcam_overlay'] = np.array(res['gradcam_overlay'])
        if 'gradcam_raw' in res:
            mat_dict['gradcam_raw'] = np.array(res['gradcam_raw'])
        sio.savemat(args.output_mat, mat_dict)

if __name__ == '__main__':
    main()
