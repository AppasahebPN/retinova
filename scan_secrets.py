import os
import re

PATTERNS = [
    r"JWT_SECRET",
    r"postgres://",
    r"password=",
    r"API_KEY",
    r"SECRET=",
    r"TOKEN=",
    r"PRIVATE_KEY",
    r"localhost",
    r"127\.0\.0\.1",
    r"10\.\d+\.\d+\.\d+",
    r"192\.168\.\d+\.\d+"
]

SCAN_DIRS = [
    r"c:\Users\Appasaheb\OneDrive\Desktop\app\mobile-app\src",
    r"c:\Users\Appasaheb\OneDrive\Desktop\app\mobile-app",
    r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src",
    r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend"
]

EXCLUDE_DIRS = {"node_modules", ".git", ".expo", "dist", ".claude"}
EXCLUDE_EXTS = {".png", ".jpg", ".jpeg", ".ico", ".apk", ".pt", ".pth", ".mat", ".log"}

matches = []

for base_dir in SCAN_DIRS:
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            fpath = os.path.join(root, file)
            # Avoid scanning python audit helper scripts or backup files if irrelevant
            if any(fpath.endswith(s) for s in ["scan_secrets.py", "db.json"]):
                continue
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    for i, line in enumerate(f, 1):
                        for pat in PATTERNS:
                            if re.search(pat, line, re.IGNORECASE):
                                matches.append({
                                    "file": fpath,
                                    "line_num": i,
                                    "pattern": pat,
                                    "line_content": line.strip()
                                })
            except Exception as e:
                pass

print(f"Total secret/network pattern matches found: {len(matches)}")
print("\nSample matches (first 30):")
for m in matches[:30]:
    rel = m["file"].replace(r"c:\Users\Appasaheb\OneDrive\Desktop\app\mobile-app", "mobile-app").replace(r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend", "backend")
    print(f"[{m['pattern']}] {rel}:{m['line_num']} -> {m['line_content'][:90]}")

with open("scan_results.json", "w", encoding="utf-8") as f:
    import json
    json.dump(matches, f, indent=2)

print("\nFull results saved to scan_results.json")
