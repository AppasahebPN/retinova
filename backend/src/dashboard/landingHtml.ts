// ============================================================
// RETINOVA PLATFORM — Commercial Enterprise Landing Page
// Edge AI • Offline-First • Secure Cloud Sync
// Clinical Decision Support for Diabetic Retinopathy Screening
// ============================================================

export function getLandingHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RETINOVA — AI-Powered Retinal Screening for Diabetic Retinopathy</title>
  <meta name="description" content="An edge-AI clinical decision support platform for diabetic retinopathy screening. Capture retinal images locally, run AI-assisted screening at the point of care, store evidence securely, and synchronize results when connectivity is available.">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #060913;
      color: #E2E8F0;
      overflow-x: hidden;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .glass-nav {
      background: rgba(8, 12, 24, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .glass-card {
      background: rgba(13, 20, 36, 0.72);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-card:hover {
      border-color: rgba(45, 212, 191, 0.3);
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.65), 0 0 24px -6px rgba(20, 184, 166, 0.12);
      transform: translateY(-2px);
    }
    .card-static {
      background: rgba(13, 20, 36, 0.65);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .gradient-hero-text {
      background: linear-gradient(135deg, #2DD4BF 0%, #38BDF8 60%, #E2E8F0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtle-glow {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, rgba(2, 132, 199, 0.03) 50%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .flow-connector-line {
      position: relative;
    }
    .flow-connector-line::after {
      content: '';
      position: absolute;
      top: 50%;
      right: -1rem;
      width: 1rem;
      height: 2px;
      background: linear-gradient(to right, rgba(45, 212, 191, 0.4), rgba(56, 189, 248, 0.4));
    }
    @media (max-width: 1024px) {
      .flow-connector-line::after {
        display: none;
      }
    }
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #060913;
    }
    ::-webkit-scrollbar-thumb {
      background: #1E293B;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-teal-500/30 selection:text-teal-200">

  <!-- Background decorative light cones -->
  <div class="subtle-glow top-0 left-1/2 -translate-x-1/2"></div>
  <div class="subtle-glow top-[900px] left-[-200px]"></div>
  <div class="subtle-glow top-[2200px] right-[-200px]"></div>

  <!-- ============================================================ -->
  <!-- 1. NAVIGATION BAR -->
  <!-- ============================================================ -->
  <header class="glass-nav sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3.5 transition-all duration-200">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-3 group focus:outline-none">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-teal-950/40">
          <div class="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
            <svg class="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12c2.5-5 6.5-8 9-8s6.5 3 9 8c-2.5 5-6.5 8-9 8s-6.5-3-9-8z" />
              <path d="M12 5v2" />
              <path d="M12 17v2" />
            </svg>
          </div>
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-lg font-extrabold tracking-tight text-white group-hover:text-teal-300 transition">RETINOVA</span>
            <span class="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold mono">CLINICAL DECISION SUPPORT</span>
          </div>
          <span class="text-[10px] text-slate-400 hidden sm:block tracking-wider uppercase">Diabetic Retinopathy Screening</span>
        </div>
      </a>

      <!-- Desktop Navigation Links -->
      <nav class="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
        <a href="#problem" class="hover:text-teal-400 transition-colors">Problem</a>
        <a href="#solution" class="hover:text-teal-400 transition-colors">Solution</a>
        <a href="#how-it-works" class="hover:text-teal-400 transition-colors">How It Works</a>
        <a href="#architecture" class="hover:text-teal-400 transition-colors">Architecture</a>
        <a href="#security" class="hover:text-teal-400 transition-colors">Security</a>
        <a href="#platform" class="hover:text-teal-400 transition-colors">Platform</a>
        <a href="#business-model" class="hover:text-teal-400 transition-colors">Business Model</a>
      </nav>

      <!-- Action Buttons -->
      <div class="hidden sm:flex items-center gap-3">
        <a href="/install" class="px-3.5 py-1.5 text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg transition-all flex items-center gap-1.5 shadow-sm">
          <svg class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Install APK
        </a>
        <a href="/dashboard" class="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-all shadow-md shadow-teal-900/40 flex items-center gap-1.5">
          <span>Clinical Dashboard</span>
          <svg class="w-3 h-3 text-teal-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>

      <!-- Mobile Hamburger Button -->
      <button id="mobileMenuBtn" aria-label="Toggle navigation menu" class="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path id="menuIcon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

    </div>

    <!-- Mobile Drawer Navigation -->
    <div id="mobileMenu" class="hidden lg:hidden pt-4 pb-3 border-t border-slate-800/80 mt-3 space-y-2">
      <a href="#problem" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">Problem</a>
      <a href="#solution" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">Solution</a>
      <a href="#how-it-works" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">How It Works</a>
      <a href="#architecture" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">Architecture</a>
      <a href="#security" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">Security</a>
      <a href="#platform" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">Platform</a>
      <a href="#business-model" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60">Business Model</a>
      <div class="pt-3 flex flex-col gap-2">
        <a href="/install" class="w-full text-center py-2 text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 rounded-lg">Install APK</a>
        <a href="/dashboard" class="w-full text-center py-2 text-xs font-bold bg-teal-600 text-white rounded-lg">Clinical Dashboard</a>
      </div>
    </div>
  </header>

  <main class="flex-1">

    <!-- ============================================================ -->
    <!-- 2. HERO SECTION -->
    <!-- ============================================================ -->
    <section class="relative pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center z-10">
      
      <!-- Architecture Badge -->
      <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 mb-8 shadow-inner">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
        </span>
        <span class="mono tracking-wider text-[11px] font-semibold text-teal-300 uppercase">EDGE AI • OFFLINE-FIRST • SECURE CLOUD</span>
      </div>

      <!-- Headline -->
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
        AI-Powered Retinal Screening
        <span class="block gradient-hero-text mt-1">for Diabetic Retinopathy</span>
      </h1>

      <!-- Supporting Text -->
      <p class="mt-6 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
        An edge-AI clinical decision support platform for diabetic retinopathy screening. Capture retinal images locally, run AI-assisted screening at the point of care, store evidence securely, and synchronize results when connectivity is available.
      </p>

      <!-- Primary & Secondary CTAs -->
      <div class="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="/dashboard" class="w-full sm:w-auto px-7 py-3.5 text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all shadow-xl shadow-teal-950/60 flex items-center justify-center gap-2">
          <span>Explore the Platform</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/install" class="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/90 rounded-xl transition-all flex items-center justify-center gap-2">
          <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Install APK</span>
        </a>
      </div>

      <!-- Core Architecture Pillars Strip -->
      <div class="mt-14 max-w-4xl mx-auto pt-6 border-t border-slate-800/80">
        <p class="text-[11px] mono uppercase tracking-widest text-slate-400 mb-4 font-semibold">Core Architectural Workflow</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="card-static rounded-xl p-3 border-t-2 border-t-teal-500/80">
            <div class="text-[11px] font-bold text-teal-400 mono uppercase tracking-wider">DETECT LOCALLY</div>
            <div class="text-[11px] text-slate-400 mt-1">Swin V2 Tiny at point of care</div>
          </div>
          <div class="card-static rounded-xl p-3 border-t-2 border-t-cyan-500/80">
            <div class="text-[11px] font-bold text-cyan-400 mono uppercase tracking-wider">STORE LOCALLY</div>
            <div class="text-[11px] text-slate-400 mt-1">Encrypted on-device SQLite</div>
          </div>
          <div class="card-static rounded-xl p-3 border-t-2 border-t-blue-500/80">
            <div class="text-[11px] font-bold text-blue-400 mono uppercase tracking-wider">SYNC INTELLIGENTLY</div>
            <div class="text-[11px] text-slate-400 mt-1">Automatic background queue</div>
          </div>
          <div class="card-static rounded-xl p-3 border-t-2 border-t-emerald-500/80">
            <div class="text-[11px] font-bold text-emerald-400 mono uppercase tracking-wider">MONITOR CENTRALLY</div>
            <div class="text-[11px] text-slate-400 mt-1">Multi-tenant clinical dashboard</div>
          </div>
        </div>
      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 3. PROBLEM & SOLUTION SECTION -->
    <!-- ============================================================ -->
    <section id="problem" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 scroll-mt-20">
      
      <div class="text-center max-w-3xl mx-auto mb-14 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">CLINICAL CONTEXT & CHALLENGE</span>
        <h2 class="text-3xl font-extrabold text-white">The Preventable Blindness Screening Gap</h2>
        <p class="text-sm text-slate-400">Overcoming geographic, infrastructure, and specialist constraints in low-resource environments.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        <!-- Problem Card -->
        <div class="glass-card rounded-2xl p-7 space-y-5 border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mono">
              <span>CRITICAL BOTTLENECKS</span>
            </div>
            <h3 class="text-2xl font-bold text-white leading-snug">
              93+ Million Suffer from Diabetic Retinopathy. Millions Remain Unscreened.
            </h3>
            <p class="text-sm text-slate-300 leading-relaxed">
              In underserved and rural districts, patients face severe barriers to routine retinal examination. Primary Health Centres (PHCs) and community health clinics lack ophthalmologists and specialized desktop fundus cameras. Irreversible vision impairment often occurs before clinical symptoms manifest.
            </p>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span class="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
              <div>
                <div class="text-xs font-bold text-slate-200">Severe Specialist Shortage</div>
                <div class="text-xs text-slate-400">Sub-centres and primary health centres have no resident retina specialists or trained optometrists.</div>
              </div>
            </div>
            <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span class="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
              <div>
                <div class="text-xs font-bold text-slate-200">Cloud Dependency Failure</div>
                <div class="text-xs text-slate-400">Rural field clinics with intermittent or absent cellular coverage cannot use cloud-dependent AI inference.</div>
              </div>
            </div>
            <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span class="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
              <div>
                <div class="text-xs font-bold text-slate-200">Delayed Triage & Irreversible Sight Loss</div>
                <div class="text-xs text-slate-400">Patients present at tertiary centres only after sight loss is advanced and irreversible.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Solution Card -->
        <div id="solution" class="glass-card rounded-2xl p-7 space-y-5 border-l-4 border-l-teal-500 flex flex-col justify-between scroll-mt-20">
          <div class="space-y-4">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold mono">
              <span>RETINOVA APPROACH</span>
            </div>
            <h3 class="text-2xl font-bold text-white leading-snug">
              Point-of-Care Edge Decision Support & Resilient Cloud Sync
            </h3>
            <p class="text-sm text-slate-300 leading-relaxed">
              RETINOVA equips community health workers with portable fundus image acquisition and edge-AI decision support. The hierarchical Swin Transformer V2 Tiny neural network evaluates retinal imagery at the point of capture, storing rich clinical evidence locally and synchronizing when connectivity is available.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div class="text-teal-400 font-bold mono text-sm">&lt; 250ms</div>
              <div class="text-xs font-semibold text-slate-200 mt-1">Edge Decision Support</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Rapid classification guidance right at the screening station.</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div class="text-cyan-400 font-bold mono text-sm">Offline-First</div>
              <div class="text-xs font-semibold text-slate-200 mt-1">Zero Cloud Dependency</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Buffer screenings, patients, and assets without dropped sessions.</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div class="text-emerald-400 font-bold mono text-sm">Grad-CAM</div>
              <div class="text-xs font-semibold text-slate-200 mt-1">Explainable Visual Heatmaps</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Visual evidence highlighting lesion and vascular pathology.</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div class="text-blue-400 font-bold mono text-sm">Secure Sync</div>
              <div class="text-xs font-semibold text-slate-200 mt-1">District Triage Network</div>
              <div class="text-[11px] text-slate-400 mt-0.5">Encrypted synchronization to centralized clinical review portal.</div>
            </div>
          </div>
        </div>

      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 4. PIPELINE SECTION (4-Step Architecture + Connecting Flow) -->
    <!-- ============================================================ -->
    <section id="how-it-works" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 scroll-mt-20">
      
      <div class="text-center max-w-3xl mx-auto mb-6 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">4-STEP CLINICAL WORKFLOW</span>
        <h2 class="text-3xl font-extrabold text-white">How RETINOVA Screens for Diabetic Retinopathy</h2>
        <p class="text-sm text-slate-400">From point-of-care fundus acquisition to ophthalmologist referral and central monitoring.</p>
      </div>

      <!-- Connecting Flow Indicator -->
      <div class="flex items-center justify-center mb-12">
        <div class="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 mono" aria-label="Capture → Local AI → Evidence → Sync" title="Capture → Local AI → Evidence → Sync">
          <span class="sr-only">Capture → Local AI → Evidence → Sync</span>
          <span class="text-teal-400">Capture</span>
          <span class="text-slate-500">→</span>
          <span class="text-cyan-400">Local AI</span>
          <span class="text-slate-500">→</span>
          <span class="text-blue-400">Evidence</span>
          <span class="text-slate-500">→</span>
          <span class="text-emerald-400">Sync</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <!-- Step 1: Capture -->
        <div class="glass-card rounded-xl p-6 space-y-4 border-t-2 border-t-teal-500 flex flex-col justify-between flow-connector-line">
          <div>
            <div class="flex items-center justify-between text-xs mono text-teal-400 font-bold mb-3">
              <span>STAGE 01</span>
              <span class="text-slate-400">POINT OF CARE</span>
            </div>
            <div class="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">CAPTURE</h3>
            <p class="text-xs text-teal-300 font-medium mt-0.5">Fundus image acquisition</p>
            <p class="text-xs text-slate-400 leading-relaxed mt-3">
              Frontline healthcare workers acquire retinal fundus images using smartphone ophthalmoscope attachments. Real-time guidance assists in achieving proper focus, field-of-view, and illumination.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 text-[11px] mono text-slate-400">
            Input: Non-mydriatic fundus photography
          </div>
        </div>

        <!-- Step 2: Screen -->
        <div class="glass-card rounded-xl p-6 space-y-4 border-t-2 border-t-cyan-500 flex flex-col justify-between flow-connector-line">
          <div>
            <div class="flex items-center justify-between text-xs mono text-cyan-400 font-bold mb-3">
              <span>STAGE 02</span>
              <span class="text-slate-400">INFERENCE</span>
            </div>
            <div class="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">SCREEN</h3>
            <p class="text-xs text-cyan-300 font-medium mt-0.5">Swin Transformer V2 Tiny</p>
            <p class="text-xs text-slate-400 leading-relaxed mt-3">
              The Swin Transformer V2 Tiny model evaluates retinal architecture across standard ICDR classification (Grade 0: None, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative) with calibrated confidence score.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 text-[11px] mono text-slate-400">
            Model: Swin V2 Tiny backbone
          </div>
        </div>

        <!-- Step 3: Evidence -->
        <div class="glass-card rounded-xl p-6 space-y-4 border-t-2 border-t-blue-500 flex flex-col justify-between flow-connector-line">
          <div>
            <div class="flex items-center justify-between text-xs mono text-blue-400 font-bold mb-3">
              <span>STAGE 03</span>
              <span class="text-slate-400">EXPLAINABILITY</span>
            </div>
            <div class="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">EVIDENCE</h3>
            <p class="text-xs text-blue-300 font-medium mt-0.5">Grad-CAM + retinal evidence</p>
            <p class="text-xs text-slate-400 leading-relaxed mt-3">
              Gradient-weighted class activation mapping (Grad-CAM) generates spatial saliency heatmaps highlighting anatomical focal zones, vascular anomalies, and candidate lesion features for clinical transparency.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 text-[11px] mono text-slate-400">
            Output: Spatial attention maps & metrics
          </div>
        </div>

        <!-- Step 4: Refer -->
        <div class="glass-card rounded-xl p-6 space-y-4 border-t-2 border-t-emerald-500 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs mono text-emerald-400 font-bold mb-3">
              <span>STAGE 04</span>
              <span class="text-slate-400">TRIAGE</span>
            </div>
            <div class="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">REFER</h3>
            <p class="text-xs text-emerald-300 font-medium mt-0.5">Referral support for review</p>
            <p class="text-xs text-slate-400 leading-relaxed mt-3">
              Screening records are prioritized for ophthalmologist review. Sight-threatening grades trigger automated referral flags to connect patients with district hospital specialty care.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 text-[11px] mono text-slate-400">
            Outcome: Expedited specialist triage
          </div>
        </div>

      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 5. WHY RETINOVA (4 Core Cards) -->
    <!-- ============================================================ -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
      
      <div class="text-center max-w-3xl mx-auto mb-14 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">ARCHITECTURAL DESIGN</span>
        <h2 class="text-3xl font-extrabold text-white">Why RETINOVA</h2>
        <p class="text-sm text-slate-400">Engineered specifically for point-of-care environments where internet and specialized clinical resources are limited.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Card 1: Offline-First -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t border-slate-700/80">
          <div class="text-xs font-bold text-teal-400 mono uppercase tracking-wider">OFFLINE-FIRST</div>
          <h3 class="text-base font-bold text-white leading-snug">
            Designed for point-of-care environments with intermittent connectivity.
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Operates without continuous internet connectivity. Screenings, patient records, and fundus images are saved securely in local storage, guaranteeing no dropped sessions in remote locations.
          </p>
        </div>

        <!-- Card 2: Edge AI -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t border-slate-700/80">
          <div class="text-xs font-bold text-cyan-400 mono uppercase tracking-wider">EDGE AI</div>
          <h3 class="text-base font-bold text-white leading-snug">
            AI inference is intended to run locally instead of depending on a continuous cloud connection.
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            By executing inference directly on the screening device, health workers receive rapid preliminary decision support at the patient bedside without waiting for remote server round-trips.
          </p>
        </div>

        <!-- Card 3: Secure Sync -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t border-slate-700/80">
          <div class="text-xs font-bold text-blue-400 mono uppercase tracking-wider">SECURE SYNC</div>
          <h3 class="text-base font-bold text-white leading-snug">
            Results and evidence synchronize with the cloud when connectivity returns.
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            An intelligent background synchronization engine validates data integrity with cryptographic hashes and replicates records to the central cloud repository as soon as network access is detected.
          </p>
        </div>

        <!-- Card 4: Clinical Workflow -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t border-slate-700/80">
          <div class="text-xs font-bold text-emerald-400 mono uppercase tracking-wider">CLINICAL WORKFLOW</div>
          <h3 class="text-base font-bold text-white leading-snug">
            Screen → review evidence → referral support → centralized monitoring.
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Structured workflow connects community health workers with district hospital ophthalmologists, ensuring explainable evidence review and timely clinical follow-up for patients in need.
          </p>
        </div>

      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 6. EDGE + CLOUD ARCHITECTURE VISUALIZATION -->
    <!-- ============================================================ -->
    <section id="architecture" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 scroll-mt-20">
      
      <div class="text-center max-w-3xl mx-auto mb-14 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">SYSTEM BLUEPRINT</span>
        <h2 class="text-3xl font-extrabold text-white">Edge + Cloud Architecture</h2>
        <p class="text-sm text-slate-400">Structured dataflow from optical point-of-care image acquisition to centralized cloud clinical governance.</p>
      </div>

      <!-- Architecture Visualization Diagram -->
      <div class="max-w-4xl mx-auto space-y-4">
        
        <!-- Step 1: Retinal Image Input -->
        <div class="flex flex-col items-center">
          <div class="w-full sm:w-80 p-4 rounded-xl bg-slate-900/90 border border-teal-500/40 text-center shadow-lg shadow-teal-950/20">
            <div class="inline-flex items-center gap-2 text-xs font-bold text-teal-400 mono uppercase tracking-wider">
              <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              RETINAL IMAGE
            </div>
            <div class="text-xs text-slate-300 mt-1">High-resolution fundus capture from handheld optic adapter</div>
          </div>
          
          <!-- Downward Arrow -->
          <div class="h-8 w-0.5 bg-gradient-to-b from-teal-500 to-cyan-500 relative flex items-center justify-center">
            <div class="absolute bottom-0 translate-y-1/2 w-2 h-2 border-r-2 border-b-2 border-cyan-400 rotate-45"></div>
          </div>
        </div>

        <!-- Step 2: Local Edge Device Container -->
        <div class="glass-card rounded-2xl p-6 sm:p-7 border border-cyan-500/30 shadow-2xl relative">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-5">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full bg-cyan-400"></div>
              <span class="text-sm font-bold text-white mono uppercase tracking-wide">LOCAL DEVICE (EDGE RUNTIME)</span>
            </div>
            <span class="text-xs text-cyan-300 mono bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">Point-of-Care Hardware</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-slate-200">Quality Check</div>
              <div class="text-[10px] text-slate-400 mt-0.5">FOV & blur validation</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-slate-200">Preprocessing</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Luminance & contrast</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
              <div class="text-xs font-bold text-teal-400">Swin V2 Tiny</div>
              <div class="text-[10px] text-slate-400 mt-0.5">DR grade 0–4 inference</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-cyan-400">Grad-CAM</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Saliency attention map</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
              <div class="text-xs font-bold text-emerald-400">Evidence</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Lesion & vessel pack</div>
            </div>
          </div>
        </div>

        <!-- Step 3: Local Storage -->
        <div class="flex flex-col items-center">
          <div class="h-8 w-0.5 bg-gradient-to-b from-cyan-500 to-blue-500 relative flex items-center justify-center">
            <div class="absolute bottom-0 translate-y-1/2 w-2 h-2 border-r-2 border-b-2 border-blue-400 rotate-45"></div>
          </div>
          
          <div class="w-full sm:w-80 p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/40 text-center">
            <div class="text-xs font-bold text-blue-400 mono uppercase tracking-wider">LOCAL STORAGE</div>
            <div class="text-[11px] text-slate-300 mt-0.5">Encrypted local SQLite & tamper-resistant cache</div>
          </div>

          <div class="h-8 w-0.5 bg-gradient-to-b from-blue-500 to-emerald-500 relative flex items-center justify-center">
            <div class="absolute bottom-0 translate-y-1/2 w-2 h-2 border-r-2 border-b-2 border-emerald-400 rotate-45"></div>
          </div>
        </div>

        <!-- Step 4: Sync Channel Indicator -->
        <div class="flex justify-center">
          <div class="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300 mono">
            <svg class="w-4 h-4 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2" stroke-dasharray="32" stroke-linecap="round"/></svg>
            SYNC WHEN ONLINE (Intelligent Background Engine)
          </div>
        </div>

        <div class="flex flex-col items-center">
          <div class="h-8 w-0.5 bg-gradient-to-b from-emerald-500 to-teal-500 relative flex items-center justify-center">
            <div class="absolute bottom-0 translate-y-1/2 w-2 h-2 border-r-2 border-b-2 border-teal-400 rotate-45"></div>
          </div>
        </div>

        <!-- Step 5: RETINOVA Cloud Container -->
        <div class="glass-card rounded-2xl p-6 sm:p-7 border border-teal-500/30 shadow-2xl relative">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-5">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full bg-teal-400"></div>
              <span class="text-sm font-bold text-white mono uppercase tracking-wide">RETINOVA CLOUD</span>
            </div>
            <span class="text-xs text-teal-300 mono bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/20">Render Managed Infrastructure</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-white">PostgreSQL</div>
              <div class="text-[10px] text-slate-400 mt-1">Multi-tenant clinical registry & relational sync</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-white">Secure S3</div>
              <div class="text-[10px] text-slate-400 mt-1">Encrypted retinal fundus image vault</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-white">Audit Trail</div>
              <div class="text-[10px] text-slate-400 mt-1">Immutable access & operational telemetry</div>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="text-xs font-bold text-teal-400">Dashboard</div>
              <div class="text-[10px] text-slate-400 mt-1">Specialist triage & district surveillance</div>
            </div>
          </div>
        </div>

      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 7. SECURITY & GOVERNANCE SECTION -->
    <!-- ============================================================ -->
    <section id="security" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 scroll-mt-20">
      
      <div class="text-center max-w-3xl mx-auto mb-14 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">ENTERPRISE DATA GOVERNANCE</span>
        <h2 class="text-3xl font-extrabold text-white">Healthcare Security & Compliance</h2>
        <p class="text-sm text-slate-400">Engineered with rigorous defense-in-depth principles to safeguard patient confidentiality and clinical data integrity.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <!-- Security Feature 1 -->
        <div class="glass-card rounded-2xl p-6 space-y-3">
          <div class="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <h3 class="text-base font-bold text-white">Tenant-Isolated Architecture</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Strict organization-level partitioning ensures healthcare networks, district health societies, and partner clinics access only their authorized screening cohorts and devices.
          </p>
        </div>

        <!-- Security Feature 2 -->
        <div class="glass-card rounded-2xl p-6 space-y-3">
          <div class="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          </div>
          <h3 class="text-base font-bold text-white">Role-Based Access Control (RBAC)</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Enforces strict operational boundaries between Field Health Workers, Healthcare Admins, Ophthalmologist Reviewers, and System Superadmins.
          </p>
        </div>

        <!-- Security Feature 3 -->
        <div class="glass-card rounded-2xl p-6 space-y-3">
          <div class="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
          </div>
          <h3 class="text-base font-bold text-white">Private Evidence Storage</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Raw fundus captures and generated Grad-CAM heatmaps are secured in encrypted object storage. Asset retrieval uses time-limited, pre-signed URLs.
          </p>
        </div>

        <!-- Security Feature 4 -->
        <div class="glass-card rounded-2xl p-6 space-y-3">
          <div class="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
          </div>
          <h3 class="text-base font-bold text-white">Secure API Authentication</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            API endpoints enforce cryptographically signed JSON Web Tokens (JWT) with device credential validation, rate limiting, and CORS origin whitelisting.
          </p>
        </div>

        <!-- Security Feature 5 -->
        <div class="glass-card rounded-2xl p-6 space-y-3">
          <div class="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <h3 class="text-base font-bold text-white">Audit Trail</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Every clinical screening upload, login event, model version update, and cross-tenant inquiry is logged with immutable timestamps, actor IDs, and IP provenance.
          </p>
        </div>

        <!-- Security Feature 6 -->
        <div class="glass-card rounded-2xl p-6 space-y-3">
          <div class="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          </div>
          <h3 class="text-base font-bold text-white">Offline-First Local Workflow</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Field screening data remains guarded on physical device storage. Patient telemetry is queued and transmitted only over secure TLS connections upon reconnection.
          </p>
        </div>

      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 8. PLATFORM ECOSYSTEM SECTION -->
    <!-- ============================================================ -->
    <section id="platform" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 scroll-mt-20">
      
      <div class="text-center max-w-3xl mx-auto mb-14 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">ECOSYSTEM OVERVIEW</span>
        <h2 class="text-3xl font-extrabold text-white">The RETINOVA Platform</h2>
        <p class="text-sm text-slate-400">An integrated software and intelligence stack connecting field screening to clinical oversight.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Platform Component 1 -->
        <div class="glass-card rounded-2xl p-6 space-y-4 border-t-2 border-t-teal-500 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">Android Field Application</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Touch-optimized mobile APK tailored for ASHA and frontline screeners. Includes guided camera capture, patient intake forms, offline storage, and automatic sync management.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] mono">
            <span class="text-slate-400">Client APK</span>
            <a href="/install" class="text-teal-400 hover:underline font-semibold">Install APK →</a>
          </div>
        </div>

        <!-- Platform Component 2 -->
        <div class="glass-card rounded-2xl p-6 space-y-4 border-t-2 border-t-cyan-500 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">AI Inference Layer</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Swin Transformer V2 Tiny neural network with vision backbone and multi-scale Grad-CAM class activation mapping for explainable diabetic retinopathy triage.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] mono">
            <span class="text-slate-400">Model Core</span>
            <span class="text-cyan-400 font-semibold">Swin V2 Tiny</span>
          </div>
        </div>

        <!-- Platform Component 3 -->
        <div class="glass-card rounded-2xl p-6 space-y-4 border-t-2 border-t-blue-500 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">Cloud Gateway</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              High-throughput Node.js & Express synchronization microservices deployed on Render with PostgreSQL multi-tenant registry, AWS S3 evidence archiving, and JWT authorization.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] mono">
            <span class="text-slate-400">Render Cloud</span>
            <a href="/health" target="_blank" class="text-blue-400 hover:underline font-semibold">API /health →</a>
          </div>
        </div>

        <!-- Platform Component 4 -->
        <div class="glass-card rounded-2xl p-6 space-y-4 border-t-2 border-t-emerald-500 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h3 class="text-base font-bold text-white">Clinical Dashboard</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Real-time surveillance console for ophthalmologists and public health supervisors to review screening evidence, confirm referrals, analyze epidemiological trends, and export reports.
            </p>
          </div>
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] mono">
            <span class="text-slate-400">Command Center</span>
            <a href="/dashboard" class="text-emerald-400 hover:underline font-semibold">Open Live →</a>
          </div>
        </div>

      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 9. BUSINESS MODEL SECTION (Deploy → Configure → Operate → Support) -->
    <!-- ============================================================ -->
    <section id="business-model" class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 scroll-mt-20">
      
      <div class="text-center max-w-3xl mx-auto mb-14 space-y-2">
        <span class="text-xs font-bold uppercase tracking-wider text-teal-400 mono">COMMERCIAL ENGAGEMENT MODEL</span>
        <h2 class="text-3xl font-extrabold text-white">Deploy → Configure → Operate → Support</h2>
        <p class="text-sm text-slate-400">A clear, transparent lifecycle structure tailored for district health programs, hospital networks, and screening initiatives.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Step 1: Deploy -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t-2 border-t-slate-600">
          <div class="text-xs font-bold text-slate-400 mono uppercase tracking-wider">PHASE 01 • IMPLEMENTATION</div>
          <h3 class="text-base font-bold text-white">1. Deploy</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Hardware compatibility assessment, optical adapter provisioning, mobile application distribution, and frontline health worker operational training.
          </p>
        </div>

        <!-- Step 2: Configure -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t-2 border-t-cyan-500">
          <div class="text-xs font-bold text-cyan-400 mono uppercase tracking-wider">PHASE 02 • SETUP</div>
          <h3 class="text-base font-bold text-white">2. Configure</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Tenant provisioning, district hospital referral network mapping, RBAC role assignment, and localized clinical protocol threshold settings.
          </p>
        </div>

        <!-- Step 3: Operate -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t-2 border-t-teal-500">
          <div class="text-xs font-bold text-teal-400 mono uppercase tracking-wider">PHASE 03 • PLATFORM LICENSE</div>
          <h3 class="text-base font-bold text-white">3. Operate</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Annual recurring software licensing covering edge screening assistance, encrypted cloud sync pipelines, and clinical triage dashboard access.
          </p>
        </div>

        <!-- Step 4: Support -->
        <div class="glass-card rounded-2xl p-6 space-y-3 border-t-2 border-t-emerald-500">
          <div class="text-xs font-bold text-emerald-400 mono uppercase tracking-wider">PHASE 04 • MAINTENANCE & SUPPORT</div>
          <h3 class="text-base font-bold text-white">4. Support</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Ongoing Annual Maintenance Contract (AMC), model performance telemetry monitoring, over-the-air software updates, and dedicated technical SLAs.
          </p>
        </div>

      </div>

      <div class="mt-8 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400 max-w-3xl mx-auto">
        <span class="text-teal-400 font-semibold">Institutional Deployment:</span> Commercial pilots and multi-district rollouts are configured collaboratively with state health authorities, medical colleges, and non-profit eye care networks.
      </div>

    </section>


    <!-- ============================================================ -->
    <!-- 10. FINAL CALL TO ACTION SECTION -->
    <!-- ============================================================ -->
    <section class="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-800/80 text-center relative">
      <div class="subtle-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70"></div>
      
      <div class="relative z-10 space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-300 mono">
          <span>POINT-OF-CARE RETINAL AI</span>
        </div>

        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Build a smarter retinal screening workflow.
        </h2>

        <p class="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Deploy edge-AI decision support to identify diabetic retinopathy early, safeguard patient vision, and seamlessly connect primary health clinics to specialist care.
        </p>

        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/dashboard" class="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all shadow-xl shadow-teal-950/60 flex items-center justify-center gap-2">
            <span>Explore Platform</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
          <a href="/install" class="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/90 rounded-xl transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Install APK</span>
          </a>
        </div>
      </div>
    </section>

  </main>

  <!-- ============================================================ -->
  <!-- 11. FOOTER -->
  <!-- ============================================================ -->
  <footer class="glass-nav border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-10 mt-auto text-xs text-slate-400">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2.5">
            <div class="h-6 w-6 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M3 12c2.5-5 6.5-8 9-8s6.5 3 9 8c-2.5 5-6.5 8-9 8s-6.5-3-9-8z"/></svg>
            </div>
            <span class="text-sm font-bold text-white tracking-tight">RETINOVA</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold mono">CLINICAL DECISION SUPPORT</span>
          </div>
          <p class="text-slate-400 max-w-md text-xs">
            Edge-AI clinical decision support for diabetic retinopathy screening. Detect locally • Store locally • Sync intelligently • Monitor centrally.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs font-semibold mono">
          <a href="/dashboard" class="text-teal-400 hover:text-teal-300 transition">Clinical Dashboard</a>
          <span class="text-slate-700">•</span>
          <a href="/install" class="text-teal-400 hover:text-teal-300 transition">Install APK</a>
          <span class="text-slate-700">•</span>
          <a href="/health" target="_blank" class="text-teal-400 hover:text-teal-300 transition">System Status</a>
          <span class="text-slate-700">•</span>
          <a href="/api/screenings" class="text-teal-400 hover:text-teal-300 transition">Screening API</a>
        </div>
      </div>

      <!-- Regulatory & Medical Notice -->
      <div class="pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
        <p>
          <span class="text-slate-300 font-semibold">Clinical Decision Support Notice:</span> RETINOVA is designed as an edge-AI clinical decision support platform for diabetic retinopathy screening assistance. Final diagnostic determination and patient management remain the sole responsibility of qualified healthcare practitioners and ophthalmologists.
        </p>
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-[10px] text-slate-400">
          <span>&copy; 2026 RETINOVA. All rights reserved.</span>
          <span class="mono">Architecture: Edge AI • Offline-First • Secure Cloud Sync</span>
        </div>
      </div>

    </div>
  </footer>

  <!-- Light Vanilla Script for Responsive Hamburger Menu -->
  <script>
    (function() {
      const btn = document.getElementById('mobileMenuBtn');
      const menu = document.getElementById('mobileMenu');
      if (btn && menu) {
        btn.addEventListener('click', function() {
          const isHidden = menu.classList.contains('hidden');
          if (isHidden) {
            menu.classList.remove('hidden');
          } else {
            menu.classList.add('hidden');
          }
        });
        // Auto-close menu when link clicked
        const links = menu.querySelectorAll('a');
        links.forEach(function(l) {
          l.addEventListener('click', function() {
            menu.classList.add('hidden');
          });
        });
      }
    })();
  </script>

</body>
</html>`;
}
