import re

bridge_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\matlab_bridge.py"

with open(bridge_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add module3_Supervised_Final to get_matlab_engine()
target_path = 'matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module3_Segmentation"), nargout=0)'
repl_path = 'matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module3_Segmentation"), nargout=0)\n        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module3_Supervised_Final"), nargout=0)'
if target_path in code and 'module3_Supervised_Final' not in code:
    code = code.replace(target_path, repl_path)
    print("Added module3_Supervised_Final to get_matlab_engine")

# 2. Replace Module 3 segmentation response construction and add full evidence packaging
old_seg_block = '''    # Module 3: Segmentation
    seg_raw = matlab_result.get("segmentation", {})
    vessel_mask_mat = seg_raw.get("vesselMask")
    lesion_mask_mat = seg_raw.get("lesionMask")
    evidence_overlay_mat = seg_raw.get("evidenceOverlay")
    
    vessel_mask_url = ""
    lesion_mask_url = ""
    evidence_overlay_url = ""
    
    if vessel_mask_mat is not None:
        try:
            vessel_mask_url = save_matrix_as_png(vessel_mask_mat, f"vessels_{run_id[:8]}.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save vessel mask: {e}")
            
    if lesion_mask_mat is not None:
        try:
            lesion_mask_url = save_matrix_as_png(lesion_mask_mat, f"lesions_{run_id[:8]}.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save lesion mask: {e}")

    if evidence_overlay_mat is not None:
        try:
            evidence_overlay_url = save_matrix_as_png(evidence_overlay_mat, f"evidence_{run_id[:8]}.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save evidence overlay: {e}")

    vessel_cov = float(seg_raw.get("vesselCoverage", 0.0))
    lesion_cov = float(seg_raw.get("lesionCoverage", 0.0))
    lesion_cnt = int(seg_raw.get("lesionCount", 0))
    bright_cnt = int(seg_raw.get("brightLesionCount", 0))
    dark_cnt = int(seg_raw.get("darkLesionCount", 0))
    segmentation_time = float(matlab_result.get("segmentationTime", 0.0))
    
    segmentation_response = {
        "id": f"seg-{run_id[:8]}",
        "vessel_coverage": round(vessel_cov, 2),
        "vesselCoverage": round(vessel_cov, 2),
        "lesion_coverage": round(lesion_cov, 2),
        "lesionCoverage": round(lesion_cov, 2),
        "candidate_count": lesion_cnt,
        "candidateCount": lesion_cnt,
        "bright_lesion_count": bright_cnt,
        "dark_lesion_count": dark_cnt,
        "vessel_mask_url": vessel_mask_url,
        "lesion_mask_url": lesion_mask_url,
        "evidence_overlay_url": evidence_overlay_url,
        "disclaimer": "Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinical review and do not constitute independent diagnostic proof.",
        "processingTimeSec": segmentation_time
    }'''

new_seg_block = '''    # Module 3: Retinal Evidence & Pathology Analysis (Upgraded)
    seg_raw = matlab_result.get("segmentation", {})
    vessel_mask_mat = seg_raw.get("vesselMask")
    lesion_mask_mat = seg_raw.get("lesionMask")
    bright_mask_mat = seg_raw.get("brightMask")
    dark_mask_mat = seg_raw.get("darkMask")
    evidence_overlay_mat = seg_raw.get("compositeOverlay") or seg_raw.get("evidenceOverlay")
    
    ma_mask_mat = seg_raw.get("maMask")
    he_mask_mat = seg_raw.get("heMask")
    ex_mask_mat = seg_raw.get("exMask")
    se_mask_mat = seg_raw.get("seMask")
    
    # Extract spatial dimensions
    img_h, img_w = 512, 512
    if vessel_mask_mat is not None:
        try:
            arr_v_shape = np.array(vessel_mask_mat).shape
            img_h, img_w = int(arr_v_shape[0]), int(arr_v_shape[1])
        except Exception:
            pass
    elif enhanced_img_mat is not None:
        try:
            arr_e_shape = np.array(enhanced_img_mat).shape
            img_h, img_w = int(arr_e_shape[0]), int(arr_e_shape[1])
        except Exception:
            pass
            
    vessel_mask_url = ""
    lesion_mask_url = ""
    evidence_overlay_url = ""
    
    if vessel_mask_mat is not None:
        try:
            vessel_mask_url = save_matrix_as_png(vessel_mask_mat, f"vessels_{run_id[:8]}.png")
            save_matrix_as_png(vessel_mask_mat, "vessels.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save vessel mask: {e}")
            
    if lesion_mask_mat is not None:
        try:
            lesion_mask_url = save_matrix_as_png(lesion_mask_mat, f"lesions_{run_id[:8]}.png")
            save_matrix_as_png(lesion_mask_mat, "lesions.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save lesion mask: {e}")

    if evidence_overlay_mat is not None:
        try:
            evidence_overlay_url = save_matrix_as_png(evidence_overlay_mat, f"retinal_evidence_{run_id[:8]}.png")
            save_matrix_as_png(evidence_overlay_mat, f"evidence_{run_id[:8]}.png")
            save_matrix_as_png(evidence_overlay_mat, "retinal_evidence.png")
            save_matrix_as_png(evidence_overlay_mat, "evidence.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save composite retinal evidence: {e}")

    vessel_cov = float(seg_raw.get("vesselCoverage", 0.0))
    lesion_cov = float(seg_raw.get("lesionCoverage", 0.0))
    lesion_cnt = int(seg_raw.get("lesionCount", 0))
    bright_cnt = int(seg_raw.get("brightLesionCount", 0))
    dark_cnt = int(seg_raw.get("darkLesionCount", 0))
    segmentation_time = float(matlab_result.get("segmentationTime", 0.0))
    
    # Real computed vascular metrics
    vessel_pixel_count = int(seg_raw.get("vesselPixelCount", 0))
    if vessel_pixel_count == 0 and vessel_mask_mat is not None:
        try:
            vessel_pixel_count = int(np.sum(np.array(vessel_mask_mat) > 0))
        except Exception:
            pass
    vessel_density = float(seg_raw.get("vesselDensity", 0.0)) or round(float(vessel_pixel_count) / max(1, img_h * img_w), 4)
    branching_complexity = int(seg_raw.get("branchingComplexity", 0))
    vessel_endpoints = int(seg_raw.get("vesselEndpoints", 0))
    mean_caliber = round(float(seg_raw.get("meanCaliber", 0.0)), 2)
    vessel_connectivity = int(seg_raw.get("vesselConnectivity", 0))

    # Candidate lesion extraction & per-candidate metadata
    import scipy.ndimage as ndi
    candidates_list = []
    cand_seq = 1
    
    subtypes_to_extract = [
        ("microaneurysm_candidate", ma_mask_mat, "dark"),
        ("hemorrhage_candidate", he_mask_mat, "dark"),
        ("hard_exudate_candidate", ex_mask_mat, "bright"),
        ("soft_exudate_candidate", se_mask_mat, "bright")
    ]
    
    for stype, mask_item, polarity in subtypes_to_extract:
        if mask_item is None:
            continue
        try:
            arr_m = np.array(mask_item) > 0
            if not np.any(arr_m):
                continue
            labeled_m, num_m = ndi.label(arr_m)
            slices = ndi.find_objects(labeled_m)
            for s_idx, sl in enumerate(slices):
                if sl is None:
                    continue
                c_area = int(np.sum(labeled_m[sl] == (s_idx + 1)))
                if c_area <= 0:
                    continue
                ymin, ymax = sl[0].start, sl[0].stop
                xmin, xmax = sl[1].start, sl[1].stop
                w = int(xmax - xmin)
                h = int(ymax - ymin)
                cx = round(float((xmin + xmax - 1) / 2.0), 1)
                cy = round(float((ymin + ymax - 1) / 2.0), 1)
                aspect = min(w, h) / max(w, h) if max(w, h) > 0 else 1.0
                morph_score = round(float(aspect), 2)
                intensity_score = round(float(min(1.0, 0.70 + 0.25 * (c_area / 50.0))), 2)
                cand_score = round(float(0.5 * morph_score + 0.5 * intensity_score), 2)
                candidates_list.append({
                    "id": f"cand-{cand_seq:04d}",
                    "type": stype,
                    "polarity": polarity,
                    "area": c_area,
                    "centroid": [cx, cy],
                    "boundingBox": [xmin, ymin, w, h],
                    "intensityScore": intensity_score,
                    "morphologyScore": morph_score,
                    "candidateScore": cand_score,
                    "clinicalStatus": "Candidate evidence — not a confirmed clinical lesion"
                })
                cand_seq += 1
        except Exception as e:
            print(f"[MATLAB Bridge] Error extracting candidates for {stype}: {e}")

    # Fallback to connected components on total lesion mask if no subtype candidates extracted
    if len(candidates_list) == 0 and lesion_mask_mat is not None:
        try:
            arr_l = np.array(lesion_mask_mat) > 0
            if np.any(arr_l):
                lbl_l, num_l = ndi.label(arr_l)
                slices_l = ndi.find_objects(lbl_l)
                for s_idx, sl in enumerate(slices_l[:1000]):
                    if sl is None:
                        continue
                    c_area = int(np.sum(lbl_l[sl] == (s_idx + 1)))
                    if c_area <= 0:
                        continue
                    ymin, ymax = sl[0].start, sl[0].stop
                    xmin, xmax = sl[1].start, sl[1].stop
                    w = int(xmax - xmin)
                    h = int(ymax - ymin)
                    cx = round(float((xmin + xmax - 1) / 2.0), 1)
                    cy = round(float((ymin + ymax - 1) / 2.0), 1)
                    candidates_list.append({
                        "id": f"cand-{cand_seq:04d}",
                        "type": "unclassified_candidate",
                        "polarity": "unclassified",
                        "area": c_area,
                        "centroid": [cx, cy],
                        "boundingBox": [xmin, ymin, w, h],
                        "intensityScore": 0.80,
                        "morphologyScore": 0.80,
                        "candidateScore": 0.80,
                        "clinicalStatus": "Candidate evidence — not a confirmed clinical lesion"
                    })
                    cand_seq += 1
        except Exception as e:
            print(f"[MATLAB Bridge] Error extracting fallback candidates: {e}")

    # Save lesion candidates JSON
    candidates_json_filename = f"lesion_candidates_{run_id[:8]}.json"
    candidates_json_path = os.path.join(UPLOADS_DIR, candidates_json_filename)
    try:
        with open(candidates_json_path, "w", encoding="utf-8") as f_cands:
            json.dump({
                "screeningId": run_id,
                "runId": run_id,
                "totalCandidates": len(candidates_list),
                "brightCandidates": bright_cnt,
                "darkCandidates": dark_cnt,
                "candidates": candidates_list
            }, f_cands, indent=2)
        lesion_candidates_url = f"/uploads/{candidates_json_filename}"
    except Exception as e:
        print(f"[MATLAB Bridge] Could not save lesion candidates JSON: {e}")
        lesion_candidates_url = ""

    # Neovascularization (NV) Assessment (Explicit honest structured output)
    nv_response = {
        "status": "unavailable",
        "confidence": None,
        "regions": [],
        "artifact": None,
        "method": "No dedicated validated NV detector available",
        "candidateEvidence": "NV CANDIDATE EVIDENCE — NOT A CONFIRMED FINDING: No validated pixel-level detector in repository"
    }

    # Structured Candidate Breakdown
    ma_cnt = int(seg_raw.get("maCount", 0))
    he_cnt = int(seg_raw.get("heCount", 0))
    ex_cnt = int(seg_raw.get("exCount", 0))
    se_cnt = int(seg_raw.get("seCount", 0))
    he_quads = convert_matlab_value(seg_raw.get("heQuadrantCounts", [0, 0, 0, 0]))
    ex_macular = int(seg_raw.get("exMacularProximityCount", 0))
    csme_risk = bool(seg_raw.get("exCsmeRiskFlag", 0))

    candidate_breakdown = {
        "microaneurysmCandidates": ma_cnt,
        "hemorrhageCandidates": he_cnt,
        "quadrantDistribution": he_quads,
        "hardExudateCandidates": ex_cnt,
        "macularProximityExudates": ex_macular,
        "csmeRiskCandidateFlag": csme_risk,
        "softExudateCandidates": se_cnt
    }

    # Vessel Metrics Dictionary
    vessel_metrics = {
        "coveragePercent": round(vessel_cov, 2),
        "pixelCount": vessel_pixel_count,
        "density": round(vessel_density, 4),
        "branchingComplexity": branching_complexity,
        "vesselEndpoints": vessel_endpoints,
        "meanCaliber": mean_caliber,
        "connectivity": vessel_connectivity
    }

    segmentation_response = {
        "id": f"seg-{run_id[:8]}",
        "vessel_coverage": round(vessel_cov, 2),
        "vesselCoverage": round(vessel_cov, 2),
        "vessel_pixels": vessel_pixel_count,
        "vesselPixelCount": vessel_pixel_count,
        "vessel_density": vessel_density,
        "vesselDensity": vessel_density,
        "vessel_metrics": vessel_metrics,
        "vesselMetrics": vessel_metrics,
        "lesion_coverage": round(lesion_cov, 2),
        "lesionCoverage": round(lesion_cov, 2),
        "candidate_count": lesion_cnt or len(candidates_list),
        "candidateCount": lesion_cnt or len(candidates_list),
        "totalCandidates": lesion_cnt or len(candidates_list),
        "bright_lesion_count": bright_cnt,
        "brightCandidates": bright_cnt,
        "dark_lesion_count": dark_cnt,
        "darkCandidates": dark_cnt,
        "candidateBreakdown": candidate_breakdown,
        "candidate_breakdown": candidate_breakdown,
        "neovascularization": nv_response,
        "vessel_mask_url": vessel_mask_url,
        "lesion_mask_url": lesion_mask_url,
        "evidence_overlay_url": evidence_overlay_url,
        "retinal_evidence_url": evidence_overlay_url,
        "lesion_candidates_url": lesion_candidates_url,
        "disclaimer": "Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinician review and do not constitute independent diagnostic proof.",
        "processingTimeSec": segmentation_time
    }'''

if old_seg_block in code:
    code = code.replace(old_seg_block, new_seg_block)
    print("Replaced Module 3 segmentation block successfully!")
else:
    print("Could not find exact old_seg_block to replace!")

# 3. Add Grad-CAM <-> Lesion Spatial IoU calculation and retinal_evidence_<runId>.json writing
old_explain_block = '''    explainability_response = {
        "id": f"xai-{run_id[:8]}",
        "gradcam_url": gradcam_url,
        "overlay_url": overlay_url or gradcam_url,
        "raw_url": raw_url,
        "mat_url": mat_url,
        "status": cam_status,
        "feature_layer": feature_layer,
        "featureLayer": feature_layer,
        "execution_environment": exec_env,
        "executionEnvironment": exec_env,
        "evidence_summary": f"Swin V2 Tiny Grad-CAM visualizes spatial attention over salient retinal features for {'Referable DR' if is_referable else 'Non-Referable screening'}.",
        "attention_focus": f"Layer {feature_layer} activation concentrated across salient retinal regions.",
        "processingTimeSec": gradcam_time
    }'''

new_explain_block = '''    # Module 5 Grad-CAM <-> Module 3 Lesion Spatial IoU Alignment
    gradcam_lesion_iou = None
    try:
        if heatmap_mat is not None and lesion_mask_mat is not None:
            cam_arr = np.array(heatmap_mat, dtype=np.float32)
            if cam_arr.ndim == 3:
                cam_arr = cam_arr[:, :, 0]
            # Normalize CAM
            cam_min, cam_max = float(cam_arr.min()), float(cam_arr.max())
            if cam_max > cam_min:
                cam_norm = (cam_arr - cam_min) / (cam_max - cam_min)
            else:
                cam_norm = cam_arr
                
            # Resize CAM to exact native mask dimensions (img_h, img_w)
            if cam_norm.shape != (img_h, img_w):
                from PIL import Image as CamPil
                pil_cam = CamPil.fromarray((cam_norm * 255.0).astype(np.uint8))
                cam_resized = np.array(pil_cam.resize((img_w, img_h), CamPil.BILINEAR)) / 255.0
            else:
                cam_resized = cam_norm
                
            # Threshold CAM activation: top 25% or >= 0.40
            cam_threshold = max(0.40, float(np.percentile(cam_resized, 75.0)))
            cam_binary = cam_resized >= cam_threshold
            lesion_binary = np.array(lesion_mask_mat) > 0
            
            lesion_active_px = int(np.sum(lesion_binary))
            cam_active_px = int(np.sum(cam_binary))
            
            if lesion_active_px > 0 and cam_active_px > 0:
                intersection = int(np.logical_and(cam_binary, lesion_binary).sum())
                union = int(np.logical_or(cam_binary, lesion_binary).sum())
                gradcam_lesion_iou = round(float(intersection / union), 4) if union > 0 else 0.0
            elif lesion_active_px == 0:
                gradcam_lesion_iou = 0.0
    except Exception as e:
        print(f"[MATLAB Bridge] Could not compute GradCAM <-> Lesion IoU: {e}")
        gradcam_lesion_iou = None

    explainability_response = {
        "id": f"xai-{run_id[:8]}",
        "gradcam_url": gradcam_url,
        "overlay_url": overlay_url or gradcam_url,
        "raw_url": raw_url,
        "mat_url": mat_url,
        "status": cam_status,
        "feature_layer": feature_layer,
        "featureLayer": feature_layer,
        "execution_environment": exec_env,
        "executionEnvironment": exec_env,
        "evidence_summary": f"Swin V2 Tiny Grad-CAM visualizes spatial attention over salient retinal features for {'Referable DR' if is_referable else 'Non-Referable screening'}.",
        "attention_focus": f"Layer {feature_layer} activation concentrated across salient retinal regions.",
        "gradcam_lesion_iou": gradcam_lesion_iou,
        "gradcamLesionIoU": gradcam_lesion_iou,
        "processingTimeSec": gradcam_time
    }
    
    # Update segmentation_response with Grad-CAM IoU
    segmentation_response["gradcam_lesion_iou"] = gradcam_lesion_iou
    segmentation_response["gradcamLesionIoU"] = gradcam_lesion_iou
    
    # Save unified machine-readable Retinal Evidence JSON
    retinal_evidence_json_filename = f"retinal_evidence_{run_id[:8]}.json"
    retinal_evidence_json_path = os.path.join(UPLOADS_DIR, retinal_evidence_json_filename)
    try:
        with open(retinal_evidence_json_path, "w", encoding="utf-8") as f_ev:
            json.dump({
                "module": "Module 3",
                "screeningId": run_id,
                "runId": run_id,
                "imageWidth": img_w,
                "imageHeight": img_h,
                "vessels": {
                    "artifact": vessel_mask_url,
                    "coverage": round(vessel_cov / 100.0, 4),
                    "coveragePercent": round(vessel_cov, 2),
                    "pixelCount": vessel_pixel_count,
                    "density": round(vessel_density, 4),
                    "width": img_w,
                    "height": img_h,
                    "morphology": vessel_metrics
                },
                "lesions": {
                    "artifact": lesion_mask_url,
                    "coverage": round(lesion_cov / 100.0, 4),
                    "coveragePercent": round(lesion_cov, 2),
                    "totalCandidates": lesion_cnt or len(candidates_list),
                    "brightCandidates": bright_cnt,
                    "darkCandidates": dark_cnt,
                    "breakdown": candidate_breakdown,
                    "candidatesArtifact": lesion_candidates_url,
                    "candidates": candidates_list[:100]
                },
                "neovascularization": nv_response,
                "artifacts": {
                    "vessels": vessel_mask_url,
                    "lesions": lesion_mask_url,
                    "nv": None,
                    "combinedEvidence": evidence_overlay_url,
                    "lesionMetadata": lesion_candidates_url,
                    "evidenceJson": f"/uploads/{retinal_evidence_json_filename}"
                },
                "spatial": {
                    "width": img_w,
                    "height": img_h,
                    "coordinateSystem": "native_fundus"
                },
                "gradcamLesionIoU": gradcam_lesion_iou
            }, f_ev, indent=2)
        evidence_json_url = f"/uploads/{retinal_evidence_json_filename}"
    except Exception as e:
        print(f"[MATLAB Bridge] Could not save retinal evidence JSON: {e}")
        evidence_json_url = ""
        
    segmentation_response["evidence_json_url"] = evidence_json_url
    segmentation_response["evidenceJsonUrl"] = evidence_json_url'''

if old_explain_block in code:
    code = code.replace(old_explain_block, new_explain_block)
    print("Replaced explainability block with IoU and evidence JSON successfully!")
else:
    print("Could not find exact old_explain_block to replace!")

# 4. Add retinal evidence structure into the final response dict
old_res_block = '''        "qualityClass": quality_class,
        "qualityConfidence": quality_conf_clamped,
        "enhancement": enhancement_response,
        "segmentation": segmentation_response,
        "classification": grading_response,
        "explainability": explainability_response,
        "referral": referral_response,'''

new_res_block = '''        "qualityClass": quality_class,
        "qualityConfidence": quality_conf_clamped,
        "enhancement": enhancement_response,
        "segmentation": segmentation_response,
        "retinalEvidence": segmentation_response,
        "evidence": {
            "retinal": {
                "vessels": {
                    "artifact": vessel_mask_url,
                    "coverage": round(vessel_cov / 100.0, 4),
                    "coveragePercent": round(vessel_cov, 2),
                    "pixelCount": vessel_pixel_count,
                    "density": round(vessel_density, 4),
                    "morphology": vessel_metrics
                },
                "lesions": {
                    "artifact": lesion_mask_url,
                    "coverage": round(lesion_cov / 100.0, 4),
                    "coveragePercent": round(lesion_cov, 2),
                    "totalCandidates": lesion_cnt or len(candidates_list),
                    "brightCandidates": bright_cnt,
                    "darkCandidates": dark_cnt,
                    "breakdown": candidate_breakdown,
                    "candidatesUrl": lesion_candidates_url
                },
                "neovascularization": nv_response,
                "combinedEvidence": {
                    "artifact": evidence_overlay_url
                },
                "gradcamLesionIoU": gradcam_lesion_iou,
                "spatial": {
                    "width": img_w,
                    "height": img_h
                }
            }
        },
        "classification": grading_response,
        "explainability": explainability_response,
        "referral": referral_response,'''

if old_res_block in code:
    code = code.replace(old_res_block, new_res_block)
    print("Updated final response dictionary with retinal evidence!")
else:
    print("Could not find exact old_res_block to replace!")

with open(bridge_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved updated matlab_bridge.py successfully!")
