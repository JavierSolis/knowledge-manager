---
name: capacitor-mixed-content
description: >
  Solución para Mixed Content (HTTPS/HTTP) en Capacitor WebView Android.
  Usar cuando: mixed content, imagen no carga Android, HTTP desde HTTPS, contenido mixto,
  VueHostActivity, CapConfig, setAllowMixedContent, setAndroidScheme, https localhost,
  WebView blocking resources, imagen rota en dispositivo.
license: Apache-2.0
metadata:
  author: r4-team
  version: "1.0"
---

## When to Use

- Imagen externa HTTP no carga en la app Android pero sí en Chrome
- Error en Logcat: `Mixed Content: The page was loaded over HTTPS, but requested an insecure resource`
- Recursos HTTP bloqueados desde contexto `https://localhost` o `capacitor://localhost`
- API HTTP funciona pero `<img>` tags HTTP no cargan

## Root Cause

Capacitor WebView carga la app desde `https://localhost` por defecto (a partir de Capacitor 6+). 
Esto bloquea recursos HTTP por política de Mixed Content del navegador.

## Critical Pattern

**El archivo `capacitor.config.ts` NO ES LEÍDO si usás un `CapConfig.Builder` custom en Android.**

Si tu `VueHostActivity.kt` (o cualquier Activity que extienda `BridgeActivity`) usa:

```kotlin
config = CapConfig.Builder(this)
    .setStartPath(startPath)
    .create()
```

Entonces **debés agregar las opciones directamente en el builder**, no en `capacitor.config.ts`.

## Solution

### En VueHostActivity.kt (o tu BridgeActivity custom)

```kotlin
config = CapConfig.Builder(this)
    .setStartPath(startPath)
    // Permite cargar recursos HTTP desde HTTPS (mixed content)
    .setAllowMixedContent(true)
    // Cambia el scheme a HTTP para evitar mixed content
    .setAndroidScheme("http")
    .create()
```

### Opcional: En capacitor.config.ts (si NO usás CapConfig.Builder custom)

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  },
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
```

## Verification

1. Ejecutar `npm run android:sync`
2. Recompilar en Android Studio (Run → Run 'app')
3. Verificar que el error de Mixed Content desaparece del Logcat
4. La imagen HTTP debe cargar correctamente

## Security Warning

> [!WARNING]
> Esta solución reduce la seguridad del WebView al permitir contenido HTTP.
> **Solo para desarrollo.** En producción, usar HTTPS para todos los recursos.

## Resources

- **Documentación interna**: [doc/specs/integration_platform/notes.md](../../../doc/specs/integration_platform/notes.md)
- **VueHostActivity**: [VueHostActivity.kt](../../../android/app/src/main/java/com/r4/renta4/hibrid/VueHostActivity.kt)
