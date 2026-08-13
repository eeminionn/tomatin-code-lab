import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Play,
  Send,
  Users,
  X,
} from "lucide-react";
import { useClassroom } from "@/state/classroom-context";

const GUIDE_VERSION = 1;

function storageKey(userId: string) {
  return `tomatin.guide.${userId}.v${GUIDE_VERSION}`;
}

export function GettingStarted({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, snapshot, isStudentPreview } = useClassroom();
  const [step, setStep] = useState(0);
  const isStaff = profile?.role === "owner" || profile?.role === "mentor";

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open || !profile || !snapshot || isStudentPreview) return null;

  function finish() {
    localStorage.setItem(storageKey(profile!.id), "done");
    onClose();
  }

  if (isStaff) {
    const students = snapshot.profiles.filter((entry) => entry.role === "student");
    const published = snapshot.assignments.filter((entry) => entry.status === "published");
    const notificationReady = snapshot.githubNotifications.some(
      (entry) => entry.status === "sent" || entry.status === "partial",
    );
    const checks = [
      { label: "Hay estudiantes en el curso", done: students.length > 0 },
      { label: "Hay al menos una tarea publicada", done: published.length > 0 },
      { label: "Los avisos de GitHub tuvieron una prueba exitosa", done: notificationReady },
    ];

    return (
      <div className="dialog-backdrop getting-started-backdrop" role="presentation">
        <section className="getting-started" role="dialog" aria-modal="true" aria-labelledby="getting-started-title">
          <button className="icon-button getting-started-close" type="button" aria-label="Cerrar guía" onClick={finish}>
            <X aria-hidden="true" />
          </button>
          <span className="getting-started-icon"><ClipboardCheck aria-hidden="true" /></span>
          <p className="eyebrow">PREPARAR EL AULA</p>
          <h2 id="getting-started-title">Lo esencial está en un solo lugar</h2>
          <p>Este resumen se actualiza solo. No necesitas configurar nada desde aquí.</p>
          <ul className="setup-checklist">
            {checks.map((entry) => (
              <li className={entry.done ? "is-done" : ""} key={entry.label}>
                {entry.done ? <CheckCircle2 aria-hidden="true" /> : <span aria-hidden="true" />}
                <strong>{entry.label}</strong>
                <small>{entry.done ? "Listo" : "Pendiente"}</small>
              </li>
            ))}
          </ul>
          <div className="getting-started-tip">
            <Users aria-hidden="true" />
            <span><strong>Tu rutina</strong> Revisa entregas, crea tareas y mira alertas desde el panel.</span>
          </div>
          <button className="button primary wide" type="button" onClick={finish}>
            Entendido <Check aria-hidden="true" />
          </button>
        </section>
      </div>
    );
  }

  const steps = [
    {
      icon: ArrowRight,
      title: "Abre tu próxima tarea",
      body: "En Tareas siempre verás primero lo que debes resolver y cuándo vence.",
    },
    {
      icon: Play,
      title: "Ejecuta antes de entregar",
      body: "Prueba tu código. El panel de resultados te dirá qué salió bien y qué revisar.",
    },
    {
      icon: Send,
      title: "Entrega y espera feedback",
      body: "Tu profesor revisará la solución. Si pide cambios, tu código seguirá guardado.",
    },
  ];
  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="dialog-backdrop getting-started-backdrop" role="presentation">
      <section className="getting-started" role="dialog" aria-modal="true" aria-labelledby="getting-started-title">
        <button className="icon-button getting-started-close" type="button" aria-label="Omitir guía" onClick={finish}>
          <X aria-hidden="true" />
        </button>
        <span className="getting-started-icon"><Icon aria-hidden="true" /></span>
        <p className="eyebrow">PRIMEROS PASOS · {step + 1} DE {steps.length}</p>
        <h2 id="getting-started-title">{current.title}</h2>
        <p>{current.body}</p>
        <div className="guide-progress" aria-label={`Paso ${step + 1} de ${steps.length}`}>
          {steps.map((entry, index) => <span className={index <= step ? "is-active" : ""} key={entry.title} />)}
        </div>
        <div className="getting-started-actions">
          <button className="button ghost" type="button" onClick={finish}>Omitir</button>
          <button
            className="button primary"
            type="button"
            onClick={() => step === steps.length - 1 ? finish() : setStep((value) => value + 1)}
          >
            {step === steps.length - 1 ? "Ir a mis tareas" : "Siguiente"}
            {step === steps.length - 1 ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
          </button>
        </div>
      </section>
    </div>
  );
}

export function shouldOpenGettingStarted(userId: string) {
  return localStorage.getItem(storageKey(userId)) !== "done";
}
