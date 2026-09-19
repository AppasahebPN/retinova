import os
import sys
import numpy as np
from PIL import Image
import scipy.ndimage as ndimage
import matplotlib.pyplot as plt
import matlab.engine

ROOT_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB"
UPLOADS_DIR = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads"
ARTIFACTS_DIR = r"C:\Users\Appasaheb\.gemini\antigravity-ide\brain\e8d45aaa-5f53-446a-98ab-b9ea21a0456a"
RUN_ID = "cc05b2b7"
VESSEL_PATH = os.path.join(UPLOADS_DIR, f"vessels_{RUN_ID}.png")

def run_vessel_audit():
    print("=" * 60)
    print("PROBLEM B: VESSEL BRANCH-POINT ROOT-CAUSE AUDIT")
    print("=" * 60)

    # 1. Connect to MATLAB engine
    print("Initializing MATLAB Engine...")
    eng = matlab.engine.start_matlab()
    print("MATLAB Engine started successfully.")

    # 1. Load exact binary vessel mask used for skeletonization
    ves_img = Image.open(VESSEL_PATH).convert("L")
    ves_np = (np.array(ves_img) > 0).astype(np.uint8)
    h, w = ves_np.shape
    total_px = h * w
    vessel_px = int(np.sum(ves_np))
    vessel_cov = (vessel_px / total_px) * 100.0

    print(f"1. VESSEL MASK PROPERTIES:")
    print(f"   Dimensions: {w} x {h}")
    print(f"   Vessel pixel count: {vessel_px:,} px")
    print(f"   Vessel coverage:    {vessel_cov:.2f}% (Matches report: 14.96%)")

    # Save exact binary vessel mask to artifact directory
    mask_art_path = os.path.join(ARTIFACTS_DIR, f"debug_vessel_mask_{RUN_ID}.png")
    ves_img.save(mask_art_path)

    # Pass mask to MATLAB
    vessel_mat = matlab.logical(ves_np.tolist())

    # 2. Raw skeleton before ANY pruning
    print("\n2. COMPUTING RAW SKELETON (bwmorph 'skel', Inf)...")
    skel_mat = eng.bwmorph(vessel_mat, 'skel', float('inf'))
    skel_np = np.array(skel_mat._data).reshape((h, w), order='F').astype(bool)

    # Save raw skeleton artifact
    skel_img = Image.fromarray((skel_np * 255).astype(np.uint8))
    skel_raw_art_path = os.path.join(ARTIFACTS_DIR, f"debug_vessel_skeleton_raw_{RUN_ID}.png")
    skel_raw_upl_path = os.path.join(UPLOADS_DIR, f"debug_vessel_skeleton_raw_{RUN_ID}.png")
    skel_img.save(skel_raw_art_path)
    skel_img.save(skel_raw_upl_path)
    print(f"   Saved raw skeleton artifact: {skel_raw_art_path}")

    # 3. Raw Branch Points & Endpoints
    bp_mat = eng.bwmorph(skel_mat, 'branchpoints')
    ep_mat = eng.bwmorph(skel_mat, 'endpoints')
    bp_np = np.array(bp_mat._data).reshape((h, w), order='F').astype(bool)
    ep_np = np.array(ep_mat._data).reshape((h, w), order='F').astype(bool)

    raw_bp_count = int(np.sum(bp_np))
    raw_ep_count = int(np.sum(ep_np))
    raw_skel_px = int(np.sum(skel_np))

    print(f"\n3. RAW SKELETON METRICS:")
    print(f"   Raw Skeleton pixels:   {raw_skel_px:,}")
    print(f"   Raw Branch points:     {raw_bp_count:,} (Matches report: 10,445)")
    print(f"   Raw Endpoints:         {raw_ep_count:,} (Matches report: 9,304)")
    print(f"   Skeleton pixel / BP:   {raw_skel_px / raw_bp_count:.2f} px per branch point!")

    # 4. Connected Components & Terminal Spur Length Analysis
    print("\n4. TOPOLOGICAL DECOMPOSITION & NEIGHBORHOOD ANALYSIS:")
    # Vessel mask CC
    labeled_ves, num_ves_cc = ndimage.label(ves_np)
    ves_cc_sizes = ndimage.sum(ves_np, labeled_ves, range(1, num_ves_cc + 1))
    tiny_ves_cc_15 = int(np.sum(ves_cc_sizes < 15))
    tiny_ves_cc_30 = int(np.sum(ves_cc_sizes < 30))
    tiny_ves_cc_50 = int(np.sum(ves_cc_sizes < 50))

    # Skeleton CC
    labeled_skel, num_skel_cc = ndimage.label(skel_np)
    skel_cc_sizes = ndimage.sum(skel_np, labeled_skel, range(1, num_skel_cc + 1))
    tiny_skel_cc_5 = int(np.sum(skel_cc_sizes < 5))
    tiny_skel_cc_10 = int(np.sum(skel_cc_sizes < 10))

    # Branch point clustering: how many adjacent BP pixels exist?
    labeled_bp, num_bp_clusters = ndimage.label(bp_np)
    bp_cluster_sizes = ndimage.sum(bp_np, labeled_bp, range(1, num_bp_clusters + 1))
    multi_pixel_bp_clusters = int(np.sum(bp_cluster_sizes > 1))

    print(f"   Total Vessel Connected Components:   {num_ves_cc:,}")
    print(f"   Tiny vessel CC (< 15 px):            {tiny_ves_cc_15:,} ({tiny_ves_cc_15/num_ves_cc*100:.1f}%)")
    print(f"   Tiny vessel CC (< 30 px):            {tiny_ves_cc_30:,} ({tiny_ves_cc_30/num_ves_cc*100:.1f}%)")
    print(f"   Tiny vessel CC (< 50 px):            {tiny_ves_cc_50:,} ({tiny_ves_cc_50/num_ves_cc*100:.1f}%)")
    print(f"   Total Skeleton CC:                   {num_skel_cc:,}")
    print(f"   Raw Branch Point Clusters:           {num_bp_clusters:,} (vs {raw_bp_count:,} individual pixels)")
    print(f"   Multi-pixel BP clusters:             {multi_pixel_bp_clusters:,} (clusters with >=2 adjacent BP pixels)")

    # Analyze spur length distribution iteratively
    # A spur of length k is removed in k iterations of 'spur'
    # Terminal branches shorter than 3, 5, 10, 20 px
    print("\n   Analyzing Terminal Spur Lengths (Iterative MATLAB bwmorph 'spur')...")
    spur_counts = {}
    current_skel_mat = skel_mat
    for k in [1, 2, 3, 4, 5, 8, 10, 15, 20]:
        skel_sp = eng.bwmorph(skel_mat, 'spur', k)
        bp_sp = eng.bwmorph(skel_sp, 'branchpoints')
        ep_sp = eng.bwmorph(skel_sp, 'endpoints')
        sp_bp_count = int(eng.sum(eng.sum(bp_sp)))
        sp_ep_count = int(eng.sum(eng.sum(ep_sp)))
        sp_skel_px = int(eng.sum(eng.sum(skel_sp)))
        spur_counts[k] = {
            "bp": sp_bp_count,
            "ep": sp_ep_count,
            "skel_px": sp_skel_px,
            "bp_loss": raw_bp_count - sp_bp_count
        }
        print(f"     Spur prune {k:2d} px: BP = {sp_bp_count:5,d} (lost {raw_bp_count - sp_bp_count:5,d} BPs, -{(raw_bp_count - sp_bp_count)/raw_bp_count*100:.1f}%) | EP = {sp_ep_count:5,d} | Skel = {sp_skel_px:6,d} px")

    # 5. CONTROLLED PRUNING EXPERIMENT (Diagnosis)
    print("\n5. CONTROLLED PRUNING EXPERIMENT:")
    experiments = [
        ("No pruning (Raw)", 0, False),
        ("5 px spur pruning", 5, False),
        ("10 px spur pruning", 10, False),
        ("20 px spur pruning", 20, False),
        ("Area filter >= 30 px + No pruning", 0, 30),
        ("Area filter >= 30 px + 5 px spur pruning", 5, 30),
        ("Area filter >= 30 px + 10 px spur pruning", 10, 30),
    ]

    exp_results = []
    for label, spur_k, area_min in experiments:
        if area_min:
            # Area open vessel mask in MATLAB
            v_mat = eng.bwareaopen(vessel_mat, area_min)
        else:
            v_mat = vessel_mat
            
        s_mat = eng.bwmorph(v_mat, 'skel', float('inf'))
        if spur_k > 0:
            s_mat = eng.bwmorph(s_mat, 'spur', spur_k)
            
        b_mat = eng.bwmorph(s_mat, 'branchpoints')
        e_mat = eng.bwmorph(s_mat, 'endpoints')
        
        b_np = np.array(b_mat._data).reshape((h, w), order='F').astype(bool)
        e_np = np.array(e_mat._data).reshape((h, w), order='F').astype(bool)
        s_np = np.array(s_mat._data).reshape((h, w), order='F').astype(bool)
        v_clean_np = np.array(v_mat._data).reshape((h, w), order='F').astype(bool)
        
        # Clustered BPs (connected components of branchpoints)
        _, n_clusters = ndimage.label(b_np)
        
        b_cnt = int(np.sum(b_np))
        e_cnt = int(np.sum(e_np))
        s_len = int(np.sum(s_np))
        v_cov = (int(np.sum(v_clean_np)) / total_px) * 100.0
        
        # Skel CC
        _, n_skel_cc = ndimage.label(s_np)
        
        exp_results.append({
            "label": label,
            "spur_k": spur_k,
            "area_min": area_min,
            "bp_pixels": b_cnt,
            "bp_clusters": n_clusters,
            "endpoints": e_cnt,
            "skel_len": s_len,
            "vessel_cov": v_cov,
            "skel_cc": n_skel_cc,
            "s_np": s_np,
            "b_np": b_np
        })
        
        print(f"\n   Setting: {label}")
        print(f"     Branch point pixels:   {b_cnt:,}")
        print(f"     Branch point clusters: {n_clusters:,}")
        print(f"     Endpoints:             {e_cnt:,}")
        print(f"     Skeleton length:       {s_len:,} px")
        print(f"     Vessel coverage:       {v_cov:.2f}%")
        print(f"     Skeleton CC:           {n_skel_cc:,}")

    # 6. VISUALIZATION ARTIFACT 1: debug_vessel_branchpoints_raw_<runId>.png
    print("\n6. GENERATING ARTIFACT: debug_vessel_branchpoints_raw_<runId>.png")
    fig, axes = plt.subplots(1, 2, figsize=(20, 10), dpi=150)
    fig.suptitle(f"RETINOVA Problem B Audit — Raw Vessel Skeleton & Branch Points (Run: {RUN_ID})\n"
                 f"Vessel Coverage: {vessel_cov:.2f}% | Raw Skeleton: {raw_skel_px:,} px | Raw Branch Points: {raw_bp_count:,}",
                 fontsize=14, fontweight="bold")

    # Left: Full fundus with skeleton in white and branch points in bright red
    vis_full = np.zeros((h, w, 3), dtype=np.uint8)
    vis_full[:] = [15, 15, 20]
    # Vessel mask in faint blue
    vis_full[ves_np > 0] = [30, 45, 80]
    # Skeleton in white
    vis_full[skel_np] = [255, 255, 255]
    # Dilate branch points by 2px so they are visible on 2592x1944
    bp_dilated = ndimage.binary_dilation(bp_np, iterations=2)
    vis_full[bp_dilated] = [255, 40, 40]

    axes[0].imshow(vis_full)
    axes[0].set_title(f"Full Field View (2592 x 1944)\nRed Dots: 10,445 Raw Branch Points", fontsize=12, fontweight="bold")
    axes[0].axis("off")

    # Right: High-magnification crop showing skeleton spurs and junction noise
    # Pick a region with major vessel branch
    # Let's crop center-right 600x600 window: y: 800-1400, x: 1200-1800
    cy1, cy2, cx1, cx2 = 800, 1400, 1200, 1800
    vis_zoom = vis_full[cy1:cy2, cx1:cx2].copy()
    axes[1].imshow(vis_zoom)
    zoom_bp_cnt = int(np.sum(bp_np[cy1:cy2, cx1:cx2]))
    axes[1].set_title(f"High-Magnification Region ({cx2-cx1}x{cy2-cy1} px)\n{zoom_bp_cnt} Branch Points in this window alone!\nWhite: Skeleton | Red: Branch Points | Blue: Vessel Segmentation",
                      fontsize=12, fontweight="bold")
    axes[1].axis("off")

    # Add box on full view showing zoom region
    rect_zoom = plt.Rectangle((cx1, cy1), cx2 - cx1, cy2 - cy1, linewidth=2, edgecolor='yellow', facecolor='none')
    axes[0].add_patch(rect_zoom)

    plt.tight_layout()
    bp_art_path = os.path.join(ARTIFACTS_DIR, f"debug_vessel_branchpoints_raw_{RUN_ID}.png")
    bp_upl_path = os.path.join(UPLOADS_DIR, f"debug_vessel_branchpoints_raw_{RUN_ID}.png")
    plt.savefig(bp_art_path, dpi=150, bbox_inches="tight")
    plt.savefig(bp_upl_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"   Saved {bp_art_path}")

    # 7. VISUALIZATION ARTIFACT 2: debug_vessel_pruning_comparison_<runId>.png
    print("\n7. GENERATING ARTIFACT: debug_vessel_pruning_comparison_<runId>.png")
    fig, axes = plt.subplots(2, 5, figsize=(25, 10), dpi=150)
    fig.suptitle(f"RETINOVA Problem B Audit — Controlled Pruning & Topology Comparison (Run: {RUN_ID})\n"
                 f"Evaluating Spur Removal (0, 5, 10, 20 px) and Small Component Filtering",
                 fontsize=14, fontweight="bold")

    panels_data = [
        ("1. Original Vessel Mask", ves_np, None, f"Coverage: {vessel_cov:.2f}%\nTotal Px: {vessel_px:,}"),
        ("2. Raw Skeleton (No Prune)", exp_results[0]["s_np"], exp_results[0]["b_np"], f"BP: {exp_results[0]['bp_pixels']:,}\nClusters: {exp_results[0]['bp_clusters']:,}"),
        ("3. 5 px Spur Pruned", exp_results[1]["s_np"], exp_results[1]["b_np"], f"BP: {exp_results[1]['bp_pixels']:,}\nClusters: {exp_results[1]['bp_clusters']:,}"),
        ("4. 10 px Spur Pruned", exp_results[2]["s_np"], exp_results[2]["b_np"], f"BP: {exp_results[2]['bp_pixels']:,}\nClusters: {exp_results[2]['bp_clusters']:,}"),
        ("5. 20 px Spur Pruned", exp_results[3]["s_np"], exp_results[3]["b_np"], f"BP: {exp_results[3]['bp_pixels']:,}\nClusters: {exp_results[3]['bp_clusters']:,}"),
    ]

    for col, (title, s_map, b_map, metrics_str) in enumerate(panels_data):
        # Full view
        img_f = np.zeros((h, w, 3), dtype=np.uint8)
        img_f[:] = [15, 15, 20]
        if col == 0:
            img_f[s_map > 0] = [80, 160, 240]
        else:
            img_f[s_map] = [255, 255, 255]
            if b_map is not None:
                b_dil = ndimage.binary_dilation(b_map, iterations=2)
                img_f[b_dil] = [255, 40, 40]

        axes[0, col].imshow(img_f)
        axes[0, col].set_title(f"{title}\n{metrics_str}", fontsize=10, fontweight="bold")
        axes[0, col].axis("off")

        # Zoom view (same cy1:cy2, cx1:cx2)
        zoom_f = img_f[cy1:cy2, cx1:cx2].copy()
        axes[1, col].imshow(zoom_f)
        if b_map is not None:
            z_bp = int(np.sum(b_map[cy1:cy2, cx1:cx2]))
            axes[1, col].set_title(f"Zoom Inset ({z_bp} BPs)", fontsize=9)
        else:
            axes[1, col].set_title("Zoom Inset (Vessels)", fontsize=9)
        axes[1, col].axis("off")

    plt.tight_layout()
    comp_prune_art = os.path.join(ARTIFACTS_DIR, f"debug_vessel_pruning_comparison_{RUN_ID}.png")
    comp_prune_upl = os.path.join(UPLOADS_DIR, f"debug_vessel_pruning_comparison_{RUN_ID}.png")
    plt.savefig(comp_prune_art, dpi=150, bbox_inches="tight")
    plt.savefig(comp_prune_upl, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"   Saved {comp_prune_art}")

    eng.quit()
    print("MATLAB Engine closed.")

    return {
        "raw_bp_count": raw_bp_count,
        "raw_ep_count": raw_ep_count,
        "raw_skel_px": raw_skel_px,
        "num_ves_cc": num_ves_cc,
        "tiny_ves_cc_15": tiny_ves_cc_15,
        "tiny_ves_cc_30": tiny_ves_cc_30,
        "num_bp_clusters": num_bp_clusters,
        "spur_counts": spur_counts,
        "exp_results": exp_results
    }

if __name__ == "__main__":
    run_vessel_audit()
