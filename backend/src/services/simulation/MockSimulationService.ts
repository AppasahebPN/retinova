import { v4 as uuidv4 } from 'uuid';
import { ISimulationService } from './ISimulationService';
import { SimulationParameters, SimulationResultData, ModuleStatus } from '../../types';

export class MockSimulationService implements ISimulationService {
  public async runSimulation(params: SimulationParameters): Promise<SimulationResultData> {
    await new Promise(r => setTimeout(r, 450));

    const totalDays = Math.max(1, params.simulationDuration || 30);
    const dailyArrival = Math.max(10, params.patientArrivalRate || 100);
    const totalPatients = dailyArrival * totalDays;

    const workingMinutesPerDay = (params.workingHours || 8) * 60;
    const cameras = Math.max(1, params.cameras || 1);
    const acqTime = Math.max(1, params.imageAcquisitionTime || 2.5);
    const rejectionRate = Math.min(0.9, Math.max(0.0, params.qualityRejectionRate || 0.25));
    const aiSec = Math.max(0.2, params.aiProcessingTime || 1.2);
    const aiWorkers = Math.max(1, params.aiResources || 1);
    const docTime = Math.max(1, params.doctorReviewTime || 5.0);
    const doctors = Math.max(1, params.doctors || 2);

    const effectiveAcqTimePerPatient = acqTime * (1 + rejectionRate * 0.85);

    const maxCameraCapacityDaily = (workingMinutesPerDay * cameras) / effectiveAcqTimePerPatient;
    const maxAiCapacityDaily = (workingMinutesPerDay * 60 * aiWorkers) / aiSec;
    
    const referralRatio = 0.35;
    const maxDoctorCapacityDaily = (workingMinutesPerDay * doctors) / (docTime * referralRatio);

    const effectiveDailyThroughput = Math.min(
      dailyArrival,
      maxCameraCapacityDaily,
      maxDoctorCapacityDaily
    );

    const actualDailyThroughput = Number(effectiveDailyThroughput.toFixed(1));
    const patientsProcessed = Math.min(totalPatients, Math.floor(actualDailyThroughput * totalDays));
    const patientsWaiting = Math.max(0, totalPatients - patientsProcessed);

    const cameraUtilization = Math.min(99.5, Number(((dailyArrival / maxCameraCapacityDaily) * 100).toFixed(1)));
    const aiUtilization = Math.min(99.5, Number(((dailyArrival / maxAiCapacityDaily) * 100).toFixed(1)));
    const doctorUtilization = Math.min(99.5, Number((((dailyArrival * referralRatio) / ((workingMinutesPerDay * doctors) / docTime)) * 100).toFixed(1)));

    let bottleneck: 'Camera Acquisition' | 'AI Inference Server' | 'Doctor Review' | 'Network Bandwidth' | 'None (Optimal)' = 'None (Optimal)';
    if (cameraUtilization >= 85 && cameraUtilization >= doctorUtilization && cameraUtilization >= aiUtilization) {
      bottleneck = 'Camera Acquisition';
    } else if (doctorUtilization >= 85 && doctorUtilization >= cameraUtilization) {
      bottleneck = 'Doctor Review';
    } else if (aiUtilization >= 85) {
      bottleneck = 'AI Inference Server';
    } else if (cameraUtilization < 70 && doctorUtilization < 70) {
      bottleneck = 'None (Optimal)';
    } else {
      bottleneck = doctorUtilization > cameraUtilization ? 'Doctor Review' : 'Camera Acquisition';
    }

    let avgWaitMin = 6.0;
    if (cameraUtilization > 80) avgWaitMin += (cameraUtilization - 80) * 1.4;
    if (doctorUtilization > 80) avgWaitMin += (doctorUtilization - 80) * 1.8;
    avgWaitMin = Number(avgWaitMin.toFixed(1));

    const maxWaitMin = Number((avgWaitMin * 2.3 + 8).toFixed(1));
    const totalRejectedImages = Math.round(patientsProcessed * rejectionRate);
    const totalReferrals = Math.round(patientsProcessed * referralRatio);

    let recCameras = 0;
    let recAiWorkers = 0;
    let recDoctors = 0;
    let notes = '';

    if (cameraUtilization > 80) {
      recCameras = Math.ceil((cameraUtilization - 75) / 45);
    }
    if (doctorUtilization > 80) {
      recDoctors = Math.ceil((doctorUtilization - 75) / 40);
    }
    if (aiUtilization > 80) {
      recAiWorkers = 1;
    }

    if (recCameras > 0 && recDoctors > 0) {
      notes = `High operational load across both acquisition and specialist review. Adding ${recCameras} fundus camera(s) and ${recDoctors} doctor(s) will reduce waiting times by ~65%.`;
    } else if (recCameras > 0) {
      notes = `Camera acquisition is the primary bottleneck (${cameraUtilization}% utilization). Adding ${recCameras} camera(s) will streamline patient throughput.`;
    } else if (recDoctors > 0) {
      notes = `Doctor review stage is saturated (${doctorUtilization}% utilization). Adding ${recDoctors} ophthalmologist(s) or telemedicine review shifts will eliminate patient backlog.`;
    } else {
      notes = `Operational workflow is well-balanced for current daily arrival load of ${dailyArrival} patients/day.`;
    }

    const dailySeries = Array.from({ length: totalDays }).map((_, d) => {
      const noise = (Math.sin(d * 0.8) * 0.1) + ((Math.random() - 0.5) * 0.08);
      const dayArrival = Math.round(dailyArrival * (1 + noise));
      const dayScreened = Math.round(Math.min(dayArrival, actualDailyThroughput * (1 + noise * 0.7)));
      const dayReferred = Math.round(dayScreened * referralRatio);
      return {
        day: d + 1,
        arrived: dayArrival,
        screened: dayScreened,
        referred: dayReferred,
        avgWaitMin: Number((avgWaitMin * (1 + noise * 0.5)).toFixed(1))
      };
    });

    const queueDepths = [
      { timeHour: 9, cameraQueue: Math.round(cameras * 1.5), aiQueue: 1, doctorQueue: Math.round(doctors * 0.8) },
      { timeHour: 10, cameraQueue: Math.round(cameras * 3.2), aiQueue: 2, doctorQueue: Math.round(doctors * 2.5) },
      { timeHour: 11, cameraQueue: Math.round(cameras * 4.8), aiQueue: 3, doctorQueue: Math.round(doctors * 4.2) },
      { timeHour: 12, cameraQueue: Math.round(cameras * 4.2), aiQueue: 2, doctorQueue: Math.round(doctors * 5.0) },
      { timeHour: 13, cameraQueue: Math.round(cameras * 2.0), aiQueue: 1, doctorQueue: Math.round(doctors * 3.5) },
      { timeHour: 14, cameraQueue: Math.round(cameras * 3.0), aiQueue: 2, doctorQueue: Math.round(doctors * 3.0) },
      { timeHour: 15, cameraQueue: Math.round(cameras * 3.8), aiQueue: 2, doctorQueue: Math.round(doctors * 2.8) },
      { timeHour: 16, cameraQueue: Math.round(cameras * 1.2), aiQueue: 0, doctorQueue: Math.round(doctors * 1.0) }
    ];

    return {
      id: uuidv4(),
      simulationRunId: uuidv4(),
      totalPatients,
      patientsProcessed,
      patientsWaiting,
      throughput: actualDailyThroughput,
      averageWaitingTime: avgWaitMin,
      maxWaitingTime: maxWaitMin,
      cameraUtilization,
      aiUtilization,
      doctorUtilization,
      rejectedImages: totalRejectedImages,
      referralLoad: totalReferrals,
      bottleneck,
      additionalResources: {
        recommendedCameras: recCameras,
        recommendedAiWorkers: recAiWorkers,
        recommendedDoctors: recDoctors,
        bandwidthSuggestionMbps: params.connectivityBandwidthMbps || 4.0,
        notes
      },
      dailyThroughputSeries: dailySeries,
      queueDepthSeries: queueDepths
    };
  }

  public async getStatus(): Promise<ModuleStatus> {
    return {
      name: 'MATLAB Simulink / SimEvents Operational Simulation Engine',
      code: 'SIMEVENTS-CAPACITY-PLANNER',
      category: 'simulation',
      status: 'connected',
      version: 'v2024b-SimEvents',
      latencyMs: 120,
      lastChecked: new Date().toISOString(),
      modelArchitecture: 'SimEvents Discrete-Event Network Queuing Model (M/M/c Engine)',
      benchmarkAccuracy: 'Validated District Screening Queue Dynamics',
      description: 'Simulates district screening throughput, camera bottlenecks, and ophthalmologist review queues.',
      endpoints: ['POST /api/simulation/run', 'GET /api/simulation/runs']
    };
  }
}
