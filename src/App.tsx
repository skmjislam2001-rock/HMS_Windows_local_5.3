import { useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { UiProvider } from './components/ui'
import {
  IconDashboard, IconPatients, IconDoctors, IconWards, IconStaff,
  IconCalendar, IconBills, IconTransactions, IconAdmissions, IconLogs, IconSettings,
} from './components/icons'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Doctors from './pages/Doctors'
import Wards from './pages/Wards'
import Staff from './pages/Staff'
import Appointments from './pages/Appointments'
import Bills from './pages/Bills'
import Transactions from './pages/Transactions'
import Admissions from './pages/Admissions'
import Logs from './pages/Logs'
import Settings from './pages/Settings'

const NAV = [
  { section: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: IconDashboard, end: true }] },
  {
    section: 'Clinical',
    items: [
      { to: '/patients', label: 'Patients', icon: IconPatients },
      { to: '/doctors', label: 'Doctors', icon: IconDoctors },
      { to: '/staff', label: 'Staff', icon: IconStaff },
      { to: '/wards', label: 'Wards', icon: IconWards },
      { to: '/appointments', label: 'Appointments', icon: IconCalendar },
      { to: '/admissions', label: 'Admissions', icon: IconAdmissions },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/bills', label: 'Bills', icon: IconBills },
      { to: '/transactions', label: 'Transactions', icon: IconTransactions },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/logs', label: 'Activity Logs', icon: IconLogs },
      { to: '/settings', label: 'Settings', icon: IconSettings },
    ],
  },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/patients': 'Patients',
  '/doctors': 'Doctors',
  '/staff': 'Staff',
  '/wards': 'Wards',
  '/appointments': 'Appointments',
  '/admissions': 'Admissions',
  '/bills': 'Bills',
  '/transactions': 'Transactions',
  '/logs': 'Activity Logs',
  '/settings': 'Settings',
}

export default function App() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const title = TITLES[loc.pathname] || 'MediCore HMS'

  return (
    <UiProvider>
      <div className="app-shell">
        <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <div className="logo">M+</div>
            <div className="brand-text">
              <span className="brand-title">MediCore HMS</span>
              <span className="brand-sub">Hospital Manager</span>
            </div>
          </div>
          <nav className="nav">
            {NAV.map((group) => (
              <div className="nav-section" key={group.section}>
                <div className="nav-section-label">{group.section}</div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={(item as any).end}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Menu">
              ☰
            </button>
            <span className="page-title">{title}</span>
            <span className="spacer" />
            <span className="topbar-meta">MediCore HMS v6.0</span>
          </header>

          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/wards" element={<Wards />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </UiProvider>
  )
}
