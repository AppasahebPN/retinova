function result = run_NetraAI_SwinV1_baseline(imagePath)
% =========================================================================
% run_NetraAI_SwinV1_baseline (ROLLBACK SAFE BASELINE)
% =========================================================================
% Complete NetraAI DR Screening Pipeline Integrated with Frozen Swin V2 Tiny V1.
% SIH26038: Explainable AI for Diabetic Retinopathy Screening in Rural India
%
% Complete Clinical Screening Flow:
%   input fundus image
%         ↓
%   Module 1: IQA Quality Gate (run_IQA_QualityGate)
%         ↓ (If Reject -> RECAPTURE, stop)
%   Module 2: Enhancement (enhanceFundusImage)
%         ↓
%   Module 3: Retinal Evidence Segmentation (run_Segmentation)
%         ↓
%   Frozen Swin V2 Tiny V1 Model (model_adapter)
%         ↓
%   Calibrated P(G2+) (T = 1.4555)
%         ↓
%   Decision Threshold (tau = 0.2993)
%         ↓
%   Clinical Screening Decision: SCREEN vs REFER
%         ↓
%   5-Grade ICDR Severity Prediction (G0 - G4)
% =========================================================================

basePath = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

addpath(fullfile(basePath, 'module1_IQA'));
addpath(fullfile(basePath, 'module2_Enhancement'));
addpath(fullfile(basePath, 'module3_Segmentation'));
addpath(fullfile(basePath, 'module4_Grading_Final', 'integration'));

if nargin < 1
    error('Please provide a retinal image path.');
end

if ~isfile(imagePath)
    alt = fullfile(basePath, imagePath);
    if isfile(alt)
        imagePath = alt;
    else
        error('Image not found: %s', imagePath);
    end
end

tTotal = tic;
result = struct();
result.imagePath = imagePath;
result.status = "STARTED";

%% =========================================================================
% MODULE 1 - IMAGE QUALITY ASSESSMENT
% =========================================================================
fprintf('\n============================================\n');
fprintf('MODULE 1 - IMAGE QUALITY ASSESSMENT\n');
fprintf('============================================\n');

tIqa = tic;
qualityResult = run_IQA_QualityGate(imagePath);
iqaTime = toc(tIqa);

result.quality = qualityResult;
result.iqaTime = iqaTime;

fprintf('Quality Class : %s\n', string(qualityResult.qualityClass));
fprintf('Confidence    : %.2f%%\n', qualityResult.confidence * 100);
fprintf('Decision      : %s\n', string(qualityResult.decision));
fprintf('IQA Time      : %.2f sec\n', iqaTime);

%% QUALITY GATE
qualityClass = string(qualityResult.qualityClass);
if qualityClass == "Reject"
    fprintf('\n--------------------------------------------\n');
    fprintf('QUALITY GATE: REJECT\n');
    fprintf('Image quality insufficient. Image must be recaptured.\n');
    fprintf('--------------------------------------------\n');
    result.finalDecision = "RECAPTURE";
    result.status = "REJECTED_BY_QUALITY_GATE";
    result.totalTime = toc(tTotal);
    return;
end

%% =========================================================================
% MODULE 2 - IMAGE ENHANCEMENT
% =========================================================================
fprintf('\n============================================\n');
fprintf('MODULE 2 - IMAGE ENHANCEMENT\n');
fprintf('============================================\n');

originalImg = imread(imagePath);
tEnhance = tic;
[enhancedImg, enhancementMetrics] = enhanceFundusImage(originalImg);
enhancementTime = toc(tEnhance);

result.enhancedImage = enhancedImg;
result.enhancementMetrics = enhancementMetrics;
result.enhancementTime = enhancementTime;

fprintf('Contrast Gain     : %.4f\n', enhancementMetrics.contrastGain);
fprintf('FOV Coverage      : %.2f%%\n', enhancementMetrics.fovCoverage);
fprintf('Enhancement Time  : %.2f sec\n', enhancementTime);

%% =========================================================================
% MODULE 3 - VESSEL & RETINAL EVIDENCE SEGMENTATION
% =========================================================================
fprintf('\n============================================\n');
fprintf('MODULE 3 - RETINAL EVIDENCE\n');
fprintf('============================================\n');

tSeg = tic;
segmentationResult = run_Segmentation(enhancedImg);
segmentationTime = toc(tSeg);

result.segmentation = segmentationResult;
result.segmentationTime = segmentationTime;

fprintf('Vessel Coverage       : %.2f%%\n', segmentationResult.vesselCoverage);
fprintf('Lesion Candidate Area : %.2f%%\n', segmentationResult.lesionCoverage);
fprintf('Lesion Candidates     : %d\n', segmentationResult.lesionCount);
fprintf('Segmentation Time     : %.2f sec\n', segmentationTime);

%% =========================================================================
% MODULE 4 - FROZEN SWIN V2 TINY V1 MODEL INFERENCE
% =========================================================================
fprintf('\n============================================\n');
fprintf('MODULE 4 - FROZEN SWIN V2 TINY V1 GRADING\n');
fprintf('============================================\n');

tGrading = tic;
% Call model_adapter with enhanced fundus image
gradeResult = model_adapter(enhancedImg, false);
gradingTime = toc(tGrading);

result.grading = gradeResult;
result.gradingTime = gradingTime;

fprintf('Model Architecture      : %s\n', gradeResult.model_name);
fprintf('Raw G2+ Probability     : %.6f\n', gradeResult.g2plus_probability_raw);
fprintf('Calibration Temp (T*)   : %.4f\n', gradeResult.temperature);
fprintf('Calibrated P(G2+)       : %.4f (%.2f%%)\n', gradeResult.g2plus_probability_calibrated, gradeResult.g2plus_probability_calibrated * 100);
fprintf('Screening Threshold     : %.4f\n', gradeResult.threshold);
fprintf('Screening Decision      : %s\n', gradeResult.decision);
fprintf('Predicted 5-Grade Class : %s\n', gradeResult.predictedClass);
fprintf('DR Grade Number         : %d\n', gradeResult.grade);
fprintf('Grade Confidence        : %.2f%%\n', gradeResult.confidence * 100);
fprintf('Inference Time          : %.3f sec\n', gradeResult.inference_time);

%% =========================================================================
% OVERALL SCREENING DECISION & STATUS
% =========================================================================
result.finalDecision = gradeResult.decision;
result.status = "SUCCESS";
result.totalTime = toc(tTotal);

fprintf('\n============================================\n');
fprintf('NETRAAI SCREENING RESULT SUMMARY\n');
fprintf('============================================\n');
fprintf('Quality Gate Decision   : %s\n', string(qualityResult.decision));
fprintf('Clinical Referral       : %s\n', result.finalDecision);
fprintf('ICDR Severity Grade     : Grade %d\n', gradeResult.grade);
fprintf('Total Pipeline Time     : %.2f sec\n', result.totalTime);
fprintf('============================================\n\n');

end
