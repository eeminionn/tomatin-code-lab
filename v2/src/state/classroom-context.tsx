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
import { getMissionById } from "@/data/missions";
import type {
  ActivityKind,
  Attempt,
  ClassroomSnapshot,
  CreateAssignmentInput,
  Language,
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
  viewProfile: Profile | null;
  previewStudentId: string | null;
  isStudentPreview: boolean;
  snapshot: ClassroomSnapshot | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  backendMode: "supabase" | "demo";
  loginDemo: (role: "student" | "mentor") => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  recordAttempt: (attempt: Attempt) => void;
  reviewAttempt: (
    attemptId: string,
    decision: Review["decision"],
    comment: string,
    details?: Pick<Review, "inlineComments" | "criteria">,
  ) => Promise<void>;
  createAssignment: (input: CreateAssignmentInput) => void;
  createInvitations: (count: number) => void;
  markNotificationRead: (id: string) => void;
  recordHint: (assignmentId: string, count: number) => void;
  recordActivity: (
    assignmentId: string,
    language: Language,
    event: ActivityKind,
  ) => void;
  startStudentPreview: (studentId: string) => void;
  stopStudentPreview: () => void;
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

function readDemoSnapshot(): ClassroomSnapshot {
  try {
    const stored = localStorage.getItem(DEMO_SNAPSHOT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ClassroomSnapshot;
      return {
        ...parsed,
        reviews: parsed.reviews.map((review) => ({
          ...review,
          inlineComments: review.inlineComments ?? [],
          criteria: review.criteria ?? [],
        })),
        progress: parsed.progress.map((progress) => ({
          ...progress,
          missionVersion:
            progress.missionVersion ??
            parsed.assignments.find(
              (assignment) => assignment.id === progress.assignmentId,
            )?.missionVersion ??
            1,
        })),
      };
    }
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

async function fetchClassAttempts(classId: string) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const pageSize = 500;
  const data: Array<{
    id: string;
    user_id: string;
    mission_id: string;
    assignment_id: string | null;
    mission_version: number;
    language: Language;
    kind: Attempt["kind"];
    code: string;
    result: Attempt["result"];
    created_at: string;
  }> = [];
  for (let from = 0; ; from += pageSize) {
    const page = await supabase
      .from("attempts")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (page.error) return { data: null, error: page.error };
    data.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < pageSize) {
      return { data, error: null };
    }
  }
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
  const isStaff =
    profileQuery.data.role === "owner" || profileQuery.data.role === "mentor";
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
    fetchClassAttempts(classId),
    supabase.from("reviews").select("*, attempts!inner(class_id)").eq("attempts.class_id", classId),
    isStaff
      ? supabase
          .from("notifications")
          .select("*")
          .eq("class_id", classId)
          .order("created_at", { ascending: false })
      : supabase
          .from("notifications")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
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
        missionVersion: row.mission_version,
        status: row.status,
        language: row.language ?? undefined,
        lastEvent: row.last_event ?? undefined,
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
        inlineComments: row.inline_comments ?? [],
        criteria: row.criteria ?? [],
        createdAt: row.created_at,
      })),
      notifications: (notifications.data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        classId: row.class_id ?? undefined,
        assignmentId: row.assignment_id ?? undefined,
        attemptId: row.attempt_id ?? undefined,
        reviewId: row.review_id ?? undefined,
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
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const provisionRequested = useRef(new Set<string>());
  const backendMode = isSupabaseConfigured ? "supabase" : "demo";
  const previewProfile = previewStudentId
    ? snapshot?.profiles.find(
        (entry) =>
          entry.id === previewStudentId && entry.role === "student",
      )
    : undefined;
  const viewProfile = previewProfile ?? profile;
  const isStudentPreview = Boolean(previewProfile);

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
          filter:
            profile.role === "owner" || profile.role === "mentor"
              ? `class_id=eq.${snapshot.classroom.id}`
              : `user_id=eq.${profile.id}`,
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
    setPreviewStudentId(null);
    setProfile(role === "mentor" ? demoOwner : demoStudent);
    setSnapshot(readDemoSnapshot());
  }, []);

  const logout = useCallback(async () => {
    if (supabase) await signOutSupabase();
    localStorage.removeItem(DEMO_SESSION_KEY);
    provisionRequested.current.clear();
    setPreviewStudentId(null);
    setProfile(null);
    if (!supabase) setSnapshot(readDemoSnapshot());
  }, []);

  const recordAttempt = useCallback(
    (attempt: Attempt) => {
      if (previewStudentId || !snapshot || !profile) return;
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
            .then(({ error: attemptError }) => {
              if (attemptError) {
                setError(attemptError.message);
                return;
              }
              void refresh();
            });
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
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const reviewAttempt = useCallback(
    async (
      attemptId: string,
      decision: Review["decision"],
      comment: string,
      details?: Pick<Review, "inlineComments" | "criteria">,
    ) => {
      if (previewStudentId || !snapshot || !profile) return;
      if (supabase) {
        const { error: reviewError } = await supabase.rpc(
          "review_submission",
          {
            p_attempt_id: attemptId,
            p_decision: decision,
            p_comment: comment,
            p_inline_comments: details?.inlineComments ?? [],
            p_criteria: details?.criteria ?? [],
          },
        );
        if (reviewError) {
          setError(reviewError.message);
          throw reviewError;
        }
        await refresh();
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
        inlineComments: details?.inlineComments ?? [],
        criteria: details?.criteria ?? [],
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
            classId: snapshot.classroom.id,
            assignmentId: attempt.assignmentId,
            attemptId: attempt.id,
            reviewId: review.id,
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
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const createAssignment = useCallback(
    (input: CreateAssignmentInput) => {
      if (previewStudentId || !snapshot) return;
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
          .then(({ error: assignmentError }) => {
            if (assignmentError) {
              setError(assignmentError.message);
              return;
            }
            void refresh();
          });
        return;
      }
      const id = crypto.randomUUID();
      const missionVersion = getMissionById(input.missionId)?.version ?? 1;
      persistDemo({
        ...snapshot,
        assignments: [
          ...snapshot.assignments,
          {
            ...input,
            id,
            missionVersion,
            status: "published",
          },
        ],
        progress: [
          ...snapshot.progress,
          ...input.studentIds.map((userId) => ({
            userId,
            assignmentId: id,
            missionVersion,
            status: "not_started" as const,
            attempts: 0,
            hintsUsed: 0,
          })),
        ],
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const createInvitations = useCallback(
    (count: number) => {
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        void supabase
          .rpc("create_invitations", { p_count: count })
          .then(({ data, error: invitationError }) => {
            if (invitationError) {
              setError(invitationError.message);
              return;
            }
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
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        void supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
          .then(({ error: notificationError }) => {
            if (notificationError) {
              setError(notificationError.message);
              return;
            }
            void refresh();
          });
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
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const recordHint = useCallback(
    (assignmentId: string, count: number) => {
      if (previewStudentId || !snapshot || !profile) return;
      if (supabase) {
        void supabase
          .rpc("record_hint", {
            p_assignment_id: assignmentId,
            p_count: count,
          })
          .then(({ error: hintError }) => {
            if (hintError) setError(hintError.message);
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
    [persistDemo, previewStudentId, profile, snapshot],
  );

  const recordActivity = useCallback(
    (
      assignmentId: string,
      language: Language,
      event: ActivityKind,
    ) => {
      if (previewStudentId || !snapshot || !profile) return;
      if (supabase) {
        void supabase
          .rpc("record_student_activity", {
            p_assignment_id: assignmentId,
            p_language: language,
            p_event: event,
          })
          .then(({ error: activityError }) => {
            if (activityError) setError(activityError.message);
          });
        return;
      }
      persistDemo({
        ...snapshot,
        progress: snapshot.progress.map((entry) =>
          entry.userId === profile.id && entry.assignmentId === assignmentId
            ? {
                ...entry,
                language,
                lastEvent: event,
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
    [persistDemo, previewStudentId, profile, snapshot],
  );

  const startStudentPreview = useCallback(
    (studentId: string) => {
      const isStaff = profile?.role === "owner" || profile?.role === "mentor";
      const isStudent = snapshot?.profiles.some(
        (entry) => entry.id === studentId && entry.role === "student",
      );
      if (isStaff && isStudent) setPreviewStudentId(studentId);
    },
    [profile?.role, snapshot?.profiles],
  );

  const stopStudentPreview = useCallback(() => {
    setPreviewStudentId(null);
  }, []);
  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<ClassroomContextValue>(
    () => ({
      profile,
      viewProfile,
      previewStudentId,
      isStudentPreview,
      snapshot,
      loading,
      error,
      clearError,
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
      recordActivity,
      startStudentPreview,
      stopStudentPreview,
    }),
    [
      backendMode,
      clearError,
      createAssignment,
      createInvitations,
      error,
      loading,
      loginDemo,
      logout,
      markNotificationRead,
      profile,
      viewProfile,
      previewStudentId,
      isStudentPreview,
      recordAttempt,
      recordActivity,
      recordHint,
      refresh,
      reviewAttempt,
      snapshot,
      startStudentPreview,
      stopStudentPreview,
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
