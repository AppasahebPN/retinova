# RETINOVA Edge AI Surveillance & Diagnostic Platform
## 30-Hour Hackathon Demo Script, Testing Checklist & Sideloading Manual

---

## 1. The 12-Step Final Demonstration Script

This demonstration proves end-to-end operational viability under real-world conditions: offline edge execution on an independent Android phone, local queue resilience, and automatic synchronization to AWS Cloud Command Center upon reconnection.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE 12-STEP END-TO-END DEMO PROTOCOL                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### STEP 1 — Sideload the APK onto a Second Android Phone
* **Action**:
  - Connect the second phone to the same Wi-Fi network as the laptop, or open Chrome on the phone.
  - Navigate to: `http://10.63.162.244:5000/install` (or scan the QR code on the laptop screen).
  - Tap **Direct Download NetraAI_ASHA.apk** (82.9 MB).
* **Expected Result**: Download completes in $<15\text{ seconds}$ over local Wi-Fi.

### STEP 2 — Install & Open the Application
* **Action**: Tap the downloaded APK in the notification drawer or Files app. If prompted with *"Install unknown apps"*, toggle **Allow from this source**, then tap **Install** $\rightarrow$ **Open**.
* **Expected Result**: The splash screen appears with the RETINOVA logo, transitioning cleanly into the Login screen.

### STEP 3 — Grant Camera Permissions & Login
* **Action**:
  - Tap **Log In as ASHA Worker** (demo credentials preloaded).
  - Tap **Find Patient** or **New Patient**, proceed to capture, and tap **Allow** when Android requests Camera permission.
* **Expected Result**: Real-time camera viewfinder renders smoothly.

### STEP 4 — Perform Initial On-Device Detection (Online Baseline)
* **Action**: Capture a test retinal subject or fundus image and tap **Confirm & Screen**.
* **Expected Result**:
  - The processing screen shows: `Analyzing retinal image...` $\rightarrow$ `Generating clinical evidence...`
  - Within $<300\text{ ms}$, the **Screening Result Screen** displays the diagnostic grade (e.g. *Moderate NPDR*, Calibrated Confidence: $94.2\%$, Decision: `REFER`).
  - The event is logged in the local DB and synchronized to AWS.

### STEP 5 — Sever All Connectivity (Turn OFF Wi-Fi & Mobile Data)
* **Action**:
  - Pull down Android notification shade.
  - Turn **OFF Wi-Fi**.
  - Turn **OFF Mobile Data** (or enable Airplane Mode).
* **Expected Result**: Phone is now 100% air-gapped with zero connection to the laptop or internet.

### STEP 6 — Execute Continuous AI Detection in Total Isolation
* **Action**: Return to the app and execute a new screening from the camera.
* **Expected Result**:
  - The EdgeSwinV2Model continues to execute immediately on-device.
  - The app **does NOT freeze, error, or complain about connection failure**.
  - Diagnostic severity, risk gauge, and clinical recommendations render with zero latency.

### STEP 7 — Verify Offline Queue Telemetry
* **Action**: Tap the Home button to view the Home Dashboard.
* **Expected Result**:
  - The top status pill immediately switches to: `OFFLINE EDGE MODE` (Amber glow).
  - The counter displays: `Pending Sync: 1`.

### STEP 8 — Queue Multiple Offline Events
* **Action**: Perform two additional screenings while offline.
* **Expected Result**:
  - Both screenings complete locally and are committed to Room database.
  - The Home screen telemetry updates: `Pending Sync: 3`.
  - All 3 records are visible in the offline History tab.

### STEP 9 — Reconnect Connectivity (Turn Wi-Fi Back ON)
* **Action**: Pull down notification shade and turn **Wi-Fi back ON**.
* **Expected Result**: Phone re-establishes connectivity with the local network.

### STEP 10 — Observe Autonomous Sync Activation
* **Action**: Keep the Home screen open or tap **Sync Now ⟳**.
* **Expected Result**:
  - Within 4–8 seconds, the SyncManager detects network availability.
  - The sync indicator briefly shows: `Syncing...`.

### STEP 11 — Verify Sync Completion
* **Action**: Observe the Home screen metrics update.
* **Expected Result**:
  - The counter updates: `Pending Sync: 0`.
  - Synced counter increments: `Synced to Cloud: 3`.
  - Top badge turns green: `CLOUD ONLINE`.

### STEP 12 — Open Cloud Surveillance Command Center
* **Action**: On the laptop or another device, open:
  `http://localhost:5000/dashboard` (or `http://10.63.162.244:5000/dashboard`).
* **Expected Result**:
  - All 3 events appear instantly in the **Recent Detection Events** stream table.
  - Node telemetry shows the exact Android device ID (`DEV-EDGE-XXX`), timestamp, severity pill, and S3 evidence key.
  - The today's detection counter increments dynamically.

---

## 2. Pre-Flight Verification Checklist

| # | Check Item | Status | Verification Method |
| :---: | :--- | :---: | :--- |
| 1 | **Backend API Daemon Active** | PASS | `curl http://localhost:5000/health` returns HTTP 200 `{ status: "ok" }`. |
| 2 | **Command Center Live** | PASS | `http://localhost:5000/dashboard` renders KPI bar and table stream. |
| 3 | **APK Direct Download Ready** | PASS | `http://localhost:5000/download/apk` serves 82.9 MB binary. |
| 4 | **QR Code Portal Functional** | PASS | `http://10.63.162.244:5000/install` renders scannable QR code. |
| 5 | **Edge AI Model Loaded** | PASS | `EdgeSwinV2Model` executes on-device without network calls. |
| 6 | **Local Database Persistence** | PASS | Room/SQLite store persists events across app restarts. |
| 7 | **Offline Queueing** | PASS | New detections receive `PENDING` status when air-gapped. |
| 8 | **Idempotent AWS Sync** | PASS | Duplicate uploads do not duplicate DynamoDB records. |
| 9 | **Camera Permissions** | PASS | Declared in `app.json` (`android.permission.CAMERA`). |
| 10 | **SNS Alert Trigger** | PASS | `HIGH` and `CRITICAL` events trigger automated notification logs. |

---

## 3. Android Sideloading & Permission Manual

### Requirements:
* Any Android phone or tablet running Android 9.0 (Pie) or higher.
* Approximately 120 MB free storage.

### Sideloading Instructions:
1. **Download**: On the Android phone's Chrome browser, visit `http://10.63.162.244:5000/install` and tap **Download APK**.
2. **Security Prompt**: Chrome may display *"File might be harmful"*. Tap **Download anyway** (standard prompt for non-Play Store APKs).
3. **Open Package**: When download finishes, tap **Open**.
4. **Grant Install Permission**: If prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*:
   - Tap **Settings**.
   - Enable the toggle for **Allow from this source**.
   - Tap back ($\leftarrow$).
5. **Complete Install**: Tap **Install**, then tap **Open**.
6. **Hardware Permissions**: When the app opens:
   - Tap **While using the app** for Camera permissions.
   - Tap **Allow** for Storage/Media permissions.
