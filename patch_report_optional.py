import re

file_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_extract = """    // Patient Demographics
    const patient = screening.patient;
    const patientCode = patient?.patient_code || 'Not provided';
    const patientName = patient?.name || 'Not provided';
    const patientAge = (patient?.age !== undefined && patient.age !== null) ? `${patient.age} Yrs` : 'Not provided';
    const patientSex = patient?.gender || 'Not provided';
    const screeningCentre = screening.facility?.name || 'Not provided';
    const cameraDevice = screening.image?.device_id || 'Not provided';
    const technician = (screening as any).technician_name || (screening as any).technician || (screening as any).operator || 'Not provided';
    const encounterNotes = screening.notes || 'Not provided';

    const screeningDate = new Date(screening.created_at || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const screeningIdDisplay = screening.id ? screening.id.slice(0, 8).toUpperCase() : 'UNASSIGNED';

    // Eye Resolution
    const eyeRaw = (screening.eye || '').trim().toLowerCase();
    let eyeImagedLabel = 'Not provided';
    if (eyeRaw === 'left') {
      eyeImagedLabel = 'Left Eye (OS)';
    } else if (eyeRaw === 'right') {
      eyeImagedLabel = 'Right Eye (OD)';
    } else if (eyeRaw) {
      eyeImagedLabel = eyeRaw.toUpperCase();
    }"""

new_extract = """    // Patient Demographics
    const patient = screening.patient;
    const patientCode = patient?.patient_code || '';
    const patientName = patient?.name || '';
    const patientAge = (patient?.age !== undefined && patient.age !== null && String(patient.age).trim() !== '') ? `${patient.age} Yrs` : '';
    const patientSex = patient?.gender || '';
    const screeningCentre = screening.facility?.name || '';
    const cameraDevice = screening.image?.device_id || '';
    const technician = (screening as any).technician_name || (screening as any).technician || (screening as any).operator || '';
    const encounterNotes = screening.notes || '';

    const screeningDate = new Date(screening.created_at || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const screeningIdDisplay = screening.id ? screening.id.slice(0, 8).toUpperCase() : 'UNASSIGNED';

    // Eye Resolution
    const eyeRaw = (screening.eye || '').trim().toLowerCase();
    let eyeImagedLabel = '';
    if (eyeRaw === 'left') {
      eyeImagedLabel = 'Left Eye (OS)';
    } else if (eyeRaw === 'right') {
      eyeImagedLabel = 'Right Eye (OD)';
    } else if (eyeRaw) {
      eyeImagedLabel = eyeRaw.toUpperCase();
    }"""

old_html = """  <!-- SECTION 1: PATIENT & ENCOUNTER INFORMATION -->
  <div class="content-box avoid-break">
    <div class="section-title">Patient & Encounter Information</div>
    <div class="grid-meta">
      <div class="meta-item">
        <span class="meta-label">Patient ID</span>
        <span class="meta-value">${patientCode}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Patient Name</span>
        <span class="meta-value">${patientName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Age</span>
        <span class="meta-value">${patientAge}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Sex</span>
        <span class="meta-value">${patientSex}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Eye Imaged</span>
        <span class="meta-value">${eyeImagedLabel}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Screening Centre</span>
        <span class="meta-value">${screeningCentre}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Screening Operator</span>
        <span class="meta-value">${technician}</span>
      </div>
      ${cameraDevice !== 'Not provided' ? `
      <div class="meta-item">
        <span class="meta-label">Device</span>
        <span class="meta-value">${cameraDevice}</span>
      </div>
      ` : ''}
      <div class="meta-item">
        <span class="meta-label">Screening Date</span>
        <span class="meta-value">${screeningDate}</span>
      </div>
      ${encounterNotes !== 'Not provided' ? `
      <div class="meta-item" style="grid-column: 1 / -1;">
        <span class="meta-label">Notes</span>
        <span class="meta-value">${encounterNotes}</span>
      </div>
      ` : ''}
    </div>
  </div>"""

new_html = """  <!-- SECTION 1: PATIENT & ENCOUNTER INFORMATION -->
  <div class="content-box avoid-break">
    <div class="section-title">Patient & Encounter Information</div>
    <div class="grid-meta">
      ${patientCode ? `
      <div class="meta-item">
        <span class="meta-label">Patient ID</span>
        <span class="meta-value">${patientCode}</span>
      </div>` : ''}
      ${patientName ? `
      <div class="meta-item">
        <span class="meta-label">Patient Name</span>
        <span class="meta-value">${patientName}</span>
      </div>` : ''}
      ${patientAge ? `
      <div class="meta-item">
        <span class="meta-label">Age</span>
        <span class="meta-value">${patientAge}</span>
      </div>` : ''}
      ${patientSex ? `
      <div class="meta-item">
        <span class="meta-label">Sex</span>
        <span class="meta-value">${patientSex}</span>
      </div>` : ''}
      ${eyeImagedLabel ? `
      <div class="meta-item">
        <span class="meta-label">Eye Imaged</span>
        <span class="meta-value">${eyeImagedLabel}</span>
      </div>` : ''}
      ${screeningCentre ? `
      <div class="meta-item">
        <span class="meta-label">Screening Centre</span>
        <span class="meta-value">${screeningCentre}</span>
      </div>` : ''}
      ${technician ? `
      <div class="meta-item">
        <span class="meta-label">Screening Operator</span>
        <span class="meta-value">${technician}</span>
      </div>` : ''}
      ${cameraDevice ? `
      <div class="meta-item">
        <span class="meta-label">Device</span>
        <span class="meta-value">${cameraDevice}</span>
      </div>` : ''}
      <div class="meta-item">
        <span class="meta-label">Screening Date</span>
        <span class="meta-value">${screeningDate}</span>
      </div>
      ${encounterNotes ? `
      <div class="meta-item" style="grid-column: 1 / -1;">
        <span class="meta-label">Notes</span>
        <span class="meta-value">${encounterNotes}</span>
      </div>` : ''}
    </div>
  </div>"""

if old_extract in content:
    content = content.replace(old_extract, new_extract)
    print("SUCCESS: Replaced extraction")
else:
    print("WARNING: old_extract not found")

if old_html in content:
    content = content.replace(old_html, new_html)
    print("SUCCESS: Replaced HTML")
else:
    print("WARNING: old_html not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done saving reportService.ts")
