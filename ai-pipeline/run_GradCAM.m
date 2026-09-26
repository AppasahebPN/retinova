function result = run_GradCAM(enhancedImg, gradeResult)
% ============================================================
% MODULE 5 - GRAD-CAM EXPLAINABILITY
% Explainable AI for Diabetic Retinopathy Screening
%
% Inputs:
%   enhancedImg  - enhanced RGB retinal image
%   gradeResult  - output structure from run_Grading
%
% Output:
%   result       - Grad-CAM explainability result
%
% No model retraining is performed.
% ============================================================

%% Project paths

basePath = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

modelPath = fullfile( ...
    basePath, ...
    'results', ...
    'APTOS_Grading', ...
    'MobileNetV2_DR_Model.mat');

%% Validate inputs

if nargin < 2
    error('run_GradCAM requires enhancedImg and gradeResult.');
end

if isempty(enhancedImg)
    error('enhancedImg is empty.');
end

if ~isstruct(gradeResult)
    error('gradeResult must be a structure from run_Grading.');
end

%% Load trained DR model and construct dlnetwork

if ~isfile(modelPath)
    error('DR model not found: %s',modelPath);
end

S = load(modelPath);

trainedNet = S.trainedNet;
classNames = S.classNames;
inputSize = S.inputSize;

%% Prepare Grad-CAM network
%
% The saved network contains a classificationLayer.
% dlnetwork requires the output classification layer to be removed.

lgraph = layerGraph(trainedNet);

if any(string({lgraph.Layers.Name}) == "DR_Classification")
    lgraph = removeLayers(lgraph, 'DR_Classification');
end

gradNet = dlnetwork(lgraph);

%% Prepare image

if size(enhancedImg,3) == 1
    enhancedImg = repmat(enhancedImg,[1 1 3]);
end

if size(enhancedImg,3) ~= 3
    error('enhancedImg must be an RGB image.');
end

camInput = im2uint8(enhancedImg);

camInput = imresize( ...
    camInput, ...
    inputSize(1:2));

%% Determine predicted class

predictedClass = string(gradeResult.predictedClass);

classIdx = find( ...
    string(classNames) == predictedClass, ...
    1);

if isempty(classIdx)

    error( ...
        'Predicted class "%s" was not found in classNames.', ...
        predictedClass);

end

%% Determine confidence

if isfield(gradeResult,'confidence')

    confidence = double(gradeResult.confidence);

else

    confidence = NaN;

end

%% Generate Grad-CAM

status = "SUCCESS";

try

    [scoreMap,featureLayer,reductionLayer] = gradCAM( ...
        gradNet, ...
        camInput, ...
        classIdx, ...
        'ExecutionEnvironment','gpu');

    executionEnvironment = "GPU";

catch ME_GPU

    warning( ...
        'GPU Grad-CAM failed. Switching to CPU.\n%s', ...
        ME_GPU.message);

    try

        [scoreMap,featureLayer,reductionLayer] = gradCAM( ...
            gradNet, ...
            camInput, ...
            classIdx, ...
            'ExecutionEnvironment','cpu');

        executionEnvironment = "CPU";

    catch ME_CPU

        status = "FAILED";

        result = struct();

        result.status = status;
        result.errorMessage = ME_CPU.message;
        result.predictedClass = predictedClass;
        result.confidence = confidence;

        return;

    end

end

%% Convert score map to positive evidence
%
% Grad-CAM can contain small negative values.
% For visualization we retain positive activation only.

positiveScoreMap = max(scoreMap,0);

%% Normalize to 0-1

mapMin = min(positiveScoreMap(:));
mapMax = max(positiveScoreMap(:));

if mapMax > mapMin

    normalizedScoreMap = ...
        (positiveScoreMap - mapMin) ./ ...
        (mapMax - mapMin);

else

    normalizedScoreMap = ...
        zeros(size(positiveScoreMap),'like',positiveScoreMap);

end

%% Resize CAM to image dimensions

normalizedScoreMap = imresize( ...
    normalizedScoreMap, ...
    size(camInput,[1 2]), ...
    'bicubic');

normalizedScoreMap = max( ...
    0, ...
    min(1,normalizedScoreMap));

%% Create RGB heatmap

heatmapRGB = ind2rgb( ...
    uint8(normalizedScoreMap * 255), ...
    jet(256));

%% Create overlay

originalRGB = im2double(camInput);

overlayRGB = ...
    0.55 * originalRGB + ...
    0.45 * heatmapRGB;

overlayRGB = max( ...
    0, ...
    min(1,overlayRGB));

%% Store result

result = struct();

result.scoreMap = scoreMap;

result.positiveScoreMap = positiveScoreMap;

result.normalizedScoreMap = normalizedScoreMap;

result.heatmapRGB = heatmapRGB;

result.overlayRGB = overlayRGB;

result.predictedClass = predictedClass;

result.confidence = confidence;

result.classIndex = classIdx;

result.classNames = classNames;

result.featureLayer = featureLayer;

result.reductionLayer = reductionLayer;

result.executionEnvironment = executionEnvironment;

result.inputSize = inputSize;

result.modelPath = modelPath;

result.status = status;

end