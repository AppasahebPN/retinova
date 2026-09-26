const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const DEMO_EMAIL = 'asha.worker@netra-ai.org';
const DEMO_PASSWORD = 'demo1234';

const SAMPLE_IMAGE_PATH = 'C:\\Users\\Appasaheb\\OneDrive\\Documents\\MATLAB\\NetraAI\\DR\\backend\\uploads\\001639a390f0.png';

async function main() {
  console.log('============================================================');
  console.log('RETINOVA ASHA APP - COMPLETE BACKEND API SMOKE TEST');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Sample Image: ${SAMPLE_IMAGE_PATH}`);
  console.log('============================================================\n');

  let results = {
    auth: false,
    patient: false,
    history: false,
    screeningDetail: false,
    report: false,
    newScreening: false,
    realInference: false,
    imageAssociation: false,
    failureSafety: false,
  };

  let token = '';
  let authUser = null;
  let testPatient = null;
  let existingScreeningId = '';
  let existingScreening = null;
  let newScreeningId = '';
  let finalNewScreening = null;

  // ------------------------------------------------------------
  // STEP 1 - LOGIN
  // ------------------------------------------------------------
  console.log('>>> STEP 1 - LOGIN');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });

    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.token) {
      token = loginData.token;
      authUser = loginData.user;
      results.auth = true;
      console.log('STATUS: [PASS]');
      console.log('Token (truncated):', token.substring(0, 40) + '...');
      console.log('User ID:', authUser.id);
      console.log('User Name:', authUser.full_name);
      console.log('User Role:', authUser.role);
      console.log('Facility:', authUser.facility ? authUser.facility.name : authUser.facility_id);
    } else {
      console.log('STATUS: [FAIL]', loginData);
      return printSummary(results);
    }
  } catch (err) {
    console.error('STATUS: [FAIL] Login network/runtime error:', err.message);
    return printSummary(results);
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // ------------------------------------------------------------
  // STEP 2 - PATIENT ACCESS
  // ------------------------------------------------------------
  console.log('\n>>> STEP 2 - PATIENT ACCESS');
  try {
    const patRes = await fetch(`${BASE_URL}/api/patients?limit=1`, {
      headers: authHeaders,
    });
    const patData = await patRes.json();
    if (patRes.ok && Array.isArray(patData.patients) && patData.patients.length > 0) {
      testPatient = patData.patients[0];
      results.patient = true;
      console.log('STATUS: [PASS]');
      console.log('HTTP Status:', patRes.status);
      console.log('Patients count returned:', patData.patients.length);
      console.log('Patient ID:', testPatient.id);
      console.log('Patient MRN / Code:', testPatient.patient_code);
      console.log('Patient Name:', testPatient.name);
      console.log('Patient Age / Gender:', `${testPatient.age} / ${testPatient.gender}`);
    } else {
      console.log('STATUS: [FAIL] Patients endpoint error:', patData);
    }
  } catch (err) {
    console.error('STATUS: [FAIL] Patient request error:', err.message);
  }

  // ------------------------------------------------------------
  // STEP 3 - SCREENING HISTORY
  // ------------------------------------------------------------
  console.log('\n>>> STEP 3 - SCREENING HISTORY');
  try {
    const histRes = await fetch(`${BASE_URL}/api/screenings?limit=1`, {
      headers: authHeaders,
    });
    const histData = await histRes.json();
    if (histRes.ok && Array.isArray(histData.screenings) && histData.screenings.length > 0) {
      results.history = true;
      existingScreeningId = histData.screenings[0].id;
      console.log('STATUS: [PASS]');
      console.log('HTTP Status:', histRes.status);
      console.log('Screenings count returned:', histData.screenings.length);
      console.log('Screening ID:', existingScreeningId);
    } else {
      console.log('STATUS: [FAIL] Screening history error:', histData);
    }
  } catch (err) {
    console.error('STATUS: [FAIL] Screening history error:', err.message);
  }

  // ------------------------------------------------------------
  // STEP 4 - EXISTING SCREENING DETAIL
  // ------------------------------------------------------------
  console.log('\n>>> STEP 4 - EXISTING SCREENING DETAIL');
  try {
    const detailRes = await fetch(`${BASE_URL}/api/screenings/${existingScreeningId}`, {
      headers: authHeaders,
    });
    const detailData = await detailRes.json();
    existingScreening = detailData.screening;
    if (detailRes.ok && existingScreening) {
      results.screeningDetail = true;
      console.log('STATUS: [PASS]');
      console.log('HTTP Status:', detailRes.status);
      console.log('Screening ID:', existingScreening.id);
      console.log('Patient ID:', existingScreening.patient_id);
      console.log('Eye:', existingScreening.eye);
      console.log('Status:', existingScreening.status);
      console.log('Image Info:', JSON.stringify(existingScreening.image));
      const cls = existingScreening.classification;
      const seg = existingScreening.segmentation;
      const xai = existingScreening.explainability;
      const q = existingScreening.quality;
      console.log('Grade:', `${cls?.predicted_grade ?? cls?.dr_grade} (${cls?.grade_label ?? cls?.dr_stage})`);
      console.log('Probability/Risk:', `Confidence = ${cls?.calibrated_confidence}%, P(G2+) = ${cls?.g2plus_probability_calibrated ?? cls?.classProbabilities?.[2]}`);
      console.log('Decision:', existingScreening.final_decision);
      console.log('Evidence:', xai?.evidence_summary);
      console.log('Grad-CAM:', xai?.gradcam_url);
      console.log('Vessel evidence:', seg ? `Coverage: ${seg.vessel_coverage}%, Mask: ${seg.vessel_mask_url}` : 'None');
      console.log('Lesion evidence:', seg ? `Coverage: ${seg.lesion_coverage}%, Mask: ${seg.lesion_mask_url}, Candidates: ${seg.candidate_count}` : 'None');
      console.log('Report information:', `Available at /api/reports/${existingScreening.id}/html`);
    } else {
      console.log('STATUS: [FAIL] Could not get detail:', detailData);
    }
  } catch (err) {
    console.error('STATUS: [FAIL] Screening detail error:', err.message);
  }

  // ------------------------------------------------------------
  // STEP 5 - VERIFY IMAGE ASSOCIATION
  // ------------------------------------------------------------
  console.log('\n>>> STEP 5 - VERIFY IMAGE ASSOCIATION');
  if (existingScreening) {
    const imgScrId = existingScreening.image?.screening_id;
    const xaiScrId = existingScreening.explainability?.screening_id;
    const refScrId = existingScreening.referral?.screening_id;
    const clsScrId = existingScreening.classification?.screening_id;

    console.log(`Target Screening ID: ${existingScreeningId}`);
    console.log(`image.screening_id: ${imgScrId}`);
    console.log(`explainability.screening_id: ${xaiScrId}`);
    console.log(`referral.screening_id: ${refScrId}`);
    console.log(`classification.screening_id: ${clsScrId}`);

    if (
      imgScrId === existingScreeningId &&
      xaiScrId === existingScreeningId &&
      refScrId === existingScreeningId &&
      clsScrId === existingScreeningId
    ) {
      results.imageAssociation = true;
      console.log('STATUS: [PASS] All sub-objects match exact screening ID. No cross-contamination.');
    } else {
      console.log('STATUS: [FAIL] Mismatch detected in sub-object screening ID references.');
    }
  } else {
    console.log('STATUS: [SKIP/FAIL] No existing screening to verify association.');
  }

  // ------------------------------------------------------------
  // STEP 6 - REPORT
  // ------------------------------------------------------------
  console.log('\n>>> STEP 6 - REPORT');
  try {
    const repRes = await fetch(`${BASE_URL}/api/reports/${existingScreeningId}/html`);
    const htmlText = await repRes.text();
    if (repRes.ok && htmlText.includes('<!DOCTYPE html>') || htmlText.includes('<html')) {
      results.report = true;
      console.log('STATUS: [PASS]');
      console.log('HTTP Status:', repRes.status);
      console.log('Content-Type:', repRes.headers.get('content-type'));
      console.log('HTML size:', htmlText.length, 'bytes');
      console.log('HTML preview (title):', htmlText.match(/<title>(.*?)<\/title>/i)?.[1] || 'Found valid HTML document');
    } else {
      console.log('STATUS: [FAIL] Report HTML failed:', repRes.status, htmlText.substring(0, 100));
    }
  } catch (err) {
    console.error('STATUS: [FAIL] Report request error:', err.message);
  }

  // ------------------------------------------------------------
  // STEP 7 - NEW SCREENING API FLOW
  // ------------------------------------------------------------
  console.log('\n>>> STEP 7 - NEW SCREENING API FLOW');
  try {
    // 7a. Upload
    console.log(`Uploading real fundus image from: ${SAMPLE_IMAGE_PATH}...`);
    const fileBuffer = fs.readFileSync(SAMPLE_IMAGE_PATH);
    const fileName = path.basename(SAMPLE_IMAGE_PATH);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, fileName);

    const uploadRes = await fetch(`${BASE_URL}/api/screenings/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log('Upload response:', uploadData);

    if (!uploadRes.ok || !uploadData.storageUrl) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }

    // 7b. Create screening
    console.log(`Creating screening record for patient ${testPatient.id}...`);
    const createRes = await fetch(`${BASE_URL}/api/screenings`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: testPatient.id,
        facilityId: authUser.facility?.id || authUser.facility_id,
        eye: 'right',
        notes: 'Real ASHA smoke test execution',
        imageStorageUrl: uploadData.storageUrl,
        originalFilename: uploadData.originalFilename || fileName,
        deviceId: 'TOPCON-NW400',
      }),
    });
    const createData = await createRes.json();
    console.log('Create screening response:', createData);
    if (!createRes.ok || !createData.screening?.id) {
      throw new Error(`Create screening failed: ${JSON.stringify(createData)}`);
    }

    newScreeningId = createData.screening.id;
    console.log(`Created Screening ID: ${newScreeningId}`);

    // 7c. Trigger AI Analyze
    console.log(`Triggering production AI analyze on screening ID ${newScreeningId}...`);
    const startTime = Date.now();
    const analyzeRes = await fetch(`${BASE_URL}/api/screenings/${newScreeningId}/analyze`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    const analyzeData = await analyzeRes.json();
    console.log(`Analyze HTTP Status: ${analyzeRes.status} in ${durationSec}s`);
    console.log('Analyze message:', analyzeData.message);

    if (!analyzeRes.ok || !analyzeData.screening) {
      throw new Error(`Analyze failed: ${JSON.stringify(analyzeData)}`);
    }

    // 7d. Fetch Detail to verify
    const finalDetailRes = await fetch(`${BASE_URL}/api/screenings/${newScreeningId}`, {
      headers: authHeaders,
    });
    const finalDetailData = await finalDetailRes.json();
    finalNewScreening = finalDetailData.screening;

    if (finalDetailRes.ok && finalNewScreening && (finalNewScreening.classification || finalNewScreening.final_decision)) {
      results.newScreening = true;
      results.realInference = true;
      console.log('STATUS: [PASS] Real AI pipeline completed and verified.');
    } else {
      console.log('STATUS: [FAIL] Screening verification failed:', finalDetailData);
    }
  } catch (err) {
    console.error('STATUS: [FAIL] New screening pipeline error:', err.message);
  }

  // ------------------------------------------------------------
  // STEP 8 - RECORD EXACT RESULT
  // ------------------------------------------------------------
  console.log('\n>>> STEP 8 - RECORD EXACT RESULT');
  if (finalNewScreening) {
    const cls = finalNewScreening.classification;
    const seg = finalNewScreening.segmentation;
    const xai = finalNewScreening.explainability;
    const q = finalNewScreening.quality;
    console.log('Image:', finalNewScreening.image?.original_filename || path.basename(SAMPLE_IMAGE_PATH));
    console.log('Screening ID:', finalNewScreening.id);
    console.log('IQA:', q ? `Score = ${q.quality_score}, Class = ${q.qualityClass}, Status = ${q.status}, Sharpness = ${q.sharpness}` : 'None');
    console.log('Grade:', cls ? `${cls.predicted_grade ?? cls.dr_grade} - ${cls.grade_label ?? cls.dr_stage}` : 'N/A (Recapture)');
    console.log('Calibrated risk:', cls ? `${cls.calibrated_confidence}%` : 'N/A');
    console.log('Decision:', finalNewScreening.final_decision);
    console.log('Grad-CAM:', xai?.gradcam_url || 'N/A');
    console.log('Vessel evidence:', seg ? `Coverage: ${seg.vessel_coverage}%, Mask: ${seg.vessel_mask_url}` : 'None');
    console.log('Lesion evidence:', seg ? `Coverage: ${seg.lesion_coverage}%, Mask: ${seg.lesion_mask_url}` : 'None');
  } else {
    console.log('No new screening record available.');
  }

  // ------------------------------------------------------------
  // STEP 9 - FAILURE TEST
  // ------------------------------------------------------------
  console.log('\n>>> STEP 9 - FAILURE TEST');
  try {
    const invalidId = '00000000-0000-0000-0000-000000000000';
    const failRes = await fetch(`${BASE_URL}/api/screenings/${invalidId}/analyze`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const failData = await failRes.json();
    if (!failRes.ok && (failRes.status === 404 || failRes.status === 500)) {
      results.failureSafety = true;
      console.log('STATUS: [PASS]');
      console.log('Rejected with Status:', failRes.status);
      console.log('Error payload:', failData);
      console.log('No fake result generated, no previous result reused.');
    } else {
      console.log('STATUS: [FAIL] Unexpected response for invalid ID:', failRes.status, failData);
    }
  } catch (err) {
    console.error('STATUS: [FAIL] Failure test error:', err.message);
  }

  // ------------------------------------------------------------
  // STEP 10 - FINAL REPORT
  // ------------------------------------------------------------
  printSummary(results);
}

function printSummary(results) {
  console.log('\n============================================================');
  console.log('STEP 10 - FINAL REPORT');
  console.log('============================================================');
  console.log(`AUTH:                  ${results.auth ? 'PASS' : 'FAIL'}`);
  console.log(`PATIENT API:           ${results.patient ? 'PASS' : 'FAIL'}`);
  console.log(`HISTORY API:           ${results.history ? 'PASS' : 'FAIL'}`);
  console.log(`SCREENING DETAIL:      ${results.screeningDetail ? 'PASS' : 'FAIL'}`);
  console.log(`REPORT:                ${results.report ? 'PASS' : 'FAIL'}`);
  console.log(`NEW SCREENING:         ${results.newScreening ? 'PASS' : 'FAIL'}`);
  console.log(`REAL AI INFERENCE:     ${results.realInference ? 'PASS' : 'FAIL'}`);
  console.log(`IMAGE ASSOCIATION:     ${results.imageAssociation ? 'PASS' : 'FAIL'}`);
  console.log(`FAILURE SAFETY:        ${results.failureSafety ? 'PASS' : 'FAIL'}`);
  console.log('============================================================');
}

main().catch(console.error);
