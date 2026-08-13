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
import { frontendOnlyMessage, isFrontendOnly } from "@/config/runtime";
import { createDemoSnapshot, demoOwner, demoStudent } from "@/data/demo-classroom";
import { getMissionById } from "@/data/missions";
import type {
  ActivityKind,
  Attempt,
  ClassroomSnapshot,
  CreateAssignmentInput,
  Invitation,
  InvitationInput,
  Language,
  Profile,
  ProfileUpdateInput,
  RewardInput,
  Review,
  ReviewRubricInput,
  UpdateAssignmentInput,
} from "@/types";
import {
  acceptPendingInvitation,
  notifyAssignment,
  isSupabaseConfigured,
  provisionStudentRepository,
  signOutSupabase,
  supabase,
} from "@/services/supabase";
import {
  progressAfterAttempt,
  progressAfterReview,
} from "@/models/progress";
import { sanitizeAvatarConfig } from "@/lib/avatar";
import { availableXpForStudent } from "@/models/rewards";

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
  frontendOnly: boolean;
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
  approveAttempts: (attemptIds: string[]) => Promise<number>;
  createAssignment: (input: CreateAssignmentInput) => Promise<void>;
  retryAssignmentNotification: (assignmentId: string) => Promise<void>;
  updateAssignment: (id: string, input: UpdateAssignmentInput) => Promise<void>;
  saveReviewRubric: (id: string | null, input: ReviewRubricInput) => Promise<void>;
  deleteReviewRubric: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  createInvitation: (input: InvitationInput) => Promise<void>;
  updateInvitation: (id: string, input: InvitationInput) => Promise<void>;
  getInvitationToken: (id: string) => Promise<string>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => Promise<void>;
  dismissAllNotifications: () => Promise<void>;
  saveReward: (id: string | null, input: RewardInput) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  redeemReward: (id: string) => Promise<void>;
  updateRedemptionStatus: (
    id: string,
    status: "fulfilled" | "cancelled",
  ) => Promise<void>;
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
        rewards: parsed.rewards ?? [],
        rewardRedemptions: parsed.rewardRedemptions ?? [],
        githubNotifications: parsed.githubNotifications ?? [],
        reviewRubrics: parsed.reviewRubrics ?? [],
      };
    }
  } catch {
    localStorage.removeItem(DEMO_SNAPSHOT_KEY);
  }
  return createDemoSnapshot();
}

function mapProfile(row: Record<string, unknown>): Profile {
  const id = String(row.id);
  const rawAvatarConfig = row.avatar_config;
  const hasAvatarConfig =
    rawAvatarConfig !== null &&
    typeof rawAvatarConfig === "object" &&
    !Array.isArray(rawAvatarConfig) &&
    Object.keys(rawAvatarConfig as Record<string, unknown>).length > 0;
  return {
    id,
    displayName: String(row.display_name ?? "Estudiante"),
    email: String(row.email ?? ""),
    githubLogin: row.github_login ? String(row.github_login) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    profileImagePath: row.profile_image_path
      ? String(row.profile_image_path)
      : undefined,
    avatarConfig: hasAvatarConfig
      ? sanitizeAvatarConfig(rawAvatarConfig, id)
      : undefined,
    role: row.role as Profile["role"],
  };
}

async function createProfileImageUrls(rows: Array<Record<string, unknown>>) {
  if (!supabase) return new Map<string, string>();
  const paths = [...new Set(
    rows
      .map((row) => row.profile_image_path)
      .filter((path): path is string => typeof path === "string" && Boolean(path)),
  )];
  if (paths.length === 0) return new Map<string, string>();
  const { data, error } = await supabase.storage
    .from("profile-images")
    .createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const urls = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
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
    rewards,
    rewardRedemptions,
    githubNotifications,
    reviewRubrics,
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
    supabase
      .from("rewards")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reward_redemptions")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false }),
    isStaff
      ? supabase
          .from("assignment_github_notifications")
          .select("*")
          .eq("class_id", classId)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    isStaff
      ? supabase
          .from("review_rubrics")
          .select("*")
          .eq("class_id", classId)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
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
    rewards,
    rewardRedemptions,
    githubNotifications,
    reviewRubrics,
  ].find((query) => query.error)?.error;
  if (firstError) throw firstError;

  const profileRows = [
    profileQuery.data,
    ...((profiles.data ?? []) as Array<Record<string, unknown>>),
  ];
  const signedProfileImages = await createProfileImageUrls(profileRows);

  const mapProfileWithImage = (row: Record<string, unknown>) => {
    const mapped = mapProfile(row);
    const path = mapped.profileImagePath;
    return {
      ...mapped,
      avatarUrl: path ? signedProfileImages.get(path) : mapped.avatarUrl,
    };
  };

  return {
    profile: mapProfileWithImage(profileQuery.data),
    snapshot: {
      classroom: {
        id: classroom.data.id,
        name: classroom.data.name,
        timezone: classroom.data.timezone,
        ownerId: classroom.data.owner_id,
      },
      profiles: (profiles.data ?? []).map(mapProfileWithImage),
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
        rubricId: row.rubric_id ?? undefined,
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
        dismissedAt: row.dismissed_at ?? undefined,
        createdAt: row.created_at,
      })),
      invitations: (invitations.data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        tokenPreview: row.token_preview ?? "",
        expiresAt: row.expires_at,
        usedAt: row.used_at ?? undefined,
        maxUses: row.max_uses ?? 1,
        useCount: row.use_count ?? (row.used_at ? 1 : 0),
        revokedAt: row.revoked_at ?? undefined,
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
        storageMode: row.storage_mode ?? "legacy_per_student",
        studentPath: row.student_path ?? undefined,
        lastSyncedAt: row.last_synced_at ?? undefined,
        lastError: row.last_error ?? undefined,
      })),
      rewards: (rewards.data ?? []).map((row) => ({
        id: row.id,
        classId: row.class_id,
        title: row.title,
        description: row.description,
        priceXp: row.price_xp,
        imagePath: row.image_path ?? undefined,
        stock: row.stock ?? undefined,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      rewardRedemptions: (rewardRedemptions.data ?? []).map((row) => ({
        id: row.id,
        rewardId: row.reward_id ?? undefined,
        classId: row.class_id,
        userId: row.user_id,
        rewardTitle: row.reward_title,
        rewardImagePath: row.reward_image_path ?? undefined,
        costXp: row.cost_xp,
        status: row.status,
        createdAt: row.created_at,
        fulfilledAt: row.fulfilled_at ?? undefined,
        cancelledAt: row.cancelled_at ?? undefined,
      })),
      githubNotifications: (githubNotifications.data ?? []).map((row) => ({
        assignmentId: row.assignment_id,
        classId: row.class_id,
        status: row.status,
        mentionedLogins: row.mentioned_logins ?? [],
        missingUserIds: row.missing_user_ids ?? [],
        githubCommentUrl: row.github_comment_url ?? undefined,
        attempts: row.attempts,
        lastError: row.last_error ?? undefined,
        sentAt: row.sent_at ?? undefined,
        updatedAt: row.updated_at,
      })),
      reviewRubrics: (reviewRubrics.data ?? []).map((row) => ({
        id: row.id,
        classId: row.class_id,
        title: row.title,
        criteria: row.criteria ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
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
    if (isFrontendOnly) return;
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
        const ownRepository = loaded.snapshot.repositories.find(
          (repository) => repository.userId === loaded.profile.id,
        );
        if (
          loaded.profile.role === "student" &&
          (!ownRepository ||
            ownRepository.storageMode !== "central" ||
            ownRepository.status === "error") &&
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
                          (entry) => entry.userId !== repository.userId,
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
      setSnapshot(isFrontendOnly ? createDemoSnapshot() : readDemoSnapshot());
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
        { event: "UPDATE", schema: "public", table: "profiles" },
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
          table: "invitations",
          filter: `class_id=eq.${snapshot.classroom.id}`,
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rewards",
          filter: `class_id=eq.${snapshot.classroom.id}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_redemptions",
          filter: `class_id=eq.${snapshot.classroom.id}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignment_github_notifications",
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
    setSnapshot(isFrontendOnly ? createDemoSnapshot() : readDemoSnapshot());
  }, []);

  const logout = useCallback(async () => {
    if (supabase) await signOutSupabase();
    localStorage.removeItem(DEMO_SESSION_KEY);
    provisionRequested.current.clear();
    setPreviewStudentId(null);
    setProfile(null);
    if (!supabase) {
      setSnapshot(isFrontendOnly ? createDemoSnapshot() : readDemoSnapshot());
    }
  }, []);

  const recordAttempt = useCallback(
    (attempt: Attempt) => {
      if (isFrontendOnly) return;
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
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
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

  const approveAttempts = useCallback(
    async (attemptIds: string[]) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot || !profile) return 0;
      const uniqueIds = [...new Set(attemptIds)].slice(0, 25);
      if (supabase) {
        let approved = 0;
        for (const attemptId of uniqueIds) {
          const { error: reviewError } = await supabase.rpc("review_submission", {
            p_attempt_id: attemptId,
            p_decision: "approved",
            p_comment: "Buen trabajo. La entrega cumple los objetivos de la misión.",
            p_inline_comments: [],
            p_criteria: [],
          });
          if (reviewError) throw new Error(`${approved} aprobadas. ${reviewError.message}`);
          approved += 1;
        }
        await refresh();
        return approved;
      }

      const now = new Date().toISOString();
      const attempts = snapshot.attempts.filter((entry) => uniqueIds.includes(entry.id));
      const reviews = attempts.map((attempt) => ({
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        mentorId: profile.id,
        decision: "approved" as const,
        comment: "Buen trabajo. La entrega cumple los objetivos de la misión.",
        inlineComments: [],
        criteria: [],
        createdAt: now,
      }));
      persistDemo({
        ...snapshot,
        reviews: [...reviews, ...snapshot.reviews],
        progress: snapshot.progress.map((entry) => {
          const attempt = attempts.find(
            (item) => item.userId === entry.userId && item.assignmentId === entry.assignmentId,
          );
          const review = attempt
            ? reviews.find((item) => item.attemptId === attempt.id)
            : undefined;
          return review ? progressAfterReview(entry, review) : entry;
        }),
        notifications: [
          ...snapshot.notifications,
          ...attempts.map((attempt) => ({
            id: crypto.randomUUID(),
            userId: attempt.userId,
            classId: snapshot.classroom.id,
            assignmentId: attempt.assignmentId,
            attemptId: attempt.id,
            reviewId: reviews.find((entry) => entry.attemptId === attempt.id)?.id,
            title: "Entrega aprobada",
            body: "Buen trabajo. La entrega cumple los objetivos de la misión.",
            createdAt: now,
          })),
        ],
      });
      return attempts.length;
    },
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const createAssignment = useCallback(
    async (input: CreateAssignmentInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        const { data: assignmentId, error: assignmentError } = await supabase
          .rpc("create_assignment", {
            p_mission_id: input.missionId,
            p_title: input.title,
            p_instructions: input.instructions,
            p_due_at: input.dueAt,
            p_points: input.points,
            p_allowed_languages: input.allowedLanguages,
            p_student_ids: input.studentIds,
          });
        if (assignmentError) {
          setError(assignmentError.message);
          throw assignmentError;
        }
        if (input.rubricId) {
          const { error: rubricError } = await supabase
            .from("assignments")
            .update({ rubric_id: input.rubricId })
            .eq("id", assignmentId)
            .eq("class_id", snapshot.classroom.id);
          if (rubricError) throw rubricError;
        }
        await refresh();
        try {
          await notifyAssignment(String(assignmentId));
          await refresh();
        } catch (notificationError) {
          setError(
            `La tarea fue creada, pero el aviso de GitHub falló: ${
              notificationError instanceof Error
                ? notificationError.message
                : "error desconocido"
            }`,
          );
        }
        return;
      }
      const id = crypto.randomUUID();
      const missionVersion = getMissionById(input.missionId)?.version ?? 1;
      const githubLogins = input.studentIds
        .map(
          (userId) =>
            snapshot.profiles.find((entry) => entry.id === userId)?.githubLogin,
        )
        .filter((login): login is string => Boolean(login));
      persistDemo({
        ...snapshot,
        assignments: [
          ...snapshot.assignments,
          {
            ...input,
            id,
            missionVersion,
            status: "published",
            rubricId: input.rubricId,
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
        githubNotifications: [
          {
            assignmentId: id,
            classId: snapshot.classroom.id,
            status:
              githubLogins.length === input.studentIds.length
                ? "sent"
                : githubLogins.length > 0
                  ? "partial"
                  : "failed",
            mentionedLogins: githubLogins,
            missingUserIds: input.studentIds.filter(
              (userId) =>
                !snapshot.profiles.find((entry) => entry.id === userId)
                  ?.githubLogin,
            ),
            attempts: 1,
            lastError:
              githubLogins.length === 0
                ? "Los estudiantes demo no tienen login de GitHub."
                : undefined,
            sentAt:
              githubLogins.length > 0 ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          },
          ...snapshot.githubNotifications,
        ],
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const retryAssignmentNotification = useCallback(
    async (assignmentId: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        try {
          await notifyAssignment(assignmentId);
          await refresh();
        } catch (notificationError) {
          const message =
            notificationError instanceof Error
              ? notificationError.message
              : "No se pudo reenviar el aviso.";
          setError(message);
          throw notificationError;
        }
        return;
      }
      persistDemo({
        ...snapshot,
        githubNotifications: snapshot.githubNotifications.map((entry) =>
          entry.assignmentId === assignmentId
            ? {
                ...entry,
                status:
                  entry.mentionedLogins.length > 0 ? "sent" : "failed",
                attempts: entry.attempts + 1,
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const updateAssignment = useCallback(
    async (id: string, input: UpdateAssignmentInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      const title = input.title.trim();
      const instructions = input.instructions.trim();
      const dueAt = new Date(input.dueAt);
      if (!title || title.length > 120) {
        throw new Error("El título debe tener entre 1 y 120 caracteres.");
      }
      if (instructions.length > 10_000) {
        throw new Error("Las instrucciones no pueden superar 10.000 caracteres.");
      }
      if (Number.isNaN(dueAt.getTime())) {
        throw new Error("La fecha de entrega no es válida.");
      }
      if (supabase) {
        const { data, error: assignmentError } = await supabase
          .from("assignments")
          .update({
            title,
            instructions,
            due_at: dueAt.toISOString(),
            rubric_id: input.rubricId ?? null,
          })
          .eq("id", id)
          .eq("class_id", snapshot.classroom.id)
          .select("id")
          .maybeSingle();
        if (assignmentError) {
          setError(assignmentError.message);
          throw assignmentError;
        }
        if (!data) throw new Error("No tienes permiso para editar esta tarea.");
        await refresh();
        return;
      }
      persistDemo({
        ...snapshot,
        assignments: snapshot.assignments.map((assignment) =>
          assignment.id === id
            ? {
                ...assignment,
                title,
                instructions,
                dueAt: dueAt.toISOString(),
                rubricId: input.rubricId,
              }
            : assignment,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const saveReviewRubric = useCallback(
    async (id: string | null, input: ReviewRubricInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot || !profile) return;
      const title = input.title.trim();
      const labels = input.criteria.map((entry) => entry.trim()).filter(Boolean);
      if (!title || labels.length === 0 || labels.length > 10) {
        throw new Error("Escribe un nombre y entre 1 y 10 preguntas.");
      }
      const criteria = labels.map((label, index) => ({
        id: `${index + 1}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`,
        label,
      }));
      if (supabase) {
        const payload = {
          class_id: snapshot.classroom.id,
          title,
          criteria,
          updated_at: new Date().toISOString(),
        };
        const query = id
          ? supabase.from("review_rubrics").update(payload).eq("id", id)
          : supabase.from("review_rubrics").insert({
              ...payload,
              created_by: profile.id,
            });
        const { error: rubricError } = await query;
        if (rubricError) throw rubricError;
        await refresh();
        return;
      }
      const now = new Date().toISOString();
      persistDemo({
        ...snapshot,
        reviewRubrics: id
          ? snapshot.reviewRubrics.map((entry) =>
              entry.id === id ? { ...entry, title, criteria, updatedAt: now } : entry,
            )
          : [
              {
                id: crypto.randomUUID(),
                classId: snapshot.classroom.id,
                title,
                criteria,
                createdAt: now,
                updatedAt: now,
              },
              ...snapshot.reviewRubrics,
            ],
      });
    },
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const deleteReviewRubric = useCallback(
    async (id: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        const { error: rubricError } = await supabase
          .from("review_rubrics")
          .delete()
          .eq("id", id)
          .eq("class_id", snapshot.classroom.id);
        if (rubricError) throw rubricError;
        await refresh();
        return;
      }
      persistDemo({
        ...snapshot,
        reviewRubrics: snapshot.reviewRubrics.filter((entry) => entry.id !== id),
        assignments: snapshot.assignments.map((entry) =>
          entry.rubricId === id ? { ...entry, rubricId: undefined } : entry,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const deleteAssignment = useCallback(
    async (id: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        const { data, error: assignmentError } = await supabase
          .from("assignments")
          .delete()
          .eq("id", id)
          .eq("class_id", snapshot.classroom.id)
          .select("id")
          .maybeSingle();
        if (assignmentError) {
          setError(assignmentError.message);
          throw assignmentError;
        }
        if (!data) throw new Error("No tienes permiso para eliminar esta tarea.");
        await refresh();
        return;
      }
      persistDemo({
        ...snapshot,
        assignments: snapshot.assignments.filter(
          (assignment) => assignment.id !== id,
        ),
        progress: snapshot.progress.filter(
          (entry) => entry.assignmentId !== id,
        ),
        attempts: snapshot.attempts.map((attempt) =>
          attempt.assignmentId === id
            ? { ...attempt, assignmentId: undefined }
            : attempt,
        ),
        notifications: snapshot.notifications.map((notification) =>
          notification.assignmentId === id
            ? { ...notification, assignmentId: undefined }
            : notification,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const createInvitation = useCallback(
    async (input: InvitationInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        const { data, error: invitationError } = await supabase.rpc(
          "create_class_invitation",
          {
            p_label: input.label,
            p_max_uses: input.maxUses,
            p_expires_at: input.expiresAt,
          },
        );
        if (invitationError) {
          setError(invitationError.message);
          throw invitationError;
        }
        const row = data?.[0];
        if (!row) throw new Error("El backend no devolvió la invitación.");
        const invitation: Invitation = {
          id: row.id,
          label: row.label,
          token: row.token,
          tokenPreview: row.token_preview,
          expiresAt: row.expires_at,
          usedAt: row.used_at ?? undefined,
          maxUses: row.max_uses,
          useCount: row.use_count,
          revokedAt: row.revoked_at ?? undefined,
        };
        setSnapshot((current) =>
          current
            ? {
                ...current,
                invitations: [invitation, ...current.invitations],
              }
            : current,
        );
        return;
      }
      const token = `${crypto.randomUUID().replaceAll("-", "")}abcd`;
      persistDemo({
        ...snapshot,
        invitations: [
          {
            id: crypto.randomUUID(),
            label: input.label.trim(),
            token,
            tokenPreview: token.slice(-8),
            expiresAt: input.expiresAt,
            maxUses: input.maxUses,
            useCount: 0,
            revokedAt: input.active ? undefined : new Date().toISOString(),
          },
          ...snapshot.invitations,
        ],
      });
    },
    [persistDemo, previewStudentId, snapshot],
  );

  const updateInvitation = useCallback(
    async (id: string, input: InvitationInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        const { error: invitationError } = await supabase.rpc(
          "update_class_invitation",
          {
            p_invitation_id: id,
            p_label: input.label,
            p_max_uses: input.maxUses,
            p_expires_at: input.expiresAt,
            p_active: input.active,
          },
        );
        if (invitationError) {
          setError(invitationError.message);
          throw invitationError;
        }
        await refresh();
        return;
      }
      persistDemo({
        ...snapshot,
        invitations: snapshot.invitations.map((invitation) =>
          invitation.id === id
            ? {
                ...invitation,
                label: input.label.trim(),
                maxUses: input.maxUses,
                expiresAt: input.expiresAt,
                revokedAt: input.active
                  ? undefined
                  : invitation.revokedAt ?? new Date().toISOString(),
              }
            : invitation,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const getInvitationToken = useCallback(
    async (id: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      const invitation = snapshot?.invitations.find((entry) => entry.id === id);
      if (!invitation) throw new Error("Invitación no encontrada.");
      if (invitation.token) return invitation.token;
      if (!supabase) throw new Error("El token no está disponible.");
      const { data, error: invitationError } = await supabase.rpc(
        "get_invitation_token",
        { p_invitation_id: id },
      );
      if (invitationError) {
        setError(invitationError.message);
        throw invitationError;
      }
      const token = String(data ?? "");
      if (!token) throw new Error("El backend no devolvió el enlace.");
      setSnapshot((current) =>
        current
          ? {
              ...current,
              invitations: current.invitations.map((entry) =>
                entry.id === id
                  ? {
                      ...entry,
                      token,
                      tokenPreview: token.slice(-8),
                    }
                  : entry,
              ),
            }
          : current,
      );
      return token;
    },
    [snapshot?.invitations],
  );

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot || !profile) return;
      const displayName = input.displayName.trim();
      if (!displayName || displayName.length > 80) {
        throw new Error("El nombre visible debe tener entre 1 y 80 caracteres.");
      }
      if (supabase) {
        let profileImagePath = profile.profileImagePath ?? null;
        if (input.imageFile) {
          const extension = input.imageFile.type === "image/gif" ? "gif" : "webp";
          const nextPath = `${profile.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("profile-images")
            .upload(nextPath, input.imageFile, {
              contentType: input.imageFile.type,
              upsert: false,
            });
          if (uploadError) throw uploadError;
          profileImagePath = nextPath;
        } else if (input.removeImage) {
          profileImagePath = null;
        }
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: displayName,
            avatar_config: input.avatarConfig ?? null,
            profile_image_path: profileImagePath,
          })
          .eq("id", profile.id);
        if (profileError) {
          if (profileImagePath && profileImagePath !== profile.profileImagePath) {
            await supabase.storage.from("profile-images").remove([profileImagePath]);
          }
          setError(profileError.message);
          throw profileError;
        }
        if (
          profile.profileImagePath &&
          profile.profileImagePath !== profileImagePath
        ) {
          await supabase.storage
            .from("profile-images")
            .remove([profile.profileImagePath]);
        }
        await refresh();
        return;
      }
      const nextProfile = {
        ...profile,
        displayName,
        avatarConfig: input.avatarConfig,
        avatarUrl: input.imageFile
          ? URL.createObjectURL(input.imageFile)
          : input.removeImage
            ? undefined
            : profile.avatarUrl,
      };
      setProfile(nextProfile);
      persistDemo({
        ...snapshot,
        profiles: snapshot.profiles.map((entry) =>
          entry.id === profile.id ? nextProfile : entry,
        ),
      });
    },
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      if (isFrontendOnly) return;
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

  const dismissNotification = useCallback(
    async (id: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      const dismissedAt = new Date().toISOString();
      if (supabase) {
        const previousNotification = snapshot.notifications.find(
          (entry) => entry.id === id,
        );
        setSnapshot((current) =>
          current
            ? {
                ...current,
                notifications: current.notifications.map((entry) =>
                  entry.id === id ? { ...entry, dismissedAt } : entry,
                ),
              }
            : current,
        );
        const { error: notificationError } = await supabase.rpc(
          "dismiss_notifications",
          { p_notification_ids: [id] },
        );
        if (notificationError) {
          if (previousNotification) {
            setSnapshot((current) =>
              current
                ? {
                    ...current,
                    notifications: current.notifications.map((entry) =>
                      entry.id === id ? previousNotification : entry,
                    ),
                  }
                : current,
            );
          }
          setError(notificationError.message);
          throw notificationError;
        }
        return;
      }
      persistDemo({
        ...snapshot,
        notifications: snapshot.notifications.map((entry) =>
          entry.id === id ? { ...entry, dismissedAt } : entry,
        ),
      });
    },
    [persistDemo, previewStudentId, snapshot],
  );

  const dismissAllNotifications = useCallback(async () => {
    if (isFrontendOnly) throw new Error(frontendOnlyMessage);
    if (previewStudentId || !snapshot || !viewProfile) return;
    const dismissedAt = new Date().toISOString();
    const previousNotifications = snapshot.notifications;
    const dismissOwn = (notifications: ClassroomSnapshot["notifications"]) =>
      notifications.map((entry) =>
        entry.userId === viewProfile.id && !entry.dismissedAt
          ? { ...entry, dismissedAt }
          : entry,
      );
    if (supabase) {
      setSnapshot((current) =>
        current
          ? { ...current, notifications: dismissOwn(current.notifications) }
          : current,
      );
      const { error: notificationError } = await supabase.rpc(
        "dismiss_notifications",
        { p_notification_ids: null },
      );
      if (notificationError) {
        setSnapshot((current) =>
          current ? { ...current, notifications: previousNotifications } : current,
        );
        setError(notificationError.message);
        throw notificationError;
      }
      return;
    }
    persistDemo({
      ...snapshot,
      notifications: dismissOwn(snapshot.notifications),
    });
  }, [persistDemo, previewStudentId, snapshot, viewProfile]);

  const saveReward = useCallback(
    async (id: string | null, input: RewardInput) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot || !profile) return;
      const title = input.title.trim();
      const description = input.description.trim();
      if (!title || title.length > 100) {
        throw new Error("El nombre debe tener entre 1 y 100 caracteres.");
      }
      if (description.length > 1200) {
        throw new Error("La descripción no puede superar 1.200 caracteres.");
      }
      if (!Number.isInteger(input.priceXp) || input.priceXp < 1) {
        throw new Error("El precio debe ser un número entero mayor que cero.");
      }
      if (
        input.stock !== undefined &&
        (!Number.isInteger(input.stock) || input.stock < 0)
      ) {
        throw new Error("El stock debe ser un entero positivo o quedar ilimitado.");
      }
      if (
        input.imageFile &&
        (![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(input.imageFile.type) ||
          input.imageFile.size > 2_097_152)
      ) {
        throw new Error("La imagen debe ser JPG, PNG o WebP y pesar hasta 2 MB.");
      }

      const existing = id
        ? snapshot.rewards.find((entry) => entry.id === id)
        : undefined;
      const rewardId = id ?? crypto.randomUUID();
      if (supabase) {
        let uploadedPath: string | undefined;
        let imagePath = input.removeImage ? undefined : existing?.imagePath;
        if (input.imageFile) {
          const extension =
            input.imageFile.type === "image/png"
              ? "png"
              : input.imageFile.type === "image/webp"
                ? "webp"
                : "jpg";
          uploadedPath = `${snapshot.classroom.id}/${rewardId}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("reward-images")
            .upload(uploadedPath, input.imageFile, {
              cacheControl: "3600",
              contentType: input.imageFile.type,
              upsert: false,
            });
          if (uploadError) {
            setError(uploadError.message);
            throw uploadError;
          }
          imagePath = uploadedPath;
        }

        const values = {
          class_id: snapshot.classroom.id,
          title,
          description,
          price_xp: input.priceXp,
          image_path: imagePath ?? null,
          stock: input.stock ?? null,
          active: input.active,
        };
        const mutation = existing
          ? supabase
              .from("rewards")
              .update(values)
              .eq("id", rewardId)
              .eq("class_id", snapshot.classroom.id)
              .select("id")
              .maybeSingle()
          : supabase
              .from("rewards")
              .insert({ ...values, id: rewardId, created_by: profile.id })
              .select("id")
              .single();
        const { data, error: rewardError } = await mutation;
        if (rewardError || !data) {
          if (uploadedPath) {
            await supabase.storage.from("reward-images").remove([uploadedPath]);
          }
          const failure = rewardError ?? new Error("No se pudo guardar el premio.");
          setError(failure.message);
          throw failure;
        }
        if (
          existing?.imagePath &&
          existing.imagePath !== imagePath &&
          !/^(https?:|data:|\/)/.test(existing.imagePath)
        ) {
          await supabase.storage
            .from("reward-images")
            .remove([existing.imagePath]);
        }
        await refresh();
        return;
      }

      const imagePath = input.imageFile
        ? await fileToDataUrl(input.imageFile)
        : input.removeImage
          ? undefined
          : existing?.imagePath;
      const now = new Date().toISOString();
      const reward = {
        id: rewardId,
        classId: snapshot.classroom.id,
        title,
        description,
        priceXp: input.priceXp,
        imagePath,
        stock: input.stock,
        active: input.active,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      persistDemo({
        ...snapshot,
        rewards: existing
          ? snapshot.rewards.map((entry) =>
              entry.id === rewardId ? reward : entry,
            )
          : [reward, ...snapshot.rewards],
      });
    },
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const deleteReward = useCallback(
    async (id: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      const reward = snapshot.rewards.find((entry) => entry.id === id);
      if (!reward) return;
      if (supabase) {
        const { data, error: rewardError } = await supabase
          .from("rewards")
          .delete()
          .eq("id", id)
          .eq("class_id", snapshot.classroom.id)
          .select("id")
          .maybeSingle();
        if (rewardError || !data) {
          const failure = rewardError ?? new Error("No se pudo eliminar el premio.");
          setError(failure.message);
          throw failure;
        }
        if (reward.imagePath && !/^(https?:|data:|\/)/.test(reward.imagePath)) {
          await supabase.storage.from("reward-images").remove([reward.imagePath]);
        }
        await refresh();
        return;
      }
      persistDemo({
        ...snapshot,
        rewards: snapshot.rewards.filter((entry) => entry.id !== id),
        rewardRedemptions: snapshot.rewardRedemptions.map((entry) =>
          entry.rewardId === id ? { ...entry, rewardId: undefined } : entry,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const redeemReward = useCallback(
    async (id: string) => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot || !profile) return;
      if (supabase) {
        const { error: redemptionError } = await supabase.rpc("redeem_reward", {
          p_reward_id: id,
        });
        if (redemptionError) {
          setError(redemptionError.message);
          throw redemptionError;
        }
        await refresh();
        return;
      }
      const reward = snapshot.rewards.find(
        (entry) => entry.id === id && entry.active,
      );
      if (!reward) throw new Error("Este premio ya no está disponible.");
      if (reward.stock !== undefined && reward.stock <= 0) {
        throw new Error("Este premio está agotado.");
      }
      if (availableXpForStudent(snapshot, profile.id) < reward.priceXp) {
        throw new Error("No tienes XP suficiente para este premio.");
      }
      persistDemo({
        ...snapshot,
        rewards: snapshot.rewards.map((entry) =>
          entry.id === id && entry.stock !== undefined
            ? { ...entry, stock: entry.stock - 1 }
            : entry,
        ),
        rewardRedemptions: [
          {
            id: crypto.randomUUID(),
            rewardId: reward.id,
            classId: reward.classId,
            userId: profile.id,
            rewardTitle: reward.title,
            rewardImagePath: reward.imagePath,
            costXp: reward.priceXp,
            status: "requested",
            createdAt: new Date().toISOString(),
          },
          ...snapshot.rewardRedemptions,
        ],
      });
    },
    [persistDemo, previewStudentId, profile, refresh, snapshot],
  );

  const updateRedemptionStatus = useCallback(
    async (id: string, status: "fulfilled" | "cancelled") => {
      if (isFrontendOnly) throw new Error(frontendOnlyMessage);
      if (previewStudentId || !snapshot) return;
      if (supabase) {
        const { error: redemptionError } = await supabase.rpc(
          "update_reward_redemption_status",
          { p_redemption_id: id, p_status: status },
        );
        if (redemptionError) {
          setError(redemptionError.message);
          throw redemptionError;
        }
        await refresh();
        return;
      }
      const redemption = snapshot.rewardRedemptions.find(
        (entry) => entry.id === id,
      );
      if (!redemption || redemption.status !== "requested") return;
      const now = new Date().toISOString();
      persistDemo({
        ...snapshot,
        rewards:
          status === "cancelled" && redemption.rewardId
            ? snapshot.rewards.map((entry) =>
                entry.id === redemption.rewardId && entry.stock !== undefined
                  ? { ...entry, stock: entry.stock + 1 }
                  : entry,
              )
            : snapshot.rewards,
        rewardRedemptions: snapshot.rewardRedemptions.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                status,
                fulfilledAt: status === "fulfilled" ? now : undefined,
                cancelledAt: status === "cancelled" ? now : undefined,
              }
            : entry,
        ),
      });
    },
    [persistDemo, previewStudentId, refresh, snapshot],
  );

  const recordHint = useCallback(
    (assignmentId: string, count: number) => {
      if (isFrontendOnly) return;
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
      if (isFrontendOnly) return;
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
      approveAttempts,
      frontendOnly: isFrontendOnly,
      loginDemo,
      logout,
      refresh,
      recordAttempt,
      reviewAttempt,
      createAssignment,
      retryAssignmentNotification,
      updateAssignment,
      deleteAssignment,
      deleteReviewRubric,
      createInvitation,
      updateInvitation,
      getInvitationToken,
      updateProfile,
      markNotificationRead,
      dismissNotification,
      dismissAllNotifications,
      saveReward,
      saveReviewRubric,
      deleteReward,
      redeemReward,
      updateRedemptionStatus,
      recordHint,
      recordActivity,
      startStudentPreview,
      stopStudentPreview,
    }),
    [
      backendMode,
      clearError,
      createAssignment,
      createInvitation,
      deleteAssignment,
      deleteReward,
      dismissAllNotifications,
      dismissNotification,
      error,
      loading,
      loginDemo,
      logout,
      getInvitationToken,
      markNotificationRead,
      profile,
      viewProfile,
      previewStudentId,
      isStudentPreview,
      recordAttempt,
      recordActivity,
      recordHint,
      redeemReward,
      refresh,
      retryAssignmentNotification,
      reviewAttempt,
      saveReward,
      snapshot,
      startStudentPreview,
      stopStudentPreview,
      updateInvitation,
      updateAssignment,
      updateRedemptionStatus,
      updateProfile,
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
