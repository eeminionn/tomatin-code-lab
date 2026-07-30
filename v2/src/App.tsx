import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AccessPage } from "@/pages/AccessPage";
import { useClassroom } from "@/state/classroom-context";

function lazyPage(loader: () => Promise<{ Component: React.ComponentType }>) {
  return lazy(() => loader().then(({ Component }) => ({ default: Component })));
}

const DashboardPage = lazyPage(() => import("@/pages/DashboardPage"));
const MissionsPage = lazyPage(() => import("@/pages/MissionsPage"));
const MissionWorkspace = lazyPage(() => import("@/pages/MissionWorkspace"));
const RankingPage = lazyPage(() => import("@/pages/RankingPage"));
const FeedbackPage = lazyPage(() => import("@/pages/FeedbackPage"));
const MentorPage = lazyPage(() => import("@/pages/MentorPage"));
const AboutPage = lazyPage(() => import("@/pages/AboutPage"));

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <span className="brand-command">T_</span>
      <span>Conectando al aula...</span>
    </main>
  );
}

function HomeRoute() {
  const { profile, isStudentPreview } = useClassroom();
  const isStaff = profile?.role === "owner" || profile?.role === "mentor";
  if (isStaff && !isStudentPreview) {
    return <Navigate to="/admin" replace />;
  }
  return <DashboardPage />;
}

export function App() {
  const { profile, loading } = useClassroom();
  if (loading) return <LoadingScreen />;
  if (!profile) return <AccessPage />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="mission/:slug" element={<MissionWorkspace />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="admin/*" element={<MentorPage />} />
          <Route path="mentor" element={<Navigate to="/admin" replace />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="auth/callback" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
