/* Study notes progress (layouts/study/): a reader marks a note complete and sees how far
   they are through each track. Progress lives in this browser's localStorage (no account,
   nothing leaves the device). Every element it drives carries data-study-note="<note path>".
   No-op on pages without study markup. */
(function () {
  'use strict';
  if (!document.querySelector('[data-study-note]')) return;

  var KEY = 'study-progress-v1';

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '{}');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) { return {}; }
  }
  function save(done) {
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* private mode: progress lasts this visit */ }
  }

  var done = load();
  var isDone = function (path) { return Object.prototype.hasOwnProperty.call(done, path); };

  function setBar(bar, n, total) {
    if (!bar) return;
    bar.setAttribute('aria-valuenow', n);
    bar.setAttribute('aria-valuemax', total);
    var fill = bar.querySelector('.study-bar-fill');
    if (fill) fill.style.width = (total ? (n / total) * 100 : 0) + '%';
  }

  function render() {
    // Cards on /study/ and the track list at the end of a note.
    document.querySelectorAll('[data-study-note]').forEach(function (el) {
      var d = isDone(el.dataset.studyNote);
      el.classList.toggle('is-done', d);
      var badge = el.querySelector('.series-badge');
      if (badge && !badge.classList.contains('series-badge--current')) {
        badge.classList.toggle('series-badge--done', d);
        badge.classList.toggle('series-badge--next', !d);
      }
    });

    // Per-track and overall progress on /study/.
    var all = 0, total = 0;
    document.querySelectorAll('[data-study-track]').forEach(function (track) {
      var cards = document.querySelectorAll('.blog-card[data-track="' + track.dataset.studyTrack + '"]');
      if (!cards.length) return;
      var n = 0;
      cards.forEach(function (c) { if (isDone(c.dataset.studyNote)) n++; });
      all += n; total += cards.length;
      var count = track.querySelector('.study-count');
      if (count) count.textContent = n + ' / ' + cards.length + ' done';
      setBar(track.querySelector('.study-bar'), n, cards.length);
    });
    var panel = document.querySelector('[data-study-progress]');
    if (panel) {
      panel.hidden = false;
      panel.querySelector('.study-progress-count').textContent =
        all === total && total ? 'All ' + total + ' notes done. Nice work.' : all + ' of ' + total + ' notes done';
      setBar(panel.querySelector('.study-bar'), all, total);
      panel.querySelector('.study-reset').hidden = all === 0;
    }

    // The "mark as complete" control on a note.
    var mark = document.querySelector('.study-mark');
    if (mark) {
      mark.hidden = false;
      var d = isDone(mark.dataset.studyNote);
      var btn = mark.querySelector('.study-mark-btn');
      btn.setAttribute('aria-pressed', d ? 'true' : 'false');
      btn.textContent = d ? '✓ Completed · undo' : 'Mark as complete';
      btn.classList.toggle('btn-primary', !d);
      btn.classList.toggle('btn-ghost', d);
      var status = document.querySelector('.hero-meta .study-status');
      if (d && !status) {
        status = document.createElement('span');
        status.className = 'study-status';
        status.setAttribute('data-icon', '✅');
        status.textContent = 'Completed';
        document.querySelector('.hero-meta').appendChild(status);
      } else if (!d && status) status.remove();
    }
  }

  var mark = document.querySelector('.study-mark');
  if (mark) {
    mark.querySelector('.study-mark-btn').addEventListener('click', function () {
      var path = mark.dataset.studyNote;
      if (isDone(path)) delete done[path];
      else done[path] = new Date().toISOString().slice(0, 10);
      save(done);
      render();
    });
  }

  // Reset needs a second click within a few seconds, so one stray tap can't wipe progress.
  var reset = document.querySelector('.study-reset');
  if (reset) {
    var armed = null;
    reset.addEventListener('click', function () {
      if (!armed) {
        reset.textContent = 'Click again to reset';
        armed = setTimeout(function () { armed = null; reset.textContent = 'Reset progress'; }, 4000);
        return;
      }
      clearTimeout(armed); armed = null;
      reset.textContent = 'Reset progress';
      done = {};
      save(done);
      render();
    });
  }

  // Another tab marked something: show it here too.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { done = load(); render(); }
  });

  render();
}());
