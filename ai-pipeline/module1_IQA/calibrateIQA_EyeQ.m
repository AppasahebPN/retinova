clc;
clear;
close all;

fprintf('============================================================\n');
fprintf('       EYEQ-BASED IQA THRESHOLD CALIBRATION\n');
fprintf('============================================================\n');

%% PATHS

rootFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

eyeQLabelFolder = fullfile(rootFolder,"data","EyeQ","data");

eyePACSFolder = ...
    fullfile(rootFolder,"data","EyePACS","download","train","extracted","train");

aptosFeatureFile = ...
    fullfile(rootFolder,"results","APTOS_IQA_Features.csv");

outputFolder = fullfile(rootFolder,"results","EyeQ");

if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

%% LOAD EYEQ LABELS

labelFile = fullfile(eyeQLabelFolder,"Label_EyeQ_train.csv");

fprintf('\nLoading EyeQ labels...\n');

EyeQ = readtable(labelFile,"VariableNamingRule","preserve");

fprintf('EyeQ images: %d\n',height(EyeQ));

disp(EyeQ.Properties.VariableNames');

%% EXTRACT QUALITY LABELS SAFELY

qualityRaw = EyeQ.("quality");

% Convert regardless of whether MATLAB read it as cell/string/categorical
if iscell(qualityRaw)
    quality = string(qualityRaw);
elseif iscategorical(qualityRaw)
    quality = string(qualityRaw);
elseif isstring(qualityRaw)
    quality = qualityRaw;
else
    quality = string(qualityRaw);
end

quality = strtrim(quality);

fprintf('\nFirst 20 raw quality labels:\n');
disp(quality(1:min(20,end)));

fprintf('\nUnique quality labels detected:\n');
disp(unique(quality));

%% STANDARDIZE EYEQ LABELS
% EyeQ numeric encoding:
% 0 = Good
% 1 = Usable
% 2 = Reject

quality = strtrim(string(quality));

qualityNum = str2double(quality);

qualityStd = strings(height(EyeQ),1);

qualityStd(qualityNum == 0) = "Good";
qualityStd(qualityNum == 1) = "Usable";
qualityStd(qualityNum == 2) = "Reject";

validQuality = qualityStd ~= "";

fprintf('\nQuality distribution:\n');
fprintf('Good   : %d\n', sum(qualityStd == "Good"));
fprintf('Usable : %d\n', sum(qualityStd == "Usable"));
fprintf('Reject : %d\n', sum(qualityStd == "Reject"));
fprintf('Unknown: %d\n', sum(~validQuality));

if sum(validQuality) == 0
    error(['No valid EyeQ quality labels detected. ', ...
           'Expected numeric labels: 0=Good, 1=Usable, 2=Reject.']);
end

% Keep only valid rows
EyeQ = EyeQ(validQuality,:);

qualityStd = qualityStd(validQuality);

eyeQImageNames = string(EyeQ.("image"));
%% FIND EYEPACS IMAGES

fprintf('\nSearching EyePACS images...\n');

imageFiles = dir(fullfile(eyePACSFolder,"**","*.jpeg"));

fprintf('EyePACS JPEG files found: %d\n',numel(imageFiles));

if isempty(imageFiles)
    error('No EyePACS JPEG images found.');
end

%% CREATE FILENAME LOOKUP

fprintf('Creating filename lookup...\n');

allNames = strings(numel(imageFiles),1);

for i = 1:numel(imageFiles)
    allNames(i) = string(imageFiles(i).name);
end

% EyeQ names should normally be like 116_right
% EyePACS files are 116_right.jpeg

lookupNames = eyeQImageNames;

hasExtension = endsWith(lower(lookupNames),".jpeg");

lookupNames(~hasExtension) = lookupNames(~hasExtension) + ".jpeg";

[found,loc] = ismember(lookupNames,allNames);

fprintf('Matched EyeQ images: %d / %d\n', ...
    sum(found),numel(found));

if any(~found)
    fprintf('Missing images: %d\n',sum(~found));
end

%% KEEP MATCHED DATA

eyeQImageNames = eyeQImageNames(found);
qualityStd = qualityStd(found);
loc = loc(found);

N = numel(loc);

fprintf('\nImages available for calibration: %d\n',N);

if N < 100
    error('Too few matched EyeQ images. Expected approximately 12543.');
end

%% LOAD APTOS FEATURES

fprintf('\nLoading APTOS IQA features...\n');

APTOS = readtable(aptosFeatureFile);

fprintf('APTOS images: %d\n',height(APTOS));

%% APTOS SHARPNESS NORMALIZATION

sharpMin = min(APTOS.sharpness);
sharpMax = max(APTOS.sharpness);

fprintf('\nAPTOS normalization:\n');
fprintf('Sharpness Min = %.10f\n',sharpMin);
fprintf('Sharpness Max = %.10f\n',sharpMax);

%% PREALLOCATE

sharpness = zeros(N,1);
illumination = zeros(N,1);
fovCoverage = zeros(N,1);
artifactArea = zeros(N,1);
qualityScore = zeros(N,1);

fprintf('\n============================================================\n');
fprintf('      EXTRACTING MODULE 1 FEATURES FROM EYEQ\n');
fprintf('============================================================\n');

tic;

for k = 1:N

    filePath = fullfile( ...
        imageFiles(loc(k)).folder, ...
        imageFiles(loc(k)).name);

    img = imread(filePath);

    % Sharpness
    sharpness(k) = calculateSharpness(img);

    % Illumination
    illumination(k) = calculateIllumination(img);

    % FOV
    [fovCoverage(k),fovMask] = checkFOV(img);

    % Artifact
    artifactArea(k) = detectArtifacts(img,fovMask);

    % Same normalization as original Module 1
    if sharpMax > sharpMin
        sharpNorm = ...
            (sharpness(k)-sharpMin) / ...
            (sharpMax-sharpMin);
    else
        sharpNorm = 0;
    end

    sharpNorm = max(0,min(1,sharpNorm));

    illumNorm = illumination(k);
    fovNorm = fovCoverage(k)/100;
    artifactNorm = artifactArea(k)/100;

    % ORIGINAL MODULE 1 QUALITY SCORE
    qualityScore(k) = ...
        0.35*sharpNorm + ...
        0.25*illumNorm + ...
        0.25*fovNorm + ...
        0.15*(1-artifactNorm);

    if mod(k,250)==0 || k==N
        fprintf('Processed %d / %d (%.1f%%)\n', ...
            k,N,100*k/N);
    end
end

elapsedTime = toc;

fprintf('\nFeature extraction time: %.2f minutes\n', ...
    elapsedTime/60);

%% CALIBRATION TABLE

Calibration = table( ...
    eyeQImageNames, ...
    qualityStd, ...
    sharpness, ...
    illumination, ...
    fovCoverage, ...
    artifactArea, ...
    qualityScore, ...
    'VariableNames', { ...
    'imageName', ...
    'quality', ...
    'sharpness', ...
    'illumination', ...
    'fovCoverage', ...
    'artifactArea', ...
    'qualityScore'});

%% REMOVE INVALID SCORES

valid = isfinite(Calibration.qualityScore);

Calibration = Calibration(valid,:);

fprintf('\nValid calibration samples: %d\n',height(Calibration));

%% STRATIFIED TRAIN / VALIDATION SPLIT

rng(42);

Y = categorical( ...
    Calibration.quality, ...
    ["Reject","Usable","Good"]);

cv = cvpartition(Y,"HoldOut",0.20);

trainIdx = training(cv);
valIdx = test(cv);

Train = Calibration(trainIdx,:);
Val = Calibration(valIdx,:);

fprintf('\nCalibration split:\n');
fprintf('Training   : %d\n',height(Train));
fprintf('Validation : %d\n',height(Val));

%% THRESHOLD SEARCH

fprintf('\n============================================================\n');
fprintf('          SEARCHING FOR OPTIMAL THRESHOLDS\n');
fprintf('============================================================\n');

scoresTrain = Train.qualityScore;

labelsTrain = categorical( ...
    Train.quality, ...
    ["Reject","Usable","Good"]);

candidate = linspace( ...
    min(scoresTrain), ...
    max(scoresTrain), ...
    300);

bestBalancedAccuracy = -Inf;
bestRejectThreshold = NaN;
bestGoodThreshold = NaN;

for i = 1:numel(candidate)-1

    tReject = candidate(i);

    for j = i+1:numel(candidate)

        tGood = candidate(j);

        predicted = strings(height(Train),1);

        predicted(scoresTrain < tReject) = "Reject";

        predicted(scoresTrain >= tReject & ...
                  scoresTrain < tGood) = "Usable";

        predicted(scoresTrain >= tGood) = "Good";

        predicted = categorical( ...
            predicted, ...
            ["Reject","Usable","Good"]);

        recalls = zeros(3,1);

        classNames = ["Reject","Usable","Good"];

        for c = 1:3

            actual = labelsTrain == classNames(c);
            pred = predicted == classNames(c);

            TP = sum(actual & pred);
            FN = sum(actual & ~pred);

            if TP + FN > 0
                recalls(c) = TP/(TP+FN);
            end
        end

        balancedAccuracy = mean(recalls);

        if balancedAccuracy > bestBalancedAccuracy

            bestBalancedAccuracy = balancedAccuracy;
            bestRejectThreshold = tReject;
            bestGoodThreshold = tGood;

        end
    end
end

%% DISPLAY THRESHOLDS

fprintf('\nCALIBRATED THRESHOLDS\n');
fprintf('--------------------------------------------\n');

fprintf('Reject threshold : %.6f\n', ...
    bestRejectThreshold);

fprintf('Good threshold   : %.6f\n', ...
    bestGoodThreshold);

fprintf('Training balanced accuracy: %.2f%%\n', ...
    100*bestBalancedAccuracy);

%% VALIDATION

scoresVal = Val.qualityScore;

predictedVal = strings(height(Val),1);

predictedVal(scoresVal < bestRejectThreshold) = "Reject";

predictedVal(scoresVal >= bestRejectThreshold & ...
             scoresVal < bestGoodThreshold) = "Usable";

predictedVal(scoresVal >= bestGoodThreshold) = "Good";

actualVal = categorical( ...
    Val.quality, ...
    ["Reject","Usable","Good"]);

predictedVal = categorical( ...
    predictedVal, ...
    ["Reject","Usable","Good"]);

%% METRICS

valAccuracy = mean(predictedVal == actualVal);

fprintf('\n============================================================\n');
fprintf('             EYEQ IQA CALIBRATION RESULTS\n');
fprintf('============================================================\n');

fprintf('Validation Accuracy: %.2f%%\n', ...
    100*valAccuracy);

classes = ["Reject","Usable","Good"];

recallValues = zeros(3,1);

for i = 1:3

    actual = actualVal == classes(i);
    predicted = predictedVal == classes(i);

    TP = sum(actual & predicted);
    FN = sum(actual & ~predicted);

    if TP+FN > 0
        recallValues(i) = TP/(TP+FN);
    end

    fprintf('%s Recall: %.2f%%\n', ...
        classes(i),100*recallValues(i));
end

balancedValAccuracy = mean(recallValues);

fprintf('Balanced Accuracy: %.2f%%\n', ...
    100*balancedValAccuracy);

%% CONFUSION MATRIX

figure('Name','EyeQ IQA Calibration');

confusionchart(actualVal,predictedVal);

title(sprintf( ...
    'EyeQ IQA Calibration | Accuracy %.2f%%', ...
    100*valAccuracy));

%% SAVE PARAMETERS

calibrationFile = ...
    fullfile(outputFolder,"IQA_EyeQ_Calibration.mat");

save(calibrationFile, ...
    "bestRejectThreshold", ...
    "bestGoodThreshold", ...
    "bestBalancedAccuracy", ...
    "valAccuracy", ...
    "balancedValAccuracy", ...
    "sharpMin", ...
    "sharpMax");

%% SAVE DATA

csvFile = ...
    fullfile(outputFolder,"EyeQ_IQA_Calibration_Data.csv");

writetable(Calibration,csvFile);

fprintf('\n============================================================\n');
fprintf('                 CALIBRATION COMPLETE\n');
fprintf('============================================================\n');

fprintf('EyeQ samples used: %d\n',height(Calibration));

fprintf('Reject threshold : %.6f\n', ...
    bestRejectThreshold);

fprintf('Good threshold   : %.6f\n', ...
    bestGoodThreshold);

fprintf('Validation accuracy : %.2f%%\n', ...
    100*valAccuracy);

fprintf('Balanced accuracy   : %.2f%%\n', ...
    100*balancedValAccuracy);

fprintf('\nSaved:\n');
fprintf('%s\n',calibrationFile);
fprintf('%s\n',csvFile);

fprintf('============================================================\n');