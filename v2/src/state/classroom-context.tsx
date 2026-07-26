import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createDemoSnapshot, demoOwner, demoStudent } from "@/data/demo-classroom";
import type {
  Attempt,
  ClassroomSnapshot,
  CreateAssignmentInput,
  Profile,
  Review,
} from "@/types";
import {
  acceptPendingInvitation,
  isSupabaseConfigured,
  provisionStudentRepository,
  signOutSupabase,
  supabase,
} from "@/services/supabase";
import {
  progressAfterAttempt,
  progressAfterReview,
} from "@/models/progress";

const DEMO_SESSION_KEY = "tomatin.v2.demo-session";
const DEMO_SNAPSHOT_KEY = "tomatin.v2.demo-classroom";

interface ClassroomContextValue {
  profile: Profile | null;
  snapshot: ClassroomSnapshot | null;
  loading: boolean;
  error: string | null;
  backendMode: "supabase" | "demo";
  loginDemo: (role: "student" | "mentor") => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  recordAttempt: (attempt: Attempt) => void;
  reviewAttempt: (
    attemptId: string,
    decision: Review["decision"],
    comment: string,
  ) => void;
  createAssignment: (input: CreateAssignmentInput) => void;
  createInvitations: (count: number) => void;
  markNotificationRead: (id: string) => void;
  recordHint: (assignmentId: string, count: number) => void;
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

function readDemoSnapshot(): ClassroomSnapshot {
  try {
    const stored = localStorage.getItem(DEMO_SNAPSHOT_KEY);
    if (stored) return JSON.parse(stored) as ClassroomSnapshot;
  } catch {
    localStorage.removeItem(DEMO_SNAPSHOT_KEY);
  }
  return createDemoSnapshot();
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    displayName: String(row.display_name ?? "Estudiante"),
    email: String(row.email ?? ""),
    githubLogin: row.github_login ? String(row.github_login) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    role: row.role as Profile["role"],
  };
}

async function fetchSupabaseSnapshot(session: Session) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const profileQuery = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (profileQuery.error) throw profileQuery.error;

  const membershipQuery = await supabase
    .from("memberships")
    .select("class_id")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .limit(1)
    .single();
  if (membershipQuery.error) throw membershipQuery.error;

  const classId = membershipQuery.data.class_id;
  const [
    classroom,
    profiles,
    assignments,
    progress,
    attempts,
    reviews,
    notifications,
    invitations,
    repositories,
  ] = await Promise.all([
    supabase.from("classes").select("*").eq("id", classId).single(),
    supabase
      .from("profiles")
      .select("*, memberships!inner(class_id, status)")
      .eq("memberships.class_id", classId)
      .eq("memberships.status", "active"),
    supabase.from("assignments").select("*").eq("class_id", classId),
    supabase.from("student_progress").select("*").eq("class_id", classId),
    supabase.from("attempts").select("*").eq("class_id", classId).order("created_at", { ascending: false }).limit(100),
    supabase.from("reviews").select("*, attempts!inner(class_id)").eq("attempts.class_id", classId),
    supabase.from("notifications").select("*").eq("user_id", session.user.id),
    supabase.from("invitations").select("*").eq("class_id", classId),
    supabase.from("student_repositories").select("*").eq("class_id", classId),
  ]);

  const firstError = [
    classroom,
    profiles,
    assignments,
    progress,
    attempts,
    reviews,
    notifications,
    invitations,
    repositories,
  ].find((query) => query.error)?.error;
  if (firstError) throw firstError;

  return {
    profile: mapProfile(profileQuery.data),
    snapshot: {
      classroom: {
        id: classroom.data.id,
        name: classroom.data.name,
        timezone: classroom.data.timezone,
        ownerId: classroom.data.owner_id,
      },
      profiles: (profiles.data ?? []).map(mapProfile),
      assignments: (assignments.data ?? []).map((row) => ({
        id: row.id,
        missionId: row.mission_id,
        missionVersion: row.mission_version,
        title: row.title,
        instructions: row.instructions ?? "",
        dueAt: row.due_at,
        points: row.points,
        allowedLanguages: row.allowed_languages,
        studentIds: row.student_ids ?? [],
        status: row.status,
      })),
      progress: (progress.data ?? []).map((row) => ({
        userId: row.user_id,
        assignmentId: row.assignment_id,
        status: row.status,
        language: row.language ?? undefined,
        lastActivityAt: row.last_activity_at ?? undefined,
        submittedAt: row.submitted_at ?? undefined,
        approvedAt: row.approved_at ?? undefined,
        attempts: row.attempts,
        hintsUsed: row.hints_used,
      })),
      attempts: (attempts.data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        missionId: row.mission_id,
        assignmentId: row.assignment_id ?? undefined,
        missionVersion: row.mission_version,
        language: row.language,
        kind: row.kind,
        code: row.code,
        result: row.result,
        createdAt: row.created_at,
      })),
      reviews: (reviews.data ?? []).map((row) => ({
        id: row.id,
        attemptId: row.attempt_id,
        mentorId: row.mentor_id,
        decision: row.decision,
        comment: row.comment,
        createdAt: row.created_at,
      })),
      notifications: (notifications.data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        body: row.body,
        readAt: row.read_at ?? undefined,
        createdAt: row.created_at,
      })),
      invitations: (invitations.data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        token: row.token_preview ?? "",
        expiresAt: row.expires_at,
        usedAt: row.used_at ?? undefined,
      })),
      repositories: (repositories.data ?? []).map((row) => ({
        id: row.id,
        classId: row.class_id,
        userId: row.user_id,
        ownerLogin: row.owner_login,
        name: row.repository_name,
        htmlUrl: row.html_url,
        visibility: row.visibility,
        status: row.status,
        collaboratorStatus: row.collaborator_status,
        lastSyncedAt: row.last_synced_at ?? undefined,
        lastError: row.last_error ?? undefined,
      })),
    },
  };
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const provisionRequested = useRef(new Set<string>());
  const backendMode = isSupabaseConfigured ? "supabase" : "demo";

  const persistDemo = useCallback((next: ClassroomSnapshot) => {
    setSnapshot(next);
    localStorage.setItem(DEMO_SNAPSHOT_KEY, JSON.stringify(next));
  }, []);

  const refresh = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    setError(null);
    try {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setProfile(null);
          setSnapshot(null);
          return;
        }
        await acceptPendingInvitation();
        const loaded = await fetchSupabaseSnapshot(data.session);
        setProfile(loaded.profile);
        setSnapshot(loaded.snapshot);
        if (
          loaded.profile.role === "student" &&
          !loaded.snapshot.repositories.some(
            (repository) => repository.userId === loaded.profile.id,
          ) &&
          !provisionRequested.current.has(loaded.profile.id)
        ) {
          provisionRequested.current.add(loaded.profile.id);
          void provisionStudentRepository()
            .then((result) => {
              const repository = result.repository;
              if (!repository) return;
              setSnapshot((current) =>
                current
                  ? {
                      ...current,
                      repositories: [
                        ...current.repositories.filter(
                          (entry) => entry.id !== repository.id,
                        ),
                        repository,
                      ],
                    }
                  : current,
              );
            })
            .catch(() => {
              provisionRequested.current.delete(loaded.profile.id);
            });
        }
        return;
      }

      const role = localStorage.getItem(DEMO_SESSION_KEY);
      setSnapshot(readDemoSnapshot());
      setProfile(
        role === "mentor" ? demoOwner : role === "student" ? demoStudent : null,
      );
    } catch (refreshError) {
      setSnapshot(null);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "No se pudo cargar el aula.",
      );
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !snapshot || !profile) return;
    const realtimeClient = supabase;
    let timer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 250);
    };
    const channel = realtimeClient
      .channel(`classroom:${snapshot.classroom.id}:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_progress" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attempts" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_repositories",
          filter: `class_id=eq.${snapshot.classroom.id}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      void realtimeClient.removeChannel(channel);
    };
  }, [profile, refresh, snapshot?.classroom.id]);

  const loginDemo = useCallback((role: "student" | "mentor") => {
    localStorage.setItem(DEMO_SESSION_KEY, role);
    setProfile(role === "mentor" ? demoOwner : demoStudent);
    setSnapshot(readDemoSnapshot());
  }, []);

  const logout = useCallback(async () => {
    if (supabase) await signOutSupabase();
    localStorage.removeItem(DEMO_SESSION_KEY);
    provisionRequested.current.clear();
    setProfile(null);
    if (!supabase) setSnapshot(readDemoSnapshot());
  }, []);

  const recordAttempt = useCallback(
    (attempt: Attempt) => {
      if (!snapshot || !profile) return;
      if (supabase) {
        const isLocalRun =
          attempt.kind === "run" && attempt.language !== "cpp";
        if (isLocalRun) {
          void supabase
            .from("attempts")
            .insert({
              id: attempt.id,
              class_id: snapshot.classroom.id,
              user_id: attempt.userId,
              mission_id: attempt.missionId,
              assignment_id: attempt.assignmentId ?? null,
              mission_version: attempt.missionVersion,
              language: attempt.language,
              kind: attempt.kind,
              remote: false,
              code: attempt.code,
              result: attempt.result,
              created_at: attempt.createdAt,
            })
            .then(() => refresh());
        } else {
          void refresh();
        }
        return;
      }

      const assignment = snapshot.assignments.find(
        (entry) => entry.id === attempt.assignmentId,
      );
      const passed =
        attempt.result.tests.length > 0 &&
        attempt.result.tests.every((entry) => entry.passed);
      const progress = snapshot.progress.map((entry) => {
        if (
          entry.userId !== profile.id ||
          entry.assignmentId !== attempt.assignmentId
        ) {
          return entry;
        }
        return progressAfterAttempt(entry, attempt);
      });
      const notifications =
        attempt.kind === "submit" && passed && assignment
          ? [
              ...snapshot.notifications,
              {
                id: crypto.randomUUID(),
                userId: snapshot.classroom.ownerId,
                title: "Nueva entrega",
                body: `${profile.displayName} entregó ${assignment.title}.`,
                createdAt: attempt.createdAt,
              },
            ]
          : snapshot.notifications;
      persistDemo({
        ...snapshot,
        attempts: [attempt, ...snapshot.attempts],
        progress,
        notifications,
      });
    },
    [persistDemo, profile, refresh, snapshot],
  );

  const reviewAttempt = useCallback(
    (attemptId: string, decision: Review["decision"], comment: string) => {
      if (!snapshot || !profile) return;
      if (supabase) {
        void supabase
          .rpc("review_submission", {
            p_attempt_id: attemptId,
            p_decision: decision,
            p_comment: comment,
          })
          .then(() => refresh());
        return;
      }
      const attempt = snapshot.attempts.find((entry) => entry.id === attemptId);
      if (!attempt?.assignmentId) return;
      const review: Review = {
        id: crypto.randomUUID(),
        attemptId,
        mentorId: profile.id,
        decision,
        comment,
        createdAt: new Date().toISOString(),
      };
      persistDemo({
        ...snapshot,
        reviews: [review, ...snapshot.reviews],
        progress: snapshot.progress.map((entry) =>
          entry.userId === attempt.userId &&
          entry.assignmentId === attempt.assignmentId
            ? progressAfterReview(entry, review)
            : entry,
        ),
        notifications: [
          ...snapshot.notifications,
          {
            id: crypto.randomUUID(),
            userId: attempt.userId,
            title:
              decision === "approved"
                ? "Entrega aprobada"
                : decision === "changes_requested"
                  ? "Hay cambios solicitados"
                  : "Nuevo comentario",
            body: comment,
            createdAt: review.createdAt,
          },
        ],
      });
    },
    [persistDemo, profile, refresh, snapshot],
  );

  const createAssignment = useCallback(
    (input: CreateAssignmentInput) => {
      if (!snapshot) return;
      if (supabase) {
        void supabase
          .rpc("create_assignment", {
            p_mission_id: input.missionId,
            p_title: input.title,
            p_instructions: input.instructions,
            p_due_at: input.dueAt,
            p_points: input.points,
            p_allowed_languages: input.allowedLanguages,
            p_student_ids: input.studentIds,
          })
          .then(() => refresh());
        return;
      }
      const id = crypto.randomUUID();
      persistDemo({
        ...snapshot,
        assignments: [
          ...snapshot.assignments,
          {
            ...input,
            id,
            missionVersion: 1,
            status: "published",
          },
        ],
        progress: [
          ...snapshot.progress,
          ...input.studentIds.map((userId) => ({
            userId,
            assignmentId: id,
            status: "not_started" as const,
            attempts: 0,
            hintsUsed: 0,
          })),
        ],
      });
    },
    [persistDemo, refresh, snapshot],
  );

  const createInvitations = useCallback(
    (count: number) => {
      if (!snapshot) return;
      if (supabase) {
        void supabase
          .rpc("create_invitations", { p_count: count })
          .then(({ data }) => {
            if (!data) return;
            setSnapshot((current) =>
              current
                ? {
                    ...current,
                    invitations: [
                      ...current.invitations,
                      ...data.map((row: {
                        id: string;
                        label: string;
                        token: string;
                        expires_at: string;
                      }) => ({
                        id: row.id,
                        label: row.label,
                        token: row.token,
                        expiresAt: row.expires_at,
                      })),
                    ],
                  }
                : current,
            );
          });
        return;
      }
      const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
      persistDemo({
        ...snapshot,
        invitations: [
          ...snapshot.invitations,
          ...Array.from({ length: count }, (_, index) => ({
            id: crypto.randomUUID(),
            label: `Invitación ${snapshot.invitations.length + index + 1}`,
            token: crypto.randomUUID(),
            expiresAt,
          })),
        ],
      });
    },
    [persistDemo, refresh, snapshot],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      if (!snapshot) return;
      if (supabase) {
        void supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
          .then(() => refresh());
        return;
      }
      persistDemo({
        ...snapshot,
        notifications: snapshot.notifications.map((entry) =>
          entry.id === id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      });
    },
    [persistDemo, refresh, snapshot],
  );

  const recordHint = useCallback(
    (assignmentId: string, count: number) => {
      if (!snapshot || !profile) return;
      if (supabase) {
        void supabase.rpc("record_hint", {
          p_assignment_id: assignmentId,
          p_count: count,
        });
        return;
      }
      persistDemo({
        ...snapshot,
        progress: snapshot.progress.map((entry) =>
          entry.userId === profile.id && entry.assignmentId === assignmentId
            ? {
                ...entry,
                hintsUsed: Math.max(entry.hintsUsed, count),
                status:
                  entry.status === "not_started"
                    ? "in_progress"
                    : entry.status,
                lastActivityAt: new Date().toISOString(),
              }
            : entry,
        ),
      });
    },
    [persistDemo, profile, snapshot],
  );

  const value = useMemo<ClassroomContextValue>(
    () => ({
      profile,
      snapshot,
      loading,
      error,
      backendMode,
      loginDemo,
      logout,
      refresh,
      recordAttempt,
      reviewAttempt,
      createAssignment,
      createInvitations,
      markNotificationRead,
      recordHint,
    }),
    [
      backendMode,
      createAssignment,
      createInvitations,
      error,
      loading,
      loginDemo,
      logout,
      markNotificationRead,
      profile,
      recordAttempt,
      recordHint,
      refresh,
      reviewAttempt,
      snapshot,
    ],
  );

  return (
    <ClassroomContext.Provider value={value}>
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const value = useContext(ClassroomContext);
  if (!value) throw new Error("useClassroom debe usarse dentro de ClassroomProvider.");
  return value;
}
