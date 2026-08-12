import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como estudiante" }).click();
  await expect(page.getByRole("heading", { name: /Hola, Camila/ })).toBeVisible();
});

test("opens an assigned mission in two actions and runs visible tests", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { name: /Hola, Camila/ })).toBeVisible();
  await page.getByRole("link", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "La once de Tomatin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "JS", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "PY", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "C++", exact: true })).toBeVisible();
  await expect(page.getByText("TU MISIÓN")).toBeVisible();
  await expect(page.getByText("IDEA CLAVE")).toBeVisible();
  await expect(page.getByText("PASOS SUGERIDOS")).toBeVisible();
  await expect(
    page.getByText("precios = [1200, 850], cantidades = [2, 3]"),
  ).toBeVisible();
  await expect(page.getByText(/1200 × 2 \+ 850 × 3 = 4950/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__TOMATIN_EDITOR__?.getValue()))
    .toContain("const preciosEjemplo = [1200, 850]");
  await expect(page.getByRole("button", { name: "Entregar" })).toBeDisabled();

  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(
    page.getByText("El código corre, pero aún no pasa todos los tests"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Entregar" })).toBeEnabled();
});

test("prioritizes pending tasks and shows the mentor brief before the mission", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Tienes 3 tareas pendientes" }),
  ).toBeVisible();
  const pending = page.locator("details.task-group.pending");
  const approved = page.locator("details.task-group.approved");
  await expect(pending).toHaveAttribute("open", "");
  await expect(pending.locator(".assignment-row").first()).toContainText(
    "Variables y acumuladores",
  );
  await approved.locator("summary").click();
  await expect(approved).toContainText("Condiciones booleanas");

  await page.getByRole("link", { name: "Misiones" }).click();
  const firstTask = page.locator(".mission-card.is-assigned").first();
  await expect(firstTask).toContainText("Variables y acumuladores");
  await expect(firstTask).toContainText(
    "Resuelve la misión en cualquiera de los tres lenguajes.",
  );
  await expect(firstTask.locator(".mission-card-priority")).toContainText(
    "Vence",
  );
  const catalogAccessibility = await new AxeBuilder({ page }).analyze();
  expect(catalogAccessibility.violations).toEqual([]);
  await firstTask.getByRole("link", { name: "Trabajar en la tarea" }).click();

  const firstBriefBlock = page.locator(".brief-scroll > section").first();
  await expect(firstBriefBlock).toHaveClass(/assignment-note-priority/);
  await expect(firstBriefBlock).toContainText("Variables y acumuladores");
  await expect(firstBriefBlock).toContainText(
    "Resuelve la misión en cualquiera de los tres lenguajes.",
  );
  await expect(firstBriefBlock).toContainText("En revisión");
});

test("celebrates when the student has no pending work", async ({ page }) => {
  await page.getByRole("link", { name: "Feedback" }).click();
  await page
    .getByRole("button", { name: /Eliminar feedback Comentario del mentor/ })
    .click();
  await page.evaluate(() => {
    const key = "tomatin.v2.demo-classroom";
    const stored = window.localStorage.getItem(key);
    if (!stored) throw new Error("Demo snapshot was not persisted");
    const snapshot = JSON.parse(stored) as {
      progress: Array<{ userId: string; status: string }>;
    };
    snapshot.progress = snapshot.progress.map((entry) =>
      entry.userId === "student-01"
        ? { ...entry, status: "approved" }
        : entry,
    );
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await page.reload();
  await page.getByRole("link", { name: "Tareas" }).click();

  await expect(page.getByRole("heading", { name: "Estás al día" })).toBeVisible();
  await expect(page.getByText("No tienes entregas pendientes. Buen trabajo.")).toBeVisible();
});

test("resizes results and keeps long editor lines on one line", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Continuar" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__TOMATIN_EDITOR__?.getRawOptions().wordWrap,
      ),
    )
    .toBe("off");

  const editor = page.locator(".code-pane");
  const results = page.locator(".results-pane");
  const resizer = page.getByRole("separator", {
    name: "Ajustar ancho de Resultados",
  });
  const editorBefore = await editor.boundingBox();
  const resultsBefore = await results.boundingBox();
  const handle = await resizer.boundingBox();
  expect(editorBefore).not.toBeNull();
  expect(resultsBefore).not.toBeNull();
  expect(handle).not.toBeNull();

  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + 80);
  await page.mouse.down();
  await page.mouse.move(handle!.x - 70, handle!.y + 80);
  await page.mouse.up();

  const editorAfter = await editor.boundingBox();
  const resultsAfter = await results.boundingBox();
  expect(editorAfter!.width).toBeLessThan(editorBefore!.width);
  expect(resultsAfter!.width).toBeGreaterThan(resultsBefore!.width);
});

test("keeps independent code when changing language", async ({ page }) => {
  const pythonDraft = "def total_once(precios):\n    return 42";
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "PY", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.__TOMATIN_EDITOR__)),
    )
    .toBe(true);
  await page.evaluate((code) => {
    window.__TOMATIN_EDITOR__?.setValue(code);
  }, pythonDraft);
  await expect(page.locator(".sync-state.saving")).toBeVisible();
  await expect(page.locator(".sync-state.local")).toContainText("Guardado local");

  await page.getByRole("button", { name: "JS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "JS", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "PY", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "PY", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page.evaluate(() => window.__TOMATIN_EDITOR__?.getValue()),
    )
    .toBe(pythonDraft);
});

test("student edits their avatar and visible name", async ({ page }) => {
  await page.locator(".profile-menu-trigger").click();
  await page.getByRole("menuitem", { name: "Editar perfil" }).click();
  await expect(page.getByRole("heading", { name: "Tu perfil" })).toBeVisible();

  await page.getByLabel("Nombre visible").fill("Cami Rojas");
  await page.getByRole("tab", { name: "Accesorios" }).click();
  await page.getByRole("button", { name: "Redondos" }).click();
  await page.getByRole("button", { name: "Argolla" }).click();
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByText("Perfil actualizado.")).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("link", { name: "Ranking" }).click();
  await expect(
    page.locator(".ranking-row").filter({ hasText: "Cami Rojas" }),
  ).toBeVisible();
});

test("feedback identifies its mission and can be dismissed", async ({ page }) => {
  await page.getByRole("link", { name: "Feedback" }).click();
  await expect(page.getByText("P1-01").first()).toBeVisible();
  await expect(page.getByText("La once de Tomatin").first()).toBeVisible();
  const before = await page.locator(".feedback-item").count();

  await page
    .getByRole("button", { name: /Eliminar feedback Comentario del mentor/ })
    .click();
  await expect(page.locator(".feedback-item")).toHaveCount(before - 1);
});

test("feedback can be cleared in one confirmed action", async ({ page }) => {
  await page.getByRole("link", { name: "Feedback" }).click();
  await page.getByRole("button", { name: "Limpiar todo" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "¿Eliminar toda la bandeja?",
  });
  await expect(dialog).toContainText("2 mensajes");
  await dialog.getByRole("button", { name: "Limpiar todo" }).click();
  await expect(page.locator(".feedback-item")).toHaveCount(0);
  await expect(page.getByText("No hay feedback todavía")).toBeVisible();
});

test("student redeems a reward without changing earned ranking XP", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Premios" }).click();
  await expect(page.getByLabel("100 XP disponibles")).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  const reward = page.locator(".reward-card").filter({ hasText: "Pista extra" });
  await reward.getByRole("button", { name: "Canjear" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Pista extra" });
  await expect(dialog).toContainText("20 XP");
  await dialog.getByRole("button", { name: "Confirmar canje" }).click();
  await expect(page.getByLabel("20 XP disponibles")).toBeVisible();
  await expect(page.locator(".redemption-row").first()).toContainText(
    "Solicitado",
  );

  await page.getByRole("link", { name: "Ranking" }).click();
  const camila = page.locator(".ranking-row").filter({ hasText: "Camila Rojas" });
  await expect(camila.locator(".ranking-xp")).toHaveText("100");
});

test("ranking places the winner above the other podium positions", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Ranking" }).click();
  const first = await page.locator(".podium-entry.place-1").boundingBox();
  const second = await page.locator(".podium-entry.place-2").boundingBox();
  const third = await page.locator(".podium-entry.place-3").boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(third).not.toBeNull();
  expect(first!.y).toBeLessThan(second!.y);
  expect(first!.y).toBeLessThan(third!.y);
  expect(first!.x).toBeGreaterThan(second!.x);
  expect(first!.x).toBeLessThan(third!.x);
});

test("dashboard has no serious automated accessibility violations", async ({
  page,
}) => {
  const results = await new AxeBuilder({ page })
    .analyze();
  expect(results.violations).toEqual([]);
});
