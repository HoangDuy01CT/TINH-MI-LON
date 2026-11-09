# V142 — Mission + Level Map Input / Unified UI Fix

## Main fixes
- Level Map now handles pointer/touch input in the primary pointer path, not only click fallback.
- Level Map uses one shared `levelmapLayout()` for drawing and hit-testing.
- Level Map supports swipe scrolling and desktop mouse wheel scrolling.
- Tapping an unlocked level starts that level immediately.
- Locked levels show a clear feedback banner instead of appearing frozen.
- Mission individual reward claim now works from the main pointer path.
- Mission card is tappable when completed, in addition to the explicit `NHẬN` button.
- `NHẬN TẤT CẢ` and `QUAY LẠI` use the same layout for drawing and hit-testing.
- Mission and Level Map now use the same Sapphire / Gold modal design system as the other utility screens.
- Tall modal sizing is shared for Boosters, Missions and Level Map for better mobile fit.
- Existing game logic, custom gems, save, undo, booster logic, haptic, sound, AI and difficulty systems are preserved.

## Validation
- game.js syntax: PASS
- sw.js syntax: PASS
- manifest JSON: PASS
- ZIP integrity: PASS
