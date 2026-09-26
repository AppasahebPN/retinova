clc;
clear;
close all;

%% MODULE 1 - IMAGE QUALITY ASSESSMENT

disp('====================================');
disp('DIABETIC RETINOPATHY SCREENING');
disp('MODULE 1 - IMAGE QUALITY ASSESSMENT');
disp('====================================');

%% Select a fundus image

[fileName, filePath] = uigetfile( ...
    {'*.jpg;*.jpeg;*.png;*.tif;*.tiff', ...
    'Fundus Images'}, ...
    'Select a Fundus Image');

% Check if user cancelled
if isequal(fileName, 0)
    disp('No image selected.');
    return;
end

%% Read the image

imagePath = fullfile(filePath, fileName);
img = imread(imagePath);

%% Display original image

figure('Name', 'Fundus Image');

imshow(img);

title('Original Fundus Image');

%% Calculate sharpness

sharpnessScore = calculateSharpness(img);
%% Calculate illumination

[illuminationScore, uniformityMap] = calculateIllumination(img);
%% Calculate field of view

[fovCoverage, fovMask] = checkFOV(img);
%% Detect artifacts

[artifactScore, artifactMask, artifactType] = ...
    detectArtifacts(img, fovMask);
%% Display result

fprintf('\n');
fprintf('====================================\n');
fprintf('IMAGE QUALITY RESULTS\n');
fprintf('====================================\n');

fprintf('Image: %s\n', fileName);

fprintf('Sharpness Score: %.6f\n', sharpnessScore);
fprintf('Illumination Score: %.6f\n', illuminationScore);
fprintf('FOV Coverage: %.2f%%\n', fovCoverage);
fprintf('Artifact Area: %.2f%% of FOV\n', artifactScore);
fprintf('Artifact Type: %s\n', artifactType);
fprintf('====================================\n');
%% Display FOV detection

figure('Name', 'FOV Detection');

subplot(1,2,1);
imshow(img);
title('Original Fundus Image');

subplot(1,2,2);
imshow(fovMask);
title(sprintf('Detected FOV - %.2f%% Coverage', fovCoverage));
%% Display artifact detection

figure('Name', 'Artifact Detection');

subplot(1,2,1);
imshow(img);
title('Original Fundus Image');

subplot(1,2,2);
imshow(artifactMask);
title(sprintf('Detected Artifacts - %.2f%%', artifactScore));

%% Generate IQA Report

IQA_Report( ...
    fileName, ...
    sharpnessScore, ...
    illuminationScore, ...
    fovCoverage, ...
    artifactScore, ...
    artifactType);