clc;
clear;
close all;

fprintf('============================================\n');
fprintf('       VISUAL IQA VALIDATION\n');
fprintf('============================================\n');

%% Paths

imageFolder = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\data\APTOS\train_images";

featureFile = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\results\APTOS_IQA_Combined.csv";

T = readtable(featureFile);

%% Select one group at a time

% Change this number to inspect:
% 1 = Lowest Sharpness
% 2 = Lowest Illumination
% 3 = Lowest FOV
% 4 = Highest Artifact

group = 1;

N = 9;

%% Sort according to selected metric

switch group

    case 1
        [~, idx] = sort(T.sharpness, 'ascend');
        titleText = 'Lowest Sharpness';

    case 2
        [~, idx] = sort(T.illumination, 'ascend');
        titleText = 'Lowest Illumination';

    case 3
        [~, idx] = sort(T.fovCoverage, 'ascend');
        titleText = 'Lowest FOV';

    case 4
        [~, idx] = sort(T.artifactArea, 'descend');
        titleText = 'Highest Artifact';

end

%% Display images

figure('Name', titleText);

for k = 1:min(N,height(T))

    i = idx(k);

    imagePath = fullfile( ...
        imageFolder, ...
        T.imageName{i});

    if isfile(imagePath)

        img = imread(imagePath);

        subplot(3,3,k);
        imshow(img);

        title(sprintf('%d: %s', ...
            k, T.imageName{i}), ...
            'Interpreter','none');

    else

        fprintf('Image not found: %s\n', imagePath);

    end

end

sgtitle(titleText);

fprintf('\nDisplayed: %s\n', titleText);
fprintf('============================================\n');