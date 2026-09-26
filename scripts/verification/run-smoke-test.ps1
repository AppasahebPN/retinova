# ============================================================
# NetraAI ASHA App - Complete Backend API Smoke Test (10 Steps)
# ============================================================

$baseUrl = "http://localhost:5000"
$sampleImagePath = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads\10_left.jpeg"
if (-not (Test-Path $sampleImagePath)) {
    $sampleImagePath = "C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\uploads\001639a390f0.png"
}

Write-Host "============================================================"
Write-Host "NETRAAI ASHA APP — SMOKE TEST EXECUTION"
Write-Host "Backend: $baseUrl"
Write-Host "Image for Test: $sampleImagePath"
Write-Host "============================================================`n"

# ------------------------------------------------------------
# STEP 1 — LOGIN
# ------------------------------------------------------------
Write-Host ">>> STEP 1 — LOGIN"
$loginBody = '{"email":"asha.worker@netra-ai.org","password":"demo1234"}'
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType 'application/json'

if ($loginRes.token) {
    Write-Host "[PASS] Login Successful"
    Write-Host "Token (preview):" ($loginRes.token.Substring(0, 35) + "...")
    Write-Host "User ID:" $loginRes.user.id
    Write-Host "User Name:" $loginRes.user.full_name
    Write-Host "User Email:" $loginRes.user.email
    Write-Host "User Role:" $loginRes.user.role
    Write-Host "User Facility:" $loginRes.user.facility.name
    $authPass = $true
} else {
    Write-Host "[FAIL] Login Failed"
    $authPass = $false
    exit 1
}

$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

# ------------------------------------------------------------
# STEP 2 — PATIENT ACCESS
# ------------------------------------------------------------
Write-Host "`n>>> STEP 2 — PATIENT ACCESS"
$patientRes = Invoke-RestMethod -Uri "$baseUrl/api/patients?limit=1" -Method Get -Headers $headers

if ($patientRes.patients -and $patientRes.patients.Count -gt 0) {
    Write-Host "[PASS] Patient Access Successful"
    Write-Host "Count returned:" $patientRes.patients.Count
    $testPatient = $patientRes.patients[0]
    Write-Host "Patient ID:" $testPatient.id
    Write-Host "Patient Code:" $testPatient.patient_code
    Write-Host "Patient Name:" $testPatient.name
    $patientPass = $true
} else {
    Write-Host "[FAIL] No patients found"
    $patientPass = $false
}

# ------------------------------------------------------------
# STEP 3 — SCREENING HISTORY
# ------------------------------------------------------------
Write-Host "`n>>> STEP 3 — SCREENING HISTORY"
$histRes = Invoke-RestMethod -Uri "$baseUrl/api/screenings?limit=1" -Method Get -Headers $headers

if ($histRes.screenings -and $histRes.screenings.Count -gt 0) {
    Write-Host "[PASS] Screening History Successful"
    Write-Host "Count returned:" $histRes.screenings.Count
    $existingScreening = $histRes.screenings[0]
    $existingId = $existingScreening.id
    Write-Host "Screening ID:" $existingId
    $historyPass = $true
} else {
    Write-Host "[FAIL] No screenings found"
    $historyPass = $false
}

# ------------------------------------------------------------
# STEP 4 — EXISTING SCREENING DETAIL
# ------------------------------------------------------------
Write-Host "`n>>> STEP 4 — EXISTING SCREENING DETAIL"
$detailRes = Invoke-RestMethod -Uri "$baseUrl/api/screenings/$existingId" -Method Get -Headers $headers
$scr = $detailRes.screening

if ($scr -and $scr.id -eq $existingId) {
    Write-Host "[PASS] Screening Detail Retrieved for ID: $($scr.id)"
    Write-Host "Screening ID:" $scr.id
    Write-Host "Patient ID:" $scr.patient_id
    Write-Host "Eye:" $scr.eye
    Write-Host "Status:" $scr.status
    Write-Host "Image Info:" ($scr.image | ConvertTo-Json -Compress)
    Write-Host "Grade:" $scr.classification.dr_grade "($($scr.classification.dr_stage))"
    Write-Host "Probability / Risk:" "Calibrated Confidence: $($scr.classification.calibrated_confidence)%, Risk Level: $($scr.risk_level), P(G2+): $($scr.classification.probabilities[2])"
    Write-Host "Decision:" $scr.final_decision
    Write-Host "Referral Action:" $scr.referral.action "Status:" $scr.referral.status
    Write-Host "Grad-CAM URL:" $scr.explainability.gradcam_url
    Write-Host "Feature Layer:" $scr.explainability.feature_layer
    Write-Host "Lesions evidence:" ($scr.lesions | ConvertTo-Json -Compress)
    Write-Host "Vessels evidence:" ($scr.vessels | ConvertTo-Json -Compress)
    Write-Host "Quality (IQA):" ($scr.quality | ConvertTo-Json -Compress)
    $detailPass = $true
} else {
    Write-Host "[FAIL] Could not retrieve existing screening detail"
    $detailPass = $false
}

# ------------------------------------------------------------
# STEP 5 — VERIFY IMAGE ASSOCIATION
# ------------------------------------------------------------
Write-Host "`n>>> STEP 5 — VERIFY IMAGE ASSOCIATION"
$imgAssoc = $scr.image.screening_id
$xaiAssoc = $scr.explainability.screening_id
$refAssoc = $scr.referral.screening_id
$clsAssoc = $scr.classification.screening_id

Write-Host "Target Screening ID: $existingId"
Write-Host "Image screening_id: $imgAssoc"
Write-Host "Explainability screening_id: $xaiAssoc"
Write-Host "Referral screening_id: $refAssoc"
Write-Host "Classification screening_id: $clsAssoc"

if ($imgAssoc -eq $existingId -and $xaiAssoc -eq $existingId -and $refAssoc -eq $existingId) {
    Write-Host '[PASS] Perfect 1:1 image and artifact association with screening ID'
    $assocPass = $true
} else {
    Write-Host '[FAIL] Artifact screening ID mismatch detected'
    $assocPass = $false
}

# ------------------------------------------------------------
# STEP 6 — REPORT
# ------------------------------------------------------------
Write-Host "`n>>> STEP 6 — REPORT"
$reportUrl = "$baseUrl/api/reports/$existingId/html"
try {
    $repRes = Invoke-WebRequest -Uri $reportUrl -Method Get
    Write-Host "[PASS] GET /api/reports/:id/html Status:" $repRes.StatusCode
    Write-Host "Content-Type:" $repRes.Headers["Content-Type"]
    Write-Host "Length:" $repRes.Content.Length "bytes"
    $reportPass = $true
} catch {
    Write-Host "[FAIL] Report request failed:" $_.Exception.Message
    $reportPass = $false
}

# ------------------------------------------------------------
# STEP 7 — NEW SCREENING API FLOW (Real Production Sequence)
# ------------------------------------------------------------
Write-Host "`n>>> STEP 7 — NEW SCREENING API FLOW"

# 7a. Upload image
Write-Host "Uploading image: $sampleImagePath ..."
$boundary = [System.Guid]::NewGuid().ToString()
$fileBytes = [System.IO.File]::ReadAllBytes($sampleImagePath)
$fileName = [System.IO.Path]::GetFileName($sampleImagePath)

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"",
    "Content-Type: image/jpeg",
    "",
    [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
    "--$boundary--"
)
$multipartBody = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes(($bodyLines -join "`r`n"))

$uploadRes = Invoke-RestMethod -Uri "$baseUrl/api/screenings/upload" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "multipart/form-data; boundary=$boundary" } `
    -Body $multipartBody

Write-Host "Upload response:" ($uploadRes | ConvertTo-Json -Compress)
$uploadedUrl = $uploadRes.storageUrl

# 7b. Create screening
Write-Host "`nCreating screening record for patient $($testPatient.id) with eye 'right'..."
$createBody = @{
    patientId = $testPatient.id
    eye = "right"
    facilityId = $loginRes.user.facility.id
    notes = "Real automated ASHA smoke test"
    imageStorageUrl = $uploadedUrl
    originalFilename = $fileName
    deviceId = "TOPCON-NW400"
} | ConvertTo-Json

$createdScr = (Invoke-RestMethod -Uri "$baseUrl/api/screenings" -Method Post -Headers $headers -Body $createBody -ContentType 'application/json').screening
$newScreeningId = $createdScr.id
Write-Host "Created Screening ID: $newScreeningId"
Write-Host "Initial Status: $($createdScr.status)"

# 7c. Trigger Analyze
Write-Host "`nTriggering real production inference: POST /api/screenings/$newScreeningId/analyze ..."
$startTime = Get-Date
try {
    $analyzeRes = Invoke-RestMethod -Uri "$baseUrl/api/screenings/$newScreeningId/analyze" -Method Post -Headers $headers -Body "{}" -ContentType 'application/json' -TimeoutSec 60
    $duration = ((Get-Date) - $startTime).TotalSeconds
    $roundedSec = [math]::Round($duration, 2)
    Write-Host "Inference returned in $roundedSec seconds"
    Write-Host "Message:" $analyzeRes.message
    $newScrData = $analyzeRes.screening
    $inferencePass = $true
    $newScreeningPass = $true
} catch {
    Write-Host "[FAIL] Real inference call failed:" $_.Exception.Message
    $inferencePass = $false
    $newScreeningPass = $false
}

# 7d. Fetch Detail
Write-Host "`nFetching final verified screening record: GET /api/screenings/$newScreeningId ..."
$finalScr = (Invoke-RestMethod -Uri "$baseUrl/api/screenings/$newScreeningId" -Method Get -Headers $headers).screening

# ------------------------------------------------------------
# STEP 8 — RECORD EXACT RESULT
# ------------------------------------------------------------
Write-Host "`n>>> STEP 8 — RECORD EXACT RESULT"
Write-Host "Image: $($fileName)"
Write-Host "Screening ID: $($finalScr.id)"
Write-Host "IQA: Overall Score = $($finalScr.quality.overall_score), Usable = $($finalScr.quality.usable)"
Write-Host "Grade: $($finalScr.classification.dr_grade) - $($finalScr.classification.dr_stage)"
Write-Host "Calibrated risk: $($finalScr.classification.calibrated_confidence)% (Risk Level: $($finalScr.risk_level))"
Write-Host "Decision: $($finalScr.final_decision)"
Write-Host "Grad-CAM: $($finalScr.explainability.gradcam_url)"
Write-Host "Vessel evidence: $($finalScr.vessels | ConvertTo-Json -Compress)"
Write-Host "Lesion evidence: $($finalScr.lesions | ConvertTo-Json -Compress)"

# ------------------------------------------------------------
# STEP 9 — FAILURE TEST
# ------------------------------------------------------------
Write-Host "`n>>> STEP 9 — FAILURE TEST"
Write-Host "Testing non-existent screening ID analyze request..."
try {
    $bogusId = "00000000-0000-0000-0000-000000000000"
    $failRes = Invoke-RestMethod -Uri "$baseUrl/api/screenings/$bogusId/analyze" -Method Post -Headers $headers -Body "{}" -ContentType "application/json";
    Write-Host '[FAIL] Unexpected success for invalid ID'
    $failureSafetyPass = $false
} catch {
    $errMsg = $_.Exception.Message
    Write-Host "[PASS] Correctly rejected invalid request with error: $errMsg"
    $failureSafetyPass = $true
}

# ------------------------------------------------------------
# STEP 10 — SUMMARY OUTPUT
# ------------------------------------------------------------
Write-Host "`n============================================================"
Write-Host "SMOKE TEST SUMMARY"
Write-Host "============================================================"
Write-Host "AUTH:                  $(if ($authPass) {'PASS'} else {'FAIL'})"
Write-Host "PATIENT API:           $(if ($patientPass) {'PASS'} else {'FAIL'})"
Write-Host "HISTORY API:           $(if ($historyPass) {'PASS'} else {'FAIL'})"
Write-Host "SCREENING DETAIL:      $(if ($detailPass) {'PASS'} else {'FAIL'})"
Write-Host "REPORT:                $(if ($reportPass) {'PASS'} else {'FAIL'})"
Write-Host "NEW SCREENING:         $(if ($newScreeningPass) {'PASS'} else {'FAIL'})"
Write-Host "REAL AI INFERENCE:     $(if ($inferencePass) {'PASS'} else {'FAIL'})"
Write-Host "IMAGE ASSOCIATION:     $(if ($assocPass) {'PASS'} else {'FAIL'})"
Write-Host "FAILURE SAFETY:        $(if ($failureSafetyPass) {'PASS'} else {'FAIL'})"
Write-Host "============================================================"
