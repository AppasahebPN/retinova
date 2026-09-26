function result = run_IQA_QualityGate(imagePath)

% =========================================================
% run_IQA_QualityGate
%
% Operational EyeQ quality gate for the DR screening
% pipeline.
%
% Classes:
%   Good
%   Usable
%   Reject
%
% Good   -> ACCEPT
% Usable -> ACCEPT_FLAG
% Reject -> RECAPTURE
% =========================================================


%% =========================================================
% 1. PATHS
% ==========================================================

basePath = ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';


% ---------------------------------------------------------
% FINAL ARTIFACT-AWARE EYEQ MODEL
% ---------------------------------------------------------

modelPath = fullfile( ...
    basePath, ...
    'results', ...
    'EyeQ', ...
    'EyeQ_ArtifactAware_MobileNetV2_GPU.mat');


%% =========================================================
% 2. INPUT VALIDATION
% ==========================================================

if nargin < 1

    error( ...
        'Please provide an image path.');

end


if ~isfile(imagePath)

    error( ...
        'Image not found:\n%s', ...
        imagePath);

end


if ~isfile(modelPath)

    error( ...
        'Artifact-aware EyeQ model not found:\n%s', ...
        modelPath);

end


%% =========================================================
% 3. READ IMAGE
% ==========================================================

img = imread(imagePath);


if isempty(img)

    error('Input image is empty.');

end


% Convert grayscale to RGB

if size(img,3) == 1

    img = repmat( ...
        img, ...
        [1 1 3]);

end


if size(img,3) ~= 3

    error( ...
        'Input image must be grayscale or RGB.');

end


%% =========================================================
% 4. FOV MASK
% ==========================================================

grayImage = rgb2gray(img);

grayDouble = im2double(grayImage);


fovMask = ...
    grayDouble > 0.05;


fovMask = ...
    bwareaopen( ...
        fovMask, ...
        500);


fovMask = ...
    imfill( ...
        fovMask, ...
        'holes');


% ---------------------------------------------------------
% Keep largest connected component
% ---------------------------------------------------------

CC = bwconncomp(fovMask);


if CC.NumObjects > 0

    numPixels = ...
        cellfun( ...
            @numel, ...
            CC.PixelIdxList);


    [~,largestIdx] = ...
        max(numPixels);


    fovMask = false( ...
        size(grayDouble));


    fovMask(CC.PixelIdxList{largestIdx}) = true;

end


%% =========================================================
% 5. HANDCRAFTED IQA FEATURES
% ==========================================================

% ---------------------------------------------------------
% Sharpness
% ---------------------------------------------------------

sharpness = calculateSharpness(img);


% ---------------------------------------------------------
% Illumination
% ---------------------------------------------------------

illumination = calculateIllumination(img);


% ---------------------------------------------------------
% FOV coverage
% ---------------------------------------------------------

fovCoverage = ...
    100 * ...
    nnz(fovMask) / ...
    numel(fovMask);


% ---------------------------------------------------------
% Artifact analysis
%
% IMPORTANT:
% detectArtifacts returns:
%   1. artifact score
%   2. artifact mask
%   3. artifact type
% ---------------------------------------------------------
[artifactArea, artifactMask, artifactType] = ...
    detectArtifacts(img, fovMask);
artifactArea = double(artifactArea);


artifactMask = logical(artifactMask);


artifactType = string(artifactType);


if strlength(artifactType) == 0

    artifactType = ...
        "No Major Artifact";

end


%% =========================================================
% 6. LOAD ARTIFACT-AWARE EYEQ MODEL (CACHED)
% ==========================================================

persistent trainedNet classNames inputSize

if isempty(trainedNet)
    S = load(modelPath);

    if ~isfield(S,'trainedNet')
        error('The saved EyeQ model does not contain trainedNet.');
    end

    trainedNet = S.trainedNet;

    % ---------------------------------------------------------
    % Class names
    % ---------------------------------------------------------
    if isfield(S,'classNames')
        classNames = S.classNames;
    else
        classNames = categorical(["Good","Usable","Reject"]);
    end

    classNames = categorical(string(classNames), ["Good","Usable","Reject"]);
    inputSize = trainedNet.Layers(1).InputSize;
end


%% =========================================================
% 7. PREPARE INPUT FOR NETWORK
% ==========================================================

modelInput = ...
    imresize( ...
        img, ...
        inputSize(1:2));


% MobileNet expects RGB

if size(modelInput,3) == 1

    modelInput = ...
        repmat( ...
            modelInput, ...
            [1 1 3]);

end


%% =========================================================
% 8. RUN QUALITY CLASSIFIER
% ==========================================================

fprintf('\nRunning EyeQ quality model...\n');


try

    [predictedLabel,scores] = classify( ...
        trainedNet, ...
        modelInput, ...
        'ExecutionEnvironment','gpu');

    executionEnvironment = "GPU";

catch ME_GPU

    warning( ...
        ['GPU quality inference failed. ' ...
         'Using CPU instead.\n%s'], ...
         ME_GPU.message);


    [predictedLabel,scores] = classify( ...
        trainedNet, ...
        modelInput, ...
        'ExecutionEnvironment','cpu');

    executionEnvironment = "CPU";

end


%% =========================================================
% 9. EXTRACT QUALITY RESULT
% ==========================================================

qualityClass = ...
    string(predictedLabel);


% ---------------------------------------------------------
% Find predicted class index
% ---------------------------------------------------------

classIndex = ...
    find( ...
        string(classNames) == qualityClass, ...
        1);


if isempty(classIndex)

    error( ...
        'Predicted class "%s" not found.', ...
        qualityClass);

end


% ---------------------------------------------------------
% Probability vector
% ---------------------------------------------------------

classProbabilities = ...
    double(scores);


classProbabilities = ...
    reshape( ...
        classProbabilities, ...
        1,[]);


confidence = ...
    classProbabilities(classIndex);


%% =========================================================
% 10. QUALITY-GATE DECISION
% ==========================================================

switch qualityClass

    case "Good"

        decision = ...
            "ACCEPT";

        explanation = ...
            "Image quality is suitable for automated DR analysis.";


    case "Usable"

        decision = ...
            "ACCEPT_FLAG";

        explanation = ...
            "Image is usable for screening but has reduced image-quality margin. Review the quality flag with the result.";


    case "Reject"

        decision = ...
            "RECAPTURE";

        explanation = ...
            "Image quality is insufficient for reliable automated DR analysis. Recapture the retinal image.";

    otherwise

        decision = ...
            "REVIEW";

        explanation = ...
            "Quality classification is uncertain and requires review.";

end


%% =========================================================
% 11. QUALITY RESULT STRUCTURE
% ==========================================================

result = struct();


% ---------------------------------------------------------
% Basic information
% ---------------------------------------------------------

result.imagePath = ...
    imagePath;


result.status = ...
    "SUCCESS";


% ---------------------------------------------------------
% Quality classifier
% ---------------------------------------------------------

result.qualityClass = ...
    qualityClass;


result.confidence = ...
    confidence;


result.classIndex = ...
    classIndex;


result.classNames = ...
    classNames;


result.classProbabilities = ...
    classProbabilities;


% ---------------------------------------------------------
% Handcrafted IQA measurements
% ---------------------------------------------------------

result.sharpness = ...
    sharpness;


result.illumination = ...
    illumination;


result.fovCoverage = ...
    fovCoverage;


result.artifactArea = ...
    artifactArea;


result.artifactMask = ...
    artifactMask;


result.artifactType = ...
    artifactType;


% ---------------------------------------------------------
% Operational decision
% ---------------------------------------------------------

result.decision = ...
    decision;


result.explanation = ...
    explanation;


result.executionEnvironment = ...
    executionEnvironment;


result.inputSize = ...
    inputSize;


result.modelPath = ...
    modelPath;


%% =========================================================
% 12. CONSOLE OUTPUT
% ==========================================================

fprintf('\n===============================================\n');
fprintf('EYEQ QUALITY GATE RESULT\n');
fprintf('===============================================\n');

fprintf('Image              : %s\n', ...
    imagePath);

fprintf('Quality Class      : %s\n', ...
    qualityClass);

fprintf('Confidence         : %.2f%%\n', ...
    confidence * 100);

fprintf('Decision            : %s\n', ...
    decision);

fprintf('Sharpness          : %.6f\n', ...
    sharpness);

fprintf('Illumination       : %.4f\n', ...
    illumination);

fprintf('FOV Coverage       : %.2f%%\n', ...
    fovCoverage);

fprintf('Artifact Area      : %.4f%%\n', ...
    artifactArea);

fprintf('Artifact Type      : %s\n', ...
    artifactType);

fprintf('Execution          : %s\n', ...
    executionEnvironment);

fprintf('Explanation        : %s\n', ...
    explanation);

fprintf('===============================================\n');


end