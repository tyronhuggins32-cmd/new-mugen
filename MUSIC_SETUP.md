# Main menu music integration

The menu music player is integrated into `game-build-0009.html` via `mugen-menu-music.js`. The downloaded user-provided recording is not embedded into the Git repository automatically.

## Play the uploaded theme on your current device

1. Download the converted `main-menu-theme.ogg` audio supplied in the ChatGPT conversation.
2. Open New Mugen and choose **Options** from the main menu.
3. Choose **Import theme (OGG/MP3) → Choose file** and select the OGG.
4. Return to the menu. Music plays/loops after the browser permits audio on interaction.
5. The track is saved in IndexedDB on this browser, if supported. Other devices need their own import unless you upload the asset to the repository.

## Make the theme the default for every player

Upload the exact file to `assets/music/main-menu-theme.ogg` in this repository. The game tries that URL automatically; there is no need to edit JavaScript. The player-side import takes precedence when someone has chosen a personal track.

## Behavior

- Uses `HTMLAudioElement.loop` for repeating the pre-crossfaded audio asset.
- Volume target: 42%; fade in: 1.1 seconds; fade out: 0.65 seconds.
- Music is limited to the menu, not character select or battles.
- Respects main-menu music On/Off, page visibility, and browser autoplay restrictions.
- Keeps the existing sound effects toggle independent and preserves gamepad menu navigation.
- A local import is limited to 35 MB and OGG/MP3/WAV/M4A audio.
- If the hosted file is missing, the game remains playable and Options can import a local file.

## Verification

`node --check mugen-menu-music.js` checks syntax. A simple mocked DOM/audio smoke test can verify activation, fades, screen transitions, toggling, and local import. Also test in a real browser and with a physical DualSense controller, because autoplay and file picker behavior can vary by browser.
