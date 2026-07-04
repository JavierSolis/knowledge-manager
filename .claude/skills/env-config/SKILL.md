---
name: env-config
description: >
  Gestión de variables de entorno y URLs en el stack Vue + Capacitor Android.
  Usar cuando: agregar variable de entorno, cambiar URL, nueva env var, VITE_,
  import.meta.env, BuildConfig, AndroidEnv, build.gradle, env.ts, configurar URL,
  cambiar endpoint, nueva URL de API, productFlavor, dev prod flavor.
license: Apache-2.0
metadata:
  author: r4-team
  version: "1.0"
---

## Arquitectura de config (leer antes de tocar cualquier URL o env var)

Las variables de entorno tienen DOS capas. Tocar solo una no alcanza.

```
build.gradle.kts          ← Fuente para Android (por flavor: dev / prod)
       ↓
VueHostActivity.kt        ← Inyecta BuildConfig → window.AndroidEnv (JSON sincrónico)
       ↓
src/config/env.ts         ← Única fuente de verdad para Vue
       ↓
archivos que consumen     ← Siempre importan desde env.ts, NUNCA import.meta.env directo
```

**Para web** (sin Android): el `env.ts` hace fallback a `import.meta.env.VITE_*` automáticamente → el `.env` local sigue funcionando sin cambios.

---

## Archivos clave

| Archivo | Qué hace |
|---------|----------|
| `src/config/env.ts` | Única fuente de verdad. Leer `window.AndroidEnv` o fallback a Vite |
| `apps/r4-android/app/build.gradle.kts` | Define valores por flavor (`dev` / `prod`) |
| `apps/r4-android/.../hibrid/VueHostActivity.kt` | Registra `AndroidEnv` via `addJavascriptInterface` |
| `.env` (raíz r4-vue, NO commitear) | Valores para desarrollo web local |

---

## Agregar una nueva variable de entorno

### 1. `src/config/env.ts`

```ts
export const env = {
  // ... existentes ...
  VITE_NUEVA_VAR: _android.VITE_NUEVA_VAR ?? import.meta.env.VITE_NUEVA_VAR ?? "",
} as const;
```

### 2. `build.gradle.kts` — agregar en AMBOS flavors

```kotlin
create("dev") {
  // ... existentes ...
  buildConfigField("String", "NUEVA_VAR", "\"valor-dev\"")
}
create("prod") {
  // ... existentes ...
  buildConfigField("String", "NUEVA_VAR", "\"valor-prod\"")
}
```

### 3. `VueHostActivity.kt` — agregar al JSON

```kotlin
bridge?.webView?.addJavascriptInterface(object {
    @JavascriptInterface
    fun getConfig(): String = JSONObject().apply {
        // ... existentes ...
        put("VITE_NUEVA_VAR", BuildConfig.NUEVA_VAR)  // ← agregar
    }.toString()
}, "AndroidEnv")
```

### 4. `.env` (desarrollo web local)

```
VITE_NUEVA_VAR=valor-local
```

### 5. Consumir en Vue

```ts
import { env } from "@/config/env";

const miValor = env.VITE_NUEVA_VAR;
```

---

## Cambiar una URL existente

Solo tocar `build.gradle.kts` — en los `buildConfigField` del flavor correspondiente.
No tocar `env.ts` ni `VueHostActivity.kt` a menos que sea una variable nueva.

---

## Reglas críticas

- **NUNCA** usar `import.meta.env.VITE_*` directamente en archivos de la app para URLs o configs dinámicas — siempre `env.*` de `src/config/env.ts`
- `import.meta.env.DEV`, `import.meta.env.MODE`, `import.meta.env.VITEST` **sí se usan directo** — son meta-variables de Vite, no configs de negocio
- Los nombres en `buildConfigField` NO llevan prefijo `VITE_` (ej: `"API_URL"`, no `"VITE_API_URL"`). La conversión la hace `VueHostActivity` al armar el JSON
- `addJavascriptInterface` debe estar dentro de `bridge?.webView?.post {}` — el WebView tiene que estar inicializado
- `@JavascriptInterface` es obligatorio en cada método expuesto a JS (sin esto, Android 4.2+ ignora el método)

---

## Variables existentes

| Nombre en env.ts | BuildConfig (Android) | Descripción |
|------------------|-----------------------|-------------|
| `VITE_API_URL` | `API_URL` | API REST principal |
| `VITE_AUTH_API_URL` | `AUTH_API_URL` | API de autenticación |
| `VITE_API_WS` | `API_WS` | WebSocket / STOMP |
| `VITE_CODE_MARKET_GLOBAL` | `CODE_MARKET_GLOBAL` | Código de mercado (ej: BVL) |
| `VITE_SALDO_CONTABLE` | `SALDO_CONTABLE` | Texto tooltip Saldo Contable |

---

## Resources

- **env.ts**: `src/config/env.ts`
- **build.gradle**: `apps/r4-android/app/build.gradle.kts`
- **VueHostActivity**: `apps/r4-android/app/src/main/java/com/r4/renta4/hibrid/VueHostActivity.kt`
