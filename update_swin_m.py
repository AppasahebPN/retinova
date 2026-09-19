path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module4_Grading_Final\integration\run_NetraAI_SwinV1.m"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

target = "addpath(fullfile(basePath, 'module3_Segmentation'));"
replacement = "addpath(fullfile(basePath, 'module3_Segmentation'));\naddpath(fullfile(basePath, 'module3_Supervised_Final'));"

if target in text and "module3_Supervised_Final" not in text:
    text = text.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Updated run_NetraAI_SwinV1.m!")
else:
    print("Already present or target not found.")
