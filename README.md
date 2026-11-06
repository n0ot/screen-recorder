# Screen Recorder

A screen recorder that runs entirely in your browser. Nothing is uploaded: recordings stay on your device.

**Use it:** https://n0ot.github.io/screen-recorder/ — or install it as an app from there (Chrome and Edge show an **Install app** button; in Safari use **File › Add to Dock**).

## Features

**Recording**
- Record screens, windows, and tabs, with your microphone and the tabs' sound mixed in.
- **Record starts straight away** with whatever you've set up, even nothing: you can add, replace, or remove sources, the camera, the mic, and sound while recording or paused. With nothing in the frame, the preview says so (the recording is just black), and only sound is recorded.
- Show up to two windows, tabs, or screens at once, side by side or one above the other. The layout is chosen automatically to make both as big as possible, and described out loud: where each source is and roughly how big its text will look.
- **Camera:** the toggle really turns the camera (and its light) on and off, as in a video call. With nothing else shared, the camera fills the frame; with a source, it's a circle in the corner you pick.
- **Mic:** one toggle, before or during recording. The mic and camera start off and remember your last choice, and the small menu on each picks which device to use, also while recording.
- Set things up first if you like: share sources on the main screen and check the layout. You stay on the page while you share, and nothing is recorded until you press Record.
- Name each source (browsers don't tell the page a window's title), make one bigger than the other with **Size balance** (remembered for next time), and view the live preview full screen to check readability.
- **Add sound** (Chrome and Edge): record a tab's sound without showing it, such as music playing in the background (up to two). Works in audio-only recordings too.
- Audio-only mode, for meetings and voice notes, with much smaller files.
- Separate volume sliders and level meters for your mic and the tabs' sound, adjustable while recording.
- An optional automatic stop after 15 minutes to 2 hours.
- Pause and resume, and add markers as you go.
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
| Alt+M | Turn the mic on or off |
| Alt+K | Add a marker |
| Alt+C | Turn the camera on or off |
| Alt+S | Stop |
| Escape | Close the open panel (Recording options, Trim, Markers) |

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

Recent desktop versions of Chrome, Edge, Firefox, and Safari. Everything above works in all of them, except: sharing a tab's sound (and so **Add sound**), floating controls, and recording straight to a chosen file need Chrome or Edge, and Firefox records WebM only.

Chrome and Edge combine what you share by handing each frame straight to the recording. Firefox and Safari draw it onto a canvas that's recorded instead, redrawn on a timer that keeps running in background tabs.
