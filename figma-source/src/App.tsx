import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'asha' | 'doctor' | 'manager'
type AshaScreen = 'home' | 'find-patient' | 'select-eye' | 'fundus-preview' | 'history'
type DoctorScreen = 'queue' | 'cases' | 'review'
type ManagerScreen = 'dashboard' | 'ashas' | 'villages'

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  village: string
  lastScreened?: string
}

interface CaseRecord {
  id: string
  patient: string
  age: number
  facility: string
  eye: 'LEFT' | 'RIGHT'
  screened: string
  grade: string
  risk: string
  priority: 'HIGH' | 'MODERATE' | 'NORMAL'
  referralReason: string
  reviewed?: boolean
  disposition?: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CASES: CaseRecord[] = [
  { id: '1', patient: 'Sakshi', age: 68, facility: 'Primary Health Centre (PHC-North)', eye: 'LEFT', screened: '19 Sept 2026', grade: 'G4', risk: '97.9%', priority: 'HIGH', referralReason: 'Referable Diabetic Retinopathy detected (Grade 4, Calibrated P(G2+) = 0.9792 ≥ 0.2993). Priority clinical referral recommended.' },
  { id: '2', patient: 'Ramesh Kumar', age: 71, facility: 'Community PHC', eye: 'LEFT', screened: '19 Sept 2026', grade: 'G4', risk: '99.4%', priority: 'HIGH', referralReason: 'Referable Diabetic Retinopathy detected (Grade 4, Calibrated P(G2+) = 0.9939 ≥ 0.2993). Priority clinical referral recommended.' },
  { id: '3', patient: 'Meena Devi', age: 55, facility: 'Sub-District Hospital', eye: 'RIGHT', screened: '18 Sept 2026', grade: 'G3', risk: '74.1%', priority: 'HIGH', referralReason: 'Referable DR detected (Grade 3). Clinical review required within 2 weeks.' },
  { id: '4', patient: 'Basavaiah', age: 63, facility: 'PHC-South', eye: 'LEFT', screened: '17 Sept 2026', grade: 'G2', risk: '48.3%', priority: 'MODERATE', referralReason: 'Moderate non-proliferative DR. Recommend ophthalmology review within 4 weeks.' },
  { id: '5', patient: 'Lakshmi Bai', age: 59, facility: 'Community PHC', eye: 'RIGHT', screened: '17 Sept 2026', grade: 'G1', risk: '22.7%', priority: 'NORMAL', referralReason: 'Mild changes only. Routine annual follow-up recommended.', reviewed: true, disposition: 'Annual follow-up. No urgent referral required.' },
]

const ASHAS = [
  { id: '1', name: 'Kavitha R.', village: 'Naregal', screened: 34, target: 40, referred: 6, lastActive: '19 Sept 2026' },
  { id: '2', name: 'Sunita Patil', village: 'Gadag', screened: 28, target: 40, referred: 3, lastActive: '18 Sept 2026' },
  { id: '3', name: 'Rekha M.', village: 'Shirhatti', screened: 41, target: 40, referred: 8, lastActive: '19 Sept 2026' },
  { id: '4', name: 'Anjali Kulkarni', village: 'Mundargi', screened: 19, target: 40, referred: 2, lastActive: '16 Sept 2026' },
  { id: '5', name: 'Pushpa D.', village: 'Lakshmeshwar', screened: 37, target: 40, referred: 5, lastActive: '19 Sept 2026' },
]

const PATIENTS: Patient[] = [
  { id: '1', name: 'Sakshi', age: 68, gender: 'Other', village: 'Hubli', lastScreened: '14 Aug 2026' },
  { id: '2', name: 'Ramesh Kumar', age: 71, gender: 'Male', village: 'Naregal', lastScreened: '02 July 2026' },
  { id: '3', name: 'Meena Devi', age: 55, gender: 'Female', village: 'Hubli' },
  { id: '4', name: 'Basavaiah', age: 63, gender: 'Male', village: 'Gadag' },
]

// ─── Utility Components ───────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: 'HIGH' | 'MODERATE' | 'NORMAL' }) {
  if (priority === 'HIGH') return <span className="badge badge-referral">High Priority</span>
  if (priority === 'MODERATE') return <span className="badge badge-warning">Moderate</span>
  return <span className="badge badge-normal">Normal</span>
}

function GradeBadge({ grade, risk }: { grade: string; risk: string }) {
  const isHigh = grade === 'G4' || grade === 'G3'
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      background: isHigh ? 'var(--color-maroon-50)' : 'var(--color-teal-50)',
      border: `1.5px solid ${isHigh ? 'var(--color-maroon-100)' : 'var(--color-teal-100)'}`,
      borderRadius: 'var(--radius-md)', padding: '8px 12px', minWidth: 72
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: isHigh ? 'var(--color-maroon-700)' : 'var(--color-teal-800)', lineHeight: 1 }}>{grade}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: isHigh ? 'var(--color-maroon-700)' : 'var(--color-teal-800)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {grade === 'G4' ? 'Proliferative' : grade === 'G3' ? 'Severe NPDR' : grade === 'G2' ? 'Moderate' : 'Mild'}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-slate-500)', marginTop: 4 }}>Risk: {risk}</span>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
)
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)
const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
)
const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

// ─── Logo ─────────────────────────────────────────────────────────────────────
function RetinovaLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const fontSize = size === 'lg' ? 28 : size === 'sm' ? 16 : 20
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size === 'lg' ? 36 : 28, height: size === 'lg' ? 36 : 28,
        background: 'var(--color-teal-800)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <svg width={size === 'lg' ? 20 : 15} height={size === 'lg' ? 20 : 15} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
          <path d="M12 2 Q14 8 12 12 Q10 8 12 2" fill="rgba(255,255,255,0.5)"/>
          <path d="M22 12 Q16 14 12 12 Q16 10 22 12" fill="rgba(255,255,255,0.5)"/>
        </svg>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize, color: 'var(--color-navy-800)', letterSpacing: '-0.01em' }}>RETINOVA</span>
    </div>
  )
}

// ─── Role Selector ────────────────────────────────────────────────────────────
function RoleSelector({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <RetinovaLogo size="lg" />
          <p style={{ marginTop: 12, color: 'var(--color-slate-500)', fontSize: 15 }}>
            Tele-ophthalmology screening platform
          </p>
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', borderRadius: 99, padding: '4px 12px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-teal-700)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--color-teal-800)', fontWeight: 600 }}>Dharwad District · Karnataka</span>
          </div>
        </div>

        <p className="section-label" style={{ textAlign: 'center', marginBottom: 16 }}>Select your role to continue</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { role: 'asha' as Role, label: 'ASHA Worker', subtitle: 'Screen patients in the field', icon: <IconUser /> },
            { role: 'doctor' as Role, label: 'Reviewing Ophthalmologist', subtitle: 'Clinical review of referred cases', icon: <IconEye /> },
            { role: 'manager' as Role, label: 'District Manager', subtitle: 'Programme oversight & analytics', icon: <IconBarChart /> },
          ].map(({ role, label, subtitle, icon }) => (
            <button key={role} onClick={() => onSelect(role)} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              boxShadow: '0 1px 3px rgba(15,30,54,0.06)',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-teal-500)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(13,94,94,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-subtle)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(15,30,54,0.06)' }}
            >
              <div style={{ width: 44, height: 44, background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal-800)', flexShrink: 0 }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-navy-800)', fontSize: 15, fontFamily: 'var(--font-body)' }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--color-slate-500)', marginTop: 2 }}>{subtitle}</div>
              </div>
              <div style={{ color: 'var(--color-slate-400)' }}><IconChevronRight /></div>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-slate-400)', marginTop: 32 }}>
          RETINOVA v2.4 · ICMR-NIN Approved · © 2026
        </p>
      </div>
    </div>
  )
}


// ─── ASHA: Home ───────────────────────────────────────────────────────────────
function AshaHome({ onFindPatient }: { onFindPatient: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 88px' }}>
      {/* Today's summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { label: "Today's Screenings", value: '7', sub: 'of 12 target', color: 'var(--color-teal-800)' },
          { label: 'Referred', value: '2', sub: 'urgent cases', color: 'var(--color-maroon-700)' },
          { label: 'This Week', value: '34', sub: 'total screened', color: 'var(--color-navy-700)' },
        ].map(stat => (
          <div key={stat.label} className="stat-card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate-500)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: 'var(--color-slate-400)', marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Primary action */}
      <button onClick={onFindPatient} style={{
        width: '100%', padding: '18px 20px', background: 'var(--color-teal-800)', color: 'white',
        border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex',
        alignItems: 'center', gap: 14, marginBottom: 12, boxShadow: '0 4px 12px rgba(13,94,94,0.3)',
        transition: 'background 0.15s'
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-teal-700)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-teal-800)'}
      >
        <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconSearch />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-body)' }}>Find Patient</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>Search or register for screening</div>
        </div>
      </button>

      {/* Secondary action */}
      <button style={{
        width: '100%', padding: '16px 20px', background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24
      }}>
        <div style={{ width: 44, height: 44, background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal-800)', flexShrink: 0 }}>
          <IconPlus />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-navy-800)', fontFamily: 'var(--font-body)' }}>Register New Patient</div>
          <div style={{ fontSize: 13, color: 'var(--color-slate-500)', marginTop: 2 }}>Add a new patient to the programme</div>
        </div>
      </button>

      {/* Recent patients */}
      <p className="section-label" style={{ marginBottom: 10 }}>Recent Patients</p>
      <div className="card" style={{ overflow: 'hidden' }}>
        {PATIENTS.slice(0, 3).map((p, i) => (
          <div key={p.id} className="table-row" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal-800)', flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 15 }}>
              {p.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-navy-800)' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-slate-500)', marginTop: 2 }}>{p.age} yrs · {p.gender} · {p.village}</div>
            </div>
            {p.lastScreened && <div style={{ fontSize: 11, color: 'var(--color-slate-400)', textAlign: 'right' }}>{p.lastScreened}</div>}
            <div style={{ color: 'var(--color-slate-400)' }}><IconChevronRight /></div>
          </div>
        ))}
      </div>

      {/* Coverage progress */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="section-label">Monthly Target Progress</p>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-teal-800)' }}>34 / 40</span>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: '85%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-slate-500)' }}>
            <span>85% complete</span>
            <span>6 more to reach target</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ASHA: Find Patient ───────────────────────────────────────────────────────
function AshaFindPatient({ onBack, onSelect }: { onBack: () => void; onSelect: (p: Patient) => void }) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const results = PATIENTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '0 16px 16px', paddingTop: 16 }}>
        <p className="section-label" style={{ marginBottom: 6 }}>Search Patient</p>
        <input
          className="input"
          placeholder="Enter patient name or ID"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setSearched(true)}
          autoFocus
          style={{ marginBottom: 10 }}
        />
        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, letterSpacing: '0.06em', borderRadius: 'var(--radius-md)' }}
          onClick={() => setSearched(true)}
        >
          SEARCH
        </button>
      </div>

      {searched && (
        <div style={{ padding: '0 16px' }}>
          {results.length > 0 ? (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
              {results.map(p => (
                <button key={p.id} onClick={() => onSelect(p)} className="table-row" style={{
                  width: '100%', padding: '16px', display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left'
                }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-navy-800)' }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-slate-500)', marginTop: 3 }}>
                    {p.age} yrs &nbsp;·&nbsp; {p.gender} &nbsp;·&nbsp; {p.village}
                    {p.lastScreened && <>&nbsp;·&nbsp; Last screened: {p.lastScreened}</>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-slate-400)' }}>No patients found</div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--color-slate-500)', marginBottom: 10 }}>Patient not found?</p>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14, letterSpacing: '0.06em', borderRadius: 'var(--radius-md)' }}>
              REGISTER NEW PATIENT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ASHA: Select Eye ─────────────────────────────────────────────────────────
function AshaSelectEye({ patient, onBack, onSelect }: { patient: Patient; onBack: () => void; onSelect: (eye: 'LEFT' | 'RIGHT') => void }) {
  return (
    <div style={{ flex: 1, padding: '32px 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-navy-800)', letterSpacing: '-0.01em', textTransform: 'uppercase', marginBottom: 6 }}>Select Eye</h1>
        <div style={{ color: 'var(--color-teal-800)', fontWeight: 600, fontSize: 16 }}>{patient.name}</div>
        <div style={{ color: 'var(--color-slate-500)', fontSize: 14, marginTop: 4 }}>Which eye is being screened today?</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'auto' }}>
        {(['LEFT', 'RIGHT'] as const).map(eye => (
          <button key={eye} onClick={() => onSelect(eye)} style={{
            padding: '32px 20px', background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            transition: 'border-color 0.15s, box-shadow 0.15s'
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-teal-600)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(13,94,94,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-navy-800)', letterSpacing: '0.04em' }}>{eye} EYE</div>
            <div style={{ fontSize: 13, color: 'var(--color-slate-400)', letterSpacing: '0.08em' }}>{eye === 'LEFT' ? 'OS' : 'OD'}</div>
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginTop: 24, fontSize: 13, color: 'var(--color-teal-800)', textAlign: 'center' }}>
        Each eye is screened separately. To screen both eyes, complete a separate screening for each.
      </div>
    </div>
  )
}

// ─── ASHA: Fundus Image Preview ────────────────────────────────────────────────
function AshaFundusPreview({ patient, eye, onBack, onDone }: { patient: Patient; eye: 'LEFT' | 'RIGHT'; onBack: () => void; onDone: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 12px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-navy-800)', letterSpacing: '-0.01em', textTransform: 'uppercase', marginBottom: 4 }}>Fundus Image Preview</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-navy-700)' }}>{patient.name}</span>
          <span style={{ fontSize: 13, color: 'var(--color-slate-400)', letterSpacing: '0.04em' }}>{eye} EYE ({eye === 'LEFT' ? 'OS' : 'OD'})</span>
        </div>
      </div>

      {/* Fundus image area */}
      <div style={{ background: '#111', flex: 1, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle at 40% 45%, #c4724a 0%, #8B3A2A 30%, #5a1f10 70%, #2a0a06 100%)', boxShadow: '0 0 40px rgba(180,80,40,0.4)', position: 'relative', overflow: 'hidden' }}>
          {/* Simulated retinal vessels */}
          <svg viewBox="0 0 260 260" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.8 }}>
            <circle cx="130" cy="130" r="125" fill="none" stroke="rgba(80,20,10,0.3)" strokeWidth="2"/>
            <path d="M130 130 Q160 80 190 50" stroke="rgba(140,40,20,0.9)" strokeWidth="2.5" fill="none"/>
            <path d="M130 130 Q100 80 70 55" stroke="rgba(140,40,20,0.9)" strokeWidth="2.5" fill="none"/>
            <path d="M130 130 Q170 140 210 130" stroke="rgba(140,40,20,0.8)" strokeWidth="2" fill="none"/>
            <path d="M130 130 Q90 145 50 140" stroke="rgba(140,40,20,0.8)" strokeWidth="2" fill="none"/>
            <path d="M130 130 Q140 170 130 200" stroke="rgba(140,40,20,0.7)" strokeWidth="1.5" fill="none"/>
            <circle cx="160" cy="100" r="18" fill="rgba(220,180,120,0.6)" stroke="rgba(180,140,80,0.4)" strokeWidth="1"/>
            <circle cx="108" cy="138" r="8" fill="rgba(255,200,100,0.4)"/>
            <circle cx="145" cy="155" r="5" fill="rgba(255,180,80,0.5)"/>
            <circle cx="95" cy="115" r="4" fill="rgba(255,150,60,0.6)"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
            LIVE PREVIEW
          </span>
        </div>
      </div>

      {/* Verify notice */}
      <div style={{ padding: '12px 16px', background: 'var(--color-teal-50)', borderTop: '1px solid var(--color-teal-100)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-teal-800)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <IconAlert />
          Verify the retina is clearly visible before proceeding. A blurry or unusable image will require recapture.
        </p>
      </div>

      {/* Action */}
      <div style={{ padding: 16, paddingBottom: 88 }}>
        <button onClick={onDone} style={{
          width: '100%', padding: '16px', background: 'var(--color-teal-800)', color: 'white',
          border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, letterSpacing: '0.06em',
          boxShadow: '0 4px 12px rgba(13,94,94,0.3)', transition: 'background 0.15s'
        }}>
          USE THIS IMAGE
        </button>
        <button onClick={onBack} style={{
          width: '100%', padding: '12px', background: 'none', color: 'var(--color-slate-500)',
          border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, marginTop: 8
        }}>
          Retake Image
        </button>
      </div>
    </div>
  )
}

// ─── ASHA: History ─────────────────────────────────────────────────────────────
function AshaHistory() {
  const history = [
    { patient: 'Kavitha R.', date: '19 Sept', grade: 'G4', status: 'HIGH' as const },
    { patient: 'Meena K.', date: '18 Sept', grade: 'G2', status: 'MODERATE' as const },
    { patient: 'Ramesh B.', date: '17 Sept', grade: 'G0', status: 'NORMAL' as const },
    { patient: 'Shantha P.', date: '16 Sept', grade: 'G1', status: 'NORMAL' as const },
    { patient: 'Dilip M.', date: '15 Sept', grade: 'G3', status: 'HIGH' as const },
  ]
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 88px' }}>
      <p className="section-label" style={{ marginBottom: 12 }}>Screening History</p>
      <div className="card" style={{ overflow: 'hidden' }}>
        {history.map((h, i) => (
          <div key={i} className="table-row" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal-800)', flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 14 }}>
              {h.patient[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-navy-800)' }}>{h.patient}</div>
              <div style={{ fontSize: 12, color: 'var(--color-slate-500)', marginTop: 2 }}>{h.date} 2026 &nbsp;·&nbsp; Grade {h.grade}</div>
            </div>
            <PriorityBadge priority={h.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ASHA Role Shell ───────────────────────────────────────────────────────────
function AshaRole({ onSignOut }: { onSignOut: () => void }) {
  const [screen, setScreen] = useState<AshaScreen>('home')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedEye, setSelectedEye] = useState<'LEFT' | 'RIGHT' | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleFundusConfirm = () => {
    setShowSuccess(true)
    setTimeout(() => { setShowSuccess(false); setScreen('home'); setSelectedPatient(null); setSelectedEye(null) }, 2000)
  }

  const getPageTitle = () => {
    if (screen === 'find-patient') return 'Find Patient'
    if (screen === 'select-eye') return `Select Eye`
    if (screen === 'fundus-preview') return 'Fundus Preview'
    if (screen === 'history') return 'History'
    return null
  }

  const showBack = screen !== 'home' && screen !== 'history'
  const pageTitle = getPageTitle()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-subtle)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        {showBack ? (
          <button onClick={() => {
            if (screen === 'fundus-preview') setScreen('select-eye')
            else if (screen === 'select-eye') setScreen('find-patient')
            else setScreen('home')
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal-800)', padding: 4, display: 'flex', alignItems: 'center' }}>
            <IconChevronLeft />
          </button>
        ) : (
          <RetinovaLogo size="sm" />
        )}
        {pageTitle && <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-navy-800)' }}>{pageTitle}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-pending" style={{ fontSize: 10 }}>ASHA Worker</span>
          <button onClick={onSignOut} style={{ fontSize: 13, color: 'var(--color-slate-500)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,94,94,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: 72, height: 72, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal-800)', marginBottom: 20 }}>
            <IconCheck />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'white', marginBottom: 8 }}>Screening Submitted</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Image sent for AI analysis</div>
        </div>
      )}

      {/* Screen content */}
      {screen === 'home' && <AshaHome onFindPatient={() => setScreen('find-patient')} />}
      {screen === 'find-patient' && <AshaFindPatient onBack={() => setScreen('home')} onSelect={p => { setSelectedPatient(p); setScreen('select-eye') }} />}
      {screen === 'select-eye' && selectedPatient && <AshaSelectEye patient={selectedPatient} onBack={() => setScreen('find-patient')} onSelect={eye => { setSelectedEye(eye); setScreen('fundus-preview') }} />}
      {screen === 'fundus-preview' && selectedPatient && selectedEye && <AshaFundusPreview patient={selectedPatient} eye={selectedEye} onBack={() => setScreen('select-eye')} onDone={handleFundusConfirm} />}
      {screen === 'history' && <AshaHistory />}

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', zIndex: 50 }}>
        {[
          { key: 'home' as AshaScreen, label: 'HOME', icon: <IconHome /> },
          { key: 'history' as AshaScreen, label: 'HISTORY', icon: <IconHistory /> },
          { key: 'home' as AshaScreen, label: 'SETTINGS', icon: <IconSettings /> },
        ].map((tab, i) => {
          const active = i === 0 ? !['history'].includes(screen) : screen === tab.key
          return (
            <button key={i} onClick={() => setScreen(tab.key)} style={{
              flex: 1, padding: '12px 8px 10px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer',
              color: active ? 'var(--color-teal-800)' : 'var(--color-slate-400)',
              transition: 'color 0.15s', position: 'relative'
            }}>
              {tab.icon}
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>{tab.label}</span>
              {active && <div style={{ position: 'absolute', bottom: 0, width: 32, height: 2, background: 'var(--color-teal-700)', borderRadius: '99px 99px 0 0' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Doctor: Review Queue ─────────────────────────────────────────────────────
function DoctorQueue({ cases, onOpen }: { cases: CaseRecord[]; onOpen: (c: CaseRecord) => void }) {
  const pending = cases.filter(c => !c.reviewed)
  const reviewed = cases.filter(c => c.reviewed)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
      <div style={{ padding: '0 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-navy-800)', marginBottom: 4 }}>Review Queue</h2>
          <p style={{ fontSize: 13, color: 'var(--color-slate-500)' }}>{pending.length} cases awaiting clinical disposition</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-referral">{pending.filter(c => c.priority === 'HIGH').length} High</span>
          <span className="badge badge-warning">{pending.filter(c => c.priority === 'MODERATE').length} Moderate</span>
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pending.map(c => (
          <div key={c.id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: `4px solid ${c.priority === 'HIGH' ? 'var(--color-maroon-700)' : 'var(--color-amber-600)'}` }}
            onClick={() => onOpen(c)}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,30,54,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(15,30,54,0.06)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-navy-800)' }}>
                  {c.patient} <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-slate-500)', fontWeight: 400 }}>({c.age}y)</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-slate-500)', marginTop: 3 }}>
                  Facility: <strong style={{ color: 'var(--color-navy-700)' }}>{c.facility}</strong>
                  &nbsp;&nbsp;Eye: <strong style={{ color: 'var(--color-navy-700)' }}>{c.eye}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-slate-400)', marginTop: 2 }}>Screened: {c.screened}</div>
              </div>
              <PriorityBadge priority={c.priority} />
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <GradeBadge grade={c.grade} risk={c.risk} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Referral Reason:</div>
                <div style={{ fontSize: 13, color: 'var(--color-navy-700)', lineHeight: 1.5 }}>{c.referralReason}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <span style={{ fontSize: 13, color: 'var(--color-teal-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Open Clinical Review Workstation <IconChevronRight />
              </span>
            </div>
          </div>
        ))}

        {reviewed.length > 0 && (
          <>
            <p className="section-label" style={{ marginTop: 8 }}>Reviewed Cases</p>
            {reviewed.map(c => (
              <div key={c.id} className="card" style={{ padding: 16, opacity: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => onOpen(c)}>
                <div style={{ width: 32, height: 32, background: 'var(--color-green-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green-700)' }}>
                  <IconCheck />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-navy-800)' }}>{c.patient}, {c.age}y</div>
                  <div style={{ fontSize: 12, color: 'var(--color-slate-500)', marginTop: 2 }}>{c.disposition}</div>
                </div>
                <span className="badge badge-reviewed">Reviewed</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Doctor: Clinical Review ───────────────────────────────────────────────────
function DoctorReview({ caseRecord, onBack, onComplete }: { caseRecord: CaseRecord; onBack: () => void; onComplete: (disposition: string) => void }) {
  const [disposition, setDisposition] = useState('')
  const [referralUrgency, setReferralUrgency] = useState<'immediate' | 'urgent' | 'routine' | 'none'>('immediate')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!disposition.trim()) return
    setSubmitted(true)
    setTimeout(() => onComplete(disposition), 1500)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
      {/* Patient banner */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, borderLeft: '4px solid var(--color-maroon-700)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-navy-800)' }}>{caseRecord.patient}</span>
            <span style={{ fontSize: 14, color: 'var(--color-slate-500)' }}>{caseRecord.age}y</span>
            <PriorityBadge priority={caseRecord.priority} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-slate-500)', marginTop: 4 }}>
            {caseRecord.facility} &nbsp;·&nbsp; {caseRecord.eye} EYE &nbsp;·&nbsp; Screened {caseRecord.screened}
          </div>
        </div>
        <GradeBadge grade={caseRecord.grade} risk={caseRecord.risk} />
      </div>

      {/* Fundus image */}
      <div style={{ marginBottom: 20 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>Fundus Image — {caseRecord.eye} Eye ({caseRecord.eye === 'LEFT' ? 'OS' : 'OD'})</p>
        <div style={{ background: '#111', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '16/7', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle at 40% 45%, #c4724a 0%, #8B3A2A 30%, #5a1f10 70%, #2a0a06 100%)', boxShadow: '0 0 40px rgba(180,80,40,0.4)', position: 'relative' }}>
            <svg viewBox="0 0 260 260" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.8 }}>
              <path d="M130 130 Q160 80 190 50" stroke="rgba(140,40,20,0.9)" strokeWidth="2.5" fill="none"/>
              <path d="M130 130 Q100 80 70 55" stroke="rgba(140,40,20,0.9)" strokeWidth="2.5" fill="none"/>
              <path d="M130 130 Q170 140 210 130" stroke="rgba(140,40,20,0.8)" strokeWidth="2" fill="none"/>
              <path d="M130 130 Q90 145 50 140" stroke="rgba(140,40,20,0.8)" strokeWidth="2" fill="none"/>
              <circle cx="160" cy="100" r="18" fill="rgba(220,180,120,0.6)" stroke="rgba(180,140,80,0.4)" strokeWidth="1"/>
              <circle cx="108" cy="138" r="8" fill="rgba(255,200,100,0.4)"/>
              <circle cx="145" cy="155" r="5" fill="rgba(255,180,80,0.5)"/>
              <circle cx="95" cy="115" r="4" fill="rgba(255,150,60,0.6)"/>
            </svg>
          </div>
          <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
            <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: 'white', fontSize: 12 }}>
              Full Screen
            </button>
          </div>
        </div>
      </div>

      {/* AI finding */}
      <div style={{ background: 'var(--color-maroon-50)', border: '1px solid var(--color-maroon-100)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-maroon-700)', marginBottom: 6 }}>AI Analysis Finding</p>
        <p style={{ fontSize: 13, color: 'var(--color-navy-700)', lineHeight: 1.6 }}>{caseRecord.referralReason}</p>
      </div>

      {/* Referral urgency */}
      <div style={{ marginBottom: 20 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>Clinical Referral Decision</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 'immediate', label: 'Immediate', desc: 'Within 24–48 hrs' },
            { key: 'urgent', label: 'Urgent', desc: 'Within 2 weeks' },
            { key: 'routine', label: 'Routine', desc: 'Within 4 weeks' },
            { key: 'none', label: 'No Referral', desc: 'Annual follow-up' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setReferralUrgency(opt.key as typeof referralUrgency)} style={{
              padding: '12px', border: `1.5px solid ${referralUrgency === opt.key ? 'var(--color-teal-700)' : 'var(--color-border)'}`,
              background: referralUrgency === opt.key ? 'var(--color-teal-50)' : 'var(--color-surface)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: referralUrgency === opt.key ? 'var(--color-teal-800)' : 'var(--color-navy-700)' }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-slate-500)', marginTop: 2 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Disposition text */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Clinical Disposition Notes</p>
        <textarea
          className="input"
          rows={4}
          placeholder="Document your clinical findings and recommended management plan…"
          value={disposition}
          onChange={e => setDisposition(e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-secondary" onClick={onBack} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!disposition.trim() || submitted}
          style={{
            flex: 2, padding: '10px 18px', background: submitted ? 'var(--color-teal-600)' : 'var(--color-teal-800)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: !disposition.trim() ? 0.5 : 1, transition: 'all 0.15s'
          }}
        >
          {submitted ? <><IconCheck /> Disposition Saved</> : 'Save Clinical Disposition'}
        </button>
      </div>
    </div>
  )
}

// ─── Doctor Role Shell ─────────────────────────────────────────────────────────
function DoctorRole({ onSignOut }: { onSignOut: () => void }) {
  const [screen, setScreen] = useState<DoctorScreen>('queue')
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [cases, setCases] = useState(CASES)

  const handleComplete = (disposition: string) => {
    if (!selectedCase) return
    setCases(prev => prev.map(c => c.id === selectedCase.id ? { ...c, reviewed: true, disposition } : c))
    setSelectedCase(null)
    setScreen('queue')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-subtle)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        {selectedCase ? (
          <button onClick={() => { setSelectedCase(null); setScreen('queue') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-teal-800)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
            <IconChevronLeft /> Back to Queue
          </button>
        ) : (
          <>
            <RetinovaLogo />
            <span className="badge badge-pending" style={{ marginLeft: 4 }}>Reviewing Ophthalmologist</span>
          </>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={onSignOut} style={{ fontSize: 13, color: 'var(--color-slate-500)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {!selectedCase && (
        <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-subtle)', padding: '12px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-navy-800)', marginBottom: 2 }}>Ophthalmologist Specialist Review Queue</h1>
            <p style={{ fontSize: 13, color: 'var(--color-slate-500)' }}>Review referred diabetic retinopathy screening cases and record clinical disposition</p>
            <p style={{ fontSize: 12, color: 'var(--color-slate-400)', marginTop: 6 }}>District Reviewing Ophthalmologist · District Ophthalmology Center</p>
          </div>
        </div>
      )}

      {/* Bottom nav (mobile) */}
      {!selectedCase && (
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {screen === 'queue' && <DoctorQueue cases={cases} onOpen={c => { setSelectedCase(c); setScreen('review') }} />}
          {screen === 'cases' && <DoctorQueue cases={cases} onOpen={c => { setSelectedCase(c); setScreen('review') }} />}
        </div>
      )}

      {selectedCase && (
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <DoctorReview caseRecord={selectedCase} onBack={() => { setSelectedCase(null); setScreen('queue') }} onComplete={handleComplete} />
        </div>
      )}

      {/* Bottom nav */}
      {!selectedCase && (
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)', display: 'flex', justifyContent: 'center', gap: 0 }}>
          {[
            { key: 'queue' as DoctorScreen, label: 'REVIEW QUEUE', icon: <IconClipboard /> },
            { key: 'cases' as DoctorScreen, label: 'ALL CASES', icon: <IconHistory /> },
            { key: 'queue' as DoctorScreen, label: 'SETTINGS', icon: <IconSettings /> },
          ].map((tab, i) => {
            const active = i === 0 ? screen === 'queue' : i === 1 ? screen === 'cases' : false
            return (
              <button key={i} onClick={() => setScreen(tab.key)} style={{
                flex: 1, maxWidth: 200, padding: '14px 8px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer',
                color: active ? 'var(--color-teal-800)' : 'var(--color-slate-400)',
                transition: 'color 0.15s', position: 'relative'
              }}>
                {tab.icon}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{tab.label}</span>
                {active && <div style={{ position: 'absolute', top: 0, width: 40, height: 2, background: 'var(--color-teal-700)', borderRadius: '0 0 99px 99px' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Manager: Dashboard ────────────────────────────────────────────────────────
function ManagerDashboard() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Screened', value: '1,247', delta: '+34 this week', color: 'var(--color-teal-800)' },
          { label: 'Referred', value: '186', delta: '14.9% referral rate', color: 'var(--color-maroon-700)' },
          { label: 'Pending Review', value: '24', delta: '4 high priority', color: 'var(--color-amber-700)' },
          { label: 'Active ASHAs', value: '18', delta: '5 villages covered', color: 'var(--color-navy-700)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 8 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--color-slate-400)', marginTop: 4 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ASHA performance */}
        <div className="card" style={{ padding: 20, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-navy-800)' }}>ASHA Worker Performance</h3>
            <span style={{ fontSize: 12, color: 'var(--color-slate-400)' }}>Sept 2026 · Monthly targets</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 80px 80px 100px', padding: '8px 14px', background: 'var(--color-background)' }}>
              {['ASHA Worker', 'Village', 'Screened', 'Referred', 'Last Active'].map(h => (
                <span key={h} className="section-label" style={{ fontSize: 10 }}>{h}</span>
              ))}
            </div>
            {ASHAS.map(a => (
              <div key={a.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 80px 80px 100px', padding: '12px 14px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-navy-800)' }}>{a.name}</div>
                  <div style={{ marginTop: 6 }}>
                    <div className="progress-bar" style={{ width: 100 }}>
                      <div className="progress-fill" style={{ width: `${Math.min(100, (a.screened / a.target) * 100)}%`, background: a.screened >= a.target ? 'var(--color-teal-600)' : 'var(--color-teal-700)' }} />
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--color-slate-500)' }}>{a.village}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-navy-700)' }}>{a.screened}<span style={{ color: 'var(--color-slate-400)', fontFamily: 'var(--font-body)' }}>/{a.target}</span></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: a.referred >= 5 ? 'var(--color-maroon-700)' : 'var(--color-navy-700)' }}>{a.referred}</span>
                <span style={{ fontSize: 12, color: 'var(--color-slate-400)' }}>{a.lastActive}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grade distribution */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-navy-800)', marginBottom: 16 }}>DR Grade Distribution</h3>
          {[
            { grade: 'G4 Proliferative', count: 48, pct: 26, color: 'var(--color-maroon-700)' },
            { grade: 'G3 Severe NPDR', count: 62, pct: 33, color: 'var(--color-maroon-600)' },
            { grade: 'G2 Moderate', count: 54, pct: 29, color: 'var(--color-amber-600)' },
            { grade: 'G1 Mild', count: 22, pct: 12, color: 'var(--color-teal-600)' },
          ].map(g => (
            <div key={g.grade} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--color-navy-700)' }}>{g.grade}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-slate-500)' }}>{g.count} ({g.pct}%)</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${g.pct}%`, background: g.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent referrals */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-navy-800)', marginBottom: 16 }}>Recent Referrals</h3>
          {CASES.filter(c => c.priority === 'HIGH').slice(0, 4).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-maroon-700)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-navy-800)' }}>{c.patient}, {c.age}y</div>
                <div style={{ fontSize: 12, color: 'var(--color-slate-500)', marginTop: 2 }}>{c.facility} · {c.screened}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-maroon-700)', fontWeight: 600 }}>{c.grade}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Manager Role Shell ────────────────────────────────────────────────────────
function ManagerRole({ onSignOut }: { onSignOut: () => void }) {
  const [screen, setScreen] = useState<ManagerScreen>('dashboard')

  const navItems = [
    { key: 'dashboard' as ManagerScreen, label: 'Dashboard', icon: <IconBarChart /> },
    { key: 'ashas' as ManagerScreen, label: 'ASHA Workers', icon: <IconUsers /> },
    { key: 'villages' as ManagerScreen, label: 'Village Coverage', icon: <IconMap /> },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)' }}>
      {/* Top header */}
      <div style={{ background: 'var(--color-navy-800)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="white"/>
              <path d="M12 2 Q14 8 12 12 Q10 8 12 2" fill="rgba(255,255,255,0.5)"/>
              <path d="M22 12 Q16 14 12 12 Q16 10 22 12" fill="rgba(255,255,255,0.5)"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'white', letterSpacing: '-0.01em' }}>RETINOVA</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>District Management · Dharwad</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Dr. Anita Sharma</span>
          <button onClick={onSignOut} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <div className="sidebar" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p className="section-label" style={{ padding: '0 12px', marginBottom: 8 }}>Navigation</p>
          {navItems.map(item => (
            <button key={item.key} className={`nav-link ${screen === item.key ? 'active' : ''}`} onClick={() => setScreen(item.key)}>
              {item.icon}
              {item.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--color-border-subtle)' }}>
            <p className="section-label" style={{ padding: '0 12px', marginBottom: 8 }}>Programme</p>
            <button className="nav-link"><IconSettings />Settings</button>
          </div>

          {/* District summary card */}
          <div style={{ background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-teal-800)', marginBottom: 4 }}>Dharwad District</div>
            <div style={{ color: 'var(--color-slate-500)' }}>Karnataka · ICMR-NIN</div>
            <div style={{ color: 'var(--color-slate-500)', marginTop: 4 }}>Cycle: Sept 2026</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Page header */}
          <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-subtle)', padding: '16px 24px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--color-navy-800)' }}>
              {screen === 'dashboard' && 'Programme Dashboard'}
              {screen === 'ashas' && 'ASHA Workers'}
              {screen === 'villages' && 'Village Coverage'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-slate-500)', marginTop: 2 }}>September 2026 · Dharwad District</p>
          </div>

          {screen === 'dashboard' && <ManagerDashboard />}

          {screen === 'ashas' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 80px 80px 80px 120px', padding: '10px 16px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {['ASHA Worker', 'Village', 'Screened', 'Target', 'Referred', 'Last Active'].map(h => (
                    <span key={h} className="section-label" style={{ fontSize: 10 }}>{h}</span>
                  ))}
                </div>
                {ASHAS.map(a => (
                  <div key={a.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 80px 80px 80px 120px', padding: '14px 16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--color-teal-800)' }}>{a.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-navy-800)' }}>{a.name}</div>
                        <div className="progress-bar" style={{ width: 80, marginTop: 5 }}>
                          <div className="progress-fill" style={{ width: `${(a.screened / a.target) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--color-slate-500)' }}>{a.village}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{a.screened}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-slate-400)' }}>{a.target}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: a.referred >= 5 ? 'var(--color-maroon-700)' : 'inherit' }}>{a.referred}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-slate-400)' }}>{a.lastActive}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {screen === 'villages' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {[
                  { name: 'Naregal', district: 'Gadag Taluk', screened: 34, total: 150, referred: 6, asha: 'Kavitha R.' },
                  { name: 'Gadag', district: 'Gadag Taluk', screened: 28, total: 200, referred: 3, asha: 'Sunita Patil' },
                  { name: 'Shirhatti', district: 'Gadag Taluk', screened: 41, total: 120, referred: 8, asha: 'Rekha M.' },
                  { name: 'Mundargi', district: 'Mundargi Taluk', screened: 19, total: 180, referred: 2, asha: 'Anjali Kulkarni' },
                  { name: 'Lakshmeshwar', district: 'Shirhatti Taluk', screened: 37, total: 140, referred: 5, asha: 'Pushpa D.' },
                  { name: 'Ron', district: 'Ron Taluk', screened: 11, total: 160, referred: 1, asha: 'Unassigned' },
                ].map(v => (
                  <div key={v.name} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-navy-800)' }}>{v.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-slate-400)', marginTop: 2 }}>{v.district}</div>
                      </div>
                      {v.asha === 'Unassigned' && <span className="badge badge-warning">Unassigned</span>}
                    </div>
                    <div className="progress-bar" style={{ marginBottom: 6 }}>
                      <div className="progress-fill" style={{ width: `${(v.screened / v.total) * 100}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-slate-500)', marginBottom: 10 }}>
                      <span>{v.screened} screened</span>
                      <span>{Math.round((v.screened / v.total) * 100)}% of {v.total}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--color-slate-500)' }}>ASHA: <strong style={{ color: 'var(--color-navy-700)' }}>{v.asha}</strong></span>
                      <span style={{ color: v.referred > 4 ? 'var(--color-maroon-700)' : 'var(--color-slate-500)', fontWeight: v.referred > 4 ? 700 : 400 }}>{v.referred} referred</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState<Role | null>(null)
  if (!role) return <RoleSelector onSelect={setRole} />
  if (role === 'asha') return <AshaRole onSignOut={() => setRole(null)} />
  if (role === 'doctor') return <DoctorRole onSignOut={() => setRole(null)} />
  return <ManagerRole onSignOut={() => setRole(null)} />
}
