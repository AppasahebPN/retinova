clc;
clear;
close all;

fprintf('====================================================\n');
fprintf('      MODULE 3 - BATCH SEGMENTATION\n');
fprintf('====================================================\n\n');

%% -----------------------------------------------------
% PROJECT PATHS
% ------------------------------------------------------

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

outputFolder = fullfile( ...
    projectFolder, ...
    "results", ...
    "APTOS_Segmentation");

maskFolder = fullfile( ...
    outputFolder, ...
    "masks");

overlayFolder = fullfile( ...
    outputFolder, ...
    "overlays");

featureFile = fullfile( ...
    outputFolder, ...
    "APTOS_Segmentation_Features.csv");

%% -----------------------------------------------------
% CREATE OUTPUT FOLDERS
% ------------------------------------------------------

if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

if ~isfolder(maskFolder)
    mkdir(maskFolder);
end

if ~isfolder(overlayFolder)
    mkdir(overlayFolder);
end

%% -----------------------------------------------------
% LOAD QUALITY DATA
% ------------------------------------------------------

if ~isfile(qualityFile)
    error("Quality file not found:\n%s",qualityFile);
end

T = readtable(qualityFile);

fprintf("Quality records: %d\n",height(T));

%% -----------------------------------------------------
% SELECT ACCEPTED IMAGES
% ------------------------------------------------------

accepted = T.qualityDecision == "ACCEPT";

acceptedTable = T(accepted,:);

fprintf("Accepted images to process: %d\n\n", ...
    height(acceptedTable));

if isempty(acceptedTable)
    error("No accepted images found.");
end

%% -----------------------------------------------------
% RESULT ARRAYS
% ------------------------------------------------------

numImages = height(acceptedTable);

imageNameResult = strings(numImages,1);

diagnosisResult = zeros(numImages,1);

vesselCoverage = zeros(numImages,1);

lesionCoverage = zeros(numImages,1);

totalLesionArea = zeros(numImages,1);

lesionCount = zeros(numImages,1);

brightLesionCount = zeros(numImages,1);

darkLesionCount = zeros(numImages,1);

meanLesionArea = zeros(numImages,1);

statusResult = strings(numImages,1);

%% -----------------------------------------------------
% BATCH PROCESSING
% ------------------------------------------------------

processed = 0;
failed = 0;

fprintf("Starting segmentation...\n\n");

for i = 1:numImages

    %% Image name

    %% Image name

    originalName = acceptedTable.imageName(i);

    % Handle MATLAB table cell/string formats safely
    if iscell(originalName)
        originalName = originalName{1};
    end

    originalName = string(originalName);
    originalName = strtrim(originalName);

    imageNameResult(i) = originalName;

    diagnosisResult(i) = ...
        acceptedTable.diagnosis(i);

    % Remove original extension
    baseName = erase(originalName, ".png");
    baseName = erase(baseName, ".jpg");
    baseName = erase(baseName, ".jpeg");

    % Build enhanced filename
    enhancedName = baseName + "_enhanced.png";

    imagePath = fullfile( ...
        imageFolder, ...
        enhancedName);

    %% Check file

    if ~isfile(imagePath)

        fprintf( ...
            "Missing image %d/%d: %s\n", ...
            i,numImages,enhancedName);

        statusResult(i) = "MISSING";
        failed = failed + 1;

        continue;

    end

    %% Read

    try

        img = imread(imagePath);

        %% Run segmentation

        [lesionMask,vesselMask] = ...
            segment_lesions(img);

        %% -------------------------------------------------
        % VESSEL FEATURES
        % --------------------------------------------------

        vesselCoverage(i) = ...
            100 * nnz(vesselMask) / ...
            numel(vesselMask);

        %% -------------------------------------------------
        % LESION FEATURES
        % --------------------------------------------------

        lesionPixels = nnz(lesionMask);

        totalLesionArea(i) = ...
            lesionPixels;

        lesionCoverage(i) = ...
            100 * lesionPixels / ...
            numel(lesionMask);

        %% Connected lesion components

        CC = bwconncomp(lesionMask);

        lesionCount(i) = CC.NumObjects;

        %% Component areas

        if CC.NumObjects > 0

            componentAreas = ...
                cellfun(@numel, ...
                CC.PixelIdxList);

            meanLesionArea(i) = ...
                mean(componentAreas);

        else

            meanLesionArea(i) = 0;

        end

        %% -------------------------------------------------
        % CLASSIFY CANDIDATES AS BRIGHT/DARK
        % --------------------------------------------------
        %
        % We estimate candidate type again from the image.
        % This is an evidence feature, NOT a clinical label.
        %

        green = im2double(img(:,:,2));

        brightResponse = imtophat( ...
            green, ...
            strel('disk',7));

        darkResponse = imbothat( ...
            green, ...
            strel('disk',4));

        % Restrict to detected lesions

        brightCandidates = ...
            brightResponse .* ...
            double(lesionMask);

        darkCandidates = ...
            darkResponse .* ...
            double(lesionMask);

        % Count connected components with stronger
        % response than their respective median.

        brightThreshold = ...
            median(brightCandidates(lesionMask)) ...
            + eps;

        darkThreshold = ...
            median(darkCandidates(lesionMask)) ...
            + eps;

        brightMask = ...
            brightCandidates >= ...
            brightThreshold;

        darkMask = ...
            darkCandidates >= ...
            darkThreshold;

        % Restrict again to lesion mask

        brightMask = ...
            brightMask & lesionMask;

        darkMask = ...
            darkMask & lesionMask;

        % Connected-component counts

        brightCC = bwconncomp(brightMask);

        darkCC = bwconncomp(darkMask);

        brightLesionCount(i) = ...
            brightCC.NumObjects;

        darkLesionCount(i) = ...
            darkCC.NumObjects;

        %% -------------------------------------------------
        % SAVE MASKS
        % --------------------------------------------------

        lesionMaskFile = fullfile( ...
            maskFolder, ...
            baseName + "_lesion_mask.png");

        vesselMaskFile = fullfile( ...
            maskFolder, ...
            baseName + "_vessel_mask.png");

        imwrite(lesionMask, ...
            lesionMaskFile);

        imwrite(vesselMask, ...
            vesselMaskFile);

        %% -------------------------------------------------
        % CREATE OVERLAY
        % --------------------------------------------------

        overlay = im2double(img);

        % Lesions = red
        r = overlay(:,:,1);
        g = overlay(:,:,2);
        b = overlay(:,:,3);

        r(lesionMask) = 1;

        g(lesionMask) = ...
            g(lesionMask) * 0.25;

        b(lesionMask) = ...
            b(lesionMask) * 0.25;

        % Vessels = green
        r(vesselMask) = ...
            r(vesselMask) * 0.25;

        g(vesselMask) = 1;

        b(vesselMask) = ...
            b(vesselMask) * 0.25;

        overlay(:,:,1) = r;
        overlay(:,:,2) = g;
        overlay(:,:,3) = b;

        overlayFile = fullfile( ...
            overlayFolder, ...
            baseName + "_evidence.png");

        imwrite(overlay, ...
            overlayFile);

        %% -------------------------------------------------
        % STATUS
        % --------------------------------------------------

        statusResult(i) = "SUCCESS";

        processed = processed + 1;

        %% Progress

        if mod(processed,50) == 0

            fprintf( ...
                "Processed %d/%d accepted images...\n", ...
                processed,numImages);

        end

    catch ME

        statusResult(i) = "ERROR";

        failed = failed + 1;

        fprintf( ...
            "ERROR on %s\n", ...
            enhancedName);

        fprintf("   %s\n",ME.message);

    end

end

%% -----------------------------------------------------
% CREATE FEATURE TABLE
% ------------------------------------------------------

Segmentation_Features = table( ...
    imageNameResult, ...
    diagnosisResult, ...
    vesselCoverage, ...
    lesionCoverage, ...
    totalLesionArea, ...
    lesionCount, ...
    brightLesionCount, ...
    darkLesionCount, ...
    meanLesionArea, ...
    statusResult, ...
    'VariableNames', { ...
    'imageName', ...
    'diagnosis', ...
    'vesselCoverage', ...
    'lesionCoverage', ...
    'totalLesionArea', ...
    'lesionCount', ...
    'brightLesionCount', ...
    'darkLesionCount', ...
    'meanLesionArea', ...
    'status'});

%% -----------------------------------------------------
% SAVE FEATURE TABLE
% ------------------------------------------------------

writetable( ...
    Segmentation_Features, ...
    featureFile);

%% -----------------------------------------------------
% SUMMARY
% ------------------------------------------------------

successCount = ...
    sum(statusResult == "SUCCESS");

missingCount = ...
    sum(statusResult == "MISSING");

errorCount = ...
    sum(statusResult == "ERROR");

fprintf('\n');
fprintf('====================================================\n');
fprintf('       BATCH SEGMENTATION COMPLETED\n');
fprintf('====================================================\n');

fprintf('Accepted images      : %d\n',numImages);
fprintf('Successfully processed : %d\n',successCount);
fprintf('Missing images        : %d\n',missingCount);
fprintf('Errors                : %d\n',errorCount);

if successCount > 0

    valid = statusResult == "SUCCESS";

    fprintf('\nAverage vessel coverage : %.2f%%\n', ...
        mean(vesselCoverage(valid)));

    fprintf('Average lesion coverage : %.2f%%\n', ...
        mean(lesionCoverage(valid)));

    fprintf('Average lesion count    : %.2f\n', ...
        mean(lesionCount(valid)));

end

fprintf('\nFeature file:\n%s\n',featureFile);

fprintf('\nMasks:\n%s\n',maskFolder);

fprintf('\nEvidence overlays:\n%s\n',overlayFolder);

fprintf('====================================================\n');