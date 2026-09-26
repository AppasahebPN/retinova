clc;
clear;
close all;

fprintf('============================================\n');
fprintf('   MODULE 3 - RETINAL LESION SEGMENTATION\n');
fprintf('============================================\n\n');

%% ---------------------------------------------------------
% PROJECT PATHS
% ----------------------------------------------------------

projectFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

imageFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Enhanced", ...
    "images");

outputFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Segmentation");

%% Create output folder

if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

%% ---------------------------------------------------------
% FIND ENHANCED IMAGES
% ----------------------------------------------------------

imageFiles = dir(fullfile( ...
    imageFolder, ...
    "*_enhanced.png"));

fprintf("Enhanced images found: %d\n\n", ...
    length(imageFiles));

if isempty(imageFiles)

    error(['No enhanced images found in: ', ...
           imageFolder]);

end

%% ---------------------------------------------------------
% SELECT ONE IMAGE FOR TESTING
% ---------------------------------------------------------
% IMPORTANT:
% We are testing ONE image only.
% Do not process the complete dataset yet.

testIndex = 1;

imageName = imageFiles(testIndex).name;

imagePath = fullfile( ...
    imageFiles(testIndex).folder, ...
    imageName);

fprintf("Testing image:\n");
fprintf("%s\n\n", imageName);

%% ---------------------------------------------------------
% READ IMAGE
% ----------------------------------------------------------

img = imread(imagePath);

fprintf("Image size: %d x %d\n", ...
    size(img,1), size(img,2));

%% ---------------------------------------------------------
% RUN SEGMENTATION
% ----------------------------------------------------------

fprintf("Running vessel and lesion segmentation...\n");

[lesionMask, vesselMask] = ...
    segment_lesions(img);

fprintf("Segmentation completed.\n\n");

%% ---------------------------------------------------------
% CALCULATE COVERAGE
% ----------------------------------------------------------

totalPixels = numel(vesselMask);

vesselPixels = nnz(vesselMask);

lesionPixels = nnz(lesionMask);

vesselCoverage = ...
    100 * vesselPixels / totalPixels;

lesionCoverage = ...
    100 * lesionPixels / totalPixels;

fprintf('============================================\n');
fprintf('SEGMENTATION RESULTS\n');
fprintf('============================================\n');

fprintf('Image              : %s\n', imageName);

fprintf('Vessel pixels      : %d\n', vesselPixels);

fprintf('Vessel coverage    : %.2f%%\n', ...
    vesselCoverage);

fprintf('Lesion pixels      : %d\n', lesionPixels);

fprintf('Lesion coverage    : %.2f%%\n', ...
    lesionCoverage);

fprintf('============================================\n\n');

%% ---------------------------------------------------------
% CREATE LESION OVERLAY
% ----------------------------------------------------------

lesionOverlay = im2double(img);

% Make lesion regions red

red = lesionOverlay(:,:,1);
green = lesionOverlay(:,:,2);
blue = lesionOverlay(:,:,3);

red(lesionMask) = 1;

green(lesionMask) = ...
    green(lesionMask) * 0.25;

blue(lesionMask) = ...
    blue(lesionMask) * 0.25;

lesionOverlay(:,:,1) = red;
lesionOverlay(:,:,2) = green;
lesionOverlay(:,:,3) = blue;

%% ---------------------------------------------------------
% CREATE VESSEL OVERLAY
% ----------------------------------------------------------

vesselOverlay = im2double(img);

red = vesselOverlay(:,:,1);
green = vesselOverlay(:,:,2);
blue = vesselOverlay(:,:,3);

% Make vessels green

red(vesselMask) = ...
    red(vesselMask) * 0.2;

green(vesselMask) = 1;

blue(vesselMask) = ...
    blue(vesselMask) * 0.2;

vesselOverlay(:,:,1) = red;
vesselOverlay(:,:,2) = green;
vesselOverlay(:,:,3) = blue;

%% ---------------------------------------------------------
% CREATE FINAL EVIDENCE IMAGE
% ----------------------------------------------------------

finalEvidence = im2double(img);

% Blend lesion evidence

finalEvidence(:,:,1) = ...
    finalEvidence(:,:,1) .* ~lesionMask + ...
    1.0 .* lesionMask;

finalEvidence(:,:,2) = ...
    finalEvidence(:,:,2) .* ~lesionMask + ...
    0.20 .* lesionMask;

finalEvidence(:,:,3) = ...
    finalEvidence(:,:,3) .* ~lesionMask + ...
    0.20 .* lesionMask;

%% ---------------------------------------------------------
% DISPLAY RESULTS
% ----------------------------------------------------------

figure( ...
    'Name','Retinal Lesion Segmentation', ...
    'NumberTitle','off', ...
    'Color','black', ...
    'WindowState','maximized');

tiledlayout(2,3, ...
    'TileSpacing','compact', ...
    'Padding','compact');

%% Panel 1

nexttile;

imshow(img);

title( ...
    'Enhanced Fundus', ...
    'Color','white');

%% Panel 2

nexttile;

imshow(lesionMask);

title( ...
    'Lesion Mask', ...
    'Color','white');

%% Panel 3

nexttile;

imshow(lesionOverlay);

title( ...
    'Lesion Overlay', ...
    'Color','white');

%% Panel 4

nexttile;

imshow(vesselMask);

title( ...
    sprintf('Vessel Mask - %.2f%%', ...
    vesselCoverage), ...
    'Color','white');

%% Panel 5

nexttile;

imshow(vesselOverlay);

title( ...
    'Vessel Overlay', ...
    'Color','white');

%% Panel 6

nexttile;

imshow(finalEvidence);

title( ...
    'Final Lesion Evidence', ...
    'Color','white');

%% Overall title

sgtitle( ...
    ['Segmentation Test: ', imageName], ...
    'Color','white', ...
    'Interpreter','none');

%% ---------------------------------------------------------
% SAVE TEST RESULTS
% ----------------------------------------------------------

[~,baseName,~] = ...
    fileparts(imageName);

lesionMaskFile = fullfile( ...
    outputFolder, ...
    baseName + "_lesion_mask.png");

vesselMaskFile = fullfile( ...
    outputFolder, ...
    baseName + "_vessel_mask.png");

lesionOverlayFile = fullfile( ...
    outputFolder, ...
    baseName + "_lesion_overlay.png");

vesselOverlayFile = fullfile( ...
    outputFolder, ...
    baseName + "_vessel_overlay.png");

evidenceFile = fullfile( ...
    outputFolder, ...
    baseName + "_lesion_evidence.png");

imwrite(lesionMask, lesionMaskFile);

imwrite(vesselMask, vesselMaskFile);

imwrite(lesionOverlay, lesionOverlayFile);

imwrite(vesselOverlay, vesselOverlayFile);

imwrite(finalEvidence, evidenceFile);

fprintf('Test results saved to:\n');
fprintf('%s\n', outputFolder);

fprintf('\n============================================\n');
fprintf('       SINGLE IMAGE TEST COMPLETE\n');
fprintf('============================================\n');