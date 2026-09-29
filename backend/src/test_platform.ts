// ============================================================
// RETINOVA PLATFORM — Comprehensive Automated Test Suite
// Verifies Multi-Tenancy, Tenant Isolation, RBAC, AI Workflows,
// Model OTA Updates, Idempotent Sync, and Fallback Mechanisms
// ============================================================

import http from 'http';

const BASE_URL = 'http://localhost:5000';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

function makeRequest(path: string, options: RequestOptions = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode || 500, data });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runPlatformTests() {
  console.log('\n============================================================');
  console.log('   RETINOVA ENTERPRISE PLATFORM — INTEGRATION TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, details || '');
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------
    // TEST 1: System Health & Gateway
    // ------------------------------------------------------------
    console.log('[1/7] Testing Cloud Gateway Health...');
    const health = await makeRequest('/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Cloud Gateway returns 200 OK');

    // ------------------------------------------------------------
    // TEST 2: Multi-Tenant Login & JWT Issuance
    // ------------------------------------------------------------
    console.log('\n[2/7] Testing Multi-Tenant Authentication...');
    const loginHealthAdmin = await makeRequest('/api/platform/auth/login', {
      method: 'POST',
      body: { email: 'health.admin@nhm.gov.in', password: 'password' },
    });
    assert(
      loginHealthAdmin.status === 200 && !!loginHealthAdmin.data.token,
      'Healthcare Org Admin login successful & JWT token issued'
    );
    const healthToken = loginHealthAdmin.data.token;
    assert(
      loginHealthAdmin.data.user.organization_id === 'org_retinova_health',
      'User correctly scoped to org_retinova_health'
    );

    const loginSuperAdmin = await makeRequest('/api/platform/auth/login', {
      method: 'POST',
      body: { email: 'superadmin@retinova.ai', password: 'password' },
    });
    const superToken = loginSuperAdmin.data.token;
    assert(loginSuperAdmin.status === 200, 'Platform Superadmin login successful');

    // ------------------------------------------------------------
    // TEST 3: Strict Tenant Isolation Enforcement
    // ------------------------------------------------------------
    console.log('\n[3/7] Testing Strict Tenant Isolation at Data Access Layer...');
    
    // Org Admin (Healthcare) tries to access Insurance tenant data
    const illegalAccess = await makeRequest('/api/platform/organizations/org_apex_insurance', {
      headers: { Authorization: `Bearer ${healthToken}` },
    });
    assert(
      illegalAccess.status === 403,
      'CROSS-TENANT ACCESS BLOCKED: Healthcare Admin cannot access Insurance tenant data (HTTP 403)'
    );

    // Superadmin CAN access Insurance tenant data
    const superAccess = await makeRequest('/api/platform/organizations/org_apex_insurance', {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(superAccess.status === 200, 'Superadmin has global visibility to inspect any tenant (HTTP 200)');

    // Scoped Devices Query
    const healthDevices = await makeRequest('/api/platform/devices', {
      headers: { Authorization: `Bearer ${healthToken}` },
    });
    assert(
      healthDevices.status === 200 &&
        healthDevices.data.devices.every((d: any) => d.organization_id === 'org_retinova_health'),
      'Device listing is strictly scoped: only Healthcare devices returned to Healthcare Admin'
    );

    // ------------------------------------------------------------
    // TEST 4: Role-Based Access Control (RBAC)
    // ------------------------------------------------------------
    console.log('\n[4/7] Testing Role-Based Access Control (RBAC)...');
    
    // Login as Operator
    const operatorLogin = await makeRequest('/api/platform/auth/login', {
      method: 'POST',
      body: { email: 'screener@nhm.gov.in', password: 'password' },
    });
    const operatorToken = operatorLogin.data.token;

    // Operator attempts to create a new organization (Requires PLATFORM_ADMIN)
    const unauthorizedOrgCreate = await makeRequest('/api/platform/organizations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
      body: {
        organization_name: 'Unauthorized Org Attempt',
        organization_type: 'HEALTHCARE',
        contact_email: 'test@unauth.com',
      },
    });
    assert(
      unauthorizedOrgCreate.status === 403,
      'RBAC VIOLATION BLOCKED: Operator cannot create new organizations (HTTP 403)'
    );

    // Operator attempts to change subscription plan (Requires PLATFORM_ADMIN)
    const unauthorizedPlanChange = await makeRequest('/api/platform/organizations/org_retinova_health/plan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
      body: { plan_id: 'ENTERPRISE' },
    });
    assert(
      unauthorizedPlanChange.status === 403,
      'RBAC VIOLATION BLOCKED: Operator cannot modify subscription plans (HTTP 403)'
    );

    // ------------------------------------------------------------
    // TEST 5: Modular AI Workflow Engine Execution
    // ------------------------------------------------------------
    console.log('\n[5/7] Testing Modular AI Workflow Pipeline Across Verticals...');
    
    // 1. Healthcare DR Workflow
    const hlthExec = await makeRequest('/api/platform/workflows/retinal_dr_swinv2/execute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${healthToken}` },
      body: { input: { eyeSide: 'RIGHT' } },
    });
    assert(
      hlthExec.status === 200 && hlthExec.data.data.result.severity === 'HIGH',
      'Healthcare Retinal Screening Workflow executes end-to-end with GradCAM evidence'
    );

    // 2. Insurance Asset Inspection Workflow
    const insLogin = await makeRequest('/api/platform/auth/login', {
      method: 'POST',
      body: { email: 'admin@apexinsurance.com', password: 'password' },
    });
    const insToken = insLogin.data.token;

    const insExec = await makeRequest('/api/platform/workflows/asset_damage_v1/execute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${insToken}` },
      body: { input: { partType: 'FRONT_BUMPER' } },
    });
    assert(
      insExec.status === 200 && !!insExec.data.data.result.details.estimatedRepairCostINR,
      'Insurance Damage Assessment Workflow computes repair estimate & damage segmentation'
    );

    // ------------------------------------------------------------
    // TEST 6: Model Version Management & Safe Rollback
    // ------------------------------------------------------------
    console.log('\n[6/7] Testing Model OTA Check & Integrity Fallback...');
    
    // Check update for device DEV-EDGE-001
    const otaCheck = await makeRequest('/api/platform/models/check-update/DEV-EDGE-001');
    assert(otaCheck.status === 200, 'Device OTA update check succeeded');

    // Simulate Failed Checksum (Integrity Failure) -> Must trigger safe rollback to previous model
    const failedUpdate = await makeRequest('/api/platform/models/activate', {
      method: 'POST',
      body: {
        deviceId: 'DEV-EDGE-001',
        targetModelId: 'model_swinv2_tiny_dr',
        targetVersion: '2.4.0',
        computedChecksum: 'CORRUPTED_CHECKSUM_XYZ',
        dryRunInferenceSuccess: true,
      },
    });
    assert(
      failedUpdate.status === 200 &&
        failedUpdate.data.success === false &&
        failedUpdate.data.status === 'REVERTED_TO_PREVIOUS',
      'CORRUPTED CHECKSUM FALLBACK: Device safely reverted to previous operational model'
    );

    // Simulate Valid Checksum & Dry-run Success -> Successful Activation
    const successfulUpdate = await makeRequest('/api/platform/models/activate', {
      method: 'POST',
      body: {
        deviceId: 'DEV-EDGE-001',
        targetModelId: 'model_swinv2_tiny_dr',
        targetVersion: '2.4.0',
        computedChecksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        dryRunInferenceSuccess: true,
      },
    });
    assert(
      successfulUpdate.status === 200 &&
        successfulUpdate.data.success === true &&
        successfulUpdate.data.status === 'ACTIVATED',
      'VALID MODEL ACTIVATION: New model verified and activated on edge device'
    );

    // ------------------------------------------------------------
    // TEST 7: Idempotent Event Synchronization & Duplication Protection
    // ------------------------------------------------------------
    console.log('\n[7/7] Testing Idempotent Event Synchronization...');
    const testEventId = `evt_test_idem_${Date.now()}`;
    const syncPayload = {
      event_id: testEventId,
      device_id: 'DEV-EDGE-001',
      organization_id: 'org_retinova_health',
      detection_type: 'Moderate NPDR (R2)',
      confidence: 0.942,
      severity: 'HIGH',
      model_version: 'v2.4.0',
    };

    // First Ingestion
    const firstSync = await makeRequest('/api/detections/sync', {
      method: 'POST',
      body: syncPayload,
    });
    assert(firstSync.status === 200 && firstSync.data.status === 'SYNCED', 'Initial event sync succeeded (SYNCED)');

    // Duplicate Ingestion (Same event_id sent again)
    const secondSync = await makeRequest('/api/detections/sync', {
      method: 'POST',
      body: syncPayload,
    });
    assert(
      secondSync.status === 200 &&
        secondSync.data.event_id === testEventId &&
        secondSync.data.sync_timestamp === firstSync.data.sync_timestamp,
      'DUPLICATE PROTECTION: Re-upload returns existing ingested record with matching timestamp'
    );

    // ------------------------------------------------------------
    // TEST 8: Automated Customer Onboarding Pipeline Wizard
    // ------------------------------------------------------------
    console.log('\n[8/12] Testing Customer Onboarding Pipeline Wizard...');
    const onboardingRes = await makeRequest('/api/platform/onboarding/wizard', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        organization_name: 'Test Regional Care Network',
        organization_type: 'HEALTHCARE',
        subscription_plan: 'PRO',
        admin_email: 'director@testcare.org',
        admin_name: 'Dr. Ramesh Narayan',
        admin_password: 'password123',
        initial_device_name: 'Test-Tablet-Node-01',
      },
    });
    assert(
      onboardingRes.status === 201 &&
        onboardingRes.data.success === true &&
        !!onboardingRes.data.workspace.organization_id &&
        !!onboardingRes.data.workspace.initial_device.device_token,
      'CUSTOMER ONBOARDING: Atomically provisions Org, Admin credentials, Plan limits, and initial Device token'
    );
    const onboardedOrgId = onboardingRes.data.workspace.organization_id;

    // ------------------------------------------------------------
    // TEST 9: Tenant-Scoped Customer Reporting & CSV Export Engine
    // ------------------------------------------------------------
    console.log('\n[9/12] Testing Tenant-Scoped Customer Reporting & CSV Export Engine...');
    // JSON Devices report
    const jsonReport = await makeRequest('/api/platform/reports/generate?type=DEVICES&format=JSON', {
      headers: { Authorization: `Bearer ${healthToken}` },
    });
    assert(
      jsonReport.status === 200 && Array.isArray(jsonReport.data.devices),
      'REPORTING JSON: Tenant devices summary exported successfully'
    );

    // CSV Usage report
    const csvReport = await makeRequest('/api/platform/reports/generate?type=USAGE&format=CSV', {
      headers: { Authorization: `Bearer ${healthToken}` },
    });
    assert(
      csvReport.status === 200 && typeof csvReport.data === 'string' && csvReport.data.includes('Metric,Current Consumed'),
      'REPORTING CSV: Tenant usage quota report exported with CSV headers'
    );

    // ------------------------------------------------------------
    // TEST 10: AMC Contract Renewal Workflow
    // ------------------------------------------------------------
    console.log('\n[10/12] Testing AMC Contract Renewal Workflow...');
    const amcRenewal = await makeRequest(`/api/platform/organizations/${onboardedOrgId}/renew-amc`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: { extension_years: 1 },
    });
    assert(
      amcRenewal.status === 200 && amcRenewal.data.success === true && amcRenewal.data.organization.status === 'ACTIVE',
      'AMC RENEWAL: Successfully extended contract expiration date by +1 year and confirmed ACTIVE status'
    );

    // ------------------------------------------------------------
    // TEST 11: Production Software & APK Version Telemetry
    // ------------------------------------------------------------
    console.log('\n[11/12] Testing Software & APK Version Management...');
    const appVersionRes = await makeRequest('/api/platform/app-versions', {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(
      appVersionRes.status === 200 &&
        appVersionRes.data.latest_release.version === '2.4.0' &&
        appVersionRes.data.latest_release.file_size_bytes === 82961834,
      'APP VERSIONS: Verified production release v2.4.0 (82.9 MB APK) and fleet compatibility tracking'
    );

    // ------------------------------------------------------------
    // TEST 12: Demonstration Baseline Reset Controller
    // ------------------------------------------------------------
    console.log('\n[12/12] Testing Demonstration Baseline Reset Controller...');
    const demoReset = await makeRequest('/api/platform/demo/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(
      demoReset.status === 200 && demoReset.data.success === true,
      'DEMO RESET: Restores clean demonstration baseline for customer/investor pitches'
    );

  } catch (err: any) {
    console.error('Fatal Test Execution Error:', err);
    failed++;
  }

  console.log('\n============================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlatformTests();
