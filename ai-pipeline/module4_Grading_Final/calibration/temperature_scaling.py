import os
import json
import numpy as np
import scipy.optimize as opt

def compute_ece(probs, labels, n_bins=10):
    """
    Computes Expected Calibration Error (ECE).
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    total = len(probs)
    
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        in_bin = (probs >= bin_lower) & (probs < bin_upper) if i < n_bins - 1 else (probs >= bin_lower) & (probs <= bin_upper)
        prop_in_bin = np.mean(in_bin)
        
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(labels[in_bin])
            avg_confidence_in_bin = np.mean(probs[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
            
    return float(ece)

def fit_temperature_scaling(logits, labels):
    """
    Fits optimal temperature T > 0 on the validation calibration subset
    to minimize Binary Cross Entropy (NLL).
    """
    logits = np.array(logits, dtype=np.float64).flatten()
    labels = np.array(labels, dtype=np.float64).flatten()
    
    def bce_loss(T):
        # Prevent division by zero or negative temperatures
        T = max(1e-4, T[0])
        scaled_logits = logits / T
        # Numerically stable sigmoid log-loss
        probs = 1.0 / (1.0 + np.exp(-scaled_logits))
        probs = np.clip(probs, 1e-7, 1.0 - 1e-7)
        loss = -np.mean(labels * np.log(probs) + (1.0 - labels) * np.log(1.0 - probs))
        return loss

    res = opt.minimize(bce_loss, x0=[1.0], bounds=[(0.01, 10.0)], method='L-BFGS-B')
    best_T = float(res.x[0])
    
    # Pre vs Post calibration ECE
    raw_probs = 1.0 / (1.0 + np.exp(-logits))
    calib_probs = 1.0 / (1.0 + np.exp(-logits / best_T))
    
    ece_before = compute_ece(raw_probs, labels)
    ece_after = compute_ece(calib_probs, labels)
    
    return {
        'temperature': best_T,
        'ece_before': ece_before,
        'ece_after': ece_after,
        'bce_loss_before': float(bce_loss([1.0])),
        'bce_loss_after': float(res.fun),
        'status': 'SUCCESS' if res.success else 'FAILED'
    }

def save_calibration_model(calib_result, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(calib_result, f, indent=2)
    print(f"Saved calibration parameters to {out_path}")
