%% =========================================================
% MODULE 6 - DISTRICT RESOURCE PLANNER
% =========================================================

clc;
close all;

fprintf('\n');
fprintf('====================================================\n');
fprintf('      SIH26038 DISTRICT RESOURCE PLANNER\n');
fprintf('====================================================\n');


%% =========================================================
% 1. PATHS
% ==========================================================

basePath = ...
    'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB';

module6Path = ...
    fullfile(basePath,'module6_Simulink');

modelFile = ...
    fullfile(module6Path, ...
    'DR_District_Resource_Planner.slx');

outputDir = module6Path;


%% =========================================================
% 2. LOAD MODEL
% ==========================================================

fprintf('\nLoading Simulink model...\n');

if ~isfile(modelFile)

    error( ...
        'Model not found:\n%s', ...
        modelFile);

end


modelName = ...
    'DR_District_Resource_Planner';


if ~bdIsLoaded(modelName)

    load_system(modelFile);

end


open_system(modelName);


fprintf('Model loaded successfully.\n');



%% =========================================================
% 3. FIND REQUIRED SIM-EVENTS BLOCKS
% ==========================================================

fprintf('\nFinding SimEvents blocks...\n');


% ---------------------------------------------------------
% Entity Generator
% ---------------------------------------------------------

generatorBlocks = find_system( ...
    modelName, ...
    'BlockType','EntityGenerator');


if isempty(generatorBlocks)

    error( ...
        ['Entity Generator block not found.\n' ...
         'Make sure the SimEvents model contains an Entity Generator.']);

end


generatorBlock = generatorBlocks{1};


% ---------------------------------------------------------
% Entity Servers
% ---------------------------------------------------------

serverBlocks = find_system( ...
    modelName, ...
    'BlockType','EntityServer');


if numel(serverBlocks) < 2

    error( ...
        ['At least two Entity Server blocks are required.\n' ...
         'Expected:\n' ...
         '1. AI Screening Server\n' ...
         '2. Ophthalmologist Review']);

end


% ---------------------------------------------------------
% Identify the two servers by their visible names
% ---------------------------------------------------------

serverNames = strings( ...
    numel(serverBlocks),1);


for k = 1:numel(serverBlocks)

    serverNames(k) = string( ...
        get_param( ...
            serverBlocks{k}, ...
            'Name'));

end


fprintf('\nEntity Servers found:\n');

for k = 1:numel(serverBlocks)

    fprintf('%d. %s\n', ...
        k, ...
        serverNames(k));

end


% ---------------------------------------------------------
% Locate AI server
% ---------------------------------------------------------

aiIndex = find( ...
    contains( ...
        lower(serverNames), ...
        "ai"), ...
        1);


if isempty(aiIndex)

    % Fallback:
    % first Entity Server is assumed to be AI server

    aiIndex = 1;

end


aiServerBlock = ...
    serverBlocks{aiIndex};


% ---------------------------------------------------------
% Locate doctor server
% ---------------------------------------------------------

doctorIndex = find( ...
    contains( ...
        lower(serverNames), ...
        ["ophthalmologist","doctor"]), ...
        1);


if isempty(doctorIndex)

    % Fallback:
    % second Entity Server is assumed to be doctor server

    remaining = ...
        setdiff( ...
            1:numel(serverBlocks), ...
            aiIndex);


    doctorIndex = remaining(1);

end


doctorServerBlock = ...
    serverBlocks{doctorIndex};


% ---------------------------------------------------------
% Display selected blocks
% ---------------------------------------------------------

fprintf('\nSelected blocks:\n');

fprintf('Entity Generator       : %s\n', ...
    generatorBlock);

fprintf('AI Screening Server    : %s\n', ...
    aiServerBlock);

fprintf('Ophthalmologist Server : %s\n', ...
    doctorServerBlock);


%% =========================================================
% 4. VERIFY BLOCK TYPES
% ==========================================================

fprintf('\nVerifying SimEvents block types...\n');


fprintf('Generator type : %s\n', ...
    get_param(generatorBlock,'BlockType'));


fprintf('AI server type : %s\n', ...
    get_param(aiServerBlock,'BlockType'));


fprintf('Doctor type    : %s\n', ...
    get_param(doctorServerBlock,'BlockType'));


fprintf('SimEvents blocks located successfully.\n');

%% =========================================================
% 4. RESOURCE-PLANNING PARAMETERS
% ==========================================================

fprintf('\nConfiguring planning parameters...\n');


% Your measured complete AI pipeline runtime
aiServiceTime = 6.16;


% Planning assumption for ophthalmologist review
doctorServiceTime = 30;


% Working day
workingHours = 8;

simulationTime = ...
    workingHours * 3600;


% District workloads
patientLoads = ...
    [500 1000 2000 5000];


% AI server configurations
aiServerCounts = ...
    [1 2 3 4];


% Doctor configurations
doctorCounts = ...
    [1 2 3 4 5 6 7 8];


% Current SimEvents model sends all entities to the doctor.
% This is explicitly a WORST-CASE 100% referral scenario.
referralRate = 1.00;


fprintf('AI service time      : %.2f sec/image\n', ...
    aiServiceTime);

fprintf('Doctor service time  : %.2f sec/review\n', ...
    doctorServiceTime);

fprintf('Working hours        : %.0f hours/day\n', ...
    workingHours);

fprintf('Referral scenario    : %.0f%% (worst case)\n', ...
    referralRate * 100);


%% =========================================================
% 5. SET FIXED SERVICE TIMES
% ==========================================================

set_param( ...
    aiServerBlock, ...
    'ServiceTimeSource','Dialog', ...
    'ServiceTimeValue',num2str(aiServiceTime));


set_param( ...
    doctorServerBlock, ...
    'ServiceTimeSource','Dialog', ...
    'ServiceTimeValue',num2str(doctorServiceTime));


set_param( ...
    modelName, ...
    'StopTime',num2str(simulationTime));


%% =========================================================
% 6. RESULT STORAGE
% ==========================================================

results = table();

row = 0;


%% =========================================================
% 7. RUN RESOURCE SWEEP
% ==========================================================

fprintf('\n');
fprintf('====================================================\n');
fprintf('STARTING RESOURCE SWEEP\n');
fprintf('====================================================\n');


for p = 1:numel(patientLoads)

    patientsPerDay = ...
        patientLoads(p);


    % Arrival period in seconds
    arrivalPeriod = ...
        simulationTime / patientsPerDay;


    % Configure Entity Generator
    set_param( ...
        generatorBlock, ...
        'GenerationMethod','Time-based', ...
        'TimeSource','Dialog', ...
        'Period',num2str(arrivalPeriod), ...
        'GenerateEntityAtSimulationStart','on');


    fprintf('\n--------------------------------------------\n');
    fprintf('PATIENT LOAD: %d / DAY\n', ...
        patientsPerDay);

    fprintf('Arrival period: %.4f sec\n', ...
        arrivalPeriod);
    fprintf('--------------------------------------------\n');


    for a = 1:numel(aiServerCounts)

        aiServers = ...
            aiServerCounts(a);


        % Configure AI server capacity
        set_param( ...
            aiServerBlock, ...
            'Capacity', ...
            num2str(aiServers));


        for d = 1:numel(doctorCounts)

            doctors = ...
                doctorCounts(d);


            % Configure doctor capacity
            set_param( ...
                doctorServerBlock, ...
                'Capacity', ...
                num2str(doctors));


            fprintf( ...
                'Scenario: %d patients/day | AI=%d | Doctors=%d ... ', ...
                patientsPerDay, ...
                aiServers, ...
                doctors);


            try

                % Run simulation
                out = sim(modelName);


                % -------------------------------------------------
                % AI statistics
                % -------------------------------------------------

                aiUtilTS = ...
                    out.AI_Utilization;

                aiWaitTS = ...
                    out.Queue_Average_Wait;

                aiLengthTS = ...
                    out.Queue_Length;


                aiUtil = ...
                    aiUtilTS.Data(end) * 100;

                aiWait = ...
                    aiWaitTS.Data(end);

                aiQueue = ...
                    aiLengthTS.Data(end);


                % -------------------------------------------------
                % Doctor statistics
                % -------------------------------------------------

                doctorWaitTS = ...
                    out.Doctor_Queue_Wait;

                doctorLengthTS = ...
                    out.Doctor_Queue_Length;

                doctorUtilTS = ...
                    out.Doctor_Utilization;

                doctorProcessedTS = ...
                    out.Doctor_Processed;


                doctorWait = ...
                    doctorWaitTS.Data(end);

                doctorQueue = ...
                    doctorLengthTS.Data(end);

                doctorUtil = ...
                    doctorUtilTS.Data(end) * 100;

                doctorProcessed = ...
                    doctorProcessedTS.Data(end);


                % -------------------------------------------------
                % Stability criteria
                %
                % We consider a configuration adequate when:
                %
                % AI utilization   < 85%
                % Doctor utilization < 85%
                % Average doctor wait < 60 sec
                % -------------------------------------------------

                feasible = ...
                    aiUtil < 85 && ...
                    doctorUtil < 85 && ...
                    doctorWait < 60;


                row = row + 1;


                results(row,:) = table( ...
                    patientsPerDay, ...
                    referralRate * 100, ...
                    aiServers, ...
                    doctors, ...
                    arrivalPeriod, ...
                    aiServiceTime, ...
                    doctorServiceTime, ...
                    aiUtil, ...
                    aiWait, ...
                    aiQueue, ...
                    doctorUtil, ...
                    doctorWait, ...
                    doctorQueue, ...
                    doctorProcessed, ...
                    feasible, ...
                    'VariableNames', ...
                    { ...
                    'PatientsPerDay', ...
                    'ReferralRatePercent', ...
                    'AIServers', ...
                    'Doctors', ...
                    'ArrivalPeriodSec', ...
                    'AIServiceTimeSec', ...
                    'DoctorServiceTimeSec', ...
                    'AIUtilizationPercent', ...
                    'AIQueueWaitSec', ...
                    'AIQueueLength', ...
                    'DoctorUtilizationPercent', ...
                    'DoctorQueueWaitSec', ...
                    'DoctorQueueLength', ...
                    'DoctorProcessed', ...
                    'Feasible' ...
                    });


                fprintf( ...
                    'AI %.1f%% | Doctor %.1f%% | Wait %.1fs\n', ...
                    aiUtil, ...
                    doctorUtil, ...
                    doctorWait);


            catch ME

                fprintf('FAILED\n');

                warning( ...
                    'Scenario failed: %s', ...
                    ME.message);


                row = row + 1;


                results(row,:) = table( ...
                    patientsPerDay, ...
                    referralRate * 100, ...
                    aiServers, ...
                    doctors, ...
                    arrivalPeriod, ...
                    aiServiceTime, ...
                    doctorServiceTime, ...
                    NaN, ...
                    NaN, ...
                    NaN, ...
                    NaN, ...
                    NaN, ...
                    NaN, ...
                    NaN, ...
                    false, ...
                    'VariableNames', ...
                    { ...
                    'PatientsPerDay', ...
                    'ReferralRatePercent', ...
                    'AIServers', ...
                    'Doctors', ...
                    'ArrivalPeriodSec', ...
                    'AIServiceTimeSec', ...
                    'DoctorServiceTimeSec', ...
                    'AIUtilizationPercent', ...
                    'AIQueueWaitSec', ...
                    'AIQueueLength', ...
                    'DoctorUtilizationPercent', ...
                    'DoctorQueueWaitSec', ...
                    'DoctorQueueLength', ...
                    'DoctorProcessed', ...
                    'Feasible' ...
                    });

            end

        end

    end

end


%% =========================================================
% 8. FIND MINIMUM FEASIBLE CONFIGURATION
% ==========================================================

fprintf('\n');
fprintf('====================================================\n');
fprintf('RECOMMENDED RESOURCE CONFIGURATIONS\n');
fprintf('====================================================\n');


recommendations = table();


for p = 1:numel(patientLoads)

    patientsPerDay = ...
        patientLoads(p);


    subset = ...
        results( ...
        results.PatientsPerDay == patientsPerDay & ...
        results.Feasible == true, :);


    if isempty(subset)

        fprintf( ...
            '%d patients/day -> NO FEASIBLE CONFIGURATION\n', ...
            patientsPerDay);


        continue;

    end


    % Minimize total infrastructure first.
    totalResources = ...
        subset.AIServers + subset.Doctors;


    bestResourceCount = ...
        min(totalResources);


    candidates = ...
        subset(totalResources == bestResourceCount,:);


    % If tied, prefer lower doctor count.
    [~,idx] = ...
        min(candidates.Doctors);


    best = ...
        candidates(idx,:);


    fprintf( ...
        '%d patients/day -> AI=%d, Doctors=%d | AI %.1f%% | Doctor %.1f%% | Wait %.1fs\n', ...
        best.PatientsPerDay, ...
        best.AIServers, ...
        best.Doctors, ...
        best.AIUtilizationPercent, ...
        best.DoctorUtilizationPercent, ...
        best.DoctorQueueWaitSec);


    recommendations = ...
        [recommendations; best]; %#ok<AGROW>

end


%% =========================================================
% 9. SAVE CSV
% ==========================================================

csvFile = ...
    fullfile( ...
    outputDir, ...
    'Module6_Resource_Planner_Results.csv');


writetable( ...
    results, ...
    csvFile);


recommendationCSV = ...
    fullfile( ...
    outputDir, ...
    'Module6_Recommended_Resources.csv');


writetable( ...
    recommendations, ...
    recommendationCSV);


%% =========================================================
% 10. CREATE JSON FOR FRONTEND
% ==========================================================

jsonData = struct();


jsonData.project = ...
    "SIH26038";


jsonData.title = ...
    "Explainable AI for Diabetic Retinopathy Screening in Rural India";


jsonData.team = ...
    "Career Crafters";


jsonData.simulation = struct();


jsonData.simulation.aiServiceTimeSec = ...
    aiServiceTime;


jsonData.simulation.doctorServiceTimeSec = ...
    doctorServiceTime;


jsonData.simulation.workingHoursPerDay = ...
    workingHours;


jsonData.simulation.referralRatePercent = ...
    referralRate * 100;


jsonData.simulation.note = ...
    "100% referral scenario represents worst-case manual-review workload.";


jsonData.results = ...
    table2struct(results);


jsonData.recommendations = ...
    table2struct(recommendations);


jsonText = ...
    jsonencode(jsonData,PrettyPrint=true);


jsonFile = ...
    fullfile( ...
    outputDir, ...
    'Module6_Resource_Planner_Results.json');


fid = fopen(jsonFile,'w');


if fid == -1

    error( ...
        'Could not create JSON file.');

end


fprintf( ...
    fid, ...
    '%s', ...
    jsonText);


fclose(fid);


%% =========================================================
% 11. SAVE MAT FILE
% ==========================================================

matFile = ...
    fullfile( ...
    outputDir, ...
    'Module6_Resource_Planner_Results.mat');


save( ...
    matFile, ...
    'results', ...
    'recommendations', ...
    'patientLoads', ...
    'aiServerCounts', ...
    'doctorCounts', ...
    'aiServiceTime', ...
    'doctorServiceTime', ...
    'workingHours', ...
    'referralRate');


%% =========================================================
% 12. CREATE RESOURCE PLOT
% ==========================================================

figure( ...
    'Name', ...
    'SIH26038 District Resource Planner', ...
    'Color','w');


bar( ...
    recommendations.PatientsPerDay, ...
    [ ...
    recommendations.AIServers ...
    recommendations.Doctors ...
    ]);


xlabel('Patients per day');

ylabel('Required resources');

title( ...
    'Recommended AI Servers and Ophthalmologists');


legend( ...
    {'AI Servers','Ophthalmologists'}, ...
    'Location','northwest');


grid on;


pngFile = ...
    fullfile( ...
    outputDir, ...
    'Module6_Resource_Planner_Results.png');


exportgraphics( ...
    gcf, ...
    pngFile, ...
    'Resolution',200);


%% =========================================================
% 13. RESTORE BASELINE MODEL
% ==========================================================

set_param( ...
    generatorBlock, ...
    'Period','28.8');


set_param( ...
    aiServerBlock, ...
    'Capacity','1');


set_param( ...
    doctorServerBlock, ...
    'Capacity','1');


set_param( ...
    modelName, ...
    'StopTime', ...
    num2str(simulationTime));


save_system(modelName);


%% =========================================================
% 14. FINAL OUTPUT
% ==========================================================

fprintf('\n');
fprintf('====================================================\n');
fprintf('MODULE 6 COMPLETE\n');
fprintf('====================================================\n');

fprintf('\nFull results:\n%s\n',csvFile);

fprintf('\nRecommended resources:\n%s\n', ...
    recommendationCSV);

fprintf('\nFrontend JSON:\n%s\n',jsonFile);

fprintf('\nMAT file:\n%s\n',matFile);

fprintf('\nPlot:\n%s\n',pngFile);

fprintf('\n====================================================\n');