# Archipelago — Build Specification

## 1. Product Overview

**Archipelago** is a grid-based puzzle game where players build bridges between islands belonging to colored factions. Each faction's islands must form their own connected network. Bridges of different factions cannot cross each other. The game launches with 75 hand-crafted or AI-generated levels across 5 themed worlds of increasing difficulty.

Target audience: ages 6+ through adult.
Platforms: mobile and desktop web browsers (touch, mouse, keyboard).
Engine: Phaser 3, TypeScript, Vite.
Art format: SVG (static assets) + Lottie (animations).
Audio: chiptune music + SFX.

---

## 2. Core Game Rules

### 2.1 Grid & Islands
- Rectangular grid from 5×5 (easiest) to 9×9 (hardest).
- Islands are fixed cells on the grid, each assigned:
  - A **faction** (1 of up to 4 factions, color-coded).
  - A **degree number** (1–8): how many bridge connections must attach to this island.

### 2.2 Bridges
- A bridge connects two islands of the **same faction** that share the same row or column with no other island between them.
- Each link between two islands supports **0, 1, or 2 bridges** (single or double).
- Bridges are straight horizontal or vertical lines occupying the cells between the two connected islands.

### 2.3 Constraints
1. **Degree satisfaction:** the total number of bridges attached to each island must equal its degree number.
2. **Faction connectivity:** all islands of the same faction must be reachable from each other through bridges of that faction (one connected component per faction).
3. **No cross-faction crossing:** bridges of different factions may not cross each other. (Same-faction bridges sharing a crossing point is not possible since same-faction bridges connect same-faction islands and thus don't geometrically cross.)

### 2.4 Win condition
All three constraints satisfied simultaneously. Every island fully connected, every faction internally connected, no illegal crossings.

---

## 3. Level Design

### 3.1 Worlds

| World | Theme | Grid sizes | Factions | Key mechanic introduced |
|-------|-------|-----------|----------|------------------------|
| 1. Coral Shores | Ocean / tropical islands | 5×5 – 6×6 | 1–2 | Basic bridge building, degree counting |
| 2. Emerald Canopy | Forest / trees and moss | 6×6 – 7×7 | 2 | Double bridges, tighter degree constraints |
| 3. Granite Peaks | Mountain / stone and snow | 7×7 – 8×8 | 2–3 | Three factions, territorial blocking |
| 4. Molten Caldera | Volcano / lava and obsidian | 7×7 – 8×8 | 3–4 | Four factions, cross-faction blocking |
| 5. Nimbus Heights | Sky / clouds and auroras | 8×8 – 9×9 | 3–4 | Expert-level constraint density |

### 3.2 Levels per world
15 levels per world, 75 total.

### 3.3 Difficulty progression within a world
- Levels 1–5: introductory, most bridges are forced by degree counting alone.
- Levels 6–10: intermediate, connectivity reasoning needed.
- Levels 11–15: advanced, cross-faction blocking is the deciding constraint.

### 3.4 Tutorial levels (World 1, levels 1–3)
Interactive step-by-step overlays:
- **Level 1:** single faction, 4 islands. Overlay: "Tap two islands to build a bridge. Each island shows how many bridges it needs."
- **Level 2:** single faction, 6 islands, double bridges introduced. Overlay: "Tap the same pair again for a double bridge. Tap again to remove."
- **Level 3:** two factions introduced. Overlay: "Connect each color's islands. Different colors can't cross!"

### 3.5 Star rating
Based on number of *actions* (bridge place/remove) relative to the minimum solution length:
- ★★★: actions ≤ minimum solution length × 1.0
- ★★: actions ≤ minimum solution length × 1.5
- ★: level completed (any action count)

### 3.6 Level data format
```typescript
interface LevelData {
  id: string;
  world: number;             // 1–5
  level: number;             // 1–15
  gridWidth: number;         // 5–9
  gridHeight: number;        // 5–9
  islands: IslandData[];
  parMoves: number;          // minimum moves for 3-star
}

interface IslandData {
  row: number;
  col: number;
  faction: number;           // 0–3
  degree: number;            // 1–8
}
```

Level data stored as JSON files, one per world: `levels/world-1.json`, etc.

### 3.7 AI level generation (future / tooling)
Solver-based pipeline:
1. **Place islands** randomly on grid, assign factions.
2. **Solve** for a valid bridge configuration (CSP/ILP solver).
3. **Assign degrees** from the solution.
4. **Verify uniqueness** by checking no other valid configuration exists.
5. **Rate difficulty** by running a logic-based solver that tracks which deduction techniques are needed:
   - Forced bridges (degree = available neighbors): easy
   - Connectivity forcing: medium
   - Cross-faction blocking deduction: hard
6. **Reject and retry** if difficulty doesn't match target band.

Generator is a build-time tool, not shipped to the client.

---

## 4. Interaction Design

### 4.1 Bridge placement — tap/click
1. Tap an island to select it (island glows, eligible neighbors highlight).
2. Tap an eligible neighbor to build one bridge.
3. Tap the same neighbor again to upgrade to a double bridge.
4. Tap again to remove the bridge.
5. Tap elsewhere or press Escape to deselect.

Cycle: empty → single → double → empty.

### 4.2 Keyboard controls
| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move cursor between islands |
| Enter / Space | Select island / cycle bridge to neighbor |
| Tab | Jump to next unsatisfied island |
| Z / Ctrl+Z | Undo |
| Y / Ctrl+Y | Redo |
| R | Reset level |
| H | Use hint |
| Escape | Deselect / pause menu |
| M | Toggle music |

### 4.3 Mouse
- Click = tap equivalent.
- Hover over islands shows degree status (filled/remaining).

### 4.4 Touch
- Tap = primary interaction.
- All interactive elements minimum 44×44dp touch target.
- No drag required — tap-only interaction model.
- No pinch/zoom — grid fits viewport.

### 4.5 Undo / Redo
Full action stack. Every bridge place/upgrade/remove is a discrete action.
Undo and redo buttons on screen. Keyboard shortcuts.
Stack clears on level reset.

### 4.6 Hints
- Button on screen (lightbulb icon).
- When pressed: solver identifies one bridge that *must* exist in the unique solution. That bridge draws in with a pulsing glow animation.
- Hint counts as 1 action (affects star rating).
- Unlimited hints (no artificial scarcity).

### 4.7 Pause menu
Escape / tap pause button:
- Resume
- Restart level
- Settings (sound, music, color blind mode)
- Exit to world map

---

## 5. Scene Architecture

```
BootScene          → preload core assets, then start MenuScene
MenuScene          → title screen, play/settings buttons
WorldMapScene      → Mario-style world/level selection
PlayScene          → active puzzle gameplay
UIScene            → HUD overlay during play (moves, stars, undo, hint, pause)
CelebrationScene   → level-complete overlay with stats
SettingsScene      → sound, music, color blind toggles
```

### 5.1 Scene flow
```
Boot → Menu → WorldMap → Play + UI → (on win) Celebration → WorldMap
                                    → (on pause) PauseMenu → resume / WorldMap
         Menu → Settings → Menu
```

---

## 6. Graphics & Animation

### 6.1 Art pipeline
- **Static assets:** SVG files. AI-generatable (structured XML markup, deterministic rendering at any resolution). Logos, icons, UI elements, island shapes, world map decorations.
- **Animated assets:** Lottie files (JSON-based vector animation, exported from After Effects or generated by AI tools like LottieFiles/Bodymovin). Used for: bridge construction sequences, celebration particles, UI transitions, world-theme ambient effects.
- **Runtime animation:** Phaser tweens for interactive feedback (select glow, bridge cycling, constraint satisfaction indicators).

### 6.2 Visual hierarchy
- Grid background: subtle, themed per world (water for ocean, grass for forest, etc.).
- Islands: solid colored circles/rounded shapes per faction. Distinct shapes per faction in color blind mode (circle, diamond, hexagon, triangle).
- Degree numbers: bold centered text on each island. Turns green when satisfied, pulses red momentarily when over-connected.
- Bridges: rope-style lines between islands.

### 6.3 Faction colors
| Faction | Color | Color blind symbol | Shape |
|---------|-------|-------------------|-------|
| 0 | Blue (#3b82f6) | Circle | ● |
| 1 | Red (#ef4444) | Diamond | ◆ |
| 2 | Green (#22c55e) | Hexagon | ⬡ |
| 3 | Amber (#f59e0b) | Triangle | ▲ |

### 6.4 Animation style guide
All animations must feel **tactile, playful, and rubber-like**:

- **Island select:** quick scale-up with elastic overshoot (Phaser `Bounce.Out` or custom S-curve: overshoot 1.15x, settle to 1.1x in ~200ms).
- **Bridge build:** rope uncoils from source island toward target, slight catenary sag, snaps taut with a rubber bounce on arrival (~300ms). Lottie animation.
- **Bridge upgrade (single → double):** existing rope splits into two parallel lines with a springy separation (~200ms).
- **Bridge remove:** rope snaps at midpoint, both halves recoil toward their islands and fade (~250ms). Lottie animation.
- **Degree satisfaction:** island briefly pulses scale (1.0 → 1.08 → 1.0) with a soft glow when its degree is exactly met.
- **Constraint violation:** gentle wobble (rotation ±3° twice, ~300ms). No harsh feedback.
- **Level complete:** all bridges glow sequentially along the solution path (100ms stagger), then particle burst from each island (Phaser particle emitter), screen-wide sparkle.
- **World map node unlock:** lock icon cracks and bursts apart, node inflates with elastic overshoot.
- **Button press:** scale to 0.95 on down, bounce to 1.02 then settle to 1.0 on up (~150ms total).

Easing reference:
- Snap/place actions: `Back.Out` (overshoot then settle)
- Removal/destruction: `Cubic.In` (accelerate away)
- Ambient loops: `Sine.InOut` (smooth pendulum)

### 6.5 World visual themes
Each world provides:
- A background gradient/pattern (SVG or tiled).
- Island fill style (textured or gradient per faction color).
- Bridge rope style (color/thickness).
- Ambient animated elements (Lottie): waves for ocean, fireflies for forest, snowfall for mountain, embers for volcano, clouds for sky.
- World map section art (SVG).

---

## 7. Audio

### 7.1 Music
- **Style:** chiptune / 8-bit retro.
- **Structure:** one loop per world (~60–90 seconds, seamless loop).
- **Behavior:** plays continuously during PlayScene. Crossfades on world change. Toggled via settings (persisted in SaveSystem).
- **Format:** OGG (primary) + MP3 (fallback) via Phaser audio loader.

### 7.2 Sound effects
| Event | Sound character |
|-------|----------------|
| Island select | soft blip (rising pitch) |
| Bridge build | rope stretch + snap |
| Bridge upgrade | double pluck |
| Bridge remove | pluck + recoil |
| Degree satisfied | chime (major chord) |
| Over-connected | low buzz (gentle, not punishing) |
| Level complete | victory fanfare (3-second chiptune jingle) |
| Star awarded | arcade coin ding (×1/2/3) |
| Hint used | subtle bell |
| Button press | click |
| World unlock | triumphant chord |
| Undo/redo | soft whoosh |

### 7.3 Format
OGG + MP3 dual format. Phaser's audio system handles codec selection.
Preloaded per world to keep initial load small.

---

## 8. Data & Save System

### 8.1 Save data structure
```typescript
interface SaveData {
  currentWorld: number;
  currentLevel: number;
  levelResults: Record<string, LevelResult>;  // keyed by "world-level"
  soundEnabled: boolean;
  musicEnabled: boolean;
  colorBlindMode: boolean;
}

interface LevelResult {
  completed: boolean;
  stars: number;               // 0–3
  bestMoveCount: number;
}
```

### 8.2 Persistence
LocalStorage via existing SaveSystem. Key: `archipelago-save`.

### 8.3 World/level unlocking
- World 1 unlocked from start.
- Next world unlocks when ≥12 of 15 levels in current world are completed (any star count).
- All levels within an unlocked world are playable in any order.

---

## 9. UI Layout

### 9.1 PlayScene HUD
```
┌──────────────────────────────────┐
│ [←]  World 1 - Level 5   [⚙]   │  ← top bar
│                                  │
│                                  │
│         PUZZLE GRID              │
│                                  │
│                                  │
│  Moves: 12    ★★☆               │  ← status bar
│  [↩] [↪]  [💡] [🔄]             │  ← action bar: undo, redo, hint, reset
└──────────────────────────────────┘
```

### 9.2 World map
Mario-style scrollable path:
- Nodes for each level connected by a winding path.
- Completed levels show star count.
- Current level pulses.
- Locked levels are grayed/padlocked.
- World transitions marked by themed gates.
- Future worlds visible but locked with a themed lock icon.

### 9.3 Responsive layout
- Grid always fits viewport with padding.
- Cell size calculated: `min(viewportWidth, viewportHeight) / (gridSize + 2)`.
- HUD elements use absolute positioning relative to viewport.
- Minimum touch target: 44×44 CSS pixels.

---

## 10. Project Structure

```
src/
  config/
    app.ts                  # game identity constants
    gameConfig.ts           # Phaser config
    factionColors.ts        # faction color/shape definitions
  core/
    bootGame.ts             # Phaser instantiation
  scenes/
    BootScene.ts
    MenuScene.ts
    WorldMapScene.ts
    PlayScene.ts
    UIScene.ts
    CelebrationScene.ts
    SettingsScene.ts
  systems/
    InputSystem.ts          # keyboard/mouse/touch abstraction
    SaveSystem.ts           # localStorage persistence
    SettingsSystem.ts       # sound/music/accessibility toggles
    AudioSystem.ts          # music + SFX manager
    LevelLoader.ts          # loads and parses level JSON
    HintSystem.ts           # solver-based hint provider
  model/
    Grid.ts                 # grid state: islands, bridges
    Island.ts               # island data class
    Bridge.ts               # bridge data class
    Solver.ts               # constraint solver for hints + validation
    MoveHistory.ts          # undo/redo stack
  ui/
    TextButton.ts
    buttonLogic.ts
    IslandView.ts           # renders one island on the grid
    BridgeView.ts           # renders/animates one bridge
    GridView.ts             # renders the full puzzle grid
    StarDisplay.ts          # star rating display
    HudBar.ts               # top/bottom HUD bars
  types/
    save.ts
    level.ts                # LevelData, IslandData types
  utils/
    clamp.ts
  levels/
    world-1.json
    world-2.json
    world-3.json
    world-4.json
    world-5.json
public/
  assets/
    icon.svg
    lottie/                 # Lottie animation JSONs
      bridge-build.json
      bridge-remove.json
      celebration.json
    audio/
      music/
        world-1.ogg / .mp3
        world-2.ogg / .mp3
        ...
      sfx/
        select.ogg / .mp3
        build.ogg / .mp3
        remove.ogg / .mp3
        complete.ogg / .mp3
        ...
    worlds/                 # per-world background SVGs
      ocean-bg.svg
      forest-bg.svg
      ...
```

---

## 11. Technical Notes

### 11.1 Lottie integration
Use `lottie-web` library. Phaser doesn't natively support Lottie — render Lottie animations to an off-screen canvas, then use as a Phaser texture or overlay as a DOM element during key moments (bridge build/remove, celebration). Evaluate performance on mobile; fall back to Phaser tweens if Lottie frame rate drops below 30 FPS.

### 11.2 SVG loading
Phaser supports SVG via `this.load.svg()`. All island shapes and UI icons load as SVG for resolution independence. Pass explicit render dimensions to avoid blurriness on high-DPI screens.

### 11.3 Solver (client-side, for hints)
A lightweight constraint propagation solver runs in-browser:
1. Iterate all islands. If an island's remaining degree equals its number of available neighbor slots, those bridges are forced.
2. If an island's remaining degree equals 0, mark all remaining neighbors as blocked.
3. Check connectivity — if removing a potential bridge would disconnect a faction, that bridge is forced.
4. Repeat until no more deductions. If stuck, the hint system reports "no forced move found" (shouldn't happen for well-designed puzzles).

No backtracking needed for hints — forced-move detection is sufficient and runs in <1ms for 9×9 grids.

### 11.4 Performance budget
- Initial load: <2 MB (Phaser + first world assets).
- Per-world lazy load: ~500 KB (audio + Lottie + level data).
- 60 FPS on mid-range phones.
- No per-frame allocations in the render loop.

---

## 12. Build & Deploy

- `npm run dev` — local development
- `npm run build` — production build (TypeScript check + Vite bundle)
- `npm test` — unit tests (Vitest)
- `npm run lint` — ESLint
- Deploy via existing GitHub Actions workflow to GitHub Pages.

---

## 13. Implementation Phases

### Phase 1 — Core loop (MVP)
- Grid model + solver
- PlayScene with tap interactions
- Undo/redo
- 5 hand-crafted tutorial levels (World 1, levels 1–5)
- Win detection
- Basic HUD

### Phase 2 — Content & polish
- All 75 levels
- World map scene
- Star rating
- Hint system
- Settings scene (sound, music, colour blind)
- Audio system + chiptune music

### Phase 3 — Juice
- Lottie animations (bridge build/remove/celebration)
- Tactile animation tuning (rubber feel, S-curves)
- Per-world visual themes
- World unlock flow
- Tutorial overlays

### Phase 4 — QA & ship
- Mobile touch testing
- Performance profiling
- Accessibility review (color blind, touch targets)
- Final level difficulty tuning
