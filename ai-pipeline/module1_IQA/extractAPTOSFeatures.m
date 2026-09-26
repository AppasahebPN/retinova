clc;
clear;
close all;

%% APTOS IQA FEATURE EXTRACTION

fprintf('============================================\n');
fprintf('       APTOS IQA FEATURE EXTRACTION\n');
fprintf('============================================\n');

%% Paths

imageFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\data\APTOS\train_images";

outputFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\results";

%% Find images

imageFiles = [
    dir(fullfile(imageFolder, "*.png"));
    dir(fullfile(imageFolder, "*.jpg"));
    dir(fullfile(imageFolder, "*.jpeg"));
];

numImages = length(imageFiles);

fprintf('Images found: %d\n', numImages);

if numImages == 0
    error('No images found in the APTOS train_images folder.');
end

%% Create result table

imageName = strings(numImages, 1);
sharpness = zeros(numImages, 1);
illumination = zeros(numImages, 1);
fovCoverage = zeros(numImages, 1);
artifactArea = zeros(numImages, 1);
artifactType = strings(numImages, 1);

%% Process images

fprintf('\nStarting processing...\n');

for k = 1:numImages

    fprintf('Processing image %d/%d: %s\n', ...
        k, numImages, imageFiles(k).name);

    % Image filename
    imageName(k) = string(imageFiles(k).name);

    % Full image path
    imagePath = fullfile( ...
        imageFiles(k).folder, ...
        imageFiles(k).name);

    % Read image
    img = imread(imagePath);

    % Sharpness
    sharpness(k) = calculateSharpness(img);

    % Illumination
    [illumination(k), ~] = ...
        calculateIllumination(img);

    % FOV
    [fovCoverage(k), fovMask] = ...
        checkFOV(img);

    % Artifacts
    [artifactArea(k), ~, artifactType(k)] = ...
        detectArtifacts(img, fovMask);

end

%% Create table

IQA_Features = table( ...
    imageName, ...
    sharpness, ...
    illumination, ...
    fovCoverage, ...
    artifactArea, ...
    artifactType);

%% Save results

if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

outputFile = fullfile( ...
    outputFolder, ...
    "APTOS_IQA_Features.csv");

writetable(IQA_Features, outputFile);

%% Display summary

fprintf('\n============================================\n');
fprintf('          PROCESSING COMPLETED\n');
fprintf('============================================\n');

fprintf('Total images processed : %d\n', numImages);

fprintf('Average sharpness      : %.6f\n', ...
    mean(sharpness));

fprintf('Average illumination   : %.6f\n', ...
    mean(illumination));

fprintf('Average FOV coverage   : %.2f%%\n', ...
    mean(fovCoverage));

fprintf('Average artifact area  : %.2f%%\n', ...
    mean(artifactArea));

fprintf('\nResults saved to:\n');
fprintf('%s\n', outputFile);

fprintf('============================================\n');