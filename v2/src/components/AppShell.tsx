import { useState } from "react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Gauge,
  Info,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { initials } from "@/lib/format";
import { useClassroom } from "@/state/classroom-context";

const studentNavigation = [
  { to: "/", label: "Tareas", icon: Gauge, end: true },
  { to: "/missions", label: "Misiones", icon: BookOpen },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/feedback", label: "Feedback", icon: MessageSquareText },
];

export function AppShell() {
  const { profile, snapshot, backendMode, logout } = useClassroom();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const unread =
    snapshot?.notifications.filter(
      (entry) => entry.userId === profile?.id && !entry.readAt,
    ).length ?? 0;
  const isMentor = profile?.role === "mentor" || profile?.role === "owner";

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-header">
          <NavLink className="brand-link" to="/" onClick={() => setSidebarOpen(false)}>
            <span className="brand-command">T_</span>
            <span>
              <strong>Tomatin</strong>
              <small>CODE LAB 2.0</small>
            </span>
          </NavLink>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setSidebarOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">CURSO</p>
          {studentNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {label === "Feedback" && unread > 0 ? (
                <span className="nav-count">{unread}</span>
              ) : null}
            </NavLink>
          ))}

          {isMentor ? (
            <>
              <p className="nav-label mentor-label">MENTOR</p>
              <NavLink
                to="/mentor"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "is-active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <ShieldCheck aria-hidden="true" />
                <span>Panel mentor</span>
                <span className="nav-count">
                  {snapshot?.progress.filter(
                    (entry) => entry.status === "awaiting_review",
                  ).length ?? 0}
                </span>
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/about"
            className="nav-link"
            onClick={() => setSidebarOpen(false)}
          >
            <Info aria-hidden="true" />
            <span>Acerca del proyecto</span>
          </NavLink>
          <div className="system-status">
            <span className={`system-dot ${backendMode}`} aria-hidden="true" />
            <span>
              <strong>{backendMode === "supabase" ? "Aula conectada" : "Modo demo"}</strong>
              <small>
                {backendMode === "supabase" ? "Supabase + Judge0" : "Datos en este navegador"}
              </small>
            </span>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              type="button"
              aria-label="Abrir navegación"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <span className="route-prompt" aria-hidden="true">
              ~/
            </span>
            <span className="route-label">
              {location.pathname === "/"
                ? "tareas"
                : location.pathname.split("/").filter(Boolean).join(" / ")}
            </span>
          </div>
          <div className="topbar-actions">
            <NavLink
              to="/feedback"
              className="icon-button notification-button"
              aria-label={`${unread} notificaciones sin leer`}
            >
              <Bell aria-hidden="true" />
              {unread > 0 ? <span>{unread}</span> : null}
            </NavLink>
            <div className={`profile-menu ${profileOpen ? "is-open" : ""}`}>
              <button
                className="profile-menu-trigger"
                type="button"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="avatar">{initials(profile?.displayName ?? "?")}</span>
                <span className="profile-copy">
                  <strong>{profile?.displayName}</strong>
                  <small>{isMentor ? "mentor" : "estudiante"}</small>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {profileOpen ? (
                <button
                  className="profile-menu-action"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    void logout();
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Cerrar sesión
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
