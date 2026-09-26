import fs from 'fs';
import path from 'path';

/**
 * Generates realistic SVG-based retinal fundus images and AI visual overlays
 * (Original, Enhanced, Vessel Segmentation, Lesion Candidate Mask, Grad-CAM heatmap)
 */
export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function generateFundusSvg(grade: number, eye: 'left' | 'right' = 'left', type: 'original' | 'enhanced' | 'vessels' | 'lesions' | 'gradcam' | 'combined' = 'original'): string {
  const width = 600;
  const height = 600;
  const cx = 300;
  const cy = 300;
  const r = 260;

  // Optic disc position (nasal side)
  const odX = eye === 'left' ? 440 : 160;
  const odY = 300;
  const maculaX = eye === 'left' ? 240 : 360;
  const maculaY = 300;

  // Background and base tones
  let bgGradient = '';
  let vesselColor = '';
  let vesselOpacity = 0.85;
  let showOpticDisc = true;
  let showMacula = true;
  let showLesions = grade > 0;
  let showGradcam = false;

  if (type === 'original') {
    bgGradient = `
      <radialGradient id="retinaBg" cx="45%" cy="48%" r="55%">
        <stop offset="0%" stop-color="#b83818" />
        <stop offset="40%" stop-color="#94260e" />
        <stop offset="85%" stop-color="#5a1306" />
        <stop offset="100%" stop-color="#2a0601" />
      </radialGradient>
    `;
    vesselColor = '#520d04';
  } else if (type === 'enhanced') {
    // CLAHE contrast enhancement: deeper contrast, sharpened vessels, clearer background
    bgGradient = `
      <radialGradient id="retinaBg" cx="45%" cy="48%" r="55%">
        <stop offset="0%" stop-color="#c9441a" />
        <stop offset="40%" stop-color="#a0290a" />
        <stop offset="85%" stop-color="#4a0e03" />
        <stop offset="100%" stop-color="#190300" />
      </radialGradient>
    `;
    vesselColor = '#2b0400';
    vesselOpacity = 0.95;
  } else if (type === 'vessels') {
    // Vessel mask binary segmentation: Black background, Bright Cyan/White vessels
    bgGradient = `
      <linearGradient id="retinaBg">
        <stop offset="0%" stop-color="#020617" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
    `;
    vesselColor = '#38bdf8';
    vesselOpacity = 1.0;
    showOpticDisc = false;
    showMacula = false;
    showLesions = false;
  } else if (type === 'lesions') {
    // Lesion mask binary segmentation
    bgGradient = `
      <linearGradient id="retinaBg">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="100%" stop-color="#090d16" />
      </linearGradient>
    `;
    vesselColor = '#1e293b';
    vesselOpacity = 0.3;
    showOpticDisc = false;
    showMacula = false;
    showLesions = true;
  } else if (type === 'gradcam') {
    // Grad-CAM heatmap over dark base
    bgGradient = `
      <radialGradient id="retinaBg" cx="45%" cy="48%" r="55%">
        <stop offset="0%" stop-color="#601808" />
        <stop offset="85%" stop-color="#2a0802" />
        <stop offset="100%" stop-color="#0a0201" />
      </radialGradient>
    `;
    vesselColor = '#3a0802';
    vesselOpacity = 0.4;
    showGradcam = true;
  } else {
    // Combined
    bgGradient = `
      <radialGradient id="retinaBg" cx="45%" cy="48%" r="55%">
        <stop offset="0%" stop-color="#b83818" />
        <stop offset="70%" stop-color="#7a1c09" />
        <stop offset="100%" stop-color="#2a0601" />
      </radialGradient>
    `;
    vesselColor = '#38bdf8';
    vesselOpacity = 0.85;
    showGradcam = true;
  }

  // Generate vessel network paths branching from Optic Disc
  const branchSign = eye === 'left' ? -1 : 1;
  const vessels = `
    <!-- Main Superior Arcades -->
    <path d="M ${odX} ${odY} C ${odX + branchSign * 40} ${odY - 90}, ${odX + branchSign * 110} ${odY - 140}, ${odX + branchSign * 190} ${odY - 110} S ${odX + branchSign * 240} ${odY - 60}, ${odX + branchSign * 270} ${odY - 30}" fill="none" stroke="${vesselColor}" stroke-width="7" stroke-linecap="round" opacity="${vesselOpacity}"/>
    <path d="M ${odX + branchSign * 90} ${odY - 120} C ${odX + branchSign * 120} ${odY - 180}, ${odX + branchSign * 170} ${odY - 200}, ${odX + branchSign * 210} ${odY - 180}" fill="none" stroke="${vesselColor}" stroke-width="4.5" stroke-linecap="round" opacity="${vesselOpacity}"/>
    <path d="M ${odX + branchSign * 150} ${odY - 130} C ${odX + branchSign * 160} ${odY - 90}, ${odX + branchSign * 180} ${odY - 70}, ${maculaX} ${maculaY - 30}" fill="none" stroke="${vesselColor}" stroke-width="3" stroke-linecap="round" opacity="${vesselOpacity * 0.9}"/>
    
    <!-- Main Inferior Arcades -->
    <path d="M ${odX} ${odY} C ${odX + branchSign * 40} ${odY + 90}, ${odX + branchSign * 110} ${odY + 140}, ${odX + branchSign * 190} ${odY + 110} S ${odX + branchSign * 240} ${odY + 60}, ${odX + branchSign * 270} ${odY + 30}" fill="none" stroke="${vesselColor}" stroke-width="6.5" stroke-linecap="round" opacity="${vesselOpacity}"/>
    <path d="M ${odX + branchSign * 90} ${odY + 120} C ${odX + branchSign * 120} ${odY + 180}, ${odX + branchSign * 170} ${odY + 200}, ${odX + branchSign * 210} ${odY + 180}" fill="none" stroke="${vesselColor}" stroke-width="4" stroke-linecap="round" opacity="${vesselOpacity}"/>
    <path d="M ${odX + branchSign * 150} ${odY + 130} C ${odX + branchSign * 160} ${odY + 90}, ${odX + branchSign * 180} ${odY + 70}, ${maculaX} ${maculaY + 30}" fill="none" stroke="${vesselColor}" stroke-width="3" stroke-linecap="round" opacity="${vesselOpacity * 0.9}"/>

    <!-- Nasal Arcades -->
    <path d="M ${odX} ${odY} C ${odX - branchSign * 30} ${odY - 40}, ${odX - branchSign * 70} ${odY - 60}, ${odX - branchSign * 100} ${odY - 50}" fill="none" stroke="${vesselColor}" stroke-width="4.5" stroke-linecap="round" opacity="${vesselOpacity}"/>
    <path d="M ${odX} ${odY} C ${odX - branchSign * 30} ${odY + 40}, ${odX - branchSign * 70} ${odY + 60}, ${odX - branchSign * 100} ${odY + 50}" fill="none" stroke="${vesselColor}" stroke-width="4" stroke-linecap="round" opacity="${vesselOpacity}"/>
    
    <!-- Micro-vessels & branches -->
    <path d="M ${odX + branchSign * 60} ${odY - 70} q 20 -20 40 -15" fill="none" stroke="${vesselColor}" stroke-width="2.5" opacity="${vesselOpacity * 0.8}"/>
    <path d="M ${odX + branchSign * 80} ${odY + 70} q 25 20 45 10" fill="none" stroke="${vesselColor}" stroke-width="2.5" opacity="${vesselOpacity * 0.8}"/>
  `;

  // Lesions generator based on DR Grade (Microaneurysms, Exudates, Hemorrhages, Neovascularization)
  let lesionsSvg = '';
  if (showLesions) {
    const isLesionMask = type === 'lesions';
    const maColor = isLesionMask ? '#ef4444' : '#690a04'; // Microaneurysms / dot hemorrhages
    const exColor = isLesionMask ? '#eab308' : '#fef08a'; // Hard exudates
    const cwsColor = isLesionMask ? '#f97316' : '#fde68a'; // Cotton wool spots / soft exudates
    const neoColor = isLesionMask ? '#ec4899' : '#450a0a'; // Neovascularization

    if (grade === 1) {
      // Mild DR: few microaneurysms
      lesionsSvg = `
        <circle cx="${maculaX + 35}" cy="${maculaY - 20}" r="3" fill="${maColor}" ${isLesionMask ? 'stroke="#ffffff" stroke-width="1"' : ''}/>
        <circle cx="${maculaX - 30}" cy="${maculaY + 25}" r="3.5" fill="${maColor}" ${isLesionMask ? 'stroke="#ffffff" stroke-width="1"' : ''}/>
        <circle cx="${maculaX + 50}" cy="${maculaY + 15}" r="2.8" fill="${maColor}" ${isLesionMask ? 'stroke="#ffffff" stroke-width="1"' : ''}/>
      `;
    } else if (grade === 2) {
      // Moderate DR: Microaneurysms, blot hemorrhages, hard exudates
      lesionsSvg = `
        <!-- Microaneurysms & Blot hemorrhages -->
        <circle cx="${maculaX + 35}" cy="${maculaY - 20}" r="3.5" fill="${maColor}"/>
        <circle cx="${maculaX - 30}" cy="${maculaY + 25}" r="4" fill="${maColor}"/>
        <ellipse cx="${maculaX + 60}" cy="${maculaY - 40}" rx="6" ry="4" fill="${maColor}"/>
        <ellipse cx="${maculaX - 45}" cy="${maculaY - 30}" rx="5" ry="3.5" fill="${maColor}"/>
        <!-- Hard Exudates -->
        <polygon points="${maculaX+20},${maculaY-50} ${maculaX+25},${maculaY-48} ${maculaX+23},${maculaY-44} ${maculaX+18},${maculaY-46}" fill="${exColor}"/>
        <polygon points="${maculaX+28},${maculaY-46} ${maculaX+34},${maculaY-44} ${maculaX+31},${maculaY-40} ${maculaX+26},${maculaY-42}" fill="${exColor}"/>
        <polygon points="${maculaX+36},${maculaY-42} ${maculaX+42},${maculaY-40} ${maculaX+39},${maculaY-36} ${maculaX+34},${maculaY-38}" fill="${exColor}"/>
      `;
    } else if (grade === 3) {
      // Severe DR: Multiple hemorrhages (4 quadrants), venous beading, cotton wool spots
      lesionsSvg = `
        <!-- Multiple Blot Hemorrhages -->
        <ellipse cx="${maculaX + 35}" cy="${maculaY - 40}" rx="9" ry="6" fill="${maColor}"/>
        <ellipse cx="${maculaX - 50}" cy="${maculaY + 45}" rx="11" ry="7" fill="${maColor}"/>
        <ellipse cx="${maculaX + 80}" cy="${maculaY + 60}" rx="8" ry="5.5" fill="${maColor}"/>
        <ellipse cx="${maculaX - 60}" cy="${maculaY - 60}" rx="10" ry="7" fill="${maColor}"/>
        <!-- Cotton Wool Spots -->
        <circle cx="${maculaX - 25}" cy="${maculaY - 50}" r="8" fill="${cwsColor}" opacity="0.8"/>
        <circle cx="${maculaX + 50}" cy="${maculaY + 40}" r="7" fill="${cwsColor}" opacity="0.8"/>
        <!-- Clusters of Exudates -->
        <g fill="${exColor}">
          <circle cx="${maculaX + 15}" cy="${maculaY - 25}" r="3"/>
          <circle cx="${maculaX + 22}" cy="${maculaY - 22}" r="3.5"/>
          <circle cx="${maculaX + 18}" cy="${maculaY - 18}" r="2.8"/>
          <circle cx="${maculaX + 26}" cy="${maculaY - 28}" r="3.2"/>
        </g>
      `;
    } else if (grade === 4) {
      // Proliferative DR: Neovascularization, vitreous/preretinal hemorrhages, extensive lesions
      lesionsSvg = `
        <!-- Extensive Hemorrhages -->
        <ellipse cx="${maculaX + 20}" cy="${maculaY - 30}" rx="16" ry="10" fill="${maColor}"/>
        <ellipse cx="${maculaX - 45}" cy="${maculaY + 35}" rx="18" ry="12" fill="${maColor}"/>
        <ellipse cx="${odX - branchSign * 20}" cy="${odY - 30}" rx="14" ry="9" fill="${maColor}"/>
        <!-- Neovascularization fronds near disc -->
        <path d="M ${odX} ${odY - 10} C ${odX - 15} ${odY - 40}, ${odX + 25} ${odY - 55}, ${odX + 5} ${odY - 70}" fill="none" stroke="${neoColor}" stroke-width="3" stroke-dasharray="2 1"/>
        <path d="M ${odX} ${odY + 10} C ${odX - 20} ${odY + 45}, ${odX + 30} ${odY + 60}, ${odX - 5} ${odY + 80}" fill="none" stroke="${neoColor}" stroke-width="3" stroke-dasharray="2 1"/>
        <!-- Large Exudates Ring (Circinate Retinopathy) -->
        <g fill="${exColor}">
          <circle cx="${maculaX + 30}" cy="${maculaY - 50}" r="4"/>
          <circle cx="${maculaX + 45}" cy="${maculaY - 45}" r="4.5"/>
          <circle cx="${maculaX + 55}" cy="${maculaY - 30}" r="5"/>
          <circle cx="${maculaX + 50}" cy="${maculaY - 15}" r="4"/>
          <circle cx="${maculaX + 40}" cy="${maculaY + 5}" r="4.5"/>
          <circle cx="${maculaX + 20}" cy="${maculaY + 15}" r="4"/>
        </g>
      `;
    }
  }

  // Grad-CAM Heatmap overlay (Jet / Turbo colormap simulation)
  let gradcamSvg = '';
  if (showGradcam || type === 'gradcam') {
    const focusX = grade === 0 ? maculaX : (grade >= 3 ? (maculaX + odX) / 2 : maculaX + 20);
    const focusY = grade === 0 ? maculaY : (grade >= 3 ? maculaY - 20 : maculaY - 15);
    const focusR = grade === 0 ? 70 : (grade >= 3 ? 140 : 100);

    gradcamSvg = `
      <defs>
        <!-- Jet Colormap Heatmap Filter -->
        <radialGradient id="camHeatmap" cx="${focusX}" cy="${focusY}" r="${focusR}" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.85" />   <!-- High attention (Red) -->
          <stop offset="35%" stop-color="#f97316" stop-opacity="0.75" />  <!-- Orange -->
          <stop offset="60%" stop-color="#eab308" stop-opacity="0.60" />  <!-- Yellow -->
          <stop offset="80%" stop-color="#22c55e" stop-opacity="0.40" />  <!-- Green -->
          <stop offset="95%" stop-color="#3b82f6" stop-opacity="0.20" />  <!-- Blue -->
          <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />   <!-- Transparent -->
        </radialGradient>
      </defs>
      <circle cx="${focusX}" cy="${focusY}" r="${focusR}" fill="url(#camHeatmap)" style="mix-blend-mode: screen;" />
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <defs>
        ${bgGradient}
        <clipPath id="retinaClip">
          <circle cx="${cx}" cy="${cy}" r="${r}" />
        </clipPath>
      </defs>

      <!-- Black surrounding mask -->
      <rect width="${width}" height="${height}" fill="#020617" />

      <!-- Main Fundus Aperture -->
      <g clip-path="url(#retinaClip)">
        <rect width="${width}" height="${height}" fill="url(#retinaBg)" />

        ${showOpticDisc ? `
          <!-- Optic Disc -->
          <ellipse cx="${odX}" cy="${odY}" rx="32" ry="40" fill="#fed7aa" opacity="0.95" />
          <ellipse cx="${odX + (eye === 'left' ? -4 : 4)}" cy="${odY}" rx="18" ry="24" fill="#ffedd5" opacity="0.9" />
        ` : ''}

        ${showMacula ? `
          <!-- Fovea / Macula -->
          <ellipse cx="${maculaX}" cy="${maculaY}" rx="38" ry="38" fill="#430b04" opacity="0.7" />
          <circle cx="${maculaX}" cy="${maculaY}" r="6" fill="#260401" opacity="0.85" />
        ` : ''}

        <!-- Retinal Vessel Tree -->
        ${vessels}

        <!-- Lesion Candidates -->
        ${lesionsSvg}

        <!-- Grad-CAM Attention Heatmap -->
        ${gradcamSvg}
      </g>

      <!-- Retinal Aperture Ring Boundary -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#334155" stroke-width="3" opacity="0.4" />
    </svg>
  `;
}

/**
 * Ensures initial static assets for all grades exist in storage directory
 */
export function initializeSampleImages(storageDir: string) {
  ensureDirectoryExists(storageDir);

  const sampleGrades = [0, 1, 2, 3, 4];
  const types: Array<'original' | 'enhanced' | 'vessels' | 'lesions' | 'gradcam' | 'combined'> = [
    'original', 'enhanced', 'vessels', 'lesions', 'gradcam', 'combined'
  ];
  const eyes: Array<'left' | 'right'> = ['left', 'right'];

  for (const grade of sampleGrades) {
    for (const eye of eyes) {
      for (const t of types) {
        const filename = `fundus_g${grade}_${eye}_${t}.svg`;
        const filePath = path.join(storageDir, filename);
        if (!fs.existsSync(filePath)) {
          const svgContent = generateFundusSvg(grade, eye, t);
          fs.writeFileSync(filePath, svgContent, 'utf-8');
        }
      }
    }
  }
}
