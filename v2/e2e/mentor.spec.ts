import { expect, test } from "@playwright/test";

test("mentor reviews a pending submission and awards XP once", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como eeminionn" }).click();
  await page.getByRole("link", { name: "Abrir panel mentor" }).click();
  await page.getByRole("button", { name: /Revisiones/ }).click();

  await expect(page.getByText("Camila Rojas").first()).toBeVisible();
  await page.getByRole("button", { name: "Aprobar y asignar XP" }).click();
  await expect(page.getByText("Cola al día")).toBeVisible();

  await page.getByRole("link", { name: "Ranking" }).click();
  const camila = page.locator(".ranking-row").filter({ hasText: "Camila Rojas" });
  await expect(camila.locator(".ranking-xp")).toHaveText("200");
});

test("mentor can create a one-use invitation in demo mode", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como eeminionn" }).click();
  await page.getByRole("link", { name: "Abrir panel mentor" }).click();
  await page.getByRole("button", { name: "Invitaciones" }).click();
  const before = await page.locator(".invitation-row").count();
  await page.getByRole("button", { name: "Generar invitación" }).click();
  await expect(page.locator(".invitation-row")).toHaveCount(before + 1);
});

test("mentor creates an assignment for selected students", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como eeminionn" }).click();
  await page.getByRole("link", { name: "Abrir panel mentor" }).click();
  await page.getByRole("button", { name: "Asignaciones" }).click();

  await page.getByRole("button", { name: "Nueva tarea" }).click();
  await page.getByLabel("Misión").selectOption({ index: 1 });
  await page.getByLabel("Título de la tarea").fill("Prueba de aula");
  await page.getByLabel("Instrucciones").fill("Resuelve y explica una decisión.");
  await page.getByRole("button", { name: "Publicar tarea" }).click();

  await expect(page.getByText("Prueba de aula")).toBeVisible();
});

test("mentor duplicates and publishes a versioned mission", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como eeminionn" }).click();
  await page.getByRole("link", { name: "Abrir panel mentor" }).click();
  await page.getByRole("button", { name: "Misiones" }).click();

  const duplicate = page.getByRole("button", {
    name: "Duplicar La once de Tomatin",
  });
  await duplicate.click();
  const draft = page.locator(".draft-section .mission-admin-row").first();
  await expect(draft).toContainText("La once de Tomatin · copia");
  await draft.getByRole("button", { name: "Publicar" }).click();
  await expect(draft.getByRole("button", { name: "Publicada" })).toBeDisabled();
});
