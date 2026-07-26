import type {
  AppNotification,
  Assignment,
  ClassroomSnapshot,
  Invitation,
  Profile,
  StudentProgress,
} from "@/types";
import { getMissionById } from "./missions";

const owner: Profile = {
  id: "owner-eeminionn",
  displayName: "eeminionn",
  email: "mentor@tomatin.local",
  githubLogin: "eeminionn",
  role: "owner",
};

const students: Profile[] = [
  ["student-01", "Camila Rojas"],
  ["student-02", "Diego Soto"],
  ["student-03", "Antonia Pérez"],
  ["student-04", "Matías Silva"],
  ["student-05", "Josefa Muñoz"],
  ["student-06", "Benjamín Castro"],
  ["student-07", "Florencia Reyes"],
  ["student-08", "Vicente Torres"],
  ["student-09", "Martina Araya"],
  ["student-10", "Tomás Navarro"],
].map(([id, displayName], index) => ({
  id,
  displayName,
  email: `estudiante${index + 1}@tomatin.local`,
  role: "student" as const,
}));

function dateFromNow(days: number, hour = 23) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 59, 0, 0);
  return value.toISOString();
}

const assignments: Assignment[] = [
  {
    id: "assignment-once",
    missionId: "p1-01-la-once",
    missionVersion: 1,
    title: "Variables y acumuladores",
    instructions: "Resuelve la misión en cualquiera de los tres lenguajes.",
    dueAt: dateFromNow(2),
    points: 100,
    allowedLanguages: ["javascript", "python", "cpp"],
    studentIds: students.map((student) => student.id),
    status: "published",
  },
  {
    id: "assignment-var",
    missionId: "p1-02-var-limache",
    missionVersion: 1,
    title: "Condiciones booleanas",
    instructions: "Incluye los cuatro casos posibles en tus pruebas.",
    dueAt: dateFromNow(4),
    points: 100,
    allowedLanguages: ["javascript", "python", "cpp"],
    studentIds: students.map((student) => student.id),
    status: "published",
  },
  {
    id: "assignment-pins",
    missionId: "p1-03-semaforo-led",
    missionVersion: 1,
    title: "Recorridos seguros",
    instructions: "Prioriza claridad y no accedas fuera de rango.",
    dueAt: dateFromNow(7),
    points: 110,
    allowedLanguages: ["javascript", "python", "cpp"],
    studentIds: students.map((student) => student.id),
    status: "published",
  },
  {
    id: "assignment-factorial",
    missionId: "p2-01-factorial-recursivo",
    missionVersion: 1,
    title: "Recursión y caso base",
    instructions: "La entrega debe manejar números negativos.",
    dueAt: dateFromNow(10),
    points: 160,
    allowedLanguages: ["javascript", "python", "cpp"],
    studentIds: students.map((student) => student.id),
    status: "published",
  },
];

const statuses: StudentProgress["status"][] = [
  "awaiting_review",
  "approved",
  "in_progress",
  "not_started",
  "changes_requested",
];

const progress: StudentProgress[] = students.flatMap((student, studentIndex) =>
  assignments.map((assignment, assignmentIndex) => {
    const index = studentIndex + assignmentIndex;
    const status =
      assignmentIndex > 1 && studentIndex > 2
        ? "not_started"
        : statuses[index % statuses.length];
    return {
      userId: student.id,
      assignmentId: assignment.id,
      status,
      language:
        status === "not_started"
          ? undefined
          : (["javascript", "python", "cpp"] as const)[index % 3],
      attempts: status === "not_started" ? 0 : (index % 4) + 1,
      hintsUsed: status === "not_started" ? 0 : index % 2,
      lastActivityAt:
        status === "not_started" ? undefined : dateFromNow(-(index % 3), 18),
      submittedAt:
        status === "awaiting_review" || status === "approved"
          ? dateFromNow(-1, 17)
          : undefined,
      approvedAt: status === "approved" ? dateFromNow(-1, 19) : undefined,
    };
  }),
);

const notifications: AppNotification[] = [
  {
    id: "notification-review",
    userId: "student-01",
    title: "Entrega recibida",
    body: "Variables y acumuladores quedó en revisión.",
    createdAt: dateFromNow(0, 12),
  },
  {
    id: "notification-feedback",
    userId: "student-01",
    title: "Comentario del mentor",
    body: "Revisa el caso de una compra vacía antes de reenviar.",
    createdAt: dateFromNow(-1, 18),
  },
];

const invitations: Invitation[] = Array.from({ length: 3 }, (_, index) => ({
  id: `invite-${index + 1}`,
  label: `Estudiante ${index + 8}`,
  token: `demo-${crypto.randomUUID().slice(0, 8)}`,
  expiresAt: dateFromNow(7),
}));

const onceMission = getMissionById("p1-01-la-once");
const seededAttempts = onceMission
  ? [
      {
        id: "attempt-camila-once",
        userId: "student-01",
        missionId: onceMission.id,
        assignmentId: "assignment-once",
        missionVersion: onceMission.version,
        language: "javascript" as const,
        kind: "submit" as const,
        code: onceMission.variants.javascript.starterCode,
        result: {
          id: "run-camila-once",
          status: "passed" as const,
          stdout: "Total calculado: 4950",
          stderr: "",
          diagnostics: [],
          tests: [
            ...onceMission.variants.javascript.publicTests,
            {
              id: "hidden-demo",
              label: "Test oculto",
              expression: "",
              expected: "Comportamiento esperado protegido",
              feedback: "",
            },
          ].map((entry) => ({
            id: entry.id,
            label: entry.label,
            passed: true,
            expected: entry.expected,
            hidden: entry.id === "hidden-demo",
          })),
          durationMs: 8,
          createdAt: dateFromNow(0, 12),
        },
        createdAt: dateFromNow(0, 12),
      },
    ]
  : [];

export function createDemoSnapshot(): ClassroomSnapshot {
  return {
    classroom: {
      id: "class-tomatin-2026",
      name: "Programación I & II",
      timezone: "America/Santiago",
      ownerId: owner.id,
    },
    profiles: [owner, ...students],
    assignments,
    progress,
    attempts: seededAttempts,
    reviews: [],
    notifications,
    invitations,
  };
}

export const demoOwner = owner;
export const demoStudent = students[0];
