function IQA_Report(fileName, sharpnessScore, illuminationScore, ...
    fovCoverage, artifactScore, artifactType)
% IQA_Report
% Displays the image quality assessment results.

fprintf('\n');
fprintf('============================================\n');
fprintf('       IMAGE QUALITY ASSESSMENT REPORT\n');
fprintf('============================================\n');

fprintf('Image Name        : %s\n', fileName);
fprintf('--------------------------------------------\n');

fprintf('Sharpness Score   : %.6f\n', sharpnessScore);
fprintf('Illumination Score: %.6f\n', illuminationScore);
fprintf('FOV Coverage      : %.2f%%\n', fovCoverage);
fprintf('Artifact Area     : %.2f%%\n', artifactScore);
fprintf('Artifact Type     : %s\n', artifactType);

fprintf('--------------------------------------------\n');
fprintf('IQA feature extraction completed.\n');
fprintf('============================================\n');

end