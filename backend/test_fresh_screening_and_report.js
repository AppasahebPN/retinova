const fs = require('fs');

async function runFreshTest() {
  console.log('====================================================');
  console.log('TEST 1: 001639a390f0.png (Expected: G4, ~99.74% calibrated risk, REFER)');
  console.log('====================================================');

  // 1. Login
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'asha.worker@netra-ai.org', password: 'demo1234' })
  });
  const { token } = await loginRes.json();
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 2. Direct Screen 001639a390f0.png
  const screenRes1 = await fetch('http://localhost:5000/api/screen', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageUrl: '/uploads/001639a390f0.png',
      imagePath: 'C:\\Users\\Appasaheb\\OneDrive\\Documents\\MATLAB\\NetraAI\\DR_Screening_MATLAB\\data\\APTOS\\train_images\\001639a390f0.png',
      originalFilename: '001639a390f0.png'
    })
  });
  console.log('Screen 1 HTTP Status:', screenRes1.status);
  const data1 = await screenRes1.json();
  const sId1 = data1.screening_id || data1.screeningId;
  console.log('Screening ID:', sId1);
  console.log('Screening finalDecision:', data1.finalDecision || data1.decision);
  console.log('Screening predicted_grade:', data1.classification?.predicted_grade);
  console.log('Screening calibrated risk:', data1.classification?.g2plus_probability_calibrated);
  console.log('Screening model:', data1.classification?.model_name);

  // 3. Fetch Report for THAT SAME screening ID
  const reportRes1 = await fetch(`http://localhost:5000/api/reports/${sId1}/html`, { headers });
  console.log('Report 1 HTTP Status:', reportRes1.status);
  const html1 = await reportRes1.text();
  fs.writeFileSync('report_001639a390f0_live.html', html1, 'utf8');
  console.log('Saved report_001639a390f0_live.html (Length:', html1.length, 'bytes)');

  // Verify elements in Report 1
  console.log('\n--- VERIFYING REPORT 1 CONTENT ---');
  console.log('Decision REFER in report:', html1.includes('REFER') && !html1.includes('NON-REFERABLE'));
  console.log('Grade 4 in report:', html1.includes('Grade 4') || html1.includes('Proliferative'));
  console.log('Swin V2 Tiny in report:', html1.includes('Swin V2 Tiny'));
  console.log('Original Fundus in report:', html1.includes('1. Original Fundus Image'));
  console.log('Enhanced Fundus in report:', html1.includes('2. Enhanced Fundus'));
  console.log('Retinal Vessel Evidence in report:', html1.includes('3. Retinal Vessel Evidence'));
  console.log('Candidate Lesion Evidence in report:', html1.includes('4. Candidate Lesion Evidence'));
  console.log('Grad-CAM in report:', html1.includes('5. Explainable AI — Grad-CAM'));

  console.log('\n====================================================');
  console.log('TEST 2: 002c21358ce6.png (Expected: G0, ~1.50% calibrated risk, SCREEN)');
  console.log('====================================================');

  const screenRes2 = await fetch('http://localhost:5000/api/screen', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      imageUrl: '/uploads/002c21358ce6.png',
      imagePath: 'C:\\Users\\Appasaheb\\OneDrive\\Documents\\MATLAB\\NetraAI\\DR_Screening_MATLAB\\data\\APTOS\\train_images\\002c21358ce6.png',
      originalFilename: '002c21358ce6.png'
    })
  });
  console.log('Screen 2 HTTP Status:', screenRes2.status);
  const data2 = await screenRes2.json();
  const sId2 = data2.screening_id || data2.screeningId;
  console.log('Screening ID:', sId2);
  console.log('Screening finalDecision:', data2.finalDecision || data2.decision);
  console.log('Screening predicted_grade:', data2.classification?.predicted_grade);
  console.log('Screening calibrated risk:', data2.classification?.g2plus_probability_calibrated);
  console.log('Screening model:', data2.classification?.model_name);

  // Fetch Report for screening 2
  const reportRes2 = await fetch(`http://localhost:5000/api/reports/${sId2}/html`, { headers });
  console.log('Report 2 HTTP Status:', reportRes2.status);
  const html2 = await reportRes2.text();
  fs.writeFileSync('report_002c_live_fresh.html', html2, 'utf8');
  console.log('Saved report_002c_live_fresh.html (Length:', html2.length, 'bytes)');

  console.log('\n--- VERIFYING REPORT 2 CONTENT ---');
  console.log('Decision SCREEN in report:', html2.includes('SCREEN') && html2.includes('NON-REFERABLE'));
  console.log('Grade 0 in report:', html2.includes('Grade 0') || html2.includes('No Diabetic Retinopathy'));
  console.log('Swin V2 Tiny in report:', html2.includes('Swin V2 Tiny'));
  console.log('Original Fundus in report:', html2.includes('1. Original Fundus Image'));
  console.log('Enhanced Fundus in report:', html2.includes('2. Enhanced Fundus'));
  console.log('Retinal Vessel Evidence in report:', html2.includes('3. Retinal Vessel Evidence'));
  console.log('Candidate Lesion Evidence in report:', html2.includes('4. Candidate Lesion Evidence'));
  console.log('Grad-CAM in report:', html2.includes('5. Explainable AI — Grad-CAM'));
}

runFreshTest().catch(console.error);
