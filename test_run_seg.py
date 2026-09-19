import matlab.engine
import time

print("Testing updated run_Segmentation in MATLAB...")
t0 = time.time()
eng = matlab.engine.start_matlab()
print(f"MATLAB engine started in {time.time() - t0:.2f}s")

eng.addpath(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB")
eng.addpath(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Segmentation")
eng.addpath(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\DR_Screening_MATLAB\module3_Supervised_Final")

img_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads\001639a390f0.png"
img = eng.imread(img_path)

t1 = time.time()
res = eng.run_Segmentation(img, nargout=1)
print(f"run_Segmentation completed in {time.time() - t1:.2f}s")

print("Vessel coverage:", res["vesselCoverage"])
print("Vessel pixel count:", res["vesselPixelCount"])
print("Branching complexity:", res["branchingComplexity"])
print("Vessel endpoints:", res["vesselEndpoints"])
print("Mean caliber:", res["meanCaliber"])
print("Total candidates:", res["lesionCount"])
print("Bright candidates:", res["brightLesionCount"])
print("Dark candidates:", res["darkLesionCount"])
print("NV status:", res["neovascularization"]["status"])
print("NV method:", res["neovascularization"]["method"])
print("Summary:", res["summary"])

eng.quit()
print("Test completed successfully!")
