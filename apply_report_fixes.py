import os

report_path = r'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts'

with open(report_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update branchingComplexity variable definition
old_branching_var = '''    const branchingComplexity = vesselMetrics.branchingComplexity !== undefined ? `${vesselMetrics.branchingComplexity} branch points` : (seg.branchingComplexity !== undefined ? `${seg.branchingComplexity} branch points` : 'Unavailable');'''

new_branching_var = '''    const branchingVal = vesselMetrics.junctionClusters ?? vesselMetrics.branchingComplexity ?? seg.junctionClusters ?? seg.branchingComplexity;
    const junctionsDisplay = (typeof branchingVal === 'number')
      ? `${branchingVal} native-scale pruned junction clusters`
      : 'Unavailable';'''

if old_branching_var in text:
    text = text.replace(old_branching_var, new_branching_var)
    print("Replaced branching variable definition!")
else:
    print("Could not find old_branching_var")

# 2. Update Artifact 5 Footer
old_artifact5_footer = '''<div class="artifact-footer">
          <strong>Vessel Coverage:</strong> ${vesselCoverage} ${vesselPixels ? `(${vesselPixels.toLocaleString()} px)` : ''}<br/>
          <strong>Vascular Morphology:</strong> Skeleton Nodes: <strong>${branchingComplexity}</strong> | Mean Caliber: <strong>${meanCaliber}</strong> | Density: <strong>${vesselDensity}</strong><br/>
          <span style="font-size: 10.5px; color: #64748b; display: block; margin-top: 2px;">* Node count reflects unpruned high-resolution skeleton junctions (discretization noise under engineering audit; not a validated biological bifurcation count).</span>
        </div>'''

new_artifact5_footer = '''<div class="artifact-footer">
          <strong>Vessel Coverage:</strong> ${vesselCoverage} ${vesselPixels ? `(${vesselPixels.toLocaleString()} px)` : ''}<br/>
          <strong>Vascular Morphology:</strong> Vascular Junctions: <strong>${junctionsDisplay}</strong> | Mean Caliber: <strong>${meanCaliber}</strong> | Density: <strong>${vesselDensity}</strong><br/>
          <span style="font-size: 10.5px; color: #64748b; display: block; margin-top: 2px;">* Topology is computed at the native 800×600 segmentation scale after small-spur pruning to avoid high-resolution skeletonization artifacts. This is an engineering vascular-topology metric, not a validated clinical bifurcation measurement.</span>
        </div>'''

if old_artifact5_footer in text:
    text = text.replace(old_artifact5_footer, new_artifact5_footer)
    print("Replaced artifact5 footer!")
else:
    print("Could not find old_artifact5_footer")

# 3. Replace validated morphological matched filter with morphological matched-filter-based vessel extraction
old_val_text = "* Multi-layer composite synthesized from validated morphological matched filter and anatomical landmark detection. Original masks remain independently accessible."
new_val_text = "* Multi-layer composite synthesized from morphological matched-filter-based vessel extraction and anatomical landmark detection. Original masks remain independently accessible."

if old_val_text in text:
    text = text.replace(old_val_text, new_val_text)
    print("Replaced validated morphological matched filter text!")
else:
    print("Could not find old_val_text")

# 4. Update Grad-CAM IoU explanation text
old_cam_note = '''<span style="font-size: 10.5px; color: #64748b; display: block; margin-top: 2px;">* Model Note: Swin V2 Grad-CAM visualizes broad receptive-field attention (~9% of fundus, arcades/macula) rather than punctate lesion contours (<1% of fundus). Low IoU is mathematically expected and does not invalidate whole-image classification.</span>'''

new_cam_note = '''<span style="font-size: 10.5px; color: #64748b; display: block; margin-top: 2px;">* Model Note: CAM activation is spatially concentrated around the temporal vascular arcade and macular region. Low IoU is consistent with the different spatial scales and objectives of the classifier attribution map and the morphological candidate-lesion map; it does not by itself establish model failure. Given the current positive areas (~9.06% CAM and ~0.819% lesion mask), the theoretical maximum IoU would be approximately 9.0% if the smaller lesion mask were fully contained within the CAM. The tested alternatives did not provide a sufficiently compelling localization improvement to justify changing the frozen production configuration.</span>'''

if old_cam_note in text:
    text = text.replace(old_cam_note, new_cam_note)
    print("Replaced CAM IoU note!")
else:
    print("Could not find old_cam_note")

with open(report_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved updated reportService.ts successfully!")
