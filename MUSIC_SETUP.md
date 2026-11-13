# Main menu music integration

The menu music player is integrated into `game-build-0009.html` via `mugen-menu-music.js`. The downloaded user-provided recording is not embedded into the Git repository automatically.

## Play the uploaded theme on your current device

1. Download the converted `main-menu-theme.ogg` audio supplied in the ChatGPT conversation.
2. Open New Mugen and choose **Options** from the main menu.
3. Choose **Import theme (OGG/MP3) → Choose file** and select the OGG.
4. Return to the menu. Music automatically attempts to play on the main menu; on browsers that block autoplay, the first menu click, keypress, or PS5 controller action starts it.
5. The track is saved in IndexedDB on this browser, if supported. Other devices need their own import unless you upload the asset to the repository.

## Make the theme the default for every player

Upload the exact file to `assets/music/main-menu-theme.ogg` in this repository. The game tries that URL automatically; there is no need to edit JavaScript. The player-side import takes precedence when someone has chosen a personal track.

## Behavior

- Uses `HTMLAudioElement.loop` for repeating the pre-crossfaded audio asset.
- Volume target: 42%; fade in: 1.1 seconds; fade out: 0.65 seconds.
- Music is limited to the menu, not character select or battles.
- Attempts immediate unmuted playback when the menu loads. If blocked by browser autoplay policy, it retries on the first trusted menu interaction (including DualSense input).
- Respects main-menu music On/Off and page visibility.
- Keeps the existing sound effects toggle independent and preserves gamepad menu navigation.
- A local import is limited to 35 MB and OGG/MP3/WAV/M4A audio.
- If the hosted file is missing, the game remains playable and Options can import a local file.

## Verification

`node --check mugen-menu-music.js` checks syntax. A simple mocked DOM/audio smoke test can verify activation, fades, screen transitions, toggling, and local import. Also test in a real browser and with a physical DualSense controller, because autoplay and file picker behavior can vary by browser.

## Autoplay troubleshooting (November 2026)

The bundled 47.6-second OGG is now committed at `assets/music/main-menu-theme.ogg`. The game attempts to start the default track immediately, without waiting for local storage. The entry-point and player cache versions were bumped to avoid stale scripts. A compact **Play Menu Music** button appears directly on the menu when the browser refuses automatic sound. Click or tap that button once; there is no need to import the included OGG again.

**Browser limitation:** Safari/Chrome/Firefox may refuse *audible* autoplay until a trusted user gesture. JavaScript cannot override that rule, and Gamepad API events alone do not necessarily count as trusted browser interactions. Audio may therefore start automatically only when the browser permits it. This is not a game bug and should not be claimed as universally bypassed.

For older iOS Safari versions without OGG Vorbis support, the player attempts an MP3 fallback at `assets/music/main-menu-theme.mp3`. The `.github/workflows/menu-music-mp3.yml` workflow converts the committed OGG into MP3 if Actions is enabled and has write access. Verify that MP3 actually exists in the repository; the workflow's presence does not prove that it has run.

If audio still does not play, refresh the game through `index.html`, check the visible prompt and Options status, then confirm the deployed site includes the updated `mugen-menu-music.js?v=5` asset and hosted OGG (HTTP 200). Test on the user's actual device because headless/DOM-stub checks do not validate autoplay permissions.
