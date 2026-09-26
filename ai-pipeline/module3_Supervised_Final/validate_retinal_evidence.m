function valMetrics = validate_retinal_evidence()
% =========================================================================
% VALIDATE_RETINAL_EVIDENCE (Module 3 Supervised Final)
% =========================================================================
% Strict Image-Level Development Validation Protocol for Retinal Evidence.
%
% LOCKED TEST SET COMPLIANCE:
%   Official IDRiD Test Sets (Part A: 27, Part B: 103, Part C: 103) are
%   PERMANENTLY LOCKED and NEVER accessed, evaluated, or tuned against.
%
% DEVELOPMENT SPLIT:
%   54 official Part A training images partitioned at image level:
%     - 43 images: train-development
%     - 11 images: validation-development (IDRiD_03, 10, 15, 20, 23, 25, 31, 34, 39, 40, 53)
%
% RETINAL EVIDENCE SCOPE:
%   - Supervised / Annotation-based: OD, Fovea, MA, HE, EX, SE (where GT exists)
%   - Heuristic / Morphological: Retinal Vessels, Candidate Lesions
%   - Neovascularization (NV): Explicitly 'Not validated / unavailable'
% =========================================================================

baseDir = fileparts(mfilename('fullpath'));
resultsDir = fullfile(baseDir, 'results');
if ~exist(resultsDir, 'dir')
    mkdir(resultsDir);
end

manifestPath = fullfile(baseDir, '..', 'module3_Supervised_Experimental', 'data', 'manifest_train_val.json');
if ~exist(manifestPath, 'file')
    error('Development split manifest not found at: %s', manifestPath);
end

% Read manifest
rawText = fileread(manifestPath);
manifest = jsondecode(rawText);

% Filter validation-development split
valIdx = find(arrayfun(@(x) strcmp(x.split, 'val'), manifest));
valCount = numel(valIdx);
fprintf('===========================================================================\n');
fprintf('NETRAAI RETINAL EVIDENCE SUBSYSTEM — DEVELOPMENT VALIDATION PROTOCOL\n');
fprintf('===========================================================================\n');
fprintf('Protocol: Strict Image-Level Development Validation (Part A Training Set)\n');
fprintf('Validation-Development Images: %d\n', valCount);
fprintf('Official IDRiD Test Sets (Parts A, B, C): PERMANENTLY LOCKED / UNTOUCHED\n');
fprintf('===========================================================================\n\n');

% Pre-allocate per-image metric records
metricsList = struct();

% Aggregate accumulators
odDiceAll = zeros(valCount, 1);
odIouAll = zeros(valCount, 1);
odCentErrPxAll = zeros(valCount, 1);
odCentErrNormAll = zeros(valCount, 1);

fovCentErrPxAll = zeros(valCount, 1);
fovCentErrNormAll = zeros(valCount, 1);

lesionClasses = {'MA', 'HE', 'EX', 'SE'};
lesionStats = struct();
for lc = 1:numel(lesionClasses)
    cls = lesionClasses{lc};
    lesionStats.(cls).tp = 0;
    lesionStats.(cls).fp = 0;
    lesionStats.(cls).fn = 0;
    lesionStats.(cls).tn = 0;
    lesionStats.(cls).gtObjects = 0;
    lesionStats.(cls).detectedObjects = 0;
    lesionStats.(cls).candidateObjects = 0;
end

csvRows = {};
csvHeader = {'Image_ID', 'OD_Dice', 'OD_IoU', 'OD_Centroid_Err_px', 'OD_Centroid_Err_norm', ...
             'Fovea_Err_px', 'Fovea_Err_norm', ...
             'MA_Recall', 'MA_Precision', 'MA_Candidates', ...
             'HE_Recall', 'HE_Precision', 'HE_Candidates', ...
             'EX_Recall', 'EX_Precision', 'EX_Candidates', ...
             'SE_Recall', 'SE_Precision', 'SE_Candidates'};

for v = 1:valCount
    item = manifest(valIdx(v));
    imgId = item.image_id;
    imgPath = item.image_path;
    
    fprintf('[%2d/%2d] Evaluating %s... ', v, valCount, imgId);
    img = imread(imgPath);
    [H, W, ~] = size(img);
    
    % Execute evidence subsystem
    ev = extract_retinal_evidence(img);
    
    % 1. OPTIC DISC EVALUATION
    odGtPath = item.OD_path;
    if exist(odGtPath, 'file')
        odGt = imread(odGtPath) > 0;
    else
        odGt = false(H, W);
    end
    
    odPred = ev.od.mask;
    odIntersection = sum(odPred(:) & odGt(:));
    odUnion = sum(odPred(:) | odGt(:));
    odDice = (2 * odIntersection) / max(sum(odPred(:)) + sum(odGt(:)), 1);
    odIoU = odIntersection / max(odUnion, 1);
    
    odGtCentroid = item.od_coord;
    odPredCentroid = ev.od.centroid;
    odCentErrPx = sqrt((odPredCentroid(1) - odGtCentroid(1))^2 + (odPredCentroid(2) - odGtCentroid(2))^2);
    
    gtOdProps = regionprops(odGt, 'EquivDiameter');
    if ~isempty(gtOdProps)
        gtOdDiam = gtOdProps(1).EquivDiameter;
    else
        gtOdDiam = ev.od.diameter;
    end
    odCentErrNorm = odCentErrPx / max(gtOdDiam, 1);
    
    odDiceAll(v) = odDice;
    odIouAll(v) = odIoU;
    odCentErrPxAll(v) = odCentErrPx;
    odCentErrNormAll(v) = odCentErrNorm;
    
    % 2. FOVEA EVALUATION
    fovGtCentroid = item.fovea_coord;
    fovPredCentroid = ev.fovea.centroid;
    fovCentErrPx = sqrt((fovPredCentroid(1) - fovGtCentroid(1))^2 + (fovPredCentroid(2) - fovGtCentroid(2))^2);
    fovCentErrNorm = fovCentErrPx / max(gtOdDiam, 1);
    
    fovCentErrPxAll(v) = fovCentErrPx;
    fovCentErrNormAll(v) = fovCentErrNorm;
    
    % 3. LESION EVALUATION (MA, HE, EX, SE)
    lum = rgb2gray(im2double(img));
    fovRetina = lum > 0.05;
    
    rowValues = {imgId, sprintf('%.4f', odDice), sprintf('%.4f', odIoU), ...
                 sprintf('%.1f', odCentErrPx), sprintf('%.4f', odCentErrNorm), ...
                 sprintf('%.1f', fovCentErrPx), sprintf('%.4f', fovCentErrNorm)};
    
    for lc = 1:numel(lesionClasses)
        cls = lesionClasses{lc};
        switch cls
            case 'MA'
                predMask = ev.lesions.ma.candidateMask;
                candCount = ev.lesions.ma.candidateCount;
                gtPath = item.MA_path;
            case 'HE'
                predMask = ev.lesions.he.candidateMask;
                candCount = ev.lesions.he.candidateCount;
                gtPath = item.HE_path;
            case 'EX'
                predMask = ev.lesions.ex.candidateMask;
                candCount = ev.lesions.ex.candidateCount;
                gtPath = item.EX_path;
            case 'SE'
                predMask = ev.lesions.se.candidateMask;
                candCount = ev.lesions.se.candidateCount;
                gtPath = item.SE_path;
        end
        
        if ~isempty(gtPath) && exist(gtPath, 'file')
            gtMask = imread(gtPath) > 0;
        else
            gtMask = false(H, W);
        end
        
        % Pixel counts within valid retinal FOV
        tp = sum(predMask(:) & gtMask(:) & fovRetina(:));
        fp = sum(predMask(:) & ~gtMask(:) & fovRetina(:));
        fn = sum(~predMask(:) & gtMask(:) & fovRetina(:));
        tn = sum(~predMask(:) & ~gtMask(:) & fovRetina(:));
        
        lesionStats.(cls).tp = lesionStats.(cls).tp + tp;
        lesionStats.(cls).fp = lesionStats.(cls).fp + fp;
        lesionStats.(cls).fn = lesionStats.(cls).fn + fn;
        lesionStats.(cls).tn = lesionStats.(cls).tn + tn;
        lesionStats.(cls).candidateObjects = lesionStats.(cls).candidateObjects + candCount;
        
        % Object-level recall
        ccGt = bwconncomp(gtMask);
        numGtObj = ccGt.NumObjects;
        lesionStats.(cls).gtObjects = lesionStats.(cls).gtObjects + numGtObj;
        
        numDetObj = 0;
        if numGtObj > 0
            for obj = 1:numGtObj
                if any(predMask(ccGt.PixelIdxList{obj}))
                    numDetObj = numDetObj + 1;
                end
            end
        end
        lesionStats.(cls).detectedObjects = lesionStats.(cls).detectedObjects + numDetObj;
        
        pRecall = (tp) / max(tp + fn, 1);
        pPrecision = (tp) / max(tp + fp, 1);
        
        rowValues = [rowValues, {sprintf('%.4f', pRecall), sprintf('%.4f', pPrecision), sprintf('%d', candCount)}];
    end
    
    csvRows(v, :) = rowValues;
    fprintf('OD IoU: %.3f | OD Cent Err: %.1f px | Fov Err: %.1f px (%.2f DD)\n', ...
        odIoU, odCentErrPx, fovCentErrPx, fovCentErrNorm);
end

% Compute summary metrics
summary = struct();
summary.od.meanDice = mean(odDiceAll);
summary.od.meanIoU = mean(odIouAll);
summary.od.meanCentroidErrorPx = mean(odCentErrPxAll);
summary.od.meanCentroidErrorNorm = mean(odCentErrNormAll);

summary.fovea.meanErrorPx = mean(fovCentErrPxAll);
summary.fovea.meanErrorNorm = mean(fovCentErrNormAll);

for lc = 1:numel(lesionClasses)
    cls = lesionClasses{lc};
    st = lesionStats.(cls);
    
    pDice = (2 * st.tp) / max(2 * st.tp + st.fp + st.fn, 1);
    pIoU = st.tp / max(st.tp + st.fp + st.fn, 1);
    pPrecision = st.tp / max(st.tp + st.fp, 1);
    pRecall = st.tp / max(st.tp + st.fn, 1);
    pSpecificity = st.tn / max(st.tn + st.fp, 1);
    objRecall = st.detectedObjects / max(st.gtObjects, 1);
    fpPerImage = st.fp / valCount;
    
    summary.lesions.(cls).pixelDice = pDice;
    summary.lesions.(cls).pixelIoU = pIoU;
    summary.lesions.(cls).precision = pPrecision;
    summary.lesions.(cls).recallSensitivity = pRecall;
    summary.lesions.(cls).specificity = pSpecificity;
    summary.lesions.(cls).lesionRecall = objRecall;
    summary.lesions.(cls).gtObjectsTotal = st.gtObjects;
    summary.lesions.(cls).detectedObjectsTotal = st.detectedObjects;
    summary.lesions.(cls).totalCandidates = st.candidateObjects;
    summary.lesions.(cls).fpPerImage = fpPerImage;
end

summary.vessels.status = 'Heuristic / Morphological Evidence Only';
summary.vessels.annotationStatus = 'No IDRiD vessel pixel ground truth available; supervised metrics omitted.';

summary.neovascularization.status = 'Not validated / unavailable';
summary.neovascularization.annotationStatus = 'No IDRiD pixel GT for neovascularization; zero synthetic masks fabricated.';

% Save MAT and CSV
valMetrics = summary;
valMetrics.perImageRows = csvRows;
valMetrics.valImageIds = {manifest(valIdx).image_id};

save(fullfile(resultsDir, 'validation_metrics.mat'), 'valMetrics');

% Write CSV
csvFile = fullfile(resultsDir, 'validation_metrics.csv');
fid = fopen(csvFile, 'w');
fprintf(fid, '%s\n', strjoin(csvHeader, ','));
for r = 1:size(csvRows, 1)
    fprintf(fid, '%s\n', strjoin(csvRows(r, :), ','));
end
fclose(fid);

% Display clinical validation report
fprintf('\n===========================================================================\n');
fprintf('DEVELOPMENT VALIDATION SUMMARY REPORT (N = %d Images)\n', valCount);
fprintf('===========================================================================\n');
fprintf('1. OPTIC DISC LOCALIZATION & SEGMENTATION:\n');
fprintf('   Mean Dice:                 %.4f\n', summary.od.meanDice);
fprintf('   Mean IoU:                  %.4f\n', summary.od.meanIoU);
fprintf('   Mean Centroid Error:       %.1f pixels\n', summary.od.meanCentroidErrorPx);
fprintf('   Mean Normalized Error:     %.4f OD Diameters\n\n', summary.od.meanCentroidErrorNorm);

fprintf('2. FOVEA LOCALIZATION:\n');
fprintf('   Mean Localization Error:   %.1f pixels\n', summary.fovea.meanErrorPx);
fprintf('   Mean Normalized Error:     %.4f OD Diameters (E_norm = E_px / D_OD)\n\n', summary.fovea.meanErrorNorm);

fprintf('3. RETINAL LESION EVIDENCE (CANDIDATE DETECTION):\n');
fprintf('   Class | Pixel Dice | Pixel IoU | Precision | Sensitivity | Specificity | Lesion Recall | Candidates\n');
fprintf('   -----------------------------------------------------------------------------------------------\n');
for lc = 1:numel(lesionClasses)
    cls = lesionClasses{lc};
    lsm = summary.lesions.(cls);
    fprintf('   %-5s |   %.4f   |   %.4f  |   %.4f  |   %.4f    |   %.4f    |    %.2f%%     |   %d\n', ...
        cls, lsm.pixelDice, lsm.pixelIoU, lsm.precision, lsm.recallSensitivity, lsm.specificity, ...
        lsm.lesionRecall * 100, lsm.totalCandidates);
end
fprintf('   -----------------------------------------------------------------------------------------------\n');
fprintf('4. RETINAL VESSEL EVIDENCE:\n');
fprintf('   Status: %s\n', summary.vessels.status);
fprintf('   Note:   %s\n\n', summary.vessels.annotationStatus);

fprintf('5. NEOVASCULARIZATION (NV):\n');
fprintf('   Status: %s\n', summary.neovascularization.status);
fprintf('   Note:   %s\n', summary.neovascularization.annotationStatus);
fprintf('===========================================================================\n');
fprintf('Results saved to:\n  - %s\n  - %s\n', fullfile(resultsDir, 'validation_metrics.mat'), csvFile);
fprintf('===========================================================================\n');

end
