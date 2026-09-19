bridge_path = r'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\matlab_bridge.py'

with open(bridge_path, 'r', encoding='utf-8') as f:
    text = f.read()

target_vm = '''    # Vessel Metrics Dictionary
    vessel_metrics = {
        "coveragePercent": round(vessel_cov, 2),
        "pixelCount": vessel_pixel_count,
        "density": round(vessel_density, 4),
        "branchingComplexity": branching_complexity,
        "vesselEndpoints": vessel_endpoints,
        "meanCaliber": mean_caliber,
        "connectivity": vessel_connectivity
    }'''

replacement_vm = '''    junction_clusters = int(seg_raw.get("junctionClusters", branching_complexity))
    skel_length = int(seg_raw.get("skeletonLength", 0))

    # Vessel Metrics Dictionary (Computed at Native 800x600 Matched-Filter Scale)
    vessel_metrics = {
        "coveragePercent": round(vessel_cov, 2),
        "pixelCount": vessel_pixel_count,
        "density": round(vessel_density, 4),
        "branchingComplexity": junction_clusters,
        "junctionClusters": junction_clusters,
        "vesselEndpoints": vessel_endpoints,
        "skeletonLength": skel_length,
        "meanCaliber": mean_caliber,
        "connectivity": vessel_connectivity,
        "topologyScale": "800x600 (native matched filter)",
        "topologyMethod": "Native-scale 3px spur-pruned junction clusters"
    }'''

if target_vm in text:
    text = text.replace(target_vm, replacement_vm)
    with open(bridge_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Successfully updated vessel_metrics in matlab_bridge.py!")
else:
    print("Could not find target_vm in matlab_bridge.py")
