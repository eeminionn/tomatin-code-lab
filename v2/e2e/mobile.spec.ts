import { expect, test } from "@playwright/test";

test("mobile navigation and workspace remain inside the viewport", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrar como estudiante" }).click();
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("link", { name: "Misiones" }).click();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await page
    .locator('.mission-card:has(h2:text-is("La once de Tomatin"))')
    .getByRole("link", { name: "Abrir workspace" })
    .click();
  await page.getByRole("tab", { name: "Código" }).click();
  await expect(page.getByRole("button", { name: "Ejecutar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entregar" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
