# RETINOVA Swin V2 Tiny Model Checkpoint

## Checkpoint Specification

- **Model Architecture**: Swin Transformer V2 Tiny (`swinv2_tiny`)
- **Input Resolution**: 512 × 512 RGB Fundus Images
- **Classification Task**: 5-Grade Diabetic Retinopathy (`G0`, `G1`, `G2`, `G3`, `G4`)
- **Target File**: `best_model.pt`
- **File Size**: ~316.36 MB (331,729,506 bytes)
- **Local Expected Path**:
  ```
  ai-pipeline/module4_Grading_Final/checkpoints/best_model.pt
  ```

## Large File Handling & Git LFS

Because `best_model.pt` exceeds GitHub's default 100 MB file limit, this repository is configured with **Git LFS** (`.gitattributes` tracks `*.pt`).

### If cloning with Git LFS:
```bash
git lfs install
git lfs pull
```

### Manual Checkpoint Placement:
If the model checkpoint is distributed via GitHub Releases or external research storage:
1. Obtain `best_model.pt`.
2. Place it in this exact folder:
   ```
   ai-pipeline/module4_Grading_Final/checkpoints/best_model.pt
   ```
3. Verify integrity:
   - File size: ~316 MB
   - Expected PyTorch state_dict keys: Swin V2 backbone weights + classification head (5 logits) + temperature scaling parameter.

> **Note**: Model checkpoint must be provided separately and placed at the documented path if cloning without Git LFS storage bandwidth.
