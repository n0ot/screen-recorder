'use strict';

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const els = {
  stage: $('stage'), stageEmpty: $('stageEmpty'), stageNotice: $('stageNotice'), stageTitle: $('stageTitle'), stageText: $('stageText'), video: $('video'),
  installBtn: $('installBtn'),
  setupView: $('setupView'), startBtn: $('startBtn'), startHint: $('startHint'), modeSwitch: $('modeSwitch'),
  setupTools: $('setupTools'), avTools: $('avTools'), micOn: $('micOn'), camOn: $('camOn'), cameraTool: $('cameraTool'), tabAudioTool: $('tabAudioTool'),
  sourcesPanel: $('sourcesPanel'), sourceList: $('sourceList'),
  addSourceBtn: $('addSourceBtn'), addSourceLabel: $('addSourceLabel'),
  layoutSelect: $('layoutSelect'), swapBtn: $('swapBtn'), layoutDescription: $('layoutDescription'),
  balanceRow: $('balanceRow'), balanceRange: $('balanceRange'), balanceOut: $('balanceOut'), previewBtn: $('previewBtn'),
  addSoundBtn: $('addSoundBtn'), soundList: $('soundList'),
  liveCorner: $('liveCorner'), cornerDivider: $('cornerDivider'),
  liveSlot: $('liveSlot'), liveControls: $('liveControls'), recPill: $('recPill'), recLabel: $('recLabel'), timer: $('timer'), liveNotes: $('liveNotes'),
  pauseBtn: $('pauseBtn'), pauseLabel: $('pauseLabel'), pauseIcon: $('pauseIcon'), resumeIcon: $('resumeIcon'),
  markerBtn: $('markerBtn'), popoutBtn: $('popoutBtn'), stopBtn: $('stopBtn'),
  levels: $('levels'), micLevel: $('micLevel'), tabLevel: $('tabLevel'), micMeterFill: $('micMeterFill'), tabMeterFill: $('tabMeterFill'),
  micVolume: $('micVolume'), tabVolume: $('tabVolume'), micVolumeOut: $('micVolumeOut'), tabVolumeOut: $('tabVolumeOut'),
  pipNote: $('pipNote'), pipReturnBtn: $('pipReturnBtn'),
  doneView: $('doneView'), doneHeading: $('doneHeading'), fileMeta: $('fileMeta'), saveBtn: $('saveBtn'), saveLabel: $('saveLabel'), newBtn: $('newBtn'),
  trimPanel: $('trimPanel'), trimSummary: $('trimSummary'), trimStart: $('trimStart'), trimEnd: $('trimEnd'),
  trimStartOut: $('trimStartOut'), trimEndOut: $('trimEndOut'), trimStartHere: $('trimStartHere'), trimEndHere: $('trimEndHere'),
  trimHint: $('trimHint'), applyTrimBtn: $('applyTrimBtn'), undoTrimBtn: $('undoTrimBtn'),
  markersPanel: $('markersPanel'), markersSummary: $('markersSummary'), markerList: $('markerList'), markersEmpty: $('markersEmpty'),
  addMarkerHereBtn: $('addMarkerHereBtn'), copyChaptersBtn: $('copyChaptersBtn'),
  settings: $('settings'), settingsBody: $('settingsBody'), settingsSummary: $('settingsSummary'),
  micSelect: $('micSelect'), micProcessing: $('micProcessing'),
  noiseSuppression: $('noiseSuppression'), echoCancellation: $('echoCancellation'), leveling: $('leveling'), systemAudio: $('systemAudio'),
  recordModeInputs: [...document.querySelectorAll('input[name="recordMode"]')],
  qualityField: $('qualityField'), qualitySelect: $('qualitySelect'), qualityHint: $('qualityHint'),
  formatSelect: $('formatSelect'), formatHint: $('formatHint'),
  cameraSelect: $('cameraSelect'),
  autoStopSelect: $('autoStopSelect'),
  savingGroup: $('savingGroup'), storageHint: $('storageHint'),
  saveModeBrowserLabel: $('saveModeBrowserLabel'), saveModeFileLabel: $('saveModeFileLabel'), saveModeMemoryLabel: $('saveModeMemoryLabel'),
  saveModeInputs: [...document.querySelectorAll('input[name="saveMode"]')],
  recovery: $('recovery'), recoveryList: $('recoveryList'),
  toolsRow: $('toolsRow'), repairBtn: $('repairBtn'), repairInput: $('repairInput'),
  confirmDialog: $('confirmDialog'), confirmTitle: $('confirmTitle'), confirmBody: $('confirmBody'), confirmOk: $('confirmOk'), confirmCancel: $('confirmCancel'),
  status: $('status'), shortcutList: $('shortcutList'), playerShortcutList: $('playerShortcutList'), stageToast: $('stageToast'),
};

// ---------- Capabilities ----------
const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder);
// The compositor gives MediaRecorder one video track that never changes, which is what lets
// sources and the camera come and go. Chrome and Edge feed it frames directly (insertable
// streams); other browsers record a canvas.
const canInsertable = 'MediaStreamTrackGenerator' in window && 'MediaStreamTrackProcessor' in window && 'OffscreenCanvas' in window;
const canComposite = canInsertable || (typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype);
// Only Chromium browsers can share a tab's (or the system's) sound. Pages can't ask without
// opening the picker, so this goes by browser.
const canTabAudio = !!navigator.userAgentData;
const canPip = 'documentPictureInPicture' in window;
const canSaveToDisk = 'showSaveFilePicker' in window;
const isMac = /mac/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');

const FORMATS = {
  mp4: {
    video: ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4'],
    audio: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
    videoExt: 'mp4', audioExt: 'm4a', bitrate: 1.3,
  },
  vp9: {
    video: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'],
    audio: ['audio/webm;codecs=opus', 'audio/webm'],
    videoExt: 'webm', audioExt: 'webm', bitrate: 1,
  },
  av1: {
    video: ['video/webm;codecs=av01,opus', 'video/webm;codecs=av1,opus'],
    audio: ['audio/webm;codecs=opus', 'audio/webm'],
    videoExt: 'webm', audioExt: 'webm', bitrate: 0.7,
  },
};
const PRESETS = {
  compact: { fps: 15, width: 1920, height: 1080, video: 1_000_000, audio: 96_000, hint: 'Best for slides, documents, and code.' },
  standard: { fps: 30, width: 1920, height: 1080, video: 2_500_000, audio: 128_000, hint: 'Good for most things.' },
  high: { fps: 60, width: 2560, height: 1440, video: 6_000_000, audio: 160_000, hint: 'For video, games, and animation.' },
};
function supportedMime(formatKey, mode) {
  if (!window.MediaRecorder) return '';
  const list = FORMATS[formatKey][mode === 'audio' ? 'audio' : 'video'];
  return list.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

// ---------- Persistence (best effort) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('screen-recorder:' + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('screen-recorder:' + key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

// ---------- State ----------
// phase: setup | starting | arranging | recording | paused | stopping | done
let phase = 'setup';
let pipWindow = null;
let switching = false;
let rec = null;      // the active recording session
let result = null;   // what the done view shows
const downloadedThisSession = new Set(); // stored recordings saved via a download that may still be reading them
let pendingRecovery = null; // the one leftover recording offered for recovery, if any
let installPrompt = null;

function isLive() { return phase === 'recording' || phase === 'paused' || phase === 'stopping'; }

// ---------- Helpers ----------
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
// With tenths of a second, for trimming.
function formatTimePrecise(ms) {
  const tenths = Math.round(ms / 100);
  const base = formatTime(Math.floor(tenths / 10) * 1000);
  return `${base}.${tenths % 10}`;
}
function spokenTime(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  if (s || !parts.length) parts.push(`${s} second${s === 1 ? '' : 's'}`);
  return parts.join(' ');
}
function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 100 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
function fileStem(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `screen-recording-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}
function stopStream(stream) {
  if (stream) stream.getTracks().forEach((t) => { t.onended = null; t.stop(); });
}
function fileTypeFor(filename) {
  if (/\.m4a$/i.test(filename)) return { description: 'MP4 audio', accept: { 'audio/mp4': ['.m4a'] } };
  if (/\.mp4$/i.test(filename)) return { description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } };
  return { description: 'WebM video', accept: { 'video/webm': ['.webm'] } };
}

let announceTimer;
function announce(message, tone = 'info') {
  // Clear first so repeating the same message is still announced.
  clearTimeout(announceTimer);
  els.status.textContent = '';
  els.status.dataset.tone = tone;
  announceTimer = setTimeout(() => { els.status.textContent = message; }, 60);
}

// ---------- Settings ----------
function radioValue(inputs) { const c = inputs.find((i) => i.checked); return c ? c.value : null; }
function readSettings() {
  return {
    // The mic and camera toggles turn them on and off; their menus pick the device.
    micOn: els.micOn.checked,
    micDevice: els.micSelect.value || 'default',
    micId: els.micOn.checked ? (els.micSelect.value || 'default') : 'none',
    noiseSuppression: els.noiseSuppression.checked,
    echoCancellation: els.echoCancellation.checked,
    leveling: els.leveling.checked,
    // Sound from shared tabs (Chrome and Edge). Audio-only recordings use Add sound instead.
    tabAudio: els.systemAudio.checked,
    systemAudio: els.systemAudio.checked && canTabAudio && radioValue(els.recordModeInputs) !== 'audio',
    recordMode: radioValue(els.recordModeInputs) || 'screen',
    quality: els.qualitySelect.value || 'standard',
    format: currentFormat(),
    cameraOn: els.camOn.checked,
    cameraDevice: els.cameraSelect.value || 'default',
    cameraId: els.camOn.checked ? (els.cameraSelect.value || 'default') : 'none',
    cameraCorner: radioValue([...els.liveCorner.querySelectorAll('input')]) || 'br',
    autoStop: Number(els.autoStopSelect.value) || 0,
    saveMode: currentSaveMode(),
    micVolume: Number(els.micVolume.value),
    tabVolume: Number(els.tabVolume.value),
  };
}
function currentFormat() {
  const mode = radioValue(els.recordModeInputs) || 'screen';
  let f = els.formatSelect.value;
  if (mode === 'audio' && f === 'av1') f = 'vp9';
  if (!supportedMime(f, mode)) f = ['mp4', 'vp9', 'av1'].find((k) => supportedMime(k, mode)) || 'vp9';
  return f;
}
function availableSaveModes() {
  // The first available mode is the default; saving to a chosen file is opt-in.
  const modes = [];
  if (storage.ok) modes.push('browser');
  if (!storage.ok) modes.push('memory');
  if (canSaveToDisk) modes.push('file');
  return modes;
}
function currentSaveMode() {
  const modes = availableSaveModes();
  const checked = radioValue(els.saveModeInputs);
  return checked && modes.includes(checked) ? checked : modes[0];
}
function applySaveModes() {
  const modes = availableSaveModes();
  els.saveModeBrowserLabel.hidden = !modes.includes('browser');
  els.saveModeFileLabel.hidden = !modes.includes('file');
  els.saveModeMemoryLabel.hidden = !modes.includes('memory');
  els.storageHint.hidden = storage.ok;
  const wanted = store.get('settings', {}).saveMode || 'browser';
  const mode = modes.includes(wanted) ? wanted : modes[0];
  els.saveModeInputs.forEach((i) => { i.checked = i.value === mode; });
  updateSettingsUI();
}
function loadSettings() {
  const s = store.get('settings', {});
  for (const key of ['noiseSuppression', 'echoCancellation', 'leveling']) {
    if (typeof s[key] === 'boolean') els[key].checked = s[key];
  }
  const tab = typeof s.tabAudio === 'boolean' ? s.tabAudio : s.systemAudio;
  if (typeof tab === 'boolean') els.systemAudio.checked = tab;
  // Both start off, then remember what you last chose.
  els.micOn.checked = typeof s.micOn === 'boolean' ? s.micOn : !!(s.micId && s.micId !== 'none');
  els.camOn.checked = typeof s.cameraOn === 'boolean' ? s.cameraOn : !!(s.cameraId && s.cameraId !== 'none');
  if (s.recordMode) els.recordModeInputs.forEach((i) => { i.checked = i.value === s.recordMode; });
  if (PRESETS[s.quality]) els.qualitySelect.value = s.quality;
  if (s.autoStop != null) els.autoStopSelect.value = String(s.autoStop);
  if (s.cameraCorner) setRadioGroup(els.liveCorner, s.cameraCorner);
  for (const [key, el] of [['micVolume', els.micVolume], ['tabVolume', els.tabVolume]]) {
    if (typeof s[key] === 'number') el.value = String(s[key]);
  }
  // Default to MP4 where it can be recorded: it opens in QuickTime and nearly everything else.
  els.formatSelect.value = s.format && FORMATS[s.format] ? s.format : (supportedMime('mp4', 'screen') ? 'mp4' : 'vp9');
  els.settings.open = store.get('settingsOpen', false);
  updateVolumeOutputs();
}
function saveSettings() {
  store.set('settings', readSettings());
  updateSettingsUI();
}
function updateSettingsUI() {
  const s = readSettings();
  const audioOnly = s.recordMode === 'audio';

  // Format options: label for the mode, disable what this browser can't record.
  const labels = audioOnly
    ? { mp4: 'MP4 audio (.m4a) · AAC', vp9: 'WebM audio · Opus', av1: 'WebM · AV1' }
    : { mp4: 'MP4 · H.264', vp9: 'WebM · VP9', av1: 'WebM · AV1' };
  for (const opt of els.formatSelect.options) {
    opt.textContent = labels[opt.value];
    opt.disabled = !supportedMime(opt.value, s.recordMode);
    opt.hidden = audioOnly && opt.value === 'av1';
  }
  if (els.formatSelect.value !== s.format) els.formatSelect.value = s.format;
  const formatHints = {
    mp4: audioOnly ? 'Opens in Apple Music, QuickTime, and most apps.' : 'Opens in QuickTime, Photos, and nearly every app.',
    vp9: audioOnly ? 'Smaller files. Plays in browsers and VLC, but not in Apple apps.' : 'Smaller files. Plays in browsers and VLC, but not in QuickTime.',
    av1: 'Smallest files, but uses more processor time. Plays in browsers and VLC, but not in QuickTime.',
  };
  els.formatHint.textContent = formatHints[s.format] + (supportedMime('mp4', s.recordMode) ? '' : ' This browser can’t record MP4.');

  // Quality: shown for screen recordings, with a size estimate.
  els.qualityField.hidden = audioOnly;
  const preset = PRESETS[s.quality];
  const bps = preset.video * FORMATS[s.format].bitrate + preset.audio;
  els.qualityHint.textContent = `${preset.hint} Up to about ${formatBytes((bps / 8) * 3600)} per hour, often less.`;

  const what = audioOnly ? 'Audio only' : `${{ compact: 'Compact', standard: 'Standard', high: 'High' }[s.quality]} ${s.format === 'mp4' ? 'MP4' : s.format === 'av1' ? 'AV1' : 'WebM'}`;
  const saving = { browser: 'Saves as it records', file: 'Saves to a file' }[s.saveMode] || '';
  els.settingsSummary.textContent = [what, saving]
    .filter(Boolean).join(' · ');
}
function updateVolumeOutputs() {
  for (const [input, out, name] of [[els.micVolume, els.micVolumeOut, 'Microphone'], [els.tabVolume, els.tabVolumeOut, 'Tab audio']]) {
    out.textContent = `${input.value}%`;
    input.setAttribute('aria-valuetext', `${input.value}%`);
    input.setAttribute('aria-label', `${name} volume`);
  }
}

// ---------- Devices ----------
async function refreshDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  let devices = [];
  try { devices = await navigator.mediaDevices.enumerateDevices(); }
  catch (err) { console.warn('Could not list devices', err); }
  const saved = store.get('settings', {});
  fillDeviceSelect(els.micSelect, devices.filter((d) => d.kind === 'audioinput'), {
    wanted: els.micSelect.value || saved.micDevice || saved.micId || 'default', defaultLabel: 'Default microphone', askLabel: 'Show all microphones…',
  });
  fillDeviceSelect(els.cameraSelect, devices.filter((d) => d.kind === 'videoinput'), {
    wanted: els.cameraSelect.value || saved.cameraDevice || saved.cameraId || 'default', defaultLabel: 'Default camera', askLabel: 'Show all cameras…',
  });
  updateSettingsUI();
}
function fillDeviceSelect(select, devices, { wanted, defaultLabel, askLabel }) {
  const hasLabels = devices.some((d) => d.label);
  const defaultDevice = devices.find((d) => d.deviceId === 'default');
  const defaultName = defaultDevice && defaultDevice.label ? defaultDevice.label.replace(/^Default\s*-\s*/i, '') : '';
  const options = [['default', defaultName ? `Default (${defaultName})` : defaultLabel]];
  if (hasLabels) {
    for (const d of devices) {
      if (!d.deviceId || d.deviceId === 'default' || d.deviceId === 'communications') continue;
      options.push([d.deviceId, d.label || defaultLabel]);
    }
  }
  // Browsers only name devices once you've allowed access to one.
  if (!hasLabels && devices.length) options.push(['ask', askLabel]);
  select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
  select.value = options.some(([v]) => v === wanted && v !== 'ask') ? wanted : 'default';
  select.dataset.value = select.value;
}
async function requestDeviceAccess(kind) {
  const isCam = kind === 'camera';
  try {
    stopStream(await navigator.mediaDevices.getUserMedia(isCam ? { video: true } : { audio: true }));
    await refreshDevices();
    announce(`${isCam ? 'Camera' : 'Microphone'} access allowed. Choose one from the list.`);
    (isCam ? els.cameraSelect : els.micSelect).focus();
  } catch (err) {
    announce(err.name === 'NotAllowedError'
      ? `${isCam ? 'Camera' : 'Microphone'} access was blocked. You can allow it from the site settings in your browser’s address bar.`
      : `Couldn’t access a ${isCam ? 'camera' : 'microphone'} (${err.message || err.name}).`, 'warn');
  }
}

// ---------- Browser storage (origin private file system) ----------
const storage = {
  ok: false,
  worker: null,
  nextId: 1,
  pending: new Map(),
  dirHandle: null,
  call(type, extra = {}, transfer = []) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, ...extra }, transfer);
    });
  },
  async init() {
    try {
      if (!navigator.storage || !navigator.storage.getDirectory || !window.Worker || location.protocol === 'file:') return false;
      this.worker = new Worker('js/storage-worker.js');
      this.worker.onmessage = (e) => {
        const { id, ok, name, message } = e.data;
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        if (ok) p.resolve();
        else { const err = new Error(message || name || 'Storage error'); err.name = name || 'Error'; p.reject(err); }
      };
      this.worker.onerror = (e) => {
        e.preventDefault();
        for (const p of this.pending.values()) p.reject(new Error('The storage worker stopped.'));
        this.pending.clear();
      };
      await Promise.race([this.call('probe'), new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 5000))]);
      await this.dir();
      this.ok = true;
    } catch (err) {
      console.warn('Browser storage is unavailable', err);
      this.ok = false;
    }
    return this.ok;
  },
  async dir() {
    if (!this.dirHandle) {
      const root = await navigator.storage.getDirectory();
      this.dirHandle = await root.getDirectoryHandle('recordings', { create: true });
    }
    return this.dirHandle;
  },
  async getFile(name) { return (await (await this.dir()).getFileHandle(name)).getFile(); },
  async remove(name) {
    try { await (await this.dir()).removeEntry(name); } catch (err) { console.warn('Could not delete', name, err); }
    meta.remove(name);
  },
  // For use while the page unloads: starts the deletion immediately, without waiting on anything.
  removeNow(name) {
    meta.set(name, { discarded: true }); // if the deletion doesn't finish, the next visit cleans it up
    if (this.dirHandle) this.dirHandle.removeEntry(name).catch(() => {});
  },
  async list() {
    const names = [];
    for await (const h of (await this.dir()).values()) if (h.kind === 'file' && !h.name.startsWith('.')) names.push(h.name);
    return names;
  },
};

// A little bookkeeping per stored recording (kept in localStorage; the files are the source of truth).
const meta = {
  all() { return store.get('recordings', {}); },
  get(name) { return this.all()[name] || {}; },
  set(name, patch) { const all = this.all(); all[name] = { ...(all[name] || {}), ...patch }; store.set('recordings', all); },
  remove(name) { const all = this.all(); delete all[name]; store.set('recordings', all); },
};

// A Web Lock marks a recording as in progress, so another open tab won't offer to "recover" it.
const LOCK_PREFIX = 'screen-recorder:';
function holdLock(name) {
  if (!navigator.locks) return Promise.resolve(() => {});
  return new Promise((acquired) => {
    navigator.locks.request(LOCK_PREFIX + name, () => new Promise((release) => acquired(release)))
      .catch(() => acquired(() => {}));
  });
}
async function heldLocks() {
  try { return new Set(((await navigator.locks.query()).held || []).map((l) => l.name)); }
  catch { return new Set(); }
}

async function openBrowserOutput(name) {
  const release = await holdLock(name);
  try { await storage.call('open', { name }); }
  catch (err) { release(); throw err; }
  meta.set(name, { startedAt: Date.now(), finished: false, saved: false });
  return { kind: 'browser', name, release, queue: Promise.resolve(), bytes: 0, failed: false };
}

async function lowSpaceWarning() {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    const free = quota - usage;
    if (free < 2 * 1024 ** 3) return `Only ${formatBytes(free)} of browser storage is free, which may not be enough for a long recording.`;
  } catch { /* unknown */ }
  return '';
}

// ---------- Output file (save while recording) ----------
async function openOutputFile(filename) {
  const handle = await window.showSaveFilePicker({ suggestedName: filename, id: 'screen-recorder', startIn: 'videos', types: [fileTypeFor(filename)] });
  const writable = await handle.createWritable();
  return { kind: 'file', name: handle.name, handle, writable, queue: Promise.resolve(), bytes: 0, failed: false };
}

// Used when recording never got going.
async function discardOutput(output) {
  if (!output) return;
  if (output.kind === 'browser') {
    try { await storage.call('close'); } catch { /* already closed */ }
    output.release();
    await storage.remove(output.name);
    return;
  }
  try { await output.writable.abort(); } catch { /* already closed */ }
  try {
    const file = await output.handle.getFile();
    if (file.size === 0 && output.handle.remove) await output.handle.remove(); // only remove it if it's empty
  } catch { /* leave it */ }
}

// Writes go through a queue so chunks land in order.
function writeChunk(session, data) {
  const out = session.output;
  out.bytes += data.size;
  const write = out.kind === 'file'
    ? () => out.writable.write(data)
    : async () => { const buf = await data.arrayBuffer(); await storage.call('write', { buf }, [buf]); };
  out.queue = out.queue.then(write).catch((err) => {
    if (out.failed) return;
    out.failed = true;
    console.error('Writing failed', err);
    const full = err && err.name === 'QuotaExceededError';
    announce(out.kind === 'file'
      ? `Couldn’t write to ${out.name}${full ? ' because the disk is full' : ''}. Recording stopped.`
      : `Couldn’t keep saving${full ? ' because storage is full' : ''}, so the recording was stopped. Everything up to that point is kept.`, 'error');
    stopRecording();
  });
}

// ---------- Capture ----------
function displayOptions(settings) {
  const audio = settings.systemAudio ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false;
  // Audio-only recordings still go through the screen picker to get tab audio; keep the unused video tiny.
  const preset = PRESETS[settings.quality];
  const video = settings.recordMode === 'audio'
    ? { displaySurface: 'browser', width: { max: 640 }, height: { max: 360 }, frameRate: { max: 1 } }
    : { displaySurface: 'browser', cursor: 'always', frameRate: { ideal: preset.fps, max: preset.fps }, width: { max: preset.width }, height: { max: preset.height } };
  return {
    video,
    audio,
    selfBrowserSurface: 'exclude',  // don't offer this tab (avoids an endless mirror)
    surfaceSwitching: 'include',    // Chromium: native "Share this tab instead"
    systemAudio: 'include',
  };
}

async function getMic(settings) {
  const audio = { noiseSuppression: settings.noiseSuppression, echoCancellation: settings.echoCancellation, autoGainControl: false };
  if (settings.micId !== 'default') audio.deviceId = { exact: settings.micId };
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio }), fellBack: false };
  } catch (err) {
    if (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') {
      delete audio.deviceId; // the chosen device is gone; use the default one
      return { stream: await navigator.mediaDevices.getUserMedia({ audio }), fellBack: true };
    }
    throw err;
  }
}

async function getCamera(settings) {
  const video = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } };
  if (settings.cameraId !== 'default') video.deviceId = { exact: settings.cameraId };
  try { return await navigator.mediaDevices.getUserMedia({ video }); }
  catch (err) {
    if (err.name === 'OverconstrainedError' || err.name === 'NotFoundError') { delete video.deviceId; return navigator.mediaDevices.getUserMedia({ video }); }
    throw err;
  }
}

// A safety limiter for the final mix, so turning a source above 100% can't distort.
// Below its threshold it leaves the sound untouched: the compressor's automatic makeup gain
// (defined by the Web Audio spec) is cancelled out, and a soft clipper catches the brief
// overshoot before the compressor reacts.
const LIMITER = { threshold: -2, ratio: 20 };
function createLimiter(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = LIMITER.threshold;
  comp.knee.value = 0;
  comp.ratio.value = LIMITER.ratio;
  comp.attack.value = 0.001;
  comp.release.value = 0.1;
  const fullRange = 10 ** ((LIMITER.threshold - LIMITER.threshold / LIMITER.ratio) / 20);
  const undoMakeup = ctx.createGain();
  undoMakeup.gain.value = fullRange ** 0.6;
  const clip = ctx.createWaveShaper();
  const n = 4096, curve = new Float32Array(n), knee = 0.9;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    // Straight line up to the knee, then a smooth bend that never passes 1.
    curve[i] = a <= knee ? x : Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
  }
  clip.curve = curve;
  comp.connect(undoMakeup).connect(clip);
  return { input: comp, output: clip };
}

// Mixes the microphone and the shared tabs' audio into one track, each with its own volume.
function createMixer(settings) {
  const ctx = new AudioContext();
  const out = ctx.createMediaStreamDestination();
  const limiter = createLimiter(ctx);
  limiter.output.connect(out);
  const dest = limiter.input; // everything feeds the limiter
  const analyser = () => { const a = ctx.createAnalyser(); a.fftSize = 1024; return a; };
  const micBus = ctx.createGain();
  micBus.gain.value = (1.5 * settings.micVolume) / 100;
  const tabBus = ctx.createGain();
  tabBus.gain.value = (0.7 * settings.tabVolume) / 100;
  const tabAnalyser = analyser();
  tabBus.connect(dest);
  tabBus.connect(tabAnalyser);
  let micSrc = null, micAnalyser = null;
  const tabSrcs = new Map(); // source id -> audio node

  function setMic(stream) {
    if (micSrc) micSrc.disconnect();
    micSrc = null;
    micAnalyser = null;
    if (!stream) return;
    micSrc = ctx.createMediaStreamSource(stream);
    let last = micSrc.connect(micBus);
    if (settings.leveling) {
      // A gentle leveler: keeps quiet and loud speech at a similar volume.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -50;
      comp.knee.value = 40;
      comp.ratio.value = 12;
      comp.attack.value = 0.01;
      comp.release.value = 0.25;
      last = last.connect(comp);
    }
    last.connect(dest);
    micAnalyser = analyser();
    last.connect(micAnalyser);
  }
  function setDisplay(id, stream) {
    const old = tabSrcs.get(id);
    tabSrcs.delete(id);
    const [track] = stream ? stream.getAudioTracks() : [];
    if (track) {
      const src = ctx.createMediaStreamSource(new MediaStream([track]));
      src.connect(tabBus);
      tabSrcs.set(id, src);
    }
    // Connect the new source before dropping the old one so the output never goes idle.
    if (old) old.disconnect();
  }
  ctx.resume().catch(() => {});

  const ramp = (param, value) => param.setTargetAtTime(value, ctx.currentTime, 0.03);
  return {
    track: out.stream.getAudioTracks()[0],
    get micAnalyser() { return micAnalyser; },
    tabAnalyser,
    get hasTabAudio() { return tabSrcs.size > 0; },
    setMic,
    setDisplay,
    setMicVolume(pct) { ramp(micBus.gain, (1.5 * pct) / 100); },
    setTabVolume(pct) { ramp(tabBus.gain, (0.7 * pct) / 100); },
    close() { ctx.close().catch(() => {}); },
  };
}

// ---------- Layout ----------
// Fits one or two sources into a W×H frame. Two sources are drawn at the same scale, so text in
// both shrinks by the same amount, and as large as they'll go. "Automatic" picks side by side or
// one above the other, whichever lets them be bigger.
const LAYOUTS = { auto: 'Automatic', side: 'Side by side', stacked: 'One above the other' };
// ratio is how much bigger the first source is drawn than the second (1 = the same scale).
function computeLayout(sizes, W, H, mode, ratio = 1) {
  const center = (w, h) => ({ x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w: Math.round(w), h: Math.round(h) });
  if (sizes.length === 1) {
    const [a] = sizes;
    const s = Math.min(W / a.w, H / a.h);
    return { mode: 'single', scale: s, rects: [center(a.w * s, a.h * s)] };
  }
  const [a, b] = sizes;
  const gap = Math.round(W * 0.01);
  const r = ratio;
  const side = Math.min((W - gap) / (r * a.w + b.w), H / Math.max(r * a.h, b.h));
  const stacked = Math.min(W / Math.max(r * a.w, b.w), (H - gap) / (r * a.h + b.h));
  const use = mode === 'side' || mode === 'stacked' ? mode : (side >= stacked ? 'side' : 'stacked');
  const s = use === 'side' ? side : stacked;
  const aw = a.w * s * r, ah = a.h * s * r, bw = b.w * s, bh = b.h * s;
  let rects;
  if (use === 'side') {
    const x0 = (W - (aw + gap + bw)) / 2;
    rects = [
      { x: Math.round(x0), y: Math.round((H - ah) / 2), w: Math.round(aw), h: Math.round(ah) },
      { x: Math.round(x0 + aw + gap), y: Math.round((H - bh) / 2), w: Math.round(bw), h: Math.round(bh) },
    ];
  } else {
    const y0 = (H - (ah + gap + bh)) / 2;
    rects = [
      { x: Math.round((W - aw) / 2), y: Math.round(y0), w: Math.round(aw), h: Math.round(ah) },
      { x: Math.round((W - bw) / 2), y: Math.round(y0 + ah + gap), w: Math.round(bw), h: Math.round(bh) },
    ];
  }
  return { mode: use, scale: Math.min(s, s * r), rects };
}

// ---------- Compositor ----------
// Draws up to two sources and the camera into one frame and gives MediaRecorder a single video
// track that never changes, whatever happens to the sources behind it. The frame keeps a fixed
// 16:9 size: MP4's H.264 can't change resolution part way through, and a fixed frame lets
// sources and the camera come and go during a recording.
//
// The drawing is the same in every browser; only how frames come in and go out differs:
// - Chrome and Edge (insertable streams): each source's frames arrive as they're captured and
//   finished frames go straight to the recording, so background tabs don't slow it down and
//   nothing is copied through hidden video players.
// - Firefox and Safari: hidden video players feed a canvas whose stream is recorded, redrawn on a
//   timer that runs in a worker, because timers on the page itself slow down in background tabs.
function imageSize(img) {
  return img.displayWidth ? { w: img.displayWidth, h: img.displayHeight } : { w: img.videoWidth, h: img.videoHeight };
}

// Draws the camera as a circle in a corner of the frame.
function drawBubble(ctx, cam, w, h, corner) {
  const short = Math.min(w, h);
  const d = Math.round(short * 0.24), m = Math.round(short * 0.03);
  const x = corner.includes('l') ? m : w - m - d;
  const y = corner.includes('t') ? m : h - m - d;
  const { w: cw, h: ch } = imageSize(cam);
  const s = Math.min(cw, ch);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(cam, (cw - s) / 2, (ch - s) / 2, s, s, x, y, d, d);
  ctx.restore();
  ctx.beginPath();
  const lw = Math.max(2, Math.round(d * 0.02));
  ctx.arc(x + d / 2, y + d / 2, d / 2 - lw / 2, 0, Math.PI * 2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();
}

// A timer that keeps its pace in background tabs (it runs in a worker).
function createWorkerTimer(ms, onTick) {
  const code = 'let t; onmessage = (e) => { clearInterval(t); if (e.data > 0) t = setInterval(() => postMessage(0), e.data); };';
  try {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = onTick;
    worker.postMessage(ms);
    return () => worker.terminate();
  } catch {
    const t = setInterval(onTick, ms);
    return () => clearInterval(t);
  }
}

// Frames in and out for Chrome and Edge.
function createFramePump() {
  const generator = new MediaStreamTrackGenerator({ kind: 'video' });
  const writer = generator.writable.getWriter();
  return {
    track: generator,
    canvas: (w, h) => new OffscreenCanvas(w, h),
    // Calls onFrame with each new frame (a VideoFrame) until stop() is called or the track ends.
    watch(track, onFrame, onEnd) {
      const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
      let live = true;
      (async () => {
        try {
          for (;;) {
            const { value: frame, done } = await reader.read();
            if (done) break;
            if (!live) { frame.close(); break; }
            onFrame(frame);
          }
        } catch (err) {
          console.warn('A source stopped', err);
        } finally {
          reader.cancel().catch(() => {});
          if (live && onEnd) onEnd();
        }
      })();
      return () => { live = false; reader.cancel().catch(() => {}); };
    },
    release(img) { if (img) img.close(); },
    ready(img) { return !!img; },
    async write(canvas) {
      const frame = new VideoFrame(canvas, { timestamp: Math.round(performance.now() * 1000) });
      try { await writer.write(frame); } catch { frame.close(); }
    },
    stop() { writer.close().catch(() => {}); generator.stop(); },
  };
}

// Frames in and out for Firefox and Safari.
function createCanvasPump(fps) {
  let output = null;
  return {
    get track() { return output; },
    canvas(w, h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      output = c.captureStream(fps).getVideoTracks()[0];
      return c;
    },
    // A hidden video player stands in for the frames: it always shows the latest one.
    watch(track, onFrame, onEnd) {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.srcObject = new MediaStream([track]);
      v.play().catch(() => {});
      const ready = () => onFrame(v);
      v.addEventListener('loadeddata', ready, { once: true });
      const ended = () => { if (onEnd) onEnd(); };
      track.addEventListener('ended', ended);
      return () => { track.removeEventListener('ended', ended); v.pause(); v.srcObject = null; };
    },
    release() {},
    ready(img) { return !!img && img.videoWidth > 0; },
    write() {},
    stop() { if (output) output.stop(); },
  };
}

function createCompositor({ width, height, corner, fps, onLayout }) {
  const fast = canInsertable;
  const pump = fast ? createFramePump() : createCanvasPump(fps);
  const canvas = pump.canvas(Math.max(2, width & ~1), Math.max(2, height & ~1));
  const ctx = canvas.getContext('2d', { alpha: false });
  const track = pump.track;
  track.contentHint = 'detail'; // favour sharp text over smooth motion
  let W = canvas.width, H = canvas.height;
  const slots = []; // { id, img, unwatch }
  let camera = null; // { img, unwatch }
  let layoutMode = 'auto', balance = 1;
  let stopped = false, writing = false, pending = false;
  let lastLayout = null, lastKey = '', lastDraw = 0;

  function draw() {
    const live = slots.filter((s) => pump.ready(s.img));
    const cam = camera && pump.ready(camera.img) ? camera.img : null;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (!live.length) {
      // Nothing shared: the camera fills the frame (cropped to fit), or the frame stays black.
      if (cam) {
        const { w: cw, h: ch } = imageSize(cam);
        const sc = Math.max(W / cw, H / ch);
        const sw = W / sc, sh = H / sc;
        ctx.drawImage(cam, (cw - sw) / 2, (ch - sh) / 2, sw, sh, 0, 0, W, H);
      }
      lastLayout = { mode: camera ? 'camera' : 'empty', scale: 1, rects: [], ids: [], sizes: [], width: W, height: H, requested: layoutMode };
    } else {
      const sizes = live.map((s) => imageSize(s.img));
      const layout = computeLayout(sizes, W, H, layoutMode, balance);
      live.forEach((s, i) => { const r = layout.rects[i]; ctx.drawImage(s.img, r.x, r.y, r.w, r.h); });
      if (cam) drawBubble(ctx, cam, W, H, corner);
      lastLayout = { ...layout, ids: live.map((s) => s.id), sizes, width: W, height: H, requested: layoutMode };
    }
    // Tell the page when the arrangement changes (not on every frame).
    const key = `${layoutMode}|${balance}|${lastLayout.mode}|${lastLayout.ids.join(',')}|${lastLayout.sizes.map((z) => `${Math.round(z.w / 8)}x${Math.round(z.h / 8)}`).join(',')}|${W}x${H}`;
    if (key !== lastKey) { lastKey = key; if (onLayout) queueMicrotask(() => onLayout(lastLayout)); }
    lastDraw = performance.now();
  }
  // Chrome and Edge: draw when a new frame arrives and send it to the recording. Composited
  // frames get their own steady clock, since screen and camera timestamps differ.
  async function emit() {
    if (stopped) return;
    if (writing) { pending = true; return; } // the encoder is busy; draw again when it's free
    draw();
    writing = true;
    await pump.write(canvas);
    writing = false;
    if (pending && !stopped) { pending = false; emit(); }
  }
  // With a camera, its frames set the pace; otherwise each new screen frame does.
  function changed(fromCamera) {
    if (!fast) return; // the timer below redraws
    if (fromCamera || !(camera && camera.img)) emit();
  }
  // Keep frames coming when nothing changes, such as an empty frame or a still screen: at least
  // five a second (Chrome and Edge, where sparser frames hold up saving as you record), or at the
  // frame rate (other browsers).
  const stopTimer = fast
    ? createWorkerTimer(100, () => { if (!stopped && performance.now() - lastDraw > 190) emit(); })
    : createWorkerTimer(Math.round(1000 / fps), () => { if (!stopped) draw(); });

  function watchSlot(slot, t) {
    slot.unwatch = pump.watch(t, (img) => {
      if (stopped || !slots.includes(slot)) { pump.release(img); return; }
      if (slot.img !== img) pump.release(slot.img);
      slot.img = img;
      changed(false);
    });
  }

  return {
    track,
    addSource(id, t) {
      const slot = { id, img: null, unwatch: null };
      slots.push(slot);
      watchSlot(slot, t);
    },
    // Keeps showing the old picture until the new source's first frame arrives.
    replaceSource(id, t) {
      const slot = slots.find((s) => s.id === id);
      if (!slot) return;
      if (slot.unwatch) slot.unwatch();
      watchSlot(slot, t);
    },
    removeSource(id) {
      const i = slots.findIndex((s) => s.id === id);
      if (i < 0) return;
      const [slot] = slots.splice(i, 1);
      if (slot.unwatch) slot.unwatch();
      pump.release(slot.img);
      slot.img = null;
      changed(false);
    },
    swap() { slots.reverse(); changed(false); },
    // Only before recording: H.264 can't change size part way through.
    resize(w, h) {
      w = Math.max(2, w & ~1); h = Math.max(2, h & ~1);
      if (w === W && h === H) return;
      canvas.width = W = w;
      canvas.height = H = h;
      lastKey = '';
      changed(false);
    },
    setLayout(mode) { layoutMode = mode; changed(false); },
    get layoutMode() { return layoutMode; },
    setBalance(r) { balance = r; changed(false); },
    get balance() { return balance; },
    // Turning the camera on or off (or switching cameras); null removes it.
    setCamera(t) {
      const old = camera;
      camera = null;
      if (old) { if (old.unwatch) old.unwatch(); pump.release(old.img); }
      if (t) {
        const cam = { img: null, unwatch: null };
        camera = cam;
        cam.unwatch = pump.watch(t, (img) => {
          if (stopped || camera !== cam) { pump.release(img); return; }
          if (cam.img !== img) pump.release(cam.img);
          cam.img = img;
          changed(true);
        });
      }
      changed(false);
    },
    setCorner(c) { corner = c; changed(false); },
    layoutInfo() { return lastLayout; },
    stop() {
      stopped = true;
      stopTimer();
      for (const s of [...slots, ...(camera ? [camera] : [])]) { if (s.unwatch) s.unwatch(); pump.release(s.img); s.img = null; }
      camera = null;
      pump.stop();
    },
  };
}

// ---------- Sources ----------
let sourceSeq = 0;
function surfaceName(source) {
  return { browser: 'a tab', window: 'a window', monitor: 'a screen' }[source.surface] || 'a shared source';
}
// Browsers don't tell pages the title of a shared window or tab, so you can name each source.
function sourceLabel(index, source) { return `${source.name || `Source ${index + 1}`} (${surfaceName(source)})`; }

// Opens the browser's picker. keepFocus keeps you on this page instead of jumping to what you
// shared (Chrome), which is what you want while arranging or adding a second source.
async function pickSource(settings, { keepFocus = false } = {}) {
  const opts = displayOptions(settings);
  let controller = null;
  if (keepFocus && 'CaptureController' in window) { controller = new CaptureController(); opts.controller = controller; }
  const stream = await navigator.mediaDevices.getDisplayMedia(opts);
  if (controller) { try { controller.setFocusBehavior('no-focus-change'); } catch { /* not a tab or window */ } }
  const track = stream.getVideoTracks()[0];
  track.contentHint = 'detail';
  const surface = (track.getSettings && track.getSettings().displaySurface) || '';
  return { id: ++sourceSeq, stream, track, surface, name: '' };
}

// How big a source will look, compared with on your screen, if the video is watched full screen
// on a screen like yours. It's an estimate from pixel sizes: the app can't see the text itself.
function relativeSize(source, rect, frameW, outputW) {
  const dpr = window.devicePixelRatio || 1;
  let nativeW = frameW;
  try {
    const caps = source.track.getCapabilities ? source.track.getCapabilities() : null;
    const max = caps && caps.width && caps.width.max;
    if (max && max >= frameW && max <= frameW * 4 && max <= 8192) nativeW = max;
  } catch { /* use the frame size */ }
  const logicalW = source.surface === 'monitor' ? screen.width : nativeW / dpr;
  return (rect.w / outputW) * (screen.width / logicalW);
}

function describeLayout() {
  if (!rec || !rec.compositor) return '';
  const info = rec.compositor.layoutInfo();
  if (!info) return '';
  const shown = rec.sources.filter((s) => info.ids.includes(s.id));
  if (!shown.length) return rec.camStream ? 'Your camera fills the frame.' : '';
  const pct = shown.map((s) => {
    const i = info.ids.indexOf(s.id);
    return Math.round(relativeSize(s, info.rects[i], info.sizes[i].w, info.width) * 100);
  });
  const names = shown.map((s) => sourceLabel(rec.sources.indexOf(s), s).replace(/^Source/, 'source'));
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const parts = [];
  if (shown.length === 2) {
    const how = info.mode === 'side' ? 'Side by side' : 'One above the other';
    parts.push(`${how}${info.requested === 'auto' ? ', chosen automatically because it gives them the most room' : ''}.`);
    parts.push(info.mode === 'side'
      ? `${cap(names[0])} is on the left and ${names[1]} is on the right.`
      : `${cap(names[0])} is on top and ${names[1]} is below it.`);
    parts.push(Math.abs(pct[0] - pct[1]) <= 5
      ? `Both will look about ${Math.round((pct[0] + pct[1]) / 2)}% as big as they do on your screen.`
      : `${cap(names[0])} will look about ${pct[0]}% as big as it does on your screen, and ${names[1]} about ${pct[1]}%.`);
  } else {
    parts.push(`${cap(names[0])} fills the frame${pct[0] < 100 ? `, and will look about ${pct[0]}% as big as it does on your screen` : ''}.`);
  }
  const small = shown.filter((s, i) => pct[i] < 60).map((s) => names[shown.indexOf(s)]);
  if (small.length) {
    parts.push(`Text in ${small.join(' and ')} may be hard to read. Making ${small.length > 1 ? 'those windows' : 'that window'} narrower, or ${small.length > 1 ? 'their' : 'its'} text bigger, would help.`);
  }
  return parts.join(' ');
}

function watchSource(source) {
  source.track.onended = () => {
    if (!rec || switching || !rec.sources.includes(source)) return;
    const index = rec.sources.indexOf(source);
    const label = sourceLabel(index, source);
    // The recording carries on whatever is left, even nothing; before recording, an empty
    // main screen goes back to the start.
    removeSourceNow(source);
    if (phase === 'arranging' && sessionIsEmpty()) { cancelArrange(`${label} stopped sharing.`); return; }
    announce(`${label} stopped sharing, so it was removed.${afterRemoval()}${isLive() ? ' Recording continues.' : ''}`);
  };
}
function removeSourceNow(source) {
  rec.sources.splice(rec.sources.indexOf(source), 1);
  if (rec.compositor) rec.compositor.removeSource(source.id);
  if (rec.mixer) rec.mixer.setDisplay(source.id, null);
  stopStream(source.stream);
  renderSources(true);
  render();
}

// What's shown once a source has gone.
function afterRemoval() {
  if (!rec || !rec.compositor || rec.sources.length) return '';
  return rec.camStream ? ' Your camera fills the frame.' : ' Nothing is showing now.';
}

// Sources don't apply to audio-only recordings.
function multiSourceMode() {
  if (rec) return !!rec.compositor;
  return canComposite && readSettings().recordMode !== 'audio';
}

async function addSource() {
  if (switching) return;
  if (!rec && !(phase === 'setup' && multiSourceMode() && ensureSession())) return;
  if (!rec.compositor || rec.sources.length >= 2) return;
  let added = false;
  const first = !rec.sources.length;
  switching = true;
  render();
  announce(`Choose a ${first ? '' : 'second '}window, tab, or screen. You’ll stay on this page${isLive() || first ? '' : ', and nothing is recorded yet'}.`);
  try {
    const s = await pickSource(rec.settings, { keepFocus: true });
    if (!rec) { stopStream(s.stream); return; }
    rec.sources.push(s);
    rec.compositor.addSource(s.id, s.track);
    if (rec.mixer) rec.mixer.setDisplay(s.id, s.stream);
    watchSource(s);
    await layoutIncludes(s.id);
    renderSources(true);
    announce(first && phase === 'arranging'
      ? `Sharing ${surfaceName(s)}. Nothing is recorded until you press Record. ${describeLayout()}`
      : `Added ${sourceLabel(rec.sources.indexOf(s), s).replace(/^Source/, 'source')}. ${describeLayout()}`);
    added = true;
  } catch (err) {
    announce(err.name === 'NotAllowedError' ? 'No source was added.' : `Couldn’t add a source: ${err.message || err.name}`,
      err.name === 'NotAllowedError' ? 'info' : 'error');
  } finally {
    switching = false;
    render();
    renderSources(true);
    if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('', { quiet: true });
    // The add button hides once there are two sources, so move on to what comes next.
    if (added && document.activeElement === els.addSourceBtn || (added && document.activeElement === document.body)) {
      (phase === 'arranging' ? els.startBtn : els.layoutSelect.querySelector('input:checked')).focus();
    }
  }
}

async function replaceSource(source) {
  if (!rec || switching || !rec.sources.includes(source)) return;
  switching = true;
  render();
  const index = rec.sources.indexOf(source);
  announce(`Choose what to show instead of ${sourceLabel(index, source).replace(/^Source/, 'source')}.`);
  try {
    const next = await pickSource(rec.settings, { keepFocus: true });
    if (!rec || !rec.sources.includes(source)) { stopStream(next.stream); return; }
    next.id = source.id; // it takes the old one's place in the layout (its name was for the old one)
    if (rec.compositor) rec.compositor.replaceSource(source.id, next.track);
    if (rec.mixer) rec.mixer.setDisplay(source.id, next.stream);
    rec.sources[index] = next;
    watchSource(next);
    stopStream(source.stream);
    if (!rec.compositor && !rec.audioOnly) { els.video.srcObject = next.stream; els.video.play().catch(() => {}); }
    renderSources(true);
    announce(`${sourceLabel(index, next)} is now shown.${rec.compositor ? ' ' + describeLayout() : ''}`);
  } catch (err) {
    announce(err.name === 'NotAllowedError' ? 'Kept the current source.' : `Couldn’t switch source: ${err.message || err.name}`,
      err.name === 'NotAllowedError' ? 'info' : 'error');
  } finally {
    switching = false;
    render();
    const live = rec && rec.sources[index];
    if (live && live.track.readyState === 'ended' && live.track.onended) live.track.onended();
  }
}

function removeSource(source) {
  if (!rec || !rec.sources.includes(source)) return;
  const label = sourceLabel(rec.sources.indexOf(source), source);
  removeSourceNow(source);
  // Before recording, removing the last thing goes back to an empty main screen.
  if (phase === 'arranging' && sessionIsEmpty()) cancelArrange(`${label} removed. Nothing is shared now.`, { quiet: true });
  else announce(`${label} removed.${rec.sources.length ? ' ' + describeLayout() : afterRemoval()}`);
  els.addSourceBtn.focus();
}

function swapSources() {
  if (!rec || !rec.compositor || rec.sources.length < 2) return;
  rec.sources.reverse();
  rec.compositor.swap();
  setBalanceIndex(BALANCE.length - 1 - balanceIndex(), { quiet: true }); // the bigger one stays bigger
  setTimeout(() => { renderSources(true); announce(`Swapped. ${describeLayout()}`); }, 120);
}

function setLayoutMode(mode) {
  if (!rec || !rec.compositor) return;
  rec.compositor.setLayout(mode);
  store.set('layout', mode);
  setTimeout(() => { renderSources(); announce(describeLayout()); }, 120);
}

// Size balance: how much bigger source 1 is than source 2. Remembered for next time, so a
// balance someone said looked good can be reused without seeing it.
const BALANCE = [0.5, 0.6, 0.7, 0.85, 1, 1.2, 1.4, 1.7, 2];
function balanceIndex() {
  const i = Number(store.get('balance', 4));
  return Number.isInteger(i) && i >= 0 && i < BALANCE.length ? i : 4;
}
function balanceText() {
  if (!rec || !rec.compositor || rec.sources.length < 2) return 'Same scale';
  const info = rec.compositor.layoutInfo();
  const r = BALANCE[balanceIndex()];
  const names = rec.sources.map((src, i) => src.name || `source ${i + 1}`);
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const times = (x) => Math.round(x * 10) / 10;
  const how = r === 1 ? 'Same scale' : r > 1 ? `${cap(names[0])} ${times(r)} times as big` : `${cap(names[1])} ${times(1 / r)} times as big`;
  if (!info || info.ids.length < 2) return how;
  // Work out the sizes now rather than waiting for the next frame.
  const sizes = rec.sources.map((src) => info.sizes[info.ids.indexOf(src.id)]);
  if (sizes.some((z) => !z)) return how;
  const layout = computeLayout(sizes, info.width, info.height, rec.compositor.layoutMode, r);
  const pct = rec.sources.map((src, i) => Math.round(relativeSize(src, layout.rects[i], sizes[i].w, info.width) * 100));
  return `${how}. ${cap(names[0])} ${pct[0]}%, ${names[1]} ${pct[1]}% of its size on your screen`;
}
function setBalanceIndex(i, { quiet = false } = {}) {
  store.set('balance', i);
  els.balanceRange.value = String(i);
  if (rec && rec.compositor) rec.compositor.setBalance(BALANCE[i]);
  updateBalanceText();
  if (!quiet) setTimeout(() => { if (rec) renderSources(); }, 120);
}
function updateBalanceText() {
  const t = balanceText();
  els.balanceRange.setAttribute('aria-valuetext', t);
  els.balanceOut.textContent = t.split('. ')[0];
}

function renameSource(src, value) {
  if (!rec || !rec.sources.includes(src)) return;
  const index = rec.sources.indexOf(src);
  const before = sourceLabel(index, src);
  if (value.trim().slice(0, 60) === src.name) return;
  src.name = value.trim().slice(0, 60);
  const focused = document.activeElement && document.activeElement.classList.contains('source-name-input');
  renderSources(true);
  updateBalanceText();
  if (focused) els.sourceList.querySelectorAll('.source-name-input')[index].focus();
  announce(src.name ? `${before} is now called ${src.name}.` : `${before} no longer has a name.`);
}

// Sighted people can check readability by viewing the preview at the size viewers will see it.
function previewFullScreen() {
  if (!els.video.requestFullscreen || els.video.hidden) return;
  els.video.requestFullscreen().then(() => announce('Showing the preview full screen. Press Escape to go back.'))
    .catch((err) => announce(`Couldn’t show the preview full screen: ${err.message || err.name}`, 'error'));
}

// Waits (briefly) until a newly added source has been drawn, so its description is accurate.
function layoutIncludes(id) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const check = () => {
      const info = rec && rec.compositor && rec.compositor.layoutInfo();
      if (!rec || (info && info.ids.includes(id)) || performance.now() - t0 > 3000) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}

// --- The camera and mic, on the main screen and while recording ---
// The camera toggle really turns the camera (and its light) on and off, like in a video call.
// With nothing else shared, the camera fills the frame; with a source, it's a circle in a corner.
let cameraBusy = false, micBusy = false;
function cameraAllowed() { return canComposite && (rec ? !!rec.compositor : readSettings().recordMode !== 'audio'); }
async function setCameraOn(on, { say = false } = {}) {
  els.camOn.checked = on;
  saveSettings();
  if (!cameraAllowed() || phase === 'stopping') { render(); return; }
  if (on) {
    // Turning it on from an empty main screen starts setting up, with the camera as the preview.
    if (!rec && !ensureSession({ openCam: false })) return;
    await openCamera();
  } else if (rec && rec.camStream) {
    closeCamera();
  } else if (say) {
    announce('Camera off.');
  }
  render();
}
async function openCamera({ quiet = false } = {}) {
  if (!rec || !rec.compositor || rec.camStream || cameraBusy) return;
  const session = rec;
  cameraBusy = true;
  render();
  try {
    const cam = await getCamera({ cameraId: els.cameraSelect.value || 'default' });
    if (rec !== session || !els.camOn.checked) { stopStream(cam); return; }
    attachCamera(cam);
    refreshDevices(); // names become available once access is allowed
    if (!quiet) announce(rec.sources.length ? `Camera on, in the ${cornerName(rec.corner)} corner.` : 'Camera on. It fills the frame.');
  } catch (err) {
    els.camOn.checked = false;
    saveSettings();
    announce(err.name === 'NotAllowedError' ? 'Camera access was blocked.' : `Couldn’t open the camera: ${err.message || err.name}`, 'error');
  } finally {
    cameraBusy = false;
    render();
    renderSources();
    if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('', { quiet: true });
  }
}
// Shows a camera stream, replacing (and turning off) the one before it, if any.
function attachCamera(cam) {
  const old = rec.camStream;
  rec.camStream = cam;
  rec.compositor.setCamera(cam.getVideoTracks()[0]);
  if (old) stopStream(old);
  cam.getVideoTracks()[0].onended = () => {
    if (!rec || rec.camStream !== cam) return;
    rec.camStream = null;
    rec.compositor.setCamera(null);
    els.camOn.checked = false;
    render();
    renderSources();
    announce('The camera was disconnected.', 'warn');
    if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('', { quiet: true });
  };
}
function closeCamera() {
  const cam = rec.camStream;
  rec.camStream = null;
  rec.compositor.setCamera(null);
  stopStream(cam); // turns the camera (and its light) off
  renderSources();
  if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('Camera off.', { quiet: true });
  else announce(rec.sources.length ? 'Camera off.' : 'Camera off. Nothing is showing now.');
}

// The mic toggle: before recording it's just remembered; while recording it opens or closes
// the microphone, so it can come and go (and its indicator turns off with it).
async function setMicOn(on, { say = false } = {}) {
  els.micOn.checked = on;
  saveSettings();
  render();
  if (rec && isLive() && phase !== 'stopping') {
    if (on && !rec.micStream) {
      const ok = await openMic(rec);
      if (ok && say) announce('Mic on.');
    } else if (!on && rec.micStream) {
      closeMic(rec);
      if (say) announce('Mic off.');
    }
  } else if (say) {
    announce(on ? 'Mic on.' : 'Mic off.');
  }
}
// Opens the chosen microphone and feeds it into the mix. Returns true if it worked.
async function openMic(session, warnings = null) {
  if (micBusy) return false;
  micBusy = true;
  try {
    const mic = await getMic({ ...session.settings, micId: els.micSelect.value || 'default' });
    if (rec !== session) { stopStream(mic.stream); return false; }
    const old = session.micStream;
    session.micStream = mic.stream;
    if (session.mixer) session.mixer.setMic(mic.stream);
    stopStream(old);
    if (mic.fellBack) {
      const note = 'The chosen microphone wasn’t available, so the default one is being used.';
      if (warnings) warnings.push(note); else announce(note, 'warn');
    }
    mic.stream.getAudioTracks()[0].onended = () => {
      if (session.micStream !== mic.stream) return;
      if (session.mixer) session.mixer.setMic(null);
      session.micStream = null;
      els.micOn.checked = false;
      render();
      announce('The microphone was disconnected.', 'warn');
    };
    refreshDevices();
    return true;
  } catch (err) {
    console.warn('Microphone failed', err);
    const note = err.name === 'NotAllowedError'
      ? 'Microphone access was blocked, so it isn’t being recorded.'
      : 'No microphone could be opened, so it isn’t being recorded.';
    els.micOn.checked = false;
    if (warnings) warnings.push(note); else announce(note, 'error');
    return false;
  } finally {
    micBusy = false;
    render();
  }
}
function closeMic(session) {
  if (session.mixer) session.mixer.setMic(null);
  stopStream(session.micStream);
  session.micStream = null;
  render();
}

// Choosing a different mic or camera from its menu switches straight away if it's in use.
async function onDeviceChoice(kind) {
  const select = kind === 'camera' ? els.cameraSelect : els.micSelect;
  if (select.value === 'ask') {
    select.value = select.dataset.value || 'default';
    requestDeviceAccess(kind);
    return;
  }
  select.dataset.value = select.value;
  saveSettings();
  const name = select.selectedOptions[0] ? select.selectedOptions[0].textContent : '';
  if (kind === 'camera' && rec && rec.camStream && !cameraBusy) {
    const session = rec;
    cameraBusy = true;
    try {
      const cam = await getCamera({ cameraId: select.value });
      if (rec !== session || !rec.camStream) { stopStream(cam); return; }
      attachCamera(cam);
      announce(`Switched to ${name}.`);
    } catch (err) {
      announce(`Couldn’t switch cameras: ${err.message || err.name}`, 'error');
    } finally {
      cameraBusy = false;
      render();
    }
  } else if (kind === 'mic' && rec && rec.micStream) {
    if (await openMic(rec)) announce(`Switched to ${name}.`);
  }
}
function cornerName(c) { return { br: 'bottom right', bl: 'bottom left', tr: 'top right', tl: 'top left' }[c] || 'bottom right'; }
function setCameraCorner(c) {
  saveSettings();
  if (!rec || !rec.compositor) return;
  rec.corner = c;
  rec.compositor.setCorner(c);
  announce(`Camera moved to the ${cornerName(c)} corner.`);
}

const radioGroupValue = (group) => { const c = group.querySelector('input:checked'); return c ? c.value : ''; };
function setRadioGroup(group, value) { group.querySelectorAll('input').forEach((i) => { i.checked = i.value === value; }); }
function iconButton(icon, label, className, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  b.title = label.replace(/ (Source \d+|.+) \(.*\)$/, '');
  b.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg>`;
  b.addEventListener('click', onClick);
  return b;
}

// Each shared source gets a label on the preview itself, where it's drawn, with its controls.
function renderSources(rebuild = false) {
  const has = !!(rec && rec.compositor);
  renderSounds();
  els.addSourceLabel.textContent = has ? 'Add source' : 'Add a screen, window, or tab';
  if (!has) {
    els.sourceList.replaceChildren();
    els.sourceList.hidden = true;
    els.layoutDescription.textContent = '';
    els.balanceRow.hidden = true;
    els.previewBtn.hidden = true;
    setRadioGroup(els.liveCorner, readSettings().cameraCorner);
    return;
  }
  els.sourceList.hidden = false;
  if (rebuild || els.sourceList.children.length !== rec.sources.length) {
    els.sourceList.replaceChildren(...rec.sources.map((src, i) => {
      const li = document.createElement('li');
      li.className = 'source-chip';
      const label = sourceLabel(i, src);
      const name = document.createElement('input');
      name.type = 'text';
      name.className = 'source-name-input';
      name.value = src.name;
      name.placeholder = `Source ${i + 1}`;
      name.maxLength = 60;
      name.autocomplete = 'off';
      name.spellcheck = false;
      name.size = Math.max(6, Math.min(24, (src.name || name.placeholder).length + 1));
      name.setAttribute('aria-label', `Name for ${label}`);
      name.title = 'Name this source';
      name.addEventListener('input', () => { name.size = Math.max(6, Math.min(24, (name.value || name.placeholder).length + 1)); });
      name.addEventListener('change', () => renameSource(src, name.value));
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); renameSource(src, name.value); } });
      const small = document.createElement('span');
      small.className = 'small-text';
      small.hidden = true;
      small.setAttribute('aria-hidden', 'true');
      small.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-text"/></svg>Small text';
      const detail = document.createElement('span');
      detail.className = 'source-detail visually-hidden';
      li.append(name, small, detail, iconButton('i-replace', `Replace ${label}`, 'chip-btn', () => replaceSource(src)));
      li.append(iconButton('i-x', `Remove ${label}`, 'chip-btn is-danger', () => removeSource(src)));
      return li;
    }));
  }
  // Sizes change as windows are resized, so these update in place.
  const info = rec.compositor.layoutInfo();
  [...els.sourceList.children].forEach((li, i) => {
    const src = rec.sources[i];
    const j = info ? info.ids.indexOf(src.id) : -1;
    const detail = li.querySelector('.source-detail');
    const small = li.querySelector('.small-text');
    if (j < 0) { detail.textContent = 'Waiting for its first picture.'; small.hidden = true; return; }
    const r = info.rects[j];
    li.style.left = `${(r.x / info.width) * 100}%`;
    li.style.top = `${(r.y / info.height) * 100}%`;
    li.style.maxWidth = `${(r.w / info.width) * 100}%`;
    const pct = Math.round(relativeSize(src, r, info.sizes[j].w, info.width) * 100);
    small.hidden = pct >= 60;
    detail.textContent = `${info.sizes[j].w} by ${info.sizes[j].h} pixels, looks about ${pct}% as big as on your screen${pct < 60 ? '; text may be hard to read' : ''}.`;
  });
  els.layoutDescription.textContent = describeLayout();
  setRadioGroup(els.layoutSelect, rec.compositor.layoutMode);
  els.balanceRow.hidden = rec.sources.length < 2;
  els.previewBtn.hidden = !els.video.requestFullscreen;
  updateBalanceText();
  setRadioGroup(els.liveCorner, rec.corner);
}

// Sound only: a tab whose audio is recorded but which isn't shown, like music playing in the
// background. Its picture is dropped straight away.
async function addSound() {
  if (switching || (!rec && !ensureSession())) return;
  if (!rec.mixer || rec.sounds.length >= 2) return;
  switching = true;
  render();
  announce('Choose a tab, and turn on sharing its audio. Only its sound is recorded.');
  try {
    const s = await pickSource({ ...rec.settings, systemAudio: true, recordMode: 'audio' }, { keepFocus: true });
    const [audio] = s.stream.getAudioTracks();
    if (!rec || !audio) {
      stopStream(s.stream);
      if (rec) announce('That didn’t include any sound. Choose a tab and turn on sharing its audio.', 'warn');
      return;
    }
    s.track.stop(); // the picture isn't needed
    rec.sounds.push(s);
    rec.mixer.setDisplay(s.id, s.stream);
    audio.onended = () => { if (rec && rec.sounds.includes(s)) removeSound(s, { ended: true }); };
    renderSounds();
    announce(`Added sound from ${surfaceName(s)}. It’s heard in the recording but not shown.`);
  } catch (err) {
    announce(err.name === 'NotAllowedError' ? 'No sound was added.' : `Couldn’t add sound: ${err.message || err.name}`,
      err.name === 'NotAllowedError' ? 'info' : 'error');
  } finally {
    switching = false;
    render();
    if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('', { quiet: true });
  }
}
function soundLabel(s) { return `Sound ${rec.sounds.indexOf(s) + 1} (${surfaceName(s)})`; }
function removeSound(s, { ended = false } = {}) {
  if (!rec || !rec.sounds.includes(s)) return;
  const label = soundLabel(s);
  rec.sounds.splice(rec.sounds.indexOf(s), 1);
  if (rec.mixer) rec.mixer.setDisplay(s.id, null);
  stopStream(s.stream);
  renderSounds();
  render();
  announce(ended ? `${label} stopped sharing.` : `${label} removed.`);
  if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('', { quiet: true });
  if (!ended) els.addSoundBtn.focus();
}
function renderSounds() {
  const list = rec ? rec.sounds : [];
  els.soundList.replaceChildren(...list.map((s) => {
    const li = document.createElement('li');
    li.className = 'chip sound-chip';
    const text = document.createElement('span');
    text.textContent = `Sound ${rec.sounds.indexOf(s) + 1}`;
    li.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-music"/></svg>';
    li.append(text, iconButton('i-x', `Remove ${soundLabel(s)}`, 'chip-btn', () => removeSound(s)));
    return li;
  }));
  els.soundList.hidden = !list.length;
}

// ---------- Recording flow ----------
// A session holds everything that's being captured; the recorder is added when recording starts.
function createSession(settings, sources) {
  const audioOnly = settings.recordMode === 'audio';
  const session = {
    settings, audioOnly, sources, corner: settings.cameraCorner,
    compositor: null, mixer: null, micStream: null, camStream: null,
    recorder: null, output: null, mimeType: '', filename: '',
    chunks: [], markers: [],
    elapsed: 0, segmentStart: 0, autoStopMs: settings.autoStop ? settings.autoStop * 60_000 : 0,
    timerId: 0, meterRaf: 0, warnings: [], arranged: false, sounds: [],
  };
  if (!audioOnly && canComposite) {
    const preset = PRESETS[settings.quality];
    session.compositor = createCompositor({
      width: preset.width, height: preset.height, fps: preset.fps, corner: session.corner,
      onLayout: () => { if (rec === session) renderSources(); },
    });
    session.compositor.setLayout(store.get('layout', 'auto'));
    session.compositor.setBalance(BALANCE[balanceIndex()]);
    for (const s of sources) session.compositor.addSource(s.id, s.track);
  }
  if (audioOnly || settings.systemAudio || settings.micId !== 'none' || session.compositor) {
    session.mixer = createMixer(settings);
    for (const s of sources) session.mixer.setDisplay(s.id, s.stream);
  }
  for (const s of sources) watchSource(s);
  return session;
}

function teardownCapture(session) {
  if (session.compositor) session.compositor.stop();
  if (session.mixer) session.mixer.close();
  for (const s of [...session.sources, ...session.sounds]) stopStream(s.stream);
  stopStream(session.micStream);
  stopStream(session.camStream);
}

function showPreview(session) {
  els.video.removeAttribute('src');
  els.video.controls = false;
  els.video.muted = true;
  if (session.audioOnly) { els.video.srcObject = null; return; }
  els.video.srcObject = session.compositor ? new MediaStream([session.compositor.track])
    : (session.sources[0] ? session.sources[0].stream : null);
  els.video.play().catch(() => {});
}

async function confirmReplacingRecovery() {
  if (!pendingRecovery) return true;
  const old = pendingRecovery;
  const ok = await askConfirm({
    title: 'Delete the unsaved recording?',
    body: `Only one recording is kept in this browser, so starting a new one deletes the unsaved recording from ${old.when}.`,
    confirmLabel: 'Delete and start recording',
  });
  if (!ok) return false;
  pendingRecovery = null;
  els.recovery.hidden = true;
  storage.remove(old.name); // not awaited: the next picker needs to open while the click still counts
  return true;
}

function recordingFilename(settings) {
  const fmt = FORMATS[settings.format];
  return `${fileStem(new Date())}.${settings.recordMode === 'audio' ? fmt.audioExt : fmt.videoExt}`;
}

// Opens the save dialog when saving to a chosen file. Returns false if the user cancelled.
async function openFileOutputIfNeeded(settings, filename, warnings) {
  if (settings.saveMode !== 'file' || !canSaveToDisk) return { ok: true, output: null };
  announce('Choose where to save the recording.');
  try {
    return { ok: true, output: await openOutputFile(filename) };
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false };
    console.warn('Could not open output file', err);
    warnings.push('Couldn’t open a file to save into, so the recording is kept in memory until you save it.');
    return { ok: true, output: null };
  }
}

// Starts an empty session on the main screen, so the camera or sound can come before any screen.
// Screen recordings get a compositor; audio-only ones just mix sound (Chrome and Edge).
function canArrange() { return canRecord && canComposite; }
function ensureSession({ openCam = true } = {}) {
  if (rec) return !!(rec.compositor || rec.audioOnly);
  if (phase !== 'setup' || !canArrange()) return false;
  rec = createSession(readSettings(), []);
  rec.arranged = true;
  showPreview(rec);
  startMeter();
  setPhase('arranging');
  if (openCam && rec.compositor && els.camOn.checked) openCamera({ quiet: true }); // remembered as on
  return true;
}
// Nothing left to show or hear before recording: back to the empty main screen.
function sessionIsEmpty() { return !!rec && !rec.sources.length && !rec.camStream && !rec.sounds.length; }

// Stops sharing everything and goes back to an empty main screen.
function cancelArrange(reason = '', { quiet = false } = {}) {
  if (!rec || !(phase === 'arranging' || (phase === 'starting' && rec.arranged))) return;
  const session = rec;
  rec = null;
  cancelAnimationFrame(session.meterRaf);
  teardownCapture(session);
  discardOutput(session.output);
  els.video.srcObject = null;
  setPhase('setup');
  renderSources(true);
  announce(quiet ? reason : `${reason ? reason + ' ' : ''}Nothing was recorded.`.trim());
  if (!quiet) (multiSourceMode() ? els.addSourceBtn : els.startBtn).focus();
}

// Settings can still be changed after sharing, so pick them up again just before recording.
function refreshSessionSettings(session) {
  const settings = { ...readSettings(), recordMode: session.settings.recordMode };
  session.settings = settings;
  session.autoStopMs = settings.autoStop ? settings.autoStop * 60_000 : 0;
  const preset = PRESETS[settings.quality];
  if (session.compositor) {
    session.compositor.resize(preset.width, preset.height);
    const { video } = displayOptions(settings);
    delete video.displaySurface;
    for (const src of session.sources) src.track.applyConstraints(video).catch(() => {});
  }
  if (session.mixer) session.mixer.close();
  session.mixer = null;
  if (session.audioOnly || settings.systemAudio || settings.micId !== 'none' || session.compositor) {
    session.mixer = createMixer(settings);
    for (const src of [...session.sources, ...session.sounds]) session.mixer.setDisplay(src.id, src.stream);
  }
  cancelAnimationFrame(session.meterRaf);
  startMeter();
}

async function startArranged() {
  if (phase !== 'arranging' || !rec || switching) return;
  if (!(await confirmReplacingRecovery()) || phase !== 'arranging') {
    if (phase === 'arranging' && sessionIsEmpty()) cancelArrange('', { quiet: true });
    return;
  }
  const session = rec;
  if (!session) return;
  refreshSessionSettings(session);
  session.filename = recordingFilename(session.settings);
  setPhase('starting');
  const file = await openFileOutputIfNeeded(session.settings, session.filename, session.warnings);
  if (!file.ok) {
    setPhase('arranging');
    if (sessionIsEmpty()) cancelArrange('', { quiet: true });
    announce('Recording not started, because no save location was chosen.');
    els.startBtn.focus();
    return;
  }
  session.output = file.output;
  await prepareRecording(session);
}

// Record (and Alt+R) starts straight away with whatever is set up, even nothing: sources, the
// camera, and sound can all be added while recording.
function start() {
  if (phase === 'setup' && !rec && !ensureSession()) {
    if (!canComposite) announce('This browser can’t combine what you share into a recording. Try a recent Chrome, Edge, Firefox, or Safari.', 'error');
    return undefined;
  }
  if (phase === 'arranging') return startArranged();
  return undefined;
}

// Opens the microphone and storage, creates the recorder, then starts.
async function prepareRecording(session) {
  const { settings, warnings } = session;
  let mode = settings.saveMode;
  if (mode === 'browser' && !storage.ok) mode = 'memory';
  if (mode === 'browser') {
    try {
      session.output = await openBrowserOutput(session.filename);
      const low = await lowSpaceWarning();
      if (low) warnings.push(low);
      if (navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (err) {
      console.warn('Could not open browser storage', err);
      warnings.push('Couldn’t use browser storage, so the recording is kept in memory until you save it.');
    }
  }
  if (settings.micId !== 'none') await openMic(session, warnings);
  // The camera was remembered as on but hasn't been opened yet (it may still be opening).
  if (session.compositor && els.camOn.checked && !session.camStream && !cameraBusy) {
    try { attachCamera(await getCamera({ cameraId: els.cameraSelect.value || 'default' })); }
    catch (err) {
      console.warn('Camera failed', err);
      els.camOn.checked = false;
      warnings.push(err.name === 'NotAllowedError' ? 'Camera access was blocked, so the camera isn’t shown.' : 'The camera couldn’t be opened, so it isn’t shown.');
    }
  }
  refreshDevices(); // labels become available once permission is granted
  const first = session.sources[0];
  if (settings.systemAudio && first && ![...session.sources, ...session.sounds].some((s) => s.stream.getAudioTracks().length)) {
    warnings.push('What you shared didn’t include audio. To record a tab’s sound, pick a tab and turn on “Share tab audio”.');
  }

  const fail = (message) => {
    rec = null;
    cancelAnimationFrame(session.meterRaf);
    teardownCapture(session);
    discardOutput(session.output);
    els.video.srcObject = null;
    setPhase('setup');
    announce(message, 'error');
    els.startBtn.focus();
  };
  if (rec !== session) { teardownCapture(session); discardOutput(session.output); return; }

  const fmt = FORMATS[settings.format];
  const mimeType = supportedMime(settings.format, settings.recordMode);
  const tracks = session.audioOnly ? [session.mixer.track] : [session.compositor.track, session.mixer.track];
  const preset = PRESETS[settings.quality];
  const options = { audioBitsPerSecond: preset.audio };
  if (mimeType) options.mimeType = mimeType;
  if (!session.audioOnly) {
    options.videoBitsPerSecond = Math.round(preset.video * fmt.bitrate);
    options.videoKeyFrameIntervalDuration = 1000; // a keyframe every second makes trimming precise
  }
  try {
    session.recorder = new MediaRecorder(new MediaStream(tracks), options);
  } catch (err) {
    console.error(err);
    return fail(`This browser couldn’t start a recording: ${err.message || err.name}`);
  }
  session.mimeType = mimeType;
  session.recorder.ondataavailable = (e) => {
    if (!e.data || !e.data.size) return;
    if (session.output) writeChunk(session, e.data);
    else session.chunks.push(e.data);
  };
  session.recorder.onstop = finalizeRecording;
  session.recorder.onerror = (e) => {
    console.error('MediaRecorder error', e.error || e);
    announce(`Recording error: ${(e.error && e.error.message) || 'unknown problem'}. Saving what was captured.`, 'error');
    stopRecording();
  };

  beginRecording();
}

function beginRecording() {
  if (!rec || !rec.recorder || phase !== 'starting') return;
  rec.recorder.start(1000); // hand data over every second, so nothing is held in one giant chunk
  rec.segmentStart = performance.now();
  rec.timerId = setInterval(tick, 500);
  setPhase('recording');
  tick();
  renderSources(true);
  const w = rec.warnings;
  // Recording with nothing to see (or hear) is fine, since things can be added as you go; say so once.
  const notes = [];
  if (rec.compositor && !rec.sources.length && !rec.camStream && !cameraBusy) notes.push('Nothing is showing yet: add a source or turn on your camera.');
  if (rec.audioOnly && !rec.micStream && !rec.sounds.length) notes.push('Nothing is being heard yet: turn on the mic or add sound.');
  announce(['Recording started.', ...w, ...notes].join(' '), w.length ? 'warn' : 'info');
  els.pauseBtn.focus();
}

function elapsedMs() {
  if (!rec) return 0;
  return rec.elapsed + (phase === 'recording' ? performance.now() - rec.segmentStart : 0);
}

function tick() {
  if (!rec) return;
  const ms = elapsedMs();
  const t = formatTime(ms);
  els.timer.textContent = t;
  document.title = `${phase === 'paused' ? '❚❚ Paused' : '● Recording'} ${t} · Screen Recorder`;
  const notes = [];
  if (rec.output && !rec.output.failed) {
    notes.push(`Saving to ${rec.output.kind === 'file' ? rec.output.name : 'browser storage'} as it records · ${formatBytes(rec.output.bytes)}`);
  }
  if (rec.autoStopMs) notes.push(`Stops automatically in ${formatTime(Math.max(0, rec.autoStopMs - ms))}`);
  if (rec.markers.length) notes.push(`${rec.markers.length} marker${rec.markers.length === 1 ? '' : 's'}`);
  els.liveNotes.textContent = notes.join(' · ');
  els.liveNotes.hidden = !notes.length;
  if (rec.autoStopMs && phase === 'recording' && ms >= rec.autoStopMs) {
    announce(`Stopped automatically after ${spokenTime(rec.autoStopMs)}.`);
    stopRecording();
  }
}

function togglePause() {
  if (!rec) return;
  if (phase === 'recording' && rec.recorder.state === 'recording') {
    rec.recorder.pause();
    rec.elapsed += performance.now() - rec.segmentStart;
    setPhase('paused');
    announce('Recording paused.');
  } else if (phase === 'paused' && rec.recorder.state === 'paused') {
    rec.recorder.resume();
    rec.segmentStart = performance.now();
    setPhase('recording');
    announce('Recording resumed.');
  }
  tick();
}

function addMarker() {
  if (!rec || !(phase === 'recording' || phase === 'paused')) return;
  const ms = elapsedMs();
  rec.markers.push({ ms, name: `Marker ${rec.markers.length + 1}` });
  tick();
  announce(`Marker ${rec.markers.length} added at ${formatTime(ms)}.`);
}

function stopRecording() {
  if (!rec || phase === 'stopping') return;
  if (phase === 'recording') rec.elapsed += performance.now() - rec.segmentStart;
  setPhase('stopping');
  if (rec.recorder.state !== 'inactive') rec.recorder.stop();
  else finalizeRecording();
}

async function finalizeRecording() {
  if (!rec) return;
  const session = rec;
  rec = null;
  clearInterval(session.timerId);
  cancelAnimationFrame(session.meterRaf);
  closePip();
  teardownCapture(session);
  document.title = 'Screen Recorder';

  const durationMs = session.elapsed + (phase === 'recording' ? performance.now() - session.segmentStart : 0);
  const type = (session.recorder.mimeType || session.mimeType || 'video/webm').split(';')[0];
  const container = type.includes('mp4') ? 'mp4' : 'webm';
  const chapters = session.markers.map((m) => ({ ms: m.ms, name: m.name }));
  const out = session.output;
  let blob, filename = session.filename, storedName = null, onDisk = false, warning = '';

  if (out && out.kind === 'file') {
    announce('Finishing the file…');
    try {
      await out.queue;
      if (out.failed) throw new Error('write failed');
      await out.writable.close();
      blob = await out.handle.getFile();
      filename = out.name;
      onDisk = true;
    } catch (err) {
      console.error('Could not finish the file', err);
      try { await out.writable.abort(); } catch { /* already errored */ }
      blob = null;
    }
    if (blob && blob.size) {
      try {
        const wrapped = new Blob([blob], { type });
        const fixed = await finalizeMedia(wrapped, container, { durationMs, chapters });
        if (fixed !== wrapped) {
          const w = await out.handle.createWritable();
          await w.write(fixed);
          await w.close();
          blob = await out.handle.getFile();
        }
      } catch (err) {
        console.warn('Could not add the duration to the saved file', err);
        warning = ' Some players may not be able to skip around in it.';
      }
    }
  } else if (out && out.kind === 'browser') {
    announce('Finishing the recording…');
    try { await out.queue; } catch { /* already reported */ }
    try { await storage.call('close'); } catch (err) { console.warn('Closing the stored recording failed', err); }
    out.release();
    storedName = out.name;
    try { blob = new Blob([await storage.getFile(out.name)], { type }); }
    catch (err) { console.error('Could not read the stored recording', err); blob = null; }
    meta.set(out.name, { finished: true, durationMs });
    if (blob && blob.size) blob = await finalizeMedia(blob, container, { durationMs, chapters });
    if (out.failed) warning = ' Storage ran out, so it ends early.';
  } else {
    blob = new Blob(session.chunks, { type });
    if (blob.size) blob = await finalizeMedia(blob, container, { durationMs, chapters });
  }

  if (!blob || !blob.size) {
    if (storedName) storage.remove(storedName);
    els.video.srcObject = null;
    setPhase('setup');
    if (!out || !out.failed) {
      announce(out && out.kind === 'file' && !blob
        ? `Couldn’t finish writing ${out.name}. The recording was lost.`
        : 'Nothing was captured, so there’s no file to save. Please try again.', 'error');
    }
    els.startBtn.focus();
    return;
  }

  const spoken = spokenTime(durationMs);
  let message;
  if (onDisk) message = `Recording finished: ${spoken}, saved as ${filename}.${warning}`;
  else message = `Recording finished: ${spoken}.${warning} Save it to keep it.`;
  showResult({
    kind: 'recording', blob, container, mediaKind: session.audioOnly ? 'audio' : 'video', durationMs, filename,
    saved: onDisk, onDisk, storedName, markers: session.markers.map((m) => ({ ...m })),
  }, onDisk ? 'Saved to your computer' : 'Your recording is ready', message, warning ? 'warn' : 'info');
}

// ---------- The done view: playback, trim, markers, saving ----------
function showResult(r, heading, message, tone = 'info') {
  result = {
    markers: [], dirty: false, trimStartMs: 0, trimPrep: null,
    ...r,
    url: URL.createObjectURL(r.blob),
    original: { blob: r.blob, durationMs: r.durationMs },
  };
  els.video.srcObject = null;
  els.video.src = result.url;
  els.video.muted = false;
  els.video.controls = true;
  els.video.setAttribute('aria-label', result.mediaKind === 'audio' ? 'Recorded audio' : 'Recorded video');
  els.doneHeading.textContent = heading;
  els.trimPanel.open = false;
  els.markersPanel.open = result.markers.length > 0;
  resetTrimControls();
  renderMarkers();
  updateFileMeta();
  setPhase('done');
  announce(message, tone);
  els.doneHeading.focus();
}

function updateFileMeta() {
  if (!result) return;
  els.fileMeta.innerHTML = '';
  [result.filename, result.durationMs != null ? formatTime(result.durationMs) : '', formatBytes(result.blob.size)]
    .filter(Boolean)
    .forEach((text, i) => {
      if (i) { const sep = document.createElement('span'); sep.className = 'sep'; sep.setAttribute('aria-hidden', 'true'); sep.textContent = '·'; els.fileMeta.append(sep); }
      els.fileMeta.append(document.createTextNode(text));
    });
}

function setPlayback(blob) {
  const old = result.url;
  const rate = els.video.playbackRate; // loading a new source resets the speed
  result.url = URL.createObjectURL(blob);
  els.video.src = result.url;
  els.video.playbackRate = rate;
  URL.revokeObjectURL(old);
}

function markDirty() {
  if (!result) return;
  result.dirty = true;
  render();
}

// --- Trim ---
function resetTrimControls() {
  const total = (result.original.durationMs || 0) / 1000;
  for (const input of [els.trimStart, els.trimEnd]) { input.max = String(total); input.step = '0.1'; }
  els.trimStart.value = '0';
  els.trimEnd.value = String(total);
  els.trimHint.textContent = '';
  els.trimSummary.textContent = '';
  els.undoTrimBtn.hidden = true;
  updateTrimOutputs();
}
function snappedStart(ms) {
  const cuts = result && result.cuts;
  if (!cuts || !cuts.length) return ms;
  let best = cuts[0];
  for (const c of cuts) { if (c <= ms + 1) best = c; else break; }
  return best;
}
function updateTrimOutputs() {
  const start = Number(els.trimStart.value), end = Number(els.trimEnd.value);
  els.trimStartOut.textContent = formatTimePrecise(start * 1000);
  els.trimEndOut.textContent = formatTimePrecise(end * 1000);
  els.trimStart.setAttribute('aria-valuetext', formatTimePrecise(start * 1000));
  els.trimEnd.setAttribute('aria-valuetext', formatTimePrecise(end * 1000));
  if (result && result.cuts) {
    const s = snappedStart(start * 1000);
    els.trimHint.textContent = Math.abs(s - start * 1000) > 150
      ? `Keeps ${formatTimePrecise(s)} to ${formatTimePrecise(end * 1000)}. The start moves back ${((start * 1000 - s) / 1000).toFixed(1)} seconds to the nearest keyframe, so the picture starts cleanly.`
      : `Keeps ${formatTimePrecise(s)} to ${formatTimePrecise(end * 1000)}.`;
    if (result.container === 'mp4') els.trimHint.textContent += ' MP4 files are trimmed in steps of about a second.';
  }
}
async function ensureTrimPrep() {
  if (!result) return null;
  if (!result.trimPrep) {
    const r = result;
    els.trimHint.textContent = 'Getting the recording ready to trim…';
    els.applyTrimBtn.disabled = true;
    r.trimPrep = prepareTrim(r.original.blob, r.container).then((prep) => {
      r.cuts = prep.cuts;
      if (result === r) { updateTrimOutputs(); render(); }
      return prep;
    }, (err) => {
      if (result === r) { els.trimHint.textContent = err.message || 'This recording can’t be trimmed.'; r.trimError = true; render(); }
      throw err;
    });
  }
  return result.trimPrep;
}
function onTrimInput(which) {
  const total = Number(els.trimStart.max);
  let start = Number(els.trimStart.value), end = Number(els.trimEnd.value);
  const gap = Math.min(1, total);
  if (which === 'start' && start > end - gap) { start = Math.max(0, end - gap); els.trimStart.value = String(start); }
  if (which === 'end' && end < start + gap) { end = Math.min(total, start + gap); els.trimEnd.value = String(end); }
  updateTrimOutputs();
  // Show the frame at the handle being moved (the player shows the trimmed file, so convert).
  const t = (which === 'start' ? start : end) - result.trimStartMs / 1000;
  if (t >= 0 && t <= (result.durationMs || 0) / 1000) els.video.currentTime = t;
}
function useCurrentPosition(which) {
  const t = els.video.currentTime + result.trimStartMs / 1000;
  (which === 'start' ? els.trimStart : els.trimEnd).value = String(t);
  onTrimInput(which);
  announce(`${which === 'start' ? 'Start' : 'End'} set to ${formatTimePrecise(t * 1000)}.`);
}
async function applyTrim() {
  const r = result;
  if (!r || r.saving) return;
  r.saving = true;
  render();
  announce('Trimming…');
  try {
    const prep = await ensureTrimPrep();
    const out = await prep.trim({
      startMs: Number(els.trimStart.value) * 1000,
      endMs: Number(els.trimEnd.value) * 1000,
      chapters: r.markers.map((m) => ({ ms: m.ms, name: m.name })),
    });
    if (result !== r) return;
    r.blob = out.blob;
    r.durationMs = out.durationMs;
    r.trimStartMs = out.startMs;
    setPlayback(out.blob);
    updateFileMeta();
    renderMarkers();
    els.undoTrimBtn.hidden = false;
    els.trimSummary.textContent = `${formatTimePrecise(out.startMs)} to ${formatTimePrecise(out.startMs + out.durationMs)}`;
    markDirty();
    announce(`Trimmed. It now runs ${spokenTime(out.durationMs)}, starting at ${formatTimePrecise(out.startMs)}.`);
  } catch (err) {
    console.error('Trim failed', err);
    announce(err.message || 'Couldn’t trim the recording.', 'error');
  } finally {
    r.saving = false;
    render();
  }
}
function undoTrim() {
  const r = result;
  if (!r) return;
  r.blob = r.original.blob;
  r.durationMs = r.original.durationMs;
  r.trimStartMs = 0;
  setPlayback(r.blob);
  resetTrimControls();
  updateFileMeta();
  renderMarkers();
  markDirty();
  announce('Trim undone. The whole recording is back.');
  els.trimStart.focus();
}

// --- Markers (saved as chapters) ---
function visibleMarkers() {
  if (!result) return [];
  const from = result.trimStartMs, to = result.trimStartMs + (result.durationMs || Infinity);
  return result.markers.filter((m) => m.ms >= from - 1 && m.ms <= to + 1);
}
function renderMarkers() {
  const list = visibleMarkers();
  els.markerList.replaceChildren(...list.map((m) => {
    const shown = formatTime(m.ms - result.trimStartMs);
    const li = document.createElement('li');
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'btn-link marker-time';
    jump.textContent = shown;
    jump.setAttribute('aria-label', `Play from ${shown}`);
    jump.addEventListener('click', () => { els.video.currentTime = (m.ms - result.trimStartMs) / 1000; els.video.play().catch(() => {}); });
    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'marker-name';
    name.value = m.name;
    name.maxLength = 120;
    name.setAttribute('aria-label', `Name for the marker at ${shown}`);
    name.addEventListener('input', () => { m.name = name.value; markDirty(); });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-link is-danger';
    del.textContent = 'Remove';
    del.setAttribute('aria-label', `Remove the marker at ${shown}`);
    del.addEventListener('click', () => {
      result.markers.splice(result.markers.indexOf(m), 1);
      renderMarkers();
      markDirty();
      announce(`Marker at ${shown} removed.`);
      els.addMarkerHereBtn.focus();
    });
    li.append(jump, name, del);
    return li;
  }));
  els.markersEmpty.hidden = list.length > 0;
  els.copyChaptersBtn.hidden = list.length === 0;
  els.markersSummary.textContent = list.length ? `${list.length} marker${list.length === 1 ? '' : 's'}` : '';
}
function addMarkerHere() {
  if (!result) return;
  const ms = els.video.currentTime * 1000 + result.trimStartMs;
  const m = { ms, name: `Marker ${result.markers.length + 1}` };
  result.markers.push(m);
  result.markers.sort((a, b) => a.ms - b.ms);
  els.markersPanel.open = true;
  renderMarkers();
  markDirty();
  const index = visibleMarkers().indexOf(m);
  const input = els.markerList.querySelectorAll('.marker-name')[index];
  if (input) { input.focus(); input.select(); }
  announce(`Marker added at ${formatTime(ms - result.trimStartMs)}.`);
}
async function copyChapters() {
  const list = visibleMarkers().map((m) => ({ ms: m.ms - result.trimStartMs, name: m.name.trim() || 'Marker' }));
  if (!list.length) return;
  if (list[0].ms >= 1000) list.unshift({ ms: 0, name: 'Start' });
  const text = list.map((m) => `${formatTime(m.ms)} ${m.name}`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    announce('Chapter list copied. It’s in the format YouTube uses for chapters in a description.');
  } catch {
    announce('Couldn’t copy to the clipboard.', 'error');
  }
}

// --- Saving ---
function exportChapters(r) {
  return visibleMarkers().map((m) => ({ ms: m.ms - r.trimStartMs, name: m.name.trim() || 'Marker' }));
}
async function exportResult(r) {
  return finalizeMedia(r.blob, r.container, { durationMs: r.durationMs, chapters: exportChapters(r) });
}
function markSaved(via) {
  result.saved = true;
  result.dirty = false;
  result.savedVia = via;
  if (result.storedName) {
    meta.set(result.storedName, { saved: true });
    if (via === 'download') downloadedThisSession.add(result.storedName);
  }
}
async function saveResult() {
  const r = result;
  if (!r || r.saving) return;
  // The save dialog needs the click, so it opens before anything else.
  let handle = null;
  if (canSaveToDisk) {
    try {
      handle = await window.showSaveFilePicker({ suggestedName: r.filename, id: 'screen-recorder', startIn: 'videos', types: [fileTypeFor(r.filename)] });
    } catch (err) {
      if (err.name !== 'AbortError') announce(`Couldn’t save: ${err.message || err.name}`, 'error');
      return;
    }
  }
  r.saving = true;
  render();
  announce(handle ? `Saving ${handle.name}…` : 'Preparing the file…');
  try {
    const blob = await exportResult(r);
    if (handle) {
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      markSaved('picker');
      announce(`Saved as ${handle.name}.`);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filename;
      a.hidden = true;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      markSaved('download');
      announce(`Saving ${r.filename} to your downloads.`);
    }
  } catch (err) {
    console.error('Save failed', err);
    announce(`Couldn’t save: ${err.message || err.name}`, 'error');
  } finally {
    r.saving = false;
    render();
  }
}

// ---------- Recovering stored recordings ----------
async function refreshRecovery({ announceFound = false } = {}) {
  if (!storage.ok) { els.recovery.hidden = true; return; }
  let names = [];
  try { names = await storage.list(); } catch (err) { console.warn('Could not list stored recordings', err); }
  const locks = await heldLocks();
  const busy = new Set([result && result.storedName, rec && rec.output && rec.output.name, ...downloadedThisSession].filter(Boolean));
  let items = [];
  for (const name of names) {
    if (busy.has(name) || locks.has(LOCK_PREFIX + name)) continue;
    const m = meta.get(name);
    // Saved on an earlier visit, or the page was left on purpose: not something to recover.
    if (m.saved || m.discarded) { await storage.remove(name); continue; }
    let file;
    try { file = await storage.getFile(name); } catch { continue; }
    if (!file.size) { await storage.remove(name); continue; }
    items.push({ name, size: file.size, when: m.startedAt || file.lastModified, finished: !!m.finished, durationMs: m.durationMs });
  }
  // Forget bookkeeping for files that no longer exist.
  for (const name of Object.keys(meta.all())) if (!names.includes(name)) meta.remove(name);
  // Only one recording is ever kept: offer the newest, delete any others.
  items.sort((a, b) => b.when - a.when);
  for (const extra of items.slice(1)) await storage.remove(extra.name);
  items = items.slice(0, 1);
  const fmtWhen = (t) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  pendingRecovery = items[0] ? { ...items[0], when: fmtWhen(items[0].when) } : null;

  els.recoveryList.replaceChildren(...items.map((item) => {
    const when = fmtWhen(item.when);
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'recovery-info';
    const title = document.createElement('strong');
    title.textContent = when;
    const detail = document.createElement('span');
    detail.textContent = [item.finished ? (item.durationMs ? formatTime(item.durationMs) : '') : 'Interrupted', formatBytes(item.size)]
      .filter(Boolean).join(' · ');
    info.append(title, detail);
    const actions = document.createElement('div');
    actions.className = 'recovery-actions';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn btn-secondary btn-sm';
    open.textContent = 'Open';
    open.setAttribute('aria-label', `Open recording from ${when}`);
    open.addEventListener('click', () => openStored(item.name));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-link is-danger';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete recording from ${when}`);
    del.addEventListener('click', async () => {
      const ok = await askConfirm({ title: 'Delete this recording?', body: 'This can’t be undone.', confirmLabel: 'Delete' });
      if (!ok) return;
      await storage.remove(item.name);
      await refreshRecovery();
      announce('Recording deleted.');
      els.startBtn.focus();
    });
    actions.append(open, del);
    li.append(info, actions);
    return li;
  }));
  els.recovery.hidden = items.length === 0;
  if (announceFound && items.length) announce('Found an unsaved recording from earlier.');
}

async function openStored(name) {
  if (phase !== 'setup') return;
  announce('Opening the recording…');
  try {
    const file = await storage.getFile(name);
    const r = await repairMedia(file);
    const note = r.trimmedBytes ? ' The last moment before it was interrupted couldn’t be kept.' : '';
    pendingRecovery = null;
    showResult({
      kind: 'recovered', blob: r.blob, container: r.format, mediaKind: r.hasVideo ? 'video' : 'audio',
      durationMs: r.durationMs, filename: name, saved: false, storedName: name,
    }, 'Recovered recording', `Recovered a recording${r.durationMs != null ? ` of ${spokenTime(r.durationMs)}` : ''}.${note} Save it to keep it.`);
  } catch (err) {
    console.error(err);
    announce(`Couldn’t open that recording: ${err.message || err.name}`, 'error');
  }
}

// ---------- Repair tool ----------
async function repairFile(file) {
  if (phase !== 'setup') return;
  announce(`Checking ${file.name}…`);
  try {
    const r = await repairMedia(file);
    const base = file.name.replace(/\.crswap$/i, '').replace(/\.(webm|mkv|mp4|m4a|mov)$/i, '');
    const ext = r.format === 'mp4' ? (r.hasVideo ? 'mp4' : 'm4a') : 'webm';
    const parts = [`Repaired ${file.name}.${r.durationMs != null ? ` It’s ${spokenTime(r.durationMs)} long.` : ''}`];
    if (r.trimmedBytes) parts.push('An incomplete bit at the end was removed.');
    parts.push('Save the repaired copy to keep it. The original file isn’t changed.');
    showResult({
      kind: 'repaired', blob: r.blob, container: r.format, mediaKind: r.hasVideo ? 'video' : 'audio',
      durationMs: r.durationMs, filename: `${base}-repaired.${ext}`, saved: false,
    }, 'Repaired recording ready', parts.join(' '));
  } catch (err) {
    console.warn('Repair failed', err);
    announce(err.message || 'That file couldn’t be repaired.', 'error');
  }
}

async function newRecording() {
  if (phase !== 'done' || (result && result.saving)) return;
  if (result && (!result.saved || result.dirty)) {
    const repaired = result.kind === 'repaired';
    const ok = await askConfirm({
      title: result.saved ? 'Discard your changes?' : repaired ? 'Discard the repaired copy?' : 'Discard this recording?',
      body: result.saved ? 'Your trim and marker changes haven’t been saved.' : repaired ? 'The original file isn’t changed.' : 'It hasn’t been saved, so it will be gone for good.',
      confirmLabel: 'Discard',
    });
    if (!ok || phase !== 'done') return;
  }
  const old = result;
  result = null;
  els.video.pause();
  els.video.removeAttribute('src');
  els.video.load();
  els.video.controls = false;
  els.video.setAttribute('aria-label', 'Screen preview');
  let removal = null;
  if (old) {
    URL.revokeObjectURL(old.url);
    // A copy saved as a regular download may still be reading from storage, so that one is cleaned up on a later visit.
    if (old.storedName && old.savedVia !== 'download') removal = storage.remove(old.storedName);
  }
  setPhase('setup');
  renderSources(true);
  Promise.resolve(removal).then(() => refreshRecovery());
  announce('Ready for a new recording.');
  els.startBtn.focus();
}

// ---------- Level meters ----------
function startMeter() {
  if (!rec || !rec.mixer) return;
  const buffers = new Map();
  const levels = { mic: 0, tab: 0 };
  const read = (analyser, key) => {
    if (!analyser) { levels[key] = 0; return 0; }
    let data = buffers.get(analyser);
    if (!data) { data = new Float32Array(analyser.fftSize); buffers.set(analyser, data); }
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const db = 20 * Math.log10(Math.sqrt(sum / data.length) || 1e-8);
    const target = Math.min(1, Math.max(0, (db + 60) / 60));
    levels[key] = target > levels[key] ? target : levels[key] * 0.9 + target * 0.1;
    return levels[key];
  };
  const frame = () => {
    if (!rec || !rec.mixer) return;
    els.micMeterFill.style.transform = `scaleX(${read(rec.mixer.micAnalyser, 'mic').toFixed(3)})`;
    els.tabMeterFill.style.transform = `scaleX(${read(rec.mixer.tabAnalyser, 'tab').toFixed(3)})`;
    // Use whichever window currently shows the meters (main page or floating controls).
    const view = els.micMeterFill.ownerDocument.defaultView || window;
    rec.meterRaf = view.requestAnimationFrame(frame);
  };
  frame();
}

// ---------- Floating controls (Document Picture-in-Picture) ----------
async function openPip() {
  if (!canPip || pipWindow || !isLive()) return;
  try {
    pipWindow = await documentPictureInPicture.requestWindow({ width: 560, height: 190 });
  } catch (err) {
    announce(`Couldn’t open floating controls: ${err.message || err.name}`, 'error');
    return;
  }
  const doc = pipWindow.document;
  doc.title = 'Recording controls';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((s) => {
    if (s.tagName === 'LINK') {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = s.href; // absolute, since the floating window has no base URL of its own
      doc.head.append(link);
    } else {
      doc.head.append(s.cloneNode(true));
    }
  });
  doc.body.className = 'pip-body';
  doc.body.append(document.querySelector('.icon-sprite').cloneNode(true)); // the icons live in this page
  doc.body.append(els.liveControls);
  doc.addEventListener('keydown', onKeydown);
  pipWindow.addEventListener('pagehide', () => {
    els.liveSlot.prepend(els.liveControls);
    pipWindow = null;
    render();
    if (rec) { cancelAnimationFrame(rec.meterRaf); startMeter(); }
    const active = document.activeElement;
    if (isLive() && (!active || active === document.body || els.pipNote.contains(active))) els.pauseBtn.focus();
  });
  if (rec) { cancelAnimationFrame(rec.meterRaf); startMeter(); }
  render();
  announce('Controls moved to a floating window.');
}
function closePip() { if (pipWindow) pipWindow.close(); }

// ---------- Confirmation dialog ----------
function askConfirm({ title, body, confirmLabel, danger = true }) {
  const d = els.confirmDialog;
  if (typeof d.showModal !== 'function') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  els.confirmTitle.textContent = title;
  els.confirmBody.textContent = body;
  els.confirmOk.textContent = confirmLabel;
  els.confirmOk.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  const opener = document.activeElement;
  d.returnValue = '';
  d.showModal();
  els.confirmCancel.focus(); // the safe choice is the default
  return new Promise((resolve) => {
    d.addEventListener('close', () => {
      const ok = d.returnValue === 'ok';
      if (!ok && opener && opener.isConnected) opener.focus();
      resolve(ok);
    }, { once: true });
  });
}

// ---------- Rendering ----------
function setPhase(next) { phase = next; render(); }

function render() {
  const live = isLive();
  const paused = phase === 'paused';
  const arrangedFlow = !!(rec && rec.arranged);
  const setup = phase === 'setup' || (phase === 'starting' && !arrangedFlow);
  const arranging = phase === 'arranging' || (phase === 'starting' && arrangedFlow);
  const audioOnly = rec ? rec.audioOnly : (result ? result.mediaKind === 'audio' : readSettings().recordMode === 'audio');

  // The main screen: set up what to record, then start.
  const main = setup || arranging;
  const multi = canRecord && multiSourceMode();
  const shared = !!rec && arranging;
  els.setupView.hidden = !main;
  els.startBtn.disabled = !(phase === 'setup' || phase === 'arranging') || !canRecord || switching;
  // Only screen readers get this; sighted people can see what's shared.
  els.startHint.textContent = !canRecord ? ''
    : audioOnly ? `Starts straight away. Records your microphone${canTabAudio ? ' and any sound you add' : ''}.`
    : shared ? 'Starts straight away. You can change what’s shared while recording.'
    : 'Starts straight away, even with nothing shared yet: you can add sources while recording.';
  els.modeSwitch.hidden = !canRecord || !!rec;

  // The mic and camera sit on the main screen before recording and with the recording controls after.
  const avHost = live ? els.pauseBtn : null;
  if (avHost ? els.avTools.previousElementSibling !== avHost : els.avTools.parentNode !== els.setupTools) {
    if (avHost) avHost.after(els.avTools); else els.setupTools.prepend(els.avTools);
  }
  const avLocked = !(main || phase === 'recording' || phase === 'paused');
  els.micOn.disabled = avLocked;
  els.micSelect.disabled = avLocked;
  els.cameraTool.hidden = !cameraAllowed();
  els.camOn.disabled = avLocked || cameraBusy;
  els.cameraSelect.disabled = avLocked || cameraBusy;
  els.tabAudioTool.hidden = !canTabAudio || audioOnly;

  // Sources, sound, and the camera's corner: on the main screen and while recording
  const n = rec ? rec.sources.length : 0;
  const barShown = main || phase === 'recording' || phase === 'paused';
  const showSources = multi && barShown;
  const showSounds = canTabAudio && canArrange() && barShown && (multi || audioOnly);
  const showCorner = showSources && !!(rec && rec.camStream && n);
  els.sourcesPanel.hidden = !(showSources || showSounds);
  els.liveCorner.hidden = !showCorner;
  els.cornerDivider.hidden = !(showCorner && showSounds);
  els.addSoundBtn.hidden = !showSounds || (!!rec && rec.sounds.length >= 2);
  const canAdd = showSources && (rec ? n < 2 : phase === 'setup' && !switching);
  const visual = !!rec && !audioOnly && (n > 0 || !!rec.camStream);
  els.addSourceBtn.hidden = !canAdd;
  els.stage.classList.toggle('has-sources', visual);
  // Labels and the full-screen button belong to the live preview, not the player.
  els.sourceList.hidden = !showSources || !n;
  els.previewBtn.hidden = !showSources || !visual || !els.video.requestFullscreen;
  els.stage.dataset.phase = phase;
  els.addSoundBtn.disabled = switching || (!!rec && !rec.mixer);
  els.soundList.querySelectorAll('button').forEach((b) => { b.disabled = switching; });
  if (showSources) {
    els.addSourceBtn.disabled = false;
    els.layoutSelect.disabled = n < 2;
    els.swapBtn.disabled = n < 2;
    els.sourceList.querySelectorAll('button').forEach((b) => { b.disabled = switching; });
  }
  els.liveSlot.hidden = !live;
  els.doneView.hidden = phase !== 'done';
  els.settings.hidden = !canRecord || !main;
  // Settings stay editable after sharing; what to record is fixed once something is shared.
  els.settingsBody.disabled = !(phase === 'setup' || phase === 'arranging');
  els.recordModeInputs.forEach((i) => { i.disabled = !!rec; });
  els.toolsRow.hidden = !(phase === 'setup' && !rec);
  els.repairBtn.disabled = phase !== 'setup' || switching;

  // Live controls
  els.recPill.dataset.state = phase;
  els.recLabel.textContent = paused ? 'Paused' : phase === 'stopping' ? 'Finishing…' : 'Recording';
  els.pauseLabel.textContent = paused ? 'Resume' : 'Pause';
  els.pauseIcon.hidden = paused;
  els.resumeIcon.hidden = !paused;
  els.pauseBtn.disabled = phase === 'stopping';

  const hasMic = !!(rec && rec.micStream);
  els.markerBtn.disabled = phase === 'stopping';
  els.popoutBtn.hidden = !canPip || !!pipWindow;
  els.popoutBtn.disabled = phase === 'stopping';
  els.stopBtn.disabled = phase === 'stopping';
  els.pipNote.hidden = !pipWindow;

  const mixer = rec && rec.mixer;
  els.levels.hidden = !mixer;
  els.micLevel.hidden = !hasMic;
  els.tabLevel.hidden = !(mixer && mixer.hasTabAudio);

  // Done view
  const r = result;
  const busy = !!(r && r.saving);
  els.saveBtn.hidden = !!(r && r.onDisk && !r.dirty);
  els.saveLabel.textContent = r && r.onDisk ? 'Save edited copy' : 'Save recording';
  els.saveBtn.disabled = busy;
  els.newBtn.disabled = busy;
  els.applyTrimBtn.disabled = busy || !(r && r.cuts) || !!(r && r.trimError);
  els.undoTrimBtn.disabled = busy;
  els.trimPanel.hidden = !r || r.durationMs == null;
  els.addMarkerHereBtn.disabled = busy;

  // Stage
  const capturing = live || arranging;
  const showVideo = capturing ? visual : phase === 'done';
  els.video.hidden = !showVideo;
  els.stage.classList.toggle('is-audio', audioOnly && (phase === 'done' || live));
  els.stageEmpty.hidden = showVideo && !(audioOnly && phase === 'done');
  const settingsAudio = readSettings().recordMode === 'audio';
  let art = audioOnly || settingsAudio ? 'i-mic' : 'i-monitor', title = '', text = '';
  if (!canRecord) {
    title = 'Recording isn’t supported in this browser';
    text = 'Try Chrome, Edge, Firefox, or Safari on a computer.';
  } else if (audioOnly && live) {
    title = paused ? 'Paused' : 'Recording audio';
    if (rec && !rec.micStream && !rec.sounds.length) text = canTabAudio ? 'Turn on the mic or add sound.' : 'Turn on the mic.';
  } else if (switching && !visual && !audioOnly) {
    title = 'Choose what to share';
    art = 'i-monitor';
  }
  // Only on the preview, never in the recording: nothing is in the frame.
  const empty = !!rec && !!rec.compositor && !visual && (live || arranging) && !switching && !cameraBusy;
  els.stageNotice.hidden = !empty;
  els.stageNotice.textContent = live ? 'Nothing showing · only sound is recorded' : 'Nothing showing yet';
  els.stageEmpty.querySelector('use').setAttribute('href', `#${art}`);
  els.stageEmpty.classList.toggle('is-big-add', canAdd && !visual);
  els.stageTitle.textContent = title;
  els.stageText.textContent = text;
  els.stageTitle.hidden = !title;
  els.stageText.hidden = !text;
  if (!live) document.title = 'Screen Recorder';
}

// ---------- Keyboard shortcuts ----------
const SHORTCUTS = [
  ['KeyR', 'R', 'Start or new recording'],
  ['KeyP', 'P', 'Pause or resume'],
  ['KeyM', 'M', 'Mic on or off'],
  ['KeyK', 'K', 'Add marker'],
  ['KeyC', 'C', 'Camera on or off'],
  ['KeyS', 'S', 'Stop'],
];
function onKeydown(e) {
  // Escape collapses the expandable panel you're in (Settings, Trim, Markers), or Settings if it's open.
  if (e.key === 'Escape' && !e.defaultPrevented && !els.confirmDialog.open) {
    const doc = e.target.ownerDocument || document;
    const panel = (e.target.closest && e.target.closest('details[open]')) || (els.settings.open && !els.settings.hidden ? els.settings : null);
    if (panel && panel.ownerDocument === doc) {
      e.preventDefault();
      panel.open = false;
      panel.querySelector('summary').focus();
      return;
    }
  }
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
  const recording = phase === 'recording' || phase === 'paused';
  let handled = true;
  switch (e.code) {
    case 'KeyR':
      if (phase === 'setup' || phase === 'arranging') start();
      else if (phase === 'done') newRecording();
      else handled = false;
      break;
    case 'KeyP': if (recording) togglePause(); else handled = false; break;
    case 'KeyM': if (!els.micOn.disabled && !els.setupView.hidden || recording) setMicOn(!els.micOn.checked, { say: true }); else handled = false; break;
    case 'KeyK': if (recording) addMarker(); else if (phase === 'done') addMarkerHere(); else handled = false; break;
    case 'KeyC': if (cameraAllowed() && !els.camOn.disabled && (recording || !els.setupView.hidden)) setCameraOn(!els.camOn.checked, { say: true }); else handled = false; break;
    case 'KeyS': if (recording) stopRecording(); else handled = false; break;
    default: handled = false;
  }
  if (handled) e.preventDefault();
}
function renderShortcuts() {
  const mod = isMac ? '⌥' : 'Alt';
  const item = (keys, label) => {
    const li = document.createElement('li');
    keys.forEach(([text, spoken], i) => {
      if (i) li.append(' ');
      const kbd = document.createElement('kbd');
      kbd.textContent = text;
      kbd.setAttribute('aria-label', spoken);
      li.append(kbd);
    });
    li.append(` ${label}`);
    return li;
  };
  const items = SHORTCUTS.filter(([code]) => code !== 'KeyC' || canComposite).map(([, key, label]) =>
    item([[isMac ? `${mod}${key}` : `${mod}+${key}`, `${isMac ? 'Option' : 'Alt'} ${key}`]], label));
  els.shortcutList.replaceChildren(...items);
  const shift = (k) => (isMac ? `⇧${k}` : `Shift+${k}`);
  els.playerShortcutList.replaceChildren(
    item([[shift('<'), 'Shift less than'], [shift('>'), 'Shift greater than']], 'Slower, faster'),
    item([[shift('←'), 'Shift left arrow'], [shift('→'), 'Shift right arrow']], 'Previous, next marker'),
  );
}

// ---------- Player shortcuts (while the player has focus) ----------
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let toastTimer;
function showToast(text) {
  els.stageToast.textContent = text;
  els.stageToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.stageToast.hidden = true; }, 1200);
}
function changeSpeed(dir) {
  const v = els.video;
  let i = 0;
  SPEEDS.forEach((s, k) => { if (Math.abs(s - v.playbackRate) < Math.abs(SPEEDS[i] - v.playbackRate)) i = k; });
  const next = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, i + dir))];
  v.playbackRate = next;
  const label = next === 1 ? 'Normal speed' : `${next}× speed`;
  showToast(next === 1 ? 'Normal speed' : `${next}×`);
  announce(label + (next === SPEEDS[0] && dir < 0 ? ', the slowest' : next === SPEEDS[SPEEDS.length - 1] && dir > 0 ? ', the fastest' : '') + '.');
}
function jumpToMarker(dir) {
  if (!result) return;
  const v = els.video;
  const marks = visibleMarkers()
    .map((m) => ({ t: (m.ms - result.trimStartMs) / 1000, name: m.name.trim() || 'Marker' }))
    .sort((a, b) => a.t - b.t);
  if (!marks.length) { announce('This recording has no markers. Add some in the Markers panel.'); return; }
  const now = v.currentTime;
  // Like chapter skipping elsewhere: just after a marker, "previous" goes to the one before it.
  const target = dir > 0 ? marks.find((m) => m.t > now + 0.25) : [...marks].reverse().find((m) => m.t < now - 1);
  if (!target) {
    if (dir < 0) { v.currentTime = 0; showToast('Start'); announce('Start of the recording.'); }
    else announce('No more markers after this point.');
    return;
  }
  v.currentTime = target.t;
  const n = marks.indexOf(target) + 1;
  showToast(target.name);
  announce(`${target.name}, marker ${n} of ${marks.length}, at ${formatTime(target.t * 1000)}.`);
}
function onPlayerKeydown(e) {
  if (phase !== 'done' || e.altKey || e.ctrlKey || e.metaKey || !e.shiftKey) return false;
  if (e.code === 'Comma' || e.key === '<') { changeSpeed(-1); return true; }
  if (e.code === 'Period' || e.key === '>') { changeSpeed(1); return true; }
  if (e.key === 'ArrowLeft') { jumpToMarker(-1); return true; }
  if (e.key === 'ArrowRight') { jumpToMarker(1); return true; }
  return false;
}
// Listen on the player itself, in the capture phase, so these win over its built-in arrow keys.
els.video.addEventListener('keydown', (e) => {
  if (onPlayerKeydown(e)) { e.preventDefault(); e.stopPropagation(); }
}, true);
els.video.setAttribute('aria-keyshortcuts', 'Shift+Comma Shift+Period Shift+ArrowLeft Shift+ArrowRight');

// Fallback for players that still report an unknown duration: seek to the end once.
els.video.addEventListener('loadedmetadata', () => {
  if (els.video.srcObject || els.video.duration !== Infinity) return;
  const restore = () => { els.video.removeEventListener('timeupdate', restore); els.video.currentTime = 0; };
  els.video.addEventListener('timeupdate', restore);
  els.video.currentTime = Number.MAX_SAFE_INTEGER;
});

// ---------- Wiring ----------
els.startBtn.addEventListener('click', start);
els.pauseBtn.addEventListener('click', togglePause);
els.markerBtn.addEventListener('click', addMarker);
els.stopBtn.addEventListener('click', stopRecording);
els.addSourceBtn.addEventListener('click', addSource);
els.swapBtn.addEventListener('click', swapSources);
els.addSoundBtn.addEventListener('click', addSound);
els.balanceRange.addEventListener('input', () => setBalanceIndex(Number(els.balanceRange.value)));
els.previewBtn.addEventListener('click', previewFullScreen);
els.layoutSelect.addEventListener('change', () => setLayoutMode(radioGroupValue(els.layoutSelect)));
els.liveCorner.addEventListener('change', () => setCameraCorner(radioGroupValue(els.liveCorner)));
els.micOn.addEventListener('change', () => setMicOn(els.micOn.checked));
els.camOn.addEventListener('change', () => setCameraOn(els.camOn.checked));
els.micSelect.addEventListener('change', () => onDeviceChoice('mic'));
els.cameraSelect.addEventListener('change', () => onDeviceChoice('camera'));
els.popoutBtn.addEventListener('click', openPip);
els.pipReturnBtn.addEventListener('click', closePip);
els.newBtn.addEventListener('click', newRecording);
els.saveBtn.addEventListener('click', saveResult);
els.trimPanel.addEventListener('toggle', () => { if (els.trimPanel.open) ensureTrimPrep().catch(() => {}); });
els.trimStart.addEventListener('input', () => onTrimInput('start'));
els.trimEnd.addEventListener('input', () => onTrimInput('end'));
els.trimStartHere.addEventListener('click', () => useCurrentPosition('start'));
els.trimEndHere.addEventListener('click', () => useCurrentPosition('end'));
els.applyTrimBtn.addEventListener('click', applyTrim);
els.undoTrimBtn.addEventListener('click', undoTrim);
els.addMarkerHereBtn.addEventListener('click', addMarkerHere);
els.copyChaptersBtn.addEventListener('click', copyChapters);
els.repairBtn.addEventListener('click', () => els.repairInput.click());
els.repairInput.addEventListener('change', () => {
  const [file] = els.repairInput.files;
  els.repairInput.value = '';
  if (file) repairFile(file);
});
els.settings.addEventListener('toggle', () => store.set('settingsOpen', els.settings.open));
[els.noiseSuppression, els.echoCancellation, els.leveling, els.systemAudio, els.qualitySelect, els.formatSelect,
  els.autoStopSelect, ...els.recordModeInputs, ...els.saveModeInputs]
  .forEach((el) => el.addEventListener('change', () => { saveSettings(); render(); }));
for (const [input, key] of [[els.micVolume, 'mic'], [els.tabVolume, 'tab']]) {
  input.addEventListener('input', () => {
    updateVolumeOutputs();
    if (rec && rec.mixer) rec.mixer[key === 'mic' ? 'setMicVolume' : 'setTabVolume'](Number(input.value));
  });
  input.addEventListener('change', () => store.set('settings', readSettings()));
}
document.addEventListener('keydown', onKeydown);

// Leaving the page on purpose discards an unsaved recording, so warn first.
window.addEventListener('beforeunload', (e) => {
  if (isLive() || phase === 'starting' || phase === 'arranging' || (result && (!result.saved || result.dirty)) || pendingRecovery) {
    e.preventDefault();
    e.returnValue = '';
  }
});
// Browser storage is only a safety net for crashes (which fire no events). Once the page is
// left on purpose, delete what it holds so recordings don't pile up on disk.
window.addEventListener('pagehide', (e) => {
  if (e.persisted || !storage.ok) return; // kept in the back/forward cache; the page may come back
  if (rec && rec.output && rec.output.kind === 'browser') {
    meta.set(rec.output.name, { discarded: true });
    storage.worker.postMessage({ type: 'discard', name: rec.output.name });
  }
  // A copy saved as a download may still be reading the file; that one is cleaned up next visit.
  if (result && result.storedName && result.savedVia !== 'download') storage.removeNow(result.storedName);
  if (pendingRecovery) storage.removeNow(pendingRecovery.name);
});
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
}

// Installing as an app (Chrome and Edge offer a prompt; Safari uses File › Add to Dock).
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  els.installBtn.hidden = false;
});
window.addEventListener('appinstalled', () => { installPrompt = null; els.installBtn.hidden = true; announce('Installed. You can open Screen Recorder from your Dock or Start menu.'); });
els.installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === 'accepted') { installPrompt = null; els.installBtn.hidden = true; }
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline support unavailable', err));
}

// ---------- Init ----------
loadSettings();
renderShortcuts();
updateSettingsUI();
els.balanceRange.max = String(BALANCE.length - 1);
els.balanceRange.value = String(balanceIndex());
renderSources();
render();
refreshDevices();
storage.init().then(() => {
  applySaveModes();
  render();
  refreshRecovery({ announceFound: true });
});
if (!canRecord) announce('This browser can’t record the screen.', 'error');
