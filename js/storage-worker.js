'use strict';
// Writes the recording into browser storage (the origin private file system) as it records.
// A sync access handle writes in place and is flushed every second, so unlike a normal file
// write nothing is held back until the end: a crash only loses the last moment.
let handle = null;
let pos = 0;
let chain = Promise.resolve();
let dirPromise = null;

function dir() {
  if (!dirPromise) dirPromise = navigator.storage.getDirectory().then((root) => root.getDirectoryHandle('recordings', { create: true }));
  return dirPromise;
}

async function run(msg) {
  if (msg.type === 'probe') {
    const d = await dir();
    const fh = await d.getFileHandle('.probe', { create: true });
    const h = await fh.createSyncAccessHandle();
    await h.close();
    await d.removeEntry('.probe');
  } else if (msg.type === 'open') {
    const d = await dir();
    const fh = await d.getFileHandle(msg.name, { create: true });
    handle = await fh.createSyncAccessHandle();
    await handle.truncate(0);
    pos = 0;
  } else if (msg.type === 'write') {
    const data = new Uint8Array(msg.buf);
    const n = await handle.write(data, { at: pos });
    pos += n;
    await handle.flush();
    if (n !== data.byteLength) throw new DOMException('Not enough space to keep recording.', 'QuotaExceededError');
  } else if (msg.type === 'close') {
    if (handle) { await handle.flush(); await handle.close(); handle = null; }
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'discard') {
    // The page is going away: close at once (this is synchronous), then delete, skipping the queue.
    try { if (handle) handle.close(); } catch { /* ignore */ }
    handle = null;
    dir().then((d) => d.removeEntry(msg.name)).catch(() => {});
    return;
  }
  chain = chain.then(() => run(msg)).then(
    () => self.postMessage({ id: msg.id, ok: true }),
    (err) => self.postMessage({ id: msg.id, ok: false, name: err && err.name, message: err && err.message }),
  );
};
