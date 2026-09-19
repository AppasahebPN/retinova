# NetraAI ASHA Field App

A simple, practical mobile application for ASHA workers and rural health workers to perform AI-assisted diabetic retinopathy screening using the NetraAI backend.

## Purpose

This app is the **field-worker client** for the NetraAI system. It connects to the existing NetraAI Express backend and provides a simple, linear workflow:

**Patient ? Capture Image ? AI Screening ? Result ? Referral**

The AI pipeline (Swin V2 Tiny, MATLAB, CLAHE enhancement, GradCAM, vessel/lesion segmentation) runs entirely on the backend server. This app only captures images, sends them, and displays results.

## Technology

- React Native + Expo (TypeScript)
- React Navigation (Stack + Bottom Tabs)
- Expo Image Picker (camera and gallery)
- AsyncStorage (JWT token and settings)

## Prerequisites

- Node.js 18+
- Expo CLI (installed via npx)
- Android device or emulator (Android-first)
- The NetraAI backend must be running and accessible on the network

## Installation

```bash
cd mobile-app
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and set your backend server address:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5000
   ```
   Replace `192.168.1.100` with the actual IP address of the machine running the NetraAI backend.

   > You can also update the API URL at runtime in the app's **Settings** screen without restarting.

## Running the App

```bash
npx expo start
```

Then:
- Press **`a`** to open on Android emulator
- Scan the QR code with **Expo Go** on a physical Android device

## Running on Android

### Physical device
1. Install **Expo Go** from Google Play Store
2. Connect to the same Wi-Fi network as your development machine
3. Run `npx expo start` and scan the QR code

### Android Emulator
1. Open Android Studio ? AVD Manager ? Start an emulator
2. Run `npx expo start` ? press `a`

## Backend Dependency

This app **requires** the NetraAI backend to be running. The backend:
- Endpoint: `http://<server>:5000/api`
- Uses JWT authentication (role: `healthcare_worker`)
- Processes images through the MATLAB/Python AI pipeline

**Do not modify the backend.** This app is a read/write client only.

## Screens

| Screen | Description |
|--------|-------------|
| Login | Sign in with health worker credentials |
| Home | Dashboard with recent screenings and quick-start |
| Patient Search | Search existing patients by name/location |
| New Patient | Register a new patient |
| Eye Selection | Select left or right eye |
| Image Capture | Take photo or choose from gallery |
| Image Preview | Confirm image before uploading |
| Processing | Upload ? Create Screening ? Run AI Analysis |
| Screening Result | Display DR grade, decision (SCREEN/REFER/RECAPTURE) |
| Evidence | Grad-CAM (Model Attribution), vessel/lesion evidence |
| Referral | View and update referral action |
| History | All past screenings list |
| Screening Detail | Full detail for a selected past screening |
| Settings | API URL configuration and sign out |

## Permissions Required

| Permission | Purpose |
|-----------|---------|
| Camera | Capture fundus photographs |
| Photo Library | Select existing fundus images |
| Network | Connect to NetraAI backend |

## Offline Behavior

- The app requires a network connection to the backend to perform screening.
- If the network is unavailable, an error message is shown: "Unable to complete screening because the screening service is currently unavailable."
- **No AI inference is performed offline.** No results are fabricated.
- Previous screening data stored in history is not affected by connectivity.

## Screening ID Integrity

Each screening has a unique ID. The app ensures:
- New screenings **always clear** previous state before starting
- Results are **always fetched by the exact screening ID**
- No cross-contamination between screenings

## Known Limitations

1. **Auth required**: All API calls require a valid JWT. The token is stored locally and refreshed on next login.
2. **Image upload route**: Uses `POST /api/screenings/upload` (multipart). If this route conflicts on the server, the app will show an error during Processing.
3. **Analytics endpoint**: Home screen stats depend on `/api/analytics/overview`. If unavailable, the stats section is hidden.
4. **Offline queueing**: Not yet implemented. Screenings require live connectivity.
5. **iOS**: Not primary target. Camera/gallery should work but not tested on iOS.

## Project Structure

```
mobile-app/
+-- src/
¦   +-- components/       # Reusable UI components
¦   +-- screens/          # All 13 screen components
¦   +-- navigation/       # Stack and Tab navigators
¦   +-- services/         # API, auth, patient, screening services
¦   +-- hooks/            # useAuth hook and context
¦   +-- types/            # TypeScript interfaces
¦   +-- utils/            # constants (colors, fonts, spacing)
+-- App.tsx               # App entry point
+-- app.json              # Expo configuration
+-- .env.example          # Environment variable template
+-- package.json
```

## Disclaimer

NetraAI supports screening and referral. Final clinical diagnosis must be performed by a qualified eye-care professional. This application does not replace a doctor.
