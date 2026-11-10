/* Blog post pages (layouts/partials/blog-post.html): reading progress, section reveal,
   table-of-contents highlight and code copy buttons. No-op on other pages. */
(function () {
  'use strict';
  var root = document.querySelector('.andromeda-blog-content');
  if (!root) return;

  var fill = document.getElementById('progress-fill');
  if (fill) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var d = document.documentElement;
        var max = d.scrollHeight - d.clientHeight;
        fill.style.width = (max > 0 ? (d.scrollTop / max) * 100 : 0) + '%';
      });
    }, { passive: true });
  }

  var sections = root.querySelectorAll('.section');
  var tocLinks = root.querySelectorAll('.toc-link');
  var sectionEls = root.querySelectorAll('section[id]');

  if (!('IntersectionObserver' in window)) {
    sections.forEach(function (s) { s.classList.add('visible'); });
  } else {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); reveal.unobserve(e.target); }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
    sections.forEach(function (s) { reveal.observe(s); });

    var toc = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tocLinks.forEach(function (l) {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { threshold: 0.4 });
    sectionEls.forEach(function (s) { toc.observe(s); });
  }

  root.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.dataset.target);
      if (!target || !navigator.clipboard) return;
      navigator.clipboard.writeText(target.innerText).then(function () {
        btn.textContent = 'COPIED!';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = 'COPY'; btn.classList.remove('copied'); }, 2000);
      });
    });
  });
}());
