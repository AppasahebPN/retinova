clc;
clear;
close all;

fprintf('============================================\n');
fprintf('          WORST IQA IMAGE ANALYSIS\n');
fprintf('============================================\n');

%% Load IQA dataset

file = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\results\APTOS_IQA_Combined.csv";

T = readtable(file);

%% Number of images to inspect

N = 10;

%% ------------------------------------------------
% 1. Lowest Sharpness
% -------------------------------------------------

[~, idxSharp] = sort(T.sharpness, 'ascend');

fprintf('\n10 LOWEST SHARPNESS IMAGES\n');
fprintf('---------------------------\n');

for k = 1:min(N,height(T))

    i = idxSharp(k);

    fprintf('%2d. %s | Sharpness = %.8f\n', ...
        k, T.imageName{i}, T.sharpness(i));

end

%% ------------------------------------------------
% 2. Lowest Illumination
% -------------------------------------------------

[~, idxIllum] = sort(T.illumination, 'ascend');

fprintf('\n10 LOWEST ILLUMINATION IMAGES\n');
fprintf('-----------------------------\n');

for k = 1:min(N,height(T))

    i = idxIllum(k);

    fprintf('%2d. %s | Illumination = %.6f\n', ...
        k, T.imageName{i}, T.illumination(i));

end

%% ------------------------------------------------
% 3. Lowest FOV
% -------------------------------------------------

[~, idxFOV] = sort(T.fovCoverage, 'ascend');

fprintf('\n10 LOWEST FOV IMAGES\n');
fprintf('--------------------\n');

for k = 1:min(N,height(T))

    i = idxFOV(k);

    fprintf('%2d. %s | FOV = %.2f%%\n', ...
        k, T.imageName{i}, T.fovCoverage(i));

end

%% ------------------------------------------------
% 4. Highest Artifact Area
% -------------------------------------------------

[~, idxArtifact] = sort(T.artifactArea, 'descend');

fprintf('\n10 HIGHEST ARTIFACT IMAGES\n');
fprintf('--------------------------\n');

for k = 1:min(N,height(T))

    i = idxArtifact(k);

    fprintf('%2d. %s | Artifact = %.2f%% | %s\n', ...
        k, ...
        T.imageName{i}, ...
        T.artifactArea(i), ...
        T.artifactType{i});

end

fprintf('\n============================================\n');
fprintf('             ANALYSIS COMPLETE\n');
fprintf('============================================\n');