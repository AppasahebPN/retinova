function [lesionMask, vesselMask, debug] = segment_lesions(img)

% ============================================================
% MODULE 3 - RETINAL VESSEL + LESION CANDIDATE SEGMENTATION
%
% Self-contained CPU version
%
% Input:
%   RGB or grayscale fundus image
%
% Output:
%   lesionMask
%   vesselMask
%   debug
%
% Requires:
%   Image Processing Toolbox
%
% IMPORTANT:
% This generates lesion candidates/evidence.
% It is NOT a diagnostic model.
% ============================================================

%% ============================================================
% 1. PREPARE IMAGE
% ============================================================

img = im2double(img);

if size(img,3) == 1
    img = repmat(img,[1 1 3]);
end

greenNative = img(:,:,2);
lumNative   = rgb2gray(img);

[Hnative,Wnative] = size(lumNative);

%% ============================================================
% 2. FIELD OF VIEW
% ============================================================

fovMaskNative = lumNative > 0.06;

fovMaskNative = imfill( ...
    fovMaskNative,'holes');

if any(fovMaskNative(:))
    fovMaskNative = bwareafilt( ...
        fovMaskNative,1);
end

%% ============================================================
% 3. SAFE FOV
% ============================================================

vesselErode = max(4, ...
    round(0.05 * min(Hnative,Wnative)));

lesionErode = max(6, ...
    round(0.08 * min(Hnative,Wnative)));

fovMaskErodedNative = ...
    imerode( ...
        fovMaskNative, ...
        strel('disk',vesselErode));

fovMaskLesionNative = ...
    imerode( ...
        fovMaskNative, ...
        strel('disk',lesionErode));

%% ============================================================
% 4. OPTIC DISC DETECTION
% ============================================================
%
% Detect the brightest connected retinal region.
% No separate helper function is used.
% ============================================================

discMaskNative = false(Hnative,Wnative);

validPixels = greenNative(fovMaskErodedNative);

if ~isempty(validPixels)

    discLevel = prctile(validPixels,99.2);

    discCandidate = ...
        greenNative >= discLevel;

    discCandidate = ...
        discCandidate & fovMaskErodedNative;

    discCandidate = ...
        imclose( ...
            discCandidate, ...
            strel('disk',5));

    discCandidate = ...
        imfill( ...
            discCandidate,'holes');

    discCandidate = ...
        bwareaopen( ...
            discCandidate,30);

    if any(discCandidate(:))

        components = ...
            bwconncomp(discCandidate);

        stats = ...
            regionprops( ...
                components, ...
                'Area', ...
                'Eccentricity');

        if ~isempty(stats)

            scores = zeros( ...
                numel(stats),1);

            for q = 1:numel(stats)

                scores(q) = ...
                    stats(q).Area * ...
                    (1-stats(q).Eccentricity);

            end

            [~,bestRegion] = ...
                max(scores);

            discMaskNative( ...
                components.PixelIdxList{bestRegion}) = true;

        end

    end

end

%% ============================================================
% 5. DILATE OPTIC DISC
% ============================================================

discRadius = max(10, ...
    round(0.015 * min(Hnative,Wnative)) + 4);

discMaskDilatedNative = ...
    imdilate( ...
        discMaskNative, ...
        strel('disk',discRadius));

discMaskDilatedNative = ...
    discMaskDilatedNative & ...
    fovMaskErodedNative;

%% ============================================================
% 6. STANDARDIZE VESSEL RESOLUTION
% ============================================================

targetWidth = 700;

scaleFactor = ...
    targetWidth / Wnative;

targetHeight = ...
    max(1,round(Hnative*scaleFactor));

greenStd = imresize( ...
    greenNative, ...
    [targetHeight,targetWidth], ...
    'bicubic');

fovMaskStd = imresize( ...
    fovMaskErodedNative, ...
    [targetHeight,targetWidth], ...
    'nearest');

discMaskStd = imresize( ...
    discMaskDilatedNative, ...
    [targetHeight,targetWidth], ...
    'nearest');

%% ============================================================
% 7. VESSEL PREPROCESSING
% ============================================================

diskRadius = ...
    max(4,round(0.014*targetWidth));

vesselEnhanced = ...
    imbothat( ...
        greenStd, ...
        strel('disk',diskRadius));

vesselEnhanced = ...
    imgaussfilt( ...
        vesselEnhanced,0.5);

vesselEnhanced(~fovMaskStd) = 0;
vesselEnhanced(discMaskStd) = 0;

%% ============================================================
% 8. FIBERMETRIC VESSELNESS
% ============================================================

thicknessRange = [2 3 4 5];

vesselResponse = ...
    fibermetric( ...
        vesselEnhanced, ...
        thicknessRange, ...
        'ObjectPolarity','bright');

vesselResponse(~fovMaskStd) = 0;
vesselResponse(discMaskStd) = 0;

%% ============================================================
% 9. NORMALIZE VESSEL RESPONSE
% ============================================================

validStd = ...
    fovMaskStd & ...
    ~discMaskStd;

responseValues = ...
    vesselResponse(validStd);

if isempty(responseValues)

    vesselMask = false(Hnative,Wnative);
    lesionMask = false(Hnative,Wnative);

    debug = struct();

    return;

end

responseLow = ...
    prctile(responseValues,1);

responseHigh = ...
    prctile(responseValues,99.5);

if responseHigh > responseLow

    vesselResponse = ...
        (vesselResponse-responseLow) / ...
        (responseHigh-responseLow);

end

vesselResponse = ...
    min(max(vesselResponse,0),1);

%% ============================================================
% 10. HYSTERESIS VESSEL MASK
% ============================================================

highThreshold = ...
    prctile( ...
        vesselResponse(validStd),96);

lowThreshold = ...
    prctile( ...
        vesselResponse(validStd),82);

seedMaskStd = ...
    vesselResponse >= highThreshold;

candidateMaskStd = ...
    vesselResponse >= lowThreshold;

seedMaskStd = ...
    seedMaskStd & validStd;

candidateMaskStd = ...
    candidateMaskStd & validStd;

%% ============================================================
% 11. MORPHOLOGICAL RECONSTRUCTION
% ============================================================

vesselRecon = ...
    imreconstruct( ...
        seedMaskStd, ...
        candidateMaskStd);

%% ============================================================
% 12. SKELETON BRANCH PRUNING
% ============================================================

minBranchLength = 10;

vesselSkelStd = ...
    bwskel( ...
        vesselRecon, ...
        'MinBranchLength', ...
        minBranchLength);

%% ============================================================
% 13. RESTORE VESSEL WIDTH
% ============================================================

vesselPrunedStd = ...
    imreconstruct( ...
        vesselSkelStd, ...
        vesselRecon);

vesselPrunedStd = ...
    bwmorph( ...
        vesselPrunedStd,'clean');

%% ============================================================
% 14. RETURN VESSEL MASK TO NATIVE RESOLUTION
% ============================================================

vesselMaskUpsampled = ...
    imresize( ...
        vesselPrunedStd, ...
        [Hnative,Wnative], ...
        'nearest');

vesselMask = ...
    vesselMaskUpsampled & ...
    fovMaskErodedNative & ...
    ~discMaskDilatedNative;

%% ============================================================
% 15. VESSEL CLEANUP
% ============================================================

vesselMask = ...
    bwareaopen( ...
        vesselMask,15);

vesselMask = ...
    bwmorph( ...
        vesselMask,'bridge');

vesselMask = ...
    bwareaopen( ...
        vesselMask,20);

%% ============================================================
% 16. BRIGHT LESION DETECTION
% ============================================================

% Use Gaussian background estimation.
% Avoids expensive medfilt2/ordfilt2.

lesionSigma = ...
    max(5,round(0.008 * ...
    min(Hnative,Wnative)));

lesionBackground = ...
    imgaussfilt( ...
        greenNative, ...
        lesionSigma);

brightResidual = ...
    greenNative - ...
    lesionBackground;

%% ============================================================
% 17. DARK LESION DETECTION
% ============================================================

darkResidual = ...
    lesionBackground - ...
    greenNative;

%% ============================================================
% 18. LESION VALID REGIONS
% ============================================================

lesionValidRegion = ...
    fovMaskLesionNative & ...
    ~discMaskDilatedNative;

vesselExclusion = ...
    imdilate( ...
        vesselMask, ...
        strel('disk',3));

brightValidRegion = ...
    lesionValidRegion;

darkValidRegion = ...
    lesionValidRegion & ...
    ~vesselExclusion;

%% ============================================================
% 19. BRIGHT LESION CANDIDATES
% ============================================================

brightValues = ...
    brightResidual(brightValidRegion);

if isempty(brightValues)

    brightLesionMask = ...
        false(Hnative,Wnative);

else

    brightThreshold = ...
        prctile( ...
            brightValues,99.4);

    brightLesionMask = ...
        brightResidual > ...
        brightThreshold;

    brightLesionMask = ...
        brightLesionMask & ...
        brightValidRegion;

end

%% ============================================================
% 20. BRIGHT LESION CLEANUP
% ============================================================

brightLesionMask = ...
    bwareaopen( ...
        brightLesionMask,4);

CC = bwconncomp( ...
    brightLesionMask,8);

cleanBright = ...
    false(Hnative,Wnative);

for k = 1:CC.NumObjects

    area = ...
        numel(CC.PixelIdxList{k});

    if area >= 4 && ...
       area <= 1200

        cleanBright( ...
            CC.PixelIdxList{k}) = true;

    end

end

brightLesionMask = cleanBright;

%% ============================================================
% 21. DARK LESION CANDIDATES
% ============================================================

darkValues = ...
    darkResidual(darkValidRegion);

if isempty(darkValues)

    darkLesionMask = ...
        false(Hnative,Wnative);

else

    darkThreshold = ...
        prctile( ...
            darkValues,99.4);

    darkLesionMask = ...
        darkResidual > ...
        darkThreshold;

    darkLesionMask = ...
        darkLesionMask & ...
        darkValidRegion;

end

%% ============================================================
% 22. DARK LESION CLEANUP
% ============================================================

darkLesionMask = ...
    bwareaopen( ...
        darkLesionMask,4);

CC = bwconncomp( ...
    darkLesionMask,8);

cleanDark = ...
    false(Hnative,Wnative);

for k = 1:CC.NumObjects

    area = ...
        numel(CC.PixelIdxList{k});

    if area >= 4 && ...
       area <= 300

        cleanDark( ...
            CC.PixelIdxList{k}) = true;

    end

end

darkLesionMask = cleanDark;

%% ============================================================
% 23. REMOVE FOV BORDER
% ============================================================

borderRing = ...
    fovMaskNative & ...
    ~fovMaskLesionNative;

brightLesionMask(borderRing) = false;
darkLesionMask(borderRing) = false;

%% ============================================================
% 24. FINAL LESION MASK
% ============================================================

lesionMask = ...
    brightLesionMask | ...
    darkLesionMask;

lesionMask = ...
    lesionMask & ...
    fovMaskLesionNative;

lesionMask = ...
    lesionMask & ...
    ~discMaskDilatedNative;

lesionMask = ...
    lesionMask & ...
    ~imdilate( ...
        vesselMask, ...
        strel('disk',1));

lesionMask = ...
    bwareaopen( ...
        lesionMask,4);

%% ============================================================
% 25. OUTPUT
% ============================================================

lesionMask = logical(lesionMask);
vesselMask = logical(vesselMask);

%% ============================================================
% 26. DEBUG INFORMATION
% ============================================================

debug = struct();

debug.fovMaskNative = ...
    fovMaskNative;

debug.fovMaskEroded = ...
    fovMaskErodedNative;

debug.fovMaskLesion = ...
    fovMaskLesionNative;

debug.discMask = ...
    discMaskNative;

debug.discMaskDilated = ...
    discMaskDilatedNative;

debug.vesselResponseStd = ...
    mat2gray(vesselResponse);

debug.seedMaskStd = ...
    seedMaskStd;

debug.candidateMaskStd = ...
    candidateMaskStd;

debug.vesselReconStd = ...
    vesselRecon;

debug.vesselSkelStd = ...
    vesselSkelStd;

debug.vesselPrunedStd = ...
    vesselPrunedStd;

debug.brightLesionMask = ...
    brightLesionMask;

debug.darkLesionMask = ...
    darkLesionMask;

debug.scaleFactor = ...
    scaleFactor;

debug.targetWidth = ...
    targetWidth;

debug.vesselCoverage = ...
    100 * nnz(vesselMask) / ...
    numel(vesselMask);

debug.lesionCoverage = ...
    100 * nnz(lesionMask) / ...
    numel(lesionMask);

end