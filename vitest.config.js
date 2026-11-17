import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    exclude: [...configDefaults.exclude, 'e2e/**'], // las pruebas de e2e/ son de Playwright
    // `npm run coverage` mide la cobertura. Sprint 2: completa esta sección (requisito 21 del enunciado)
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
