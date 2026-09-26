clc;
clear;
close all;

fprintf('============================================\n');
fprintf('       IMAGE QUALITY SCORING MODULE\n');
fprintf('============================================\n');

%% Input file

inputFile = fullfile('..', 'results', 'APTOS_IQA_Combined.csv');

T = readtable(inputFile);

fprintf('Total images: %d\n', height(T));

%% Normalize IQA features

sharpNorm = (T.sharpness - min(T.sharpness)) ./ ...
    (max(T.sharpness) - min(T.sharpness));

illumNorm = T.illumination;

fovNorm = T.fovCoverage / 100;

artifactNorm = T.artifactArea / 100;

%% Calculate Quality Score

T.qualityScore = ...
    0.35 * sharpNorm + ...
    0.25 * illumNorm + ...
    0.25 * fovNorm + ...
    0.15 * (1 - artifactNorm);

%% Quality Decision

T.qualityDecision = strings(height(T),1);

for i = 1:height(T)

    if T.qualityScore(i) >= 0.60
        T.qualityDecision(i) = "ACCEPT";
    else
        T.qualityDecision(i) = "REJECT";
    end

end

%% Quality Statistics

acceptCount = sum(T.qualityDecision == "ACCEPT");
rejectCount = sum(T.qualityDecision == "REJECT");

fprintf('\n============================================\n');
fprintf('        QUALITY ASSESSMENT RESULTS\n');
fprintf('============================================\n');

fprintf('Accepted images : %d (%.2f%%)\n', ...
    acceptCount, 100*acceptCount/height(T));

fprintf('Rejected images : %d (%.2f%%)\n', ...
    rejectCount, 100*rejectCount/height(T));

fprintf('Average Quality Score : %.4f\n', ...
    mean(T.qualityScore));

fprintf('Minimum Quality Score : %.4f\n', ...
    min(T.qualityScore));

fprintf('Maximum Quality Score : %.4f\n', ...
    max(T.qualityScore));

%% Save scored dataset

outputFile = fullfile('..', 'results', ...
    'APTOS_Quality_Scored.csv');

writetable(T, outputFile);

fprintf('\nResults saved to:\n%s\n', outputFile);

%% Lowest Quality Images

[sortedScores, idx] = sort(T.qualityScore, 'ascend');

fprintf('\n============================================\n');
fprintf('          LOWEST QUALITY IMAGES\n');
fprintf('============================================\n');

numToShow = min(9, height(T));

for k = 1:numToShow

    i = idx(k);

    imageName = string(T.imageName{i});
    decision = string(T.qualityDecision(i));

    fprintf('%d. %s | Score = %.4f | %s\n', ...
        k, char(imageName), ...
        sortedScores(k), char(decision));

end

%% Display Lowest Quality Images

imageFolder = fullfile('..', 'data', ...
    'APTOS', 'train_images');

figure('Name','Lowest Quality Images', ...
       'WindowState','maximized');

tiledlayout(3,3, ...
    'TileSpacing','compact', ...
    'Padding','compact');

for k = 1:numToShow

    i = idx(k);

    imageName = string(T.imageName{i});

    imagePath = fullfile( ...
        imageFolder, char(imageName));

    nexttile;

    if isfile(imagePath)

        img = imread(imagePath);

        imshow(img);

        title(sprintf('%d: %s\nScore = %.3f | %s', ...
            k, ...
            char(imageName), ...
            T.qualityScore(i), ...
            char(string(T.qualityDecision(i)))), ...
            'Interpreter','none');

    else

        axis off;

        title(sprintf('%d: IMAGE NOT FOUND\n%s', ...
            k, char(imageName)), ...
            'Interpreter','none');

    end

end

sgtitle('Lowest Quality APTOS Images');

fprintf('\n============================================\n');
fprintf('        QUALITY SCORING COMPLETE\n');
fprintf('============================================\n');