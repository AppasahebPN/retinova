path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

s_marker = "  <!-- SECTION 9: CLINICIAN REVIEW -->"
if s_marker not in code:
    s_marker = "  <!-- SECTION 9: CLINICAL DISPOSITION -->"

e_marker = "  <!-- SECTION 10: CLINICAL DISCLAIMER -->"

s_idx = code.find(s_marker)
e_idx = code.find(e_marker)
if s_idx == -1 or e_idx == -1:
    print(f"ERROR: markers not found s_idx={s_idx}, e_idx={e_idx}")
    exit(1)

new_section9 = """  <!-- SECTION 9: CLINICAL DISPOSITION -->
  <div class="review-box avoid-break">
    <div class="section-title">Clinical Disposition</div>

    <div style="margin-top: 12px; font-size: 12px; color: #14202E; line-height: 22px;">
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Referral confirmed</span>
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Referral not confirmed</span>
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Recapture required</span>
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Clinical follow-up recommended</span>
      <span style="display: inline-block;">[ &nbsp; ] Other</span>
    </div>

    <div style="margin-top: 14px;">
      <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Clinician Notes:</div>
      <div style="height: 40px; border-bottom: 1px dashed #cbd5e1; margin-top: 4px;"></div>
    </div>

    <div style="margin-top: 12px;">
      <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Recommended Follow-up:</div>
      <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Final Clinical Grade:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Reviewer Name:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Registration / License Number:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Date:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
    </div>

    <div style="margin-top: 14px;">
      <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Signature:</div>
      <div style="height: 32px; border-bottom: 1px solid #14202E; margin-top: 4px; width: 240px;"></div>
    </div>
  </div>

"""

updated_code = code[:s_idx] + new_section9 + code[e_idx:]
with open(path, "w", encoding="utf-8") as f:
    f.write(updated_code)
print("Section 9 updated successfully!")
