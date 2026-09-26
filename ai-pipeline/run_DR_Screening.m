function result = run_DR_Screening(imagePath)
% ============================================================
% MASTER PIPELINE
% Explainable AI for Diabetic Retinopathy Screening
%
% Modules:
%   1 - Image Quality Assessment / Quality Gate
%   2 - Image Enhancement
%   3 - Vessel + Lesion Candidate Evidence
%   4 - DR Grading
%   5 - Grad-CAM Explainability
%
% Input:
%   imagePath - path to retinal image
%
% Output:
%   result - complete screening result structure
% ============================================================

%% Project path

basePath = ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

%% Add module paths

addpath(fullfile(basePath,'module1_IQA'));
addpath(fullfile(basePath,'module2_Enhancement'));
addpath(fullfile(basePath,'module3_Segmentation'));
addpath(fullfile(basePath,'module4_Grading'));
addpath(fullfile(basePath,'module5_Explainability'));

%% Validate image

if nargin < 1
    error('Please provide an image path.');
end

if ~isfile(imagePath)
    error('Image not found: %s',imagePath);
end

%% Initialize result

result = struct();

result.imagePath = imagePath;
result.status = "STARTED";

%% ============================================================
% MODULE 1 - IMAGE QUALITY ASSESSMENT
% =============================================================

fprintf('\n============================================\n');
fprintf('MODULE 1 - IMAGE QUALITY ASSESSMENT\n');
fprintf('============================================\n');

tic;

qualityResult = run_IQA_QualityGate(imagePath);

iqaTime = toc;

result.quality = qualityResult;
result.iqaTime = iqaTime;

fprintf('Quality Class : %s\n', ...
    string(qualityResult.qualityClass));

fprintf('Confidence    : %.2f%%\n', ...
    qualityResult.confidence * 100);

fprintf('Decision      : %s\n', ...
    string(qualityResult.decision));

fprintf('IQA Time      : %.2f sec\n',iqaTime);

%% ============================================================
% QUALITY GATE
% =============================================================

qualityClass = string(qualityResult.qualityClass);

if qualityClass == "Reject"

    fprintf('\n--------------------------------------------\n');
    fprintf('QUALITY GATE: REJECT\n');
    fprintf('Image should be recaptured.\n');
    fprintf('--------------------------------------------\n');

    result.finalDecision = "RECAPTURE";
    result.status = "REJECTED_BY_QUALITY_GATE";
    result.totalTime = iqaTime;

    return;

end

%% ============================================================
% MODULE 2 - IMAGE ENHANCEMENT
% =============================================================

fprintf('\n============================================\n');
fprintf('MODULE 2 - IMAGE ENHANCEMENT\n');
fprintf('============================================\n');

originalImg = imread(imagePath);

tic;

[enhancedImg,enhancementMetrics] = ...
    enhanceFundusImage(originalImg);

enhancementTime = toc;

result.enhancedImage = enhancedImg;
result.enhancementMetrics = enhancementMetrics;
result.enhancementTime = enhancementTime;

fprintf('Original Contrast : %.4f\n', ...
    enhancementMetrics.originalContrast);

fprintf('Enhanced Contrast : %.4f\n', ...
    enhancementMetrics.enhancedContrast);

fprintf('Contrast Gain     : %.4f\n', ...
    enhancementMetrics.contrastGain);

fprintf('FOV Coverage      : %.2f%%\n', ...
    enhancementMetrics.fovCoverage);

fprintf('Enhancement Time   : %.2f sec\n', ...
    enhancementTime);

%% ============================================================
% MODULE 3 - VESSEL + LESION CANDIDATE EVIDENCE
% =============================================================

fprintf('\n============================================\n');
fprintf('MODULE 3 - RETINAL EVIDENCE\n');
fprintf('============================================\n');

tic;

segmentationResult = ...
    run_Segmentation(enhancedImg);

segmentationTime = toc;

result.segmentation = segmentationResult;
result.segmentationTime = segmentationTime;

fprintf('Vessel Coverage       : %.2f%%\n', ...
    segmentationResult.vesselCoverage);

fprintf('Lesion Candidate Area : %.2f%%\n', ...
    segmentationResult.lesionCoverage);

fprintf('Lesion Candidates     : %d\n', ...
    segmentationResult.lesionCount);

fprintf('Segmentation Time     : %.2f sec\n', ...
    segmentationTime);

%% ============================================================
% MODULE 4 - DR GRADING
% =============================================================

fprintf('\n============================================\n');
fprintf('MODULE 4 - DR GRADING\n');
fprintf('============================================\n');

tic;

gradeResult = run_Grading(enhancedImg);

gradingTime = toc;

result.grading = gradeResult;
result.gradingTime = gradingTime;

fprintf('Predicted Class : %s\n', ...
    string(gradeResult.predictedClass));

fprintf('DR Grade        : %d\n', ...
    gradeResult.grade);

fprintf('Confidence      : %.2f%%\n', ...
    gradeResult.confidence * 100);

fprintf('Grading Time    : %.2f sec\n', ...
    gradingTime);

%% ============================================================
% MODULE 5 - GRAD-CAM EXPLAINABILITY
% =============================================================

fprintf('\n============================================\n');
fprintf('MODULE 5 - GRAD-CAM EXPLAINABILITY\n');
fprintf('============================================\n');

tic;

camResult = run_GradCAM( ...
    enhancedImg, ...
    gradeResult);

gradCAMTime = toc;

result.explainability = camResult;
result.gradCAMTime = gradCAMTime;

fprintf('Grad-CAM Status  : %s\n', ...
    string(camResult.status));

fprintf('Feature Layer    : %s\n', ...
    string(camResult.featureLayer));

fprintf('Execution        : %s\n', ...
    string(camResult.executionEnvironment));

fprintf('Grad-CAM Time    : %.2f sec\n', ...
    gradCAMTime);

%% ============================================================
% FINAL DECISION
% =============================================================

if qualityClass == "Usable"

    result.finalDecision = "SCREEN_WITH_QUALITY_FLAG";

else

    result.finalDecision = "SCREEN";

end

result.status = "SUCCESS";

%% ============================================================
% TOTAL PIPELINE TIME
% =============================================================

result.totalTime = ...
    iqaTime + ...
    enhancementTime + ...
    segmentationTime + ...
    gradingTime + ...
    gradCAMTime;

%% ============================================================
% FINAL SUMMARY
% =============================================================

fprintf('\n');
fprintf('====================================================\n');
fprintf('             FINAL SCREENING RESULT\n');
fprintf('====================================================\n');

fprintf('Image             : %s\n', ...
    imagePath);

fprintf('Quality           : %s\n', ...
    qualityClass);

fprintf('Quality Confidence: %.2f%%\n', ...
    qualityResult.confidence * 100);

fprintf('Predicted DR      : Grade %d\n', ...
    gradeResult.grade);

fprintf('DR Confidence     : %.2f%%\n', ...
    gradeResult.confidence * 100);

fprintf('Vessel Coverage   : %.2f%%\n', ...
    segmentationResult.vesselCoverage);

fprintf('Lesion Evidence   : %.2f%%\n', ...
    segmentationResult.lesionCoverage);

fprintf('Grad-CAM          : %s\n', ...
    string(camResult.status));

fprintf('Final Decision    : %s\n', ...
    string(result.finalDecision));

fprintf('Total Time        : %.2f sec\n', ...
    result.totalTime);

fprintf('====================================================\n');

end