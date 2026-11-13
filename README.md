# Orquestador Documental Inteligente · Banco Integral

MVP frontend (SPA) para la licitación del **Orquestador Documental Inteligente para el Expediente del Cliente** de Banco Integral. Construido con React + Vite + TypeScript + Tailwind CSS, con persistencia realista en `localStorage` y datos demo de El Salvador.

## Módulos

1. **Checklist Documental Dinámico** — reglas por tipo de persona, producto, riesgo PLAFT, proceso y garantía. Reutilización inteligente de documentos vigentes en OnBase y **Configurador No-Code** de vigencias.
2. **Expediente Digital** — semáforo global, validez legal vs. interna, previsualización, historial de versiones y comparador lado a lado. Acciones inteligentes: actualizar un solo documento o emitir Declaración de Vigencia.
3. **Captura e Integración IA** — drag & drop de archivos reales, lote histórico simulado, stepper de clasificación → extracción Document AI → validación/cruce Bantotal → indexación o escalamiento.
4. **Cola de Revisión Humana** — aprobación/rechazo con retroalimentación al modelo, actualización en tiempo real del expediente.
5. **Dashboard de Métricas IA** — aprobación automática, escalamientos, tiempo de validación, top errores y actividad.

Abre un cliente desde la **Cartera de clientes** para entrar a su expediente y recorrer las cinco etapas del ciclo de vida (Checklist, Captura, Validación IA, Revisión y Expediente vigente). El **rol** se cambia discretamente desde el perfil de la barra superior y restringe acciones (configurar reglas, aprobar en cola, emitir declaraciones).

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

El proyecto usa `base: './'` en `vite.config.ts`, por lo que `dist/` puede publicarse en cualquier subruta.

## Despliegue en GitHub Pages

1. Sube el repositorio a GitHub.
2. En **Settings → Pages → Build and deployment**, selecciona **GitHub Actions**.
3. Haz push a `main`. El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y publica automáticamente.

Los datos demo se restauran desde el botón discreto del pie de página. Todo el estado (documentos, cola, reglas, métricas) vive en el navegador.

---

Demo Frontend MVP · Datos simulados con fines de demostración. No representa información real de clientes ni del Banco.
