clc;
clear;
close all;

fprintf('============================================\n');
fprintf('       MODULE 2 - IMAGE ENHANCEMENT\n');
fprintf('============================================\n\n');

%% ---------------------------------------------------------
% PATHS
% ----------------------------------------------------------

projectFolder = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB";

qualityFile = fullfile(projectFolder, ...
    "results", "APTOS_Quality_Scored.csv");

trainFolder = fullfile(projectFolder, ...
    "data", "APTOS", "train_images");

testFolder = fullfile(projectFolder, ...
    "data", "APTOS", "test_images");

outputFolder = fullfile(projectFolder, ...
    "results", "APTOS_Enhanced", "images");

comparisonFolder = fullfile(projectFolder, ...
    "results", "APTOS_Enhanced", "comparison");

reportFile = fullfile(projectFolder, ...
    "results", "APTOS_Enhanced", ...
    "APTOS_Enhancement_Report.csv");

%% ---------------------------------------------------------
% CREATE OUTPUT FOLDERS
% ----------------------------------------------------------

if ~exist(outputFolder, 'dir')
    mkdir(outputFolder);
end

if ~exist(comparisonFolder, 'dir')
    mkdir(comparisonFolder);
end

%% ---------------------------------------------------------
% READ QUALITY SCORE FILE
% ----------------------------------------------------------

if ~isfile(qualityFile)
    error("Quality score file not found:\n%s", qualityFile);
end

T = readtable(qualityFile);

fprintf("Quality file loaded successfully.\n");
fprintf("Total records : %d\n\n", height(T));

%% ---------------------------------------------------------
% DISPLAY COLUMN NAMES
% ----------------------------------------------------------

disp("Columns found:");

for k = 1:numel(T.Properties.VariableNames)
    fprintf("  %s\n", T.Properties.VariableNames{k});
end

fprintf("\n");

%% ---------------------------------------------------------
% FIND ACCEPTED IMAGES
% ----------------------------------------------------------

% Find the decision column automatically

variableNames = T.Properties.VariableNames;

decisionColumn = "";

for k = 1:numel(variableNames)

    name = lower(variableNames{k});

    if contains(name,"decision") || ...
       contains(name,"status") || ...
       contains(name,"accept")

        decisionColumn = variableNames{k};
        break;

    end

end

if decisionColumn == ""
    error("Could not find ACCEPT/REJECT decision column.");
end

fprintf("Decision column: %s\n\n", decisionColumn);

decisionData = T.(decisionColumn);

%% ---------------------------------------------------------
% PROCESS ACCEPTED IMAGES
% ----------------------------------------------------------

acceptedCount = 0;
rejectedCount = 0;
processedCount = 0;
missingCount = 0;

imageNames = {};
statusList = {};
sourceList = {};
outputNames = {};

fprintf("Starting enhancement...\n\n");

for i = 1:height(T)

    % ------------------------------------------------------
    % Read decision
    % ------------------------------------------------------

    decision = decisionData(i);

    if iscell(decision)
        decision = decision{1};
    end

    if isstring(decision)
        decision = char(decision);
    end

    if iscategorical(decision)
        decision = char(decision);
    end

    % ------------------------------------------------------
    % Skip rejected images
    % ------------------------------------------------------

    if ~contains(upper(string(decision)), "ACCEPT")

        rejectedCount = rejectedCount + 1;

        continue;

    end

    acceptedCount = acceptedCount + 1;

    % ------------------------------------------------------
    % Get image name
    % ------------------------------------------------------

    if ismember("imageName", T.Properties.VariableNames)

        imageName = string(T.imageName(i));

    elseif ismember("image", T.Properties.VariableNames)

        imageName = string(T.image(i));

    else

        error("Image name column not found.");

    end

    imageName = char(imageName);

    % Remove possible spaces
    imageName = strtrim(imageName);

    % ------------------------------------------------------
    % Find image in train/test folders
    % ------------------------------------------------------

    trainPath = fullfile(trainFolder,imageName);
    testPath = fullfile(testFolder,imageName);

    if isfile(trainPath)

        imagePath = trainPath;
        source = "train";

    elseif isfile(testPath)

        imagePath = testPath;
        source = "test";

    else

        fprintf("Missing image: %s\n",imageName);

        missingCount = missingCount + 1;

        imageNames{end+1,1} = imageName;
        statusList{end+1,1} = "MISSING";
        sourceList{end+1,1} = "NOT FOUND";
        outputNames{end+1,1} = "";

        continue;

    end

    % ------------------------------------------------------
    % Read image
    % ------------------------------------------------------

    try

        img = imread(imagePath);

        % --------------------------------------------------
        % Enhance image
        % --------------------------------------------------

        enhanced = enhance_image(img);

        % --------------------------------------------------
        % Output filename
        % --------------------------------------------------

        [~,baseName,~] = fileparts(imageName);

        outputName = baseName + "_enhanced.png";

        outputPath = fullfile(outputFolder,outputName);

        % --------------------------------------------------
        % Save enhanced image
        % --------------------------------------------------

        imwrite(enhanced,outputPath);

        processedCount = processedCount + 1;

        imageNames{end+1,1} = imageName;
        statusList{end+1,1} = "ENHANCED";
        sourceList{end+1,1} = source;
        outputNames{end+1,1} = outputName;

        % --------------------------------------------------
        % Progress
        % --------------------------------------------------

        if mod(processedCount,100) == 0

            fprintf("Processed %d accepted images...\n", ...
                processedCount);

        end

    catch ME

        fprintf("ERROR: %s\n",imageName);
        fprintf("       %s\n",ME.message);

        imageNames{end+1,1} = imageName;
        statusList{end+1,1} = "ERROR";
        sourceList{end+1,1} = source;
        outputNames{end+1,1} = "";

    end

end

%% ---------------------------------------------------------
% CREATE REPORT
% ----------------------------------------------------------

Report = table( ...
    string(imageNames), ...
    string(sourceList), ...
    string(statusList), ...
    string(outputNames), ...
    'VariableNames', ...
    {'imageName','source','status','outputImage'});

writetable(Report,reportFile);

%% ---------------------------------------------------------
% SUMMARY
% ----------------------------------------------------------

fprintf('\n');
fprintf('============================================\n');
fprintf('       ENHANCEMENT COMPLETED\n');
fprintf('============================================\n');

fprintf('Total records       : %d\n',height(T));
fprintf('Accepted images     : %d\n',acceptedCount);
fprintf('Rejected images     : %d\n',rejectedCount);
fprintf('Successfully enhanced : %d\n',processedCount);
fprintf('Missing images      : %d\n',missingCount);

fprintf('\nEnhanced images saved to:\n');
fprintf('%s\n',outputFolder);

fprintf('\nReport saved to:\n');
fprintf('%s\n',reportFile);

fprintf('============================================\n');