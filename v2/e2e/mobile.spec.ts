import { expect, test } from "@playwright/test";

test("mobile navigation and workspace remain inside the viewport", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como estudiante" }).click();
  await page.getByRole("button", { name: "Omitir", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tienes 3 tareas pendientes" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("link", { name: "Misiones" }).click();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  const firstTask = page.locator(".mission-card.is-assigned").first();
  await expect(firstTask).toContainText("Variables y acumuladores");
  await firstTask.getByRole("link", { name: "Trabajar en la tarea" }).click();
  await expect(page.locator(".assignment-note-priority")).toContainText(
    "Variables y acumuladores",
  );
  await page.getByRole("tab", { name: "Pistas" }).click();
  await expect(page.getByRole("heading", { name: "Pistas progresivas" })).toBeVisible();
  await page.getByRole("tab", { name: "Misión" }).click();
  await page.locator(".brief-scroll").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => page.locator(".brief-scroll").evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Código" }).click();
  await expect(page.getByRole("button", { name: "Ejecutar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entregar" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("mobile rewards keep cards and confirmation inside the viewport", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como estudiante" }).click();
  await page.getByRole("button", { name: "Omitir", exact: true }).click();
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("link", { name: "Premios" }).click();
  await expect(
    page.getByRole("heading", { name: "Premios", exact: true }),
  ).toBeVisible();
  const featured = page.locator(".reward-card.is-featured");
  await expect(featured).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page
    .locator(".reward-card")
    .filter({ hasText: "Pista extra" })
    .getByRole("button", { name: "Canjear" })
    .click();
  await expect(page.getByRole("alertdialog", { name: "Pista extra" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
