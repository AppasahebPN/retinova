import os
import sys
import time
import json
import random
import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms

from sklearn.metrics import (
    roc_auc_score, 
    average_precision_score, 
    cohen_kappa_score, 
    accuracy_score, 
    f1_score
)

# Workspace imports
ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
sys.path.insert(0, ROOT_DIR)

from module4_Grading_Final.models.swinv2_tiny import SwinV2TinyDR
from module4_Grading_Final.preprocessing.preprocess_512 import crop_retina_fov_pil, pad_and_resize_pil
from module4_Grading_Final.calibration.temperature_scaling import fit_temperature_scaling, save_calibration_model
from module4_Grading_Final.optimization.threshold_optimizer import optimize_clinical_threshold, save_frozen_threshold

# ---------------------------------------------------------------------------
# Reproducibility Seed
# ---------------------------------------------------------------------------
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

# ---------------------------------------------------------------------------
# Dataset Class
# ---------------------------------------------------------------------------
class RetinalDataset512(Dataset):
    def __init__(self, df, root_dir, is_train=True):
        self.records = df.to_dict('records')
        self.root_dir = root_dir
        self.is_train = is_train
        
        # Standard ImageNet normalization for Swin V2
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
    def __len__(self):
        return len(self.records)
        
    def __getitem__(self, idx):
        row = self.records[idx]
        fpath = os.path.join(self.root_dir, row['rel_path']) if not os.path.isabs(row['rel_path']) else row['rel_path']
        
        try:
            img = Image.open(fpath).convert('RGB')
        except Exception as e:
            # Fallback if image read fails
            img = Image.new('RGB', (512, 512), (0, 0, 0))
            
        # Clinical FOV crop & square pad to 512x512
        cropped = crop_retina_fov_pil(img)
        resized = pad_and_resize_pil(cropped, target_size=512)
        
        # Training augmentations (photometric & geometric)
        if self.is_train:
            if random.random() > 0.5:
                resized = resized.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if random.random() > 0.5:
                resized = resized.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            if random.random() > 0.7:
                angle = random.choice([90, 180, 270])
                resized = resized.rotate(angle)
                
        # Normalization
        arr = np.array(resized, dtype=np.float32) / 255.0
        arr = (arr - self.mean) / self.std
        tensor = torch.from_numpy(np.transpose(arr, (2, 0, 1))).float()
        
        target_ref = torch.tensor([float(row['is_referable'])], dtype=torch.float32)
        target_grade = torch.tensor(int(row['dr_grade']), dtype=torch.long)
        
        return {
            'image': tensor,
            'target_ref': target_ref,
            'target_grade': target_grade,
            'image_id': row['image_id'],
            'dataset': row['dataset']
        }

# ---------------------------------------------------------------------------
# Training & Validation Engine
# ---------------------------------------------------------------------------
def train_epoch(model, loader, optimizer, scaler, criterion_ref, criterion_5g, 
                grad_accum_steps, device, epoch):
    model.train()
    total_loss = 0.0
    total_loss_ref = 0.0
    total_loss_5g = 0.0
    num_batches = len(loader)
    
    optimizer.zero_grad()
    t0 = time.time()
    
    for step, batch in enumerate(loader):
        images = batch['image'].to(device, non_blocking=True)
        targets_ref = batch['target_ref'].to(device, non_blocking=True)
        targets_grade = batch['target_grade'].to(device, non_blocking=True)
        
        with torch.amp.autocast('cuda', dtype=torch.float16):
            out = model(images)
            loss_ref = criterion_ref(out['logit_referable'], targets_ref)
            loss_5g = criterion_5g(out['logits_5grade'], targets_grade)
            loss = (loss_ref + 0.5 * loss_5g) / grad_accum_steps
            
        scaler.scale(loss).backward()
        
        loss_val = loss.item() * grad_accum_steps
        total_loss += loss_val
        total_loss_ref += loss_ref.item()
        total_loss_5g += loss_5g.item()
        
        # Optimization step after accumulating grad_accum_steps
        if (step + 1) % grad_accum_steps == 0 or (step + 1) == num_batches:
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad()
            
        if (step + 1) % 100 == 0 or (step + 1) == num_batches:
            elapsed = time.time() - t0
            steps_per_sec = (step + 1) / elapsed
            print(f"Epoch [{epoch}] Step [{step+1}/{num_batches}] - "
                  f"Loss: {loss_val:.4f} (Ref: {loss_ref.item():.4f}, 5G: {loss_5g.item():.4f}) - "
                  f"Speed: {steps_per_sec:.2f} batch/s", flush=True)
                  
    avg_loss = total_loss / num_batches
    avg_ref = total_loss_ref / num_batches
    avg_5g = total_loss_5g / num_batches
    return avg_loss, avg_ref, avg_5g

@torch.no_grad()
def evaluate_split(model, loader, criterion_ref, criterion_5g, device):
    model.eval()
    total_loss = 0.0
    all_logits_ref = []
    all_targets_ref = []
    all_preds_grade = []
    all_targets_grade = []
    all_logits_5g = []
    
    for batch in loader:
        images = batch['image'].to(device, non_blocking=True)
        targets_ref = batch['target_ref'].to(device, non_blocking=True)
        targets_grade = batch['target_grade'].to(device, non_blocking=True)
        
        with torch.amp.autocast('cuda', dtype=torch.float16):
            out = model(images)
            loss_ref = criterion_ref(out['logit_referable'], targets_ref)
            loss_5g = criterion_5g(out['logits_5grade'], targets_grade)
            loss = loss_ref + 0.5 * loss_5g
            
        total_loss += loss.item()
        all_logits_ref.extend(out['logit_referable'].cpu().numpy().flatten())
        all_targets_ref.extend(targets_ref.cpu().numpy().flatten())
        
        preds_5g = torch.argmax(out['logits_5grade'], dim=1).cpu().numpy()
        all_preds_grade.extend(preds_5g)
        all_targets_grade.extend(targets_grade.cpu().numpy())
        all_logits_5g.extend(out['logits_5grade'].cpu().numpy())
        
    num_batches = len(loader)
    avg_loss = total_loss / num_batches
    
    all_logits_ref = np.array(all_logits_ref, dtype=np.float64)
    all_targets_ref = np.array(all_targets_ref, dtype=np.int32)
    all_preds_grade = np.array(all_preds_grade, dtype=np.int32)
    all_targets_grade = np.array(all_targets_grade, dtype=np.int32)
    
    # Raw probabilities
    raw_probs_ref = 1.0 / (1.0 + np.exp(-all_logits_ref))
    
    # Referable metrics
    try:
        auroc = roc_auc_score(all_targets_ref, raw_probs_ref)
    except Exception:
        auroc = 0.5
    try:
        auprc = average_precision_score(all_targets_ref, raw_probs_ref)
    except Exception:
        auprc = 0.0
        
    # 5-grade metrics
    qwk = cohen_kappa_score(all_targets_grade, all_preds_grade, weights='quadratic')
    acc = accuracy_score(all_targets_grade, all_preds_grade)
    macro_f1 = f1_score(all_targets_grade, all_preds_grade, average='macro')
    
    return {
        'loss': avg_loss,
        'auroc': float(auroc),
        'auprc': float(auprc),
        'qwk': float(qwk),
        'accuracy_5g': float(acc),
        'macro_f1_5g': float(macro_f1),
        'logits_ref': all_logits_ref,
        'targets_ref': all_targets_ref,
        'targets_grade': all_targets_grade,
        'preds_grade': all_preds_grade
    }

# ---------------------------------------------------------------------------
# Main Training & Calibration Routine
# ---------------------------------------------------------------------------
def run_full_training(epochs=5, batch_size=2, grad_accum_steps=8, lr=1e-4):
    set_seed(42)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"============================================================")
    print(f"STARTING LOCKED FINAL SWIN V2 TINY TRAINING (512x512)")
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
    print(f"Config: Epochs={epochs}, BatchSize={batch_size}, GradAccum={grad_accum_steps} (EffBatch={batch_size*grad_accum_steps})")
    print(f"============================================================")
    
    manifest_csv = os.path.join(ROOT_DIR, "module4_Grading_Final", "manifest", "master_manifest.csv")
    df_manifest = pd.read_csv(manifest_csv)
    
    # Strict split partitions
    train_df = df_manifest[df_manifest['split'] == 'train'].reset_index(drop=True)
    val_calib_df = df_manifest[df_manifest['split'] == 'val_calibration'].reset_index(drop=True)
    val_thresh_df = df_manifest[df_manifest['split'] == 'val_threshold'].reset_index(drop=True)
    locked_test_df = df_manifest[df_manifest['split'] == 'test_locked'].reset_index(drop=True)
    
    print(f"Dataset Partitions:")
    print(f"  - Train:           {len(train_df)} images")
    print(f"  - Val-Calibration: {len(val_calib_df)} images")
    print(f"  - Val-Threshold:   {len(val_thresh_df)} images")
    print(f"  - Locked-Test:     {len(locked_test_df)} images (STRICTLY ISOLATED)")
    
    # -----------------------------------------------------------------------
    # Dataset Balancing: Square-Root Temperature Sampling
    # -----------------------------------------------------------------------
    ds_weights = {
        'EyeQ': 0.7696,
        'APTOS': 1.4254,
        'IDRiD': 4.2567
    }
    sample_weights = [ds_weights.get(row['dataset'], 1.0) for _, row in train_df.iterrows()]
    sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)
    
    # DataLoaders
    train_ds = RetinalDataset512(train_df, ROOT_DIR, is_train=True)
    val_calib_ds = RetinalDataset512(val_calib_df, ROOT_DIR, is_train=False)
    val_thresh_ds = RetinalDataset512(val_thresh_df, ROOT_DIR, is_train=False)
    
    train_loader = DataLoader(
        train_ds, 
        batch_size=batch_size, 
        sampler=sampler, 
        num_workers=2, 
        pin_memory=True,
        drop_last=True
    )
    val_calib_loader = DataLoader(
        val_calib_ds, 
        batch_size=batch_size * 2, 
        shuffle=False, 
        num_workers=2, 
        pin_memory=True
    )
    val_thresh_loader = DataLoader(
        val_thresh_ds, 
        batch_size=batch_size * 2, 
        shuffle=False, 
        num_workers=2, 
        pin_memory=True
    )
    
    # -----------------------------------------------------------------------
    # Model, Loss, Optimizer, Scaler
    # -----------------------------------------------------------------------
    model = SwinV2TinyDR(pretrained=True)
    model.to(device)
    
    # Validated Class Weight W_pos = 3.0196 from real TRAIN manifest
    pos_weight = torch.tensor([3.0196], device=device)
    criterion_ref = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    criterion_5g = nn.CrossEntropyLoss(label_smoothing=0.05)
    
    # Differential learning rates: backbone lower, heads higher
    backbone_params = [p for n, p in model.named_parameters() if not n.startswith('head_') and p.requires_grad]
    head_params = [p for n, p in model.named_parameters() if n.startswith('head_') and p.requires_grad]
    
    optimizer = torch.optim.AdamW([
        {'params': backbone_params, 'lr': lr * 0.5, 'weight_decay': 1e-2},
        {'params': head_params, 'lr': lr * 2.0, 'weight_decay': 1e-2}
    ])
    
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    scaler = torch.amp.GradScaler('cuda')
    
    # -----------------------------------------------------------------------
    # Training Loop
    # -----------------------------------------------------------------------
    best_auroc = 0.0
    best_epoch = 0
    history = []
    
    checkpoint_dir = os.path.join(ROOT_DIR, "module4_Grading_Final", "checkpoints")
    os.makedirs(checkpoint_dir, exist_ok=True)
    best_model_path = os.path.join(checkpoint_dir, "best_model.pt")
    
    for epoch in range(1, epochs + 1):
        print(f"\n========== Epoch {epoch}/{epochs} ==========", flush=True)
        tr_loss, tr_ref, tr_5g = train_epoch(
            model, train_loader, optimizer, scaler, criterion_ref, criterion_5g, 
            grad_accum_steps, device, epoch
        )
        scheduler.step()
        
        # Evaluate on validation sets
        print(f"Evaluating validation splits...", flush=True)
        eval_thresh = evaluate_split(model, val_thresh_loader, criterion_ref, criterion_5g, device)
        eval_calib = evaluate_split(model, val_calib_loader, criterion_ref, criterion_5g, device)
        
        val_auroc = eval_thresh['auroc']
        val_auprc = eval_thresh['auprc']
        val_qwk = eval_thresh['qwk']
        val_acc = eval_thresh['accuracy_5g']
        
        print(f"[Validation Epoch {epoch}] - "
              f"TrLoss: {tr_loss:.4f} | ValLoss: {eval_thresh['loss']:.4f} | "
              f"G2+ AUROC: {val_auroc:.4f} | AUPRC: {val_auprc:.4f} | "
              f"5G-QWK: {val_qwk:.4f} | 5G-Acc: {val_acc:.4f}", flush=True)
              
        epoch_record = {
            'epoch': epoch,
            'train_loss': float(tr_loss),
            'train_loss_ref': float(tr_ref),
            'train_loss_5g': float(tr_5g),
            'val_loss': float(eval_thresh['loss']),
            'val_auroc': float(val_auroc),
            'val_auprc': float(val_auprc),
            'val_qwk': float(val_qwk),
            'val_accuracy_5g': float(val_acc),
            'val_macro_f1_5g': float(eval_thresh['macro_f1_5g'])
        }
        history.append(epoch_record)
        
        # Save Best Model Checkpoint
        if val_auroc > best_auroc:
            best_auroc = val_auroc
            best_epoch = epoch
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_metrics': epoch_record,
                'config': {
                    'architecture': 'Swin V2 Tiny (Torchvision)',
                    'input_resolution': '512x512',
                    'pos_weight': 3.0196,
                    'batch_size': batch_size,
                    'grad_accum_steps': grad_accum_steps,
                    'lr': lr
                }
            }, best_model_path)
            print(f"--> Saved new best checkpoint to {best_model_path} (AUROC: {val_auroc:.4f})", flush=True)
            
    # Save training history JSON
    hist_path = os.path.join(ROOT_DIR, "module4_Grading_Final", "training_history.json")
    with open(hist_path, 'w') as f:
        json.dump(history, f, indent=2)
    print(f"\nTraining complete. History saved to {hist_path}")
    
    # -----------------------------------------------------------------------
    # POST-TRAINING: Calibration & Threshold Optimization on Best Model
    # -----------------------------------------------------------------------
    print("\n============================================================")
    print("RUNNING POST-TRAINING CALIBRATION & THRESHOLD OPTIMIZATION")
    print("============================================================")
    
    best_ckpt = torch.load(best_model_path, map_location=device, weights_only=False)
    model.load_state_dict(best_ckpt['model_state_dict'])
    model.eval()
    
    # 1. Temperature Scaling on val_calibration
    print("Fitting Temperature Scaling on val_calibration split...")
    calib_eval = evaluate_split(model, val_calib_loader, criterion_ref, criterion_5g, device)
    calib_result = fit_temperature_scaling(calib_eval['logits_ref'], calib_eval['targets_ref'])
    
    calib_json_path = os.path.join(ROOT_DIR, "module4_Grading_Final", "calibration", "calibration_params.json")
    save_calibration_model(calib_result, calib_json_path)
    print(f"Optimal Temperature T* = {calib_result['temperature']:.4f}")
    print(f"ECE: Before = {calib_result['ece_before']:.4f} -> After = {calib_result['ece_after']:.4f}")
    
    # 2. Threshold Optimization on val_threshold using Calibrated Probabilities
    print("\nOptimizing Clinical Operating Threshold on val_threshold split...")
    thresh_eval = evaluate_split(model, val_thresh_loader, criterion_ref, criterion_5g, device)
    calibrated_thresh_probs = 1.0 / (1.0 + np.exp(-thresh_eval['logits_ref'] / calib_result['temperature']))
    
    opt_result = optimize_clinical_threshold(
        calibrated_thresh_probs, 
        thresh_eval['targets_ref'], 
        min_sens=0.90, 
        min_spec=0.85
    )
    
    thresh_json_path = os.path.join(ROOT_DIR, "module4_Grading_Final", "optimization", "frozen_threshold.json")
    save_frozen_threshold(opt_result, thresh_json_path)
    
    chosen = opt_result['chosen_threshold']
    print(f"\nFROZEN CLINICAL OPERATING THRESHOLD: tau* = {chosen['threshold']:.4f}")
    print(f"  - Sensitivity: {chosen['sensitivity']*100:.2f}% (Constraint >= 90.0%)")
    print(f"  - Specificity: {chosen['specificity']*100:.2f}% (Constraint >= 85.0%)")
    print(f"  - Balanced Accuracy: {chosen['balanced_accuracy']*100:.2f}%")
    print(f"  - Primary Gate Satisfied: {opt_result['primary_gate_met']}")
    
    # -----------------------------------------------------------------------
    # Final Summary Report Generation
    # -----------------------------------------------------------------------
    report = {
        '1_best_validation_epoch': best_epoch,
        '2_training_validation_losses': {
            'best_epoch': best_epoch,
            'train_loss': history[best_epoch - 1]['train_loss'],
            'val_loss': history[best_epoch - 1]['val_loss']
        },
        '3_g2_auroc_auprc': {
            'auroc': history[best_epoch - 1]['val_auroc'],
            'auprc': history[best_epoch - 1]['val_auprc']
        },
        '4_threshold_candidates': opt_result,
        '5_chosen_threshold_metrics': chosen,
        '6_five_grade_metrics': {
            'qwk': history[best_epoch - 1]['val_qwk'],
            'accuracy': history[best_epoch - 1]['val_accuracy_5g'],
            'macro_f1': history[best_epoch - 1]['val_macro_f1_5g']
        },
        '7_calibration_metrics': calib_result,
        '8_checkpoint_path': best_model_path,
        '9_configuration': best_ckpt['config']
    }
    
    final_report_path = os.path.join(ROOT_DIR, "module4_Grading_Final", "training_final_report.json")
    with open(final_report_path, 'w') as f:
        json.dump(report, f, indent=2)
        
    print(f"\nAll training, calibration, and threshold stages completed successfully.")
    print(f"Final report saved to {final_report_path}")
    print("STOPPED BEFORE LOCKED TEST EVALUATION per user instructions.")
    return report

if __name__ == '__main__':
    run_full_training(epochs=5, batch_size=2, grad_accum_steps=8, lr=1e-4)
