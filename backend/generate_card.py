"""
Clinical Triage Card Generator (1200x750 PNG)
Consumes live screening data and generates a professional clinical summary card.
"""

import sys
import os
import json
from PIL import Image, ImageDraw, ImageFont

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def get_font(size, bold=False):
    # Try system fonts on Windows
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\calibrib.ttf" if bold else "C:\\Windows\\Fonts\\calibri.ttf"
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

def populate_relational_data(screening_data, db):
    if not db:
        return screening_data
    
    s_id = screening_data.get("id")
    # Patient
    if not screening_data.get("patient") and screening_data.get("patient_id"):
        for p in db.get("patients", []):
            if p.get("id") == screening_data.get("patient_id"):
                screening_data["patient"] = p
                break
                
    # Facility
    if not screening_data.get("facility") and screening_data.get("facility_id"):
        for f in db.get("facilities", []):
            if f.get("id") == screening_data.get("facility_id"):
                screening_data["facility"] = f
                break
                
    # Image
    if not screening_data.get("image"):
        for img in db.get("images", []):
            if img.get("screening_id") == s_id:
                screening_data["image"] = img
                break
                
    # Explainability
    if not screening_data.get("explainability"):
        for ex in db.get("explainability", []):
            if ex.get("screening_id") == s_id:
                screening_data["explainability"] = ex
                break

    # Classification
    if not screening_data.get("classification"):
        for cl in db.get("classifications", []):
            if cl.get("screening_id") == s_id:
                screening_data["classification"] = cl
                break

    return screening_data

def generate_card(screening_data, output_path, db=None):
    if db:
        screening_data = populate_relational_data(screening_data, db)

    W, H = 1200, 750
    card = Image.new("RGB", (W, H), hex_to_rgb("#F8FAFC"))
    draw = ImageDraw.Draw(card)
    
    # Fonts
    font_title = get_font(26, bold=True)
    font_subtitle = get_font(13, bold=False)
    font_badge = get_font(30, bold=True)
    font_h2 = get_font(19, bold=True)
    font_body = get_font(14, bold=False)
    font_body_bold = get_font(14, bold=True)
    font_sm = get_font(12, bold=False)
    font_sm_bold = get_font(12, bold=True)
    
    is_rejected = (
        screening_data.get("status") == "rejected" or
        screening_data.get("final_decision") == "RECAPTURE" or
        screening_data.get("quality", {}).get("decision") == "RECAPTURE" or
        screening_data.get("quality", {}).get("quality_gate") == "reject" or
        screening_data.get("quality", {}).get("status") == "rejected"
    )
    
    clf = screening_data.get("classification") or {}
    decision = "RECAPTURE" if is_rejected else (clf.get("decision") or screening_data.get("final_decision") or "SCREEN")
    is_refer = (decision == "REFER")
    
    # Color scheme & exact titles per specification
    if is_rejected:
        accent_color = hex_to_rgb("#DC2626")
        banner_bg = hex_to_rgb("#FEF2F2")
        banner_border = hex_to_rgb("#FCA5A5")
        badge_bg = hex_to_rgb("#DC2626")
        badge_text = hex_to_rgb("#FFFFFF")
        decision_title = "IMAGE QUALITY INSUFFICIENT"
        decision_sub = "RECAPTURE REQUIRED"
    elif is_refer:
        accent_color = hex_to_rgb("#DC2626")
        banner_bg = hex_to_rgb("#FEF2F2")
        banner_border = hex_to_rgb("#F87171")
        badge_bg = hex_to_rgb("#DC2626")
        badge_text = hex_to_rgb("#FFFFFF")
        decision_title = "DIABETIC RETINOPATHY: DETECTED"
        decision_sub = "REFERABLE DR (G2+)"
    else:
        accent_color = hex_to_rgb("#059669")
        banner_bg = hex_to_rgb("#ECFDF5")
        banner_border = hex_to_rgb("#6EE7B7")
        badge_bg = hex_to_rgb("#059669")
        badge_text = hex_to_rgb("#FFFFFF")
        decision_title = "NO REFERABLE DR DETECTED"
        decision_sub = "NON-REFERABLE"
        
    # 1. Top Header Bar
    draw.rectangle([(0, 0), (W, 70)], fill=hex_to_rgb("#0F172A"))
    draw.text((40, 15), "NETRAAI", fill=hex_to_rgb("#38BDF8"), font=font_title)
    draw.text((170, 24), "|  AI-ASSISTED DIABETIC RETINOPATHY SCREENING", fill=hex_to_rgb("#94A3B8"), font=font_subtitle)
    
    rep_id = f"REP-{screening_data.get('id', '')[:8].upper()}"
    date_str = str(screening_data.get("created_at", ""))[:10] or "Not provided"
    draw.text((W - 270, 16), f"Report ID: {rep_id}", fill=hex_to_rgb("#FFFFFF"), font=font_sm_bold)
    draw.text((W - 270, 36), f"Screening Date: {date_str}", fill=hex_to_rgb("#94A3B8"), font=font_sm)
    
    # 2. Main Clinical Decision Card (Visually Dominant)
    draw.rounded_rectangle([(40, 85), (W - 40, 215)], radius=12, fill=banner_bg, outline=banner_border, width=2)
    
    # Badge on Left
    badge_w, badge_h = 220, 90
    draw.rounded_rectangle([(65, 105), (65 + badge_w, 105 + badge_h)], radius=8, fill=badge_bg)
    bbox = draw.textbbox((0, 0), decision, font=font_badge)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((65 + (badge_w - tw)//2, 105 + (badge_h - th)//2 - 4), decision, fill=badge_text, font=font_badge)
    
    # Title & Subtitle
    draw.text((315, 103), decision_title, fill=accent_color, font=font_h2)
    draw.text((315, 131), decision_sub, fill=hex_to_rgb("#334155"), font=font_body_bold)
    
    # Metrics in card
    p_cal = clf.get("g2plus_probability_calibrated")
    thresh = clf.get("threshold", 0.2993)
    grade = clf.get("predicted_grade")
    grade_label = clf.get("grade_label") or (f"Grade {grade}" if grade is not None else "")
    
    grade_severity_labels = {
        0: "Grade 0 — No DR",
        1: "Grade 1 — Mild NPDR",
        2: "Grade 2 — Moderate NPDR",
        3: "Grade 3 — Severe NPDR",
        4: "Grade 4 — Proliferative DR"
    }
    severity_display = grade_severity_labels.get(grade, f"Grade {grade} — {grade_label}" if grade is not None else "Not graded")

    if not is_rejected and p_cal is not None:
        p_pct = f"{p_cal * 100:.1f}%" if p_cal <= 1.0 else f"{p_cal:.1f}%"
        th_pct = f"{thresh * 100:.1f}%"
        draw.text((315, 163), f"Calibrated G2+ Probability: {p_pct}", fill=accent_color, font=font_body_bold)
        draw.text((580, 163), f"(Threshold: {th_pct})", fill=hex_to_rgb("#64748B"), font=font_body)
        draw.text((315, 186), f"Predicted Severity: {severity_display}", fill=hex_to_rgb("#1E293B"), font=font_body_bold)
    else:
        draw.text((315, 163), "Image quality insufficient. Downstream screening halted.", fill=hex_to_rgb("#64748B"), font=font_body)
        draw.text((315, 186), "Recapture the affected eye before screening.", fill=accent_color, font=font_body_bold)
        
    # 3. Patient / Metadata Box (Left Side)
    draw.rounded_rectangle([(40, 230), (520, 680)], radius=10, fill=hex_to_rgb("#FFFFFF"), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((60, 245), "PATIENT & ENCOUNTER METADATA", fill=hex_to_rgb("#64748B"), font=font_sm_bold)
    draw.line([(60, 268), (500, 268)], fill=hex_to_rgb("#F1F5F9"), width=1)
    
    patient = screening_data.get("patient") or {}
    technician_val = screening_data.get("technician_name") or screening_data.get("technician") or "Not provided"
    
    eye_raw = (screening_data.get("eye") or "Not provided").strip().lower()
    if eye_raw == "left":
        eye_display = "Left Eye (OS)"
    elif eye_raw == "right":
        eye_display = "Right Eye (OD)"
    else:
        eye_display = eye_raw if eye_raw != "not provided" else "Not provided"

    clinical_action_str = (
        "Referral recommended for ophthalmic evaluation." if is_refer else (
            "Recapture the affected eye before screening." if is_rejected else
            "Continue routine diabetic-retinopathy screening according to local clinical protocol."
        )
    )

    metadata_rows = [
        ("Patient ID", patient.get("patient_code") or "Not provided"),
        ("Patient Name", patient.get("name") or "Not provided"),
        ("Age", f"{patient.get('age')} Yrs" if patient.get("age") is not None else "Not provided"),
        ("Sex", patient.get("gender") or "Not provided"),
        ("Eye", eye_display),
        ("Technician", technician_val),
        ("Screening Centre", screening_data.get("facility", {}).get("name") or "Not provided"),
        ("Camera / Device", screening_data.get("image", {}).get("device_id") or "Not provided"),
        ("Screening Date", str(screening_data.get("created_at", ""))[:10] or "Not provided"),
        ("Notes", screening_data.get("notes") or "Not provided"),
        ("Clinical Action", clinical_action_str)
    ]
    
    y_pos = 278
    for label, val in metadata_rows:
        draw.text((60, y_pos), label + ":", fill=hex_to_rgb("#64748B"), font=font_sm)
        val_str = str(val)
        if len(val_str) > 33:
            val_str = val_str[:31] + "..."
        draw.text((185, y_pos), val_str, fill=hex_to_rgb("#0F172A"), font=font_sm_bold)
        y_pos += 35
        
    # 4. Images Section (Right Side)
    draw.rounded_rectangle([(540, 230), (W - 40, 680)], radius=10, fill=hex_to_rgb("#FFFFFF"), outline=hex_to_rgb("#E2E8F0"), width=1)
    draw.text((560, 245), "WHY THIS RESULT? — RETINAL SCAN & MODEL ATTRIBUTION", fill=hex_to_rgb("#64748B"), font=font_sm_bold)
    draw.line([(560, 268), (W - 60, 268)], fill=hex_to_rgb("#F1F5F9"), width=1)
    
    # Helper to resolve and load image
    def load_img(url_or_path):
        if not url_or_path:
            return None
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        clean_name = os.path.basename(str(url_or_path).replace("/uploads/", "").replace("\\uploads\\", ""))
        candidate_paths = [
            url_or_path,
            os.path.join(os.path.dirname(__file__), "uploads", clean_name),
            os.path.join(os.path.dirname(__file__), "..", "uploads", clean_name),
            os.path.join(repo_root, "DR", "backend", "uploads", clean_name),
            os.path.join(repo_root, "DR_Screening_MATLAB", "data", "APTOS", "train_images", clean_name),
            os.path.join(repo_root, "DR_Screening_MATLAB", "data", "EyePACS", "download", "train", "extracted", "train", clean_name),
            os.path.join(repo_root, "DR_Screening_MATLAB", "data", "EyeQ", "figure", clean_name)
        ]
        for cp in candidate_paths:
            if os.path.exists(cp) and os.path.isfile(cp):
                try:
                    return Image.open(cp).convert("RGB")
                except Exception:
                    pass
        return None

    img_raw_url = screening_data.get("image", {}).get("storage_url") or screening_data.get("imagePath") or ""
    gradcam_url = screening_data.get("explainability", {}).get("gradcam_url") or ""
    
    pil_fundus = load_img(img_raw_url)
    pil_gradcam = load_img(gradcam_url)
    
    img_box_w, img_box_h = 280, 280
    
    # Draw Fundus
    fundus_label = f"Original Fundus ({eye_display})"
    draw.text((560, 276), fundus_label, fill=hex_to_rgb("#1E293B"), font=font_body_bold)
    if pil_fundus:
        # Resize maintaining aspect ratio
        thumb = pil_fundus.copy()
        thumb.thumbnail((img_box_w, img_box_h))
        # Center inside box
        ox = 560 + (img_box_w - thumb.width) // 2
        oy = 305 + (img_box_h - thumb.height) // 2
        draw.rectangle([(560, 305), (560 + img_box_w, 305 + img_box_h)], fill=hex_to_rgb("#0F172A"))
        card.paste(thumb, (ox, oy))
    else:
        draw.rectangle([(560, 305), (560 + img_box_w, 305 + img_box_h)], fill=hex_to_rgb("#F1F5F9"), outline=hex_to_rgb("#CBD5E1"))
        draw.text((620, 430), "Image Unavailable", fill=hex_to_rgb("#94A3B8"), font=font_body)
        
    # Draw Grad-CAM
    draw.text((880, 276), "Grad-CAM Model Attribution", fill=hex_to_rgb("#1E293B"), font=font_body_bold)
    if pil_gradcam:
        thumb_cam = pil_gradcam.copy()
        thumb_cam.thumbnail((img_box_w, img_box_h))
        ox = 880 + (img_box_w - thumb_cam.width) // 2
        oy = 305 + (img_box_h - thumb_cam.height) // 2
        draw.rectangle([(880, 305), (880 + img_box_w, 305 + img_box_h)], fill=hex_to_rgb("#0F172A"))
        card.paste(thumb_cam, (ox, oy))
    elif not is_rejected and pil_fundus:
        draw.rectangle([(880, 305), (880 + img_box_w, 305 + img_box_h)], fill=hex_to_rgb("#F1F5F9"), outline=hex_to_rgb("#CBD5E1"))
        draw.text((910, 430), "Attribution Generated", fill=hex_to_rgb("#64748B"), font=font_body)
    else:
        draw.rectangle([(880, 305), (880 + img_box_w, 305 + img_box_h)], fill=hex_to_rgb("#F1F5F9"), outline=hex_to_rgb("#CBD5E1"))
        draw.text((910, 430), "Halted at Quality Gate", fill=hex_to_rgb("#94A3B8"), font=font_body)
        
    # Explainability disclaimer text - exact required wording
    expl_text = "Highlighted retinal regions indicate areas that contributed most strongly to the model's screening prediction."
    draw.text((560, 608), expl_text, fill=hex_to_rgb("#475569"), font=font_sm)
    caveat_text = "* Attribution is model evidence, not a diagnostic ground-truth mask."
    draw.text((560, 630), caveat_text, fill=hex_to_rgb("#94A3B8"), font=font_sm)
    
    # 5. Bottom Compact Model Info Footer
    footer_text = "Model: Swin V2 Tiny  |  Input: 512 × 512  |  Model Version: v1.0-frozen  |  Temperature Scaling (T = 1.4555)  |  Threshold τ*=0.2993"
    draw.text((40, 712), footer_text, fill=hex_to_rgb("#94A3B8"), font=font_sm)
    
    card.save(output_path, "PNG")
    print(f"Generated 1200x750 card at: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_card.py <screening_id_or_json_file> <output_png_path>")
        sys.exit(1)
        
    input_arg = sys.argv[1]
    out_path = sys.argv[2]
    
    db_path = os.path.join(os.path.dirname(__file__), "data", "db.json")
    db = None
    if os.path.exists(db_path):
        with open(db_path, "r", encoding="utf-8") as f:
            db = json.load(f)

    if os.path.exists(input_arg) and os.path.isfile(input_arg):
        with open(input_arg, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        if not db:
            print("db.json not found")
            sys.exit(1)
        screenings = db.get("screenings", [])
        matched = [s for s in screenings if s.get("id") == input_arg]
        if not matched:
            print(f"Screening {input_arg} not found in db.json")
            sys.exit(1)
        data = matched[0]
        
    generate_card(data, out_path, db)
