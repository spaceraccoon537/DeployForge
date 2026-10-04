import { Activity, Boxes, LayoutDashboard } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"><Boxes size={18} strokeWidth={2.5} /></span>
        <span className="brand-name">DeployForge</span>
      </div>
      <span className="nav-label">Workspace</span>
      <nav aria-label="Workspace navigation">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={17} /><span className="nav-text">Dashboard</span>
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <Boxes size={17} /><span className="nav-text">Projects</span>
        </NavLink>
        <NavLink to="/deployments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <Activity size={17} /><span className="nav-text">Deployments</span>
        </NavLink>
      </nav>
    </aside>
  )
}