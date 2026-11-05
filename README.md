# Screen Recorder

A screen recorder that runs entirely in your browser. Nothing is uploaded: recordings stay on your device.

**Use it:** https://n0ot.github.io/screen-recorder/

## Features

- Record a screen, window, or tab, with your microphone and the tab's or system audio mixed in.
- Pause and resume, mute the mic, and watch a live mic level meter.
- Switch to a different screen or tab without stopping (Chrome and Edge).
- Floating controls that stay visible while you work in other tabs (Chrome and Edge).
- Crash-safe: while recording, the video is saved into the browser's storage every second. If the browser crashes, the recording is offered back to you on your next visit. Leaving the page on purpose deletes it, and only one recording is ever kept, so it never fills up your disk.
- Optionally record straight to a file you choose, such as one on an external drive (Chrome and Edge).
- Saved WebM files get their duration written in, so they can be seeked in any player.
- **Repair a recording:** fixes the length and seeking of WebM files that were cut off, including Chrome's `.crswap` leftovers.
- Keyboard shortcuts, screen reader support, light and dark mode, and works at any screen size.

## Keyboard shortcuts

| Shortcut (Alt, or Option on a Mac) | Action |
|---|---|
| Alt+R | Start recording, or start a new one |
| Alt+P | Pause or resume |
| Alt+M | Mute or unmute the microphone |
| Alt+S | Stop |

## Running it locally

It's a single `index.html` with no build step. Serve the folder over HTTP, because browsers block the storage it uses on pages opened straight from disk:

```sh
python3 -m http.server
```

Then open http://localhost:8000.

## Browser support

Recent desktop versions of Chrome, Edge, Firefox, and Safari. Switching sources, floating controls, and recording straight to a chosen file need Chrome or Edge; everything else works everywhere.
