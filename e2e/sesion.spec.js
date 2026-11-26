import { test, expect } from '@playwright/test';
import { registrarUsuario, iniciarSesion, cerrarSesion } from './ayudas.js';

test.describe('Recorrido 1: Sesión, roles y control de acceso', () => {
  test('el primer usuario se registra como administrador, accede a Usuarios, cierra sesión y vuelve a entrar', async ({
    page,
  }) => {
    const credenciales = {
      usuario: 'admin_e2e',
      correo: 'admin.e2e@gamevault.es',
      clave: 'Password2026',
    };

    // 1. Registro como primer usuario en un contexto limpio (adquiere rol Administrador)
    await registrarUsuario(page, credenciales);

    await expect(page.getByText(/Tu cuenta ha sido creada con éxito/i)).toBeVisible();
    await expect(page.getByText('admin_e2e', { exact: true })).toBeVisible();
    await expect(page.getByText('Administrador', { exact: true })).toBeVisible();

    // 2. El administrador ve el enlace «Usuarios» en la cabecera y puede abrir el panel
    const enlaceUsuarios = page.getByRole('link', { name: 'Usuarios' });
    await expect(enlaceUsuarios).toBeVisible();
    await enlaceUsuarios.click();
    await expect(page).toHaveURL(/usuarios\.html/);

    // 3. Su propio botón para retirar el rol está deshabilitado explicando el motivo
    await expect(page.getByRole('cell', { name: 'admin_e2e', exact: true })).toBeVisible();
    const botonPropio = page.getByRole('switch', { name: /No puedes retirar tu propio rol/i });
    await expect(botonPropio).toBeDisabled();

    // 4. Cerrar sesión vuelve a index.html e impide el acceso directo a rutas privadas
    await cerrarSesion(page);
    await page.goto('/listado.html');
    await expect(page).toHaveURL(/index\.html/);

    // 5. Volver a iniciar sesión con las mismas credenciales
    await iniciarSesion(page, credenciales);
    await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible();
    await expect(page.getByText('admin_e2e', { exact: true })).toBeVisible();
  });
});
