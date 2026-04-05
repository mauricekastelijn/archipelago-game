# Phaser Game Template

A free, web-first starter template for 2D games that run on desktop and mobile browsers, deploy easily, and can later be wrapped for desktop and mobile app stores.

**[Live demo on GitHub Pages](https://mauricekastelijn.github.io/phaser-game-template/)**

This repository is designed to be reused as a template for multiple games.

## Why this stack

This template uses:

- **TypeScript** for maintainable code and safer refactors.
- **Phaser** for a fast open-source HTML5 game framework with WebGL and Canvas rendering across desktop and mobile browsers ([official site](https://phaser.io/)).
- **Vite** for fast local development and static production builds that are suitable for static hosting ([guide](https://vite.dev/guide/)).
- **GitHub Pages** for free, zero-backend deployment of the built web game.
- **Optional PWA** support so the game can feel more app-like in the browser.
- **Optional Capacitor** later if you want native mobile app packaging from the same web codebase. Capacitor supports web, PWA, iOS, and Android workflows ([docs](https://capacitorjs.com/docs/)).
- **Optional Tauri** later if you want desktop binaries, while keeping the same frontend stack. Tauri 2 supports Linux, macOS, Windows, Android, and iOS from a web frontend ([docs](https://v2.tauri.app/)).

## What this template gives you

- A clean Phaser + TypeScript + Vite structure
- Mobile-friendly scaling
- Scene-based architecture
- Small reusable systems for settings, input, and save data
- A very simple playable starter scene
- GitHub Actions deployment to GitHub Pages
- Clear folder boundaries so you can clone this repo for future games

## Architecture overview

```text
src/
  config/      # Constants and game config
  core/        # Bootstrap and global setup
  scenes/      # Phaser scenes
  systems/     # Cross-scene services: settings, save, etc.
  types/       # Shared TypeScript types
  ui/          # Reusable UI game objects and controls
  utils/       # Pure helpers
```

## Quick start

### 1. Create repo from template

Use this repository as a GitHub template or copy it into a new repo.

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm run dev
```

### 4. Build production version

```bash
npm run build
```

### 5. Preview the production build

```bash
npm run preview
```

## Dev container

This repo includes a dev container in `.devcontainer/devcontainer.json` with the tools needed for the current workflow:

- Node 22 for Vite 7 and TypeScript
- npm for install, build, lint, and preview scripts
- GitHub CLI for repository and deployment-related commands
- Vitest support in VS Code via the Vitest extension

When you open the repo in the container, dependencies are installed automatically with `npm ci`.

After the container starts, common commands are:

```bash
npm run dev
npm test
npm run test:watch
npm run typecheck
npm run lint
npm run build
npm run preview
```

## How to rebrand this for a new game

Change these first:

- `package.json` name
- `src/config/app.ts`
- `vite.config.ts` base path if publishing on GitHub Pages under a repo path
- `public/manifest.webmanifest` while keeping `start_url` and icon paths relative if you deploy under a repo path
- title and meta tags in `index.html`
- replace the placeholder assets in `public/assets`

## GitHub Pages deployment

This template includes a GitHub Actions workflow that deploys the Vite `dist/` folder to GitHub Pages.

### Required repo setting

In your GitHub repo:

- Go to **Settings → Pages**
- Set **Source** to **GitHub Actions**

### Base path note

If your Pages site is published under:

- `https://<user>.github.io/<repo>/`

then `vite.config.ts` should use:

```ts
base: '/<repo>/'
```

The web manifest in `public/manifest.webmanifest` uses relative URLs on purpose so installed app metadata still resolves correctly when the site is hosted under a repo subpath.

If you publish from a custom domain or root domain, use `/` instead.

## Development philosophy

### Phase 1 — fast web games

Goal:

- build and share games quickly
- optimize for browser play on desktop and mobile
- keep hosting trivial

Build only:

- responsive layout
- touch + keyboard input
- local save data
- clean scene flow
- lightweight art pipeline

### Phase 2 — polish and retention

Add:

- audio manager
- real preload scene with sprite atlases and sound
- options menu
- achievements
- level select
- analytics only if you truly need it
- better UI components

### Phase 3 — packaging and monetization paths

Possible future extensions:

- **PWA installability** for browser-based distribution
- **Capacitor** for Android/iOS packaging from the same web app flow. Capacitor’s workflow is build the web app, sync the web assets into the native project, then compile the native binary ([workflow](https://capacitorjs.com/docs/basics/workflow/)).
- **Tauri** for desktop builds if you want small native binaries with your web frontend. Tauri uses config files such as `tauri.conf.json` and can bundle extra resources when needed ([configuration](https://v2.tauri.app/reference/config/), [resources](https://v2.tauri.app/develop/resources/)).
- backend services later for leaderboards, accounts, multiplayer, cloud saves, or DLC
- monetization later through premium web access, app stores, donations, sponsorships, or ads

## Why not start with native-only engines?

For your goals, web-first wins early:

- easiest deployment
- easiest sharing
- fastest iteration loop
- one codebase for desktop and mobile browsers
- lowest friction for testing with friends

You can still branch into native wrappers later without throwing away the codebase.

## Performance principles for fluent graphics

Great-feeling graphics are not just about the framework. They depend heavily on asset discipline and runtime discipline:

- target 60 FPS on mid-range phones
- keep texture sizes sensible
- use texture atlases for many sprites
- prefer tweening, particles, camera motion, and subtle juice over huge raw assets
- minimize unnecessary allocations in the update loop
- pause off-screen work when possible
- preload assets cleanly

## Suggested free tools around this template

- **VS Code**
- **GitHub**
- **Aseprite alternatives:** LibreSprite or Piskel
- **Vector art:** Inkscape
- **Image editing:** GIMP or Krita
- **Audio editing:** Audacity
- **Sound effects:** generate or source from free/open libraries with compatible licenses
- **Texture packing:** free atlas tools if your project grows

## Suggested workflow for multiple games

1. Keep this repo as a master template.
2. Create one repo per game.
3. Keep custom game logic in `src/scenes` and `src/ui`.
4. Keep reusable patterns here and copy improvements back into your template repo.
5. Only add native packaging after the web version is fun.

## NPM scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run preview    # preview production build locally
npm test           # run unit tests once
npm run test:watch # run unit tests in watch mode
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
```

## Future extension checklist

### Good next additions

- sprite atlas pipeline
- sound manager
- richer input remapping
- gamepad support
- level loader from JSON
- localization
- achievements
- simple debug overlay
- screenshot capture
- replay / ghost data

### Add only when needed

- backend auth
- multiplayer
- commerce / IAP
- ads
- server-side progression

## License

This template is released under the [MIT License](LICENSE). When you create a new game from this template, replace the LICENSE file and this section with your own license choice.
