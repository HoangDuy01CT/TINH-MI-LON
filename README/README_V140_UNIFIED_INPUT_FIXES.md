# TINH MI LON V140 – Unified Input & Modal Fixes

- Fixed render-loop crash in PAUSED state caused by input-only x/y variables being referenced from draw().
- Menu pointer routing now uses the exact menuLayout() rectangles used for drawing.
- Booster pointer routing now uses exact boosterLayout() rectangles for Hammer / Shuffle / +5 Moves.
- Pause Save & Menu returns to the in-game menu after saving.
- Pointer/click compatibility is de-duplicated so a synthetic click does not repeat a pointer action.
- Kept all gameplay, custom gems, local impact feel, save, undo, missions, daily, streak, AI, difficulty, haptic, sound and performance systems.
