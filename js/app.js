'use strict';

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const els = {
  stage: $('stage'), stageEmpty: $('stageEmpty'), stageTitle: $('stageTitle'), stageText: $('stageText'), video: $('video'),
  installBtn: $('installBtn'),
  setupView: $('setupView'), startBtn: $('startBtn'), arrangeBtn: $('arrangeBtn'), arrangeHint: $('arrangeHint'),
  arrangeView: $('arrangeView'), startArrangedBtn: $('startArrangedBtn'), cancelArrangeBtn: $('cancelArrangeBtn'),
  countInView: $('countInView'), cancelCountInBtn: $('cancelCountInBtn'),
  sourcesPanel: $('sourcesPanel'), sourcesSummary: $('sourcesSummary'), sourceList: $('sourceList'), addSourceBtn: $('addSourceBtn'),
  layoutSelect: $('layoutSelect'), swapBtn: $('swapBtn'), layoutDescription: $('layoutDescription'),
  cameraManageBtn: $('cameraManageBtn'), cameraManageLabel: $('cameraManageLabel'), liveCorner: $('liveCorner'), cameraRow: $('cameraRow'),
  liveSlot: $('liveSlot'), liveControls: $('liveControls'), recPill: $('recPill'), recLabel: $('recLabel'), timer: $('timer'), liveNotes: $('liveNotes'),
  pauseBtn: $('pauseBtn'), pauseLabel: $('pauseLabel'), pauseIcon: $('pauseIcon'), resumeIcon: $('resumeIcon'),
  muteBtn: $('muteBtn'), muteLabel: $('muteLabel'), micOnIcon: $('micOnIcon'), micOffIcon: $('micOffIcon'),
  cameraBtn: $('cameraBtn'), cameraLabel: $('cameraLabel'), markerBtn: $('markerBtn'),
  switchBtn: $('switchBtn'), popoutBtn: $('popoutBtn'), stopBtn: $('stopBtn'),
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
  micSelect: $('micSelect'), micHint: $('micHint'), micAccessBtn: $('micAccessBtn'), micProcessing: $('micProcessing'),
  noiseSuppression: $('noiseSuppression'), echoCancellation: $('echoCancellation'), leveling: $('leveling'), systemAudio: $('systemAudio'),
  recordModeInputs: [...document.querySelectorAll('input[name="recordMode"]')],
  qualityField: $('qualityField'), qualitySelect: $('qualitySelect'), qualityHint: $('qualityHint'),
  formatSelect: $('formatSelect'), formatHint: $('formatHint'),
  cameraField: $('cameraField'), cameraSelect: $('cameraSelect'), cameraCorner: $('cameraCorner'), cameraHint: $('cameraHint'), cameraAccessBtn: $('cameraAccessBtn'),
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
// Insertable streams (Chromium) give MediaRecorder one video track that never changes while we
// feed it frames. That's what makes switching sources and the webcam bubble possible.
const canComposite = 'MediaStreamTrackGenerator' in window && 'MediaStreamTrackProcessor' in window && 'OffscreenCanvas' in window;
const canSwitch = canComposite;
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
// phase: setup | starting | arranging | countin | recording | paused | stopping | done
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
    micId: els.micSelect.value || 'default',
    noiseSuppression: els.noiseSuppression.checked,
    echoCancellation: els.echoCancellation.checked,
    leveling: els.leveling.checked,
    systemAudio: els.systemAudio.checked,
    recordMode: radioValue(els.recordModeInputs) || 'screen',
    quality: els.qualitySelect.value || 'standard',
    format: currentFormat(),
    cameraId: els.cameraSelect.value || 'none',
    cameraCorner: els.cameraCorner.value || 'br',
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
  for (const key of ['noiseSuppression', 'echoCancellation', 'leveling', 'systemAudio']) {
    if (typeof s[key] === 'boolean') els[key].checked = s[key];
  }
  if (s.recordMode) els.recordModeInputs.forEach((i) => { i.checked = i.value === s.recordMode; });
  if (PRESETS[s.quality]) els.qualitySelect.value = s.quality;
  if (s.autoStop != null) els.autoStopSelect.value = String(s.autoStop);
  if (s.cameraCorner) els.cameraCorner.value = s.cameraCorner;
  if (s.micId === 'none') els.micSelect.value = 'none';
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

  // Camera: needs insertable streams, and only makes sense with video.
  els.cameraField.hidden = !canComposite || audioOnly;
  els.cameraCorner.disabled = s.cameraId === 'none';

  els.micProcessing.disabled = s.micId === 'none';

  const opt = els.micSelect.selectedOptions[0];
  let mic = s.micId === 'none' ? 'No mic' : (s.micId === 'default' ? 'Default mic' : (opt ? opt.textContent : 'Mic'));
  if (mic.length > 24) mic = mic.slice(0, 23) + '…';
  const what = audioOnly ? 'Audio only' : `${{ compact: 'Compact', standard: 'Standard', high: 'High' }[s.quality]} ${s.format === 'mp4' ? 'MP4' : s.format === 'av1' ? 'AV1' : 'WebM'}`;
  const saving = { browser: 'Saves as it records', file: 'Saves to a file' }[s.saveMode] || '';
  els.settingsSummary.textContent = [what, mic, s.cameraId !== 'none' && !audioOnly && canComposite ? 'Camera on' : '', saving]
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
    wanted: els.micSelect.value || saved.micId || 'default', defaultLabel: 'Default microphone', noneLabel: 'No microphone', noneFirst: false, hint: els.micHint,
  });
  fillDeviceSelect(els.cameraSelect, devices.filter((d) => d.kind === 'videoinput'), {
    wanted: els.cameraSelect.value || saved.cameraId || 'none', defaultLabel: 'Default camera', noneLabel: 'No camera', noneFirst: true, hint: els.cameraHint,
  });
  updateSettingsUI();
}
function fillDeviceSelect(select, devices, { wanted, defaultLabel, noneLabel, noneFirst, hint }) {
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
  if (noneFirst) options.unshift(['none', noneLabel]); else options.push(['none', noneLabel]);
  select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
  select.value = options.some(([v]) => v === wanted) ? wanted : options[noneFirst ? 0 : 0][0];
  hint.hidden = hasLabels || devices.length === 0;
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
    ? { width: { max: 640 }, height: { max: 360 }, frameRate: { max: 1 } }
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

// Draws the webcam as a circle in a corner of the frame.
function drawBubble(ctx, cam, w, h, corner) {
  const short = Math.min(w, h);
  const d = Math.round(short * 0.24), m = Math.round(short * 0.03);
  const x = corner.includes('l') ? m : w - m - d;
  const y = corner.includes('t') ? m : h - m - d;
  const cw = cam.displayWidth, ch = cam.displayHeight, s = Math.min(cw, ch);
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

// ---------- Layout ----------
// Fits one or two sources into a W×H frame. Two sources are drawn at the same scale, so text in
// both shrinks by the same amount, and as large as they'll go. "Automatic" picks side by side or
// one above the other, whichever lets them be bigger.
const LAYOUTS = { auto: 'Automatic', side: 'Side by side', stacked: 'One above the other' };
function computeLayout(sizes, W, H, mode) {
  const center = (w, h) => ({ x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w: Math.round(w), h: Math.round(h) });
  if (sizes.length === 1) {
    const [a] = sizes;
    const s = Math.min(W / a.w, H / a.h);
    return { mode: 'single', scale: s, rects: [center(a.w * s, a.h * s)] };
  }
  const [a, b] = sizes;
  const gap = Math.round(W * 0.01);
  const side = Math.min((W - gap) / (a.w + b.w), H / Math.max(a.h, b.h));
  const stacked = Math.min(W / Math.max(a.w, b.w), (H - gap) / (a.h + b.h));
  const use = mode === 'side' || mode === 'stacked' ? mode : (side >= stacked ? 'side' : 'stacked');
  const s = use === 'side' ? side : stacked;
  const aw = a.w * s, ah = a.h * s, bw = b.w * s, bh = b.h * s;
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
  return { mode: use, scale: s, rects };
}

// ---------- Compositor ----------
// Draws up to two sources and the webcam bubble into one frame and gives MediaRecorder a single
// video track that never changes, whatever happens to the sources behind it. The frame keeps a
// fixed 16:9 size: MP4's H.264 can't change resolution part way through, and a fixed frame lets
// sources and the camera come and go during a recording.
function createCompositor({ width, height, corner, onLayout }) {
  const generator = new MediaStreamTrackGenerator({ kind: 'video' });
  generator.contentHint = 'detail'; // favour sharp text over smooth motion
  const writer = generator.writable.getWriter();
  const canvas = new OffscreenCanvas(Math.max(2, width & ~1), Math.max(2, height & ~1));
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = canvas.width, H = canvas.height;
  const slots = []; // { id, track, latest, token }
  let camera = null; // { track, visible, alive, token }
  let layoutMode = 'auto';
  let stopped = false, writing = false, pending = false;
  let lastLayout = null, lastKey = '';

  function draw(camFrame) {
    const live = slots.filter((s) => s.latest);
    if (!live.length) return null;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const sizes = live.map((s) => ({ w: s.latest.displayWidth, h: s.latest.displayHeight }));
    const layout = computeLayout(sizes, W, H, layoutMode);
    live.forEach((s, i) => { const r = layout.rects[i]; ctx.drawImage(s.latest, r.x, r.y, r.w, r.h); });
    if (camFrame && camera && camera.visible) drawBubble(ctx, camFrame, W, H, corner);
    lastLayout = { ...layout, ids: live.map((s) => s.id), sizes, width: W, height: H, requested: layoutMode };
    // Tell the page when the arrangement changes (not on every frame).
    const key = `${layoutMode}|${lastLayout.mode}|${lastLayout.ids.join(',')}|${sizes.map((z) => `${Math.round(z.w / 8)}x${Math.round(z.h / 8)}`).join(',')}`;
    if (key !== lastKey) { lastKey = key; if (onLayout) queueMicrotask(() => onLayout(lastLayout)); }
    // Composited frames get their own steady clock, since screen and camera timestamps differ.
    return new VideoFrame(canvas, { timestamp: Math.round(performance.now() * 1000) });
  }
  async function emit(camFrame) {
    if (stopped) return;
    if (writing) { pending = true; return; } // the encoder is busy; draw again when it's free
    const frame = draw(camFrame);
    if (!frame) return;
    writing = true;
    try { await writer.write(frame); } catch { frame.close(); } finally { writing = false; }
    if (pending && !stopped && !(camera && camera.alive)) { pending = false; emit(null); }
  }
  // With a camera, its frames drive the output; otherwise each new screen frame does.
  function redraw() { if (!(camera && camera.alive)) emit(null); }

  async function pumpSlot(slot, track, token) {
    const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
    try {
      for (;;) {
        const { value: frame, done } = await reader.read();
        if (done) break;
        if (slot.token !== token || stopped) { frame.close(); break; }
        if (slot.latest) slot.latest.close();
        slot.latest = frame;
        redraw();
      }
    } catch (err) {
      console.warn('Source stopped', err);
    } finally {
      reader.cancel().catch(() => {});
    }
  }
  async function pumpCamera(cam) {
    const reader = new MediaStreamTrackProcessor({ track: cam.track }).readable.getReader();
    try {
      for (;;) {
        const { value: frame, done } = await reader.read();
        if (done || stopped || camera !== cam) { if (frame) frame.close(); break; }
        await emit(frame);
        frame.close();
      }
    } catch (err) {
      console.warn('Camera stopped', err);
    } finally {
      cam.alive = false;
      reader.cancel().catch(() => {});
      redraw();
    }
  }

  return {
    track: generator,
    addSource(id, track) {
      const slot = { id, track, latest: null, token: 1 };
      slots.push(slot);
      pumpSlot(slot, track, slot.token);
    },
    // Keeps showing the old picture until the new source's first frame arrives.
    replaceSource(id, track) {
      const slot = slots.find((s) => s.id === id);
      if (!slot) return;
      slot.token += 1;
      slot.track = track;
      pumpSlot(slot, track, slot.token);
    },
    removeSource(id) {
      const i = slots.findIndex((s) => s.id === id);
      if (i < 0) return;
      const [slot] = slots.splice(i, 1);
      slot.token += 1;
      if (slot.latest) slot.latest.close();
      redraw();
    },
    swap() { slots.reverse(); redraw(); },
    setLayout(mode) { layoutMode = mode; redraw(); },
    get layoutMode() { return layoutMode; },
    setCamera(track) {
      camera = track ? { track, visible: true, alive: true } : null;
      if (camera) pumpCamera(camera); else redraw();
    },
    setCameraVisible(v) { if (camera) camera.visible = v; },
    setCorner(c) { corner = c; },
    layoutInfo() { return lastLayout; },
    stop() {
      stopped = true;
      camera = null;
      for (const s of slots) { s.token += 1; if (s.latest) { s.latest.close(); s.latest = null; } }
      writer.close().catch(() => {});
      generator.stop();
    },
  };
}

// ---------- Sources ----------
let sourceSeq = 0;
function surfaceName(source) {
  return { browser: 'a tab', window: 'a window', monitor: 'your entire screen' }[source.surface] || 'a shared source';
}
function sourceLabel(index, source) { return `Source ${index + 1} (${surfaceName(source)})`; }

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
  return { id: ++sourceSeq, stream, track, surface };
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
  if (!shown.length) return '';
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
    if (rec.sources.length > 1) {
      removeSourceNow(source);
      announce(`${label} stopped sharing, so it was removed.${isLive() ? ' Recording continues.' : ''}`);
    } else if (phase === 'arranging' || phase === 'countin') {
      cancelArrange(`${label} stopped sharing.`);
    } else {
      announce('Sharing ended, so the recording was stopped.');
      stopRecording();
    }
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

async function addSource() {
  if (!rec || !rec.compositor || rec.sources.length >= 2 || switching) return;
  switching = true;
  render();
  announce('Choose a second window, tab, or screen. You’ll stay on this page.');
  try {
    const s = await pickSource(rec.settings, { keepFocus: true });
    if (!rec) { stopStream(s.stream); return; }
    rec.sources.push(s);
    rec.compositor.addSource(s.id, s.track);
    if (rec.mixer) rec.mixer.setDisplay(s.id, s.stream);
    watchSource(s);
    await layoutIncludes(s.id);
    renderSources(true);
    announce(`Added ${sourceLabel(rec.sources.indexOf(s), s).replace(/^Source/, 'source')}. ${describeLayout()}`);
  } catch (err) {
    announce(err.name === 'NotAllowedError' ? 'No source was added.' : `Couldn’t add a source: ${err.message || err.name}`,
      err.name === 'NotAllowedError' ? 'info' : 'error');
  } finally {
    switching = false;
    render();
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
    next.id = source.id; // it takes the old one's place in the layout
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
  if (!rec || rec.sources.length < 2 || !rec.sources.includes(source)) return;
  const label = sourceLabel(rec.sources.indexOf(source), source);
  removeSourceNow(source);
  announce(`${label} removed. ${describeLayout()}`);
  els.addSourceBtn.focus();
}

function swapSources() {
  if (!rec || !rec.compositor || rec.sources.length < 2) return;
  rec.sources.reverse();
  rec.compositor.swap();
  setTimeout(() => { renderSources(true); announce(`Swapped. ${describeLayout()}`); }, 120);
}

function setLayoutMode(mode) {
  if (!rec || !rec.compositor) return;
  rec.compositor.setLayout(mode);
  store.set('layout', mode);
  setTimeout(() => { renderSources(); announce(describeLayout()); }, 120);
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

// --- Camera, while arranging or recording ---
async function addCamera() {
  if (!rec || !rec.compositor || rec.camStream || switching) return;
  switching = true;
  render();
  try {
    const s = { ...rec.settings, cameraId: rec.settings.cameraId === 'none' ? 'default' : rec.settings.cameraId };
    const cam = await getCamera(s);
    if (!rec) { stopStream(cam); return; }
    attachCamera(cam);
    refreshDevices();
    announce(`Camera added in the ${cornerName(rec.corner)} corner.`);
  } catch (err) {
    announce(err.name === 'NotAllowedError' ? 'Camera access was blocked.' : `Couldn’t open the camera: ${err.message || err.name}`, 'error');
  } finally {
    switching = false;
    render();
    renderSources();
  }
}
function attachCamera(cam) {
  rec.camStream = cam;
  rec.cameraVisible = true;
  rec.compositor.setCamera(cam.getVideoTracks()[0]);
  cam.getVideoTracks()[0].onended = () => {
    if (!rec || rec.camStream !== cam) return;
    rec.camStream = null;
    rec.compositor.setCamera(null);
    render();
    renderSources();
    announce('The camera was disconnected.', 'warn');
  };
}
function removeCamera() {
  if (!rec || !rec.camStream) return;
  const cam = rec.camStream;
  rec.camStream = null;
  rec.compositor.setCamera(null);
  stopStream(cam); // turns the camera (and its light) off
  render();
  renderSources();
  announce('Camera removed and turned off.');
  els.cameraManageBtn.focus();
}
function toggleCamera() {
  if (!rec || !rec.camStream || !rec.compositor) return;
  rec.cameraVisible = !rec.cameraVisible;
  rec.compositor.setCameraVisible(rec.cameraVisible);
  render();
  announce(rec.cameraVisible ? 'Camera shown.' : 'Camera hidden. It’s still on, so you can show it again right away.');
}
function cornerName(c) { return { br: 'bottom right', bl: 'bottom left', tr: 'top right', tl: 'top left' }[c] || 'bottom right'; }
function setCameraCorner(c) {
  if (!rec || !rec.compositor) return;
  rec.corner = c;
  rec.compositor.setCorner(c);
  announce(`Camera moved to the ${cornerName(c)} corner.`);
}

function renderSources(rebuild = false) {
  const has = !!(rec && rec.compositor);
  if (!has) return;
  if (rebuild || els.sourceList.children.length !== rec.sources.length) {
    els.sourceList.replaceChildren(...rec.sources.map((src, i) => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.className = 'source-name';
      const detail = document.createElement('span');
      detail.className = 'source-detail';
      text.append(sourceLabel(i, src));
      const actions = document.createElement('div');
      actions.className = 'recovery-actions';
      const replace = document.createElement('button');
      replace.type = 'button';
      replace.className = 'btn btn-secondary btn-sm';
      replace.textContent = 'Replace';
      replace.setAttribute('aria-label', `Replace ${sourceLabel(i, src)}`);
      replace.addEventListener('click', () => replaceSource(src));
      actions.append(replace);
      if (rec.sources.length > 1) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn-link is-danger';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${sourceLabel(i, src)}`);
        remove.addEventListener('click', () => removeSource(src));
        actions.append(remove);
      }
      const info = document.createElement('div');
      info.className = 'recovery-info';
      info.append(text, detail);
      li.append(info, actions);
      return li;
    }));
  }
  // Sizes change as windows are resized, so these update in place.
  const info = rec.compositor.layoutInfo();
  [...els.sourceList.querySelectorAll('.source-detail')].forEach((el, i) => {
    const src = rec.sources[i];
    const j = info ? info.ids.indexOf(src.id) : -1;
    if (j < 0) { el.textContent = 'Waiting for its first picture…'; return; }
    const pct = Math.round(relativeSize(src, info.rects[j], info.sizes[j].w, info.width) * 100);
    el.textContent = `${info.sizes[j].w} × ${info.sizes[j].h} pixels · looks about ${pct}% as big as on your screen${pct < 60 ? ' · text may be hard to read' : ''}`;
  });
  els.layoutDescription.textContent = rec.sources.length > 1 ? describeLayout() : 'Add a second source to show two things at once.';
  els.layoutSelect.value = rec.compositor.layoutMode;
  els.sourcesSummary.textContent = `${rec.sources.length} source${rec.sources.length === 1 ? '' : 's'}${rec.camStream ? ' and camera' : ''}`;
  els.cameraManageLabel.textContent = rec.camStream ? 'Remove camera' : 'Add camera';
  els.liveCorner.value = rec.corner;
}

// ---------- Recording flow ----------
// A session holds everything that's being captured; the recorder is added when recording starts.
function createSession(settings, sources) {
  const audioOnly = settings.recordMode === 'audio';
  const session = {
    settings, audioOnly, sources, corner: settings.cameraCorner,
    compositor: null, mixer: null, micStream: null, camStream: null, cameraVisible: false,
    recorder: null, output: null, mimeType: '', filename: '',
    chunks: [], markers: [], muted: false,
    elapsed: 0, segmentStart: 0, autoStopMs: settings.autoStop ? settings.autoStop * 60_000 : 0,
    timerId: 0, meterRaf: 0, countIn: null, warnings: [], arranged: false,
  };
  if (!audioOnly && canComposite) {
    const preset = PRESETS[settings.quality];
    session.compositor = createCompositor({
      width: preset.width, height: preset.height, corner: session.corner,
      onLayout: () => { if (rec === session) renderSources(); },
    });
    session.compositor.setLayout(store.get('layout', 'auto'));
    for (const s of sources) session.compositor.addSource(s.id, s.track);
  }
  if (audioOnly || settings.systemAudio || settings.micId !== 'none') {
    session.mixer = createMixer(settings);
    for (const s of sources) session.mixer.setDisplay(s.id, s.stream);
  }
  for (const s of sources) watchSource(s);
  return session;
}

function teardownCapture(session) {
  if (session.countIn) { session.countIn.close().catch(() => {}); session.countIn = null; }
  if (session.compositor) session.compositor.stop();
  if (session.mixer) session.mixer.close();
  for (const s of session.sources) stopStream(s.stream);
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

// Start recording right away (one source, or audio only).
async function startRecording() {
  if (phase !== 'setup' || !canRecord) return;
  const settings = readSettings();
  const audioOnly = settings.recordMode === 'audio';
  if (audioOnly && settings.micId === 'none' && !settings.systemAudio) {
    announce('To record audio only, choose a microphone or turn on tab or system audio in Settings.', 'error');
    els.settings.open = true;
    els.micSelect.focus();
    return;
  }
  if (!(await confirmReplacingRecovery()) || phase !== 'setup') return;
  setPhase('starting');
  const filename = recordingFilename(settings);
  const warnings = [];
  const file = await openFileOutputIfNeeded(settings, filename, warnings);
  if (!file.ok) { setPhase('setup'); announce('Recording not started, because no save location was chosen.'); els.startBtn.focus(); return; }

  const sources = [];
  if (!audioOnly || settings.systemAudio) {
    announce(audioOnly ? 'Choose a tab or screen to record its audio.' : 'Choose a screen, window, or tab to record.');
    try {
      sources.push(await pickSource(settings));
    } catch (err) {
      console.warn('getDisplayMedia failed', err);
      discardOutput(file.output);
      setPhase('setup');
      if (err.name === 'NotAllowedError') announce('Selection was cancelled. Nothing was recorded.');
      else if (err.name === 'NotFoundError') announce('No screen, window, or tab is available to record.', 'error');
      else announce(`Couldn’t start capturing: ${err.message || err.name}`, 'error');
      els.startBtn.focus();
      return;
    }
  }
  rec = createSession(settings, sources);
  rec.filename = filename;
  rec.output = file.output;
  rec.warnings = warnings;
  showPreview(rec);
  startMeter();
  await prepareRecording(rec, { countIn: false });
}

// Arrange first: add up to two sources and the camera, preview the result, then start.
async function arrangeSources() {
  if (phase !== 'setup' || !canComposite) return;
  const settings = readSettings();
  if (settings.recordMode === 'audio') return;
  setPhase('starting');
  announce('Choose the first window, tab, or screen. You’ll stay on this page so you can arrange things.');
  let first;
  try {
    first = await pickSource(settings, { keepFocus: true });
  } catch (err) {
    setPhase('setup');
    announce(err.name === 'NotAllowedError' ? 'Nothing was shared.' : `Couldn’t start capturing: ${err.message || err.name}`,
      err.name === 'NotAllowedError' ? 'info' : 'error');
    els.arrangeBtn.focus();
    return;
  }
  rec = createSession(settings, [first]);
  rec.arranged = true;
  if (settings.cameraId !== 'none') {
    try { attachCamera(await getCamera(settings)); } catch (err) { console.warn('Camera failed', err); }
  }
  showPreview(rec);
  startMeter();
  setPhase('arranging');
  els.sourcesPanel.open = true;
  await layoutIncludes(first.id);
  if (rec === null || phase !== 'arranging') return; // already started or cancelled
  renderSources(true);
  announce(`Sharing ${surfaceName(first)}. Add a second source if you like, then start recording. After you press Start recording, switch to what you’re recording: you’ll hear three short beeps and a long one, and recording starts right after the long beep.`);
  els.addSourceBtn.focus();
}

function cancelArrange(reason = '') {
  if (!rec || !(phase === 'arranging' || phase === 'countin' || (phase === 'starting' && rec.arranged))) return;
  const session = rec;
  rec = null;
  cancelAnimationFrame(session.meterRaf);
  teardownCapture(session);
  discardOutput(session.output);
  els.video.srcObject = null;
  setPhase('setup');
  announce(`${reason ? reason + ' ' : ''}Nothing was recorded.`.trim());
  els.startBtn.focus();
}

async function startArranged({ countIn = true } = {}) {
  if (phase !== 'arranging' || !rec) return;
  if (!(await confirmReplacingRecovery()) || phase !== 'arranging') return;
  const session = rec;
  session.filename = recordingFilename(session.settings);
  setPhase('starting');
  const file = await openFileOutputIfNeeded(session.settings, session.filename, session.warnings);
  if (!file.ok) { setPhase('arranging'); announce('Recording not started, because no save location was chosen.'); els.startArrangedBtn.focus(); return; }
  session.output = file.output;
  await prepareRecording(session, { countIn });
}

// Opens the microphone and storage, creates the recorder, then starts (or counts in).
async function prepareRecording(session, { countIn }) {
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
  if (settings.micId !== 'none') {
    try {
      const mic = await getMic(settings);
      session.micStream = mic.stream;
      if (mic.fellBack) warnings.push('The chosen microphone wasn’t available, so the default one is being used.');
      if (session.mixer) session.mixer.setMic(mic.stream);
      mic.stream.getAudioTracks()[0].onended = () => {
        if (rec !== session) return;
        if (session.mixer) session.mixer.setMic(null);
        session.micStream = null;
        render();
        announce('The microphone was disconnected. Recording continues without it.', 'warn');
      };
    } catch (err) {
      console.warn('Microphone failed', err);
      warnings.push(err.name === 'NotAllowedError'
        ? 'Microphone access was blocked, so it isn’t being recorded.'
        : 'No microphone could be opened, so it isn’t being recorded.');
    }
  }
  if (!session.arranged && session.compositor && settings.cameraId !== 'none' && !session.camStream) {
    try { attachCamera(await getCamera(settings)); }
    catch (err) {
      console.warn('Camera failed', err);
      warnings.push(err.name === 'NotAllowedError' ? 'Camera access was blocked, so the camera isn’t shown.' : 'The camera couldn’t be opened, so it isn’t shown.');
    }
  }
  refreshDevices(); // labels become available once permission is granted
  const first = session.sources[0];
  if (settings.systemAudio && first && !session.sources.some((s) => s.stream.getAudioTracks().length)) {
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
  if (first && first.track.readyState === 'ended' && session.sources.length === 1) return fail('Sharing ended before recording started.');
  if (session.audioOnly && !session.micStream && !session.sources.some((s) => s.stream.getAudioTracks().length)) {
    return fail('There’s no audio to record: no microphone could be opened and the source didn’t share audio.');
  }

  const fmt = FORMATS[settings.format];
  const mimeType = supportedMime(settings.format, settings.recordMode);
  const videoTrack = session.compositor ? session.compositor.track : (first ? first.track : null);
  const tracks = session.audioOnly ? [session.mixer.track] : [videoTrack, ...(session.mixer ? [session.mixer.track] : [])];
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

  if (countIn) runCountIn(session);
  else beginRecording();
}

// Three short beeps and a long one, played through this page (not recorded). Recording starts
// the moment the long beep ends, so the beeps aren't in the recording. Timing comes from the
// audio clock, which keeps time even while you're on another tab.
function runCountIn(session) {
  setPhase('countin');
  announce('Switch to what you’re recording now. Recording starts right after the long beep.');
  const ctx = new AudioContext();
  session.countIn = ctx;
  const t0 = ctx.currentTime + 0.6;
  const tone = (at, freq, dur) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.35, at + 0.01);
    gain.gain.setValueAtTime(0.35, at + dur - 0.03);
    gain.gain.linearRampToValueAtTime(0, at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur);
    return osc;
  };
  for (let i = 0; i < 3; i++) tone(t0 + i, 660, 0.15);
  const last = tone(t0 + 3, 990, 0.7);
  last.onended = () => {
    if (session.countIn !== ctx) return;
    session.countIn = null;
    ctx.close().catch(() => {});
    if (rec === session && phase === 'countin') beginRecording();
  };
  ctx.resume().catch(() => {});
  els.cancelCountInBtn.focus();
}

function cancelCountIn() {
  if (phase !== 'countin' || !rec) return;
  const session = rec;
  if (session.countIn) { session.countIn.close().catch(() => {}); session.countIn = null; }
  // Go back to arranging, keeping the sources; drop what was opened for recording.
  session.recorder = null;
  discardOutput(session.output);
  session.output = null;
  if (session.mixer) session.mixer.setMic(null);
  stopStream(session.micStream);
  session.micStream = null;
  session.warnings = [];
  setPhase('arranging');
  announce('Count-in cancelled. Nothing was recorded.');
  els.startArrangedBtn.focus();
}

function beginRecording() {
  if (!rec || !rec.recorder || !(phase === 'starting' || phase === 'countin')) return;
  rec.recorder.start(1000); // hand data over every second, so nothing is held in one giant chunk
  rec.segmentStart = performance.now();
  rec.timerId = setInterval(tick, 500);
  setPhase('recording');
  tick();
  renderSources(true);
  const w = rec.warnings;
  announce(['Recording started.', ...w].join(' '), w.length ? 'warn' : 'info');
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

function toggleMute() {
  if (!rec || !rec.micStream) return;
  rec.muted = !rec.muted;
  rec.micStream.getAudioTracks().forEach((t) => { t.enabled = !rec.muted; });
  render();
  announce(rec.muted ? 'Microphone muted.' : 'Microphone on.');
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

// Audio-only recordings of a tab can switch to a different tab.
async function switchSource() {
  if (!rec || !rec.sources[0] || !(phase === 'recording' || phase === 'paused')) return;
  replaceSource(rec.sources[0]);
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
    pipWindow = await documentPictureInPicture.requestWindow({ width: 420, height: 200 });
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

  els.setupView.hidden = !setup;
  els.arrangeView.hidden = !arranging;
  els.countInView.hidden = phase !== 'countin';
  els.arrangeBtn.hidden = !canComposite || audioOnly;
  els.arrangeHint.hidden = els.arrangeBtn.hidden;
  els.arrangeBtn.disabled = phase !== 'setup';
  els.startArrangedBtn.disabled = phase !== 'arranging' || switching;

  // Sources and camera (Chrome and Edge), while arranging and recording
  const showSources = !!(rec && rec.compositor) && (arranging || phase === 'countin' || phase === 'recording' || phase === 'paused');
  els.sourcesPanel.hidden = !showSources;
  if (showSources) {
    els.addSourceBtn.hidden = rec.sources.length >= 2;
    els.addSourceBtn.disabled = switching;
    els.layoutSelect.disabled = rec.sources.length < 2;
    els.swapBtn.disabled = rec.sources.length < 2;
    els.cameraManageBtn.disabled = switching;
    els.liveCorner.disabled = !rec.camStream;
    els.sourceList.querySelectorAll('button').forEach((b) => { b.disabled = switching; });
  }
  els.liveSlot.hidden = !live;
  els.doneView.hidden = phase !== 'done';
  els.settings.hidden = !canRecord || !setup;
  els.settingsBody.disabled = phase !== 'setup';
  els.toolsRow.hidden = !setup;
  els.repairBtn.disabled = phase !== 'setup';
  els.startBtn.disabled = phase !== 'setup' || !canRecord;

  // Live controls
  els.recPill.dataset.state = phase;
  els.recLabel.textContent = paused ? 'Paused' : phase === 'stopping' ? 'Finishing…' : 'Recording';
  els.pauseLabel.textContent = paused ? 'Resume' : 'Pause';
  els.pauseIcon.hidden = paused;
  els.resumeIcon.hidden = !paused;
  els.pauseBtn.disabled = phase === 'stopping';

  const hasMic = !!(rec && rec.micStream);
  const muted = !!(rec && rec.muted);
  els.muteBtn.hidden = !hasMic;
  els.muteLabel.textContent = muted ? 'Unmute mic' : 'Mute mic';
  els.muteBtn.classList.toggle('is-active', muted);
  els.micOnIcon.hidden = muted;
  els.micOffIcon.hidden = !muted;
  els.muteBtn.disabled = phase === 'stopping';

  const hasCam = !!(rec && rec.camStream);
  els.cameraBtn.hidden = !hasCam;
  els.cameraLabel.textContent = rec && !rec.cameraVisible ? 'Show camera' : 'Hide camera';
  els.cameraBtn.classList.toggle('is-active', !!(rec && hasCam && !rec.cameraVisible));
  els.cameraBtn.disabled = phase === 'stopping';
  els.markerBtn.disabled = phase === 'stopping';

  els.switchBtn.hidden = !(rec && rec.audioOnly && rec.sources.length);
  els.switchBtn.disabled = switching || phase === 'stopping';
  els.popoutBtn.hidden = !canPip || !!pipWindow;
  els.popoutBtn.disabled = phase === 'stopping';
  els.stopBtn.disabled = phase === 'stopping';
  els.pipNote.hidden = !pipWindow;

  const mixer = rec && rec.mixer;
  els.levels.hidden = !mixer;
  els.micLevel.hidden = !hasMic;
  els.micLevel.classList.toggle('is-muted', muted);
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
  const capturing = live || arranging || phase === 'countin';
  const showVideo = capturing ? !audioOnly && !!rec && rec.sources.length > 0 : phase === 'done';
  els.video.hidden = !showVideo;
  els.stage.classList.toggle('is-audio', audioOnly && (phase === 'done' || live));
  els.stageEmpty.hidden = showVideo && !(audioOnly && phase === 'done');
  if (!canRecord) {
    els.stageTitle.textContent = 'Screen recording isn’t available here';
    els.stageText.textContent = 'Open this page in a recent desktop version of Chrome, Edge, Firefox, or Safari.';
  } else if (audioOnly && live) {
    els.stageTitle.textContent = 'Recording audio';
    els.stageText.textContent = 'Only sound is being recorded.';
  } else if (audioOnly && phase === 'done') {
    els.stageTitle.textContent = 'Audio recording';
    els.stageText.textContent = '';
  } else if (phase === 'starting' && !arrangedFlow) {
    els.stageTitle.textContent = 'Waiting for your selection';
    els.stageText.textContent = 'Pick what to record in the browser’s dialog.';
  } else {
    els.stageTitle.textContent = 'Ready when you are';
    els.stageText.textContent = readSettings().recordMode === 'audio'
      ? 'Start recording to capture your microphone and, if you choose, a tab’s audio.'
      : 'Start recording, then pick a screen, window, or tab to capture.';
  }
  if (!live) document.title = 'Screen Recorder';
}

// ---------- Keyboard shortcuts ----------
const SHORTCUTS = [
  ['KeyR', 'R', 'Start or new recording'],
  ['KeyP', 'P', 'Pause or resume'],
  ['KeyM', 'M', 'Mute or unmute mic'],
  ['KeyK', 'K', 'Add marker'],
  ['KeyC', 'C', 'Show or hide camera'],
  ['KeyS', 'S', 'Stop'],
];
function onKeydown(e) {
  if (e.key === 'Escape' && phase === 'countin' && !els.confirmDialog.open) { e.preventDefault(); cancelCountIn(); return; }
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
  if (!e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
  // While arranging: Alt+R starts right away, Alt+Shift+R counts in with beeps first.
  if (e.shiftKey) {
    if (e.code === 'KeyR' && phase === 'arranging') { e.preventDefault(); startArranged({ countIn: true }); }
    return;
  }
  const recording = phase === 'recording' || phase === 'paused';
  let handled = true;
  switch (e.code) {
    case 'KeyR':
      if (phase === 'setup') startRecording();
      else if (phase === 'arranging') startArranged({ countIn: false });
      else if (phase === 'done') newRecording();
      else handled = false;
      break;
    case 'KeyP': if (recording) togglePause(); else handled = false; break;
    case 'KeyM': if (rec && rec.micStream) toggleMute(); else handled = false; break;
    case 'KeyK': if (recording) addMarker(); else if (phase === 'done') addMarkerHere(); else handled = false; break;
    case 'KeyC': if (rec && rec.camStream) toggleCamera(); else handled = false; break;
    case 'KeyS': if (recording) stopRecording(); else if (phase === 'countin') cancelCountIn(); else handled = false; break;
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
  if (canComposite) {
    items.splice(1, 0, item([[isMac ? `${mod}⇧R` : `${mod}+Shift+R`, `${isMac ? 'Option' : 'Alt'} Shift R`]], 'While arranging: count in, then record'));
  }
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
els.startBtn.addEventListener('click', startRecording);
els.pauseBtn.addEventListener('click', togglePause);
els.muteBtn.addEventListener('click', toggleMute);
els.cameraBtn.addEventListener('click', toggleCamera);
els.markerBtn.addEventListener('click', addMarker);
els.stopBtn.addEventListener('click', stopRecording);
els.switchBtn.addEventListener('click', switchSource);
els.arrangeBtn.addEventListener('click', arrangeSources);
els.startArrangedBtn.addEventListener('click', () => startArranged({ countIn: true }));
els.cancelArrangeBtn.addEventListener('click', () => cancelArrange());
els.cancelCountInBtn.addEventListener('click', cancelCountIn);
els.addSourceBtn.addEventListener('click', addSource);
els.swapBtn.addEventListener('click', swapSources);
els.layoutSelect.addEventListener('change', () => setLayoutMode(els.layoutSelect.value));
els.cameraManageBtn.addEventListener('click', () => (rec && rec.camStream ? removeCamera() : addCamera()));
els.liveCorner.addEventListener('change', () => setCameraCorner(els.liveCorner.value));
els.popoutBtn.addEventListener('click', openPip);
els.pipReturnBtn.addEventListener('click', closePip);
els.newBtn.addEventListener('click', newRecording);
els.saveBtn.addEventListener('click', saveResult);
els.micAccessBtn.addEventListener('click', () => requestDeviceAccess('mic'));
els.cameraAccessBtn.addEventListener('click', () => requestDeviceAccess('camera'));
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
[els.micSelect, els.noiseSuppression, els.echoCancellation, els.leveling, els.systemAudio, els.qualitySelect, els.formatSelect,
  els.cameraSelect, els.cameraCorner, els.autoStopSelect, ...els.recordModeInputs, ...els.saveModeInputs]
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
  if (isLive() || phase === 'starting' || phase === 'arranging' || phase === 'countin' || (result && (!result.saved || result.dirty)) || pendingRecovery) {
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
render();
refreshDevices();
storage.init().then(() => {
  applySaveModes();
  render();
  refreshRecovery({ announceFound: true });
});
if (!canRecord) announce('This browser can’t record the screen.', 'error');
