function [artifactScore, artifactMask, artifactType] = detectArtifacts(img, fovMask)
% detectArtifacts
% Detects basic image artifacts inside the retinal field.
%
% Current baseline detects:
%   1. Very bright regions (possible glare)
%   2. Very dark regions (possible occlusion)
%
% OUTPUTS:
% artifactScore - percentage of FOV affected by artifacts
% artifactMask  - binary artifact mask
% artifactType  - description of detected artifact

% Convert image to grayscale
if size(img, 3) == 3
    grayImage = rgb2gray(img);
else
    grayImage = img;
end

% Convert to double
grayImage = im2double(grayImage);

% Detect very bright regions
brightMask = grayImage > 0.95;

% Detect very dark regions
darkMask = grayImage < 0.05;

% Only consider artifacts inside the retinal FOV
brightMask = brightMask & fovMask;
darkMask = darkMask & fovMask;

% Remove tiny isolated regions
brightMask = bwareaopen(brightMask, 20);
darkMask = bwareaopen(darkMask, 20);

% Combine artifact regions
artifactMask = brightMask | darkMask;

% Calculate percentage of FOV affected
fovPixels = sum(fovMask(:));
artifactPixels = sum(artifactMask(:));

if fovPixels > 0
    artifactScore = (artifactPixels / fovPixels) * 100;
else
    artifactScore = 100;
end

% Determine artifact type
brightPixels = sum(brightMask(:));
darkPixels = sum(darkMask(:));

if brightPixels > 0 && darkPixels > 0
    artifactType = "Glare + Dark Occlusion";
elseif brightPixels > 0
    artifactType = "Possible Glare";
elseif darkPixels > 0
    artifactType = "Possible Dark Occlusion";
else
    artifactType = "No Major Artifact";
end

end