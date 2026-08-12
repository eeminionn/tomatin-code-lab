import { expect, test, type Page } from "@playwright/test";

async function loginAsMentor(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como eeminionn" }).click();
  await expect(
    page.getByRole("heading", { name: "Panel de eeminionn" }),
  ).toBeVisible();
}

test("mentor reviews a pending submission and awards XP once", async ({ page }) => {
  await loginAsMentor(page);
  await page.getByRole("link", { name: /^Revisiones/ }).click();

  await expect(page.getByText("Camila Rojas").first()).toBeVisible();
  await page.getByLabel("Comentar línea 2").click();
  await page
    .getByLabel("Comentario en línea 2")
    .fill("El acumulador debe actualizarse dentro del bucle.");
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByLabel("Correctitud").check();
  await page.getByRole("button", { name: "Aprobar y asignar XP" }).click();
  await expect(page.getByText("Cola al día")).toBeVisible();

  await page.getByRole("button", { name: "Ver como estudiante" }).click();
  await page.getByLabel("Perspectiva").selectOption({ label: "Camila Rojas" });
  await page.getByRole("button", { name: "Abrir vista" }).click();
  await page.getByRole("link", { name: "Ranking" }).click();
  const camila = page.locator(".ranking-row").filter({ hasText: "Camila Rojas" });
  await expect(camila.locator(".ranking-xp")).toHaveText("200");
});

test("mentor creates and edits a configurable invitation", async ({ page }) => {
  await loginAsMentor(page);
  await page.getByRole("link", { name: "Invitaciones", exact: true }).click();
  const before = await page.locator(".invitation-row").count();
  await page.getByRole("button", { name: "Nuevo enlace" }).click();
  await page.getByLabel("Nombre del enlace").fill("Grupo de ayudantía");
  await page.getByLabel("Cupos").fill("3");
  await page.getByRole("button", { name: "Crear enlace" }).click();
  await expect(page.locator(".invitation-row")).toHaveCount(before + 1);

  const invitation = page
    .locator(".invitation-row")
    .filter({ hasText: "Grupo de ayudantía" });
  await expect(invitation).toContainText("0/3");
  await invitation
    .getByRole("button", { name: "Editar Grupo de ayudantía" })
    .click();
  await page.getByLabel("Cupos").fill("5");
  await page.getByLabel("Enlace activo").uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(invitation).toContainText("0/5");
  await expect(invitation).toContainText("REVOCADA");
  await expect(invitation.getByRole("button", { name: "Copiar" })).toBeDisabled();
});

test("mentor creates an assignment for selected students", async ({ page }) => {
  await loginAsMentor(page);
  await page.getByRole("link", { name: "Tareas", exact: true }).click();

  await page.getByRole("button", { name: "Nueva tarea" }).click();
  await page.getByLabel("Misión").selectOption({ index: 1 });
  await page.getByLabel("Título de la tarea").fill("Prueba de aula");
  await page.getByLabel("Instrucciones").fill("Resuelve y explica una decisión.");
  await page.getByRole("button", { name: "Publicar tarea" }).click();

  await expect(page.getByText("Prueba de aula")).toBeVisible();
});

test("mentor edits and deletes an assignment with its ranking XP", async ({
  page,
}) => {
  await loginAsMentor(page);
  await page.getByRole("link", { name: "Ranking", exact: true }).click();
  const diegoBefore = page.locator(".ranking-row").filter({ hasText: "Diego Soto" });
  await expect(diegoBefore.locator(".ranking-xp")).toHaveText("100");

  await page.getByRole("link", { name: "Tareas", exact: true }).click();
  const assignment = page
    .locator(".assignment-admin-item")
    .filter({ hasText: "Variables y acumuladores" });
  await assignment
    .getByRole("button", { name: "Editar Variables y acumuladores" })
    .click();
  await assignment.getByLabel("Nombre de la tarea").fill("Acumuladores actualizados");
  await assignment
    .getByLabel("Descripción e instrucciones")
    .fill("Usa un acumulador y explica el resultado.");
  await assignment.getByRole("button", { name: "Guardar cambios" }).click();
  const updatedAssignment = page
    .locator(".assignment-admin-item")
    .filter({ hasText: "Acumuladores actualizados" });
  await expect(updatedAssignment).toBeVisible();

  await updatedAssignment
    .getByRole("button", { name: "Eliminar Acumuladores actualizados" })
    .click();
  await expect(updatedAssignment.getByRole("alertdialog")).toContainText(
    "Los intentos históricos se conservarán",
  );
  await updatedAssignment
    .getByRole("button", { name: "Eliminar definitivamente" })
    .click();
  await expect(updatedAssignment).toHaveCount(0);

  await page.getByRole("link", { name: "Ranking", exact: true }).click();
  const diegoAfter = page.locator(".ranking-row").filter({ hasText: "Diego Soto" });
  await expect(diegoAfter.locator(".ranking-xp")).toHaveText("0");
});

test("mentor duplicates and publishes a versioned mission", async ({ page }) => {
  await loginAsMentor(page);
  await page.getByRole("link", { name: "Misiones", exact: true }).click();

  const duplicate = page.getByRole("button", {
    name: "Duplicar La once de Tomatin",
  });
  await duplicate.click();
  const draft = page.locator(".draft-section .mission-admin-row").first();
  await expect(draft).toContainText("La once de Tomatin · copia");
  await draft.getByRole("button", { name: "Publicar" }).click();
  await expect(draft.getByRole("button", { name: "Publicada" })).toBeDisabled();
});

test("owner can inspect a student in read-only mode and return to admin", async ({
  page,
}) => {
  await loginAsMentor(page);
  await page.getByRole("link", { name: "Estudiantes", exact: true }).click();
  await page
    .locator(".student-directory-row")
    .filter({ hasText: "Camila Rojas" })
    .click();
  await page.getByRole("link", { name: "Ver perspectiva" }).click();

  await expect(page.getByText("Vista estudiante")).toBeVisible();
  await page.getByRole("link", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Ejecutar" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Entregar" })).toBeDisabled();
  await expect(page.getByRole("tab", { name: "Solución" })).toHaveCount(0);

  await page
    .getByRole("button", { name: "Volver al panel de administración" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Panel de eeminionn" }),
  ).toBeVisible();
});
