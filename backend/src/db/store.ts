import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  User, Facility, Patient, Screening, ImageRecord,
  ImageQualityResult, EnhancementResult, SegmentationResult,
  ClassificationResult, ExplainabilityResult, ReferralResult,
  ScreeningEvent, SimulationParameters, SimulationResultData, ModuleStatus
} from '../types';

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SimulationRun {
  id: string;
  facility_id?: string;
  title: string;
  parameters: SimulationParameters;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_by?: string;
  created_at: string;
  completed_at?: string;
  result?: SimulationResultData;
}

export interface DbData {
  users: User[];
  facilities: Facility[];
  patients: Patient[];
  screenings: Screening[];
  images: ImageRecord[];
  imageQuality: ImageQualityResult[];
  enhancements: EnhancementResult[];
  segmentations: SegmentationResult[];
  classifications: ClassificationResult[];
  explainability: ExplainabilityResult[];
  referrals: ReferralResult[];
  screeningEvents: ScreeningEvent[];
  simulationRuns: SimulationRun[];
  auditLogs: AuditLog[];
}

export class DatabaseStore {
  private static instance: DatabaseStore;
  private dbFilePath: string;
  private data: DbData;

  private constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'db.json');
    this.data = this.loadData();
  }

  public static getInstance(): DatabaseStore {
    if (!DatabaseStore.instance) {
      DatabaseStore.instance = new DatabaseStore();
    }
    return DatabaseStore.instance;
  }

  private getInitialData(): DbData {
    return {
      users: [],
      facilities: [],
      patients: [],
      screenings: [],
      images: [],
      imageQuality: [],
      enhancements: [],
      segmentations: [],
      classifications: [],
      explainability: [],
      referrals: [],
      screeningEvents: [],
      simulationRuns: [],
      auditLogs: []
    };
  }

  private loadData(): DbData {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read existing db.json, initializing fresh store', err);
    }
    return this.getInitialData();
  }

  private isBatching: boolean = false;

  public batch<T>(fn: () => T): T {
    this.isBatching = true;
    try {
      const result = fn();
      return result;
    } finally {
      this.isBatching = false;
      this.save();
    }
  }

  public save(): void {
    if (this.isBatching) return;
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  public reset(): void {
    this.data = this.getInitialData();
    this.save();
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Facilities ---
  public getFacilities(): Facility[] {
    return this.data.facilities;
  }

  public getFacilityById(id: string): Facility | undefined {
    return this.data.facilities.find(f => f.id === id);
  }

  public addFacility(facility: Facility): Facility {
    this.data.facilities.push(facility);
    this.save();
    return facility;
  }

  // --- Patients ---
  public getPatients(search?: string, facilityId?: string, limit = 50, offset = 0): { patients: Patient[]; total: number } {
    let list = [...this.data.patients];

    if (facilityId) {
      list = list.filter(p => p.facility_id === facilityId);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.patient_code.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
      );
    }

    // Sort latest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return { patients: paginated, total };
  }

  public getPatientById(id: string): Patient | undefined {
    return this.data.patients.find(p => p.id === id);
  }

  public getPatientByCode(code: string): Patient | undefined {
    return this.data.patients.find(p => p.patient_code.toLowerCase() === code.toLowerCase());
  }

  public addPatient(patient: Patient): Patient {
    this.data.patients.push(patient);
    this.save();
    return patient;
  }

  public updatePatient(id: string, updates: Partial<Patient>): Patient | undefined {
    const idx = this.data.patients.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.data.patients[idx] = {
      ...this.data.patients[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.patients[idx];
  }

  // --- Screenings ---
  public getScreenings(filters?: {
    patientId?: string;
    facilityId?: string;
    status?: string;
    grade?: number;
    referralStatus?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { screenings: Screening[]; total: number } {
    let list = [...this.data.screenings];

    if (filters?.patientId) {
      list = list.filter(s => s.patient_id === filters.patientId);
    }
    if (filters?.facilityId) {
      list = list.filter(s => s.facility_id === filters.facilityId);
    }
    if (filters?.status) {
      list = list.filter(s => s.status === filters.status);
    }
    if (filters?.startDate) {
      list = list.filter(s => new Date(s.created_at) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      list = list.filter(s => new Date(s.created_at) <= new Date(filters.endDate!));
    }

    // Filter by grade or referral if needed
    if (filters?.grade !== undefined) {
      list = list.filter(s => {
        const cls = this.data.classifications.find(c => c.screening_id === s.id);
        return cls?.predicted_grade === filters.grade;
      });
    }

    if (filters?.referralStatus) {
      list = list.filter(s => {
        const ref = this.data.referrals.find(r => r.screening_id === s.id);
        return ref?.status === filters.referralStatus;
      });
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const paginated = list.slice(offset, offset + limit);

    // Populate relation entities
    const populated = paginated.map(s => this.populateScreening(s));

    return { screenings: populated, total };
  }

  public getScreeningById(id: string): Screening | undefined {
    const screening = this.data.screenings.find(s => s.id === id);
    if (!screening) return undefined;
    return this.populateScreening(screening);
  }

  private populateScreening(s: Screening): Screening {
    const patient = this.data.patients.find(p => p.id === s.patient_id);
    const facility = this.data.facilities.find(f => f.id === s.facility_id);
    const image = this.data.images.find(i => i.screening_id === s.id);
    const quality = image ? this.data.imageQuality.find(q => q.image_id === image.id) : undefined;
    const enhancement = image ? this.data.enhancements.find(e => e.image_id === image.id) : undefined;
    const segmentation = image ? this.data.segmentations.find(seg => seg.image_id === image.id) : undefined;
    const classification = this.data.classifications.find(c => c.screening_id === s.id);
    const explainability = this.data.explainability.find(ex => ex.screening_id === s.id);
    const referral = this.data.referrals.find(r => r.screening_id === s.id);
    const timeline = this.data.screeningEvents
      .filter(ev => ev.screening_id === s.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      ...s,
      patient: s.patient || patient,
      facility: s.facility || facility,
      image: s.image || image,
      quality: s.quality || quality,
      enhancement: s.enhancement || enhancement,
      segmentation: s.segmentation || segmentation,
      classification: s.classification || classification,
      explainability: s.explainability || explainability,
      referral: s.referral || referral,
      timeline: (s.timeline && s.timeline.length > 0) ? s.timeline : timeline
    };
  }

  public addScreening(screening: Screening): Screening {
    this.data.screenings.push(screening);
    this.save();
    return screening;
  }

  public updateScreening(id: string, updates: Partial<Screening>): Screening | undefined {
    const idx = this.data.screenings.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.screenings[idx] = {
      ...this.data.screenings[idx],
      ...updates
    };
    this.save();
    return this.populateScreening(this.data.screenings[idx]);
  }

  // --- Related AI Entities ---
  public addImage(img: ImageRecord): ImageRecord {
    this.data.images.push(img);
    this.save();
    return img;
  }

  public getImageById(id: string): ImageRecord | undefined {
    return this.data.images.find(i => i.id === id);
  }

  public getImageByScreeningId(screeningId: string): ImageRecord | undefined {
    return this.data.images.find(i => i.screening_id === screeningId);
  }

  public addImageQuality(iq: ImageQualityResult): ImageQualityResult {
    const idx = this.data.imageQuality.findIndex(q => q.image_id === iq.image_id);
    if (idx !== -1) {
      this.data.imageQuality[idx] = iq;
    } else {
      this.data.imageQuality.push(iq);
    }
    this.save();
    return iq;
  }

  public addEnhancement(enh: EnhancementResult): EnhancementResult {
    const idx = this.data.enhancements.findIndex(e => e.image_id === enh.image_id);
    if (idx !== -1) {
      this.data.enhancements[idx] = enh;
    } else {
      this.data.enhancements.push(enh);
    }
    this.save();
    return enh;
  }

  public addSegmentation(seg: SegmentationResult): SegmentationResult {
    const idx = this.data.segmentations.findIndex(s => s.image_id === seg.image_id);
    if (idx !== -1) {
      this.data.segmentations[idx] = seg;
    } else {
      this.data.segmentations.push(seg);
    }
    this.save();
    return seg;
  }

  public addClassification(cls: ClassificationResult): ClassificationResult {
    const idx = this.data.classifications.findIndex(c => c.screening_id === cls.screening_id);
    if (idx !== -1) {
      this.data.classifications[idx] = cls;
    } else {
      this.data.classifications.push(cls);
    }
    this.save();
    return cls;
  }

  public addExplainability(exp: ExplainabilityResult): ExplainabilityResult {
    const idx = this.data.explainability.findIndex(e => e.screening_id === exp.screening_id);
    if (idx !== -1) {
      this.data.explainability[idx] = exp;
    } else {
      this.data.explainability.push(exp);
    }
    this.save();
    return exp;
  }

  public addReferral(ref: ReferralResult): ReferralResult {
    const idx = this.data.referrals.findIndex(r => r.screening_id === ref.screening_id);
    if (idx !== -1) {
      this.data.referrals[idx] = ref;
    } else {
      this.data.referrals.push(ref);
    }
    this.save();
    return ref;
  }

  public updateReferral(id: string, updates: Partial<ReferralResult>): ReferralResult | undefined {
    const idx = this.data.referrals.findIndex(r => r.id === id || r.screening_id === id);
    if (idx === -1) return undefined;
    this.data.referrals[idx] = {
      ...this.data.referrals[idx],
      ...updates
    };
    this.save();
    return this.data.referrals[idx];
  }

  public addScreeningEvent(event: ScreeningEvent): ScreeningEvent {
    this.data.screeningEvents.push(event);
    this.save();
    return event;
  }

  // --- Simulation Runs ---
  public getSimulationRuns(): SimulationRun[] {
    return [...this.data.simulationRuns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getSimulationRunById(id: string): SimulationRun | undefined {
    return this.data.simulationRuns.find(r => r.id === id);
  }

  public addSimulationRun(run: SimulationRun): SimulationRun {
    this.data.simulationRuns.push(run);
    this.save();
    return run;
  }

  public updateSimulationRun(id: string, updates: Partial<SimulationRun>): SimulationRun | undefined {
    const idx = this.data.simulationRuns.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.data.simulationRuns[idx] = {
      ...this.data.simulationRuns[idx],
      ...updates
    };
    this.save();
    return this.data.simulationRuns[idx];
  }

  // --- Audit Logs ---
  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...log
    };
    this.data.auditLogs.push(entry);
    this.save();
    return entry;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return [...this.data.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}
