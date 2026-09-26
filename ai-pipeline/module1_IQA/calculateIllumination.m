function [illuminationScore, uniformityMap] = calculateIllumination(img)
% calculateIllumination
% Measures illumination uniformity across a fundus image.
%
% OUTPUTS:
% illuminationScore - overall illumination uniformity score
% uniformityMap     - local brightness variation map

% Convert RGB image to grayscale
if size(img, 3) == 3
    grayImage = rgb2gray(img);
else
    grayImage = img;
end

% Convert to double
grayImage = im2double(grayImage);

% Divide image into a 4 x 4 grid
rows = 4;
cols = 4;

[height, width] = size(grayImage);

uniformityMap = zeros(rows, cols);

% Calculate local mean brightness
for r = 1:rows
    for c = 1:cols

        rowStart = floor((r-1) * height / rows) + 1;
        rowEnd   = floor(r * height / rows);

        colStart = floor((c-1) * width / cols) + 1;
        colEnd   = floor(c * width / cols);

        block = grayImage(rowStart:rowEnd, colStart:colEnd);

        % Mean brightness of this region
        uniformityMap(r,c) = mean(block(:));

    end
end

% Measure variation between regions
meanBrightness = mean(uniformityMap(:));

brightnessVariation = std(uniformityMap(:));

% Convert variation into a 0-1 score
illuminationScore = 1 - brightnessVariation;

% Keep score between 0 and 1
illuminationScore = max(0, min(1, illuminationScore));

end