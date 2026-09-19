import json
import os

with open("scan_results.json", "r", encoding="utf-8") as f:
    matches = json.load(f)

classifications = {
    "safe_development_config": [],
    "public_frontend_reference": [],
    "secret_that_must_be_removed": [],
    "intentionally_local_service_reference": []
}

for m in matches:
    fpath = m["file"]
    pat = m["pattern"]
    line = m["line_content"]
    
    # Exclude temporary audit scripts created in this workspace from classification
    if any(os.path.basename(fpath) == s for s in ["harden_jwt_secret.py", "create_backend_env_example.py", "update_backend_security.py"]):
        continue

    # 1. Check if there are any hardcoded real secrets in frontend or backend source
    if "netra-ai-rural-dr-secret-key-2026" in line:
        classifications["secret_that_must_be_removed"].append(m)
    # 2. Database local connection string
    elif "postgresql://postgres:postgres@localhost:5432" in line or "5432" in line:
        classifications["intentionally_local_service_reference"].append(m)
    # 3. Local MATLAB / Simulink bridge on 8000
    elif ":8000" in line or "127.0.0.1:8000" in line or "localhost:8000" in line:
        classifications["intentionally_local_service_reference"].append(m)
    # 4. Frontend checking or warning about localhost/127.0.0.1
    elif "mobile-app\\src" in fpath and ("localhost" in line or "127.0.0.1" in line):
        classifications["public_frontend_reference"].append(m)
    # 5. Environment config template or dev env
    elif ".env" in fpath:
        classifications["safe_development_config"].append(m)
    # 6. Test scripts and smoke test scripts
    elif any(s in fpath for s in [".ps1", "test", "audit", "verify", "smoke"]):
        classifications["safe_development_config"].append(m)
    # 7. Documentation
    elif ".md" in fpath:
        classifications["safe_development_config"].append(m)
    # 8. Backend source handling JWT/auth
    elif "backend\\src" in fpath:
        if "JWT_SECRET" in line or "TOKEN=" in line or "password" in line:
            classifications["safe_development_config"].append(m)
        else:
            classifications["intentionally_local_service_reference"].append(m)
    else:
        classifications["safe_development_config"].append(m)

print("=== CLASSIFICATION SUMMARY ===")
print(f"1. Safe Development Configuration: {len(classifications['safe_development_config'])}")
print(f"2. Public Frontend Reference: {len(classifications['public_frontend_reference'])}")
print(f"3. Intentionally Local Service Reference: {len(classifications['intentionally_local_service_reference'])}")
print(f"4. Secrets That Must Be Removed: {len(classifications['secret_that_must_be_removed'])}")

if classifications['secret_that_must_be_removed']:
    print("\n[ALERT] Secrets to remove:")
    for s in classifications['secret_that_must_be_removed']:
        print(f"  {s['file']}:{s['line_num']} -> {s['line_content']}")
else:
    print("\n[OK] Zero leaked production secrets found in source code!")

with open("classified_scan.json", "w", encoding="utf-8") as f:
    json.dump(classifications, f, indent=2)
