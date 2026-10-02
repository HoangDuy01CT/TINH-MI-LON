# TINH MÍ LON V154 — Game Feel Final Polish

Base: V153 Sound + Haptic Special/Fusion.

## V154 changes
- Premium board breathing: subtle sapphire/glass ambient highlight around the 8×8 board.
- Slow board sheen sweep in High/Balanced modes; disabled/reduced with Reduced Motion and Performance mode.
- Special Gem living aura: each special type has a distinct restrained glow; Rainbow/Star get orbiting spark accents.
- Gem micro-sheen: very light per-gem highlight to make the crystal sprites feel less static.
- Particle trails: tiny velocity streaks during effects, bounded by the existing performance profile.
- Score popup polish: eased pop-in scale for a cleaner arcade feel.
- Kept V153's Sound + Haptic profiles and all existing fusion mechanics.
- No new audio assets; no game.js/app.js merge; sw.js remains separate.

## Stability/performance
- V154 animation layer is draw/update-only and respects Performance/Balanced/High quality profiles.
- Reduced Motion lowers animation intensity.
- Existing particle/effect caps remain active.

## Verification
- `node --check game.js` PASS
- `node --check sw.js` PASS
- `python3 -m json.tool manifest.webmanifest` PASS
- ZIP integrity check PASS

Physical iPhone testing is not claimed; this package is source/build/ZIP verified.
