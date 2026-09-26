function [fovCoverage, fovMask] = checkFOV(img)
% checkFOV
% Detects the retinal field of view and calculates
% the percentage of the image occupied by the fundus.
%
% OUTPUTS:
% fovCoverage - percentage of image identified as retinal field
% fovMask     - binary retinal field mask

% Convert RGB image to grayscale
if size(img, 3) == 3
    grayImage = rgb2gray(img);
else
    grayImage = img;
end

% Convert to double
grayImage = im2double(grayImage);

% Create an initial mask based on brightness.
% The background outside the retinal field is generally dark.
fovMask = grayImage > 0.05;

% Remove small isolated regions
fovMask = bwareaopen(fovMask, 500);

% Fill holes inside the retinal field
fovMask = imfill(fovMask, 'holes');

% Keep the largest connected component
connectedComponents = bwconncomp(fovMask);

if connectedComponents.NumObjects > 0

    componentSizes = cellfun(@numel, ...
        connectedComponents.PixelIdxList);

    [~, largestIndex] = max(componentSizes);

    fovMask = false(size(fovMask));

    fovMask(connectedComponents.PixelIdxList{largestIndex}) = true;

end

% Calculate FOV coverage
totalPixels = numel(fovMask);
retinalPixels = sum(fovMask(:));

fovCoverage = (retinalPixels / totalPixels) * 100;

end