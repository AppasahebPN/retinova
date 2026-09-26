import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseStore } from './store';
import { initializeSampleImages } from '../utils/imageGenerator';
import { config } from '../config';

export function seedDatabase(force = false) {
  const store = DatabaseStore.getInstance();
  const existingUsers = store.getUsers();

  if (existingUsers.length > 0 && !force) {
    return;
  }

  store.reset();
  initializeSampleImages(config.storagePath);

  // 1. Facilities (Rural Primary Healthcare Centres)
  const f1Id = uuidv4();
  const f2Id = uuidv4();
  const f3Id = uuidv4();

  const facilities = [
    {
      id: f1Id,
      name: 'Primary Health Centre',
      district: 'District-Central',
      state: 'Maharashtra',
      type: 'Primary Health Centre',
      latitude: 19.1383,
      longitude: 77.3210,
      active_cameras: 2,
      contact_phone: '+91 2462 234891',
      created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-10T08:00:00Z').toISOString()
    },
    {
      id: f2Id,
      name: 'Community Health Centre',
      district: 'District-South',
      state: 'Maharashtra',
      type: 'Community Health Centre',
      latitude: 18.4088,
      longitude: 76.5604,
      active_cameras: 3,
      contact_phone: '+91 2382 245678',
      created_at: new Date('2026-01-12T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-12T08:00:00Z').toISOString()
    },
    {
      id: f3Id,
      name: 'Mobile Eye Screening Unit',
      district: 'District-West',
      state: 'Maharashtra',
      type: 'Mobile Screening Unit',
      latitude: 18.1856,
      longitude: 76.0416,
      active_cameras: 1,
      contact_phone: '+91 2472 222134',
      created_at: new Date('2026-01-15T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-15T08:00:00Z').toISOString()
    }
  ];

  facilities.forEach(f => store.addFacility(f));

  // 2. Users (Admin, Healthcare Worker, Doctor, District Manager)
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('demo1234', salt);

  const uAdminId = uuidv4();
  const uHcwId = uuidv4();
  const uDocId = uuidv4();
  const uMgrId = uuidv4();

  const users = [
    {
      id: uAdminId,
      email: 'admin@netra-ai.org',
      password_hash: passwordHash,
      full_name: 'Lead System Administrator',
      role: 'admin' as const,
      facility_id: f1Id,
      phone: '+91 98230 11223',
      is_active: true,
      created_at: new Date('2026-01-10T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-10T08:00:00Z').toISOString()
    },
    {
      id: uHcwId,
      email: 'asha.worker@netra-ai.org',
      password_hash: passwordHash,
      full_name: 'Primary Health Screener / ASHA',
      role: 'healthcare_worker' as const,
      facility_id: f1Id,
      phone: '+91 97654 44321',
      is_active: true,
      created_at: new Date('2026-01-11T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-11T08:00:00Z').toISOString()
    },
    {
      id: uDocId,
      email: 'doctor@netra-ai.org',
      password_hash: passwordHash,
      full_name: 'District Reviewing Ophthalmologist',
      role: 'doctor' as const,
      facility_id: f2Id,
      phone: '+91 94221 88990',
      is_active: true,
      created_at: new Date('2026-01-11T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-11T08:00:00Z').toISOString()
    },
    {
      id: uMgrId,
      email: 'manager@netra-ai.org',
      password_hash: passwordHash,
      full_name: 'District Health Officer',
      role: 'district_manager' as const,
      facility_id: f1Id,
      phone: '+91 99220 55667',
      is_active: true,
      created_at: new Date('2026-01-11T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-11T08:00:00Z').toISOString()
    }
  ];

  users.forEach(u => store.addUser(u));

  // 3. Capacity Planning Run (Module 6 SimEvents Results)
  const sim1Id = uuidv4();
  const sim1Params = {
    title: 'District Operational Capacity Benchmark',
    facilityId: f1Id,
    patientArrivalRate: 120,
    cameras: 2,
    imageAcquisitionTime: 3.0,
    qualityRejectionRate: 0.22,
    aiProcessingTime: 1.5,
    aiResources: 1,
    doctorReviewTime: 6.0,
    doctors: 2,
    workingHours: 8,
    simulationDuration: 30,
    connectivityBandwidthMbps: 4.0
  };

  const sim1Result = {
    id: uuidv4(),
    simulationRunId: sim1Id,
    totalPatients: 3600,
    patientsProcessed: 3340,
    patientsWaiting: 260,
    throughput: 111.3,
    averageWaitingTime: 28.5,
    maxWaitingTime: 64.0,
    cameraUtilization: 78.4,
    aiUtilization: 34.2,
    doctorUtilization: 89.6,
    rejectedImages: 792,
    referralLoad: 1135,
    bottleneck: 'Doctor Review' as const,
    additionalResources: {
      recommendedCameras: 0,
      recommendedAiWorkers: 0,
      recommendedDoctors: 1,
      bandwidthSuggestionMbps: 4.0,
      notes: 'Doctor review queue reaches 89.6% capacity during peak hours. Adding 1 visiting ophthalmologist will reduce patient waiting time to under 12 min.'
    },
    dailyThroughputSeries: Array.from({ length: 30 }).map((_, d) => ({
      day: d + 1,
      arrived: 110 + Math.floor(Math.sin(d) * 15) + Math.floor(Math.random() * 8),
      screened: 105 + Math.floor(Math.sin(d) * 12) + Math.floor(Math.random() * 6),
      referred: 35 + Math.floor(Math.random() * 8),
      avgWaitMin: 24 + Math.floor(Math.random() * 9)
    })),
    queueDepthSeries: [
      { timeHour: 9, cameraQueue: 3, aiQueue: 1, doctorQueue: 2 },
      { timeHour: 10, cameraQueue: 7, aiQueue: 2, doctorQueue: 8 },
      { timeHour: 11, cameraQueue: 12, aiQueue: 3, doctorQueue: 16 },
      { timeHour: 12, cameraQueue: 9, aiQueue: 2, doctorQueue: 18 },
      { timeHour: 13, cameraQueue: 4, aiQueue: 1, doctorQueue: 12 },
      { timeHour: 14, cameraQueue: 6, aiQueue: 2, doctorQueue: 10 },
      { timeHour: 15, cameraQueue: 8, aiQueue: 2, doctorQueue: 9 },
      { timeHour: 16, cameraQueue: 2, aiQueue: 0, doctorQueue: 3 }
    ]
  };

  store.addSimulationRun({
    id: sim1Id,
    facility_id: f1Id,
    title: sim1Params.title,
    parameters: sim1Params,
    status: 'completed',
    created_by: uMgrId,
    created_at: new Date('2026-02-10T10:00:00Z').toISOString(),
    completed_at: new Date('2026-02-10T10:00:05Z').toISOString(),
    result: sim1Result
  });
}
