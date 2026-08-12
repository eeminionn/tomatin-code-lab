import { expect, test } from "@playwright/test";

test.skip(
  process.env.VITE_FRONTEND_ONLY !== "true",
  "Only runs against the frontend-only sandbox.",
);

function watchBackendRequests(page: import("@playwright/test").Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    const hostname = new URL(url).hostname;
    if (
      hostname.endsWith(".supabase.co") ||
      hostname.includes("judge0") ||
      hostname === "api.github.com"
    ) {
      requests.push(url);
    }
  });
  return requests;
}

test("frontend sandbox keeps the current student UI without backend calls", async ({
  page,
}) => {
  const backendRequests = watchBackendRequests(page);
  await page.goto("./");

  await expect(page.getByText("Sandbox local de Aula 3.0")).toBeVisible();
  await page.getByRole("button", { name: "Ver interfaz de estudiante" }).click();
  await expect(
    page.getByText("Vista para contribuir al frontend"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "La once de Tomatin" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ejecutar" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Entregar" })).toBeDisabled();

  await page.getByRole("button", { name: "C++", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ejecutar" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Entregar" })).toBeDisabled();

  await page.locator(".profile-menu-trigger").click();
  await page.getByRole("menuitem", { name: "Editar perfil" }).click();
  await expect(
    page.getByRole("button", { name: "Guardar perfil" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Acerca del proyecto" }).click();
  await expect(page.getByText("Sin conexiones a servicios externos")).toBeVisible();
  expect(backendRequests).toEqual([]);
});

test("frontend sandbox renders rewards while keeping redemptions disabled", async ({
  page,
}) => {
  const backendRequests = watchBackendRequests(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Ver interfaz de estudiante" }).click();
  await page.getByRole("link", { name: "Premios" }).click();
  await expect(
    page.getByRole("heading", { name: "Premios", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Canjear" })).toBeDisabled();
  expect(backendRequests).toEqual([]);
});

test("frontend sandbox displays mentor controls but blocks mutations", async ({
  page,
}) => {
  const backendRequests = watchBackendRequests(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Ver panel del mentor" }).click();
  await expect(
    page.getByRole("heading", { name: "Panel de eeminionn" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Invitaciones", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo enlace" }).click();
  await expect(
    page.getByRole("button", { name: "Crear enlace" }),
  ).toBeDisabled();

  await page.getByRole("link", { name: /^Revisiones/ }).click();
  await expect(
    page.getByRole("button", { name: "Solicitar cambios" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Aprobar y asignar XP" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Premios", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo premio" }).click();
  await expect(
    page.getByRole("button", { name: "Guardar premio" }),
  ).toBeDisabled();
  expect(backendRequests).toEqual([]);
});

test("frontend sandbox remains usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("./");
  await page.getByRole("button", { name: "Ver interfaz de estudiante" }).click();

  await expect(
    page.getByText("Vista para contribuir al frontend"),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
});
