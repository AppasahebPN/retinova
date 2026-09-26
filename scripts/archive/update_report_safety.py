import os

report_service_path = r'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts'

with open(report_service_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update vessel morphology footer with clinical safety caveat
target_vessel_footer = '''<strong>Vessel Coverage:</strong> ${vesselCoverage} ${vesselPixels ? `(${vesselPixels.toLocaleString()} px)` : ''}<br/>
          <strong>Vascular Morphology:</strong> Branching: <strong>${branchingComplexity}</strong> | Mean Caliber: <strong>${meanCaliber}</strong> | Density: <strong>${vesselDensity}</strong>'''

replacement_vessel_footer = '''<strong>Vessel Coverage:</strong> ${vesselCoverage} ${vesselPixels ? `(${vesselPixels.toLocaleString()} px)` : ''}<br/>
          <strong>Vascular Morphology:</strong> Skeleton Nodes: <strong>${branchingComplexity}</strong> | Mean Caliber: <strong>${meanCaliber}</strong> | Density: <strong>${vesselDensity}</strong><br/>
          <span style="font-size: 10.5px; color: #64748b; display: block; margin-top: 2px;">* Node count reflects unpruned high-resolution skeleton junctions (discretization noise under engineering audit; not a validated biological bifurcation count).</span>'''

# 2. Update Grad-CAM <-> Lesion IoU text with explainability context
target_iou_footer = '''<div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
          Spatial intersection-over-union (IoU) evaluated between thresholded Swin V2 Grad-CAM activation and Module 3 candidate lesion mask.<br/>'''

replacement_iou_footer = '''<div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
          Spatial intersection-over-union (IoU) evaluated between thresholded Swin V2 Grad-CAM activation and Module 3 candidate lesion mask.<br/>
          <span style="font-size: 10.5px; color: #64748b; display: block; margin-top: 2px;">* Model Note: Swin V2 Grad-CAM visualizes broad receptive-field attention (~9% of fundus, arcades/macula) rather than punctate lesion contours (<1% of fundus). Low IoU is mathematically expected and does not invalidate whole-image classification.</span>'''

if target_vessel_footer in content:
    content = content.replace(target_vessel_footer, replacement_vessel_footer)
    print("Vessel footer safety note replaced!")
else:
    print("Could not find target_vessel_footer!")

if target_iou_footer in content:
    content = content.replace(target_iou_footer, replacement_iou_footer)
    print("IoU footer safety note replaced!")
else:
    print("Could not find target_iou_footer!")

with open(report_service_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved updated reportService.ts!")
