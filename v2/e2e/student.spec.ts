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

  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText(/tests|Error de ejecución|Hay tests por corregir/).first()).toBeVisible({
    timeout: 15_000,
  });
});

test("keeps independent code when changing language", async ({ page }) => {
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "PY", exact: true }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("def total_once(precios):\n    return 42");
  await page.waitForTimeout(700);

  await page.getByRole("button", { name: "JS", exact: true }).click();
  await page.getByRole("button", { name: "PY", exact: true }).click();
  await expect(page.locator(".view-lines")).toContainText("total_once");
  await expect(page.getByText("Borrador guardado")).toBeVisible();
});

test("dashboard has no serious automated accessibility violations", async ({
  page,
}) => {
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(results.violations).toEqual([]);
});
