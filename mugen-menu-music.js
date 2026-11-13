/* NEW MUGEN RISING - main-menu music. No gameplay dependencies. */
(() => {
  'use strict';

  const TRACK_URL = 'assets/music/main-menu-theme.ogg';
  const DB_NAME = 'new-mugen-audio';
  const DB_STORE = 'settings';
  const DB_KEY = 'main-menu-track';
  const TARGET_VOLUME = 0.42;
  const FADE_IN_MS = 1100;
  const FADE_OUT_MS = 650;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 0;
  audio.src = TRACK_URL;

  const toggle = document.getElementById('menu-music-toggle');
  const importButton = document.getElementById('menu-music-import');
  const fileInput = document.getElementById('menu-theme-upload');
  const status = document.getElementById('menu-music-status');
  let enabled = true;
  let unlocked = false;
  let autoplayBlocked = false;
  let preferredBlobUrl = null;
  let fadeFrame = 0;
  let fadeEpoch = 0;
  let playEpoch = 0;
  let imported = false;

  const isMenu = () => (document.body.dataset.screen || 'menu') === 'menu' && !document.hidden;
  const setStatus = message => { if (status) status.textContent = message; };
  const syncButton = () => {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'On' : 'Off';
  };

  function fadeTo(volume, duration) {
    cancelAnimationFrame(fadeFrame);
    const epoch = ++fadeEpoch;
    const from = audio.volume;
    const start = performance.now();
    if (Math.abs(from - volume) < 0.001) {
      audio.volume = volume;
      if (volume === 0) audio.pause();
      return;
    }
    const tick = now => {
      if (epoch !== fadeEpoch) return;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const ease = t * t * (3 - 2 * t);
      audio.volume = Math.max(0, Math.min(1, from + (volume - from) * ease));
      if (t < 1) fadeFrame = requestAnimationFrame(tick);
      else if (volume === 0) audio.pause();
    };
    fadeFrame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    // Start music on page load whenever the browser's autoplay policy allows.
    // Browsers that reject audible autoplay will succeed on the first trusted
    // button, key, or PS5 controller menu interaction instead.
    const desired = enabled && isMenu();
    const epoch = ++playEpoch;
    if (!desired) {
      fadeTo(0, FADE_OUT_MS);
      return;
    }
    const wasPaused = audio.paused;
    const playing = wasPaused ? audio.play() : Promise.resolve();
    if (playing && typeof playing.then === 'function') {
      playing.then(() => {
        if (epoch !== playEpoch || !enabled || !isMenu()) return;
        autoplayBlocked = false;
        fadeTo(TARGET_VOLUME, FADE_IN_MS);
        setStatus(imported ? 'Custom theme playing' : 'Main menu theme playing');
      }).catch(error => {
        if (epoch !== playEpoch) return;
        if (error?.name === 'NotAllowedError') {
          autoplayBlocked = true;
          setStatus('Press X, Enter, or tap to start the menu music.');
        } else if (error?.name !== 'AbortError') {
          setStatus('Theme could not play. Import an audio file in Options.');
        }
      });
    } else {
      fadeTo(TARGET_VOLUME, FADE_IN_MS);
    }
  }

  function unlock() {
    unlocked = true;
    if (enabled && isMenu() && (autoplayBlocked || audio.paused)) syncPlayback();
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    syncButton();
    syncPlayback();
    setStatus(enabled ? (imported ? 'Custom theme ready' : 'Main menu theme') : 'Music muted');
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveCustomTrack(file) {
    const db = await openDB();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(DB_STORE, 'readwrite');
        transaction.objectStore(DB_STORE).put(file, DB_KEY);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } finally { db.close(); }
  }

  async function loadCustomTrack() {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(DB_STORE, 'readonly');
        const request = transaction.objectStore(DB_STORE).get(DB_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }

  function setSource(blob) {
    ++playEpoch;
    cancelAnimationFrame(fadeFrame);
    ++fadeEpoch;
    audio.pause();
    audio.volume = 0;
    if (preferredBlobUrl) URL.revokeObjectURL(preferredBlobUrl);
    preferredBlobUrl = URL.createObjectURL(blob);
    audio.src = preferredBlobUrl;
    audio.load();
    imported = true;
    setStatus('Custom theme loaded - looping');
    syncPlayback();
  }

  toggle?.addEventListener('click', () => setEnabled(!enabled));
  importButton?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!/\.(ogg|mp3|wav|m4a)$/i.test(file.name) && !/^audio\//.test(file.type)) {
      setStatus('Select an OGG, MP3, WAV, or M4A audio file.');
      return;
    }
    if (file.size > 35 * 1024 * 1024) {
      setStatus('Music file is too large (35 MB maximum).');
      return;
    }
    setSource(file);
    unlock();
    try { await saveCustomTrack(file); }
    catch (_) { setStatus('Theme loaded for this visit. Browser storage is unavailable.'); }
    fileInput.value = '';
  });

  const screenObserver = new MutationObserver(() => syncPlayback());
  screenObserver.observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
  document.addEventListener('visibilitychange', syncPlayback);
  window.addEventListener('pagehide', () => { ++playEpoch; cancelAnimationFrame(fadeFrame); audio.pause(); audio.volume = 0; });
  const gesture = () => { if (enabled && isMenu() && (!unlocked || autoplayBlocked || audio.paused)) unlock(); };
  document.addEventListener('pointerdown', gesture);
  document.addEventListener('keydown', gesture);
  audio.addEventListener('error', () => {
    if (!imported) setStatus('To enable your theme, choose Import Theme or add the OGG in assets/music.');
  });

  window.MugenMenuMusic = { unlock, setEnabled, isEnabled: () => enabled };
  syncButton();
  loadCustomTrack().then(file => {
    if (file instanceof Blob) setSource(file);
    else syncPlayback();
  }).catch(() => syncPlayback());
})();