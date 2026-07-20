# New Mugen — Arcade Build 0003

This browser fighting-game prototype currently includes:

- A responsive main menu with keyboard and touch controls.
- A revamped Arcade character-select and matchup flow.
- Yusuke Urameshi as roster slot 01.
- A playable 60-second fight against the CPU-controlled Demon Scout.
- Health, spirit meters, blocking, jumping, projectiles, KO results, and rematches.
- Keyboard and on-screen touch fighting controls.
- A modular Yusuke definition in `characters/yusuke/yusuke.json`.
- Character confirmation and placeholders for the next roster additions.

## Preview locally

Run a small web server in the project folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Fight controls

- Move: `A` / `D` or left / right arrow keys
- Jump: `W` or up arrow
- Block: `S`, down arrow, or Shift
- Rapid Strike: `J`
- Power Hook: `K`
- Spirit Gun: `L` (uses spirit meter)
- Return to character select: `Esc` or `B`

On GitHub Pages, keep `index.html` at the repository root and preserve the `assets` and `characters` folders exactly as provided.

This is a fan-made prototype. Yu Yu Hakusho and Yusuke Urameshi belong to their respective rights holders.
