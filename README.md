# Minecraft TikTok Bridge - Frontend

Panel web en React + Vite para editar overlays, administrar acciones y previsualizar overlays públicos para OBS.

## Repos relacionados

- Frontend: [Minecraft-TikTok-Bridge-Using-Rcon-Frontend](https://github.com/RADD95/Minecraft-TikTok-Bridge-Using-Rcon-Frontend)
- Backend: [Minecraft-TikTok-Bridge-Using-Rcon-Backend](https://github.com/RADD95/Minecraft-TikTok-Bridge-Using-Rcon-Backend)

## Qué incluye

- Dashboard principal.
- Gestión de configuración.
- Gestión de acciones.
- Gestión de overlays.
- Editor visual de overlays.
- Vista pública de overlay en `/overlay/:id` para OBS.

## Requisitos

- Node.js 18+ recomendado.
- Backend corriendo para responder a `/api/*`.

## Instalación

```bash
npm install
```

## Variables de entorno

Este repo incluye un archivo de ejemplo:

- `.env.example`

Para desarrollo local:

```bash
cp .env.example .env
```

Variables usadas:

- `VITE_API_BASE_URL`: URL pública del backend. Si está vacía, usa rutas relativas.
- `VITE_DEV_API_PROXY_TARGET`: backend objetivo del proxy de Vite en desarrollo.

Valores recomendados:

- Local: `VITE_API_BASE_URL=` y `VITE_DEV_API_PROXY_TARGET=http://localhost:4567`
- Producción (Vercel): `VITE_API_BASE_URL=https://verce.com`

## Desarrollo

```bash
npm run dev
```

Por defecto el frontend corre en:

- `http://localhost:5173`

En desarrollo, Vite proxy apunta al backend en `http://localhost:4567`.

## Build

```bash
npm run build
```

## Vista pública del overlay

La ruta pública del overlay es:

- `http://localhost:5173/overlay/:id`

Esa vista está pensada para usarse como fuente de navegador en OBS.

## Conexión con el backend

Este frontend consume la API del backend por rutas `/api/*`.
En desarrollo, el proxy Vite resuelve eso automáticamente.

Si despliegas frontend y backend separados, debes asegurarte de que el frontend pueda alcanzar el backend por la URL correcta en producción.

En Vercel define al menos:

- `VITE_API_BASE_URL=https://mc.cholate.online`

## Nota

Este repos no contiene la lógica de RCON, TikTok LIVE ni persistencia. Esa parte vive en el repositorio del backend.
