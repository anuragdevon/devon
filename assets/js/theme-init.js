/* Pre-paint theme: applies the saved theme before the CSS paints, so there's no flash.
   Loaded blocking in <head> (not inline) so the CSP can keep script-src 'self'. */
(function () {
  var t = 'dark';
  try { t = localStorage.getItem('theme') || 'dark'; } catch (e) { /* storage blocked: keep dark */ }
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
}());
