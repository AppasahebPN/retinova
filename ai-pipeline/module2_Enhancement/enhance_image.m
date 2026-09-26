function enhanced = enhance_image(img)
% ============================================================
% MODULE 2 - IMAGE QUALITY ENHANCEMENT
% Diabetic Retinopathy Screening
%
% Color-preserving fundus enhancement
%
% Operations:
%   1. FOV detection
%   2. Contrast enhancement using CLAHE
%   3. Mild illumination correction
%   4. Color preservation
%   5. Mild denoising
% ============================================================

    % --------------------------------------------------------
    % 1. Convert image to RGB double
    % --------------------------------------------------------
    if size(img,3) == 1
        img = repmat(img,[1 1 3]);
    end

    img = im2double(img);

    % --------------------------------------------------------
    % 2. Detect retinal FOV
    % --------------------------------------------------------
    gray = rgb2gray(img);

    fovMask = gray > 0.05;

    fovMask = imfill(fovMask,'holes');
    fovMask = bwareafilt(fovMask,1);

    % Smooth FOV boundary
    fovMask = imopen(fovMask,strel('disk',3));

    % --------------------------------------------------------
    % 3. Convert RGB -> LAB
    % --------------------------------------------------------
    lab = rgb2lab(img);

    L = lab(:,:,1) / 100;

    % --------------------------------------------------------
    % 4. Mild illumination normalization
    % --------------------------------------------------------
    % Estimate background illumination from luminance
    smoothL = imgaussfilt(L,30);

    % Normalize illumination gently
    meanIllum = mean(smoothL(fovMask));

    correctedL = L;

    correctedL(fovMask) = ...
        L(fovMask) + 0.25 * (meanIllum - smoothL(fovMask));

    % Keep values valid
    correctedL = min(max(correctedL,0),1);

    % --------------------------------------------------------
    % 5. CLAHE contrast enhancement
    % --------------------------------------------------------
    enhancedL = correctedL;

    tempL = correctedL;
    tempL(~fovMask) = 0;

    claheL = adapthisteq( ...
        tempL, ...
        'ClipLimit',0.008, ...
        'NumTiles',[8 8], ...
        'Distribution','uniform');

    enhancedL(fovMask) = claheL(fovMask);

    % --------------------------------------------------------
    % 6. Blend original and enhanced luminance
    % --------------------------------------------------------
    % Prevent over-enhancement
    finalL = 0.65 * correctedL + 0.35 * enhancedL;

    finalL = min(max(finalL,0),1);

    % --------------------------------------------------------
    % 7. Put enhanced luminance back into LAB
    % --------------------------------------------------------
    lab(:,:,1) = finalL * 100;

    % Keep original A/B channels
    % This preserves fundus color.

    enhanced = lab2rgb(lab);

    % --------------------------------------------------------
    % 8. Mild denoising
    % --------------------------------------------------------
    enhanced = imgaussfilt(enhanced,0.3);

    % --------------------------------------------------------
    % 9. Restore original black background
    % --------------------------------------------------------
    for c = 1:3

        channel = enhanced(:,:,c);
        original = img(:,:,c);

        channel(~fovMask) = original(~fovMask);

        enhanced(:,:,c) = channel;

    end

    % --------------------------------------------------------
    % 10. Final range
    % --------------------------------------------------------
    enhanced = min(max(enhanced,0),1);

end