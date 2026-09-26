clc;
clear;
close all;

fprintf('============================================\n');
fprintf('          IQA DATASET ANALYSIS\n');
fprintf('============================================\n');

%% Load combined dataset

file = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\results\APTOS_IQA_Combined.csv";

T = readtable(file);

fprintf('Total images: %d\n\n', height(T));

%% DR grade distribution

fprintf('DR GRADE DISTRIBUTION\n');
fprintf('---------------------\n');

for grade = 0:4
    count = sum(T.diagnosis == grade);
    fprintf('Grade %d : %d images (%.2f%%)\n', ...
        grade, count, 100*count/height(T));
end

%% Overall feature statistics

fprintf('\nIQA FEATURE STATISTICS\n');
fprintf('----------------------\n');

fprintf('Sharpness:\n');
fprintf('  Min    : %.8f\n', min(T.sharpness));
fprintf('  Median : %.8f\n', median(T.sharpness));
fprintf('  Mean   : %.8f\n', mean(T.sharpness));
fprintf('  Max    : %.8f\n', max(T.sharpness));

fprintf('\nIllumination:\n');
fprintf('  Min    : %.6f\n', min(T.illumination));
fprintf('  Median : %.6f\n', median(T.illumination));
fprintf('  Mean   : %.6f\n', mean(T.illumination));
fprintf('  Max    : %.6f\n', max(T.illumination));

fprintf('\nFOV Coverage:\n');
fprintf('  Min    : %.2f%%\n', min(T.fovCoverage));
fprintf('  Median : %.2f%%\n', median(T.fovCoverage));
fprintf('  Mean   : %.2f%%\n', mean(T.fovCoverage));
fprintf('  Max    : %.2f%%\n', max(T.fovCoverage));

fprintf('\nArtifact Area:\n');
fprintf('  Min    : %.2f%%\n', min(T.artifactArea));
fprintf('  Median : %.2f%%\n', median(T.artifactArea));
fprintf('  Mean   : %.2f%%\n', mean(T.artifactArea));
fprintf('  Max    : %.2f%%\n', max(T.artifactArea));

%% Feature statistics by DR grade

fprintf('\n============================================\n');
fprintf('      IQA FEATURES BY DR GRADE\n');
fprintf('============================================\n');

for grade = 0:4

    idx = T.diagnosis == grade;

    fprintf('\nDR Grade %d (%d images)\n', ...
        grade, sum(idx));

    fprintf('Sharpness     : %.8f\n', ...
        mean(T.sharpness(idx)));

    fprintf('Illumination  : %.6f\n', ...
        mean(T.illumination(idx)));

    fprintf('FOV Coverage  : %.2f%%\n', ...
        mean(T.fovCoverage(idx)));

    fprintf('Artifact Area : %.2f%%\n', ...
        mean(T.artifactArea(idx)));

end

fprintf('\n============================================\n');
fprintf('             ANALYSIS COMPLETE\n');
fprintf('============================================\n');