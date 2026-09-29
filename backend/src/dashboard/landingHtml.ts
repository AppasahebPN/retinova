// ============================================================
// RETINOVA PLATFORM — Commercial Enterprise Landing & Pitch Portal
// B2B / B2G Public Overview, Product Positioning & Pilot Request
// ============================================================

export function getLandingHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RETINOVA — AI-Powered Retinal Screening for Diabetic Retinopathy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #060911;
      color: #E2E8F0;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .glass-card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card-hover:hover {
      border-color: rgba(45, 212, 191, 0.35);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    }
    .gradient-text {
      background: linear-gradient(135deg, #2DD4BF 0%, #38BDF8 50%, #FFFFFF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-teal-500 selection:text-black">

  <!-- Header -->
  <header class="glass-card border-b border-slate-800/80 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-teal-500/20">
        R
      </div>
      <div>
        <span class="text-xl font-extrabold tracking-tight text-white">RETINOVA</span>
        <span class="text-[10px] ml-2 px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 uppercase font-bold mono">RETINAL SCREENING</span>
      </div>
    </div>

    <nav class="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
      <a href="#problem" class="hover:text-teal-400 transition">Problem</a>
      <a href="#solution" class="hover:text-teal-400 transition">Solution</a>
      <a href="#how-it-works" class="hover:text-teal-400 transition">How It Works</a>
      <a href="#platform" class="hover:text-teal-400 transition">Platform</a>
      <a href="#business-model" class="hover:text-teal-400 transition">Business Model</a>
    </nav>

    <div class="flex items-center gap-3">
      <a href="/install" class="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition">
        Install APK
      </a>
      <a href="/dashboard" class="px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition shadow-lg shadow-teal-600/20">
        Clinical Dashboard
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative py-24 px-6 max-w-6xl mx-auto text-center space-y-6">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span>AI-Powered Diabetic Retinopathy Screening • Swin V2 Tiny • Edge + Cloud</span>
    </div>

    <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight">
      <span class="block text-white">AI-Powered Retinal Screening</span>
      <span class="gradient-text">for Diabetic Retinopathy</span>
    </h1>

    <p class="text-base md:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
      An explainable AI clinical decision support system for diabetic retinopathy screening in rural India. Frontline ASHA health workers capture retinal fundus images, and the Swin Transformer V2 Tiny model performs automated DR grading with Grad-CAM evidence — working 100% offline at the point of care.
    </p>

    <!-- Core Value Pillars Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 text-center">
      <div class="glass-card rounded-xl p-3 border-t-2 border-t-teal-500">
        <div class="text-xs font-bold text-teal-400 uppercase tracking-wider">CAPTURE</div>
        <div class="text-xs text-slate-400 mt-1">Smartphone fundus image acquisition at PHC</div>
      </div>
      <div class="glass-card rounded-xl p-3 border-t-2 border-t-blue-500">
        <div class="text-xs font-bold text-blue-400 uppercase tracking-wider">SCREEN</div>
        <div class="text-xs text-slate-400 mt-1">Swin V2 Tiny DR Grade 0-4 classification</div>
      </div>
      <div class="glass-card rounded-xl p-3 border-t-2 border-t-purple-500">
        <div class="text-xs font-bold text-purple-400 uppercase tracking-wider">EVIDENCE</div>
        <div class="text-xs text-slate-400 mt-1">Grad-CAM saliency + vessel segmentation</div>
      </div>
      <div class="glass-card rounded-xl p-3 border-t-2 border-t-emerald-500">
        <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider">REFER</div>
        <div class="text-xs text-slate-400 mt-1">Automated triage & referral to ophthalmologist</div>
      </div>
    </div>

    <div class="pt-6 flex flex-wrap items-center justify-center gap-4">
      <a href="#pilot" class="px-6 py-3 text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition shadow-xl shadow-teal-600/25">
        Request a Commercial Pilot
      </a>
      <a href="/dashboard" class="px-6 py-3 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition">
        Explore Live Command Center
      </a>
    </div>
  </section>

  <!-- Problem & Solution Section -->
  <section id="problem" class="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/80">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
      <div class="space-y-4">
        <span class="text-xs font-bold uppercase tracking-wider text-red-400 mono">THE PREVENTABLE BLINDNESS CRISIS</span>
        <h2 class="text-2xl md:text-3xl font-bold text-white">93 Million People Have Diabetic Retinopathy. Most Are Unscreened.</h2>
        <p class="text-sm text-slate-400 leading-relaxed">
          In rural India, an estimated 77 million diabetic patients lack access to regular retinal screening. Primary Health Centres (PHCs) have no ophthalmologist, no fundus camera access, and unreliable internet. By the time patients reach a district hospital, vision loss is often irreversible.
        </p>
        <ul class="space-y-2 text-xs text-slate-300">
          <li class="flex items-center gap-2">
            <span class="text-red-400 font-bold">✕</span> No trained retinal specialist at Sub-Centre or PHC level
          </li>
          <li class="flex items-center gap-2">
            <span class="text-red-400 font-bold">✕</span> Cloud-dependent AI systems fail without stable broadband
          </li>
          <li class="flex items-center gap-2">
            <span class="text-red-400 font-bold">✕</span> Late diagnosis leads to preventable blindness in working-age adults
          </li>
        </ul>
      </div>

      <div id="solution" class="glass-card rounded-2xl p-6 space-y-4 border-l-4 border-l-teal-500">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">THE RETINOVA SOLUTION</span>
        <h3 class="text-xl font-bold text-white">AI-Powered Retinal Screening at the Point of Care.</h3>
        <p class="text-sm text-slate-300 leading-relaxed">
          RETINOVA enables ASHA health workers to capture retinal fundus images using a smartphone ophthalmoscope. The Swin V2 Tiny model runs directly on the device, providing instant DR grading with Grad-CAM evidence — working 100% offline. Results sync to the district hospital when connectivity is available.
        </p>
        <div class="pt-2 grid grid-cols-2 gap-3 text-xs mono">
          <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div class="text-teal-400 font-bold">&lt; 250ms</div>
            <div class="text-[11px] text-slate-400">On-Device Latency</div>
          </div>
          <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div class="text-emerald-400 font-bold">100% Offline</div>
            <div class="text-[11px] text-slate-400">Inference Autonomy</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
  <section id="how-it-works" class="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/80 space-y-10">
    <div class="text-center space-y-2">
      <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">SCREENING WORKFLOW</span>
      <h2 class="text-2xl md:text-3xl font-bold text-white">How RETINOVA Screens for Diabetic Retinopathy</h2>
      <p class="text-xs text-slate-400">From fundus capture at Sub-Centre to specialist referral at District Hospital</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="glass-card rounded-xl p-4 space-y-2 border-t-2 border-t-slate-700">
        <div class="text-xs font-bold text-teal-400 mono">01 • CAPTURE</div>
        <div class="text-sm font-bold text-white">Fundus Image</div>
        <p class="text-xs text-slate-400">ASHA health worker captures retinal fundus image using smartphone ophthalmoscope attachment at PHC/Sub-Centre.</p>
      </div>

      <div class="glass-card rounded-xl p-4 space-y-2 border-t-2 border-t-slate-700">
        <div class="text-xs font-bold text-teal-400 mono">02 • SCREEN</div>
        <div class="text-sm font-bold text-white">AI DR Grading</div>
        <p class="text-xs text-slate-400">Swin V2 Tiny runs on-device in &lt;250ms, classifying DR severity (Grade 0-4) with calibrated confidence and Grad-CAM evidence.</p>
      </div>

      <div class="glass-card rounded-xl p-4 space-y-2 border-t-2 border-t-slate-700">
        <div class="text-xs font-bold text-teal-400 mono">03 • STORE</div>
        <div class="text-sm font-bold text-white">Local Record</div>
        <p class="text-xs text-slate-400">Screening result, evidence images, and patient data are immediately saved locally. Zero data loss even without connectivity.</p>
      </div>

      <div class="glass-card rounded-xl p-4 space-y-2 border-t-2 border-t-slate-700">
        <div class="text-xs font-bold text-teal-400 mono">04 • SYNC</div>
        <div class="text-sm font-bold text-white">District Upload</div>
        <p class="text-xs text-slate-400">When connectivity is available, records automatically sync to the District Hospital dashboard for doctor review and triage.</p>
      </div>

      <div class="glass-card rounded-xl p-4 space-y-2 border-t-2 border-t-teal-500">
        <div class="text-xs font-bold text-teal-400 mono">05 • REFER</div>
        <div class="text-sm font-bold text-white">Clinical Triage</div>
        <p class="text-xs text-slate-400">Ophthalmologist reviews AI-graded screenings, confirms referrals, and schedules specialist appointments for sight-threatening cases.</p>
      </div>
    </div>
  </section>

  <!-- Clinical Screening Pipeline Section -->
  <section id="industries" class="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/80 space-y-10">
    <div class="text-center space-y-2">
      <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">CLINICAL SCREENING PIPELINE</span>
      <h2 class="text-2xl md:text-3xl font-bold text-white">Five-Stage Retinal Screening Workflow</h2>
      <p class="text-xs text-slate-400">From fundus image capture to specialist referral — fully automated, clinically validated</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="glass-card glass-card-hover rounded-xl p-5 space-y-3">
        <div class="text-2xl">📷</div>
        <h3 class="text-base font-bold text-white">Module 1: Quality Gate</h3>
        <p class="text-xs text-slate-400">EyeQ MobileNetV2 assesses sharpness, illumination, FOV coverage, and artifact area. Images below threshold trigger recapture.</p>
        <div class="text-[11px] text-teal-400 mono font-semibold">Model: MobileNetV2 (EyeQ)</div>
      </div>

      <div class="glass-card glass-card-hover rounded-xl p-5 space-y-3">
        <div class="text-2xl">🔬</div>
        <h3 class="text-base font-bold text-white">Module 2: Enhancement</h3>
        <p class="text-xs text-slate-400">Adaptive CLAHE with green-channel luminance normalization sharpens vascular margins for optimal downstream analysis.</p>
        <div class="text-[11px] text-blue-400 mono font-semibold">Method: Controlled CLAHE</div>
      </div>

      <div class="glass-card glass-card-hover rounded-xl p-5 space-y-3">
        <div class="text-2xl">🩸</div>
        <h3 class="text-base font-bold text-white">Module 3: Segmentation</h3>
        <p class="text-xs text-slate-400">Retinal vessel extraction, optic disc/fovea localization, and candidate lesion proposal (microaneurysms, exudates, hemorrhages).</p>
        <div class="text-[11px] text-cyan-400 mono font-semibold">Method: Gabor + Morphological</div>
      </div>

      <div class="glass-card glass-card-hover rounded-xl p-5 space-y-3">
        <div class="text-2xl">🧠</div>
        <h3 class="text-base font-bold text-white">Module 4: DR Grading</h3>
        <p class="text-xs text-slate-400">Swin Transformer V2 Tiny classifies diabetic retinopathy severity (Grade 0–4, ICDR scale) with temperature-scaled calibrated confidence.</p>
        <div class="text-[11px] text-purple-400 mono font-semibold">Model: Swin V2 Tiny (Frozen)</div>
      </div>

      <div class="glass-card glass-card-hover rounded-xl p-5 space-y-3">
        <div class="text-2xl">🔥</div>
        <h3 class="text-base font-bold text-white">Module 5: Grad-CAM</h3>
        <p class="text-xs text-slate-400">Multi-scale spatial gradient-weighted class activation mapping generates explainable saliency heatmaps for clinical transparency.</p>
        <div class="text-[11px] text-red-400 mono font-semibold">Method: Grad-CAM (Stage 3+4)</div>
      </div>
    </div>
  </section>

  <!-- Business Model Section -->
  <section id="business-model" class="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/80 space-y-10">
    <div class="text-center space-y-2">
      <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">COMMERCIAL PACKAGING</span>
      <h2 class="text-2xl md:text-3xl font-bold text-white">Deploy • License • Maintain • Scale</h2>
      <p class="text-xs text-slate-400">Transparent enterprise structure combining predictable platform licensing with long-term support</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass-card rounded-xl p-5 space-y-2 border-t-2 border-t-slate-700">
        <div class="text-xs font-bold text-slate-400 uppercase">ONE-TIME</div>
        <div class="text-base font-bold text-white">1. Implementation</div>
        <p class="text-xs text-slate-400">Tenant setup, workflow configuration, device provisioning, security hardening, and field operator training.</p>
      </div>

      <div class="glass-card rounded-xl p-5 space-y-2 border-t-2 border-t-teal-500">
        <div class="text-xs font-bold text-teal-400 uppercase">RECURRING (ARR)</div>
        <div class="text-base font-bold text-white">2. Platform License</div>
        <p class="text-xs text-slate-400">Per-device or per-tenant recurring annual license for edge application software, local inference, and dashboard.</p>
      </div>

      <div class="glass-card rounded-xl p-5 space-y-2 border-t-2 border-t-amber-500">
        <div class="text-xs font-bold text-amber-400 uppercase">RECURRING (ARR)</div>
        <div class="text-base font-bold text-white">3. Annual Maintenance</div>
        <p class="text-xs text-slate-400">Ongoing firmware upgrades, SLA support, model drift monitoring, and hardware compatibility maintenance.</p>
      </div>

      <div class="glass-card rounded-xl p-5 space-y-2 border-t-2 border-t-purple-500">
        <div class="text-xs font-bold text-purple-400 uppercase">PROJECT / USAGE</div>
        <div class="text-base font-bold text-white">4. Custom AI & Cloud</div>
        <p class="text-xs text-slate-400">Bespoke model fine-tuning on regional datasets, private cloud hosting, and EHR/ERP enterprise integrations.</p>
      </div>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 max-w-2xl mx-auto">
      <span class="text-amber-400 font-bold">Commercial Pilot Notice:</span> Licensing tiers (Basic ₹499/device, Pro ₹1,999/device, Enterprise custom) are proposed pilot benchmarks subject to procurement and field trials.
    </div>
  </section>

  <!-- CTA / Pilot Form Section -->
  <section id="pilot" class="py-20 px-6 max-w-4xl mx-auto border-t border-slate-800/80 text-center space-y-6">
    <h2 class="text-3xl font-extrabold text-white">Ready to Deploy Retinal Screening in Your District?</h2>
    <p class="text-sm text-slate-400 max-w-xl mx-auto">
      Evaluate RETINOVA in a guided 60-day clinical pilot. We configure the screening workflow, provision ASHA worker devices, and integrate with your district hospital referral system.
    </p>

    <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
      <a href="/dashboard" class="px-6 py-3.5 text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition shadow-xl shadow-teal-600/30">
        Launch Clinical Dashboard Demo
      </a>
      <a href="/install" class="px-6 py-3.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition">
        Download ASHA Field App APK (82.9 MB)
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="glass-card border-t border-slate-800/80 px-6 py-6 mt-auto text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-2">
      <span class="font-bold text-slate-300">RETINOVA</span>
      <span>•</span>
      <span>AI-Powered Retinal Screening for Diabetic Retinopathy</span>
    </div>
    <div class="flex items-center gap-4 mono text-[11px]">
      <a href="/dashboard" class="text-teal-400 hover:underline">Clinical Dashboard</a>
      <span>•</span>
      <a href="/install" class="text-teal-400 hover:underline">Install ASHA App</a>
      <span>•</span>
      <a href="/api/screenings" class="text-teal-400 hover:underline">Screening API</a>
    </div>
  </footer>

</body>
</html>`;
}
