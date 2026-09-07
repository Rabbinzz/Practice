(function () {
  var root = document.documentElement;
  var toggleBtn = document.getElementById('theme-toggle');
  var burger = document.getElementById('nav-burger');
  var nav = document.querySelector('.site-nav');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // ---- Theme toggle (default: dark) ----
  function setIcon() {
    if (!toggleBtn) return;
    var isLight = root.getAttribute('data-theme') === 'light';
    toggleBtn.textContent = isLight ? '\u263E' : '\u2600';
    toggleBtn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var isLight = root.getAttribute('data-theme') === 'light';
      root.setAttribute('data-theme', isLight ? 'dark' : 'light');
      setIcon();
    });
    setIcon();
  }

  // ---- Mobile nav ----
  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  // ---- Custom cursor ----
  if (!isTouch && !reduceMotion) {
    var dot = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if (dot && ring) {
      var dx = 0, dy = 0, rx = 0, ry = 0;
      window.addEventListener('mousemove', function (e) {
        dx = e.clientX; dy = e.clientY;
      });
      function loop() {
        rx += (dx - rx) * 0.16;
        ry += (dy - ry) * 0.16;
        dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
        requestAnimationFrame(loop);
      }
      loop();
      document.querySelectorAll('a, button, .card').forEach(function (el) {
        el.addEventListener('mouseenter', function () { ring.classList.add('hovering'); });
        el.addEventListener('mouseleave', function () { ring.classList.remove('hovering'); });
      });
    }
  }

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ---- 3D tilt on cards ----
  if (!reduceMotion && !isTouch) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -5;
        var rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 5;
        card.style.transform = 'perspective(700px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-3px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }
})();
