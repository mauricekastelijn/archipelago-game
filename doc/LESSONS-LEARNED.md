# Lessons Learned

Hard-won knowledge from building Archipelago. Refer to this document before
making changes to avoid repeating past mistakes.

---

## 1. Never nest `TextButton` inside a Phaser `Container`

**Problem:** `TextButton` uses scene-level `pointerdown` / `pointerup` /
`pointermove` listeners and checks `pointer.worldX / worldY` against
`this.x, this.y`. When a `TextButton` is added to a `Container`, its
`x` and `y` become *local* to the container, but pointer events still
report *world* coordinates. The hit-test never matches.

**Symptom:** Buttons render correctly but don't respond to clicks or taps.

**Fix:** Always place `TextButton` instances directly in the scene at
absolute world coordinates. Do not wrap them in containers.

**Affected commits:** UIScene level-complete overlay, Continue button.

---

## 2. Avoid Phaser `Container` for overlay positioning

**Problem:** When a `Container` is positioned at `(cx, cy)` and its children
are *also* placed at world coordinates, the children render at the sum of both
offsets — effectively doubling the position. The overlay appears off-center and
partially off-screen.

**Symptom:** Level-complete overlay shifted to the bottom-right corner instead
of being centered.

**Fix:** Either:
- Use a container at `(0, 0)` and position children at world coordinates, or
- Skip the container entirely and manage overlay elements as a plain array.

We chose the latter — overlay elements are tracked in an
`overlayElements: Phaser.GameObjects.GameObject[]` array for easy
show/hide/destroy.

---

## 3. Scene-level pointer input instead of `setInteractive()`

**Problem:** Phaser's `setInteractive()` on game objects (especially those
inside containers) is unreliable when multiple scenes are running
simultaneously (e.g., UIScene on top of PlayScene). The UIScene's interactive
objects can consume all pointer events, preventing PlayScene from receiving
island clicks.

**Symptom:** Islands not clickable despite `globalTopOnly = false`.

**Fix:** Use a single scene-level `this.input.on('pointerdown', …)` handler
in PlayScene. On each pointer event, iterate all islands and find the nearest
one within a hit radius using simple distance calculation:

```ts
private findIslandNearPointer(px: number, py: number): Island | undefined {
  const threshold = this.islandRadius * 1.3;
  // ... distance check against each island's pixel position
}
```

This sidesteps all interactive-object ordering issues.

---

## 4. Level design requires brute-force solvability verification

**Problem:** Manually designing puzzle levels is error-prone. Subtle issues
make levels unsolvable:
- Odd total degree within a faction (bridges connect in pairs, so total
  degree must be even for a connected subgraph to exist).
- Islands with no same-faction neighbors reachable along their row/column.
- Connectivity impossible due to topology even when degree sums are correct.

**Symptom:** Players get stuck on levels that cannot be completed.

**Fix:** Every level must pass `LevelVerification.test.ts`, which runs:
1. **Even-degree check** — total degree per faction is even.
2. **Reachable-neighbor check** — every island has at least one same-faction
   neighbor on the same row or column, and the combined neighbor capacity
   meets the island's degree.
3. **Brute-force solve** — a backtracking solver attempts every bridge
   combination and confirms at least one valid solution exists.

**Rule:** Never commit a level without a passing verification test.

---

## 5. Menu layout: keep buttons and labels spaced generously

**Problem:** Star indicators (`★★☆`) were combined with level numbers inside
52×52 buttons using a two-line label. The text didn't fit and was either
truncated or illegible.

**Symptom:** Stars overlapping level numbers, unreadable button labels.

**Fix:** Show the level number alone inside the button (single-line, large
font). Render stars as a *separate* smaller text element positioned below the
button.

**General rule:** Don't cram multiple pieces of information into small UI
elements. Use adjacent or stacked elements instead.

---

## 6. World name vs. level buttons overlap

**Problem:** The world title text and the first row of level buttons were
placed too close together vertically.

**Symptom:** "World 1" text overlapping with level buttons.

**Fix:** Increased `levelStartY` from 310 → 330 and label-to-button offset
from 30 → 40. Always leave sufficient vertical margin between text and
interactive elements.

---

## 7. Bridge crossing detection matters

**Problem:** Bridges occupy intermediate cells between the two islands they
connect. If two bridges cross the same cell, they visually overlap and create
an impossible physical layout.

**Fix:** Before placing a bridge, check whether any existing bridge occupies
the same intermediate cells (`occupiedCells()` on each `Bridge`). If a
crossing would occur with a bridge from a *different* faction, block
the move. The model's `Grid.wouldCauseCrossing()` method handles this.

---

## 8. Use `import.meta.env.BASE_URL` for asset paths

**Problem:** Hard-coded paths like `/levels/world-1.json` break when the
game is deployed under a sub-path (e.g., GitHub Pages at
`/archipelago-game/`).

**Fix:** Prefix all `fetch()` URLs with `import.meta.env.BASE_URL`:

```ts
const url = `${import.meta.env.BASE_URL}levels/world-${worldId}.json`;
```

This lets Vite inject the correct base path at build time.
