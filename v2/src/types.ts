export const LANGUAGES = ["javascript", "python", "cpp"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_META: Record<
  Language,
  { label: string; shortLabel: string; fileName: string; monaco: string; runtime: string }
> = {
  javascript: {
    label: "JavaScript",
    shortLabel: "JS",
    fileName: "main.js",
    monaco: "javascript",
    runtime: "Node.js 22",
  },
  python: {
    label: "Python",
    shortLabel: "PY",
    fileName: "main.py",
    monaco: "python",
    runtime: "Python 3.12",
  },
  cpp: {
    label: "C++",
    shortLabel: "C++",
    fileName: "main.cpp",
    monaco: "cpp",
    runtime: "GCC 14 / C++20",
  },
};

export type Course = "programming-1" | "programming-2";
export type Difficulty = "Inicial" | "Intermedia" | "Avanzada";
export type Role = "owner" | "mentor" | "student";
export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_review"
  | "changes_requested"
  | "approved";
export type AttemptKind = "run" | "submit";
export type RunStatus =
  | "idle"
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "compile_error"
  | "runtime_error"
  | "timeout"
  | "provider_error";

export interface MissionTest {
  id: string;
  label: string;
  expression: string;
  actualExpression?: string;
  expected: string;
  feedback: string;
}

export interface MissionVariant {
  language: Language;
  starterCode: string;
  referenceSolution?: string;
  publicTests: MissionTest[];
  hiddenTests?: MissionTest[];
  hiddenTestCount?: number;
}

export interface Mission {
  id: string;
  slug: string;
  course: Course;
  courseLabel: string;
  module: string;
  order: number;
  title: string;
  summary: string;
  context: string;
  brief: string;
  difficulty: Difficulty;
  points: number;
  duration: number;
  tags: string[];
  objectives: string[];
  hints: string[];
  version: number;
  variants: Record<Language, MissionVariant>;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  githubLogin?: string;
  avatarUrl?: string;
  role: Role;
}

export interface Classroom {
  id: string;
  name: string;
  timezone: string;
  ownerId: string;
}

export interface Assignment {
  id: string;
  missionId: string;
  missionVersion: number;
  title: string;
  instructions: string;
  dueAt: string;
  points: number;
  allowedLanguages: Language[];
  studentIds: string[];
  status: "draft" | "published" | "archived";
}

export interface StudentProgress {
  userId: string;
  assignmentId: string;
  status: AssignmentStatus;
  language?: Language;
  lastActivityAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  attempts: number;
  hintsUsed: number;
}

export interface Draft {
  key: string;
  userId: string;
  missionId: string;
  assignmentId?: string;
  language: Language;
  code: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface Diagnostic {
  line?: number;
  column?: number;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface TestResult {
  id: string;
  label: string;
  passed: boolean;
  expected: string;
  actual?: string;
  feedback?: string;
  hidden?: boolean;
}

export interface RunResult {
  id: string;
  status: RunStatus;
  stdout: string;
  stderr: string;
  diagnostics: Diagnostic[];
  tests: TestResult[];
  durationMs?: number;
  memoryKb?: number;
  repositorySync?: RepositorySyncResult;
  createdAt: string;
}

export type RepositorySyncStatus =
  | "synced"
  | "pending_setup"
  | "failed"
  | "not_applicable";

export interface RepositorySyncResult {
  status: RepositorySyncStatus;
  message: string;
  repositoryUrl?: string;
  fileUrl?: string;
  path?: string;
  commitSha?: string;
}

export interface StudentRepository {
  id: string;
  classId: string;
  userId: string;
  ownerLogin: string;
  name: string;
  htmlUrl: string;
  visibility: "private";
  status: "ready" | "error";
  collaboratorStatus: "pending" | "invited" | "active" | "error";
  lastSyncedAt?: string;
  lastError?: string;
}

export interface Attempt {
  id: string;
  userId: string;
  missionId: string;
  assignmentId?: string;
  missionVersion: number;
  language: Language;
  kind: AttemptKind;
  code: string;
  result: RunResult;
  createdAt: string;
}

export interface Review {
  id: string;
  attemptId: string;
  mentorId: string;
  decision: "approved" | "changes_requested" | "comment";
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  label: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
}

export interface ClassroomSnapshot {
  classroom: Classroom;
  profiles: Profile[];
  assignments: Assignment[];
  progress: StudentProgress[];
  attempts: Attempt[];
  reviews: Review[];
  notifications: AppNotification[];
  invitations: Invitation[];
  repositories: StudentRepository[];
}

export interface RunnerRequest {
  mission: Mission;
  language: Language;
  code: string;
  kind: AttemptKind;
  assignmentId?: string;
}

export interface CreateAssignmentInput {
  missionId: string;
  title: string;
  instructions: string;
  dueAt: string;
  points: number;
  allowedLanguages: Language[];
  studentIds: string[];
}

export interface MissionDraftInput {
  missionId?: string;
  title: string;
  summary: string;
  brief: string;
  course: Course;
}
