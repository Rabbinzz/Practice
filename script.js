(function () {
  var root = document.documentElement;
  var toggleBtn = document.getElementById('theme-toggle');
  var burger = document.getElementById('nav-burger');
  var nav = document.querySelector('.site-nav');

  // Default theme is dark. Toggle flips between dark <-> light for this page view.
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

  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('open');
      var expanded = nav.classList.contains('open');
      burger.setAttribute('aria-expanded', expanded);
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }
})();
