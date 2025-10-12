# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Development: WebSocket / Signaling configuration

If you run the frontend locally with `npm run dev`, the signaling client will
attempt to connect to the URL in `import.meta.env.VITE_WS_URL`. If that
variable is not set, the client will default to `window.location.origin`.

To explicitly point the frontend to a backend running on a different port,
set `VITE_WS_URL` in `.env` or `.env.local` (see `.env.example`). For example:

VITE_WS_URL=http://localhost:5000

This is only necessary when the frontend and backend are running on different
origins during development.
