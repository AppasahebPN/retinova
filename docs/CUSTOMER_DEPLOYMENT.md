# RETINOVA Customer Deployment & 15-Step Commercial Demo Flow

---

## 1. Commercial Narrative

When presenting RETINOVA to prospective enterprise clients or government evaluation committees, the commercial proposition is direct and compelling:

> **"Your organization gets a complete Edge AI platform. We configure the workflow, deploy the software, host the cloud infrastructure, and provide continuous annual maintenance and model updates."**

RETINOVA is not merely a website or an isolated mobile app; it is a turnkey edge-to-cloud operational ecosystem.

---

## 2. 15-Step End-to-End Customer Deployment & Live Demo Flow

This scripted flow demonstrates every tier of the RETINOVA platform live in front of a customer, investor, or hackathon jury:

```
[CLOUD SETUP]
 1. Create Organization Tenant
 2. Select Industry Vertical (Healthcare / Insurance / Government / Security)
 3. Enable Specialized AI Workflow (e.g. Swin V2 DR Screening)
 4. Register Edge Android Device in Fleet Registry
      │
[EDGE PROVISIONING]
 5. Install RETINOVA APK (`NetraAI_ASHA.apk`) on Physical Android Device
 6. Authenticate as Organization Operator (e.g., ASHA Field Screener)
 7. Capture Test Sample & Execute Local AI Detection (< 250ms)
      │
[OFFLINE AUTONOMY DEMO]
 8. Toggle Android Device into AIRPLANE MODE (Internet OFF)
 9. Perform 2 Consecutive Inferences Offline:
    • Inferences execute with full Grad-CAM heatmaps
    • Stored locally in SQLite Room DB
    • Marked as PENDING in local sync queue
      │
[CLOUD SYNCHRONIZATION]
10. Toggle Airplane Mode OFF (Internet Restored)
11. Trigger Decoupled Sync Daemon:
    • Queue items stream to AWS Gateway (DynamoDB / S3)
    • Status updates atomically from PENDING to SYNCED
      │
[MONITORING & FLEET CONTROL]
12. Inspect Live Event on Organization Dashboard (/dashboard)
13. Verify Real-Time Device Telemetry (Battery, Latency, Storage)
14. Demonstrate Model Version Registry & OTA Update Check
15. Inspect Maintenance (AMC) Contract Status & Renewal Countdown
```

---

## 3. Step-by-Step Operator Instructions

### Step 1: Create Organization Tenant
* Open the Web Command Center at `http://localhost:5000/dashboard`.
* Switch to **Platform Admin View**.
* Use `POST /api/platform/organizations` to provision a new tenant (e.g., `Karnataka Rural Health Directorate`, Type: `HEALTHCARE`, Plan: `PRO`).

### Step 2: Register Edge Android Device
* In the **Organization Fleet Table**, click **Register Device**.
* Assign Device Name: `PHC-Field-Unit-01`, Form Factor: `ANDROID_PHONE`.
* Device is assigned UUID `DEV-EDGE-001` and bound to the organization.

### Step 3: Install & Launch APK
* Open the **Install Portal** on the Android device browser: `http://<SERVER_IP>:5000/install`.
* Click **Download APK** or download directly from `/download/apk`.
* Install `NetraAI_ASHA.apk` (82.9 MB). Open the app and grant Camera/Storage permissions.

### Step 4: Login as Organization Operator
* Enter demo credentials:
  * Email: `screener@nhm.gov.in`
  * Password: `password` (or `demo1234`)
* The app authenticates via JWT, binds to `org_retinova_health`, and loads the local Swin V2 model.

### Step 5: Test Autonomous Edge Inference
* Navigate to **New Screening**.
* Capture or load a fundus image (e.g., `002c_sample.jpg`).
* Tap **Run Clinical AI Screening**.
* **Observed Result:** Processing completes in $< 250ms$. The 5-Grade ICDR classification (`Moderate NPDR R2`), confidence (`94.2%`), and Grad-CAM vessel overlay render immediately.

### Step 6: Verify Offline Storage (Airplane Mode Test)
* Swipe down the Android quick settings and activate **Airplane Mode**.
* Tap **Run Screening** on a second image.
* Notice: The app completes inference normally. In the Local History screen, the screening badge displays `PENDING CLOUD SYNC (OFFLINE)`.

### Step 7: Reconnect & Verify Cloud Ingestion
* Disable Airplane Mode.
* Return to the Home screen and tap **Sync Offline Queue**.
* Within 1.5 seconds, the status transitions to `SYNCED`.
* Switch to the web dashboard at `http://localhost:5000/dashboard` and verify the event appears live under the organization's event stream with matching timestamp and Grad-CAM badge.

### Step 8: Demonstrate Model OTA Update & Safe Rollback
* In the dashboard, click **Check OTA** for `DEV-EDGE-001`.
* The system checks registry compatibility:
  * Current: `swinv2-tiny-edge-v1.0.4`
  * Latest Certified: `2.4.0`
* Show how corrupted checksums are safely rejected, retaining operational continuity on the previous model.

---

## 4. The Commercial Closing Pitch

> *"This demonstration proves that RETINOVA eliminates the fatal weakness of traditional cloud-only AI — network fragility. Your frontline staff can operate in deep rural districts or subterranean basements with 100% confidence. When they return to network coverage, the enterprise gains centralized visibility, automated triage, and continuous fleet maintenance."*
