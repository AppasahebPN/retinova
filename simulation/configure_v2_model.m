% Configure DR_District_Resource_Planner_v2.slx
modelName = 'DR_District_Resource_Planner_v2';
load_system(modelName);

% Verify blocks
fprintf('Configuring %s...\n', modelName);
set_param(modelName, 'StopTime', '28800');

% If Fundus Camera Server doesn't exist yet, duplicate Entity Server
cameraBlk = [modelName '/Fundus Camera Server'];
if isempty(find_system(modelName, 'Name', 'Fundus Camera Server'))
    try
        add_block([modelName '/Entity Server'], cameraBlk, ...
            'Position', [65 44 110 86]);
        fprintf('Added Fundus Camera Server block.\n');
    catch ME
        fprintf('Note on adding camera block: %s\n', ME.message);
    end
end

% Set standard parameters on v2 model
try
    if ~isempty(find_system(modelName, 'Name', 'Fundus Camera Server'))
        set_param(cameraBlk, 'ServiceTimeValue', '240', 'Capacity', '5');
    end
    set_param([modelName '/Entity Server'], 'ServiceTimeValue', '8.56', 'Capacity', '1');
    set_param([modelName '/Ophthalmologist Review'], 'ServiceTimeValue', '120', 'Capacity', '1');
    fprintf('Configured service times: Camera=240s, AI=8.56s, Doctor=120s\n');
catch ME
    fprintf('Parameter configuration note: %s\n', ME.message);
end

save_system(modelName);
close_system(modelName, 0);
fprintf('DR_District_Resource_Planner_v2.slx configured and saved.\n');
