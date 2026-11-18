# 🎮 Game Backlog

Tablero para ver mi backlog de juegos. Lee los datos desde una Google Sheet (pestaña **Backlog**) a través de un Apps Script.

**Estado de cada juego** (se deduce de las fechas):

| Fecha Inicio | Fecha Fin    | Estado      |
|--------------|--------------|-------------|
| vacía        | —            | Pendiente   |
| con fecha    | vacía        | En progreso |
| con fecha    | con fecha    | Completado  |
| con fecha    | "Abandonado" | Abandonado  |
| con fecha    | "Pausado"    | En pausa    |

**Carátulas:** se buscan solas en Wikipedia y se guardan en el navegador. Si alguna sale mal o no aparece, agregá una columna **Portada** en la planilla con la URL (https) de la imagen que quieras para ese juego.

**Agregar juegos** (con edición activa): el buscador autocompleta nombre y carátula desde Wikipedia (sin claves ni cuentas). Elegís la consola, el time to beat (hay un link a HowLongToBeat para consultarlo) y en qué lugar de la cola de pendientes va. Si la planilla tiene la columna **Portada**, la carátula elegida queda guardada ahí.

## Configurar Apps Script (una sola vez)

1. En la planilla: **Extensiones → Apps Script**.
2. Borrá el contenido de `Código.gs` y pegá [`apps-script/Code.gs`](apps-script/Code.gs). Guardá.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
4. Autorizá los permisos. Gracias a `@OnlyCurrentDoc`, Google solo pide acceso a **esta planilla**.
5. Copiá la URL que termina en `/exec`.

6. **Token para editar:** en el editor, elegí la función `setupToken` en el selector de arriba y tocá **Ejecutar**. En el *Registro de ejecución* aparece el token: copialo y pegalo en el sitio (botón **🔒 Editar**). Para rotarlo, ejecutá `setupToken` de nuevo (el anterior deja de funcionar).

### Seguridad

- El token vive solo en las *Propiedades del script* y en el navegador donde lo pegaste. Nunca en el repo.
- `@OnlyCurrentDoc`: el script solo puede tocar esta planilla.
- Sin token, la API solo permite leer. Las acciones de escritura son pocas y validadas (`start`, `complete` y sus "deshacer"), escriben solo fechas y verifican el estado actual del juego.

> Si después cambiás el código, usá **Implementar → Administrar implementaciones → Editar → Nueva versión** para que la URL siga siendo la misma.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y pegá la URL /exec en VITE_API_URL
npm run dev
```

Sin `VITE_API_URL` el sitio muestra datos de ejemplo.

## Publicar en GitHub Pages

1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables → New variable**: `API_URL` = la URL `/exec`.
3. Cada push a `main` publica el sitio en `https://fjontiveros.github.io/game_backlog/`.
