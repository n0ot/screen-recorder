'use strict';
// Reading and rewriting recordings without re-encoding them:
//   - WebM (EBML / Matroska), as written by Chrome and Firefox
//   - Fragmented MP4, as written by Chrome and Safari
// Used to add the duration, add chapters, trim, and repair files that were cut off.
// Everything works on Blobs/Files and slices them, so large files are never loaded whole.

async function readBytes(blob, start, end) {
  return new Uint8Array(await blob.slice(start, Math.min(end, blob.size)).arrayBuffer());
}
function concatBytes(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// Sequential reader that keeps a window of the file in memory.
class WindowReader {
  constructor(blob, windowSize = 8 << 20) { this.blob = blob; this.size = blob.size; this.windowSize = windowSize; this.start = 0; this.buf = new Uint8Array(0); }
  has(pos, len) { return pos >= this.start && pos + len <= this.start + this.buf.length; }
  async load(pos, len) {
    this.start = pos;
    this.buf = await readBytes(this.blob, pos, pos + Math.max(len, this.windowSize));
  }
  async ensure(pos, len) {
    len = Math.min(len, this.size - pos);
    if (len <= 0) return false;
    if (!this.has(pos, len)) await this.load(pos, len);
    return this.has(pos, len);
  }
}

/* =============================== WebM =============================== */

// EBML: each element is an ID, a size, then data. IDs and sizes are variable-length integers.
function ebmlVint(buf, pos, isId) {
  const first = buf[pos];
  if (first === undefined || first === 0) return null;
  let len = 1, mask = 0x80;
  while (!(first & mask)) { len++; mask >>= 1; }
  if (pos + len > buf.length) return null;
  let value = isId ? first : first & (mask - 1);
  let allOnes = (first & (mask - 1)) === mask - 1;
  for (let i = 1; i < len; i++) { value = value * 256 + buf[pos + i]; if (buf[pos + i] !== 0xff) allOnes = false; }
  return { value, len, unknown: !isId && allOnes };
}
function readElement(buf, pos) {
  const id = ebmlVint(buf, pos, true);
  if (!id) return null;
  const size = ebmlVint(buf, pos + id.len, false);
  if (!size) return null;
  const dataStart = pos + id.len + size.len;
  return {
    id: id.value, pos, sizePos: pos + id.len, sizeLen: size.len, size: size.value, unknown: size.unknown,
    dataStart, end: size.unknown ? Infinity : dataStart + size.value,
  };
}
function readUint(buf, pos, len) {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[pos + i];
  return v;
}
function encodeVint(n, len) {
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) { out[i] = n % 256; n = Math.floor(n / 256); }
  out[0] |= 0x80 >> (len - 1);
  return out;
}
function ebmlId(id) {
  const len = id < 0x100 ? 1 : id < 0x10000 ? 2 : id < 0x1000000 ? 3 : 4;
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) { out[i] = id % 256; id = Math.floor(id / 256); }
  return out;
}
function ebmlElement(id, payload) { return concatBytes([ebmlId(id), encodeVint(payload.length, 8), payload]); }
function ebmlUint(id, n) {
  const bytes = [];
  do { bytes.unshift(n % 256); n = Math.floor(n / 256); } while (n > 0);
  return ebmlElement(id, Uint8Array.from(bytes));
}
function ebmlFloat(id, f) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, f);
  return ebmlElement(id, b);
}
function ebmlString(id, s) { return ebmlElement(id, new TextEncoder().encode(s)); }

const EBML_HEADER = 0x1A45DFA3, SEGMENT = 0x18538067, SEEK_HEAD = 0x114D9B74, INFO = 0x1549A966;
const TRACKS = 0x1654AE6B, CLUSTER = 0x1F43B675, CHAPTERS = 0x1043A770, CUES = 0x1C53BB6B;
const TOP_LEVEL_IDS = new Set([CLUSTER, CUES, 0x1254C367, CHAPTERS, 0x1941A469, SEEK_HEAD, INFO, TRACKS]);
const CLUSTER_CHILD_IDS = new Set([0xE7, 0xA3, 0xA0, 0xA7, 0xAB, 0xEC, 0x5854, 0xAF]);
const UNKNOWN_SIZE = Uint8Array.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

// Track, timestamp (relative to its cluster) and keyframe flag of a SimpleBlock or BlockGroup.
function blockInfo(buf, el) {
  let d = el.dataStart, end = Math.min(el.end, buf.length);
  let key = true;
  if (el.id === 0xA0) {
    let q = d;
    d = -1;
    while (q < end) {
      const c = readElement(buf, q);
      if (!c || c.end > end) break;
      if (c.id === 0xA1) d = c.dataStart;
      if (c.id === 0xFB) key = false; // ReferenceBlock: depends on another frame
      q = c.end;
    }
    if (d < 0) return null;
  }
  const track = ebmlVint(buf, d, false);
  if (!track || d + track.len + 3 > buf.length) return null;
  const x = d + track.len;
  const rel = ((buf[x] << 8) | buf[x + 1]) << 16 >> 16;
  if (el.id === 0xA3) key = (buf[x + 2] & 0x80) !== 0;
  return { track: track.value, rel, key, relPos: x };
}

// Everything before the first cluster: the pieces needed to rebuild a header.
async function webmParseHeader(blob) {
  const NOT_WEBM = 'That doesn’t look like a WebM recording.';
  const head = await readBytes(blob, 0, 1 << 20);
  const ebml = readElement(head, 0);
  if (!ebml || ebml.id !== EBML_HEADER || ebml.unknown) throw new Error(NOT_WEBM);
  const seg = readElement(head, ebml.end);
  if (!seg || seg.id !== SEGMENT) throw new Error(NOT_WEBM);
  const h = { head, ebmlEnd: ebml.end, info: null, tracks: null, scale: 1e6, videoTrack: null, audioTracks: [], firstClusterPos: -1, firstTs: 0, hasSeekHead: false };
  for (let pos = seg.dataStart; pos < head.length;) {
    const el = readElement(head, pos);
    if (!el) break;
    if (el.id === CLUSTER) {
      h.firstClusterPos = pos;
      const t = readElement(head, el.dataStart);
      if (t && t.id === 0xE7) h.firstTs = readUint(head, t.dataStart, t.size);
      break;
    }
    if (el.unknown || el.end > head.length) break;
    // Firefox leaves an empty index here, which is safe to drop; a real one would be invalidated.
    if (el.id === SEEK_HEAD && el.size > 0) h.hasSeekHead = true;
    if (el.id === INFO) {
      h.info = el;
      for (let q = el.dataStart; q < el.end;) {
        const c = readElement(head, q);
        if (!c) break;
        if (c.id === 0x2AD7B1) h.scale = readUint(head, c.dataStart, c.size) || 1e6;
        q = c.end;
      }
    }
    if (el.id === TRACKS) {
      h.tracks = el;
      for (let q = el.dataStart; q < el.end;) {
        const entry = readElement(head, q);
        if (!entry) break;
        if (entry.id === 0xAE) {
          let num = 0, type = 0;
          for (let r = entry.dataStart; r < entry.end;) {
            const c = readElement(head, r);
            if (!c) break;
            if (c.id === 0xD7) num = readUint(head, c.dataStart, c.size);
            if (c.id === 0x83) type = readUint(head, c.dataStart, c.size);
            r = c.end;
          }
          if (type === 1 && h.videoTrack === null) h.videoTrack = num;
          if (type === 2) h.audioTracks.push(num);
        }
        q = entry.end;
      }
    }
    pos = el.end;
  }
  if (!h.info || !h.tracks || h.firstClusterPos < 0) throw new Error('That WebM file is missing its header, so it can’t be changed.');
  return h;
}

function webmChaptersElement(chapters) {
  const atoms = chapters.map((c) => ebmlElement(0xB6, concatBytes([
    ebmlUint(0x73C4, 1 + Math.floor(Math.random() * 0x7fffffff)),
    ebmlUint(0x91, Math.max(0, Math.round(c.ms * 1e6))),
    ebmlElement(0x80, concatBytes([ebmlString(0x85, c.name), ebmlString(0x437C, 'eng')])),
  ])));
  return ebmlElement(CHAPTERS, ebmlElement(0x45B9, concatBytes(atoms)));
}

// A fresh header: EBML header, Segment (unknown size), Info (with Duration), Tracks, and Chapters.
// Dropping any SeekHead/Cues is fine: browsers' recordings don't have them and players don't need them.
function webmBuildHeader(h, { durationMs, chapters }) {
  const { head } = h;
  const infoChildren = [];
  for (let q = h.info.dataStart; q < h.info.end;) {
    const c = readElement(head, q);
    if (!c) break;
    if (c.id !== 0x4489) infoChildren.push(head.slice(c.pos, c.end));
    q = c.end;
  }
  if (durationMs != null) infoChildren.push(ebmlFloat(0x4489, (durationMs * 1e6) / h.scale));
  return concatBytes([
    head.slice(0, h.ebmlEnd),
    ebmlId(SEGMENT), UNKNOWN_SIZE,
    ebmlElement(INFO, concatBytes(infoChildren)),
    head.slice(h.tracks.pos, h.tracks.end),
    ...(chapters && chapters.length ? [webmChaptersElement(chapters)] : []),
  ]);
}

// Rewrites just the header (duration, chapters); the clusters are reused as they are.
async function webmRewriteHeader(blob, { durationMs, chapters }) {
  const h = await webmParseHeader(blob);
  if (h.hasSeekHead) return blob; // written by another tool with an index we'd invalidate
  return new Blob([webmBuildHeader(h, { durationMs, chapters }), blob.slice(h.firstClusterPos)], { type: blob.type || 'video/webm' });
}

// Walks every cluster, noting where each starts and where the trim cut points are.
async function webmIndex(blob, h) {
  const r = new WindowReader(blob);
  const clusters = [];
  const cuts = [];      // keyframes: [{ ts, cluster, pos }]
  let lastTs = h.firstTs, pos = h.firstClusterPos;
  outer:
  while (pos < r.size) {
    if (!(await r.ensure(pos, 16))) break;
    const el = readElement(r.buf, pos - r.start);
    if (!el) break;
    if (el.id !== CLUSTER) {
      if (el.unknown || pos + (el.end - el.pos) > r.size) break;
      pos += el.end - el.pos;
      continue;
    }
    const abs = (rel) => rel + r.start;
    const c = { pos, ts: 0, childStart: -1, end: -1 };
    const clusterEnd = el.unknown ? Infinity : abs(el.end);
    let p = abs(el.dataStart), firstBlock = true, sawTs = false;
    while (p < Math.min(clusterEnd, r.size)) {
      if (!(await r.ensure(p, 16))) break outer;
      const child = readElement(r.buf, p - r.start);
      if (!child) break outer;
      if (el.unknown && TOP_LEVEL_IDS.has(child.id)) break; // next cluster
      if (child.unknown) break outer;
      const childEnd = p + (child.end - child.pos);
      if (childEnd > r.size) break outer;                    // cut off mid-element
      if (child.id === 0xE7) {
        await r.ensure(p, childEnd - p);
        const t = readElement(r.buf, p - r.start); // re-read: the window may have moved
        c.ts = readUint(r.buf, t.dataStart, t.size);
        if (!sawTs && firstBlock) c.childStart = childEnd;
        sawTs = true;
      } else if (child.id === 0xA3 || child.id === 0xA0) {
        await r.ensure(p, Math.min(childEnd - p, 64 << 10));
        const b = blockInfo(r.buf, readElement(r.buf, p - r.start));
        if (b) {
          const ts = c.ts + b.rel;
          lastTs = Math.max(lastTs, ts);
          const isCut = h.videoTrack !== null ? (b.track === h.videoTrack && b.key) : firstBlock;
          if (isCut) cuts.push({ ts, cluster: clusters.length, pos: p });
        }
        firstBlock = false;
      }
      p = childEnd;
    }
    c.end = Math.min(p, clusterEnd);
    clusters.push(c);
    pos = c.end;
  }
  return { clusters, cuts, lastTs, endPos: pos };
}

// Keeps only the part between startMs and endMs. The start moves back to the nearest
// keyframe so the video doesn't begin with a broken picture; the end is exact.
async function webmTrim(blob, h, idx, { startMs, endMs, chapters }) {
  if (!idx.cuts.length) throw new Error('There’s no keyframe to cut at in this recording.');
  const toTicks = (ms) => h.firstTs + (ms * 1e6) / h.scale;
  const want = toTicks(startMs), endTicks = toTicks(endMs);
  let cut = idx.cuts[0];
  for (const k of idx.cuts) { if (k.ts <= want) cut = k; else break; }
  const shift = cut.ts;
  const parts = [];
  let lastKept = shift;

  for (let i = cut.cluster; i < idx.clusters.length; i++) {
    const c = idx.clusters[i];
    if (c.childStart < 0) throw new Error('This recording is laid out in a way that can’t be trimmed.');
    const isFirst = i === cut.cluster;
    const nextTs = i + 1 < idx.clusters.length ? idx.clusters[i + 1].ts : Infinity;
    const needsBlocks = isFirst || nextTs > endTicks;
    if (!needsBlocks) {
      parts.push(concatBytes([ebmlId(CLUSTER), UNKNOWN_SIZE, ebmlUint(0xE7, c.ts - shift)]), blob.slice(c.childStart, c.end));
      lastKept = Math.max(lastKept, nextTs);
      continue;
    }
    // Go block by block: drop what's before the cut or after the end.
    const bytes = await readBytes(blob, c.childStart, c.end);
    const kept = [];
    let done = false;
    for (let q = 0; q < bytes.length;) {
      const el = readElement(bytes, q);
      if (!el || el.end > bytes.length) break;
      if (el.id === 0xA3 || el.id === 0xA0) {
        const b = blockInfo(bytes, el);
        const ts = b ? c.ts + b.rel : 0;
        if (b && ts > endTicks) { done = true; break; }
        if (b && (!isFirst || (c.childStart + q >= cut.pos && ts >= shift))) {
          const copy = bytes.slice(el.pos, el.end);
          if (isFirst) {
            // This cluster is re-based to 0, so rewrite each block's offset.
            const rel = ts - shift;
            const at = b.relPos - el.pos;
            copy[at] = (rel >> 8) & 0xff;
            copy[at + 1] = rel & 0xff;
          }
          kept.push(copy);
          lastKept = Math.max(lastKept, ts);
        }
      }
      q = el.end;
    }
    parts.push(concatBytes([ebmlId(CLUSTER), UNKNOWN_SIZE, ebmlUint(0xE7, isFirst ? 0 : c.ts - shift), ...kept]));
    if (done) break;
  }
  const actualStartMs = ((shift - h.firstTs) * h.scale) / 1e6;
  const durationMs = ((Math.min(lastKept, endTicks) - shift) * h.scale) / 1e6;
  const shifted = (chapters || []).filter((c) => c.ms >= actualStartMs && c.ms <= actualStartMs + durationMs)
    .map((c) => ({ ...c, ms: c.ms - actualStartMs }));
  const header = webmBuildHeader(h, { durationMs, chapters: shifted });
  return { blob: new Blob([header, ...parts], { type: blob.type || 'video/webm' }), startMs: actualStartMs, durationMs };
}

// Repairs a WebM file that was cut off: finds the last complete frame by searching backwards
// from the end, drops any half-written data, and writes the real duration into the header.
async function webmRepair(file) {
  const h = await webmParseHeader(file);
  for (let windowSize = 4 << 20; ; windowSize *= 4) {
    const start = Math.max(0, file.size - windowSize);
    const buf = await readBytes(file, start, file.size);
    for (let i = buf.length - 4; i >= 0; i--) {
      if (buf[i] !== 0x1F || buf[i + 1] !== 0x43 || buf[i + 2] !== 0xB6 || buf[i + 3] !== 0x75) continue;
      const c = webmScanCluster(buf, i);
      if (!c) continue;
      const durationMs = Math.max(0, ((c.maxTs - h.firstTs) * h.scale) / 1e6);
      const cutAt = start + c.lastGood;
      let body = file, trimmedBytes = 0;
      if (c.truncated) {
        trimmedBytes = file.size - cutAt;
        body = c.unknown
          ? file.slice(0, cutAt)
          : new Blob([file.slice(0, start + c.sizePos), encodeVint(c.lastGood - c.dataStart, c.sizeLen), file.slice(start + c.sizePos + c.sizeLen, cutAt)]);
      }
      const blob = await webmRewriteHeader(new Blob([body], { type: 'video/webm' }), { durationMs });
      return { blob, durationMs, trimmedBytes, hasVideo: h.videoTrack !== null };
    }
    if (start === 0 || windowSize >= 256 << 20) throw new Error('No complete recording was found in that file, so it can’t be repaired.');
  }
}

// Checks that `i` really starts a cluster (not look-alike bytes inside video data), and finds
// its last complete block. Returns null if it doesn't parse cleanly.
function webmScanCluster(buf, i) {
  const cl = readElement(buf, i);
  if (!cl || cl.id !== CLUSTER) return null;
  const limit = Math.min(buf.length, cl.end);
  let p = cl.dataStart, ts = null, maxTs = -Infinity, blocks = 0, truncated = false;
  while (p < limit) {
    const el = readElement(buf, p);
    if (!el) { if (buf.length - p < 16) { truncated = true; break; } return null; }
    if (cl.unknown && TOP_LEVEL_IDS.has(el.id)) break;
    if (el.unknown) return null;
    if (el.end > limit) {
      if (el.end > buf.length && limit === buf.length) { truncated = true; break; }
      return null;
    }
    if (el.id === 0xE7) {
      if (ts !== null || blocks) return null;
      ts = readUint(buf, el.dataStart, el.size);
    } else if (el.id === 0xA3 || el.id === 0xA0) {
      if (ts === null) return null;
      const b = blockInfo(buf, el);
      if (!b) return null;
      maxTs = Math.max(maxTs, ts + b.rel);
      blocks++;
    } else if (!CLUSTER_CHILD_IDS.has(el.id)) {
      return null;
    }
    p = el.end;
  }
  if (ts === null || !blocks) return null;
  return {
    sizePos: cl.sizePos, sizeLen: cl.sizeLen, unknown: cl.unknown, dataStart: cl.dataStart,
    lastGood: p, truncated: truncated || (!cl.unknown && cl.end > buf.length), maxTs,
  };
}

/* ============================ Fragmented MP4 ============================ */

const u32 = (b, p) => ((b[p] << 24) >>> 0) + (b[p + 1] << 16) + (b[p + 2] << 8) + b[p + 3];
const u64 = (b, p) => u32(b, p) * 2 ** 32 + u32(b, p + 4);
function setU32(b, p, v) { b[p] = (v >>> 24) & 0xff; b[p + 1] = (v >>> 16) & 0xff; b[p + 2] = (v >>> 8) & 0xff; b[p + 3] = v & 0xff; }
function setU64(b, p, v) { setU32(b, p, Math.floor(v / 2 ** 32)); setU32(b, p + 4, v % 2 ** 32); }
const fourcc = (b, p) => String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);

function mp4Children(b, start, end) {
  const out = [];
  for (let p = start; p + 8 <= end;) {
    let size = u32(b, p), hl = 8;
    if (size === 1) { size = u64(b, p + 8); hl = 16; }
    if (size < hl || p + size > end) break;
    out.push({ type: fourcc(b, p + 4), pos: p, size, end: p + size, data: p + hl });
    p += size;
  }
  return out;
}
function mp4Box(type, payload) {
  const out = new Uint8Array(8 + payload.length);
  setU32(out, 0, out.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function mp4ParseMoov(b) {
  const tracks = {};
  let timescale = 1000;
  const trex = {};
  for (const box of mp4Children(b, 8, b.length)) {
    if (box.type === 'mvhd') timescale = u32(b, box.data + (b[box.data] === 1 ? 20 : 12));
    if (box.type === 'trak') {
      const t = { id: 0, handler: '', timescale: 1000 };
      for (const c of mp4Children(b, box.data, box.end)) {
        if (c.type === 'tkhd') t.id = u32(b, c.data + (b[c.data] === 1 ? 20 : 12));
        if (c.type === 'mdia') {
          for (const m of mp4Children(b, c.data, c.end)) {
            if (m.type === 'mdhd') t.timescale = u32(b, m.data + (b[m.data] === 1 ? 20 : 12));
            if (m.type === 'hdlr') t.handler = fourcc(b, m.data + 8);
          }
        }
      }
      tracks[t.id] = t;
    }
    if (box.type === 'mvex') {
      for (const c of mp4Children(b, box.data, box.end)) {
        if (c.type === 'trex') trex[u32(b, c.data + 4)] = { duration: u32(b, c.data + 12), flags: u32(b, c.data + 20) };
      }
    }
  }
  const video = Object.values(tracks).find((t) => t.handler === 'vide');
  return { tracks, timescale, trex, videoTrack: video ? video.id : null };
}

// Timing of one fragment, read from its moof box.
function mp4ParseMoof(b, info) {
  const trafs = [];
  let relocatable = true;
  for (const traf of mp4Children(b, 8, b.length)) {
    if (traf.type !== 'traf') continue;
    const t = { trackId: 0, tfdtPos: -1, tfdtVersion: 0, bmdt: 0, duration: 0, firstSync: true };
    let defDur = 0, defFlags = 0;
    for (const c of mp4Children(b, traf.data, traf.end)) {
      if (c.type === 'tfhd') {
        const fl = (b[c.data + 1] << 16) | (b[c.data + 2] << 8) | b[c.data + 3];
        t.trackId = u32(b, c.data + 4);
        const tx = info.trex[t.trackId] || { duration: 0, flags: 0 };
        defDur = tx.duration; defFlags = tx.flags;
        let q = c.data + 8;
        if (fl & 0x1) { relocatable = false; q += 8; }
        if (fl & 0x2) q += 4;
        if (fl & 0x8) { defDur = u32(b, q); q += 4; }
        if (fl & 0x10) q += 4;
        if (fl & 0x20) { defFlags = u32(b, q); q += 4; }
        // Without an explicit base-data-offset, sample data is located relative to this moof,
        // so the fragment can be moved as a unit.
      }
      if (c.type === 'tfdt') {
        t.tfdtVersion = b[c.data];
        t.tfdtPos = c.data + 4;
        t.bmdt = t.tfdtVersion === 1 ? u64(b, c.data + 4) : u32(b, c.data + 4);
      }
      if (c.type === 'trun') {
        const fl = (b[c.data + 1] << 16) | (b[c.data + 2] << 8) | b[c.data + 3];
        const count = u32(b, c.data + 4);
        let q = c.data + 8;
        if (fl & 0x1) q += 4;
        let firstFlags = null;
        if (fl & 0x4) { firstFlags = u32(b, q); q += 4; }
        for (let i = 0; i < count; i++) {
          let dur = defDur, flags = defFlags;
          if (fl & 0x100) { dur = u32(b, q); q += 4; }
          if (fl & 0x200) q += 4;
          if (fl & 0x400) { flags = u32(b, q); q += 4; }
          if (fl & 0x800) q += 4;
          if (i === 0) {
            if (firstFlags !== null) flags = firstFlags;
            t.firstSync = (flags & 0x10000) === 0;
          }
          t.duration += dur;
        }
      }
    }
    trafs.push(t);
  }
  return { trafs, relocatable };
}

async function mp4Index(blob) {
  const NOT_MP4 = 'That doesn’t look like an MP4 recording.';
  const boxes = [];
  let pos = 0, moov = null, moovBytes = null, ftyp = null;
  const fragments = [];
  let pendingMoof = null, relocatable = true;
  while (pos + 8 <= blob.size) {
    const hdr = await readBytes(blob, pos, pos + 16);
    if (hdr.length < 8) break;
    let size = u32(hdr, 0), hl = 8;
    const type = fourcc(hdr, 4);
    if (size === 1) { size = u64(hdr, 8); hl = 16; }
    if (size === 0) size = blob.size - pos;
    if (!/^[a-z0-9 ]{4}$/i.test(type) || size < hl) { if (!boxes.length) throw new Error(NOT_MP4); break; }
    if (pos + size > blob.size) break; // cut off
    boxes.push({ type, pos, size });
    if (type === 'ftyp') ftyp = { pos, size };
    if (type === 'moov') { moov = { pos, size }; moovBytes = await readBytes(blob, pos, pos + size); }
    if (type === 'moof') pendingMoof = { pos, bytes: await readBytes(blob, pos, pos + size) };
    if (type === 'mdat' && pendingMoof) {
      fragments.push({ pos: pendingMoof.pos, moof: pendingMoof.bytes, end: pos + size });
      pendingMoof = null;
    }
    pos += size;
  }
  if (!ftyp && !moov) throw new Error(NOT_MP4);
  if (!moov) throw new Error('That MP4 file is missing its header, so it can’t be changed.');
  const info = mp4ParseMoov(moovBytes);
  for (const f of fragments) {
    const m = mp4ParseMoof(f.moof, info);
    if (!m.relocatable) relocatable = false;
    f.trafs = m.trafs;
    let start = Infinity, end = 0, sync = info.videoTrack === null;
    for (const t of m.trafs) {
      const ts = (info.tracks[t.trackId] || {}).timescale || 1000;
      start = Math.min(start, t.bmdt / ts);
      end = Math.max(end, (t.bmdt + t.duration) / ts);
      if (t.trackId === info.videoTrack) sync = t.firstSync;
    }
    f.startSec = start; f.endSec = end; f.sync = sync;
  }
  const lastEnd = fragments.length ? fragments[fragments.length - 1].end : (moov.pos + moov.size);
  return { blob, ftyp, moov, moovBytes, info, fragments, relocatable, endPos: lastEnd, fragmented: fragments.length > 0 };
}

// Rebuilds moov with a duration (mvhd + mehd) and, optionally, Nero-style chapters (udta/chpl,
// read by VLC, mpv, ffmpeg and others).
function mp4BuildMoov(idx, { durationMs, chapters }) {
  const b = idx.moovBytes;
  const ts = idx.info.timescale;
  const parts = [];
  let sawUdta = false;
  for (const box of mp4Children(b, 8, b.length)) {
    let bytes = b.slice(box.pos, box.end);
    if (box.type === 'mvhd' && durationMs != null) {
      const v1 = bytes[8] === 1;
      const at = 8 + (v1 ? 24 : 16);
      if (v1) setU64(bytes, at, Math.round((durationMs / 1000) * ts)); else setU32(bytes, at, Math.round((durationMs / 1000) * ts));
    }
    if (box.type === 'mvex' && durationMs != null) {
      const kids = mp4Children(b, box.data, box.end).filter((c) => c.type !== 'mehd').map((c) => b.slice(c.pos, c.end));
      const mehd = new Uint8Array(12);
      mehd[0] = 1; // version 1: 64-bit duration
      setU64(mehd, 4, Math.round((durationMs / 1000) * ts));
      bytes = mp4Box('mvex', concatBytes([mp4Box('mehd', mehd), ...kids]));
    }
    if (box.type === 'udta') {
      sawUdta = true;
      if (chapters && chapters.length) {
        const kids = mp4Children(b, box.data, box.end).filter((c) => c.type !== 'chpl').map((c) => b.slice(c.pos, c.end));
        bytes = mp4Box('udta', concatBytes([...kids, mp4Chpl(chapters)]));
      }
    }
    parts.push(bytes);
  }
  if (!sawUdta && chapters && chapters.length) parts.push(mp4Box('udta', mp4Chpl(chapters)));
  return mp4Box('moov', concatBytes(parts));
}
function mp4Chpl(chapters) {
  const enc = new TextEncoder();
  const items = chapters.slice(0, 255).map((c) => {
    const name = enc.encode(c.name).slice(0, 255);
    const out = new Uint8Array(9 + name.length);
    setU64(out, 0, Math.round(c.ms * 1e4)); // 100 ns units
    out[8] = name.length;
    out.set(name, 9);
    return out;
  });
  const head = new Uint8Array(9);
  head[0] = 1;            // version 1
  head[8] = items.length; // 4 bytes reserved, then the count
  return mp4Box('chpl', concatBytes([head, ...items]));
}

// Writes a new file from fragments [from, to], re-timed to start at zero.
function mp4Assemble(idx, from, to, { durationMs, chapters }) {
  const { blob } = idx;
  const shiftSec = idx.fragments[from].startSec;
  const parts = [];
  if (idx.ftyp) parts.push(blob.slice(idx.ftyp.pos, idx.ftyp.pos + idx.ftyp.size));
  parts.push(mp4BuildMoov(idx, { durationMs, chapters }));
  for (let i = from; i <= to; i++) {
    const f = idx.fragments[i];
    if (shiftSec > 0) {
      const moof = f.moof.slice();
      for (const t of f.trafs) {
        if (t.tfdtPos < 0) continue;
        const ts = (idx.info.tracks[t.trackId] || {}).timescale || 1000;
        const v = Math.max(0, t.bmdt - Math.round(shiftSec * ts));
        if (t.tfdtVersion === 1) setU64(moof, t.tfdtPos, v); else setU32(moof, t.tfdtPos, v);
      }
      parts.push(moof, blob.slice(f.pos + f.moof.length, f.end));
    } else {
      parts.push(blob.slice(f.pos, f.end));
    }
  }
  return new Blob(parts, { type: blob.type || 'video/mp4' });
}

async function mp4RewriteHeader(blob, { durationMs, chapters }) {
  const idx = await mp4Index(blob);
  if (!idx.fragmented || !idx.relocatable) return blob;
  const d = durationMs != null ? durationMs : mp4Duration(idx, 0, idx.fragments.length - 1);
  return mp4Assemble(idx, 0, idx.fragments.length - 1, { durationMs: d, chapters });
}
function mp4Duration(idx, from, to) {
  return Math.max(0, (idx.fragments[to].endSec - idx.fragments[from].startSec) * 1000);
}

async function mp4Trim(idx, { startMs, endMs, chapters }) {
  if (!idx.fragmented || !idx.relocatable) throw new Error('This MP4 file is laid out in a way that can’t be trimmed.');
  const base = idx.fragments[0].startSec;
  const want = base + startMs / 1000, endSec = base + endMs / 1000;
  let from = idx.fragments.findIndex((f) => f.sync);
  if (from < 0) throw new Error('There’s no keyframe to cut at in this recording.');
  idx.fragments.forEach((f, i) => { if (f.sync && f.startSec <= want + 1e-6) from = i; });
  // Fragments are about a second long; keep one if most of it comes before the end point.
  let to = from;
  idx.fragments.forEach((f, i) => { if (i >= from && (f.startSec + f.endSec) / 2 <= endSec) to = i; });
  const actualStartMs = (idx.fragments[from].startSec - base) * 1000;
  const durationMs = mp4Duration(idx, from, to);
  const shifted = (chapters || []).filter((c) => c.ms >= actualStartMs && c.ms <= actualStartMs + durationMs)
    .map((c) => ({ ...c, ms: c.ms - actualStartMs }));
  return { blob: mp4Assemble(idx, from, to, { durationMs, chapters: shifted }), startMs: actualStartMs, durationMs };
}

async function mp4Repair(file) {
  const idx = await mp4Index(file);
  if (!idx.fragmented) {
    if (idx.endPos >= file.size) return { blob: file, durationMs: null, trimmedBytes: 0, hasVideo: idx.info.videoTrack !== null };
    throw new Error('No complete recording was found in that file, so it can’t be repaired.');
  }
  if (!idx.relocatable) throw new Error('This MP4 file is laid out in a way that can’t be repaired.');
  const last = idx.fragments.length - 1;
  const durationMs = mp4Duration(idx, 0, last);
  return {
    blob: mp4Assemble(idx, 0, last, { durationMs }),
    durationMs,
    trimmedBytes: file.size - idx.endPos,
    hasVideo: idx.info.videoTrack !== null,
  };
}

/* ============================ Format-neutral ============================ */

async function sniffFormat(blob) {
  const b = await readBytes(blob, 0, 12);
  if (b.length >= 4 && u32(b, 0) === EBML_HEADER) return 'webm';
  if (b.length >= 8 && fourcc(b, 4) === 'ftyp') return 'mp4';
  return null;
}
const UNKNOWN_FORMAT = 'That doesn’t look like a WebM or MP4 recording, so it can’t be repaired.';

// Adds the duration (and chapters) to a freshly recorded file.
async function finalizeMedia(blob, format, { durationMs, chapters } = {}) {
  try {
    if (format === 'webm') return await webmRewriteHeader(blob, { durationMs, chapters });
    if (format === 'mp4') return await mp4RewriteHeader(blob, { durationMs, chapters });
  } catch (err) {
    console.warn('Could not finalize the recording', err);
  }
  return blob;
}

async function repairMedia(file) {
  const format = await sniffFormat(file);
  if (format === 'webm') return { format, ...(await webmRepair(file)) };
  if (format === 'mp4') return { format, ...(await mp4Repair(file)) };
  throw new Error(UNKNOWN_FORMAT);
}

// Prepares a file for trimming; returns cut points (in ms) and a trim function.
async function prepareTrim(blob, format) {
  if (format === 'webm') {
    const h = await webmParseHeader(blob);
    const idx = await webmIndex(blob, h);
    const cuts = idx.cuts.map((k) => ((k.ts - h.firstTs) * h.scale) / 1e6);
    return { cuts, trim: (opts) => webmTrim(blob, h, idx, opts) };
  }
  if (format === 'mp4') {
    const idx = await mp4Index(blob);
    if (!idx.fragmented || !idx.relocatable) throw new Error('This MP4 file is laid out in a way that can’t be trimmed.');
    const base = idx.fragments[0].startSec;
    const cuts = idx.fragments.filter((f) => f.sync).map((f) => (f.startSec - base) * 1000);
    return { cuts, trim: (opts) => mp4Trim(idx, opts) };
  }
  throw new Error('This recording can’t be trimmed.');
}
