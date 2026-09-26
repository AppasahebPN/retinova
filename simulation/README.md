# RETINOVA — District-Scale Resource Planning Simulation

This module provides discrete-event operational modeling using MATLAB, Simulink, and SimEvents to simulate diabetic retinopathy screening workflows across rural health networks.

---

## 1. Operational Model Architecture

```
[Rural Screening Centers] (PHCs / Sub-Centers)
             │
             ▼
     [Screening Queue] (Network transmission & ingestion)
             │
             ▼
      [AI Processing] (Automated IQA + Swin V2 + Grad-CAM)
             │
             ├── Low Risk (G0/G1) ──► Routine Follow-up
             │
             ▼ High Risk (G2/G3/G4) or Borderline
[Tele-Ophthalmologist Review Queue] (Human-in-the-Loop)
             │
             ▼
    [District Monitoring] (Capacity, referral completion, backlogs)
```

---

## 2. Key Simulation Files

- **`DR_District_Resource_Planner.slx`**: Base SimEvents discrete-event simulation model capturing rural patient arrival rates, server queues, and tele-ophthalmology triage latency.
- **`DR_District_Resource_Planner_v2.slx`**: Enhanced district resource planning model with multi-tier staffing (ASHA workers, primary health centers, tertiary district hospital specialists).
- **`run_Module6_ResourcePlanner.m`**: Parameterized MATLAB runner evaluating arrival Poisson processes, processing times, and bottleneck identification.
- **`run_Module6_ResourcePlanner_v2.m`**: Scenario comparison generator producing capacity recommendation curves and sensitivity analyses.
- **`Module6_Recommended_Resources.csv`**: Target staffing and hardware configurations for varying screening cohort sizes (1,000 to 50,000 patients/year).
- **`Module6_Resource_Planner_Results.json`**: Pre-computed baseline and stress-test simulation results ingested by the District Manager dashboard UI.

---

## 3. Modeled Factors

1. **Patient Arrival & Workload Distribution**: Peak harvest season vs. regular clinic days.
2. **Network Latency & Uplink Delays**: Rural 3G/4G connectivity impact on image transmission.
3. **AI Gate Filtering Efficiency**: Percentage of non-referable cases safely handled without unnecessary specialist burden.
4. **Specialist Review Capacity**: Ophthalmologist turnaround times per scan (median 2.5 minutes).
5. **Backlog & Turnaround Time (TAT)**: End-to-end latency from patient capture to specialist report.
6. **Resource Utilization**: Clinician burnout prevention and server GPU load optimization.

---

## 4. Important Context & Disclaimer

> **Simulation / Planning Component Notice**:
> This module is an **in silico capacity planning tool** designed to assist public health administrators in estimating required workforce, hardware, and bandwidth resources prior to scaling. It represents operational simulations, not clinical outcome evidence or real-world deployed district telemetry.
