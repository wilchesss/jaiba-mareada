# Guía de configuración — La Jaiba Mareada

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea una cuenta o inicia sesión.
2. Clic en **New Project**. Elige un nombre (ej. `jaiba-mareada`), una contraseña segura para la base de datos, y la región más cercana (recomendado: `us-west-1` o `us-east-1` según dónde esté hospedado tu tráfico).
3. Espera 1-2 minutos a que se aprovisione el proyecto.

## 2. Ejecutar el esquema de base de datos

1. En el panel de Supabase, ve a **SQL Editor** → **New query**.
2. Copia y pega **todo** el contenido del archivo `supabase/schema.sql` incluido en este proyecto.
3. Clic en **Run**. Deberías ver "Success. No rows returned".
4. Verifica en **Table Editor** que aparezcan las tablas `reservaciones`, `pagos` y `dias_cerrados`.

## 3. Crear el usuario administrador (Luis)

1. Ve a **Authentication** → **Users** → **Add user** → **Create new user**.
2. Ingresa el correo y una contraseña para Luis.
3. Marca la casilla **Auto Confirm User** para que no necesite verificar por email.
4. Clic en **Create user**.

## 4. Obtener las credenciales del proyecto

1. Ve a **Project Settings** (ícono de engrane) → **API**.
2. Copia el **Project URL** y la clave **anon public**.
3. Abre el archivo `js/supabase-client.js` de este proyecto y reemplaza:
   ```js
   const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
   const SUPABASE_ANON_KEY = 'TU-ANON-KEY-AQUI';
   ```
   con tus valores reales.

## 5. Reemplazar el logo (cuando me lo envíes)

En cuanto me compartas el logo, yo genero y te entrego los 4 archivos de ícono ya listos:
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-maskable-192.png` (con márgenes de seguridad para Android)
- `icons/icon-maskable-512.png`

Solo reemplaza los archivos actuales (son un marcador temporal con las iniciales "JM") por los definitivos — no hay que tocar código.

## 6. Desplegar en Netlify

**Opción A — Arrastrar y soltar (más rápida):**
1. Entra a https://app.netlify.com y crea una cuenta o inicia sesión.
2. En el dashboard, busca la zona que dice "Drag and drop your site output folder here".
3. Arrastra la carpeta completa del proyecto (`jaiba-mareada/`).
4. Netlify la publica en segundos y te da una URL tipo `https://algo-random.netlify.app`.
5. Opcional: en **Site settings** → **Change site name**, ponle un nombre más memorable (ej. `jaiba-mareada.netlify.app`).

**Opción B — Desde GitHub (recomendada si vas a seguir haciendo cambios):**
1. Sube la carpeta del proyecto a un repositorio de GitHub.
2. En Netlify, clic en **Add new site** → **Import an existing project** → conecta GitHub y selecciona el repositorio.
3. Deja los campos de build vacíos (no hay proceso de compilación, son archivos estáticos) y confirma.
4. Cada vez que subas cambios al repositorio, Netlify vuelve a publicar automáticamente.

## 7. Instalar la app en el teléfono de Luis

1. Abre la URL de Netlify en Chrome (Android) o Safari (iPhone).
2. Inicia sesión con el correo y contraseña creados en el paso 3.
3. **Android (Chrome):** aparecerá un banner o menú (⋮) → "Agregar a pantalla de inicio" / "Instalar app".
4. **iPhone (Safari):** botón de compartir (□↑) → "Agregar a pantalla de inicio".
5. Listo — el ícono con el logo de La Jaiba Mareada quedará en el teléfono como una app normal.

## 8. Configurar el dominio (opcional)

Si tienes un dominio propio (ej. `jaibamareada.com`), en Netlify ve a **Domain settings** → **Add a domain** y sigue las instrucciones para apuntar tus DNS.

---

### ¿Algo no funciona?

- **"Correo o contraseña incorrectos" al hacer login:** confirma que el usuario esté creado en Supabase con "Auto Confirm User" marcado.
- **El calendario no carga datos:** revisa que `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `js/supabase-client.js` sean correctos y que el esquema SQL se haya ejecutado sin errores.
- **Error al guardar un pago o reservación:** el sistema bloquea a propósito pagos que excedan el saldo pendiente y fechas duplicadas — el mensaje de error te dirá cuál regla se activó.
