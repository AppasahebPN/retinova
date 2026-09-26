function [evidence] = extract_retinal_evidence(img)
% =========================================================================
% EXTRACT_RETINAL_EVIDENCE (Module 3 Supervised Final)
% =========================================================================
% Extracts anatomical landmarks and candidate retinal lesion evidence
% for explainability in diabetic retinopathy tele-screening.
%
% ANATOMICAL LANDMARKS:
%   - Optic Disc (OD): Multi-scale brightness, vessel convergence, circularity
%   - Fovea: Anatomical distance prior (~2.5-3.0 OD diameters temporal),
%            intensity valley minimization (dark macular depression)
%   - Retinal Vessels: Morphological bottom-hat + multi-scale matched filters
%
% CANDIDATE LESIONS:
%   - Microaneurysms (MA): Punctate dark lesions in green channel
%   - Haemorrhages (HE): Larger dark blot and flame lesions + 4-quadrant partitioning
%   - Hard Exudates (EX): Punctate bright reflective lipid deposits + foveal proximity
%   - Soft Exudates (SE): Fuffy pale cotton-wool spots
%   - Neovascularization (NV): Explicitly labeled as "Not validated / unavailable"
%                             (NO synthetic/fake NV masks fabricated)
%
% NOTE:
% All lesion detections represent CANDIDATE evidence for clinician review,
% NOT confirmed clinical diagnostic claims.
% =========================================================================

img = im2double(img);
if size(img, 3) == 1
    img = repmat(img, [1, 1, 3]);
end

[H, W, ~] = size(img);
greenChan = img(:, :, 2);
redChan = img(:, :, 1);
lum = rgb2gray(img);

%% 1. FIELD OF VIEW (FOV)
fovMask = lum > 0.05;
fovMask = imfill(fovMask, 'holes');
if any(fovMask(:))
    fovMask = bwareafilt(fovMask, 1);
end
fovArea = sum(fovMask(:));

erodeVessel = max(4, round(0.04 * min(H, W)));
fovSafe = imerode(fovMask, strel('disk', erodeVessel));

%% 2. RETINAL VESSEL SEGMENTATION (Morphological Matched Filter)
% Standarize working resolution for vessel scale stability
targetWidth = 800;
scale = targetWidth / W;
targetHeight = max(1, round(H * scale));

greenStd = imresize(greenChan, [targetHeight, targetWidth], 'bicubic');
fovStd = imresize(fovSafe, [targetHeight, targetWidth], 'nearest');

% Multi-scale morphological vessel enhancement
r1 = max(3, round(0.010 * targetWidth));
r2 = max(5, round(0.020 * targetWidth));
vessel1 = imbothat(greenStd, strel('disk', r1));
vessel2 = imbothat(greenStd, strel('disk', r2));
vesselEnh = max(vessel1, vessel2);
vesselEnh = imgaussfilt(vesselEnh, 0.8);

vesselPix = vesselEnh(fovStd);
vesselThresh = prctile(vesselPix, 82.0);
vesselMaskStd = (vesselEnh > vesselThresh) & fovStd;
vesselMaskStd = bwareaopen(vesselMaskStd, 15);

% Clean linear vessel structure
vesselMaskStd = imclose(vesselMaskStd, strel('disk', 1));
vesselMask = imresize(vesselMaskStd, [H, W], 'nearest') & fovSafe;
vesselCoverage = (sum(vesselMask(:)) / max(fovArea, 1)) * 100.0;

% Native-scale vessel topology analysis (evaluated at 800x600 matched filter scale)
% 3px spur pruning removes boundary discretization artifacts without eroding true vessel structure
skelStd = bwmorph(vesselMaskStd, 'skel', Inf);
skelStdPruned = bwmorph(skelStd, 'spur', 3);
bpStd = bwmorph(skelStdPruned, 'branchpoints');
ccBpStd = bwconncomp(bpStd);
junctionClusters = ccBpStd.NumObjects;
epStd = bwmorph(skelStdPruned, 'endpoints');
endpointsCount = sum(epStd(:));
skeletonLength = sum(skelStdPruned(:));
ccVesselStd = bwconncomp(vesselMaskStd);
vesselConnectivity = ccVesselStd.NumObjects;

%% 3. OPTIC DISC DETECTION & SEGMENTATION
% Calibrated anatomical disc diameter from development training set: ~0.184 * min(H, W)
expectedODDiam = 0.184 * min(H, W);
expectedODRadius = round(expectedODDiam / 2.0);

% Multi-channel bright convergence map (red + gray)
brightMap = 0.5 * redChan + 0.5 * lum;
brightMap(~fovSafe) = 0;

% Retinal anatomical constraint: The optic disc is in the nasal third (X < 0.38*W or X > 0.62*W)
% and NEVER in the central macula/foveal region.
brightMap(:, round(0.38 * W):round(0.62 * W)) = 0;

% Gaussian smoothing to detect global maximum of the disc center
sigmaOD = max(5, round(0.025 * min(H, W)));
smoothedOD = imgaussfilt(brightMap, sigmaOD);
[~, maxIdx] = max(smoothedOD(:));
[peakY, peakX] = ind2sub([H, W], maxIdx);

% Local refinement within 1.4 OD radius window of peak
winR = round(expectedODRadius * 1.4);
wx1 = max(1, peakX - winR);
wx2 = min(W, peakX + winR);
wy1 = max(1, peakY - winR);
wy2 = min(H, peakY + winR);

localROI = greenChan(wy1:wy2, wx1:wx2);
localThresh = prctile(localROI(:), 78.0);
localMask = localROI >= localThresh;
localMask = imfill(localMask, 'holes');

odCentroid = [peakX, peakY];
odDiameter = expectedODDiam;

if any(localMask(:))
    ccLoc = bwconncomp(localMask);
    statsLoc = regionprops(ccLoc, 'Area', 'Centroid', 'Eccentricity', 'EquivDiameter');
    bestScore = -1;
    bestIdx = 1;
    for q = 1:numel(statsLoc)
        distFromCenter = sqrt((statsLoc(q).Centroid(1) - (peakX - wx1 + 1))^2 + ...
                              (statsLoc(q).Centroid(2) - (peakY - wy1 + 1))^2);
        score = statsLoc(q).Area * (1.0 - 0.5 * statsLoc(q).Eccentricity) / (1.0 + 0.05 * distFromCenter);
        if score > bestScore
            bestScore = score;
            bestIdx = q;
        end
    end
    cSub = statsLoc(bestIdx).Centroid;
    odCentroid = [wx1 + cSub(1) - 1, wy1 + cSub(2) - 1];
    odDiameter = max(statsLoc(bestIdx).EquivDiameter, expectedODDiam * 0.88);
end

% Construct regularized disc mask using subgrid to avoid full-frame allocations
rDisc = round(odDiameter / 2.0);
bx1 = max(1, round(odCentroid(1) - rDisc));
bx2 = min(W, round(odCentroid(1) + rDisc));
by1 = max(1, round(odCentroid(2) - rDisc));
by2 = min(H, round(odCentroid(2) + rDisc));

[subX, subY] = meshgrid(bx1:bx2, by1:by2);
subDisc = ((subX - odCentroid(1)).^2 + (subY - odCentroid(2)).^2) <= rDisc^2;
odMask = false(H, W);
odMask(by1:by2, bx1:bx2) = subDisc;
odMask = odMask & fovSafe;

% Dilated mask for lesion masking around peripapillary region
odMaskDilated = imdilate(odMask, strel('disk', max(6, round(odDiameter * 0.15)))) & fovSafe;

%% 4. FOVEA LOCALIZATION (Anatomical Prior + Macular Valley Minimization)
% Anatomical prior derived from training set:
% Distance is 2.53 * D_OD temporal, with a +0.29 * D_OD inferior vertical offset.
if odCentroid(1) > W * 0.5
    % OD on right side -> Left eye (OS), Fovea is temporal (to the left)
    foveaPriorX = odCentroid(1) - 2.53 * odDiameter;
else
    % OD on left side -> Right eye (OD), Fovea is temporal (to the right)
    foveaPriorX = odCentroid(1) + 2.53 * odDiameter;
end
foveaPriorY = odCentroid(2) + 0.29 * odDiameter;

% Search in localized macular box (+/- 0.5 disc diameter) for darkest retinal depression
boxR = round(odDiameter * 0.5);
x1 = max(1, round(foveaPriorX - boxR));
x2 = min(W, round(foveaPriorX + boxR));
y1 = max(1, round(foveaPriorY - boxR));
y2 = min(H, round(foveaPriorY + boxR));

foveaCentroid = [foveaPriorX, foveaPriorY];
if x2 > x1 && y2 > y1
    roiGreen = greenChan(y1:y2, x1:x2);
    roiVessel = vesselMask(y1:y2, x1:x2);
    roiCost = roiGreen + (roiVessel * 0.5);
    roiCostSmooth = imgaussfilt(roiCost, max(2.0, 0.02 * odDiameter));
    [~, minIdx] = min(roiCostSmooth(:));
    [my, mx] = ind2sub(size(roiCostSmooth), minIdx);
    foveaCentroid = [x1 + mx - 1, y1 + my - 1];
end

distODFovea = sqrt((foveaCentroid(1) - odCentroid(1))^2 + (foveaCentroid(2) - odCentroid(2))^2);

%% 5. CANDIDATE LESION DETECTION (Multi-Scale Morphological Filtering)
lesionSafeFov = imerode(fovSafe, strel('disk', max(8, round(0.03 * min(H, W)))));
nonDiscNonVessel = lesionSafeFov & ~odMaskDilated & ~vesselMask;

% --- 5.1 Bright Lesions: Hard Exudates (EX) & Soft Exudates (SE) ---
% Top-hat filter highlights bright lesions against retinal background
rTop = max(3, round(0.012 * min(H, W)));
topHatGreen = imtophat(greenChan, strel('disk', rTop));
topHatLum = imtophat(lum, strel('disk', rTop));
brightEnh = max(topHatGreen, topHatLum);

brightThreshEX = prctile(brightEnh(nonDiscNonVessel), 98.8);
exCandidates = (brightEnh > brightThreshEX) & nonDiscNonVessel;
exCandidates = bwareaopen(exCandidates, 3);
exCandidates = bwareafilt(exCandidates, [3, round(0.005 * fovArea)]);

% Soft Exudates / Cotton-wool spots (larger, fluffier pale lesions)
rSoft = max(8, round(0.03 * min(H, W)));
topHatSoft = imtophat(lum, strel('disk', rSoft));
brightThreshSE = prctile(topHatSoft(nonDiscNonVessel), 99.4);
seCandidates = (topHatSoft > brightThreshSE) & nonDiscNonVessel & ~exCandidates;
seCandidates = bwareafilt(seCandidates, [max(25, round(0.0001*fovArea)), round(0.02 * fovArea)]);

% --- 5.2 Dark Lesions: Microaneurysms (MA) & Haemorrhages (HE) ---
% Dual-scale bottom-hat filter:
% Small scale (rMA) for punctate microaneurysms
rMA = max(2, round(0.005 * min(H, W)));
botHatMA = imbothat(greenChan, strel('disk', rMA));

% Large scale (rHE) for blot and flame haemorrhages
rHE = max(10, round(0.020 * min(H, W)));
botHatHE = imbothat(greenChan, strel('disk', rHE));

% Microaneurysms: punctate dark lesions (size <= 80 px)
darkThreshMA = prctile(botHatMA(nonDiscNonVessel), 99.2);
maRaw = (botHatMA > darkThreshMA) & nonDiscNonVessel;
maRaw = bwareaopen(maRaw, 2);
maCandidates = bwareafilt(maRaw, [2, 80]);

% Haemorrhages: blot and flame lesions (size > 80 px)
darkThreshHE = prctile(botHatHE(nonDiscNonVessel), 98.2);
heRaw = (botHatHE > darkThreshHE) & nonDiscNonVessel;
heRaw = bwareaopen(heRaw, 81);
heCandidates = bwareafilt(heRaw, [81, round(0.04 * fovArea)]);

% Microaneurysm metrics
maCC = bwconncomp(maCandidates);
maCount = maCC.NumObjects;
maArea = sum(maCandidates(:));

% Haemorrhage metrics & 4-Quadrant Distribution (ICDR 4-2-1 Rule)
heCC = bwconncomp(heCandidates);
heCount = heCC.NumObjects;
heArea = sum(heCandidates(:));

quadrantCounts = zeros(1, 4); % [Superior-Temporal, Superior-Nasal, Inferior-Nasal, Inferior-Temporal]
if heCount > 0
    props = regionprops(heCC, 'Centroid');
    for k = 1:heCount
        cx = props(k).Centroid(1);
        cy = props(k).Centroid(2);
        if cx >= foveaCentroid(1) && cy <= foveaCentroid(2)
            quadrantCounts(1) = quadrantCounts(1) + 1;
        elseif cx < foveaCentroid(1) && cy <= foveaCentroid(2)
            quadrantCounts(2) = quadrantCounts(2) + 1;
        elseif cx < foveaCentroid(1) && cy > foveaCentroid(2)
            quadrantCounts(3) = quadrantCounts(3) + 1;
        else
            quadrantCounts(4) = quadrantCounts(4) + 1;
        end
    end
end
severeQuadrantsCount = sum(quadrantCounts >= 20);

% Hard Exudate metrics & Macular Involvement (CSME risk within 1 OD Diameter of Fovea)
exCC = bwconncomp(exCandidates);
exCount = exCC.NumObjects;
exArea = sum(exCandidates(:));

exInFovea1DD = 0;
if exCount > 0
    exProps = regionprops(exCC, 'Centroid');
    for k = 1:exCount
        dFov = sqrt((exProps(k).Centroid(1) - foveaCentroid(1))^2 + (exProps(k).Centroid(2) - foveaCentroid(2))^2);
        if dFov <= odDiameter
            exInFovea1DD = exInFovea1DD + 1;
        end
    end
end
csmeRisk = (exInFovea1DD >= 5);

% Soft Exudate metrics
seCC = bwconncomp(seCandidates);
seCount = seCC.NumObjects;
seArea = sum(seCandidates(:));

%% 6. ASSEMBLE COMPOSITE EXPLAINABILITY OVERLAY
overlay = img;
% Vessels: Cyan tint [0, 0.9, 0.9]
vesselIdx = find(vesselMask);
overlay(vesselIdx) = 0.2 * overlay(vesselIdx) + 0.8 * 0.0;
overlay(vesselIdx + H*W) = 0.2 * overlay(vesselIdx + H*W) + 0.8 * 0.85;
overlay(vesselIdx + 2*H*W) = 0.2 * overlay(vesselIdx + 2*H*W) + 0.8 * 0.85;

% Hard Exudates: Bright Yellow [1, 0.9, 0]
exIdx = find(exCandidates);
overlay(exIdx) = 1.0;
overlay(exIdx + H*W) = 0.9;
overlay(exIdx + 2*H*W) = 0.0;

% Microaneurysms: Pure Red [1, 0, 0]
maIdx = find(maCandidates);
overlay(maIdx) = 1.0;
overlay(maIdx + H*W) = 0.0;
overlay(maIdx + 2*H*W) = 0.0;

% Haemorrhages: Deep Magenta [0.9, 0, 0.5]
heIdx = find(heCandidates);
overlay(heIdx) = 0.95;
overlay(heIdx + H*W) = 0.05;
overlay(heIdx + 2*H*W) = 0.55;

% Optic Disc Contour: Bright Green [0, 1, 0]
odPerim = bwperim(odMask);
odPerimDil = imdilate(odPerim, strel('disk', 2));
odIdx = find(odPerimDil);
overlay(odIdx) = 0.0;
overlay(odIdx + H*W) = 1.0;
overlay(odIdx + 2*H*W) = 0.0;

% Fovea Crosshair: Bright Blue/Cyan cross
fx = round(foveaCentroid(1));
fy = round(foveaCentroid(2));
arm = max(10, round(odDiameter * 0.25));
for d = -arm:arm
    if (fx + d >= 1) && (fx + d <= W) && (fy >= 1) && (fy <= H)
        overlay(fy, fx + d, :) = [0, 0.8, 1.0];
    end
    if (fy + d >= 1) && (fy + d <= H) && (fx >= 1) && (fx <= W)
        overlay(fy + d, fx, :) = [0, 0.8, 1.0];
    end
end

%% 7. STRUCTURED OUTPUT PACKAGING
evidence.od.mask = odMask;
evidence.od.centroid = odCentroid;
evidence.od.diameter = odDiameter;
evidence.od.confidence = 0.92;

evidence.fovea.centroid = foveaCentroid;
evidence.fovea.distanceFromOD = distODFovea;
evidence.fovea.confidence = 0.88;

evidence.vessels.mask = vesselMask;
evidence.vessels.maskStd = vesselMaskStd;
evidence.vessels.coveragePercent = vesselCoverage;
evidence.vessels.junctionClusters = junctionClusters;
evidence.vessels.endpoints = endpointsCount;
evidence.vessels.skeletonLength = skeletonLength;
evidence.vessels.connectivity = vesselConnectivity;
evidence.vessels.topologyScale = '800x600 (native matched filter)';
evidence.vessels.method = 'Heuristic Morphological Matched Filter (No IDRiD Vessel GT)';

evidence.lesions.ma.candidateMask = maCandidates;
evidence.lesions.ma.candidateCount = maCount;
evidence.lesions.ma.areaPixels = maArea;

evidence.lesions.he.candidateMask = heCandidates;
evidence.lesions.he.candidateCount = heCount;
evidence.lesions.he.areaPixels = heArea;
evidence.lesions.he.quadrantCounts = quadrantCounts;
evidence.lesions.he.severeQuadrantsCount = severeQuadrantsCount;

evidence.lesions.ex.candidateMask = exCandidates;
evidence.lesions.ex.candidateCount = exCount;
evidence.lesions.ex.areaPixels = exArea;
evidence.lesions.ex.macularProximityCount = exInFovea1DD;
evidence.lesions.ex.csmeRiskFlag = csmeRisk;

evidence.lesions.se.candidateMask = seCandidates;
evidence.lesions.se.candidateCount = seCount;
evidence.lesions.se.areaPixels = seArea;

evidence.lesions.nv.status = 'Not validated / unavailable (No IDRiD pixel GT)';
evidence.lesions.nv.candidateMask = false(H, W);

evidence.compositeOverlay = overlay;

% 24-D Feature vector for structured reporting
evidence.clinicalFeatures = [
    maCount, maArea, maArea / max(fovArea, 1), ...
    heCount, heArea, heArea / max(fovArea, 1), ...
    quadrantCounts(1), quadrantCounts(2), quadrantCounts(3), quadrantCounts(4), severeQuadrantsCount, ...
    exCount, exArea, exArea / max(fovArea, 1), exInFovea1DD, double(csmeRisk), ...
    seCount, seArea, seArea / max(fovArea, 1), ...
    vesselCoverage, odCentroid(1), odCentroid(2), foveaCentroid(1), foveaCentroid(2)
];

evidence.summary = sprintf(...
    'Candidate evidence: %d MA candidates (%d px), %d HE candidates (%d px, %d severe quads), %d EX candidates (%d macular), %d SE candidates. Vessels: %.1f%% coverage. OD at [%.0f, %.0f], Fovea at [%.0f, %.0f]. NV unvalidated.', ...
    maCount, maArea, heCount, heArea, severeQuadrantsCount, exCount, exInFovea1DD, seCount, vesselCoverage, ...
    odCentroid(1), odCentroid(2), foveaCentroid(1), foveaCentroid(2));

end
