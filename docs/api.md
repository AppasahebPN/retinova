# NetraAI REST API Documentation

Base URL: `http://localhost:5000/api`

## Authentication
All endpoints (except `/auth/login` and `/reports/:id/html`) require a Bearer token or `X-Demo-Role` header.

### 1. Authentication Endpoints
- `POST /auth/login` — Sign in with email and password
- `GET /auth/me` — Get current logged-in user profile
- `GET /auth/demo-users` — Retrieve demo persona list for 1-click evaluation

### 2. Patient Management Endpoints
- `GET /patients` — List/filter patients (query: `search`, `facilityId`, `limit`, `offset`)
- `GET /patients/:id` — Retrieve patient profile and longitudinal screening history
- `POST /patients` — Register a new rural patient
- `PUT /patients/:id` — Update demographic details

### 3. Screening Workflow Endpoints
- `GET /screenings` — Query screening encounters with multi-grade filters
- `GET /screenings/:id` — Fetch complete screening record with multi-layer overlays
- `POST /screenings` — Initialize new screening and register image
- `POST /screenings/:id/analyze` — Trigger multi-stage AI analysis pipeline
- `POST /screenings/:id/referral` — Update clinical referral action and notes
- `POST /screenings/upload` — Upload fundus image (Multipart `image`)

### 4. Analytics Endpoints
- `GET /analytics/overview` — Get district KPI metrics, volume trends, and severity distributions

### 5. Simulink / SimEvents Capacity Simulation Endpoints
- `POST /simulation/run` — Run district operational capacity simulation
- `GET /simulation/runs` — Retrieve list of previous simulation benchmark runs
- `GET /simulation/runs/:id` — Retrieve details of specific simulation run
- `GET /simulation/status` — Health check for Simulink engine

### 6. Model & System Status Endpoints
- `GET /model-status` — Health check of all 6 MATLAB algorithms and database engine

### 7. Report Endpoints
- `GET /reports/:id/html` — Printable/Downloadable Clinical Screening Report HTML
- `GET /reports/:id/data` — JSON data export for electronic health records
