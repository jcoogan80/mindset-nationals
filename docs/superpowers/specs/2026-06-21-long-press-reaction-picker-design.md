# Long-Press Reaction Picker — Design Spec
Date: 2026-06-21

## Overview

Add a floating emoji reaction picker that appears when a user long-presses (600ms hold) a gallery tile. The picker shows all three reaction options (❤️ 👍 😂) in a pill-shaped bubble above the tile. Tapping an emoji sets the user's reaction and dismisses the picker. This replaces the existing long-press-to-download behavior; download remains accessible via the hover overlay buttons already present on each tile.

---

## Trigger Change

**File:** `js/gallery-infinite-scroll.js`, `buildItem()`, line 183.

Current:
```javascript
addLongPress(div, function () { downloadImage(im.url); });
```

New:
```javascript
addLongPress(div, function () { showReactionPicker(div, im.key, team); });
```

No changes to `addLongPress` itself — the 600ms timer, movement cancellation, and `mtile-pressing` press-feedback animation all remain unchanged.

---

## Picker Implementation

### DOM Structure

A single `div.rxn-picker` is created once (lazy singleton) and reused. It is appended to `document.body` — not inside any tile — so it is never clipped by tile `overflow: hidden`.

```html
<div class="rxn-picker" aria-label="React to photo">
  <button class="rxn-picker-btn [rxn-picker-btn--mine]" data-r="heart">❤️</button>
  <button class="rxn-picker-btn [rxn-picker-btn--mine]" data-r="thumbsup">👍</button>
  <button class="rxn-picker-btn [rxn-picker-btn--mine]" data-r="laughing">😂</button>
</div>
```

`rxn-picker-btn--mine` is applied to whichever button matches `GalleryReactions.getMap()[key].mine` (if any).

### `showReactionPicker(tileEl, imageKey, team)`

1. If a picker is already open, close it immediately (no animation).
2. Update the three buttons' `rxn-picker-btn--mine` class based on current reaction state.
3. Append to `document.body`, compute position via `tileEl.getBoundingClientRect()`:
   - Center horizontally over the tile
   - Place `8px` above the tile's top edge
   - Clamp: `left` min `12px`, max `window.innerWidth - pickerWidth - 12px`
   - Use `position: fixed` so scroll position doesn't matter
4. Add `rxn-picker--open` class to trigger the open animation.
5. Register a one-time `touchstart` listener on `document` (capture phase) to dismiss on outside tap.

### Interaction

**Emoji tap:** `touchend` on a `.rxn-picker-btn`:
1. Play a scale-pop animation on the tapped button (CSS keyframe).
2. Call `window.GalleryReactions.post(team, imageKey, reaction)` optimistically.
3. Close the picker (with close animation, then remove from DOM / hide).

**Outside tap:** `touchstart` anywhere outside `.rxn-picker` triggers immediate close (no animation — the touch should proceed normally to the element beneath).

**Singleton enforcement:** A module-level `_activePicker` variable tracks `{ el, cleanup }`. `showReactionPicker` always calls cleanup on any existing picker before opening a new one.

### Close Animation

Open: `scale(0.7) → scale(1)`, `opacity 0 → 1`, duration 100ms, `ease-out`.  
Close: `scale(1) → scale(0.85)`, `opacity 1 → 0`, duration 80ms, `ease-in`. After animation ends, set `display: none`.

---

## CSS

New rules appended to `css/gallery-reactions.css`:

```css
.rxn-picker {
  position: fixed;
  display: none;          /* shown via rxn-picker--open */
  align-items: center;
  gap: .3rem;
  background: #fff;
  border-radius: 99px;
  padding: .45rem .6rem;
  box-shadow: 0 8px 28px -4px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.1);
  z-index: 500;
  transform-origin: bottom center;
}

.rxn-picker--open {
  display: flex;
  animation: rxn-picker-in 100ms ease-out forwards;
}

.rxn-picker--closing {
  animation: rxn-picker-out 80ms ease-in forwards;
}

@keyframes rxn-picker-in {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes rxn-picker-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.85); }
}

.rxn-picker-btn {
  background: none;
  border: 2px solid transparent;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .1s;
}

.rxn-picker-btn:hover,
.rxn-picker-btn:active { transform: scale(1.2); }

.rxn-picker-btn--mine {
  border-color: var(--red);
  background: rgba(204, 0, 0, .08);
}

@keyframes rxn-picker-pop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); }
  100% { transform: scale(1); }
}

.rxn-picker-btn--popping {
  animation: rxn-picker-pop 200ms ease-out forwards;
}
```

---

## Files Changed

| Action | File |
|--------|------|
| Modify | `js/gallery-infinite-scroll.js` — add `showReactionPicker()`, change `addLongPress` callback in `buildItem()` |
| Modify | `css/gallery-reactions.css` — append picker styles |

No other files need changes. The picker reads from `window.GalleryReactions.getMap()` and writes via `window.GalleryReactions.post()` — both already present from the reactions feature.

---

## Error Handling

- If `window.GalleryReactions` is unavailable when long-press fires: `showReactionPicker` returns early without showing the picker. Long-press produces no visible effect.
- If `GalleryReactions.post()` fails: the existing optimistic-update-with-rollback logic in the reactions module handles it. The picker has already closed by the time failure occurs — no additional UI needed.

---

## Out of Scope

- Desktop mouse right-click or hover trigger (touch-only feature)
- Video tiles (long-press on videos currently downloads; this change applies to image tiles only — videos use `addLongPress` too, so the behavior should be preserved for videos — see implementation note below)

## Implementation Note: Video Tiles

`addLongPress` is called once per tile in `buildItem()`. Currently the same callback (`downloadImage`) applies to both image and video tiles. With this change, image tiles get `showReactionPicker` and video tiles should retain `downloadImage`. The implementation must branch on `isVideo`:

```javascript
addLongPress(div, isVideo
  ? function () { downloadImage(im.url); }
  : function () { showReactionPicker(div, im.key, team); }
);
```
