function result = run_SwinV1(imageInput, returnCam)
% =========================================================================
% run_SwinV1
% =========================================================================
% Official MATLAB Interface for Frozen Swin V2 Tiny V1 Model.
% SIH26038: Explainable AI for Diabetic Retinopathy Screening in Rural India
%
% LOCKED CONFIGURATION:
%   Architecture:           Swin V2 Tiny (Torchvision swin_v2_t)
%   Input Resolution:       512 x 512 x 3 RGB
%   Checkpoint:             module4_Grading_Final/checkpoints/best_model.pt
%   Calibration Temp (T*):  1.4555
%   Screening Thresh (tau*):0.2993
%   Screening Rule:         P(G2+) >= 0.2993 -> REFER, else SCREEN
%   Secondary Task:         5-Grade ICDR Severity (G0, G1, G2, G3, G4)
%
% INPUT:
%   imageInput - Path to fundus image (char/string) OR in-memory image array (uint8/double)
%   returnCam  - Optional boolean flag to compute Grad-CAM heatmap (default: false)
%
% OUTPUT:
%   result - Struct matching exact required clinical schema:
%       result.model_name
%       result.input_resolution
%       result.g2plus_probability_raw
%       result.temperature
%       result.g2plus_probability_calibrated
%       result.threshold
%       result.referable
%       result.decision
%       result.grade
%       result.grade_probabilities
%       result.inference_time
%       (optional: result.gradcam_heatmap if returnCam=true)
% =========================================================================

if nargin < 1
    error('run_SwinV1 requires an image path or MATLAB image array as input.');
end

if nargin < 2
    returnCam = false;
end

%% Determine base project paths
baseDir = 'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';
if ~exist(baseDir, 'dir')
    thisFile = mfilename('fullpath');
    if ~isempty(thisFile)
        integrationDir = fileparts(thisFile);
        gradingFinalDir = fileparts(integrationDir);
        baseDir = fileparts(gradingFinalDir);
    end
end
pythonExe = 'C:\Users\Appasaheb\AppData\Local\Programs\Python\Python313\python.exe';
scriptPy = fullfile(baseDir, 'module4_Grading_Final', 'integration', 'run_SwinV1.py');

%% Handle Image Input
tempFileCreated = false;
if ischar(imageInput) || isstring(imageInput)
    imagePath = char(imageInput);
    if ~isfile(imagePath)
        % Try relative to baseDir
        altPath = fullfile(baseDir, imagePath);
        if isfile(altPath)
            imagePath = altPath;
        else
            error('Image file not found: %s', imagePath);
        end
    end
elseif isnumeric(imageInput) || islogical(imageInput)
    % In-memory MATLAB image array
    imgUint8 = im2uint8(imageInput);
    if size(imgUint8, 3) == 1
        imgUint8 = repmat(imgUint8, [1, 1, 3]);
    end
    tempFile = fullfile(tempdir, sprintf('swin_input_%d_%d.png', round(posixtime(datetime('now'))), randi(10000)));
    imwrite(imgUint8, tempFile);
    imagePath = tempFile;
    tempFileCreated = true;
else
    error('Unsupported input type: %s. Expected image path or matrix.', class(imageInput));
end

%% Execute Inference (Method 1: Direct in-process pyenv, fallback to Method 2: CLI)
raw = [];
methodUsed = "UNKNOWN";

try
    % Check if pyenv is loaded and python path is set
    pe = pyenv;
    if pe.Version ~= ""
        % Add baseDir to python sys.path if not already present
        py_sys = py.importlib.import_module('sys');
        py_path = cell(py_sys.path);
        if ~any(strcmp(py_path, baseDir))
            py_sys.path.insert(int32(0), baseDir);
        end
        
        % Import predictor module
        predictor_mod = py.importlib.import_module('module4_Grading_Final.integration.swinV1_predictor');
        py_res = predictor_mod.predict_image(imagePath, returnCam);
        
        % Convert Python dict to JSON string then decode to MATLAB struct
        py_json_str = string(py.json.dumps(py_res));
        raw = jsondecode(py_json_str);
        methodUsed = "IN_PROCESS_PYENV";
    end
catch ME
    % In-process failed, fall back gracefully to CLI
    methodUsed = "CLI_FALLBACK";
end

if isempty(raw)
    % Method 2: CLI Execution via system call
    camFlag = "";
    if returnCam
        camFlag = "--cam";
    end
    cmd = sprintf('"%s" "%s" --image "%s" %s', pythonExe, scriptPy, imagePath, camFlag);
    [status, cmdout] = system(cmd);
    
    if status ~= 0
        if tempFileCreated && isfile(tempFile)
            delete(tempFile);
        end
        error('Swin V1 inference failed (code %d):\n%s', status, cmdout);
    end
    
    % Parse stdout between tokens
    startToken = '--- RESULT_START ---';
    endToken = '--- RESULT_END ---';
    sIdx = strfind(cmdout, startToken);
    eIdx = strfind(cmdout, endToken);
    
    if isempty(sIdx) || isempty(eIdx)
        if tempFileCreated && isfile(tempFile)
            delete(tempFile);
        end
        error('Could not locate JSON output in Swin V1 stdout:\n%s', cmdout);
    end
    
    jsonStr = strtrim(cmdout(sIdx + length(startToken) : eIdx - 1));
    raw = jsondecode(jsonStr);
    methodUsed = "CLI_EXECUTION";
end

%% Clean up temporary image file if created
if tempFileCreated && isfile(tempFile)
    delete(tempFile);
end

%% Construct Clean Required Output Structure
result = struct();
result.model_name                     = string(raw.model_name);
result.input_resolution              = double(raw.input_resolution(:))';
result.g2plus_probability_raw         = double(raw.g2plus_probability_raw);
result.temperature                    = double(raw.temperature);
result.g2plus_probability_calibrated  = double(raw.g2plus_probability_calibrated);
result.threshold                      = double(raw.threshold);
result.referable                      = logical(raw.referable);
result.decision                       = string(raw.decision);
result.grade                          = int32(raw.grade);
result.grade_probabilities            = double(raw.grade_probabilities(:))';
result.inference_time                 = double(raw.inference_time);
result.execution_method               = methodUsed;

if isfield(raw, 'gradcam_heatmap')
    result.gradcam_heatmap = double(raw.gradcam_heatmap);
end
if isfield(raw, 'gradcam_overlay')
    result.gradcam_overlay = uint8(raw.gradcam_overlay);
end
if isfield(raw, 'gradcam_raw')
    result.gradcam_raw = uint8(raw.gradcam_raw);
end

end
