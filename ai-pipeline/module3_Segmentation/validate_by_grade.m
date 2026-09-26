clc;
clear;
close all;

fprintf('============================================\n');
fprintf('     MODULE 3 - DR GRADE VALIDATION\n');
fprintf('============================================\n\n');

%% Project paths

projectFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

qualityFile = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Quality_Scored.csv");

imageFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Enhanced", ...
    "images");

%% Load dataset

T = readtable(qualityFile);

%% Select one ACCEPTED image from each DR grade

selectedImages = strings(5,1);
selectedGrades = 0:4;

for grade = 0:4

    idx = T.diagnosis == grade & ...
          T.qualityDecision == "ACCEPT";

    candidates = find(idx);

    if isempty(candidates)
        error("No accepted image found for DR grade %d.", grade);
    end

    % Use the first available accepted image
    selectedImages(grade+1) = ...
        string(T.imageName(candidates(1)));

end

%% Process selected images

for k = 1:5

    imageName = selectedImages(k);
    grade = selectedGrades(k);

    [~,baseName,~] = ...
        fileparts(char(imageName));

    enhancedName = ...
        string(baseName) + "_enhanced.png";

    imagePath = fullfile( ...
        imageFolder, ...
        char(enhancedName));

    fprintf('\nGrade %d: %s\n', ...
        grade, char(enhancedName));

    if ~isfile(imagePath)

        fprintf('  Enhanced image not found.\n');
        continue;

    end

    %% Read image

    img = imread(imagePath);

    %% Segmentation

    [lesionMask,vesselMask] = ...
        segment_lesions(img);

    %% Coverage

    vesselCoverage = ...
        100 * nnz(vesselMask) / numel(vesselMask);

    lesionCoverage = ...
        100 * nnz(lesionMask) / numel(lesionMask);

    fprintf('  Vessel coverage : %.2f%%\n', ...
        vesselCoverage);

    fprintf('  Lesion coverage : %.2f%%\n', ...
        lesionCoverage);

    %% Lesion overlay

    lesionOverlay = im2double(img);

    lesionOverlay(:,:,1) = ...
        max(lesionOverlay(:,:,1), ...
        double(lesionMask));

    lesionOverlay(:,:,2) = ...
        lesionOverlay(:,:,2) .* ...
        ~lesionMask;

    lesionOverlay(:,:,3) = ...
        lesionOverlay(:,:,3) .* ...
        ~lesionMask;

    %% Vessel overlay

    vesselOverlay = im2double(img);

    vesselOverlay(:,:,1) = ...
        vesselOverlay(:,:,1) .* ...
        ~vesselMask;

    vesselOverlay(:,:,2) = ...
        max(vesselOverlay(:,:,2), ...
        double(vesselMask));

    vesselOverlay(:,:,3) = ...
        vesselOverlay(:,:,3) .* ...
        ~vesselMask;

    %% Display

    figure( ...
        'Name', ...
        sprintf('DR Grade %d - %s', ...
        grade, char(enhancedName)), ...
        'NumberTitle','off');

    tiledlayout(2,3, ...
        'TileSpacing','compact', ...
        'Padding','compact');

    nexttile;
    imshow(img);
    title(sprintf('Grade %d - Enhanced Fundus',grade));

    nexttile;
    imshow(lesionMask);
    title(sprintf('Lesion Mask - %.2f%%', ...
        lesionCoverage));

    nexttile;
    imshow(lesionOverlay);
    title('Lesion Candidates');

    nexttile;
    imshow(vesselMask);
    title(sprintf('Vessel Mask - %.2f%%', ...
        vesselCoverage));

    nexttile;
    imshow(vesselOverlay);
    title('Vessel Overlay');

    nexttile;
    imshow(img);
    hold on;
    visboundaries(lesionMask, ...
        'Color','r', ...
        'LineWidth',0.5);
    title('Final Lesion Evidence');
    hold off;

    sgtitle(sprintf( ...
        'APTOS DR Grade %d',grade));

end

fprintf('\n============================================\n');
fprintf('       GRADE VALIDATION COMPLETE\n');
fprintf('============================================\n');