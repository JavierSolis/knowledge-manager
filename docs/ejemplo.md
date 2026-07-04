# Tutorial con ejemplo-skills

Este tutorial usa el repositorio `ejemplo-skills` incluido en el proyecto.

## Prerrequisitos

- Node.js >= 22
- El proyecto clonado

## Pasos

### 1. Inicializar

```bash
cd ruta/de/tu/proyecto
npx skill-manager init
```

Cuando pida la ruta del repositorio, ingresar:

```
./ejemplo-skills/catalog/skills
```

Seleccionar `claude` como AI client.

### 2. Buscar skills

```bash
skill-manager search
```

Ingresar "android" para buscar skills relacionados.

### 3. Instalar

Seleccionar `base-android` de la lista y confirmar.

### 4. Verificar

Los archivos se copiaron a `.claude/skills/base-android/`.

### 5. Listar instalados

```bash
skill-manager list
```
