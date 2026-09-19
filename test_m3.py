import matlab.engine
import time

print("Starting MATLAB engine test...")
t0 = time.time()
eng = matlab.engine.start_matlab()
print(f"Started MATLAB in {time.time() - t0:.2f}s")

eng.addpath(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB")
eng.addpath(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Segmentation")
eng.addpath(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Final")

img_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads\001639a390f0.png"
img = eng.imread(img_path)

t1 = time.time()
res = eng.extract_retinal_evidence(img, nargout=1)
print(f"extract_retinal_evidence finished in {time.time() - t1:.2f}s")
keys = list(res.keys()) if hasattr(res, "keys") else dir(res)
print("Keys:", keys)
print("Summary:", res.get("summary", "None"))
eng.quit()
