// USRA PLUS — Theme flash prevention
// Applied before paint to avoid FOUC (flash of unstyled content).
// This script MUST run synchronously in <head> before React hydration.
(function () {
  try {
    var t = localStorage.getItem('usra-theme');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('light');
  }
})();
