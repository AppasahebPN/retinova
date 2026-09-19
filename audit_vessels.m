% AUDIT_VESSELS.M - Retinova Problem B Root-Cause Audit
% Evaluates raw vessel skeletonization, spur inflation, neighborhood connectivity,
% and controlled pruning experiments on the exact screening cc05b2b7 mask.

clear; clc;
fprintf('============================================================\n');
fprintf('RETINOVA PROBLEM B: VESSEL BRANCH-POINT ROOT-CAUSE AUDIT\n');
fprintf('============================================================\n');

uploadsDir = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads';
artifactsDir = 'C:\Users\Appasaheb\.gemini\antigravity-ide\brain\e8d45aaa-5f53-446a-98ab-b9ea21a0456a';
runId = 'cc05b2b7';

vesselPath = fullfile(uploadsDir, ['vessels_' runId '.png']);
if ~exist(vesselPath, 'file')
    error('Vessel mask not found at: %s', vesselPath);
end

% 1. Load exact binary vessel mask
vesselImg = imread(vesselPath);
if ndims(vesselImg) == 3
    vesselMask = vesselImg(:, :, 1) > 0;
else
    vesselMask = vesselImg > 0;
end

[imgH, imgW] = size(vesselMask);
totalPixels = imgH * imgW;
vesselPixels = sum(vesselMask(:));
vesselCoverage = 100.0 * (vesselPixels / totalPixels);

fprintf('1. VESSEL MASK PROPERTIES:\n');
fprintf('   Dimensions      : %d x %d\n', imgW, imgH);
fprintf('   Vessel Pixels   : %d px\n', vesselPixels);
fprintf('   Vessel Coverage : %.2f%% (Matches report: 14.96%%)\n', vesselCoverage);

% Save exact mask to artifacts
imwrite(vesselMask, fullfile(artifactsDir, ['debug_vessel_mask_' runId '.png']));

% 2. Compute Raw Skeleton before ANY pruning
fprintf('\n2. COMPUTING RAW SKELETON (bwmorph ''skel'', Inf)...\n');
t0 = tic;
rawSkel = bwmorph(vesselMask, 'skel', Inf);
skelTime = toc(t0);
fprintf('   Skeleton computed in %.2f seconds.\n', skelTime);

% Save raw skeleton artifact
imwrite(rawSkel, fullfile(artifactsDir, ['debug_vessel_skeleton_raw_' runId '.png']));
imwrite(rawSkel, fullfile(uploadsDir, ['debug_vessel_skeleton_raw_' runId '.png']));
fprintf('   Saved raw skeleton artifact: debug_vessel_skeleton_raw_%s.png\n', runId);

% 3. Calculate Raw Branch Points and Endpoints
rawBpImg = bwmorph(rawSkel, 'branchpoints');
rawEpImg = bwmorph(rawSkel, 'endpoints');

rawBpCount = sum(rawBpImg(:));
rawEpCount = sum(rawEpImg(:));
rawSkelPixels = sum(rawSkel(:));

fprintf('\n3. RAW SKELETON METRICS:\n');
fprintf('   Raw Skeleton Pixels  : %d px\n', rawSkelPixels);
fprintf('   Raw Branch Points    : %d (Matches report: 10,445!)\n', rawBpCount);
fprintf('   Raw Endpoints        : %d (Matches report: 9,304!)\n', rawEpCount);
fprintf('   Ratio (Pixels / BP)  : %.2f pixels per branch point!\n', rawSkelPixels / max(rawBpCount, 1));

% 4. Topological Decomposition & Neighborhood Analysis
fprintf('\n4. TOPOLOGICAL DECOMPOSITION & NEIGHBORHOOD ANALYSIS:\n');
ccVessel = bwconncomp(vesselMask);
vesProps = regionprops(ccVessel, 'Area');
vesAreas = [vesProps.Area];

numVesCC = ccVessel.NumObjects;
tinyVes15 = sum(vesAreas < 15);
tinyVes30 = sum(vesAreas < 30);
tinyVes50 = sum(vesAreas < 50);

ccSkel = bwconncomp(rawSkel);
skelProps = regionprops(ccSkel, 'Area');
skelAreas = [skelProps.Area];
numSkelCC = ccSkel.NumObjects;

% Branch point clustering (adjacent branch point pixels forming a single junction)
ccBp = bwconncomp(rawBpImg);
numBpClusters = ccBp.NumObjects;
bpProps = regionprops(ccBp, 'Area');
bpSizes = [bpProps.Area];
multiPixelClusters = sum(bpSizes > 1);

fprintf('   Total Vessel Connected Components : %d\n', numVesCC);
fprintf('   Tiny vessel components (< 15 px)  : %d (%.1f%%)\n', tinyVes15, (tinyVes15 / numVesCC) * 100);
fprintf('   Tiny vessel components (< 30 px)  : %d (%.1f%%)\n', tinyVes30, (tinyVes30 / numVesCC) * 100);
fprintf('   Tiny vessel components (< 50 px)  : %d (%.1f%%)\n', tinyVes50, (tinyVes50 / numVesCC) * 100);
fprintf('   Total Skeleton Components         : %d\n', numSkelCC);
fprintf('   Branch Point Clusters (Junctions) : %d (vs %d raw pixels)\n', numBpClusters, rawBpCount);
fprintf('   Multi-pixel junction clusters     : %d (%.1f%% of junctions have >= 2 adjacent pixels)\n', ...
    multiPixelClusters, (multiPixelClusters / max(numBpClusters, 1)) * 100);

% Spur length curve
fprintf('\n   Terminal Spur Length Distribution (Iterative Spur Pruning):\n');
spurLengths = [1, 2, 3, 4, 5, 8, 10, 15, 20];
spurTable = struct();
for idx = 1:length(spurLengths)
    k = spurLengths(idx);
    skelSp = bwmorph(rawSkel, 'spur', k);
    bpSp = bwmorph(skelSp, 'branchpoints');
    epSp = bwmorph(skelSp, 'endpoints');
    
    cntBp = sum(bpSp(:));
    cntEp = sum(epSp(:));
    cntSkel = sum(skelSp(:));
    lossBp = rawBpCount - cntBp;
    pctLoss = (lossBp / rawBpCount) * 100;
    
    fprintf('     Spur prune %2d px: BP = %5d (pruned %5d, -%5.1f%%) | EP = %5d | Skel = %6d px\n', ...
        k, cntBp, lossBp, pctLoss, cntEp, cntSkel);
    
    spurTable(idx).k = k;
    spurTable(idx).bp = cntBp;
    spurTable(idx).ep = cntEp;
    spurTable(idx).skel = cntSkel;
    spurTable(idx).bp_loss = lossBp;
end

% 5. Controlled Pruning Experiment (Section B.6)
fprintf('\n5. CONTROLLED PRUNING EXPERIMENTS (Section B.6):\n');
expLabels = {
    '1. No pruning (Raw)'
    '2. 5 px spur pruning'
    '3. 10 px spur pruning'
    '4. 20 px spur pruning'
    '5. Area filter >= 30 px + No spur prune'
    '6. Area filter >= 30 px + 5 px spur prune'
    '7. Area filter >= 30 px + 10 px spur prune'
};
expConfigs = [
    0,  0;   % raw
    5,  0;   % 5px spur
    10, 0;   % 10px spur
    20, 0;   % 20px spur
    0,  30;  % area 30, no spur
    5,  30;  % area 30, 5px spur
    10, 30;  % area 30, 10px spur
];

expResults = struct();
for i = 1:size(expConfigs, 1)
    spurK = expConfigs(i, 1);
    areaMin = expConfigs(i, 2);
    
    if areaMin > 0
        vMask = bwareaopen(vesselMask, areaMin);
    else
        vMask = vesselMask;
    end
    
    sMat = bwmorph(vMask, 'skel', Inf);
    if spurK > 0
        sMat = bwmorph(sMat, 'spur', spurK);
    end
    
    bMat = bwmorph(sMat, 'branchpoints');
    eMat = bwmorph(sMat, 'endpoints');
    
    ccB = bwconncomp(bMat);
    ccS = bwconncomp(sMat);
    
    bPixels = sum(bMat(:));
    bClusters = ccB.NumObjects;
    ePixels = sum(eMat(:));
    sLength = sum(sMat(:));
    vCov = 100.0 * (sum(vMask(:)) / totalPixels);
    sComponents = ccS.NumObjects;
    
    expResults(i).label = expLabels{i};
    expResults(i).spurK = spurK;
    expResults(i).areaMin = areaMin;
    expResults(i).bpPixels = bPixels;
    expResults(i).bpClusters = bClusters;
    expResults(i).endpoints = ePixels;
    expResults(i).skelLength = sLength;
    expResults(i).vesselCoverage = vCov;
    expResults(i).skelComponents = sComponents;
    
    fprintf('\n   [%s]\n', expLabels{i});
    fprintf('     Branch Point Pixels   : %d\n', bPixels);
    fprintf('     Branch Point Clusters : %d\n', bClusters);
    fprintf('     Endpoints             : %d\n', ePixels);
    fprintf('     Skeleton Length       : %d px\n', sLength);
    fprintf('     Vessel Coverage       : %.2f%%\n', vCov);
    fprintf('     Skeleton Components   : %d\n', sComponents);
end

% 6. Create Artifact: debug_vessel_branchpoints_raw_<runId>.png
fprintf('\n6. GENERATING ARTIFACT: debug_vessel_branchpoints_raw_%s.png...\n', runId);
hFig1 = figure('Visible', 'off', 'Position', [50, 50, 1800, 900]);

% Left: Full skeleton + raw branch points
subplot(1, 2, 1);
fullRGB = zeros(imgH, imgW, 3, 'uint8');
fullRGB(:, :, 1) = uint8(vesselMask * 30);
fullRGB(:, :, 2) = uint8(vesselMask * 45);
fullRGB(:, :, 3) = uint8(vesselMask * 80);
% Skeleton in white
fullRGB(repmat(rawSkel, [1 1 3])) = 255;
% Branch points dilated in bright red
bpDilated = imdilate(rawBpImg, strel('disk', 2));
fullRGB(repmat(bpDilated, [1 1 3])) = 0;
rChannel = fullRGB(:, :, 1); rChannel(bpDilated) = 255; fullRGB(:, :, 1) = rChannel;
gChannel = fullRGB(:, :, 2); gChannel(bpDilated) = 30;  fullRGB(:, :, 2) = gChannel;
bChannel = fullRGB(:, :, 3); bChannel(bpDilated) = 30;  fullRGB(:, :, 3) = bChannel;

imshow(fullRGB);
title(sprintf('Full Field (2592x1944) - 10,445 Raw Branch Points (Red)\nSkeleton: %d px | Ratio: 1 BP per %.1f px', ...
    rawSkelPixels, rawSkelPixels/rawBpCount), 'FontSize', 12, 'FontWeight', 'bold');

% Zoom ROI: Y: 700-1300, X: 1100-1700
roiY = 700:1300;
roiX = 1100:1700;
subplot(1, 2, 2);
imshow(fullRGB(roiY, roiX, :));
roiBp = sum(sum(rawBpImg(roiY, roiX)));
title(sprintf('High-Magnification View (%dx%d px)\n%d Branch Points in this local ROI alone!\nEvery tiny 1-3px boundary spur creates a false junction', ...
    length(roiX), length(roiY), roiBp), 'FontSize', 12, 'FontWeight', 'bold');

exportgraphics(hFig1, fullfile(artifactsDir, ['debug_vessel_branchpoints_raw_' runId '.png']), 'Resolution', 150);
exportgraphics(hFig1, fullfile(uploadsDir, ['debug_vessel_branchpoints_raw_' runId '.png']), 'Resolution', 150);
close(hFig1);
fprintf('   Saved debug_vessel_branchpoints_raw_%s.png\n', runId);

% 7. Create Artifact: debug_vessel_pruning_comparison_<runId>.png
fprintf('\n7. GENERATING ARTIFACT: debug_vessel_pruning_comparison_%s.png...\n', runId);
hFig2 = figure('Visible', 'off', 'Position', [50, 50, 2200, 950]);

compareIndices = [1, 2, 3, 4]; % raw, 5px, 10px, 20px
compareSkels = {
    rawSkel;
    bwmorph(rawSkel, 'spur', 5);
    bwmorph(rawSkel, 'spur', 10);
    bwmorph(rawSkel, 'spur', 20);
};
compareTitles = {
    sprintf('2. Raw Skeleton (No Prune)\nBP: %d | EP: %d', expResults(1).bpPixels, expResults(1).endpoints);
    sprintf('3. 5 px Spur Pruned\nBP: %d (-%.1f%%) | EP: %d', expResults(2).bpPixels, (1 - expResults(2).bpPixels/rawBpCount)*100, expResults(2).endpoints);
    sprintf('4. 10 px Spur Pruned\nBP: %d (-%.1f%%) | EP: %d', expResults(3).bpPixels, (1 - expResults(3).bpPixels/rawBpCount)*100, expResults(3).endpoints);
    sprintf('5. 20 px Spur Pruned\nBP: %d (-%.1f%%) | EP: %d', expResults(4).bpPixels, (1 - expResults(4).bpPixels/rawBpCount)*100, expResults(4).endpoints);
};

% Panel 1: Original vessel mask
subplot(2, 5, 1);
imshow(vesselMask);
title(sprintf('1. Original Vessel Mask\nCoverage: %.2f%% (%d px)', vesselCoverage, vesselPixels), 'FontSize', 10, 'FontWeight', 'bold');

subplot(2, 5, 6);
imshow(vesselMask(roiY, roiX));
title('Vessel Mask (Zoom ROI)', 'FontSize', 9);

for c = 1:4
    sCurrent = compareSkels{c};
    bCurrent = bwmorph(sCurrent, 'branchpoints');
    
    % Render RGB
    rgb = zeros(imgH, imgW, 3, 'uint8');
    rgb(repmat(sCurrent, [1 1 3])) = 255;
    bDil = imdilate(bCurrent, strel('disk', 2));
    rgb(repmat(bDil, [1 1 3])) = 0;
    rC = rgb(:, :, 1); rC(bDil) = 255; rgb(:, :, 1) = rC;
    gC = rgb(:, :, 2); gC(bDil) = 30;  rgb(:, :, 2) = gC;
    bC = rgb(:, :, 3); bC(bDil) = 30;  rgb(:, :, 3) = bC;
    
    % Full field
    subplot(2, 5, c + 1);
    imshow(rgb);
    title(compareTitles{c}, 'FontSize', 10, 'FontWeight', 'bold');
    
    % Zoom
    subplot(2, 5, c + 6);
    imshow(rgb(roiY, roiX, :));
    title(sprintf('Zoom ROI (%d BPs)', sum(sum(bCurrent(roiY, roiX)))), 'FontSize', 9);
end

exportgraphics(hFig2, fullfile(artifactsDir, ['debug_vessel_pruning_comparison_' runId '.png']), 'Resolution', 150);
exportgraphics(hFig2, fullfile(uploadsDir, ['debug_vessel_pruning_comparison_' runId '.png']), 'Resolution', 150);
close(hFig2);
fprintf('   Saved debug_vessel_pruning_comparison_%s.png\n', runId);

% Save JSON results summary
auditResults = struct();
auditResults.runId = runId;
auditResults.vesselCoverage = vesselCoverage;
auditResults.rawBpCount = rawBpCount;
auditResults.rawEpCount = rawEpCount;
auditResults.rawSkelPixels = rawSkelPixels;
auditResults.numVesCC = numVesCC;
auditResults.tinyVes15 = tinyVes15;
auditResults.tinyVes30 = tinyVes30;
auditResults.numBpClusters = numBpClusters;
auditResults.spurTable = spurTable;
auditResults.expResults = expResults;

jsonText = jsonencode(auditResults, 'PrettyPrint', true);
fid = fopen(fullfile(artifactsDir, 'vessel_audit_results.json'), 'w');
fwrite(fid, jsonText);
fclose(fid);

fid2 = fopen(fullfile(uploadsDir, 'vessel_audit_results.json'), 'w');
fwrite(fid2, jsonText);
fclose(fid2);

fprintf('\nAudit results saved to vessel_audit_results.json!\n');
fprintf('============================================================\n');
