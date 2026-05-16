// USRA PLUS — Chunk load error recovery
// Auto-reloads the page when a chunk fails to load (e.g., after deployment).
// This handles both synchronous errors and unhandled promise rejections.
(function () {
  var origError = window.onerror;
  window.onerror = function (msg, src, line, col, err) {
    if (err && err.name === 'ChunkLoadError') {
      console.warn('[USRA] ChunkLoadError detected, reloading...');
      window.location.reload();
      return true;
    }
    if (origError) return origError.apply(this, arguments);
    return false;
  };
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.name === 'ChunkLoadError') {
      console.warn('[USRA] ChunkLoadError in promise, reloading...');
      e.preventDefault();
      window.location.reload();
    }
  });
})();
