function trainEyeQ_ArtifactAware()

clc;
clearvars -except ans;

fprintf('\n===============================================\n');
fprintf('EYEQ ARTIFACT-AWARE QUALITY MODEL TRAINING\n');
fprintf('===============================================\n');


%% =========================================================
% 1. PATHS
% ==========================================================

basePath = ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

labelFile = fullfile( ...
    basePath, ...
    'data', ...
    'EyeQ', ...
    'data', ...
    'Label_EyeQ_train.csv');

eyePACSRoot = fullfile( ...
    basePath, ...
    'data', ...
    'EyePACS', ...
    'download', ...
    'train', ...
    'extracted');

outputDir = fullfile( ...
    basePath, ...
    'results', ...
    'EyeQ');

if ~isfolder(outputDir)
    mkdir(outputDir);
end


%% =========================================================
% 2. GPU CHECK
% ==========================================================

fprintf('\nChecking GPU...\n');

try

    g = gpuDevice;

    fprintf('GPU: %s\n',g.Name);
    fprintf('GPU Memory: %.2f GB\n', ...
        g.TotalMemory / 1e9);

catch ME

    error( ...
        ['GPU is required for this training script.\n\n' ...
         'MATLAB reported:\n%s'], ...
         ME.message);

end


%% =========================================================
% 3. LOAD EYEQ LABELS
% ==========================================================

fprintf('\nLoading EyeQ labels...\n');

if ~isfile(labelFile)
    error('EyeQ label file not found:\n%s',labelFile);
end

EyeQ = readtable( ...
    labelFile, ...
    'VariableNamingRule','preserve');


% ---------------------------------------------------------
% Convert numeric labels
%
% 0 = Good
% 1 = Usable
% 2 = Reject
% ---------------------------------------------------------

qualityNum = str2double( ...
    strtrim(string(EyeQ.quality)));


qualityStd = strings(height(EyeQ),1);

qualityStd(qualityNum == 0) = "Good";
qualityStd(qualityNum == 1) = "Usable";
qualityStd(qualityNum == 2) = "Reject";


validLabels = ...
    qualityStd ~= "";


fprintf('Total EyeQ labels: %d\n', ...
    height(EyeQ));


fprintf('\nQuality distribution:\n');

fprintf('Good   : %d\n', ...
    nnz(qualityStd == "Good"));

fprintf('Usable : %d\n', ...
    nnz(qualityStd == "Usable"));

fprintf('Reject : %d\n', ...
    nnz(qualityStd == "Reject"));


if nnz(validLabels) == 0
    error('No valid EyeQ labels were found.');
end


%% =========================================================
% 4. FIND EYE-PACS IMAGES
% ==========================================================

fprintf('\nSearching EyePACS images...\n');

if ~isfolder(eyePACSRoot)
    error('EyePACS directory not found:\n%s',eyePACSRoot);
end


imageFiles = dir(fullfile( ...
    eyePACSRoot, ...
    '**', ...
    '*.jpeg'));


fprintf('EyePACS JPEG files: %d\n', ...
    numel(imageFiles));


if isempty(imageFiles)
    error('No EyePACS JPEG images were found.');
end


%% =========================================================
% 5. CREATE FILENAME LOOKUP
% ==========================================================

fprintf('\nCreating filename lookup...\n');


fileMap = containers.Map( ...
    'KeyType','char', ...
    'ValueType','char');


for k = 1:numel(imageFiles)

    name = imageFiles(k).name;

    if ~isKey(fileMap,name)

        fileMap(name) = ...
            fullfile( ...
                imageFiles(k).folder, ...
                imageFiles(k).name);

    end

end


%% =========================================================
% 6. MATCH EYEQ LABELS TO EYE-PACS
% ==========================================================

fprintf('\nMatching EyeQ labels to EyePACS images...\n');


imageNames = string(EyeQ.image);

fullPaths = strings(height(EyeQ),1);


for k = 1:height(EyeQ)

    name = strtrim(imageNames(k));


    if endsWith(lower(name),'.jpeg')

        fileName = char(name);

    else

        fileName = char(name + ".jpeg");

    end


    if isKey(fileMap,fileName)

        fullPaths(k) = ...
            string(fileMap(fileName));

    end

end


matched = ...
    fullPaths ~= "" & validLabels;


fprintf('Matched images: %d / %d\n', ...
    nnz(matched), ...
    height(EyeQ));


if nnz(matched) ~= height(EyeQ)

    warning( ...
        '%d images were not matched.', ...
        height(EyeQ) - nnz(matched));

end


fullPaths = fullPaths(matched);

qualityStd = qualityStd(matched);


if isempty(fullPaths)
    error('No EyeQ images were successfully matched.');
end


%% =========================================================
% 7. CREATE CATEGORICAL LABELS
% ==========================================================

fprintf('\nPreparing categorical labels...\n');


% ---------------------------------------------------------
% CRITICAL:
% Use ONE fixed categorical definition everywhere.
%
% Making the labels ORDINAL prevents MATLAB from silently
% changing the intended category order.
% ---------------------------------------------------------

classOrder = ["Good","Usable","Reject"];


labels = categorical( ...
    qualityStd, ...
    classOrder, ...
    'Ordinal',true);


% Force exact order once more

labels = reordercats( ...
    labels, ...
    classOrder);


fprintf('\nDataset categories:\n');

disp(categories(labels));


%% =========================================================
% 8. CREATE IMAGE DATASTORE
% ==========================================================

fprintf('\nCreating datastore...\n');


imds = imageDatastore( ...
    cellstr(fullPaths), ...
    'Labels',labels);


% Explicitly restore category order

imds.Labels = reordercats( ...
    imds.Labels, ...
    classOrder);


fprintf('Valid images: %d\n', ...
    numel(imds.Files));


fprintf('\nDatastore categories:\n');

disp(categories(imds.Labels));


%% =========================================================
% 9. TRAIN / VALIDATION SPLIT
% ==========================================================

fprintf('\nCreating train/validation split...\n');


rng(42);


[imdsTrain,imdsVal] = splitEachLabel( ...
    imds, ...
    0.80, ...
    'randomized');


% Restore exact categories after splitting

imdsTrain.Labels = reordercats( ...
    imdsTrain.Labels, ...
    classOrder);


imdsVal.Labels = reordercats( ...
    imdsVal.Labels, ...
    classOrder);


fprintf('\nDataset split:\n');

fprintf('Training   : %d\n', ...
    numel(imdsTrain.Files));

fprintf('Validation : %d\n', ...
    numel(imdsVal.Files));


fprintf('\nTraining categories:\n');

disp(categories(imdsTrain.Labels));


fprintf('Validation categories:\n');

disp(categories(imdsVal.Labels));


%% =========================================================
% 10. CHECK ALL TRAINING CLASSES
% ==========================================================

fprintf('\nChecking dataset labels...\n');


for k = 1:numel(classOrder)

    className = classOrder(k);

    trainCount = ...
        nnz(string(imdsTrain.Labels) == className);

    valCount = ...
        nnz(string(imdsVal.Labels) == className);


    fprintf( ...
        '%s -> Train: %d | Validation: %d\n', ...
        className, ...
        trainCount, ...
        valCount);

end


%% =========================================================
% 11. LOAD MOBILENETV2
% ==========================================================

fprintf('\nLoading MobileNetV2...\n');


net = imagePretrainedNetwork( ...
    'mobilenetv2', ...
    'NumClasses',3);


inputSize = net.Layers(1).InputSize;


fprintf( ...
    'Input size: %d x %d x %d\n', ...
    inputSize(1), ...
    inputSize(2), ...
    inputSize(3));


%% =========================================================
% 12. DATA AUGMENTATION
% ==========================================================

fprintf('\nCreating training augmentation...\n');


augmenter = imageDataAugmenter( ...
    'RandRotation',[-8 8], ...
    'RandXTranslation',[-8 8], ...
    'RandYTranslation',[-8 8], ...
    'RandXScale',[0.95 1.05], ...
    'RandYScale',[0.95 1.05]);


augTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    'DataAugmentation',augmenter, ...
    'ColorPreprocessing','gray2rgb');


augVal = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsVal, ...
    'ColorPreprocessing','gray2rgb');


%% =========================================================
% 13. CREATE LAYER GRAPH
% ==========================================================

fprintf('\nPreparing MobileNetV2 graph...\n');


lgraph = layerGraph(net);


fprintf('\nOriginal final layers:\n');

disp(lgraph.Layers(end-5:end));


%% =========================================================
% 14. FIND FINAL FULLY CONNECTED LAYER
% ==========================================================

fcIdx = [];


for k = numel(lgraph.Layers):-1:1

    if isa( ...
            lgraph.Layers(k), ...
            'nnet.cnn.layer.FullyConnectedLayer')

        fcIdx = k;

        break;

    end

end


if isempty(fcIdx)

    error( ...
        'Could not find MobileNetV2 fully connected layer.');

end


fcName = ...
    lgraph.Layers(fcIdx).Name;


fcLayer = ...
    lgraph.Layers(fcIdx);


fprintf('\nFinal FC layer: %s\n', ...
    fcName);


fprintf( ...
    'FC output size: %d\n', ...
    fcLayer.OutputSize);


if fcLayer.OutputSize ~= 3

    error( ...
        'Final FC layer must have 3 outputs.');

end


%% =========================================================
% 15. FIND SOFTMAX LAYER
% ==========================================================

softmaxIdx = [];


for k = numel(lgraph.Layers):-1:1

    if isa( ...
            lgraph.Layers(k), ...
            'nnet.cnn.layer.SoftmaxLayer')

        softmaxIdx = k;

        break;

    end

end


if isempty(softmaxIdx)

    error( ...
        'Could not find MobileNetV2 softmax layer.');

end


softmaxName = ...
    lgraph.Layers(softmaxIdx).Name;


fprintf('Softmax layer: %s\n', ...
    softmaxName);


%% =========================================================
% 16. CONFIGURE FINAL FC LAYER
% ==========================================================

fprintf('\nConfiguring final FC layer...\n');


% Only modify the final FC layer.
% Do not repeatedly replace the MobileNetV2 backbone.


if isprop(fcLayer,'WeightLearnRateFactor')

    fcLayer.WeightLearnRateFactor = 10;

end


if isprop(fcLayer,'BiasLearnRateFactor')

    fcLayer.BiasLearnRateFactor = 10;

end


lgraph = replaceLayer( ...
    lgraph, ...
    fcName, ...
    fcLayer);


fprintf('Final FC layer configured.\n');


%% =========================================================
% 17. CREATE CLASSIFICATION LAYER
% ==========================================================

fprintf('\nCreating classification layer...\n');


% ---------------------------------------------------------
% CRITICAL FIX
%
% Do NOT do:
%
% categorical(dataClasses)
%
% because MATLAB can reorder nominal categories.
%
% Use the explicitly ordered categorical object.
% ---------------------------------------------------------

networkClassOrder = categorical( ...
    classOrder, ...
    classOrder, ...
    'Ordinal',true);


networkClassOrder = reordercats( ...
    networkClassOrder, ...
    classOrder);


fprintf('\nNetwork class order:\n');

disp(categories(networkClassOrder));


newClassLayer = classificationLayer( ...
    'Name','EyeQ_Artifact_Classification', ...
    'Classes',networkClassOrder);


lgraph = addLayers( ...
    lgraph, ...
    newClassLayer);


%% =========================================================
% 18. CONNECT SOFTMAX TO CLASSIFICATION LAYER
% ==========================================================

fprintf('\nConnecting classification layer...\n');


lgraph = connectLayers( ...
    lgraph, ...
    softmaxName, ...
    'EyeQ_Artifact_Classification');


fprintf('Classification layer connected.\n');


%% =========================================================
% 19. VERIFY DATASET AND NETWORK
% ==========================================================

fprintf('\n===============================================\n');
fprintf('CLASS ORDER VERIFICATION\n');
fprintf('===============================================\n');


trainNames = string( ...
    categories(imdsTrain.Labels));


validationNames = string( ...
    categories(imdsVal.Labels));


networkNames = string( ...
    categories(newClassLayer.Classes));


fprintf('\nTraining datastore:\n');
disp(trainNames);


fprintf('Validation datastore:\n');
disp(validationNames);


fprintf('Classification layer:\n');
disp(networkNames);


% ---------------------------------------------------------
% Compare using column vectors so row/column shape cannot
% falsely trigger the verification.
% ---------------------------------------------------------

expected = reshape( ...
    string(classOrder),[],1);


trainNames = reshape( ...
    trainNames,[],1);


validationNames = reshape( ...
    validationNames,[],1);


networkNames = reshape( ...
    networkNames,[],1);


if ~all(trainNames == expected)

    error( ...
        ['Training labels are not in the required order.\n' ...
         'Expected: %s\n' ...
         'Found: %s'], ...
         strjoin(expected,', '), ...
         strjoin(trainNames,', '));

end


if ~all(validationNames == expected)

    error( ...
        ['Validation labels are not in the required order.\n' ...
         'Expected: %s\n' ...
         'Found: %s'], ...
         strjoin(expected,', '), ...
         strjoin(validationNames,', '));

end


if ~all(networkNames == expected)

    error( ...
        ['Classification layer is not in the required order.\n' ...
         'Expected: %s\n' ...
         'Found: %s'], ...
         strjoin(expected,', '), ...
         strjoin(networkNames,', '));

end


fprintf('\nClass order verified successfully.\n');

fprintf( ...
    'Final order: Good -> Usable -> Reject\n');


%% =========================================================
% 20. VERIFY GRAPH
% ==========================================================

fprintf('\n===============================================\n');
fprintf('NETWORK GRAPH VERIFICATION\n');
fprintf('===============================================\n');


fprintf('\nFinal graph layers:\n');

disp(lgraph.Layers(end-4:end));


% ---------------------------------------------------------
% Confirm classification layer exists
% ---------------------------------------------------------

layerNames = string( ...
    {lgraph.Layers.Name});


if ~any( ...
        layerNames == ...
        "EyeQ_Artifact_Classification")

    error( ...
        'EyeQ classification layer was not added.');

end


% ---------------------------------------------------------
% Confirm graph has required final layers
% ---------------------------------------------------------

if ~any(layerNames == string(softmaxName))

    error( ...
        'Softmax layer disappeared from graph.');

end


fprintf('\nGraph verification passed.\n');


%% =========================================================
% 21. ANALYZE NETWORK
% ==========================================================

fprintf('\nAnalyzing network...\n');


analyzeNetwork(lgraph);


%% =========================================================
% 22. NETWORK READY
% ==========================================================

fprintf('\n===============================================\n');
fprintf('NETWORK READY FOR TRAINING\n');
fprintf('===============================================\n');


net = lgraph;


fprintf('Network type: %s\n', ...
    class(net));


%% =========================================================
% 23. TRAINING OPTIONS
% ==========================================================

fprintf('\nConfiguring training...\n');


miniBatchSize = 16;


validationFrequency = ...
    max(1, ...
    floor( ...
        numel(imdsTrain.Files) / ...
        miniBatchSize));


options = trainingOptions( ...
    'adam', ...
    'InitialLearnRate',1e-4, ...
    'MaxEpochs',10, ...
    'MiniBatchSize',miniBatchSize, ...
    'Shuffle','every-epoch', ...
    'ValidationData',augVal, ...
    'ValidationFrequency',validationFrequency, ...
    'ValidationPatience',4, ...
    'ExecutionEnvironment','gpu', ...
    'Verbose',true, ...
    'Plots','training-progress');


%% =========================================================
% 24. START TRAINING
% ==========================================================

fprintf('\n===============================================\n');
fprintf('STARTING TRAINING\n');
fprintf('===============================================\n');


tic;


[trainedNet,trainInfo] = trainNetwork( ...
    augTrain, ...
    net, ...
    options);


trainingTime = toc;


fprintf( ...
    '\nTraining completed in %.2f minutes.\n', ...
    trainingTime / 60);


%% =========================================================
% 25. VALIDATION
% ==========================================================

fprintf('\n===============================================\n');
fprintf('VALIDATION EVALUATION\n');
fprintf('===============================================\n');


[YPred,scoreValues] = classify( ...
    trainedNet, ...
    augVal, ...
    'ExecutionEnvironment','gpu');


YTrue = imdsVal.Labels;


% Keep scoreValues so the variable is available for any
% future confidence analysis.

scores = scoreValues;


%% =========================================================
% 26. VALIDATION ACCURACY
% ==========================================================

accuracy = ...
    mean(YPred == YTrue);


fprintf( ...
    '\nValidation Accuracy: %.2f%%\n', ...
    accuracy * 100);


%% =========================================================
% 27. PER-CLASS RECALL
% ==========================================================

classNames = categories(YTrue);


recall = zeros( ...
    numel(classNames),1);


fprintf('\nPer-class recall:\n');


for k = 1:numel(classNames)

    actual = ...
        YTrue == classNames{k};


    predicted = ...
        YPred == classNames{k};


    TP = nnz( ...
        actual & predicted);


    FN = nnz( ...
        actual & ~predicted);


    recall(k) = ...
        TP / max(TP + FN,1);


    fprintf( ...
        '%s Recall: %.2f%%\n', ...
        classNames{k}, ...
        recall(k) * 100);

end


%% =========================================================
% 28. BALANCED ACCURACY
% ==========================================================

balancedAccuracy = ...
    mean(recall);


fprintf( ...
    '\nBalanced Accuracy: %.2f%%\n', ...
    balancedAccuracy * 100);


%% =========================================================
% 29. CONFUSION MATRIX
% ==========================================================

figure;


confusionchart( ...
    YTrue, ...
    YPred);


title( ...
    'EyeQ Artifact-Aware Quality Model');


%% =========================================================
% 30. SAVE MODEL
% ==========================================================

modelPath = fullfile( ...
    outputDir, ...
    'EyeQ_ArtifactAware_MobileNetV2_GPU.mat');


fprintf('\nSaving model...\n');


save( ...
    modelPath, ...
    'trainedNet', ...
    'trainInfo', ...
    'accuracy', ...
    'balancedAccuracy', ...
    'recall', ...
    'classNames', ...
    'inputSize', ...
    'trainingTime', ...
    '-v7.3');


%% =========================================================
% 31. FINAL SUMMARY
% ==========================================================

fprintf('\n===============================================\n');
fprintf('MODEL SAVED\n');
fprintf('===============================================\n');


fprintf('%s\n', ...
    modelPath);


fprintf('\nValidation Accuracy : %.2f%%\n', ...
    accuracy * 100);


fprintf('Balanced Accuracy   : %.2f%%\n', ...
    balancedAccuracy * 100);


fprintf('Training Time       : %.2f minutes\n', ...
    trainingTime / 60);


fprintf('\n===============================================\n');
fprintf('TRAINING COMPLETE\n');
fprintf('===============================================\n');

end