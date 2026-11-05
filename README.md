# Screen Recorder

A screen recorder that runs entirely in your browser. Nothing is uploaded: recordings stay on your device.

**Use it:** https://n0ot.github.io/screen-recorder/ — or install it as an app from there (Chrome and Edge show an **Install app** button; in Safari use **File › Add to Dock**).

## Features

**Recording**
- Record a screen, window, or tab, with your microphone and the tab's or system audio mixed in.
- Separate volume sliders and level meters for your mic and the tab's audio, adjustable while recording.
- Audio-only mode, for meetings and voice notes, with much smaller files.
- A webcam bubble in the corner of your choice, which you can hide and show while recording (Chrome and Edge).
- A 3-2-1 countdown, and an optional automatic stop after 15 minutes to 2 hours.
- Pause and resume, mute the mic, and add markers as you go.
- Switch to a different screen or tab without stopping (Chrome and Edge).
- Floating controls that stay visible while you work in other tabs (Chrome and Edge).

**Small files that open anywhere**
- MP4 (H.264) by default, which opens in QuickTime and nearly every app. WebM (VP9) and WebM (AV1) give smaller files.
- Quality presets (Compact 15 fps, Standard 30 fps, High 60 fps), each with an estimate of the size per hour.

**After recording**
- Trim the start and end without re-encoding. The start snaps to the nearest keyframe (one every second).
- Markers become chapters in the saved file (shown by VLC and most players), and you can rename them, add more, or copy a chapter list in the format YouTube uses.
- Saved files have their duration written in, so they can be scrubbed in any player.

**Crash-safe**
- While recording, the video is saved into the browser's storage every second. If the browser crashes, the recording is offered back to you on your next visit. Leaving the page on purpose deletes it, and only one recording is ever kept, so it never fills up your disk.
- Optionally record straight to a file you choose, such as one on an external drive (Chrome and Edge).
- **Repair a recording:** fixes the length and seeking of WebM and MP4 files that were cut off, including Chrome's `.crswap` leftovers.

Also: keyboard shortcuts, screen reader support, light and dark mode, works offline once installed, and fits any screen size.

## Keyboard shortcuts

| Shortcut (Alt, or Option on a Mac) | Action |
|---|---|
| Alt+R | Start recording, or start a new one |
| Alt+P | Pause or resume |
| Alt+M | Mute or unmute the microphone |
| Alt+K | Add a marker |
| Alt+C | Show or hide the webcam bubble |
| Alt+S | Stop |
| Escape | Cancel the countdown |

## Running it locally

There's no build step. Serve the folder over HTTP, because browsers block the storage it uses on pages opened straight from disk:

```sh
python3 -m http.server
```

Then open http://localhost:8000.

## How it's organized

| File | What it does |
|---|---|
| `index.html`, `styles.css` | The page and its styles |
| `js/app.js` | Recording, the interface, saving and recovery |
| `js/media.js` | Reads and rewrites WebM and MP4 files without re-encoding: duration, chapters, trimming, and repair |
| `js/storage-worker.js` | Writes the recording into browser storage as it records |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installing as an app and working offline |

## Browser support

Recent desktop versions of Chrome, Edge, Firefox, and Safari. The webcam bubble, switching sources, floating controls, and recording straight to a chosen file need Chrome or Edge. Firefox records WebM only.
