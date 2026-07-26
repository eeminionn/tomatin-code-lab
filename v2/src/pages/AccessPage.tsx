import { useEffect, useState, type FormEvent } from "react";
import { Github, LoaderCircle, Mail, TerminalSquare } from "lucide-react";
import { useClassroom } from "@/state/classroom-context";
import {
  isSupabaseConfigured,
  rememberInvitationFromLocation,
  sendMagicLink,
  signInWithGitHub,
} from "@/services/supabase";

export function AccessPage() {
  const { loginDemo, error: accessError } = useClassroom();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasInvitation, setHasInvitation] = useState(false);

  useEffect(() => {
    setHasInvitation(Boolean(rememberInvitationFromLocation()));
  }, []);

  async function handleGitHub() {
    setBusy(true);
    setMessage("");
    try {
      await signInWithGitHub();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await sendMagicLink(email);
      setMessage("Enlace enviado. Revisa tu correo para continuar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-visual" aria-label="Tomatin Code Lab">
        <img
          src="./tomatin-hero.jpg"
          alt="Tomatin estudiando algoritmos junto a placas electrónicas."
        />
        <div className="access-overlay" aria-hidden="true" />
        <div className="access-brand">
          <span className="brand-command">T_</span>
          <p>PROGRAMACIÓN I & II</p>
          <h1>Tomatin Code Lab</h1>
          <span>JavaScript · Python · C++</span>
        </div>
      </section>

      <section className="access-panel" aria-labelledby="access-title">
        <div className="access-panel-inner">
          <div className="access-heading">
            <TerminalSquare aria-hidden="true" />
            <div>
              <p className="eyebrow">AULA 2.0</p>
              <h2 id="access-title">Entrar al curso</h2>
            </div>
          </div>

          {hasInvitation ? (
            <div className="invitation-ready" role="status">
              <strong>Invitación reconocida</strong>
              <span>Inicia sesión para completar tu inscripción al curso.</span>
            </div>
          ) : null}

          {isSupabaseConfigured ? (
            <>
              <button
                className="button primary wide"
                type="button"
                onClick={handleGitHub}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Github aria-hidden="true" />
                )}
                Continuar con GitHub
              </button>
              <div className="access-divider">
                <span>o usa correo</span>
              </div>
              <form className="access-form" onSubmit={handleEmail}>
                <label htmlFor="magic-email">Correo</label>
                <div className="field-with-icon">
                  <Mail aria-hidden="true" />
                  <input
                    id="magic-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nombre@universidad.cl"
                    autoComplete="email"
                    required
                  />
                </div>
                <button className="button secondary wide" disabled={busy}>
                  Enviar enlace
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="demo-notice">
                <strong>Vista beta</strong>
                <span>
                  El backend aún no está conectado. Puedes recorrer todos los
                  flujos con datos locales de demostración.
                </span>
              </div>
              <button
                className="button primary wide"
                type="button"
                onClick={() => loginDemo("student")}
              >
                Entrar como estudiante
              </button>
              <button
                className="button secondary wide"
                type="button"
                onClick={() => loginDemo("mentor")}
              >
                Entrar como eeminionn
              </button>
            </>
          )}

          <p className="form-message" aria-live="polite">
            {message || accessError}
          </p>
          <p className="access-footnote">
            {hasInvitation
              ? "El enlace se consumirá una sola vez al completar el acceso."
              : "El acceso real requiere una invitación activa del curso."}
          </p>
        </div>
      </section>
    </main>
  );
}
