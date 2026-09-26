function sharpnessScore = calculateSharpness(img)
% calculateSharpness
% Calculates the sharpness of a fundus image
% using variance of the Laplacian.

% Use green channel for fundus analysis
if size(img, 3) == 3
    greenChannel = img(:, :, 2);
else
    greenChannel = img;
end

% Convert image to double
greenChannel = im2double(greenChannel);

% Laplacian filter
laplacianKernel = [0 1 0;
    1 -4 1;
    0 1 0];

% Apply Laplacian filter
laplacianImage = imfilter( ...
    greenChannel, ...
    laplacianKernel, ...
    'replicate');

% Variance of Laplacian
sharpnessScore = var(laplacianImage(:));

end