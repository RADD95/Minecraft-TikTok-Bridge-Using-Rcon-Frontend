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

## Nota

Este repos no contiene la lógica de RCON, TikTok LIVE ni persistencia. Esa parte vive en el repositorio del backend.
