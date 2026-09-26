% Inspect existing model structure
module6Path = fullfile(pwd, 'DR_Screening_MATLAB', 'module6_Simulink');
addpath(module6Path);

modelName = 'DR_District_Resource_Planner';
load_system(modelName);

blocks = find_system(modelName, 'Type', 'block');
fprintf('========================================\n');
fprintf('BLOCKS IN %s (%d blocks)\n', modelName, numel(blocks));
fprintf('========================================\n');

for i = 1:numel(blocks)
    b = blocks{i};
    bType = get_param(b, 'BlockType');
    bName = get_param(b, 'Name');
    pos = get_param(b, 'Position');
    fprintf('%-30s | Type: %-15s | Pos: [%d %d %d %d]\n', bName, bType, pos(1), pos(2), pos(3), pos(4));
end

lines = get_param(modelName, 'Lines');
fprintf('\n========================================\n');
fprintf('LINES IN %s (%d lines)\n', modelName, numel(lines));
fprintf('========================================\n');
for i = 1:numel(lines)
    l = lines(i);
    fprintf('Line %d: SrcBlock=%s, SrcPort=%s, DstBlock=%s, DstPort=%s\n', ...
        i, ...
        string(get_param(l.SrcBlock, 'Name')), string(l.SrcPort), ...
        string(get_param(l.DstBlock, 'Name')), string(l.DstPort));
end

close_system(modelName, 0);
fprintf('\nDone.\n');
