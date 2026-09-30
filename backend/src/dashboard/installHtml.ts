// ============================================================
// RETINOVA EDGE AI PLATFORM — Install & Sideload Portal
// Instant QR Code Download & Installation Guide for Android
// ============================================================

export function getInstallHtml(hostIp: string, port: number = 5000): string {
  const isCloud = hostIp.includes('onrender.com') || hostIp.includes('herokuapp.com') || hostIp.startsWith('https');
  const protocol = isCloud ? 'https' : 'http';
  const cleanHost = hostIp.replace(/^https?:\/\//, '');
  const apkUrl = cleanHost.includes(':') || isCloud
    ? `${protocol}://${cleanHost}/download/apk`
    : `${protocol}://${cleanHost}:${port}/download/apk`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(apkUrl)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install RETINOVA — Offline Edge AI APK</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0B0F19; color: #E2E8F0; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen p-6 flex flex-col items-center justify-center">

  <div class="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">

    <!-- Header Badge -->
    <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
          <svg class="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-white tracking-tight">RETINOVA Edge AI</h1>
          <p class="text-xs text-slate-400">Standalone Android Release APK (79.7 MB)</p>
        </div>
      </div>
      <span class="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        v3.0.0 Production
      </span>
    </div>

    <!-- QR Code & Direct Download -->
    <div class="flex flex-col sm:flex-row items-center gap-6 bg-slate-950 p-5 rounded-xl border border-slate-800/80 mb-6">
      <div class="p-2 bg-white rounded-lg shadow-md shrink-0">
        <img src="${qrUrl}" alt="Scan to download APK" class="w-36 h-36" />
      </div>
      <div class="space-y-3 text-center sm:text-left flex-1">
        <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Scan with Phone Camera</div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Point your phone camera at the QR code to download the standalone release APK over local Wi-Fi.
        </p>
        <div class="flex flex-col gap-2">
          <a href="/download/apk" download class="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-all shadow-lg shadow-teal-600/30">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Download NetraAI_ASHA.apk (79.7 MB)
          </a>
          <a href="/dashboard" class="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs rounded-lg border border-teal-500/30 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            ⚡ Open Cloud Surveillance Dashboard
          </a>
        </div>
      </div>
    </div>

    <!-- Step by Step Sideloading Guide -->
    <div class="space-y-3">
      <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Installation & Demo Guide</h2>
      
      <div class="space-y-2 text-xs text-slate-300">
        <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[11px]">1</span>
          <span><strong>Install Package:</strong> Tap the downloaded file in your Notifications or Files &gt; Downloads. When prompted with "Install unknown apps", tap <strong>Settings &gt; Allow from this source</strong>.</span>
        </div>

        <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[11px]">2</span>
          <span><strong>Grant Camera Permission:</strong> Launch RETINOVA and tap <strong>Allow</strong> when requested for Camera access.</span>
        </div>

        <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[11px]">3</span>
          <span><strong>Offline AI Inference:</strong> Turn <strong>OFF</strong> Wi-Fi and Mobile Data on the phone. Capture a fundus scan or image. The Swin V2 Tiny model runs 100% locally and classifies severity into local Room DB.</span>
        </div>

        <div class="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[11px]">4</span>
          <span><strong>AWS Synchronization:</strong> Turn Wi-Fi back <strong>ON</strong>. The SyncManager immediately uploads pending events to DynamoDB &amp; S3, updating the Cloud Command Center in real time!</span>
        </div>
      </div>
    </div>

    <!-- Footer Links -->
    <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
      <a href="/dashboard" class="text-teal-400 hover:underline flex items-center gap-1">
        ← Open Command Center Dashboard
      </a>
      <span class="mono">Host: ${hostIp}</span>
    </div>

  </div>

</body>
</html>`;
}
