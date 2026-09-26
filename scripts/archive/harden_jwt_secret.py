import secrets
import re
import os

env_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\.env"

# Generate 64 bytes (128 hex characters) cryptographically secure random string
secure_secret = secrets.token_hex(64)

with open(env_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith("JWT_SECRET="):
        new_lines.append(f"JWT_SECRET={secure_secret}\n")
    elif line.startswith("CORS_ORIGIN="):
        # Default local dev supports localhost or tunnel; keep configurable
        new_lines.append(line)
    else:
        new_lines.append(line)

with open(env_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Updated backend/.env with cryptographically random 64-byte secret successfully.")
print(f"Secret length: {len(secure_secret)} hex chars (>= 64 chars). Actual secret NOT displayed.")
