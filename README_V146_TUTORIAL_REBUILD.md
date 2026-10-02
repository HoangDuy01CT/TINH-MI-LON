# V146 — Tutorial Rebuild

## What changed
- Rebuilt the first-run Tutorial as a standalone DOM overlay.
- Removed the obsolete Canvas Tutorial renderer and its Canvas coordinate hitboxes.
- The Canvas game render loop is stopped while the Tutorial is open, preventing repeated background redraw/flicker.
- Tutorial navigation uses real HTML buttons for mouse, touch, and keyboard input.
- The Tutorial card uses `box-sizing:border-box` and container-relative sizing so titles, images, text, progress dots, and buttons stay inside the frame.
- Gem previews use the 8-cell gem atlas with `background-size:800% 100%` and exact cell-position math.
- Tutorial schema/version is V4 so the rebuilt onboarding is treated as a new tutorial.
- Finishing the Tutorial explicitly starts Level 1 and restarts the game render loop.
- Skipping the Tutorial returns to Menu and restarts the render loop.

## Source checks
- JavaScript syntax check: PASS
- Service worker syntax check: PASS
- Manifest JSON check: PASS
- Obsolete Canvas tutorial functions removed: PASS
- Duplicate Tutorial DOM state removed: PASS
- ZIP integrity: PASS
