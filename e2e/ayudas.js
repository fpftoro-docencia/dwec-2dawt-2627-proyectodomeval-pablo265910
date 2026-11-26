/**
 * Funciones de ayuda reutilizables para las pruebas End-to-End (E2E) de GameVault.
 *
 * Todas las interacciones emplean selectores semánticos accesibles
 * (`getByRole`, `getByLabel`, `getByText`) y rutas relativas para funcionar
 * tanto en local con `serve` como frente a la vista previa desplegada (`BASE_URL`).
 */

import { expect } from '@playwright/test';

/**
 * Registra un nuevo usuario desde `/registro.html` y verifica la redirección a `/listado.html`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} datos
 * @param {string} datos.usuario
 * @param {string} datos.correo
 * @param {string} datos.clave
 */
export async function registrarUsuario(page, { usuario, correo, clave }) {
  await page.goto('/registro.html');

  await page.getByLabel('Nombre de usuario').fill(usuario);
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Repetir contraseña', { exact: true }).fill(clave);
  await page.getByLabel(/Acepto las condiciones de uso/i).check();

  await page.getByRole('button', { name: 'Completar registro' }).click();
  await expect(page).toHaveURL(/listado\.html/);
}

/**
 * Inicia sesión desde `/index.html` y verifica el acceso al listado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} credenciales
 * @param {string} credenciales.usuario
 * @param {string} credenciales.clave
 */
export async function iniciarSesion(page, { usuario, clave }) {
  await page.goto('/index.html');

  await page.getByLabel('Nombre de usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);

  await page.getByRole('button', { name: 'Entrar en mi biblioteca' }).click();
  await expect(page).toHaveURL(/listado\.html/);
}

/**
 * Cierra la sesión actual usando el botón de la cabecera común.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function cerrarSesion(page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/index\.html/);
}

/**
 * Da de alta un videojuego completo accediendo a `ficha.html` desde el listado.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} datos
 */
export async function crearVideojuegoDesdeFicha(page, datos) {
  await page.getByRole('link', { name: '+ Añadir videojuego' }).click();
  await expect(page).toHaveURL(/ficha\.html/);
  await expect(page.getByRole('heading', { name: 'Alta de Videojuego' })).toBeVisible();

  await page.getByLabel(/Título del videojuego/i).fill(datos.titulo);
  await page.getByLabel(/Plataforma/i).selectOption(datos.plataforma);

  if (datos.sku) {
    await page.getByLabel(/Código SKU/i).fill(datos.sku);
  }

  await page.getByLabel(/Fecha de adquisición/i).fill(datos.fechaAdquisicion);
  await page.getByLabel(/Horas jugadas/i).fill(String(datos.horasJugadas ?? 0));
  await page.getByLabel(/Estado de progreso/i).selectOption(datos.estadoProgreso || 'pendiente');

  if (datos.formato === 'fisico') {
    await page.getByText('Edición Física', { exact: true }).click();
    if (datos.codigoBarras) {
      await page.getByLabel(/Código de barras EAN-13/i).fill(datos.codigoBarras);
    }
    if (datos.ubicacionEstanteria) {
      await page.getByLabel(/Ubicación en estantería/i).fill(datos.ubicacionEstanteria);
    }
  } else {
    await page.getByText('Edición Digital', { exact: true }).click();
    if (datos.tiendaDigital) {
      await page.getByLabel(/Tienda digital/i).selectOption(datos.tiendaDigital);
    }
  }

  if (Array.isArray(datos.dlcs)) {
    for (const dlc of datos.dlcs) {
      await page.getByRole('button', { name: '+ Añadir DLC' }).click();
      await page.getByLabel('Nombre del DLC').last().fill(dlc.titulo);
      await page
        .getByLabel('Estado del DLC')
        .last()
        .selectOption(dlc.estado || 'pendiente');
    }
  }

  await page.getByRole('button', { name: 'Guardar videojuego' }).click();
  await expect(page).toHaveURL(/listado\.html/);
}
