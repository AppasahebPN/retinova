function result = run_Segmentation(img)
% ============================================================
% MODULE 3 - RETINAL EVIDENCE & PATHOLOGY ANALYSIS (UPGRADED)
% ============================================================
% Computes complete retinal evidence:
%   1. Retinal vessel segmentation & vascular metrics
%   2. Anatomical landmarks (Optic Disc, Fovea)
%   3. Candidate lesion extractions:
%      - Microaneurysm candidates (MA)
%      - Haemorrhage candidates (HE, 4-quadrant counts)
%      - Hard exudate candidates (EX, macular proximity, CSME risk flag)
%      - Soft exudate / cotton-wool candidates (SE)
%   4. Neovascularization (NV) assessment (explicitly structured)
%   5. Composite Retinal Abnormality Map
%
% NOTE:
% All lesion detections represent CANDIDATE evidence for clinician review,
% NOT confirmed clinical diagnostic claims.
% ============================================================

if nargin < 1
    error('run_Segmentation requires an input fundus image.');
end

baseDir = fileparts(fileparts(mfilename('fullpath')));
if exist(fullfile(baseDir, 'module3_Supervised_Final'), 'dir')
    addpath(fullfile(baseDir, 'module3_Supervised_Final'));
end

% Execute comprehensive retinal evidence engine
evidence = extract_retinal_evidence(img);

% Extract masks and basic structures
vesselMask = evidence.vessels.mask;
vesselCoverage = evidence.vessels.coveragePercent;
vesselPixelCount = sum(vesselMask(:));

maMask = evidence.lesions.ma.candidateMask;
heMask = evidence.lesions.he.candidateMask;
exMask = evidence.lesions.ex.candidateMask;
seMask = evidence.lesions.se.candidateMask;

brightMask = exMask | seMask;
darkMask = maMask | heMask;
lesionMask = brightMask | darkMask;

imgPixels = numel(lesionMask);
totalLesionArea = sum(lesionMask(:));
lesionCoverage = 100.0 * (totalLesionArea / max(imgPixels, 1));

totalCandidates = evidence.lesions.ma.candidateCount + ...
                  evidence.lesions.he.candidateCount + ...
                  evidence.lesions.ex.candidateCount + ...
                  evidence.lesions.se.candidateCount;

brightCount = evidence.lesions.ex.candidateCount + evidence.lesions.se.candidateCount;
darkCount = evidence.lesions.ma.candidateCount + evidence.lesions.he.candidateCount;

% Vascular morphology metrics (evaluated at native 800x600 matched-filter scale)
try
    if isfield(evidence.vessels, 'junctionClusters')
        branchingComplexity = evidence.vessels.junctionClusters;
        vesselEndpoints = evidence.vessels.endpoints;
        skeletonLength = evidence.vessels.skeletonLength;
        vesselConnectivity = evidence.vessels.connectivity;
    else
        scaleFactor = 800.0 / size(vesselMask, 2);
        vStd = imresize(vesselMask, scaleFactor, 'nearest');
        sStd = bwmorph(vStd, 'skel', Inf);
        sPruned = bwmorph(sStd, 'spur', 3);
        bStd = bwmorph(sPruned, 'branchpoints');
        ccB = bwconncomp(bStd);
        branchingComplexity = ccB.NumObjects;
        eStd = bwmorph(sPruned, 'endpoints');
        vesselEndpoints = sum(eStd(:));
        skeletonLength = sum(sPruned(:));
        ccV = bwconncomp(vStd);
        vesselConnectivity = ccV.NumObjects;
    end
    
    dt = bwdist(~vesselMask);
    skelFull = bwmorph(vesselMask, 'skel', Inf);
    skelVals = dt(skelFull);
    if ~isempty(skelVals)
        meanCaliber = 2.0 * mean(skelVals);
    else
        meanCaliber = 0.0;
    end
catch
    branchingComplexity = 0;
    vesselEndpoints = 0;
    skeletonLength = 0;
    meanCaliber = 0.0;
    vesselConnectivity = 0;
end

vesselDensity = vesselPixelCount / max(imgPixels, 1);

% Package structured result
result = struct();

% Backward-compatible fields
result.vesselMask = vesselMask;
result.lesionMask = lesionMask;
result.vesselCoverage = vesselCoverage;
result.lesionCoverage = lesionCoverage;
result.totalLesionArea = totalLesionArea;
result.lesionCount = totalCandidates;
result.brightLesionCount = brightCount;
result.darkLesionCount = darkCount;
result.evidenceOverlay = evidence.compositeOverlay;
result.compositeOverlay = evidence.compositeOverlay;

% Calculated vessel morphology
result.vesselPixelCount = vesselPixelCount;
result.vesselDensity = vesselDensity;
result.branchingComplexity = branchingComplexity;
result.junctionClusters = branchingComplexity;
result.vesselEndpoints = vesselEndpoints;
result.skeletonLength = skeletonLength;
result.vesselConnectivity = vesselConnectivity;
result.meanCaliber = meanCaliber;

% Categorized candidate masks
result.brightMask = brightMask;
result.darkMask = darkMask;
result.maMask = maMask;
result.heMask = heMask;
result.exMask = exMask;
result.seMask = seMask;

% Candidate breakdown metrics
result.maCount = evidence.lesions.ma.candidateCount;
result.maArea = evidence.lesions.ma.areaPixels;
result.heCount = evidence.lesions.he.candidateCount;
result.heArea = evidence.lesions.he.areaPixels;
result.heQuadrantCounts = evidence.lesions.he.quadrantCounts;
result.heSevereQuadrantsCount = evidence.lesions.he.severeQuadrantsCount;
result.exCount = evidence.lesions.ex.candidateCount;
result.exArea = evidence.lesions.ex.areaPixels;
result.exMacularProximityCount = evidence.lesions.ex.macularProximityCount;
result.exCsmeRiskFlag = double(evidence.lesions.ex.csmeRiskFlag);
result.seCount = evidence.lesions.se.candidateCount;
result.seArea = evidence.lesions.se.areaPixels;

% Anatomical landmarks
result.od = evidence.od;
result.fovea = evidence.fovea;

% Neovascularization structured assessment (honest, non-fabricated)
nvStruct = struct();
nvStruct.status = "unavailable";
nvStruct.confidence = [];
nvStruct.regions = [];
nvStruct.artifact = "";
nvStruct.method = "No dedicated validated NV detector available";
nvStruct.candidateEvidence = "NV CANDIDATE EVIDENCE — NOT A CONFIRMED FINDING: No validated pixel-level detector in repository";
result.neovascularization = nvStruct;

% Full structured evidence sub-objects
result.evidence = evidence;
result.clinicalFeatures = evidence.clinicalFeatures;
result.summary = evidence.summary;
result.status = "SUCCESS";

fprintf('\n============================================================\n');
fprintf('MODULE 3 — RETINAL EVIDENCE & PATHOLOGY ANALYSIS\n');
fprintf('============================================================\n');
fprintf('Vessel Coverage          : %.2f%% (%d px)\n', vesselCoverage, vesselPixelCount);
fprintf('Vessel Density           : %.4f\n', vesselDensity);
fprintf('Branching Complexity     : %d branch points\n', branchingComplexity);
fprintf('Mean Vessel Caliber      : %.2f px\n', meanCaliber);
fprintf('Total Candidate Lesions  : %d (%.2f%% area)\n', totalCandidates, lesionCoverage);
fprintf('  * Bright Candidates    : %d (EX: %d, SE: %d)\n', brightCount, result.exCount, result.seCount);
fprintf('  * Dark Candidates      : %d (MA: %d, HE: %d)\n', darkCount, result.maCount, result.heCount);
fprintf('  * CSME Macular Risk    : %s (%d exudates within 1 DD)\n', string(result.exCsmeRiskFlag > 0), result.exMacularProximityCount);
fprintf('NV Assessment Status     : %s\n', nvStruct.status);
fprintf('============================================================\n');

end
