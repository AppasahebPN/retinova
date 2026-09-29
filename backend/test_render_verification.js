// ============================================================
// RETINOVA — Render Pre-Deployment Comprehensive Verification
// Verifies all 16 deployment requirements from Section 21
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:5000';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path || '/', BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || raw,
          raw
        });
      });
    });

    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

// Multipart helper for upload testing
function multipartPost(uploadPath, filename, fileBuffer, mimeType, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(uploadPath, BASE_URL);

    const pre = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const post = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([pre, fileBuffer, post]);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ statusCode: res.statusCode, data: json || data });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runVerification() {
  console.log('============================================================');
  console.log('  RETINOVA RENDER DEPLOYMENT VERIFICATION (SECTION 21)');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} -> ${details}`);
      failed++;
    }
  }

  try {
    // 4. GET /health
    console.log('[Test 4] Verifying GET /health endpoint...');
    const healthRes = await request({ path: '/health', method: 'GET' });
    const healthOk = healthRes.statusCode === 200 &&
                     healthRes.data?.status === 'ok' &&
                     healthRes.data?.service === 'retinova-backend';
    const noSecretsInHealth = !healthRes.raw.includes('password') &&
                              !healthRes.raw.includes('secret') &&
                              !healthRes.raw.includes('AKIA');
    assert(healthOk && noSecretsInHealth, 'GET /health returns 200 with service: retinova-backend and no exposed secrets');

    // 5. Login
    console.log('\n[Test 5] Verifying multi-tenant Login...');
    const loginRes = await request({
      path: '/api/platform/auth/login',
      method: 'POST'
    }, {
      email: 'health.admin@nhm.gov.in',
      password: 'password'
    });
    const token = loginRes.data?.token;
    assert(loginRes.statusCode === 200 && !!token, 'Login returns 200 OK with valid JWT token');

    // 6. Authenticated API request
    console.log('\n[Test 6] Verifying Authenticated API request...');
    const meRes = await request({
      path: '/api/platform/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(meRes.statusCode === 200 && meRes.data?.user?.email === 'health.admin@nhm.gov.in', 'Authenticated request to /api/platform/auth/me returns 200 with user profile');

    // 7. Screening upload
    console.log('\n[Test 7] Verifying screening image upload...');
    const dummyImageBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');
    const uploadRes = await multipartPost('/api/screenings/upload', 'fundus_test.jpg', dummyImageBuffer, 'image/jpeg', token);
    const storageUrl = uploadRes.data?.storageUrl;
    assert(uploadRes.statusCode === 200 && !!storageUrl, 'Screening upload accepts image and returns storageUrl');

    // 8. Evidence retrieval
    console.log('\n[Test 8] Verifying uploaded evidence retrieval...');
    const evidenceRes = await request({ path: storageUrl, method: 'GET' });
    assert(evidenceRes.statusCode === 200, 'Uploaded evidence retrieved successfully via storageUrl (HTTP 200)');

    // 9. Sync
    console.log('\n[Test 9] Verifying offline detection sync endpoint...');
    const eventId = `EVT-TEST-${Date.now()}`;
    const deviceId = 'DEV-EDGE-001';
    const syncRes = await request({
      path: '/api/detections/sync',
      method: 'POST'
    }, {
      event_id: eventId,
      device_id: deviceId,
      detection_type: 'Diabetic Retinopathy Grade 2',
      confidence: 0.94,
      severity: 'HIGH',
      model_version: 'swinv2-tiny-edge-v1.0.4'
    });
    assert(syncRes.statusCode === 200 && syncRes.data?.status === 'SYNCED', 'Detection sync returns HTTP 200 SYNCED');

    // 10. Database connection handling
    console.log('\n[Test 10] Verifying database connection resilience...');
    const dbOverview = await request({ path: '/api/detections/overview', method: 'GET' });
    assert(dbOverview.statusCode === 200 && typeof dbOverview.data?.totalDevices === 'number', 'Database connection / DataStore engine provides live telemetry KPIs');

    // 11. Tenant isolation
    console.log('\n[Test 11] Verifying strict cross-tenant isolation...');
    const crossTenantRes = await request({
      path: '/api/platform/organizations/org_apex_insurance',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(crossTenantRes.statusCode === 403, 'Cross-tenant request blocked with HTTP 403 Forbidden');

    // 12. RBAC (Role-Based Access Control)
    console.log('\n[Test 12] Verifying RBAC permission enforcement...');
    const operatorLogin = await request({
      path: '/api/platform/auth/login',
      method: 'POST'
    }, {
      email: 'screener@nhm.gov.in',
      password: 'password'
    });
    const opToken = operatorLogin.data?.token;
    const rbacViolation = await request({
      path: '/api/platform/organizations',
      method: 'POST',
      headers: { Authorization: `Bearer ${opToken}` }
    }, {
      organization_name: 'Illegal New Tenant'
    });
    assert(rbacViolation.statusCode === 403, 'Operator role denied administrative actions with HTTP 403 Forbidden');

    // 13. Invalid JWT
    console.log('\n[Test 13] Verifying invalid JWT rejection...');
    const invalidJwtRes = await request({
      path: '/api/platform/auth/me',
      method: 'GET',
      headers: { Authorization: 'Bearer this.is.a.forged.jwt.token' }
    });
    assert(invalidJwtRes.statusCode === 401, 'Tampered/invalid JWT rejected with HTTP 401 Unauthorized');

    // 14. Duplicate sync (Idempotent)
    console.log('\n[Test 14] Verifying idempotent duplicate sync...');
    const dupSyncRes = await request({
      path: '/api/detections/sync',
      method: 'POST'
    }, {
      event_id: eventId, // same event ID as Test 9
      device_id: deviceId,
      detection_type: 'Diabetic Retinopathy Grade 2'
    });
    assert(
      dupSyncRes.statusCode === 200 &&
      dupSyncRes.data?.sync_timestamp === syncRes.data?.sync_timestamp,
      'Duplicate sync detects existing event_id and returns same record idempotently without creating duplicate'
    );

    // 15. Large / invalid upload
    console.log('\n[Test 15] Verifying invalid file upload rejection...');
    const invalidFileBuffer = Buffer.from('This is a text script, not an image.');
    const invalidUpload = await multipartPost('/api/screenings/upload', 'script.sh', invalidFileBuffer, 'text/plain', token);
    assert(invalidUpload.statusCode >= 400, 'Non-image upload rejected with error code (HTTP ' + invalidUpload.statusCode + ')');

    // 16. CORS verification
    console.log('\n[Test 16] Verifying CORS configuration for Android and Web...');
    const corsPreflight = await request({
      path: '/api/detections/sync',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://retinova-backend.onrender.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert(corsPreflight.statusCode === 200 || corsPreflight.statusCode === 204, 'CORS preflight responds successfully for allowed origins');

    // Mobile app without Origin header
    const mobileNoOrigin = await request({
      path: '/health',
      method: 'GET'
    });
    assert(mobileNoOrigin.statusCode === 200, 'Mobile APK request without Origin header allowed');

    console.log('\n============================================================');
    console.log(`  VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('Fatal error during verification:', err);
    process.exit(1);
  }
}

runVerification();
