function generate_evidence_panels()
% =========================================================================
% GENERATE_EVIDENCE_PANELS (Module 3 Supervised Final)
% =========================================================================
% Generates 6-panel clinical explainability figures across DR grades:
%   - Grade 0: Normal Retina (IDRiD_138)
%   - Grade 1: Mild NPDR (IDRiD_021)
%   - Grade 2: Moderate NPDR (IDRiD_03)
%   - Grade 3: Severe NPDR (IDRiD_01)
%   - Grade 4: Proliferative DR (IDRiD_05)
%
% 6-PANEL STRUCTURE:
%   1. Original Fundus
%   2. OD + Fovea (Validated Landmarks)
%   3. Vessel Evidence (Heuristic Morphology — No IDRiD Vessel GT)
%   4. Candidate Lesion Evidence (MA/HE/EX/SE — Candidate count only)
%   5. Swin V1 Grad-CAM (Model Attribution)
%   6. Combined Clinical Explainability (Multimodal Decision Support)
% =========================================================================

baseDir = fileparts(mfilename('fullpath'));
resultsDir = fullfile(baseDir, 'results', 'representative_evidence_panels');
if ~exist(resultsDir, 'dir')
    mkdir(resultsDir);
end

gradcamTempDir = fullfile(baseDir, 'results', 'gradcam_temp');

cases = {
    'G0_Normal', 'IDRiD_138.jpg', 'Grade 0 — Normal Retina', ...
    fullfile(baseDir, '..', 'module3_Supervised_Experimental', 'data', 'IDRiD', 'C. Localization', '1. Original Images', 'a. Training Set', 'IDRiD_138.jpg');
    
    'G1_Mild', 'IDRiD_021.jpg', 'Grade 1 — Mild NPDR (Microaneurysms)', ...
    fullfile(baseDir, '..', 'module3_Supervised_Experimental', 'data', 'IDRiD', 'C. Localization', '1. Original Images', 'a. Training Set', 'IDRiD_021.jpg');
    
    'G2_Moderate', 'IDRiD_03.jpg', 'Grade 2 — Moderate NPDR (MA + HE + EX)', ...
    fullfile(baseDir, '..', 'module3_Supervised_Experimental', 'data', 'IDRiD', 'A. Segmentation', '1. Original Images', 'a. Training Set', 'IDRiD_03.jpg');
    
    'G3_Severe', 'IDRiD_01.jpg', 'Grade 3 — Severe NPDR (Extensive HE + EX)', ...
    fullfile(baseDir, '..', 'module3_Supervised_Experimental', 'data', 'IDRiD', 'A. Segmentation', '1. Original Images', 'a. Training Set', 'IDRiD_01.jpg');
    
    'G4_Proliferative', 'IDRiD_05.jpg', 'Grade 4 — Proliferative DR (High Lesion Burden)', ...
    fullfile(baseDir, '..', 'module3_Supervised_Experimental', 'data', 'IDRiD', 'A. Segmentation', '1. Original Images', 'a. Training Set', 'IDRiD_05.jpg')
};

numCases = size(cases, 1);
fprintf('Generating %d representative evidence panels...\n', numCases);

for k = 1:numCases
    tag = cases{k, 1};
    imgName = cases{k, 2};
    titleStr = cases{k, 3};
    imgPath = cases{k, 4};
    
    fprintf('  Processing [%d/%d] %s (%s)...\n', k, numCases, tag, imgName);
    rawImg = imread(imgPath);
    [H, W, ~] = size(rawImg);
    
    % Extract retinal evidence
    ev = extract_retinal_evidence(rawImg);
    
    % Resize for standardized panel display
    dispW = 600;
    dispH = round(H * (dispW / W));
    
    imgStd = imresize(rawImg, [dispH, dispW]);
    
    % Panel 1: Original Fundus
    p1 = imgStd;
    
    % Panel 2: OD + Fovea Landmark Localization
    p2 = imgStd;
    odMaskScaled = imresize(ev.od.mask, [dispH, dispW], 'nearest');
    odPerim = bwperim(odMaskScaled);
    odPerimDil = imdilate(odPerim, strel('disk', 2));
    odIdx = find(odPerimDil);
    p2(odIdx) = 0;
    p2(odIdx + dispH*dispW) = 255;
    p2(odIdx + 2*dispH*dispW) = 0;
    
    scaleX = dispW / W;
    scaleY = dispH / H;
    fx = round(ev.fovea.centroid(1) * scaleX);
    fy = round(ev.fovea.centroid(2) * scaleY);
    arm = 12;
    for d = -arm:arm
        if (fx + d >= 1) && (fx + d <= dispW) && (fy >= 1) && (fy <= dispH)
            p2(fy, fx + d, :) = [0, 220, 255];
        end
        if (fy + d >= 1) && (fy + d <= dispH) && (fx >= 1) && (fx <= dispW)
            p2(fy + d, fx, :) = [0, 220, 255];
        end
    end
    
    % Panel 3: Vessel Evidence (Heuristic Morphology)
    vessScaled = imresize(ev.vessels.mask, [dispH, dispW], 'nearest');
    grayFundus = repmat(rgb2gray(imgStd), [1, 1, 3]);
    p3 = grayFundus;
    vIdx = find(vessScaled);
    p3(vIdx) = 0;
    p3(vIdx + dispH*dispW) = 220;
    p3(vIdx + 2*dispH*dispW) = 220;
    
    % Panel 4: Candidate Lesion Evidence
    p4 = imgStd;
    maScaled = imresize(ev.lesions.ma.candidateMask, [dispH, dispW], 'nearest');
    heScaled = imresize(ev.lesions.he.candidateMask, [dispH, dispW], 'nearest');
    exScaled = imresize(ev.lesions.ex.candidateMask, [dispH, dispW], 'nearest');
    seScaled = imresize(ev.lesions.se.candidateMask, [dispH, dispW], 'nearest');
    
    % Hard Exudates (Yellow)
    exIdx = find(exScaled);
    p4(exIdx) = 255; p4(exIdx + dispH*dispW) = 230; p4(exIdx + 2*dispH*dispW) = 0;
    
    % Microaneurysms (Red)
    maIdx = find(maScaled);
    p4(maIdx) = 255; p4(maIdx + dispH*dispW) = 0; p4(maIdx + 2*dispH*dispW) = 0;
    
    % Haemorrhages (Magenta)
    heIdx = find(heScaled);
    p4(heIdx) = 240; p4(heIdx + dispH*dispW) = 0; p4(heIdx + 2*dispH*dispW) = 140;
    
    % Soft Exudates (Cyan/White)
    seIdx = find(seScaled);
    p4(seIdx) = 180; p4(seIdx + dispH*dispW) = 230; p4(seIdx + 2*dispH*dispW) = 255;
    
    % Panel 5: Swin V1 Grad-CAM Model Attribution
    camPath = fullfile(gradcamTempDir, tag, 'gradcam_overlay.png');
    if exist(camPath, 'file')
        camImg = imread(camPath);
        p5 = imresize(camImg, [dispH, dispW]);
    else
        p5 = imgStd;
    end
    
    % Panel 6: Combined Multimodal Explainability
    p6 = imresize(im2uint8(ev.compositeOverlay), [dispH, dispW]);
    
    % Render composite 2x3 figure
    fig = figure('Visible', 'off', 'Color', [0.08, 0.09, 0.12], 'Position', [50, 50, 1600, 1050]);
    
    % Title annotation
    annotation(fig, 'textbox', [0.05, 0.94, 0.90, 0.05], 'String', ...
        sprintf('NetraAI Retinal Evidence Subsystem — %s (%s)', titleStr, imgName), ...
        'FontSize', 14, 'FontWeight', 'bold', 'Color', [1.0, 1.0, 1.0], ...
        'HorizontalAlignment', 'center', 'LineStyle', 'none');
    
    % Subplot 1
    subplot(2, 3, 1);
    imshow(p1);
    title({'1. Original Fundus Photography', 'Clinical fundus input'}, ...
        'Color', [0.9, 0.9, 0.9], 'FontSize', 10, 'FontWeight', 'bold');
    
    % Subplot 2
    subplot(2, 3, 2);
    imshow(p2);
    title({sprintf('2. OD + Fovea (Validated Landmarks)'), ...
           sprintf('OD [%.0f, %.0f] | Fov [%.0f, %.0f] (%.2f DD)', ev.od.centroid(1), ev.od.centroid(2), ev.fovea.centroid(1), ev.fovea.centroid(2), ev.fovea.distanceFromOD/max(ev.od.diameter, 1))}, ...
        'Color', [0.9, 0.9, 0.9], 'FontSize', 10, 'FontWeight', 'bold');
    
    % Subplot 3
    subplot(2, 3, 3);
    imshow(p3);
    title({'3. Retinal Vessel Tree (Morphological)', ...
           sprintf('Coverage: %.1f%% (Heuristic — No IDRiD vessel GT)', ev.vessels.coveragePercent)}, ...
        'Color', [0.9, 0.9, 0.9], 'FontSize', 10, 'FontWeight', 'bold');
    
    % Subplot 4
    subplot(2, 3, 4);
    imshow(p4);
    title({'4. Candidate Lesion Evidence', ...
           sprintf('MA: %d cand | HE: %d cand | EX: %d cand | SE: %d cand (NV unval.)', ...
           ev.lesions.ma.candidateCount, ev.lesions.he.candidateCount, ev.lesions.ex.candidateCount, ev.lesions.se.candidateCount)}, ...
        'Color', [0.9, 0.9, 0.9], 'FontSize', 10, 'FontWeight', 'bold');
    
    % Subplot 5
    subplot(2, 3, 5);
    imshow(p5);
    title({'5. Swin V1 Model Attribution (Grad-CAM)', ...
           'Attribution regions driving screening decision'}, ...
        'Color', [0.9, 0.9, 0.9], 'FontSize', 10, 'FontWeight', 'bold');
    
    % Subplot 6
    subplot(2, 3, 6);
    imshow(p6);
    title({'6. Combined Clinical Explainability', ...
           'Multimodal fusion for clinician decision support'}, ...
        'Color', [0.9, 0.9, 0.9], 'FontSize', 10, 'FontWeight', 'bold');
    
    % Export figure
    outPanelPath = fullfile(resultsDir, sprintf('panel_%s.png', tag));
    exportgraphics(fig, outPanelPath, 'Resolution', 180);
    close(fig);
    fprintf('    -> Saved: %s\n', outPanelPath);
end

fprintf('All %d representative panels successfully created.\n', numCases);

end
