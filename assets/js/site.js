// ============================================================
// Theme Toggle
// ============================================================
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// ============================================================
// Contact Form
// ============================================================
function openForm() {
  var form = document.getElementById('myForm');
  if (!form) return;
  form.style.display = 'block';
}

function closeForm() {
  var form = document.getElementById('myForm');
  if (!form) return;
  form.style.display = 'none';
}

// ============================================================
// Scroll — Navbar shrink + Contact button reveal
// ============================================================
var navbar  = document.getElementById('navbar');
var contact = document.getElementById('contact');

window.addEventListener('scroll', scrollHandler, { passive: true });

function scrollHandler() {
  var scrollY = window.scrollY || document.documentElement.scrollTop;

  if (navbar) {
    if (scrollY > 60) {
      navbar.classList.add('scrolled');
      navbar.style.padding = '0';
    } else {
      navbar.classList.remove('scrolled');
      navbar.style.padding = '0.25rem 0';
    }
  }

  if (contact) {
    contact.style.bottom = scrollY > 400 ? '-4px' : '-56px';
  }
}

// ============================================================
// Hero Typing — opacity reveal (CSS handles width animation)
// ============================================================
(function initHeroText() {
  var timings = [
    { id: 'hi',   delay: 0    },
    { id: 'name', delay: 300  },
    { id: 'tag',  delay: 1700 }
  ];
  timings.forEach(function (item) {
    var el = document.getElementById(item.id);
    if (!el) return;
    setTimeout(function () { el.style.opacity = '1'; }, item.delay);
  });
}());

// ============================================================
// Scroll-Reveal via IntersectionObserver
// ============================================================
(function initScrollReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.animate-on-scroll, .animate-fade').forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.animate-on-scroll, .animate-fade').forEach(function (el) {
    observer.observe(el);
  });
}());

// ============================================================
// Cookie Consent
// ============================================================
var purecookieTitle  = 'Cookies.';
var purecookieDesc   = 'By using this website, you automatically accept cookies';
var purecookieLink   = '<a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/cookie-usage" rel="noopener" target="_blank">What for?</a>';
var purecookieButton = 'Got it';

function pureFadeIn(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  el.style.display = 'block';
  var start = null;
  requestAnimationFrame(function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / 350, 1);
    el.style.opacity = String(p);
    if (p < 1) requestAnimationFrame(step);
  });
}

function pureFadeOut(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var start = null;
  requestAnimationFrame(function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / 280, 1);
    el.style.opacity = String(1 - p);
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.style.display = 'none';
    }
  });
}

function setCookie(name, value, days) {
  var d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = name + '=' + (value || '') + '; expires=' + d.toUTCString() + '; path=/';
}

function getCookie(name) {
  var eq = name + '=', ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(eq) === 0) return c.substring(eq.length);
  }
  return null;
}

function cookieConsent() {
  if (getCookie('purecookieDismiss')) return;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="cookieConsentContainer" id="cookieConsentContainer">' +
    '<div class="cookieTitle"><p>' + purecookieTitle + '</p></div>' +
    '<div class="cookieDesc"><p>' + purecookieDesc + ' ' + purecookieLink + '</p></div>' +
    '<div class="cookieButton"><a onclick="purecookieDismiss()">' + purecookieButton + '</a></div>' +
    '</div>'
  );
  pureFadeIn('cookieConsentContainer');
}

function purecookieDismiss() {
  setCookie('purecookieDismiss', '1', 30);
  pureFadeOut('cookieConsentContainer');
}

window.addEventListener('load', cookieConsent);

// ============================================================
// Email (SMTP)
// ============================================================
function sendEmail() {
  var form = document.getElementById('contactme');
  if (!form) return;
  var senderEmail   = form.elements[0].value;
  var senderMessage = form.elements[1].value;
  Email.send({
    Host    : 'smtp.gmail.com',
    Username: 'noreplydevon@gmail.com',
    Password: 'Something@1234',
    To      : 'anuragkar16@gmail.com',
    From    : 'noreplydevon@gmail.com',
    Subject : 'Contact From Website',
    Body    : 'EmailID: ' + senderEmail + '<br>MESSAGE: ' + senderMessage
  }).then(function () {
    alert('Message sent!');
    closeForm();
  });
}
