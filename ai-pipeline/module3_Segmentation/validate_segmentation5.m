clc;
clear;
close all;

projectFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

imageFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Enhanced", ...
    "images");

files = dir(fullfile( ...
    imageFolder, ...
    "*_enhanced.png"));

N = min(10,length(files));

vesselCoverage = zeros(N,1);
lesionCoverage = zeros(N,1);
elapsedTime = zeros(N,1);

fprintf('============================================\n');
fprintf('      10 IMAGE CPU PERFORMANCE TEST\n');
fprintf('============================================\n\n');

for k = 1:N

    imagePath = fullfile( ...
        files(k).folder, ...
        files(k).name);

    img = imread(imagePath);

    tic;

    [lesionMask,vesselMask] = ...
        segment_lesions(img);

    elapsedTime(k) = toc;

    vesselCoverage(k) = ...
        100 * nnz(vesselMask) / numel(vesselMask);

    lesionCoverage(k) = ...
        100 * nnz(lesionMask) / numel(lesionMask);

    fprintf('%2d/%d  %s\n', ...
        k,N,files(k).name);

    fprintf('       Time     : %.2f seconds\n', ...
        elapsedTime(k));

    fprintf('       Vessel   : %.2f%%\n', ...
        vesselCoverage(k));

    fprintf('       Lesion   : %.2f%%\n\n', ...
        lesionCoverage(k));

end

fprintf('============================================\n');
fprintf('             PERFORMANCE SUMMARY\n');
fprintf('============================================\n');

fprintf('Images tested       : %d\n',N);

fprintf('Average time/image  : %.2f seconds\n', ...
    mean(elapsedTime));

fprintf('Estimated 2502 time : %.2f minutes\n', ...
    mean(elapsedTime) * 2502 / 60);

fprintf('============================================\n');