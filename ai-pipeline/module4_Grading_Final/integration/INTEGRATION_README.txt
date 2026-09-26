================================================================================
SIH26038: EXPLAINABLE AI FOR DIABETIC RETINOPATHY SCREENING IN RURAL INDIA
NETRAAI PIPELINE INTEGRATION: FROZEN SWIN V2 TINY V1 MODEL
================================================================================

1. OVERVIEW
--------------------------------------------------------------------------------
This integration connects the locked, calibrated Swin Transformer V2 Tiny V1 model
directly into the NetraAI production screening pipeline.

The integration provides:
- Seamless MATLAB <-> Python communication via in-process pyenv with automatic CLI fallback.
- Strict preservation of all existing production modules (module1_IQA, module2_Enhancement,
  module3_Segmentation, module4_Grading, module5_Explainability, module6_Simulink,
  run_DR_Screening.m).
- 100% numerical parity between standalone Python inference and MATLAB wrapper execution.
- Quality Gate enforcement preventing downstream misclassification of degraded images.

2. LOCKED MODEL CONFIGURATION
--------------------------------------------------------------------------------
- Architecture:          Swin Transformer V2 Tiny (Torchvision swin_v2_t)
- Input Resolution:      Exactly 512 x 512 x 3 RGB
- Checkpoint Path:       module4_Grading_Final/checkpoints/best_model.pt
- Temperature Parameter: T* = 1.4555 (Calibrated via Temperature Scaling)
- Operating Threshold:   tau* = 0.2993 (FROZEN)
- Primary Screening Rule:P(G2+) >= 0.2993 -> REFER, else SCREEN
- Secondary Task:        5-Grade ICDR Severity (G0, G1, G2, G3, G4)
- Preprocessing:         Circular FOV Crop -> Square Reflection/Black Pad ->
                         Bicubic Resize (512x512) -> ImageNet Normalization

3. COMPONENT ARCHITECTURE & INTERFACES
--------------------------------------------------------------------------------
All integration code is isolated inside:
  module4_Grading_Final/integration/

A. Python Predictor Core (swinV1_predictor.py):
   - Implements singleton SwinV1Predictor.
   - Loads weights once on CPU or GPU with AMP FP16.
   - Function: predict_image(image_input, return_cam=False)
   - Accepts image filepath (str), PIL Image, or NumPy array.

B. Python CLI Interface (run_SwinV1.py):
   - Command-line runner for external processes or system scripts.
   - Syntax: python run_SwinV1.py --image <path> [--output_json <out.json>] [--cam]

C. MATLAB Direct Wrapper (run_SwinV1.m):
   - Primary MATLAB entry point.
   - Syntax: result = run_SwinV1(imageInput, returnCam);
   - Accepts image filepath or in-memory MATLAB matrix.
   - Tries in-process pyenv first (< 0.5s); falls back seamlessly to CLI if pyenv is busy.

D. NetraAI Pipeline Adapter (model_adapter.m):
   - Drop-in bridge for NetraAI pipeline components.
   - Maps Swin V1 outputs into both legacy Module 4 schema and rich clinical screening schema.
   - Syntax: gradeResult = model_adapter(enhancedImg);

E. Integrated Pipeline Runner (run_NetraAI_SwinV1.m):
   - End-to-end clinical execution:
     Module 1 IQA -> Quality Gate -> Module 2 Enhancement -> Module 3 Retinal Evidence ->
     Module 4 Swin V1 Grading -> Consolidated Patient Screening Result.

F. Automated Test Suite (test_SwinV1_integration.m):
   - Comprehensive test suite validating schema, parity, reproducibility, and Quality Gate logic.

4. MATLAB RESULT STRUCTURE SPECIFICATION
--------------------------------------------------------------------------------
The output struct exposes the exact required clinical fields:

  Field                           | Type     | Description
  --------------------------------+----------+------------------------------------------------
  result.model_name               | string   | "Swin V2 Tiny (Torchvision swin_v2_t)"
  result.input_resolution         | double   | [512, 512, 3]
  result.g2plus_probability_raw   | double   | Sigmoid output of referable logit
  result.temperature              | double   | 1.4555
  result.g2plus_probability_calibrated | double | Temperature-calibrated P(G2+)
  result.threshold                | double   | 0.2993
  result.referable                | logical  | true if P(G2+) >= 0.2993 else false
  result.decision                 | string   | "REFER" or "SCREEN"
  result.grade                    | int32    | ICDR Severity Grade (0, 1, 2, 3, 4)
  result.grade_probabilities      | double   | 1x5 array of softmax probabilities [p0..p4]
  result.inference_time           | double   | Execution duration in seconds
  result.execution_method         | string   | "IN_PROCESS_PYENV" or "CLI_EXECUTION"

5. EXPLAINABILITY (MODULE 5) INTERFACE
--------------------------------------------------------------------------------
When returnCam=true is passed to run_SwinV1 or model_adapter:
- The PyTorch backbone computes the exact spatial attribution via Grad-CAM on the final
  Swin transformer stage features.
- Result includes result.gradcam_heatmap as a normalized 512x512 matrix.
- Module 5 can directly consume result.gradcam_heatmap, result.g2plus_probability_calibrated,
  and result.grade without requiring dlnetwork conversion.

6. REPRODUCIBILITY & NUMERICAL PARITY
--------------------------------------------------------------------------------
- Parity between direct Python execution and MATLAB wrapper: Delta = 0.00e+00.
- Inter-run drift across repeated inferences on identical input: Delta = 0.00e+00.
================================================================================
