# PLAN · Web de presentación del Mapa Vivo de Avilés

## 1. Lectura del encargo (10 líneas)

1. Web estática de micro-marketing para presentar el **Mapa Vivo de Avilés** en Hackea Avilés 2026.
2. Dos públicos: habitantes (contado desde Sara, usuaria tipo) y el Ayuntamiento (piloto serio y medible).
3. La pieza central es **la demo**: una maqueta 3D del casco y la ría con tres vistas (2D, 3D orbital, primera persona).
4. La gente se representa como concentraciones que cambian a lo largo de un sábado de Antroxu (16:00–22:00).
5. Un **reloj compartido** sincroniza la maqueta, el panel municipal y la bandeja de alertas.
6. Diferencial que debe entenderse en 5 s: «ver cuánta gente hay antes de ir», cosa que Google Maps no hace.
7. Hay que desactivar el miedo a la vigilancia (5 promesas de privacidad, pronto y grandes) y el «al principio estará vacío» (estimado → medido).
8. Honestidad: es un prototipo, todos los datos son de ejemplo, sin escudos ni identidad corporativa, aviso de «no oficial» en el pie.
9. Stack sin compilación: HTML + CSS + JS con módulos ES, solo Three.js 0.160.0 en local, sin cookies ni analítica.
10. Accesible (WCAG 2.1 AA), móvil primero, funciona sin internet y con plan B en SVG si no hay WebGL.

## 2. Árbol de archivos

```
/index.html
/assets/css/styles.css
/assets/js/main.js            arranque, navegación, scroll, formulario, mini-animaciones
/assets/js/data.js            carga de JSON, reloj compartido (pub/sub), niveles
/assets/js/panel.js           panel municipal simulado (mapa, previsión, hot spots, alertas)
/assets/js/fallback2d.js      plan B sin WebGL (mapa SVG con los mismos datos)
/assets/js/scene/viewer.js    orquestador del visor: renderer, bucle, modos, API pública
/assets/js/scene/maqueta.js   maqueta procedural (ría, Niemeyer, plazas, Galiana, parques…)
/assets/js/scene/layout.js    trazado compartido de la maqueta (zonas, calles, obstáculos) — lo usan 3D y SVG
/assets/js/scene/camaras.js   cámaras 2D / 3D / primera persona y transiciones
/assets/js/scene/gente.js     celdas hexagonales + partículas instanciadas
/assets/js/scene/marcadores.js marcadores flotantes y raycasting
/assets/vendor/three/         three.module.min.js + OrbitControls + BufferGeometryUtils
/assets/fonts/                Archivo, Atkinson Hyperlegible, JetBrains Mono (woff2 + OFL)
/assets/img/                  favicon.svg, og-image.png
/data/lugares.json  eventos.json  afluencia.json  alertas.json
/capturas/                    capturas de verificación
/tools/                       scripts de validación de datos y capturas (no se sirven)
/README.md  /PLAN.md
```

## 3. Decisiones de diseño

**Concepto: «La maqueta viva».** Maqueta de cartón pluma color hueso iluminada desde dentro por la gente. Motivo gráfico: el hexágono.

**Paleta final** (tokens en `:root`):

| Token | Valor | Nota |
|---|---|---|
| `--ria` | #0E3B43 | fondos profundos, sección del Ayuntamiento |
| `--hueso` | #F3EFE6 | fondo claro, edificios |
| `--tinta` | #14211F | texto |
| `--vivo` | #F2C833 | único acento de marca (nunca como texto sobre hueso: no da contraste) |
| `--tranquilo` | #1F7A52 sobre claro · #4CC38A sobre oscuro | oscurecido/aclarado para AA |
| `--animado` | #A85A0F sobre claro · #F0A04B sobre oscuro | |
| `--lleno` | #B8322E sobre claro · #FF7A72 sobre oscuro | |
| `--vigilancia` / `--critico` | #D64541 / #7B1E3A (+ variantes claras para texto sobre ría) | solo panel |

Los colores originales (#2E9E6B, #E8892B, #D64541) se mantienen como **relleno** de celdas y barras (donde el contraste exigido es 3:1 para objetos gráficos) y se usan las variantes ajustadas para texto. Cada nivel lleva siempre etiqueta + icono de 1, 2 o 3 barras.

**Tipografía:** Archivo 700/800 (display), Atkinson Hyperlegible 400/700 (texto), JetBrains Mono 400/600 (datos). Escala fija: 14 · 16 · 20 · 28 · 40 · 64 · 96 px (con `clamp` solo entre peldaños de la escala).

**Ambientes:** parte ciudadana en hueso cálido; al llegar a «Para el Ayuntamiento» el `body` cambia de fondo a azul ría con transición ligada al scroll (clase en `<body>` vía IntersectionObserver). La sección municipal es siempre oscura.

**Modo oscuro:** la parte ciudadana pasa a un «hueso nocturno» (#121A19 con tinta #EDE8DD) y la maqueta mantiene sus materiales, con luz más baja.

## 4. Enfoque 3D

- **Una sola escena** Three.js con la maqueta procedural (opción A). La opción B (OSM vía Overpass) se intentó en la fase 1: los dos servidores públicos respondieron «at capacity» (502). Se documenta y se deja la maqueta procedural, que además garantiza que los lugares, las calles y las colisiones encajan con los datos de ejemplo.
- **Escala:** 1 unidad = 1 m aproximado. Escena de ~900 × 700 m. Hexágonos de 60 m de lado → zonas de la demo.
- **Tres cámaras:** `OrthographicCamera` cenital (2D), `PerspectiveCamera` orbital con OrbitControls limitados (3D) y la misma perspectiva a 1,7 m con controles propios (WASD/flechas, arrastrar para mirar, toca el suelo para ir, colisión con cajas de los edificios). Transiciones de 1 s con *easeInOutCubic* que interpolan posición, objetivo y FOV; el paso orto↔perspectiva se hace con un fundido corto del canvas.
- **Gente:** `InstancedMesh` de esferas emisivas (3D/2D) y cápsulas de baja poligonización (primera persona). Cada zona tiene un número objetivo de instancias proporcional a su densidad interpolada; las instancias deambulan con ruido y en Galiana fluyen cuesta abajo durante el Descenso. Límite 2.500 (escritorio) / 900 (móvil), ajustado por FPS medidos.
- **Celdas:** hexágonos planos por zona con color de nivel y borde continuo (medido) o discontinuo (estimado, `LineDashedMaterial`). En 3D, además, una columna hexagonal translúcida cuya altura sigue la densidad.
- **Interacción:** raycasting sobre edificios-lugar y marcadores (sprites de tamaño constante con icono por categoría). Lista HTML de lugares que abre las mismas fichas.
- **Rendimiento:** geometría estática fusionada por material, árboles instanciados, DPR ≤ 2 (1,5 en móvil), pausa por IntersectionObserver y `visibilitychange`, sombras solo en escritorio.
- **Plan B:** sin WebGL, `fallback2d.js` dibuja la misma maqueta en SVG (mismo `layout.js`) con las zonas coloreadas y sincronizadas con el reloj.

## 5. Riesgos y cómo los resuelvo

| Riesgo | Solución |
|---|---|
| Overpass caído / sin red | Opción A procedural (ya decidida) |
| `file://` rompe módulos y `fetch` | README con `python -m http.server`; aviso visible en la página si `fetch` falla |
| Rendimiento en móvil | límite de instancias, DPR 1,5, sin sombras, pausa fuera de pantalla, ajuste dinámico por FPS |
| Contraste del amarillo `--vivo` | solo como fondo de botones con texto tinta (13:1) y como detalle gráfico, nunca como texto sobre claro |
| Accesibilidad del canvas | lista de lugares en HTML, `aria-live` con resumen por zona y hora, controles nativos (`button`, `input type=range`) |
| Parecer web oficial | sin escudo ni colores corporativos; aviso de «no oficial» en pie y tono de propuesta («así funcionará») |
| Datos inventados que parezcan reales | `ejemplo: true` en todos los JSON y etiqueta «Datos de ejemplo de un sábado de Antroxu» junto a cada visualización |
| Historias de monumentos inexactas | solo hechos generales y prudentes; textos marcados como ejemplo |
| Capturas sin Playwright instalado | `playwright-core` en una carpeta temporal usando Microsoft Edge del sistema (sin descargar navegadores) |
