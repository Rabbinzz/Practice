(function () {
  if (typeof THREE === 'undefined') return;
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(0, 6, 62);

  function getVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  // ---- Root group: everything drags/rotates together ----
  var world = new THREE.Group();
  world.position.set(13, -3, -22);
  scene.add(world);

  // ================= NEBULA BACKDROP (theme-adaptive) =================
  var nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = 512; nebulaCanvas.height = 512;
  var nctx = nebulaCanvas.getContext('2d');
  function paintNebula() {
    nctx.clearRect(0, 0, 512, 512);
    var g = nctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    if (isLight()) {
      g.addColorStop(0, 'rgba(169,137,91,0.16)');
      g.addColorStop(1, 'rgba(169,137,91,0)');
    } else {
      g.addColorStop(0, 'rgba(217,161,91,0.14)');
      g.addColorStop(1, 'rgba(217,161,91,0)');
    }
    nctx.fillStyle = g;
    nctx.fillRect(0, 0, 512, 512);
  }
  paintNebula();
  var nebulaTex = new THREE.CanvasTexture(nebulaCanvas);
  var nebulaMat = new THREE.SpriteMaterial({ map: nebulaTex, transparent: true, depthWrite: false });
  var nebula = new THREE.Sprite(nebulaMat);
  nebula.scale.set(140, 140, 1);
  nebula.position.set(0, 0, -40);
  world.add(nebula);

  // ================= STARFIELD =================
  var starCount = 500;
  var starGeo = new THREE.BufferGeometry();
  var starPos = new Float32Array(starCount * 3);
  for (var s = 0; s < starCount; s++) {
    starPos[s * 3] = (Math.random() - 0.5) * 220;
    starPos[s * 3 + 1] = (Math.random() - 0.5) * 160;
    starPos[s * 3 + 2] = (Math.random() - 0.5) * 160 - 60;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.55 });
  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ================= SUN =================
  var sunMat = new THREE.MeshBasicMaterial({ color: 0xFFDA8A });
  var sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 32), sunMat);
  world.add(sun);
  var sunLight = new THREE.PointLight(0xFFEFD0, 2.2, 0, 0);
  world.add(sunLight);
  world.add(new THREE.AmbientLight(0xffffff, 0.22));

  // sun glow sprite
  var glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256; glowCanvas.height = 256;
  var gctx = glowCanvas.getContext('2d');
  var gg = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gg.addColorStop(0, 'rgba(255,225,150,0.9)');
  gg.addColorStop(1, 'rgba(255,225,150,0)');
  gctx.fillStyle = gg;
  gctx.fillRect(0, 0, 256, 256);
  var sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false }));
  sunGlow.scale.set(14, 14, 1);
  world.add(sunGlow);

  // ================= EARTH (special: real day/night shader) =================
  var loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  var TEX_BASE = 'https://threejs.org/examples/textures/planets/';
  var dayTex = loader.load(TEX_BASE + 'earth_atmos_2048.jpg');
  var nightTex = loader.load(TEX_BASE + 'earth_lights_2048.png');
  var moonTex = loader.load(TEX_BASE + 'moon_1024.jpg');

  var sunDirection = new THREE.Vector3(1, 0.2, 0.4).normalize();
  var earthMat = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      sunDirection: { value: sunDirection }
    },
    vertexShader: [
      'varying vec2 vUv;',
      'varying vec3 vNormalW;',
      'void main() {',
      '  vUv = uv;',
      '  vNormalW = normalize(mat3(modelMatrix) * normal);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D dayTexture;',
      'uniform sampler2D nightTexture;',
      'uniform vec3 sunDirection;',
      'varying vec2 vUv;',
      'varying vec3 vNormalW;',
      'void main() {',
      '  vec3 dayColor = texture2D(dayTexture, vUv).rgb;',
      '  vec3 nightColor = texture2D(nightTexture, vUv).rgb * 1.4;',
      '  float intensity = dot(normalize(vNormalW), normalize(sunDirection));',
      '  float mixAmt = smoothstep(-0.18, 0.18, intensity);',
      '  gl_FragColor = vec4(mix(nightColor, dayColor, mixAmt), 1.0);',
      '}'
    ].join('\n')
  });

  function applyRealTimeRotation(mesh) {
    var now = new Date();
    var utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    mesh.rotation.y = (utcHours / 24) * Math.PI * 2 - Math.PI / 2;
  }

  // ================= ORBIT HELPER =================
  // Each planet: a pivot (orbits the sun) containing the planet mesh offset along +X.
  function makeOrbitPivot(orbitRadius, tiltDeg) {
    var pivot = new THREE.Object3D();
    pivot.rotation.x = ((tiltDeg || 0) * Math.PI) / 180;
    world.add(pivot);
    return pivot;
  }

  var planets = []; // { pivot, mesh, speed }

  function addPlanet(opts) {
    var pivot = makeOrbitPivot(opts.orbitRadius, opts.tilt);
    var geo = new THREE.SphereGeometry(opts.size, 28, 28);
    var mesh;
    if (opts.isEarth) {
      mesh = new THREE.Mesh(geo, earthMat);
    } else {
      mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: opts.color, roughness: 0.85, metalness: 0.05 }));
    }
    mesh.position.set(opts.orbitRadius, 0, 0);
    pivot.rotation.y = Math.random() * Math.PI * 2;
    pivot.add(mesh);

    if (opts.ring) {
      var ringGeo = new THREE.RingGeometry(opts.size * 1.4, opts.size * 2.2, 64);
      var ringMat = new THREE.MeshBasicMaterial({ color: opts.ringColor || 0xD8C69A, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.2;
      mesh.add(ring);
    }

    // simple moons
    if (opts.moons) {
      for (var m = 0; m < opts.moons; m++) {
        var moonPivot = new THREE.Object3D();
        moonPivot.rotation.y = Math.random() * Math.PI * 2;
        mesh.add(moonPivot);
        var moonSize = opts.isEarth ? opts.size * 0.27 : opts.size * 0.18;
        var moonDist = opts.size * (opts.isEarth ? 2.3 : 1.6 + m * 0.55);
        var moonMat = opts.isEarth
          ? new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 })
          : new THREE.MeshStandardMaterial({ color: 0xCFCBC2, roughness: 1 });
        var moonMesh = new THREE.Mesh(new THREE.SphereGeometry(moonSize, 16, 16), moonMat);
        moonMesh.position.set(moonDist, 0, 0);
        moonPivot.add(moonMesh);
        planets.push({ pivot: moonPivot, mesh: null, speed: 0.01 + m * 0.004, isMoonPivot: true });
      }
    }

    planets.push({ pivot: pivot, mesh: mesh, speed: opts.speed, isEarth: !!opts.isEarth });
    return mesh;
  }

  addPlanet({ orbitRadius: 6, size: 0.5, color: 0xA6A6A6, speed: 0.0042 });                     // Mercury
  addPlanet({ orbitRadius: 8.5, size: 0.85, color: 0xE3C16F, speed: 0.0034 });                  // Venus
  var earthMesh = addPlanet({ orbitRadius: 11.5, size: 1.0, isEarth: true, speed: 0.0028, moons: 1 }); // Earth + Moon
  addPlanet({ orbitRadius: 14, size: 0.65, color: 0xB5533C, speed: 0.0023 });                   // Mars
  addPlanet({ orbitRadius: 23, size: 2.3, color: 0xD2A679, speed: 0.0012, moons: 4 });          // Jupiter + 4 moons
  addPlanet({ orbitRadius: 29, size: 1.9, color: 0xE0C68C, speed: 0.0009, ring: true, moons: 1, tilt: 3 }); // Saturn + ring + Titan
  addPlanet({ orbitRadius: 34, size: 1.25, color: 0x9FE8E0, speed: 0.0007, tilt: 8 });          // Uranus
  addPlanet({ orbitRadius: 38, size: 1.2, color: 0x3B5998, speed: 0.0006 });                    // Neptune

  // ================= DWARF PLANETS =================
  var dwarfData = [
    { orbitRadius: 42, size: 0.22, color: 0xC9B79C, speed: 0.00055, tilt: 6 },  // Ceres
    { orbitRadius: 47, size: 0.28, color: 0xBFA98C, speed: 0.0005, tilt: 12 },  // Pluto
    { orbitRadius: 50, size: 0.22, color: 0xD8CFC2, speed: 0.00047, tilt: 20 }, // Haumea
    { orbitRadius: 53, size: 0.24, color: 0xC7B08A, speed: 0.00044, tilt: 15 }, // Makemake
    { orbitRadius: 57, size: 0.23, color: 0xB5A78F, speed: 0.0004, tilt: 24 }   // Eris
  ];
  dwarfData.forEach(function (d) { addPlanet(d); });

  // ================= ASTEROID BELT =================
  var beltCount = 2600;
  var beltGeo = new THREE.BufferGeometry();
  var beltPos = new Float32Array(beltCount * 3);
  for (var a = 0; a < beltCount; a++) {
    var ang = Math.random() * Math.PI * 2;
    var rad = 17 + Math.random() * 3.2;
    beltPos[a * 3] = Math.cos(ang) * rad;
    beltPos[a * 3 + 1] = (Math.random() - 0.5) * 0.8;
    beltPos[a * 3 + 2] = Math.sin(ang) * rad;
  }
  beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
  var beltMat = new THREE.PointsMaterial({ color: 0x9A9284, size: 0.14, transparent: true, opacity: 0.75 });
  var belt = new THREE.Points(beltGeo, beltMat);
  world.add(belt);

  // ================= KUIPER BELT =================
  var kuiperCount = 1400;
  var kGeo = new THREE.BufferGeometry();
  var kPos = new Float32Array(kuiperCount * 3);
  for (var k = 0; k < kuiperCount; k++) {
    var kAng = Math.random() * Math.PI * 2;
    var kRad = 44 + Math.random() * 16;
    kPos[k * 3] = Math.cos(kAng) * kRad;
    kPos[k * 3 + 1] = (Math.random() - 0.5) * 3;
    kPos[k * 3 + 2] = Math.sin(kAng) * kRad;
  }
  kGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
  var kMat = new THREE.PointsMaterial({ color: 0xBFD9E0, size: 0.16, transparent: true, opacity: 0.5 });
  var kuiper = new THREE.Points(kGeo, kMat);
  world.add(kuiper);

  // ================= COMETS (with simple tails) =================
  var comets = [];
  function addComet(orbitRadius, tilt, speed) {
    var pivot = makeOrbitPivot(orbitRadius, tilt);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0xEFF7FA }));
    head.position.set(orbitRadius, 0, 0);
    var tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 3.2, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xBFE3EE, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-1.8, 0, 0);
    head.add(tail);
    pivot.add(head);
    planets.push({ pivot: pivot, mesh: head, speed: speed });
  }
  addComet(48, 35, 0.0016);
  addComet(53, -28, 0.0012);

  // ================= THEME REACTIVITY =================
  var observer = new MutationObserver(function () {
    paintNebula();
    nebulaTex.needsUpdate = true;
    if (isLight()) {
      starMat.color.set(0x6B6E63);
      starMat.opacity = 0.35;
      beltMat.color.set(0x8A8272);
      kMat.color.set(0x9FB6BD);
    } else {
      starMat.color.set(0xffffff);
      starMat.opacity = 0.55;
      beltMat.color.set(0x9A9284);
      kMat.color.set(0xBFD9E0);
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ================= DRAG TO ROTATE =================
  var ring = document.getElementById('cursor-ring');
  var isDragging = false, lastX = 0, lastY = 0;
  var dragVelX = 0, dragVelY = 0;
  var autoRotateY = 0.00012;

  function pointerDown(x, y) {
    isDragging = true;
    lastX = x; lastY = y;
    dragVelX = 0; dragVelY = 0;
    if (ring) ring.classList.add('grabbing');
  }
  function pointerMove(x, y) {
    if (!isDragging) return;
    var dx = x - lastX, dy = y - lastY;
    dragVelX = dx * 0.0045;
    dragVelY = dy * 0.0045;
    world.rotation.y += dragVelX;
    world.rotation.x += dragVelY;
    world.rotation.x = Math.max(-0.9, Math.min(0.9, world.rotation.x));
    lastX = x; lastY = y;
  }
  function pointerUp() {
    isDragging = false;
    if (ring) ring.classList.remove('grabbing');
  }

  canvas.addEventListener('mousedown', function (e) { pointerDown(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { pointerMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', pointerUp);
  canvas.addEventListener('touchstart', function (e) { var t = e.touches[0]; pointerDown(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) { var t = e.touches[0]; pointerMove(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchend', pointerUp);

  // ================= MOUSE PARALLAX (subtle, independent of drag) =================
  var mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function renderOnce() {
    camera.lookAt(world.position);
    renderer.render(scene, camera);
  }

  applyRealTimeRotation(earthMesh);

  if (reduceMotion) {
    renderOnce();
    return;
  }

  var lastTimeSync = 0;
  function animate(t) {
    requestAnimationFrame(animate);

    // orbits + spins
    planets.forEach(function (p) {
      p.pivot.rotation.y += p.speed;
    });

    // gentle inertia decay after drag release, plus slow auto-drift
    if (!isDragging) {
      world.rotation.y += autoRotateY + dragVelX;
      world.rotation.x += dragVelY;
      dragVelX *= 0.94;
      dragVelY *= 0.94;
    }

    if (t - lastTimeSync > 4000) {
      applyRealTimeRotation(earthMesh);
      lastTimeSync = t;
    }

    camera.position.x += (mouseX * 4 - (camera.position.x - 0)) * 0.015;
    camera.position.y += (6 - mouseY * 3 - camera.position.y) * 0.015;

    renderOnce();
  }
  requestAnimationFrame(animate);
})();
