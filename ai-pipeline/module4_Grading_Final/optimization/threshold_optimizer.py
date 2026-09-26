import os
import json
import numpy as np

def optimize_clinical_threshold(calibrated_probs, true_labels, 
                                min_sens=0.90, min_spec=0.85):
    """
    Optimizes decision threshold tau on the separate val_threshold subset
    to strictly enforce:
      Sensitivity >= 90%
      Specificity >= 85%
    
    If multiple thresholds satisfy the gate, selects the threshold
    maximizing the harmonic mean (F1 / balanced accuracy).
    If no threshold satisfies both simultaneously, selects the threshold
    guaranteeing Sensitivity >= 90% that maximizes Specificity.
    """
    probs = np.array(calibrated_probs, dtype=np.float64).flatten()
    labels = np.array(true_labels, dtype=np.int32).flatten()
    
    thresholds = np.linspace(0.01, 0.99, 990)
    best_candidate = None
    fallback_candidate = None
    
    pos_mask = (labels == 1)
    neg_mask = (labels == 0)
    n_pos = np.sum(pos_mask)
    n_neg = np.sum(neg_mask)
    
    all_evals = []
    
    for tau in thresholds:
        preds = (probs >= tau).astype(np.int32)
        
        tp = np.sum((preds == 1) & pos_mask)
        fp = np.sum((preds == 1) & neg_mask)
        tn = np.sum((preds == 0) & neg_mask)
        fn = np.sum((preds == 0) & pos_mask)
        
        sens = tp / n_pos if n_pos > 0 else 0.0
        spec = tn / n_neg if n_neg > 0 else 0.0
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        f1 = (2 * prec * sens) / (prec + sens) if (prec + sens) > 0 else 0.0
        bal_acc = 0.5 * (sens + spec)
        
        eval_point = {
            'threshold': float(round(tau, 4)),
            'sensitivity': float(round(sens, 4)),
            'specificity': float(round(spec, 4)),
            'precision': float(round(prec, 4)),
            'f1_score': float(round(f1, 4)),
            'balanced_accuracy': float(round(bal_acc, 4)),
            'satisfies_primary_gate': bool(sens >= min_sens and spec >= min_spec)
        }
        all_evals.append(eval_point)
        
        # Candidate satisfying both gates
        if sens >= min_sens and spec >= min_spec:
            if best_candidate is None or bal_acc > best_candidate['balanced_accuracy']:
                best_candidate = eval_point
                
        # Fallback candidate maintaining sensitivity >= 90%
        if sens >= min_sens:
            if fallback_candidate is None or spec > fallback_candidate['specificity']:
                fallback_candidate = eval_point
                
    chosen = best_candidate if best_candidate is not None else fallback_candidate
    
    result = {
        'chosen_threshold': chosen,
        'target_constraints': {
            'min_sensitivity': min_sens,
            'min_specificity': min_spec
        },
        'primary_gate_met': bool(chosen['satisfies_primary_gate']) if chosen else False,
        'threshold_grid_count': len(thresholds)
    }
    return result

def save_frozen_threshold(opt_result, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(opt_result, f, indent=2)
    print(f"Saved frozen clinical threshold to {out_path}")
