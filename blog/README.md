# Blog del proyecto

## 10/11/2026 · Sprint 1 · Usuarios, sesión, roles y primera integración continua (v0.1)

### Dificultades y cómo las resolví

El primer reto importante surgió con la validación reactiva de la contraseña en `js/registro.js`. Mientras el usuario escribía, el indicador del requisito numérico (`#req-numero`) fallaba de manera intermitente: al introducir dígitos a veces se marcaba en verde y al siguiente carácter volvía a gris a pesar de que la clave seguía conteniendo números. Al colocar un punto de interrupción condicional en el panel Sources de Chrome DevTools e inspeccionar el objeto RegExp, descubrí que la expresión regular compartida tenía la bandera global `/\d/g`. En los motores JavaScript (V8), una regex con flag `g` mantiene estado interno en la propiedad `lastIndex` entre ejecuciones sucesivas de `.test()`. Lo resolví eliminando el flag `g`, asegurando que `/\d/` sea una función pura y sin efectos secundarios.

La segunda dificultad fue la arquitectura para probar módulos en Node.js que acceden a `sessionStorage` y `localStorage`. Al importar `sesion.js` o `usuarios.js` en Vitest, la ejecución fallaba con `ReferenceError: window is not defined` porque en el entorno de pruebas no existe el objeto global del navegador. La solución fue aplicar el patrón de inyección de dependencias: cada función admite un parámetro opcional `almacen = obtenerAlmacenDefecto()`. En producción en el navegador se toma `window.sessionStorage` o `window.localStorage`, mientras que en los tests unitarios se inyecta una instancia de `AlmacenFalso`, permitiendo probar el 100% de la lógica sin dependencias externas ni navegadores reales.

La tercera dificultad estuvo relacionada con la resiliencia y la tolerancia a fallos ante datos corruptos. Como en una aplicación puramente cliente cualquier usuario o extensión puede editar `localStorage` desde las herramientas de desarrollador, una entrada con JSON mal formado o un tipo inesperado (como guardar un string donde se espera una colección de usuarios) rompía la aplicación con excepciones no controladas de `JSON.parse`. Lo resolví envolviendo todas las lecturas de almacenamiento en bloques `try / catch` rigurosos que validan el tipo del dato devuelto (`Array.isArray(datos)`, verificación de campos y roles) y devuelven valores por defecto seguros (`null` o `[]`), garantizando que la web continúe funcionando de forma estable.

Por último, al ejecutar `npm run format:check` en Windows, Prettier señalaba discrepancias de estilo en múltiples archivos debido a la conversión automática de saltos de línea (CRLF en Windows vs LF en Linux). Se solucionó incorporando `"endOfLine": "auto"` en `.prettierrc`, lo que permite que el linter y el flujo de integración continua en GitHub Actions (`ubuntu-latest`) verifiquen el código sin falsos positivos derivados del sistema operativo anfitrión.

### Problemas conceptuales

Uno de los conceptos que más costó asimilar fue el hashing asíncrono con la Web Crypto API (`crypto.subtle.digest`) en un entorno sin backend. Al principio resultaba contraintuitivo que calcular un resumen SHA-256 requiriera `async/await` y devolviera una promesa si no se estaba realizando ninguna petición de red. Al investigar la especificación, entendí que los navegadores modernos delegan las operaciones criptográficas complejas a hilos secundarios o aceleración por hardware para jamás bloquear el hilo principal (UI thread) de la interfaz de usuario. Por ello, funciones como `autenticarUsuario` o `registrarUsuario` deben ser asíncronas para esperar el cálculo del resumen criptográfico antes de persistir o comparar los datos.

Fragmento de [`js/clave.js`](../js/clave.js#L22-L26):
```javascript
export async function resumirClave(clave) {
  const bytes = new TextEncoder().encode(clave);
  const resumen = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(resumen)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
```

Otro concepto clave fue el desacoplamiento mediante eventos personalizados (`CustomEvent`). En implementaciones tradicionales suele caerse en el error de que un formulario llame directamente a una función que manipula el DOM de una caja de alertas específica, acoplando fuertemente la lógica de negocio con la presentación. Gracias al sistema de eventos propios, emitir un evento `aviso` con burbujeo (`bubbles: true`) permite que cualquier componente (el login, el registro, la barra de navegación o futuras vistas del CRUD) solicite mostrar un mensaje accesible sin conocer qué elemento del DOM lo capturará ni cómo se renderizará visualmente con las alertas de Bootstrap.

## 17/11/2026 · Sprint 2 · El CRUD, la zona de administración y la integración continua completa (v0.2)

### Dificultades y cómo las resolví

La primera dificultad técnica del Sprint 2 apareció con los campos condicionales en `js/ficha.js` al conmutar entre el formato **Físico** (`#bloque-fisico`) y **Digital** (`#bloque-digital`). Al principio bastaba con ocultar el bloque inactivo mediante `hidden = true`, pero enseguida comprobamos dos efectos indeseados: por un lado, `new FormData(formulario)` seguía incluyendo los valores de los campos ocultos si permanecían habilitados; por otro, si el usuario cometía un error de validación (por ejemplo, en el código EAN-13) y cambiaba a formato digital, el control conservaba la clase `.is-invalid`, el atributo `aria-invalid="true"` y el mensaje residual al volver a seleccionarlo. Lo resolví en `alternarSeccionFormato` deshabilitando tanto el `<fieldset>` como sus controles internos (`disabled = true`), limpiando `.is-invalid` / `.is-valid`, restableciendo `aria-invalid="false"` y vaciando el texto de la caja enlazada por `aria-describedby`. Además, `leerDatosFormulario` normaliza explícitamente a `null` los campos pertenecientes al formato no seleccionado.

La segunda dificultad surgió al probar el diálogo modal nativo `<dialog id="modal-borrar">` en los tests de integración con Happy-DOM. En navegadores modernos `modal.showModal()` abre el diálogo en el *top-layer*, bloquea el fondo con `::backdrop` y dispara el evento nativo `cancel` al pulsar `Escape`, todo ello sin usar el JavaScript de Bootstrap. Sin embargo, el entorno Happy-DOM de Vitest no implementaba por defecto los métodos `showModal()` ni `close()` sobre `HTMLDialogElement`. Lo resolví combinando dos medidas: en `conectarModalBorrado` (`js/listado.js`) envolví `showModal()` y `close()` en comprobaciones de existencia y bloques `try / catch` con respaldo sobre el atributo `open`, y en el `beforeEach` de `tests/integracion/listado.test.js` añadí un *polyfill* mínimo que gestiona el atributo `open`, permitiendo verificar tanto la cancelación como la confirmación de borrado sin alterar la lógica real de la página.

La tercera dificultad fue probar de forma determinista el buscador con *debounce* (`RETARDO_DEBOUNCE_DEFECTO = 300` ms) y normalización Unicode NFD en `js/buscador.js` y `js/listado.js`. Esperar 300 ms reales dentro de los tests ralentizaba la ejecución y podía producir fallos intermitentes en máquinas más lentas como los *runners* de GitHub Actions. Se solucionó activando temporizadores falsos con `vi.useFakeTimers()` en `tests/integracion/listado.test.js`: avanzamos primero `RETARDO_DEBOUNCE_DEFECTO - 1` ms para demostrar que la búsqueda aún no se dispara y luego `1` ms adicional para confirmar el filtrado (ignorando tildes y mayúsculas) y el reinicio automático a la página 1. También expusimos un método `.cancelar()` en `debounce` y restauramos `vi.useRealTimers()` en `afterEach` para evitar que ningún temporizador pendiente afectara a pruebas posteriores.

Por último, al redactar las pruebas de extremo a extremo en `e2e/crud.spec.js` usando selectores semánticos de Playwright (`getByRole`, `getByLabel`, `getByText`) en lugar de selectores CSS técnicos, quedaron al descubierto carencias reales de accesibilidad: los botones de editar y eliminar de cada tarjeta tenían textos genéricos idénticos y los campos clonados dinámicamente desde `<template id="tpl-dlc">` necesitaban identificadores únicos enlazados con `htmlFor`. Añadir `aria-label` específicos (`Editar ${juego.titulo}` y `Eliminar ${juego.titulo}`) en `renderizarTarjetaJuego` y generar IDs correlativos por fila en `anadirFilaDlc` hizo que la interfaz fuese usable tanto por lectores de pantalla como por los selectores semánticos de Playwright. También comprobamos que Playwright abre un contexto limpio en cada test, de modo que el almacenamiento empieza vacío y el primer usuario registrado en cada recorrido pasa a ser `administrador`.

### Problemas conceptuales

Un concepto clave que costó interiorizar fue por qué el evento `blur` necesita la **fase de captura** en el motor de formularios (`js/validacion.js`), mientras que la **delegación en fase de burbuja** funciona para botones y paginación. Según la especificación del DOM, `blur` es un evento que **no burbujea** (*non-bubbling*): llega al `<input>` que pierde el foco y termina ahí, sin ascender hacia `<form>`. Si registráramos `formulario.addEventListener('blur', alSalirCampo)` con la configuración por defecto (burbuja), el oyente jamás se enteraría al salir de un campo. Al pasar `true` como tercer parámetro (`useCapture = true`), el formulario intercepta el evento en el trayecto descendente antes de que alcance al control concreto, lo que permite validar con un único oyente incluso filas de DLC añadidas dinámicamente más tarde. En cambio, para acciones `click` sobre tarjetas, filas de usuarios, botones de quitar DLC o controles de paginación, el evento sí sube por el árbol DOM y basta con un único oyente en el contenedor padre usando `evento.target.closest(...)`.

Fragmento de [`js/ficha.js`](../js/ficha.js#L176-L192) donde el `<fieldset disabled>` y la limpieza de atributos de error evitan validaciones y envíos fantasma al cambiar de formato:

```javascript
  if (bloqueFisico) {
    bloqueFisico.hidden = !esFisico;
    bloqueFisico.disabled = !esFisico;
    const controlesFisicos = bloqueFisico.querySelectorAll('input, select, textarea');
    controlesFisicos.forEach((control) => {
      control.disabled = !esFisico;
      if (!esFisico) {
        control.classList.remove('is-invalid', 'is-valid');
        control.setAttribute('aria-invalid', 'false');
        const descId = control.getAttribute('aria-describedby');
        if (descId) {
          const cajaError = formulario.querySelector(`#${descId}`);
          if (cajaError) cajaError.textContent = '';
        }
      }
    });
  }
```

Otro problema conceptual fue delimitar correctamente la **pirámide de pruebas** (unitarias, integración y E2E) y entender cómo se refleja ese mismo escalonamiento en el pipeline de Integración Continua con `needs`. Las funciones lógicas puras sin DOM (`paginar`, `validarEAN13`, `normalizarTextoBusqueda`) deben probarse con tests unitarios rápidos y tablas `it.each`; los tests de integración cargan la estructura HTML real en Happy-DOM y conectan los módulos reales entre sí, sustituyendo únicamente la frontera externa (`AlmacenFalso`, funciones de navegación simuladas y temporizadores falsos); y las pruebas E2E levantan un navegador Chromium real con Playwright para comprobar persistencia tras `page.reload()`, redirecciones reales y modales `<dialog>`. De forma análoga, en `.github/workflows/ci.yml` cada trabajo depende del anterior mediante `needs`: primero `Calidad`, luego `Tests` (con cobertura) y por último `E2E` (`needs: tests`), evitando descargar Chromium y gastar minutos de ejecución si las comprobaciones más rápidas ya han fallado.

Fragmento de [`js/listado.js`](../js/listado.js#L292-L308) gestionando el cierre accesible del modal nativo `<dialog>` al pulsar el *backdrop* o mediante el evento `cancel` de la tecla `Escape`:

```javascript
  // Cierre al pulsar el backdrop nativo
  const manejadorClickBackdrop = (evento) => {
    if (evento.target === modal) {
      manejadorCancelar();
    }
  };

  // Evento nativo de cancelación (tecla Escape)
  const manejadorCancel = () => {
    idPendiente = null;
    if (typeof alCancelar === 'function') alCancelar();
  };

  if (btnCancelar) btnCancelar.addEventListener('click', manejadorCancelar);
  if (btnConfirmar) btnConfirmar.addEventListener('click', manejadorConfirmar);
  modal.addEventListener('click', manejadorClickBackdrop);
  modal.addEventListener('cancel', manejadorCancel);
```
