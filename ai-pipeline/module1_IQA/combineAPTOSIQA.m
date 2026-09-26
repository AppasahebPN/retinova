clc;
clear;
close all;

fprintf('============================================\n');
fprintf('       APTOS + IQA DATASET CREATION\n');
fprintf('============================================\n');

%% File paths

featureFile = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\results\APTOS_IQA_Features.csv";

labelFile = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\data\APTOS\train.csv";

outputFile = ...
    "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\results\APTOS_IQA_Combined.csv";

%% Read files

IQA = readtable(featureFile);
Labels = readtable(labelFile);

fprintf('IQA records    : %d\n', height(IQA));
fprintf('APTOS labels   : %d\n', height(Labels));

%% Create matching ID

% Remove .png extension from IQA image names
IQA.id_code = erase(string(IQA.imageName), ".png");

% Convert APTOS IDs to string
Labels.id_code = string(Labels.id_code);

%% Match the two datasets

Combined = innerjoin(Labels, IQA, ...
    "Keys", "id_code");

%% Reorder columns

Combined = movevars(Combined, ...
    "imageName", "After", "id_code");

%% Save

writetable(Combined, outputFile);

%% Display results

fprintf('\n============================================\n');
fprintf('        COMBINATION COMPLETED\n');
fprintf('============================================\n');

fprintf('Matched records : %d\n', height(Combined));

fprintf('\nFirst five records:\n');
disp(Combined(1:min(5,height(Combined)), :));

fprintf('\nSaved to:\n');
fprintf('%s\n', outputFile);

fprintf('============================================\n');