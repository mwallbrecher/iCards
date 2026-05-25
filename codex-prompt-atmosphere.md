# Codex Prompt — Atmospheric CSS Effects on Scene (Vignette, Water Depth, Shimmer)

> Copy this entire prompt into a fresh Codex chat in VS Code. Adds three CSS-based atmospheric effects on top of the scene: vignette, radial water gradient, and subtle shimmer lines. Purely visual, no asset or game logic changes.

---

## Task: Add atmospheric CSS effects to the scene to create a "Stardew Valley swamp" mood

### Context
The current scene renders cleanly with grass tiles, pier tiles, decorations, and a flat teal water background (`#43A38D`). It looks correct but lacks atmospheric depth. We want to add three CSS-only effects that overlay on top of the entire rendered scene to add mood:

1. **Vignette** — darkening from the edges toward the center
2. **Radial water depth gradient** — center slightly brighter than edges, suggesting depth and matching the vignette direction
3. **Subtle horizontal shimmer lines** — static, repeated faint lines across the water, suggesting light reflections

All effects are pure CSS overlays in `SceneRenderer.tsx`. No new files, no JS animation, no PNG assets needed. The effects must render OVER everything (grass + pier + decorations), so they're added as the LAST DOM children inside the scene container.

### Design parameters (already decided)
- Vignette: full-edge darkening, medium intensity (5/10 on a 0-10 mood scale)
- Water gradient: radial, brighter in center
- Shimmer: faint, distributed across full scene, static
- All effects sit ABOVE everything else (grass, pier, decorations included)

---

## Step 1 — Modify `components/SceneRenderer.tsx`

Add three new overlay `<div>`s as the final children of the main scene container, after the decoration layer. Each overlay covers the full scene with `pointer-events: none` so they don't block interaction.

The structure inside the main render becomes:

```tsx
return (
  <div
    style={{
      width: sceneWidthPx,
      height: sceneHeightPx,
      backgroundColor: WATER_BACKGROUND_COLOR,
      position: "relative",
      imageRendering: "pixelated",
      overflow: "hidden",  // important — prevents overlays from bleeding outside scene bounds
    }}
  >
    {/* Existing layers */}
    {renderCellGrid(scene.cells, waveFrame, computedScale)}
    {renderCellGrid(scene.pierCells, waveFrame, computedScale)}
    <DecorationLayer seed={scene.seed ?? "default"} scale={computedScale} />

    {/* NEW: Atmospheric overlay layers */}
    <div style={waterDepthOverlayStyle} />
    <div style={shimmerOverlayStyle} />
    <div style={vignetteOverlayStyle} />
  </div>
);
```

Order matters: water depth first (closest to water), then shimmer (over depth), then vignette (outermost, darkens edges).

### Overlay 1 — Water depth gradient

A radial gradient: center lighter, edges darker. Subtle — just enough to suggest the middle is shallower / lit by something.

```typescript
const waterDepthOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.10) 100%)",
  // Slight white center brighten, fully transparent middle, faint dark edges
  mixBlendMode: "soft-light",
};
```

`mixBlendMode: soft-light` makes the effect blend naturally with the colors below instead of just being a flat overlay. Result: water appears to have gentle depth variation.

### Overlay 2 — Shimmer lines

Faint repeating horizontal lines suggesting light reflections on water. Subtle enough not to be loud, distributed across the full scene.

```typescript
const shimmerOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)",
  mixBlendMode: "screen",
  opacity: 0.6,
};
```

Notes:
- 12-pixel spacing between lines feels natural at the current scale. If it looks too busy or sparse, adjust the `12px` value.
- `mixBlendMode: screen` lightens — the lines look like soft highlights, not chalky overlays.

### Overlay 3 — Vignette

Darker corners and edges, brighter center. This is what really sells the "atmospheric" feel.

```typescript
const vignetteOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.35) 100%)",
  // From transparent inner area to ~35% black darkening at edges
};
```

The `35%` inner-radius keeps the center fully clean; the dark only kicks in past 35% from center. `0.35` alpha is the darkness intensity. Both numbers are easy to tweak in DevTools while previewing.

---

## Step 2 — Optional: Make the effect parameters configurable

If you want easy tweaking later, hoist the magic numbers into named constants at the top of the file:

```typescript
const VIGNETTE_INTENSITY = 0.35;       // 0-1, darker = stronger vignette
const VIGNETTE_INNER_RADIUS = "35%";   // larger = vignette starts further from center
const SHIMMER_OPACITY = 0.6;            // 0-1, fainter = lower
const SHIMMER_LINE_SPACING_PX = 12;    // distance between shimmer lines
const WATER_DEPTH_INTENSITY = 0.1;     // 0-1, dark edge intensity for water gradient
```

This isn't required but makes the design easy to tune without hunting through the file.

---

## Step 3 — Verify

```bash
npm run lint
npm run build
npm run test:run
```

All must pass. Then visit `/dev/scene`.

### Visual test plan
1. **Scene looks visibly moodier:** edges darker, center brighter, faint horizontal shimmer lines across water.
2. **Effects sit on top of everything:** no grass or pier tiles "glow through" the vignette.
3. **Effects are subtle, not garish:** at default settings, the scene should still look clean and readable. If it looks too dark or chalky, the constants in Step 2 are easy to nudge down.
4. **Wave animation still visible:** wave animation on coastline + pier tiles should remain visible through the overlays. The overlays shouldn't obscure them.
5. **Decorations still readable:** trees, rocks, lanterns (if placed) still look correct under the vignette.
6. **No mouse-event issues:** clicking anywhere in the scene still works (pointer-events: none on overlays is critical).

---

## Acceptance criteria
- [ ] Three new overlay divs added as last children in `SceneRenderer.tsx`.
- [ ] All overlays have `pointer-events: none`.
- [ ] `overflow: hidden` is set on the scene container (prevents overlay bleed).
- [ ] `npm run lint`, `npm run build`, `npm run test:run` all green.
- [ ] Scene visually has noticeable but tasteful mood at default settings.
- [ ] Magic numbers hoisted into named constants for easy tweaking.

---

## Non-goals
- ❌ No asset changes — purely CSS.
- ❌ No animated overlays (animation can come later if desired).
- ❌ No new files.
- ❌ No changes to grass, pier, or decoration rendering logic.
- ❌ No `mix-blend-mode` polyfills for older browsers — Safari and modern Chrome support it natively.

---

## Wrap-up
- Suggested commit: `feat: add atmospheric vignette, water depth, and shimmer overlays`
- Brief response back: confirm the three overlays render, all in correct stacking order. Mention if any tuning of the magic numbers was needed.
