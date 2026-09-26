function result = model_adapter(imageInput, returnCam)
% =========================================================================
% model_adapter
% =========================================================================
% Drop-in NetraAI Pipeline Adapter for Frozen Swin V2 Tiny V1 Model.
%
% This adapter enables the NetraAI pipeline (run_DR_Screening.m, Module 5
% Explainability, and reporting) to seamlessly consume the frozen Swin V1
% model without altering any legacy module or changing production code.
%
% INPUT:
%   imageInput - Fundus image path OR in-memory image matrix (uint8/double)
%   returnCam  - Optional boolean flag for Grad-CAM attribution
%
% OUTPUT:
%   result - Unified struct satisfying both legacy NetraAI contract and
%            new clinical G2+ screening contract:
%
%     --- Legacy NetraAI Contract ---
%     result.predictedClass       - e.g. "Grade 0 - No DR"
%     result.grade                - 0, 1, 2, 3, or 4
%     result.confidence           - max 5-grade probability
%     result.classNames           - ["Grade 0", "Grade 1", ..., "Grade 4"]
%     result.classProbabilities   - 1x5 double array
%     result.inputSize            - [512, 512, 3]
%     result.status               - "SUCCESS"
%
%     --- Clinical G2+ Screening Contract (Swin V1 Frozen) ---
%     result.model_name
%     result.input_resolution
%     result.g2plus_probability_raw
%     result.temperature
%     result.g2plus_probability_calibrated
%     result.threshold
%     result.referable
%     result.decision             - "REFER" or "SCREEN"
%     result.screeningDecision    - "REFER" or "SCREEN"
%     result.inference_time
% =========================================================================

if nargin < 1
    error('model_adapter requires an image input (path or matrix).');
end

if nargin < 2
    returnCam = false;
end

%% Execute Swin V1 Inference
swinRes = run_SwinV1(imageInput, returnCam);

%% Build Standard Class Names
classNames = [
    "Grade 0 - No DR", ...
    "Grade 1 - Mild", ...
    "Grade 2 - Moderate", ...
    "Grade 3 - Severe", ...
    "Grade 4 - Proliferative DR"
];

gradeIdx = swinRes.grade + 1; % 1-indexed
predictedClass = classNames(gradeIdx);
confidence = swinRes.grade_probabilities(gradeIdx);

%% Assemble Unified Result Structure
result = struct();

% 1. Legacy Contract compatibility
result.predictedClass      = predictedClass;
result.grade               = swinRes.grade;
result.confidence          = confidence;
result.classNames          = classNames;
result.classProbabilities  = swinRes.grade_probabilities;
result.inputSize           = swinRes.input_resolution;
result.status              = "SUCCESS";

% 2. Full Clinical Swin V1 Specification
result.model_name                     = swinRes.model_name;
result.input_resolution              = swinRes.input_resolution;
result.g2plus_probability_raw         = swinRes.g2plus_probability_raw;
result.temperature                    = swinRes.temperature;
result.g2plus_probability_calibrated  = swinRes.g2plus_probability_calibrated;
result.threshold                      = swinRes.threshold;
result.referable                      = swinRes.referable;
result.decision                       = swinRes.decision;
result.screeningDecision              = swinRes.decision;
result.grade_probabilities            = swinRes.grade_probabilities;
result.inference_time                 = swinRes.inference_time;
result.execution_method               = swinRes.execution_method;

if isfield(swinRes, 'gradcam_heatmap')
    result.gradcam_heatmap = swinRes.gradcam_heatmap;
end
if isfield(swinRes, 'gradcam_overlay')
    result.gradcam_overlay = swinRes.gradcam_overlay;
end
if isfield(swinRes, 'gradcam_raw')
    result.gradcam_raw = swinRes.gradcam_raw;
end

end
