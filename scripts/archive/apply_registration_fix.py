import re

bridge_path = r'C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\matlab_bridge.py'

with open(bridge_path, 'r', encoding='utf-8') as f:
    code = f.read()

target_block = '''            # Resize CAM to exact native mask dimensions (img_h, img_w)
            if cam_norm.shape != (img_h, img_w):
                from PIL import Image as CamPil
                pil_cam = CamPil.fromarray((cam_norm * 255.0).astype(np.uint8))
                cam_resized = np.array(pil_cam.resize((img_w, img_h), CamPil.BILINEAR)) / 255.0
            else:
                cam_resized = cam_norm'''

replacement_block = '''            # Inverse-transform Grad-CAM to exact native fundus coordinate space
            # Inverts crop_retina_fov_pil and pad_and_resize_pil to eliminate coordinate distortion and background spill
            from PIL import Image as CamPil
            pil_cam = CamPil.fromarray((cam_norm * 255.0).astype(np.uint8))
            
            ref_arr = arr_enh if ('arr_enh' in locals() and arr_enh is not None) else np.array(Image.open(resolved_image_path))
            gray_ref = np.mean(ref_arr[:, :, :3], axis=2) if ref_arr.ndim == 3 else ref_arr
            mask_ret = gray_ref > 7
            rows = np.any(mask_ret, axis=1)
            cols = np.any(mask_ret, axis=0)
            
            if np.any(rows) and np.any(cols):
                ymin, ymax = np.where(rows)[0][[0, -1]]
                xmin, xmax = np.where(cols)[0][[0, -1]]
                ymin = max(0, ymin - 2)
                ymax = min(img_h, ymax + 3)
                xmin = max(0, xmin - 2)
                xmax = min(img_w, xmax + 3)
                crop_w = xmax - xmin
                crop_h = ymax - ymin
                max_dim = max(crop_w, crop_h)
                dx = (max_dim - crop_w) // 2
                dy = (max_dim - crop_h) // 2
                
                cam_sq = pil_cam.resize((max_dim, max_dim), CamPil.BILINEAR)
                cam_unpad = cam_sq.crop((dx, dy, dx + crop_w, dy + crop_h))
                cam_reg_pil = CamPil.new("L", (img_w, img_h), 0)
                cam_reg_pil.paste(cam_unpad, (xmin, ymin))
                cam_resized = np.array(cam_reg_pil) / 255.0
            else:
                cam_resized = np.array(pil_cam.resize((img_w, img_h), CamPil.BILINEAR)) / 255.0'''

if target_block in code:
    code = code.replace(target_block, replacement_block)
    with open(bridge_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully updated matlab_bridge.py with exact inverse-transform registration!")
else:
    print("Could not find exact target block in matlab_bridge.py")
