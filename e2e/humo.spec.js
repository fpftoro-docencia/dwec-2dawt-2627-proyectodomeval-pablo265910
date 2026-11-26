import { test, expect } from '@playwright/test';

test.describe('Prueba de humo de GameVault', () => {
  test('responde con HTTP 200 y muestra el acceso y el registro', async ({ page }) => {
    const respuesta = await page.goto('/');
    expect(respuesta?.status()).toBe(200);

    await expect(page).toHaveTitle('Iniciar Sesión — GameVault');
    await expect(page.getByRole('heading', { name: 'Bienvenido a GameVault' })).toBeVisible();
    await expect(page.getByLabel('Nombre de usuario')).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar en mi biblioteca' })).toBeVisible();
    await expect(page.getByRole('status')).toBeAttached();

    await page.getByRole('link', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/registro\.html/);
    await expect(page).toHaveTitle('Crear Cuenta — GameVault');
    await expect(page.getByRole('heading', { name: 'Crear cuenta en GameVault' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Completar registro' })).toBeVisible();
  });
});
