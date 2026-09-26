-- ==============================================================================
-- SIH26038: Explainable AI for Diabetic Retinopathy Screening in Rural India
-- PostgreSQL Relational Database Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FACILITIES TABLE (Rural Primary Healthcare Centers / District Hospitals)
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'PHC', -- 'PHC', 'CHC', 'District Hospital', 'Mobile Camp'
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    active_cameras INT DEFAULT 1,
    contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (Healthcare Workers, Doctors, District Managers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'healthcare_worker', 'doctor', 'district_manager'
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PATIENTS TABLE (Rural Patients)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_code VARCHAR(50) UNIQUE NOT NULL, -- Format: DR-MH-2026-XXXX
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL, -- 'Male', 'Female', 'Other'
    phone VARCHAR(20),
    location VARCHAR(255) NOT NULL, -- Village / Taluka / District
    diabetes_duration_years INT DEFAULT 0,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SCREENINGS TABLE (Screening Sessions)
CREATE TABLE IF NOT EXISTS screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'rejected'
    eye VARCHAR(10) NOT NULL, -- 'left', 'right', 'both'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INT DEFAULT 0
);

-- 5. IMAGES TABLE (Acquired Fundus Images)
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
    storage_url TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    eye VARCHAR(10) NOT NULL, -- 'left', 'right'
    device_id VARCHAR(100) DEFAULT 'CAM-01-RENOVA',
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    width INT DEFAULT 2048,
    height INT DEFAULT 1536,
    format VARCHAR(20) DEFAULT 'image/jpeg'
);

-- 6. IMAGE QUALITY TABLE (IQA assessment results)
CREATE TABLE IF NOT EXISTS image_quality (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL UNIQUE REFERENCES images(id) ON DELETE CASCADE,
    quality_score DECIMAL(5, 2) NOT NULL, -- 0.00 to 100.00
    sharpness DECIMAL(5, 2) NOT NULL,
    illumination DECIMAL(5, 2) NOT NULL,
    fov_coverage DECIMAL(5, 2) NOT NULL,
    artifact_area DECIMAL(5, 2) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'accepted', 'rejected'
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ENHANCEMENTS TABLE (Pre-processing & Enhancement details)
CREATE TABLE IF NOT EXISTS enhancements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL UNIQUE REFERENCES images(id) ON DELETE CASCADE,
    enhanced_image_url TEXT NOT NULL,
    method VARCHAR(100) DEFAULT 'Illumination Correction & Controlled CLAHE',
    processing_time_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SEGMENTATION RESULTS TABLE (Vessel & Lesion Candidate maps)
CREATE TABLE IF NOT EXISTS segmentation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL UNIQUE REFERENCES images(id) ON DELETE CASCADE,
    vessel_coverage DECIMAL(5, 2) NOT NULL,
    lesion_coverage DECIMAL(5, 2) NOT NULL,
    candidate_count INT NOT NULL DEFAULT 0,
    vessel_mask_url TEXT,
    lesion_mask_url TEXT,
    processing_time_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. CLASSIFICATION RESULTS TABLE (DR Grading 0-4 + Calibrated Confidence)
CREATE TABLE IF NOT EXISTS classification_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL UNIQUE REFERENCES screenings(id) ON DELETE CASCADE,
    predicted_grade INT NOT NULL CHECK (predicted_grade BETWEEN 0 AND 4), -- 0=No DR, 1=Mild, 2=Moderate, 3=Severe, 4=Proliferative DR
    raw_probability DECIMAL(5, 4) NOT NULL,
    calibrated_confidence DECIMAL(5, 4) NOT NULL,
    confidence_method VARCHAR(100) DEFAULT 'Temperature Scaling + Platt Calibration',
    confidence_threshold DECIMAL(5, 4) DEFAULT 0.7000,
    model_name VARCHAR(100) DEFAULT 'MATLAB-MobileNetV2-DR-Ordinal',
    model_version VARCHAR(50) DEFAULT 'v1.4-rural-calibrated',
    processing_time_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. EXPLAINABILITY RESULTS TABLE (Grad-CAM & Evidence Attribution)
CREATE TABLE IF NOT EXISTS explainability_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL UNIQUE REFERENCES screenings(id) ON DELETE CASCADE,
    gradcam_url TEXT NOT NULL,
    evidence_summary TEXT NOT NULL,
    evidence_regions_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. REFERRALS TABLE (Clinical Referral Decision)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL UNIQUE REFERENCES screenings(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'No Referral', 'Routine Referral', 'Priority Referral', 'Urgent Referral'
    priority VARCHAR(20) NOT NULL, -- 'none', 'routine', 'priority', 'urgent'
    reason TEXT NOT NULL,
    action_taken VARCHAR(50) DEFAULT 'referral_pending', -- 'referral_pending', 'referral_completed', 'patient_advised', 'followup_scheduled'
    action_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. SCREENING EVENTS TABLE (Audit Trail & Workflow Timeline)
CREATE TABLE IF NOT EXISTS screening_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- 13. SIMULATION RUNS TABLE (Simulink / SimEvents District Capacity Planning)
CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    parameters_json JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'queued', 'running', 'completed', 'failed'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 14. SIMULATION RESULTS TABLE (Simulink / SimEvents Outputs)
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_run_id UUID NOT NULL UNIQUE REFERENCES simulation_runs(id) ON DELETE CASCADE,
    total_patients INT NOT NULL,
    patients_processed INT NOT NULL,
    patients_waiting INT NOT NULL,
    throughput DECIMAL(8, 2) NOT NULL,
    average_waiting_time DECIMAL(8, 2) NOT NULL,
    max_waiting_time DECIMAL(8, 2) NOT NULL,
    camera_utilization DECIMAL(5, 2) NOT NULL,
    ai_utilization DECIMAL(5, 2) NOT NULL,
    doctor_utilization DECIMAL(5, 2) NOT NULL,
    rejected_images INT NOT NULL,
    referral_load INT NOT NULL,
    bottleneck VARCHAR(100) NOT NULL,
    additional_resources_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_patients_patient_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON patients(facility_id);
CREATE INDEX IF NOT EXISTS idx_screenings_patient_id ON screenings(patient_id);
CREATE INDEX IF NOT EXISTS idx_screenings_facility_id ON screenings(facility_id);
CREATE INDEX IF NOT EXISTS idx_screenings_created_at ON screenings(created_at);
CREATE INDEX IF NOT EXISTS idx_screenings_status ON screenings(status);
CREATE INDEX IF NOT EXISTS idx_images_screening_id ON images(screening_id);
CREATE INDEX IF NOT EXISTS idx_classification_screening_id ON classification_results(screening_id);
CREATE INDEX IF NOT EXISTS idx_classification_predicted_grade ON classification_results(predicted_grade);
CREATE INDEX IF NOT EXISTS idx_referrals_screening_id ON referrals(screening_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_events_screening_id ON screening_events(screening_id);
CREATE INDEX IF NOT EXISTS idx_sim_results_run_id ON simulation_results(simulation_run_id);
