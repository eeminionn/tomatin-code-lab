import { useState } from "react";
import {
  Bell,
  BookCopy,
  BookOpen,
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  Eye,
  Gauge,
  Gift,
  Info,
  LogOut,
  MailPlus,
  Menu,
  MessageSquareText,
  TriangleAlert,
  Trophy,
  Unplug,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useClassroom } from "@/state/classroom-context";

const studentNavigation = [
  { to: "/", label: "Tareas", icon: Gauge, end: true },
  { to: "/missions", label: "Misiones", icon: BookOpen },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/feedback", label: "Feedback", icon: MessageSquareText },
  { to: "/rewards", label: "Premios", icon: Gift },
];

const adminNavigation = [
  { to: "/admin", label: "Resumen", icon: Gauge, end: true },
  { to: "/admin/reviews", label: "Revisiones", icon: ClipboardCheck },
  { to: "/admin/students", label: "Estudiantes", icon: Users },
  { to: "/admin/ranking", label: "Ranking", icon: Trophy },
  { to: "/admin/assignments", label: "Tareas", icon: CalendarPlus },
  { to: "/admin/missions", label: "Misiones", icon: BookCopy },
  { to: "/admin/invitations", label: "Invitaciones", icon: MailPlus },
  { to: "/admin/rewards", label: "Premios", icon: Gift },
];

export function AppShell() {
  const {
    profile,
    viewProfile,
    isStudentPreview,
    snapshot,
    error,
    clearError,
    backendMode,
    frontendOnly,
    logout,
    startStudentPreview,
    stopStudentPreview,
  } = useClassroom();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const unread =
    snapshot?.notifications.filter(
      (entry) =>
        entry.userId === viewProfile?.id &&
        !entry.readAt &&
        !entry.dismissedAt,
    ).length ?? 0;
  const isActorStaff =
    profile?.role === "mentor" || profile?.role === "owner";
  const isMentor = isActorStaff && !isStudentPreview;
  const students =
    snapshot?.profiles.filter((entry) => entry.role === "student") ?? [];

  return (
    <div className={`app-shell ${frontendOnly ? "frontend-only" : ""}`}>
      <aside
        className={`sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="sidebar-header">
          <NavLink className="brand-link" to="/" onClick={() => setSidebarOpen(false)}>
            <span className="brand-command">T_</span>
            <span>
              <strong>Tomatin</strong>
              <small>CODE LAB 3.0</small>
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
          {isMentor ? (
            <>
              <p className="nav-label mentor-label">ADMINISTRACIÓN</p>
              {adminNavigation.map(({ to, label, icon: Icon, end }) => (
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
                  {label === "Revisiones" &&
                  (snapshot?.progress.filter(
                    (entry) => entry.status === "awaiting_review",
                  ).length ?? 0) > 0 ? (
                    <span className="nav-count">
                      {snapshot?.progress.filter(
                        (entry) => entry.status === "awaiting_review",
                      ).length ?? 0}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </>
          ) : (
            <>
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
            </>
          )}
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
              <strong>
                {frontendOnly
                  ? "Sandbox frontend"
                  : backendMode === "supabase"
                    ? "Aula conectada"
                    : "Modo demo"}
              </strong>
              <small>
                {frontendOnly
                  ? "Backend desactivado"
                  : backendMode === "supabase"
                    ? "Supabase + Judge0"
                    : "Datos en este navegador"}
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
            {isStudentPreview ? (
              <div className="preview-indicator" role="status">
                <Eye aria-hidden="true" />
                <span>
                  Vista estudiante
                  <strong>{viewProfile?.displayName}</strong>
                </span>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Volver al panel de administración"
                  title="Volver al panel"
                  onClick={() => {
                    stopStudentPreview();
                    navigate("/admin");
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ) : isActorStaff ? (
              <div className={`preview-picker ${previewOpen ? "is-open" : ""}`}>
                <button
                  className="button secondary preview-trigger"
                  type="button"
                  aria-expanded={previewOpen}
                  onClick={() => setPreviewOpen((current) => !current)}
                >
                  <Eye aria-hidden="true" />
                  Ver como estudiante
                </button>
                {previewOpen ? (
                  <div className="preview-popover">
                    <label htmlFor="student-preview-select">
                      Perspectiva
                    </label>
                    <select
                      id="student-preview-select"
                      value={selectedStudentId || students[0]?.id || ""}
                      onChange={(event) =>
                        setSelectedStudentId(event.target.value)
                      }
                    >
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.displayName}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button primary wide"
                      type="button"
                      disabled={students.length === 0}
                      onClick={() => {
                        const studentId =
                          selectedStudentId || students[0]?.id;
                        if (!studentId) return;
                        startStudentPreview(studentId);
                        setPreviewOpen(false);
                        navigate("/");
                      }}
                    >
                      <Eye aria-hidden="true" />
                      Abrir vista
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
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
                {profile ? (
                  <ProfileAvatar profile={profile} size="medium" decorative />
                ) : null}
                <span className="profile-copy">
                  <strong>{profile?.displayName}</strong>
                  <small>
                    {profile?.role === "owner"
                      ? "propietario"
                      : profile?.role === "mentor"
                        ? "mentor"
                        : "estudiante"}
                  </small>
                </span>
                <ChevronDown aria-hidden="true" />
              </button>
              {profileOpen ? (
                <div className="profile-menu-popover" role="menu">
                  <NavLink
                    className="profile-menu-action"
                    role="menuitem"
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserRound aria-hidden="true" />
                    Editar perfil
                  </NavLink>
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
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {frontendOnly ? (
          <div className="frontend-only-banner" role="status">
            <Unplug aria-hidden="true" />
            <span>
              <strong>Vista para contribuir al frontend</strong>
              Supabase, GitHub, entregas y acciones administrativas están
              desactivados.
            </span>
          </div>
        ) : null}
        {error ? (
          <div className="app-error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{error}</span>
            <button
              className="icon-button"
              type="button"
              aria-label="Cerrar error"
              onClick={clearError}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
