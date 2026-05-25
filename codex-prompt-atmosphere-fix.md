# Codex Prompt — Fix Atmosphere Effects: Water-Only Shimmer, Multi-Layer Pattern

> Two fixes to the previous atmosphere implementation:
>
> 1. **Water effects only render over water** — currently they bleed across grass, pier, and decorations.
> 2. **Shimmer pattern uses multiple overlaid line gradients** for a less synthetic, more organic look.
>
> Vignette stays as-is (covers entire scene for global mood).

---

## Task: Move water depth + shimmer overlays BELOW the grass/pier/decoration layers, and use multiple overlaid gradients for a less-uniform shimmer pattern.

### Cause of current issues
The shimmer + water depth overlays are rendered as the LAST children in the scene container, sitting on top of all tile layers. As a result, they apply to grass and piers, which shouldn't have water-style reflections.

The fix: render shimmer + water depth as the FIRST children (right after the water background color), so the grass and pier tiles naturally cover them on land/pier areas. Only the water-cell gaps (where tiles are `null`) reveal the shimmer + depth underneath.

The vignette stays as the LAST overlay (over everything) because the moody darkening should apply to the entire scene, not just water.

---

## Step 1 — Modify `components/SceneRenderer.tsx`

The new layer order inside the scene container:

```tsx
return (
  <div
    style={{
      width: sceneWidthPx,
      height: sceneHeightPx,
      backgroundColor: WATER_BACKGROUND_COLOR,
      position: "relative",
      imageRendering: "pixelated",
      overflow: "hidden",
    }}
  >
    {/* NEW: Water effects FIRST — they'll be covered by tile layers where land is */}
    <div style={waterDepthOverlayStyle} />
    <div style={shimmerOverlayStyle} />

    {/* Existing tile layers */}
    {renderCellGrid(scene.cells, waveFrame, computedScale)}
    {renderCellGrid(scene.pierCells, waveFrame, computedScale)}
    <DecorationLayer seed={scene.seed ?? "default"} scale={computedScale} />

    {/* Vignette LAST — applies globally over everything */}
    <div style={vignetteOverlayStyle} />
  </div>
);
```

---

## Step 2 — Update shimmer to use 3 overlaid line layers

Replace the single `shimmerOverlayStyle` with a more complex `backgroundImage` that overlays multiple line patterns at different spacings. The combined pattern reads as less uniform.

```typescript
const shimmerOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundImage: [
    // Three line layers at different spacings; they interfere into a less-uniform pattern
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 11px)",
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 17px)",
    "repeating-linear-gradient(180deg, rgba(255,255,255,0.020) 0px, rgba(255,255,255,0.020) 1px, transparent 1px, transparent 23px)",
  ].join(", "),
  mixBlendMode: "screen",
  opacity: 0.7,
};
```

Notes:
- The three spacings (11, 17, 23) are deliberately prime-ish numbers — they don't align in a regular pattern, so the resulting overlay has less of a "perfect-striped" look.
- Each layer's alpha is slightly different (0.035, 0.025, 0.020) so denser layers don't dominate.
- `mixBlendMode: screen` keeps things lightening, never darkening.

### Step 3 — Keep water depth overlay as is (one minor tweak)

The radial depth gradient was working visually; just move it earlier in the DOM order (Step 1 does this). Update intensity slightly so the effect is more visible when surrounded by tiles:

```typescript
const waterDepthOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.15) 100%)",
  mixBlendMode: "soft-light",
};
```

Slightly stronger center highlight (0.08 instead of 0.05) and edge darkening (0.15 instead of 0.10) to compensate for the fact that the effect is now masked by tile coverage on land.

---

## Step 4 — Vignette stays as-is

Don't change the vignette overlay. It remains the last DOM child and continues to apply globally over the entire scene (including grass, pier, and decorations).

If for some reason it was removed during the refactor, restore it:

```typescript
const vignetteOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${VIGNETTE_INTENSITY}) 100%)`,
};
```

---

## Step 5 — Verify

```bash
npm run lint
npm run build
npm run test:run
```

All must pass. Visit `/dev/scene`.

### Visual test plan
1. **Shimmer + depth only visible on water:** look at the grass and pier tiles. They should NOT show horizontal shimmer lines through them.
2. **Water cells show shimmer:** the gaps between islands (pure water) should still show the faint shimmer pattern.
3. **Pattern looks less uniform than before:** with three overlaid line spacings, the horizontal lines should blend into a less mechanical look.
4. **Vignette still visible globally:** corners are darker, including on grass + pier.
5. **No regressions:** wave animation on coastlines + pier wave tiles still works.
6. **Decorations unaffected:** any placed decoration assets render cleanly without shimmer artifacts.
7. **Pixel art remains crisp:** no new blurriness.

---

## Acceptance criteria
- [ ] Water depth + shimmer overlays placed BEFORE tile layers in DOM order.
- [ ] Vignette placed AFTER all tile layers (unchanged position).
- [ ] Shimmer uses three overlaid line gradients at spacings 11, 17, 23.
- [ ] Water depth intensity slightly bumped (0.08 center, 0.15 edge).
- [ ] `npm run lint`, `npm run build`, `npm run test:run` all green.
- [ ] Visual test plan passes.

---

## Non-goals
- ❌ No PNG asset additions — pure CSS continues.
- ❌ No animation of shimmer or depth — keep static.
- ❌ No game logic / scene generator changes.
- ❌ No new files.
- ❌ Don't try to mask via CSS `clip-path` or `mask-image` — the tile-layer-on-top approach is cleaner and works in all browsers.

---

## After Codex finishes — easy further tuning

If the shimmer effect still feels too uniform or too prominent, the user can:
- Reduce overall `opacity: 0.7` to 0.5 or lower
- Change individual line spacings (11, 17, 23) — try 13, 19, 29 for variation
- Remove one of the three line layers if too dense

These are all magic numbers in one place, easy to tweak in DevTools first.

---

## Wrap-up
- Suggested commit: `fix: scope water effects to water cells, less-uniform shimmer pattern`
- Brief response back: confirm tile layers visually mask the shimmer correctly.
