import { test, expect } from '@playwright/test';
import { registrarUsuario, crearVideojuegoDesdeFicha } from './ayudas.js';

test.describe('Recorrido 2: CRUD completo de GameVault y persistencia', () => {
  test('da de alta un videojuego con DLCs, lo edita, recarga y lo borra tras confirmar en <dialog>', async ({
    page,
  }) => {
    const fechaSegura = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

    await registrarUsuario(page, {
      usuario: 'jugador_e2e',
      correo: 'jugador.e2e@gamevault.es',
      clave: 'Password2026',
    });

    // 1. Alta completa desde ficha.html (Edición Física + DLC dinámico)
    await crearVideojuegoDesdeFicha(page, {
      titulo: 'Elden Ring',
      plataforma: 'PlayStation 5',
      sku: 'GAME-RPG-0042',
      fechaAdquisicion: fechaSegura,
      horasJugadas: 60,
      estadoProgreso: 'jugando',
      formato: 'fisico',
      codigoBarras: '4020628663124',
      ubicacionEstanteria: 'EST-A-03',
      dlcs: [{ titulo: 'Shadow of the Erdtree', estado: 'jugando' }],
    });

    await expect(page.getByText('Videojuego añadido con éxito')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Elden Ring' })).toBeVisible();
    await expect(page.getByText('EST-A-03')).toBeVisible();

    // 1b. Comprobar giro bidireccional 3D de la tarjeta (ficha técnica, EAN-13 y DLCs)
    await page.getByRole('button', { name: 'Ver ficha técnica de Elden Ring' }).click();
    await expect(page.getByText('GAME-RPG-0042')).toBeVisible();
    await expect(page.getByText('4020628663124')).toBeVisible();
    await expect(page.getByText('Shadow of the Erdtree')).toBeVisible();
    await page.getByRole('button', { name: 'Volver a la portada de Elden Ring' }).click();
    await expect(
      page.getByRole('button', { name: 'Ver ficha técnica de Elden Ring' }),
    ).toBeVisible();

    // 2. Comprobar persistencia en localStorage tras recargar
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Elden Ring' })).toBeVisible();
    await expect(page.getByText(/Mostrando 1 videojuego/i)).toBeVisible();

    // 3. Edición cambiando horas y conmutando a formato Digital (Steam)
    await page.getByRole('link', { name: 'Editar Elden Ring' }).click();
    await expect(page).toHaveURL(/ficha\.html\?id=/);
    await expect(page.getByLabel(/Título del videojuego/i)).toHaveValue('Elden Ring');

    await page.getByLabel(/Horas jugadas/i).fill('125');
    await page.getByLabel(/Estado de progreso/i).selectOption('completado');
    await page.getByText('Edición Digital', { exact: true }).click();
    await page.getByLabel(/Tienda digital/i).selectOption('Steam');

    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page).toHaveURL(/listado\.html/);
    await expect(page.getByText('Videojuego actualizado con éxito')).toBeVisible();
    await expect(page.getByText('Steam')).toBeVisible();

    // Recargar y comprobar que la edición persiste
    await page.reload();
    await expect(page.getByText('Steam')).toBeVisible();
    await expect(page.getByText('Completado', { exact: true })).toBeVisible();

    // 4. Borrado: primero cancelar en <dialog> (no borra), luego confirmar
    await page.getByRole('button', { name: 'Eliminar Elden Ring' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { name: 'Elden Ring' })).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar Elden Ring' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar juego' }).click();

    await expect(page.getByText('Videojuego eliminado con éxito')).toBeVisible();
    await expect(page.getByText(/Tu bóveda de videojuegos está vacía/i)).toBeVisible();

    // 5. Tras recargar, el catálogo sigue vacío
    await page.reload();
    await expect(page.getByText(/Tu bóveda de videojuegos está vacía/i)).toBeVisible();
  });
});
