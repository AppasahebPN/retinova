import os

evidence_m_path = r'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Final\extract_retinal_evidence.m'
run_seg_path = r'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Segmentation\run_Segmentation.m'

# 1. Update extract_retinal_evidence.m
with open(evidence_m_path, 'r', encoding='utf-8') as f:
    ev_code = f.read()

target_ev_vessels = '''% Clean linear vessel structure
vesselMaskStd = imclose(vesselMaskStd, strel('disk', 1));
vesselMask = imresize(vesselMaskStd, [H, W], 'nearest') & fovSafe;
vesselCoverage = (sum(vesselMask(:)) / max(fovArea, 1)) * 100.0;'''

replacement_ev_vessels = '''% Clean linear vessel structure
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
vesselConnectivity = ccVesselStd.NumObjects;'''

target_ev_pack = '''evidence.vessels.mask = vesselMask;
evidence.vessels.coveragePercent = vesselCoverage;
evidence.vessels.method = 'Heuristic Morphological Matched Filter (No IDRiD Vessel GT)';'''

replacement_ev_pack = '''evidence.vessels.mask = vesselMask;
evidence.vessels.maskStd = vesselMaskStd;
evidence.vessels.coveragePercent = vesselCoverage;
evidence.vessels.junctionClusters = junctionClusters;
evidence.vessels.endpoints = endpointsCount;
evidence.vessels.skeletonLength = skeletonLength;
evidence.vessels.connectivity = vesselConnectivity;
evidence.vessels.topologyScale = '800x600 (native matched filter)';
evidence.vessels.method = 'Heuristic Morphological Matched Filter (No IDRiD Vessel GT)';'''

if target_ev_vessels in ev_code and target_ev_pack in ev_code:
    ev_code = ev_code.replace(target_ev_vessels, replacement_ev_vessels)
    ev_code = ev_code.replace(target_ev_pack, replacement_ev_pack)
    with open(evidence_m_path, 'w', encoding='utf-8') as f:
        f.write(ev_code)
    print("Successfully updated extract_retinal_evidence.m with native-scale topology analysis!")
else:
    print("Could not find targets in extract_retinal_evidence.m")

# 2. Update run_Segmentation.m
with open(run_seg_path, 'r', encoding='utf-8') as f:
    seg_code = f.read()

target_seg_morph = '''% Vascular morphology metrics
try
    skel = bwmorph(vesselMask, 'skel', Inf);
    bp = bwmorph(skel, 'branchpoints');
    branchingComplexity = sum(bp(:));
    
    ep = bwmorph(skel, 'endpoints');
    vesselEndpoints = sum(ep(:));
    
    dt = bwdist(~vesselMask);
    skelVals = dt(skel);
    if ~isempty(skelVals)
        meanCaliber = 2.0 * mean(skelVals);
    else
        meanCaliber = 0.0;
    end
    
    ccVessel = bwconncomp(vesselMask);
    vesselConnectivity = ccVessel.NumObjects;
catch
    branchingComplexity = 0;
    vesselEndpoints = 0;
    meanCaliber = 0.0;
    vesselConnectivity = 0;
end'''

replacement_seg_morph = '''% Vascular morphology metrics (evaluated at native 800x600 matched-filter scale)
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
end'''

target_seg_results = '''% Calculated vessel morphology
result.vesselPixelCount = vesselPixelCount;
result.vesselDensity = vesselDensity;
result.branchingComplexity = branchingComplexity;
result.vesselEndpoints = vesselEndpoints;
result.vesselConnectivity = vesselConnectivity;
result.meanCaliber = meanCaliber;'''

replacement_seg_results = '''% Calculated vessel morphology
result.vesselPixelCount = vesselPixelCount;
result.vesselDensity = vesselDensity;
result.branchingComplexity = branchingComplexity;
result.junctionClusters = branchingComplexity;
result.vesselEndpoints = vesselEndpoints;
result.skeletonLength = skeletonLength;
result.vesselConnectivity = vesselConnectivity;
result.meanCaliber = meanCaliber;'''

if target_seg_morph in seg_code and target_seg_results in seg_code:
    seg_code = seg_code.replace(target_seg_morph, replacement_seg_morph)
    seg_code = seg_code.replace(target_seg_results, replacement_seg_results)
    with open(run_seg_path, 'w', encoding='utf-8') as f:
        f.write(seg_code)
    print("Successfully updated run_Segmentation.m with native-scale topology metrics!")
else:
    print("Could not find targets in run_Segmentation.m")
