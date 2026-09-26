import re

file_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace any corrupted unicode characters in Section 11 with standard HTML entities
content = re.sub(
    r'<summary style="font-weight: 700; color: #1B6357; cursor: pointer; padding: 6px 0; font-size: 12\.5px; outline: none;">\s*[^<]*Technical Details',
    r'<summary style="font-weight: 700; color: #1B6357; cursor: pointer; padding: 6px 0; font-size: 12.5px; outline: none;">\n      &#9654; Technical Details',
    content
)

content = re.sub(
    r'<div><strong>Input Resolution:</strong>\s*512[^<]*</div>',
    r'<div><strong>Input Resolution:</strong> 512 &times; 512 &times; 3</div>',
    content
)

content = re.sub(
    r'<div><strong>Operating Threshold:</strong>\s*[^<]*</div>',
    r'<div><strong>Operating Threshold:</strong> &tau;* = 29.93%</div>',
    content
)

content = re.sub(
    r'<div><strong>Grad-CAM[^<]*Lesion IoU:</strong>',
    r'<div><strong>Grad-CAM &harr; Lesion IoU:</strong>',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Cleaned HTML entities in Section 11 successfully.")
