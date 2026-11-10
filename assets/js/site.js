/* Site behaviour. Every handler is attached here with addEventListener: the CSP
   (static/_headers) has script-src 'self', so templates carry no inline scripts or on…= attributes. */
(function () {
  'use strict';

  var root = document.documentElement;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode / blocked storage */ }
  }

  // ---- Theme toggle (theme-init.js applied the saved theme before paint)
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      store('theme', next);
    });
  }

  // ---- Mobile nav
  var navBtn = document.getElementById('nav-hamburger');
  var navMenu = document.getElementById('nav-mobile');
  if (navBtn && navMenu) {
    navBtn.addEventListener('click', function () {
      var open = navMenu.classList.toggle('hidden') === false;
      navBtn.setAttribute('aria-expanded', String(open));
    });
  }

  // ---- Navbar shrink + contact button reveal.
  // rAF-throttled, and the DOM is only touched when a threshold is crossed.
  var navbar = document.getElementById('navbar');
  var contactBtn = document.getElementById('contact');
  var scrolled = null, contactShown = null, ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY || root.scrollTop;
    var s = y > 60, c = y > 400;
    if (navbar && s !== scrolled) {
      // Before the first scroll, leave the CSS padding alone (matches the original behaviour).
      if (s || scrolled !== null) navbar.style.padding = s ? '0' : '0.25rem 0';
      scrolled = s;
      navbar.classList.toggle('scrolled', s);
    }
    if (contactBtn && c !== contactShown) {
      contactShown = c;
      contactBtn.style.bottom = c ? '-4px' : '-56px';
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // ---- Scroll reveal
  var revealables = document.querySelectorAll('.animate-on-scroll, .animate-fade');
  if (!('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { observer.observe(el); });
  }

  // ---- Contact form (Netlify Forms, posted with fetch; no credentials in the page)
  var popup = document.getElementById('contact-popup');
  var form = document.getElementById('contactme');
  var status = document.getElementById('contact-status');

  function setOpen(open) {
    if (!popup) return;
    popup.classList.toggle('is-open', open);
    if (contactBtn) contactBtn.setAttribute('aria-expanded', String(open));
    if (open && form) form.elements.email.focus();
  }
  function say(msg) { if (status) status.textContent = msg; }

  if (contactBtn) contactBtn.addEventListener('click', function () { setOpen(!popup.classList.contains('is-open')); });
  var closeBtn = document.getElementById('contact-close');
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup && popup.classList.contains('is-open')) setOpen(false);
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      say('Sending…');
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        say('Thanks! Your message was sent.');
        setTimeout(function () { setOpen(false); say(''); }, 2500);
      }).catch(function () {
        say("Couldn't send right now. Please try again in a moment.");
      }).then(function () { btn.disabled = false; });
    });
  }

  // ---- Service worker (must stay at /service_worker.js, scope /)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service_worker.js', { scope: '/' }).catch(function () {});
    });
  }
}());
