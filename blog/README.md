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
