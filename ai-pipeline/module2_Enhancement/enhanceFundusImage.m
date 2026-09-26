function [enhancedImg, metrics] = enhanceFundusImage(img)
% enhanceFundusImage
% ------------------------------------------------------------
% Single-image fundus enhancement for DR screening.
%
% Input:
%   img        - RGB fundus image
%
% Outputs:
%   enhancedImg - enhanced RGB image
%   metrics     - enhancement measurements
%
% Processing:
%   1. Normalize image
%   2. Illumination correction
%   3. CLAHE contrast enhancement
%   4. Mild RGB reconstruction
%
% Designed for CPU/GPU-independent execution.
% ------------------------------------------------------------

%% Validate input

if nargin < 1
    error('enhanceFundusImage requires an input image.');
end

if size(img,3) == 1
    img = repmat(img,[1 1 3]);
end

if size(img,3) ~= 3
    error('Input image must be grayscale or RGB.');
end

%% Convert to double

img = im2double(img);

%% Create FOV mask

grayImg = rgb2gray(img);

fovMask = grayImg > 0.05;

fovMask = bwareaopen(fovMask,500);

fovMask = imfill(fovMask,'holes');

CC = bwconncomp(fovMask);

if CC.NumObjects > 0

    numPixels = cellfun(@numel,CC.PixelIdxList);

    [~,largestIdx] = max(numPixels);

    fovMask = false(size(grayImg));

    fovMask(CC.PixelIdxList{largestIdx}) = true;

end

%% ------------------------------------------------------------
% STEP 1: Illumination correction
% ------------------------------------------------------------

green = img(:,:,2);

% Estimate slowly varying background illumination
background = imgaussfilt(green,25);

% Avoid division by very small values
background = max(background,0.05);

correctedGreen = green ./ background;

% Normalize
correctedGreen = mat2gray(correctedGreen);

%% ------------------------------------------------------------
% STEP 2: CLAHE contrast enhancement
% ------------------------------------------------------------

enhancedGreen = adapthisteq( ...
    correctedGreen, ...
    'NumTiles',[8 8], ...
    'ClipLimit',0.01, ...
    'Distribution','rayleigh');

%% ------------------------------------------------------------
% STEP 3: Preserve retinal appearance
% ------------------------------------------------------------

% Keep red and blue channels mostly unchanged.
% Use enhanced green channel because retinal vessels
% are strongly represented in the green channel.

enhancedImg = img;

enhancedImg(:,:,2) = enhancedGreen;

%% ------------------------------------------------------------
% STEP 4: Mild contrast adjustment
% ------------------------------------------------------------

for c = 1:3

    channel = enhancedImg(:,:,c);

    % Mild percentile-based contrast stretching
    lowHigh = stretchlim(channel,[0.01 0.99]);

    if lowHigh(2) > lowHigh(1)

        channel = imadjust( ...
            channel, ...
            lowHigh, ...
            [0 1]);

    end

    enhancedImg(:,:,c) = channel;

end

%% ------------------------------------------------------------
% STEP 5: Restore background outside FOV
% ------------------------------------------------------------

for c = 1:3

    channel = enhancedImg(:,:,c);

    originalChannel = img(:,:,c);

    channel(~fovMask) = originalChannel(~fovMask);

    enhancedImg(:,:,c) = channel;

end

%% ------------------------------------------------------------
% STEP 6: Calculate enhancement metrics
% ------------------------------------------------------------

originalGray = rgb2gray(img);
enhancedGray = rgb2gray(enhancedImg);

inside = fovMask;

if nnz(inside) > 0

    originalContrast = std(originalGray(inside));
    enhancedContrast = std(enhancedGray(inside));

    originalMean = mean(originalGray(inside));
    enhancedMean = mean(enhancedGray(inside));

else

    originalContrast = std(originalGray(:));
    enhancedContrast = std(enhancedGray(:));

    originalMean = mean(originalGray(:));
    enhancedMean = mean(enhancedGray(:));

end

%% Metrics structure

metrics = struct();

metrics.originalContrast = originalContrast;
metrics.enhancedContrast = enhancedContrast;

metrics.contrastGain = ...
    enhancedContrast / max(originalContrast,eps);

metrics.originalMeanIntensity = originalMean;
metrics.enhancedMeanIntensity = enhancedMean;

metrics.fovCoverage = ...
    100 * nnz(fovMask) / numel(fovMask);

metrics.status = "SUCCESS";

end