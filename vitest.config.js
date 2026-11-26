import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    exclude: [...configDefaults.exclude, 'e2e/**'], // las pruebas de e2e/ son de Playwright
    // Umbral mínimo del 90 % de líneas por archivo en lógica pura y persistencia de la entidad
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // `text` en la terminal y `html` en coverage/, que sube el workflow
      include: ['js/validadores.js', 'js/paginar.js', 'js/buscador.js', 'js/juegos.js'],
      thresholds: {
        lines: 90,
        perFile: true,
      },
    },
  },
});
