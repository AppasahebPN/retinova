function reportInfo = generate_NetraAI_Report(imagePath, patientInfo, outputDir)
% =========================================================================
% generate_NetraAI_Report
% =========================================================================
% Official NetraAI Clinical Screening Report Generator.
% SIH26038: Explainable AI for Diabetic Retinopathy Screening in Rural India
%
% Implements the official clinical report layout:
%   1. Screening Result Hero Card (REFERABLE vs NON-REFERABLE vs RECAPTURE)
%   2. Patient & Technician Information
%   3. Fundus Image Acquisitions
%   4. "Why This Result?" Explainable Grad-CAM Evidence
%   5. Clinical Explanation (ICDR Guideline Narrative)
%   6. Actionable Clinical Recommendation
%   7. NetraAI System Information
%
% INPUTS:
%   imagePath   - Path to input retinal fundus image
%   patientInfo - Optional struct with patient/facility fields:
%                   .patient_id, .name, .age, .sex, .eye, .technician, .centre, .camera
%   outputDir   - Optional output directory for report artifacts
%
% OUTPUT:
%   reportInfo  - Struct with paths to generated artifacts:
%                   .report_id, .html_path, .card_path, .txt_path, .ascii_card
% =========================================================================

basePath = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';
pythonExe = 'C:\Users\Appasaheb\AppData\Local\Programs\Python\Python313\python.exe';
reportPy = fullfile(basePath, 'module4_Grading_Final', 'reporting', 'generate_report.py');

if nargin < 1
    error('generate_NetraAI_Report requires an image path.');
end

if ~isfile(imagePath)
    alt = fullfile(basePath, imagePath);
    if isfile(alt)
        imagePath = alt;
    else
        error('Image file not found: %s', imagePath);
    end
end

if nargin < 2 || isempty(patientInfo)
    patientInfo = struct();
    patientInfo.patient_id = "NETRA-PT-9428";
    patientInfo.name = "Ramesh Patel";
    patientInfo.age = 58;
    patientInfo.sex = "Male";
    patientInfo.eye = "Left Eye (OS)";
    patientInfo.technician = "Priya Sharma (Vision Technician)";
    patientInfo.centre = "Primary Health Centre (PHC), Sangli District, Maharashtra";
    patientInfo.camera = "Forus 3nethra Classic HD (Non-Mydriatic 45°)";
end

if nargin < 3 || isempty(outputDir)
    outputDir = fullfile(basePath, 'module4_Grading_Final', 'reporting', 'output');
end

if ~isfolder(outputDir)
    mkdir(outputDir);
end

%% Execute Report Generation via Python
% Convert patientInfo struct to JSON string
pJsonStr = jsonencode(patientInfo);

% Execute Python generator
cmd = sprintf('"%s" -c "import sys; sys.path.insert(0, r''%s''); from module4_Grading_Final.reporting.generate_report import generate_report_bundle; generate_report_bundle(r''%s'', patient_info=%s, output_dir=r''%s'')"', ...
    pythonExe, basePath, imagePath, pJsonStr, outputDir);

[status, cmdout] = system(cmd);

if status ~= 0
    error('Report generation failed (code %d):\n%s', status, cmdout);
end

fprintf('\n%s\n', cmdout);

%% Locate Generated Files
htmlFiles = dir(fullfile(outputDir, 'report_NETRA-*.html'));
cardFiles = dir(fullfile(outputDir, 'report_card_NETRA-*.png'));
txtFiles  = dir(fullfile(outputDir, 'report_NETRA-*.txt'));

reportInfo = struct();
if ~isempty(htmlFiles)
    [~, idx] = max([htmlFiles.datenum]);
    reportInfo.html_path = fullfile(outputDir, htmlFiles(idx).name);
    reportInfo.report_id = extractBetween(htmlFiles(idx).name, 'report_', '.html');
end
if ~isempty(cardFiles)
    [~, idx] = max([cardFiles.datenum]);
    reportInfo.card_path = fullfile(outputDir, cardFiles(idx).name);
end
if ~isempty(txtFiles)
    [~, idx] = max([txtFiles.datenum]);
    reportInfo.txt_path = fullfile(outputDir, txtFiles(idx).name);
    reportInfo.ascii_card = fileread(reportInfo.txt_path);
end

end
