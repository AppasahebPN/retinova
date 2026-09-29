import fs from 'fs';
import path from 'path';

// ============================================================
// RETINOVA PLATFORM — Unified Web Experience
// Figma-Crafted Healthcare & Enterprise Cloud Console
// Authentic Design System, Real Backend API Integration & RBAC
// ============================================================

export function getDashboardHtml(): string {
  const candidatePaths = [
    path.join(__dirname, 'dashboard.html'),
    path.join(__dirname, '../../src/dashboard/dashboard.html'),
    path.join(process.cwd(), 'src/dashboard/dashboard.html'),
    path.join(process.cwd(), 'backend/src/dashboard/dashboard.html'),
    path.join(process.cwd(), 'dist/dashboard/dashboard.html'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }

  return '<!DOCTYPE html><html><body><h1>RETINOVA Dashboard file not found</h1></body></html>';
}
