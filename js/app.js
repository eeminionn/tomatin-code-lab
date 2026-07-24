import { missions } from "./missions.js";
import { runCode } from "./runner.js";
import { fetchGitHubSnapshot, formatGitHubDate } from "./github.js";
import {
  ensureDemoAccounts,
  getPublicUsers,
  getSession,
  login,
  logout,
  register,
} from "./auth.js";
import {
  completeMission,
  getAllProgress,
  getProgress,
  getRank,
  awardSecret,
  resetAllProgress,
} from "./store.js";
import {
  applyMissionSettings,
  getAdminSettings,
  resetAdminSettings,
  updateMissionSettings,
} from "./admin.js";

const viewLabels = {
  dashboard: "base",
  missions: "misiones",
  lab: "laboratorio",
  ranking: "ranking",
  github: "github",
  admin: "admin",
};

const sidebar = document.querySelector(".sidebar");
const currentViewLabel = document.querySelector("#current-view-label");
const missionGrid = document.querySelector("#mission-grid");
const missionDialog = document.querySelector("#mission-dialog");
const missionContent = document.querySelector("#mission-content");
const codeEditor = document.querySelector("#code-editor");
const consoleOutput = document.querySelector("#console-output");
const runButton = document.querySelector("#run-code");
const terminalInput = document.querySelector("#terminal-input");
const authDialog = document.querySelector("#auth-dialog");
const authForm = document.querySelector("#auth-form");
const authFields = document.querySelector("#auth-fields");
const sessionPanel = document.querySelector("#session-panel");
const githubStatus = document.querySelector("#github-status");
let currentSession = getSession();
let authMode = "login";
let githubLoaded = false;

const practiceRanks = [
  { id: "practice-1", name: "KernelConPalta", xp: 4380, completed: 17 },
  { id: "practice-2", name: "ValpoDebugger", xp: 3560, completed: 14 },
  { id: "practice-3", name: "CautinMaster", xp: 2710, completed: 12 },
  { id: "practice-4", name: "ByteDeTomate", xp: 1640, completed: 8 },
  { id: "practice-5", name: "NullDeQuillota", xp: 720, completed: 4 },
];

const commandResponses = {
  help: "Comandos publicos: help, whoami, limache, mustakis, esp32, clear.",
  limache: "cd /estadio && npm run ascenso // proceso naranja en ejecucion",
  mustakis: "Imaginacion + tecnologia + aprender haciendo.",
  esp32: "Conectando Wi-Fi con 240 MHz de optimismo...",
};

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showView(name) {
  const target = document.querySelector(`[data-view="${name}"]`);
  if (!target) return;

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view === target);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    const isActive = item.dataset.viewTarget === name;
    item.classList.toggle("is-active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  currentViewLabel.textContent = viewLabels[name] ?? name;
  if (name === "ranking") renderRanking();
  if (name === "github") renderGitHubTelemetry();
  if (name === "admin") renderAdmin();
  sidebar.classList.remove("is-open");
  document.querySelector("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function unlockSecret(secretId, points, message) {
  document.body.classList.add("secret-pulse");
  window.setTimeout(() => document.body.classList.remove("secret-pulse"), 900);

  if (!currentSession) {
    showToast(`${message} Inicia sesion para guardar el secreto.`);
    return;
  }

  const result = awardSecret(currentSession.userId, secretId, points);
  renderAccount();
  showToast(
    result.awarded > 0 ? `${message} +${points} XP` : `${message} Ya estaba abierto.`,
  );
}

function runTerminalCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();
  if (!command) return;

  if (command === "clear") {
    consoleOutput.textContent = "$ consola limpia";
    return;
  }

  let response = commandResponses[command];
  if (command === "whoami") {
    response = currentSession
      ? `${currentSession.name} // rol=${currentSession.role}`
      : "invitado // privilegios=ninguno";
  }
  if (command === "sudo") {
    response =
      "eeminionn no esta en sudoers. El incidente fue reportado a Tomatin.";
    unlockSecret("sudo-incident", 42, "Incidente sudo registrado.");
  }
  if (command === "tomatin --root") {
    response = "ROOT VEGETAL ACTIVADO // acceso al invernadero concedido";
    document.body.classList.toggle("root-mode");
    unlockSecret("root-vegetal", 77, "Encontraste el modo root vegetal.");
  }
  if (!response) {
    response = `command not found: ${command}`;
  }

  consoleOutput.textContent += `\n$ ${rawCommand}\n${response}`;
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function getCatalog({ includeDisabled = false } = {}) {
  return missions
    .map(applyMissionSettings)
    .filter(
      (mission) =>
        includeDisabled || mission.enabled || currentSession?.role === "admin",
    );
}

function getConfiguredMission(id) {
  const mission = missions.find((item) => item.id === id);
  return mission ? applyMissionSettings(mission) : undefined;
}

function renderMissionGrid(course = "all") {
  const visibleMissions = getCatalog().filter(
    (mission) => course === "all" || mission.course === course,
  );
  const completed = new Set(getProgress(currentSession?.userId).completed);

  missionGrid.innerHTML = visibleMissions
    .map(
      (mission) => `
        <article class="mission-card ${completed.has(mission.id) ? "is-complete" : ""} ${mission.enabled ? "" : "is-disabled"}">
          <div class="mission-card-topline">
            <span>${mission.courseLabel}</span>
            <strong>${
              !mission.enabled
                ? "PAUSADA"
                : completed.has(mission.id)
                  ? "COMPLETA"
                  : `+${mission.points} XP`
            }</strong>
          </div>
          <div class="mission-index" aria-hidden="true">${String(mission.order).padStart(2, "0")}</div>
          <p class="mission-module">${mission.module}</p>
          <h2>${mission.title}</h2>
          <p>${mission.subtitle}</p>
          <div class="mission-meta" aria-label="Detalles de la mision">
            <span><i data-lucide="signal" aria-hidden="true"></i>${mission.difficulty}</span>
            <span><i data-lucide="clock-3" aria-hidden="true"></i>${mission.duration} min</span>
          </div>
          <button
            class="mission-open"
            type="button"
            data-mission-open="${mission.id}"
            ${mission.enabled ? "" : "disabled"}
          >
            ${completed.has(mission.id) ? "Repetir mision" : "Ver briefing"}
            <i data-lucide="arrow-up-right" aria-hidden="true"></i>
          </button>
        </article>
      `,
    )
    .join("");

  refreshIcons();
}

function renderNextMission() {
  const completed = new Set(getProgress(currentSession?.userId).completed);
  const activeMissions = getCatalog().filter((mission) => mission.enabled);
  const mission =
    activeMissions.find((item) => !completed.has(item.id)) ?? activeMissions[0];
  const target = document.querySelector("#next-mission");

  if (!mission) {
    target.className = "empty-state";
    target.textContent = "No hay misiones activas.";
    return;
  }

  target.className = "next-mission";
  target.innerHTML = `
    <div>
      <span>${mission.module} // ${String(mission.order).padStart(2, "0")}</span>
      <h3>${mission.title}</h3>
      <p>${mission.subtitle}</p>
    </div>
    <button
      class="icon-button"
      type="button"
      data-mission-open="${mission.id}"
      aria-label="Abrir ${mission.title}"
      title="Abrir mision"
    >
      <i data-lucide="arrow-right" aria-hidden="true"></i>
    </button>
  `;

  document.querySelector("#completed-count").textContent =
    `${completed.size}/${missions.length}`;
  refreshIcons();
}

function openMission(id) {
  const mission = getConfiguredMission(id);
  if (!mission || !mission.enabled) return;

  missionContent.innerHTML = `
    <header class="modal-header">
      <div>
        <p class="eyebrow">${mission.courseLabel} // MISION ${String(mission.order).padStart(2, "0")}</p>
        <h2>${mission.title}</h2>
        <p class="mission-lead">${mission.story}</p>
      </div>
      <button
        class="icon-button"
        type="button"
        data-close-dialog
        aria-label="Cerrar"
        title="Cerrar"
      >
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </header>
    <div class="mission-brief">
      <section>
        <h3>Briefing</h3>
        <p>${mission.brief}</p>
      </section>
      <section>
        <h3>Objetivos</h3>
        <ul>
          ${mission.objectives.map((objective) => `<li>${objective}</li>`).join("")}
        </ul>
      </section>
    </div>
    <section class="starter-preview" aria-labelledby="starter-title">
      <div class="code-titlebar">
        <span id="starter-title">starter.js</span>
        <span>${mission.duration} min // +${mission.points} XP</span>
      </div>
      <pre><code>${escapeHtml(mission.starterCode)}</code></pre>
    </section>
    <div class="mission-dialog-actions">
      <button class="secondary-button" type="button" data-hint-toggle>
        <i data-lucide="lightbulb" aria-hidden="true"></i>
        Ver pista
      </button>
      <button class="primary-button" type="button" data-start-mission="${mission.id}">
        <i data-lucide="terminal" aria-hidden="true"></i>
        Resolver en laboratorio
      </button>
    </div>
    <p class="hint-box" data-hint-box hidden>${mission.hints[0]}</p>
  `;

  missionDialog.showModal();
  refreshIcons();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function executeLabCode() {
  const mission = getConfiguredMission(codeEditor.dataset.missionId);
  runButton.disabled = true;
  consoleOutput.textContent = "$ ejecutando proceso aislado...";

  const result = await runCode(codeEditor.value, mission?.tests ?? []);
  const lines = [];

  if (result.logs.length) {
    lines.push(...result.logs.map((line) => `> ${line}`), "");
  }

  if (!result.ok) {
    lines.push(`[ERROR] ${result.error}`);
  } else if (!mission) {
    lines.push("[OK] proceso terminado sin errores");
  } else {
    lines.push(`PRUEBAS // ${mission.title}`);
    result.tests.forEach((test) => {
      lines.push(`${test.passed ? "[PASS]" : "[FAIL]"} ${test.name}`);
    });

    const passed = result.tests.length > 0 && result.tests.every((test) => test.passed);
    if (passed) {
      lines.push("", `[MISION COMPLETA] +${mission.points} XP disponibles`);
      document.dispatchEvent(
        new CustomEvent("mission:passed", { detail: { mission } }),
      );
    } else {
      lines.push("", "[PENDIENTE] Revisa el briefing o pide una pista.");
    }
  }

  consoleOutput.textContent = lines.join("\n") || "[OK] sin salida";
  runButton.disabled = false;
}

function renderRanking() {
  const progressDatabase = getAllProgress();
  const localPlayers = getPublicUsers().map((user) => {
    const progress = progressDatabase[user.id] ?? getProgress(user.id);
    return {
      id: user.id,
      name: user.name,
      xp: progress.xp,
      completed: progress.completed.length,
      local: true,
    };
  });
  const rows = [...practiceRanks, ...localPlayers]
    .sort((a, b) => b.xp - a.xp)
    .map(
      (player, index) => `
        <tr class="${player.id === currentSession?.userId ? "is-current" : ""}">
          <td class="rank-position">${String(index + 1).padStart(2, "0")}</td>
          <td>
            <strong>${escapeHtml(player.name)}</strong>
            <small>${player.local ? "usuario local" : "rival de practica"}</small>
          </td>
          <td>${player.completed}/20</td>
          <td>${getRank(player.xp)}</td>
          <td class="rank-xp">${player.xp} XP</td>
        </tr>
      `,
    )
    .join("");

  document.querySelector("#ranking-table").innerHTML = `
    <p class="ranking-note">
      Ranking de demostracion: combina tus usuarios locales con rivales ficticios.
      No envia datos a un servidor.
    </p>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Operador</th>
            <th scope="col">Misiones</th>
            <th scope="col">Rango</th>
            <th scope="col">Puntaje</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderAdmin() {
  const panel = document.querySelector("#admin-panel");
  if (currentSession?.role !== "admin") {
    panel.innerHTML = `
      <div class="empty-state">
        <i data-lucide="lock-keyhole" aria-hidden="true"></i>
        <p>Se requiere una sesion administrativa.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  const users = getPublicUsers();
  const progressEntries = Object.values(getAllProgress());
  const totalCompleted = progressEntries.reduce(
    (sum, item) => sum + item.completed.length,
    0,
  );
  const totalXp = progressEntries.reduce((sum, item) => sum + item.xp, 0);
  const catalog = getCatalog({ includeDisabled: true });

  panel.innerHTML = `
    <div class="admin-stats">
      <article><span>Usuarios</span><strong>${users.length}</strong></article>
      <article><span>Completadas</span><strong>${totalCompleted}</strong></article>
      <article><span>XP emitido</span><strong>${totalXp}</strong></article>
      <article>
        <span>Activas</span>
        <strong>${catalog.filter((mission) => mission.enabled).length}/${catalog.length}</strong>
      </article>
    </div>
    <section class="admin-section" aria-labelledby="mission-admin-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">CONTROL DE CONTENIDO</p>
          <h2 id="mission-admin-title">Misiones publicadas</h2>
        </div>
      </div>
      <div class="admin-mission-list">
        ${catalog
          .map(
            (mission) => `
              <div class="admin-mission-row">
                <div>
                  <strong>${String(mission.order).padStart(2, "0")} // ${mission.title}</strong>
                  <span>${mission.courseLabel}</span>
                </div>
                <label>
                  <span>XP</span>
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    step="10"
                    value="${mission.points}"
                    data-admin-points="${mission.id}"
                  />
                </label>
                <label class="switch-label">
                  <input
                    type="checkbox"
                    data-admin-enabled="${mission.id}"
                    ${mission.enabled ? "checked" : ""}
                  />
                  <span>Activa</span>
                </label>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
    <section class="admin-section danger-zone" aria-labelledby="data-admin-title">
      <div>
        <p class="eyebrow">BASE LOCAL</p>
        <h2 id="data-admin-title">Datos de demostracion</h2>
        <p>Exporta un respaldo o reinicia el progreso guardado en este navegador.</p>
      </div>
      <div class="admin-actions">
        <button class="secondary-button" type="button" data-admin-export>
          <i data-lucide="download" aria-hidden="true"></i>
          Exportar JSON
        </button>
        <button class="danger-button" type="button" data-admin-reset>
          <i data-lucide="rotate-ccw" aria-hidden="true"></i>
          Reiniciar progreso
        </button>
      </div>
    </section>
  `;
  refreshIcons();
}

function exportLocalData() {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    users: getPublicUsers(),
    progress: getAllProgress(),
    admin: getAdminSettings(),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tomatin-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

async function renderGitHubTelemetry(force = false) {
  if (githubLoaded && !force) return;

  githubStatus.innerHTML = `
    <div class="github-loading">
      <i data-lucide="loader-circle" aria-hidden="true"></i>
      <span>Consultando api.github.com...</span>
    </div>
  `;
  refreshIcons();

  try {
    const snapshot = await fetchGitHubSnapshot();
    githubLoaded = true;
    githubStatus.innerHTML = `
      <div class="github-repository">
        <div>
          <p class="eyebrow">ORIGEN CONFIRMADO</p>
          <h2>${escapeHtml(snapshot.name)}</h2>
          <p>${escapeHtml(snapshot.description)}</p>
        </div>
        <span class="api-status"><i data-lucide="radio" aria-hidden="true"></i>API ONLINE</span>
      </div>
      <div class="github-metrics">
        <article>
          <i data-lucide="star" aria-hidden="true"></i>
          <span>Estrellas</span>
          <strong>${snapshot.stars}</strong>
        </article>
        <article>
          <i data-lucide="git-fork" aria-hidden="true"></i>
          <span>Forks</span>
          <strong>${snapshot.forks}</strong>
        </article>
        <article>
          <i data-lucide="circle-dot" aria-hidden="true"></i>
          <span>Issues + PRs</span>
          <strong>${snapshot.issues}</strong>
        </article>
        <article>
          <i data-lucide="git-branch" aria-hidden="true"></i>
          <span>Rama base</span>
          <strong>${escapeHtml(snapshot.branch)}</strong>
        </article>
      </div>
      <div class="github-details">
        <div>
          <span>Ultima sincronizacion</span>
          <strong>${escapeHtml(formatGitHubDate(snapshot.updatedAt))}</strong>
        </div>
        <div>
          <span>Licencia</span>
          <strong>${escapeHtml(snapshot.license)}</strong>
        </div>
        <div>
          <span>Release</span>
          ${
            snapshot.release
              ? `<a href="${escapeHtml(snapshot.release.url)}" target="_blank" rel="noreferrer">${escapeHtml(snapshot.release.tag)}</a>`
              : "<strong>Sin release</strong>"
          }
        </div>
        <div>
          <span>Consultas API restantes</span>
          <strong>${snapshot.rateLimitRemaining ?? "No informado"}</strong>
        </div>
      </div>
    `;
  } catch (error) {
    githubStatus.innerHTML = `
      <div class="github-error">
        <i data-lucide="cloud-off" aria-hidden="true"></i>
        <div>
          <h2>Telemetria no disponible</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </div>
    `;
  }

  refreshIcons();
}

function renderAccount() {
  const progress = getProgress(currentSession?.userId);
  const percentage = Math.round((progress.completed.length / missions.length) * 100);
  const profileName = document.querySelector("#profile-name");
  const profileRole = document.querySelector("#profile-role");
  const avatar = document.querySelector(".avatar");

  profileName.textContent = currentSession?.name ?? "Invitado";
  profileRole.textContent = currentSession?.role ?? "sin sesion";
  avatar.textContent = (currentSession?.name ?? "?").slice(0, 1).toUpperCase();
  document.querySelector("#xp-total").textContent = progress.xp;
  document.querySelector("#streak-count").textContent = progress.streak;
  document.querySelector("#rank-label").textContent = getRank(progress.xp);
  document.querySelector("#completed-count").textContent =
    `${progress.completed.length}/${missions.length}`;
  document.querySelector(".hero-signal small").textContent =
    `${percentage}% sincronizado`;
  document.querySelectorAll(".admin-only").forEach((item) => {
    item.hidden = currentSession?.role !== "admin";
  });

  renderMissionGrid(
    document.querySelector("[data-course-filter].is-active")?.dataset.courseFilter ??
      "all",
  );
  renderNextMission();
  renderRanking();
  if (currentSession?.role === "admin") renderAdmin();
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === "register";

  document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.authMode === mode);
  });
  document.querySelector("#name-field").hidden = !isRegister;
  document.querySelector("#auth-name").required = isRegister;
  document.querySelector("#auth-password").autocomplete = isRegister
    ? "new-password"
    : "current-password";
  document.querySelector("#auth-submit-label").textContent = isRegister
    ? "Crear cuenta"
    : "Conectar";
  document.querySelector("#auth-error").textContent = "";
}

function openAccountDialog() {
  const hasSession = Boolean(currentSession);
  authFields.hidden = hasSession;
  sessionPanel.hidden = !hasSession;

  if (hasSession) {
    document.querySelector("#session-avatar").textContent =
      currentSession.name.slice(0, 1).toUpperCase();
    document.querySelector("#session-name").textContent = currentSession.name;
    document.querySelector("#session-email").textContent = currentSession.email;
    document.querySelector("#session-role").textContent = currentSession.role;
  } else {
    authForm.reset();
    setAuthMode("login");
  }

  authDialog.showModal();
  refreshIcons();
}

document.querySelectorAll("[data-view-target]").forEach((trigger) => {
  trigger.addEventListener("click", () => showView(trigger.dataset.viewTarget));
});

document.querySelector("#mobile-menu").addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
});

document.querySelector("#refresh-github").addEventListener("click", () => {
  githubLoaded = false;
  renderGitHubTelemetry(true);
});

runButton.addEventListener("click", executeLabCode);
document.querySelector("#clear-console").addEventListener("click", () => {
  consoleOutput.textContent = "$ consola limpia";
});
terminalInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  runTerminalCommand(terminalInput.value);
  terminalInput.value = "";
});

let brandClicks = 0;
let brandClickTimer;
document.querySelector(".brand").addEventListener("click", () => {
  brandClicks += 1;
  window.clearTimeout(brandClickTimer);
  brandClickTimer = window.setTimeout(() => {
    brandClicks = 0;
  }, 1800);

  if (brandClicks === 7) {
    document.body.classList.toggle("tomatin-party");
    unlockSecret("seven-tomatins", 77, "Siete tomates alineados.");
    brandClicks = 0;
  }
});

document.querySelector("#admin-panel").addEventListener("change", (event) => {
  if (currentSession?.role !== "admin") return;

  if (event.target.matches("[data-admin-points]")) {
    const points = Number(event.target.value);
    if (Number.isFinite(points) && points >= 10 && points <= 2000) {
      updateMissionSettings(event.target.dataset.adminPoints, { points });
      renderAccount();
      showToast("Puntaje actualizado.");
    }
  }

  if (event.target.matches("[data-admin-enabled]")) {
    updateMissionSettings(event.target.dataset.adminEnabled, {
      enabled: event.target.checked,
    });
    renderAccount();
    showToast(event.target.checked ? "Mision activada." : "Mision pausada.");
  }
});

document.querySelector("#admin-panel").addEventListener("click", (event) => {
  if (currentSession?.role !== "admin") return;

  if (event.target.closest("[data-admin-export]")) {
    exportLocalData();
  }

  if (
    event.target.closest("[data-admin-reset]") &&
    window.confirm("Se borrara todo el progreso local. Esta accion no se puede deshacer.")
  ) {
    resetAllProgress();
    resetAdminSettings();
    renderAccount();
    showToast("Progreso y ajustes reiniciados.");
  }
});

document.querySelector("#auth-trigger").addEventListener("click", openAccountDialog);
document.querySelector("#auth-close").addEventListener("click", () => {
  authDialog.close();
});

document.querySelector(".auth-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-auth-mode]");
  if (tab) setAuthMode(tab.dataset.authMode);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#auth-email").value;
  const password = document.querySelector("#auth-password").value;
  const error = document.querySelector("#auth-error");
  error.textContent = "";

  try {
    currentSession =
      authMode === "register"
        ? await register({
            email,
            password,
            name: document.querySelector("#auth-name").value,
          })
        : await login(email, password);
    authDialog.close();
    renderAccount();
    showToast(`Sesion conectada: ${currentSession.name}`);
  } catch (authError) {
    error.textContent = authError.message;
  }
});

document.querySelector("#logout-button").addEventListener("click", () => {
  logout();
  currentSession = null;
  authDialog.close();
  if (document.querySelector("#admin-view").classList.contains("is-active")) {
    showView("dashboard");
  }
  renderAccount();
  showToast("Sesion cerrada.");
});

document.addEventListener("mission:passed", ({ detail: { mission } }) => {
  if (!currentSession) {
    showToast("Mision superada. Inicia sesion para guardar el puntaje.");
    return;
  }

  const result = completeMission(currentSession.userId, mission);
  renderAccount();
  showToast(
    result.alreadyCompleted
      ? "Mision repetida: el XP ya estaba registrado."
      : `Mision completada: +${result.awarded} XP`,
  );
});

document.querySelector(".filter-bar").addEventListener("click", (event) => {
  const filter = event.target.closest("[data-course-filter]");
  if (!filter) return;

  document.querySelectorAll("[data-course-filter]").forEach((item) => {
    item.classList.toggle("is-active", item === filter);
    item.setAttribute("aria-pressed", String(item === filter));
  });
  renderMissionGrid(filter.dataset.courseFilter);
});

const konamiSequence = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
let konamiIndex = 0;

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;

  if (event.key === konamiSequence[konamiIndex]) {
    konamiIndex += 1;
    if (konamiIndex === konamiSequence.length) {
      document.body.classList.toggle("matrix-mode");
      unlockSecret("konami-cordillera", 128, "Modo Cordillera desbloqueado.");
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

document.addEventListener("click", (event) => {
  const missionTrigger = event.target.closest("[data-mission-open]");
  if (missionTrigger) {
    openMission(missionTrigger.dataset.missionOpen);
    return;
  }

  if (event.target.closest("[data-close-dialog]")) {
    missionDialog.close();
    return;
  }

  const hintTrigger = event.target.closest("[data-hint-toggle]");
  if (hintTrigger) {
    const hintBox = missionContent.querySelector("[data-hint-box]");
    hintBox.hidden = !hintBox.hidden;
    hintTrigger.classList.toggle("is-active", !hintBox.hidden);
    return;
  }

  const startTrigger = event.target.closest("[data-start-mission]");
  if (startTrigger) {
    const mission = getConfiguredMission(startTrigger.dataset.startMission);
    document.querySelector("#code-editor").value = mission.starterCode;
    document.querySelector("#code-editor").dataset.missionId = mission.id;
    missionDialog.close();
    showView("lab");
  }
});

document.addEventListener("click", (event) => {
  if (
    window.innerWidth <= 720 &&
    sidebar.classList.contains("is-open") &&
    !sidebar.contains(event.target) &&
    !event.target.closest("#mobile-menu")
  ) {
    sidebar.classList.remove("is-open");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await ensureDemoAccounts();
  renderMissionGrid();
  renderNextMission();
  renderAccount();
  refreshIcons();
});
window.addEventListener("load", refreshIcons);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      showToast("El modo offline no pudo iniciarse en este navegador.");
    });
  });
}

export { refreshIcons, showView };
