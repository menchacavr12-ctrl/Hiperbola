/* ==========================================================================
   HIPÉRBOLA.LAB - MOTOR JAVASCRIPT: VISOR 3D HERO Y SIMULADORES 2D
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. BARRA DE PROGRESO DE LECTURA Y SCROLL
  // ==========================================
  const readingProgress = document.getElementById('readingProgress');
  const header = document.getElementById('header');

  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    if (readingProgress) {
      readingProgress.style.width = `${progress}%`;
    }

    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // ==========================================
  // 2. MENÚ RESPONSIVO MÓVIL Y SELECTOR DE TEMA (MODO CLARO / OSCURO)
  // ==========================================
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Inicializar tema desde localStorage o por defecto oscuro
  const savedTheme = localStorage.getItem('hiperbola_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if (themeIcon) {
      themeIcon.className = 'fa-solid fa-moon';
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      const isLight = document.body.classList.contains('light-mode');

      if (themeIcon) {
        themeIcon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      }

      localStorage.setItem('hiperbola_theme', isLight ? 'light' : 'dark');

      // Redibujar simuladores 2D para ajustar contraste de grillas y ejes
      renderSim1();
      renderSim2();
    });
  }

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // ==========================================
  // 3. MODELO 3D: DOS CONOS OPUESTOS POR EL ÁPICE (HERO)
  // ==========================================
  let scene3D, camera3D, renderer3D, controls3D;
  let planeMesh, hyperbolaLinesGroup;
  let isAutoRotating = true; // Auto-rotación activa suave al inicio para cautivar
  let planeOffset = 0.9;

  const coneRadius = 2.4;
  const coneHeight = 3.2;
  const coneSegments = 48;

  function initHero3D() {
    const container = document.getElementById('threejs-hero-container');
    if (!container || typeof THREE === 'undefined') return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Escena
    scene3D = new THREE.Scene();

    // 2. Cámara
    camera3D = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera3D.position.set(7.5, 3.8, 8.2);

    // 3. Renderer con WebGL
    renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3D.setSize(width, height);
    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer3D.domElement);

    // 4. OrbitControls para interacción 360°
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
      controls3D.enableDamping = true;
      controls3D.dampingFactor = 0.05;
      controls3D.maxDistance = 22;
      controls3D.minDistance = 4;
      controls3D.target.set(0, 0, 0);
    }

    // 5. Iluminación sobria y elegante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene3D.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0b34a, 0.9);
    keyLight.position.set(6, 8, 6);
    scene3D.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.6);
    fillLight.position.set(-6, -6, -4);
    scene3D.add(fillLight);

    // Material de los conos (elegante, translúcido, sin saturación chillona)
    const coneMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1d2744,
      transparent: true,
      opacity: 0.62,
      roughness: 0.25,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x33446b,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });

    // ----------------------------------------------------
    // CONSTRUCCIÓN DE LOS 2 CONOS TOCÁNDOSE EN SUS PUNTAS
    // ----------------------------------------------------
    // En Three.js ConeGeometry por defecto tiene:
    // Base en y = -height/2, Punta en y = +height/2

    // A) Cono Inferior (Normal):
    // Base abajo en -coneHeight, Punta arriba en (0, 0, 0)
    const geomBottom = new THREE.ConeGeometry(coneRadius, coneHeight, coneSegments, 1, true);
    geomBottom.translate(0, -coneHeight / 2, 0); // La punta queda en y = 0

    const meshBottom = new THREE.Mesh(geomBottom, coneMaterial);
    const wireBottom = new THREE.Mesh(geomBottom, wireMaterial);
    meshBottom.add(wireBottom);
    scene3D.add(meshBottom);

    // B) Cono Superior (De cabeza sobre él):
    // Punta en (0, 0, 0), Base arriba en +coneHeight
    const geomTop = new THREE.ConeGeometry(coneRadius, coneHeight, coneSegments, 1, true);
    geomTop.rotateZ(Math.PI); // Invertir de cabeza: punta pasa a -height/2, base a +height/2
    geomTop.translate(0, coneHeight / 2, 0); // La punta queda en y = 0

    const meshTop = new THREE.Mesh(geomTop, coneMaterial);
    const wireTop = new THREE.Mesh(geomTop, wireMaterial);
    meshTop.add(wireTop);
    scene3D.add(meshTop);

    // Eje vertical sutil pasando por el centro
    const axisGeom = new THREE.CylinderGeometry(0.015, 0.015, (coneHeight * 2) + 1.2, 8);
    const axisMat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 });
    const axisMesh = new THREE.Mesh(axisGeom, axisMat);
    scene3D.add(axisMesh);

    // Punto dorado en el ápice de contacto (0, 0, 0)
    const apexGeom = new THREE.SphereGeometry(0.06, 16, 16);
    const apexMat = new THREE.MeshBasicMaterial({ color: 0xdfa135 });
    const apexMesh = new THREE.Mesh(apexGeom, apexMat);
    scene3D.add(apexMesh);

    // ----------------------------------------------------
    // PLANO DE CORTE VERTICAL QUE FORMA LA HIPÉRBOLA
    // ----------------------------------------------------
    const planeGeom = new THREE.PlaneGeometry(5.2, (coneHeight * 2) + 0.6);
    const planeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdfa135,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.1
    });

    planeMesh = new THREE.Mesh(planeGeom, planeMaterial);
    planeMesh.rotation.y = Math.PI / 2; // Plano x = planeOffset
    planeMesh.position.x = planeOffset;
    scene3D.add(planeMesh);

    // Borde delimitador del plano
    const planeEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeom),
      new THREE.LineBasicMaterial({ color: 0xdfa135, linewidth: 1.5, transparent: true, opacity: 0.8 })
    );
    planeMesh.add(planeEdges);

    // Grupo para las curvas hiperbólicas de intersección
    hyperbolaLinesGroup = new THREE.Group();
    scene3D.add(hyperbolaLinesGroup);
    updateHero3DHyperbola();

    // Controles de interfaz del 3D
    const btnAutoRot = document.getElementById('btnToggleAutoRotate');
    const btnResetCam = document.getElementById('btnResetCamera');
    const sliderPlane = document.getElementById('sliderPlaneOffset');
    const valPlane = document.getElementById('planeOffsetVal');

    if (btnAutoRot) {
      btnAutoRot.addEventListener('click', () => {
        isAutoRotating = !isAutoRotating;
        btnAutoRot.innerHTML = isAutoRotating ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      });
    }

    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        camera3D.position.set(7.5, 3.8, 8.2);
        if (controls3D) controls3D.target.set(0, 0, 0);
      });
    }

    if (sliderPlane) {
      sliderPlane.addEventListener('input', (e) => {
        planeOffset = parseFloat(e.target.value);
        if (Math.abs(planeOffset) < 0.15) planeOffset = 0.15 * Math.sign(planeOffset || 1);
        planeMesh.position.x = planeOffset;
        if (valPlane) valPlane.textContent = planeOffset.toFixed(2);
        updateHero3DHyperbola();
      });
    }

    window.addEventListener('resize', onWindowResize3D);
    animate3D();
  }

  function updateHero3DHyperbola() {
    while (hyperbolaLinesGroup.children.length > 0) {
      hyperbolaLinesGroup.remove(hyperbolaLinesGroup.children[0]);
    }

    const d = planeOffset;
    const slope = coneRadius / coneHeight; // Relación radio/altura
    const d2 = d * d;

    const curveMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 3
    });

    const glowMat = new THREE.LineBasicMaterial({
      color: 0xebb34d,
      linewidth: 3
    });

    // Vértice de la hipérbola en |y|:
    const minY = Math.abs(d) / slope;
    const maxY = coneHeight;

    if (minY <= maxY) {
      const steps = 60;
      const pointsTop = [];
      const pointsBottom = [];

      // Rama Superior (Cono Superior, y > 0)
      for (let i = -steps; i <= steps; i++) {
        const t = i / steps;
        const z = t * (coneRadius * 0.95);
        const y2 = (d2 + z * z) / (slope * slope);
        const y = Math.sqrt(y2);
        if (y <= maxY) {
          pointsTop.push(new THREE.Vector3(d, y, z));
        }
      }

      // Rama Inferior (Cono Inferior, y < 0)
      for (let i = -steps; i <= steps; i++) {
        const t = i / steps;
        const z = t * (coneRadius * 0.95);
        const y2 = (d2 + z * z) / (slope * slope);
        const y = -Math.sqrt(y2);
        if (Math.abs(y) <= maxY) {
          pointsBottom.push(new THREE.Vector3(d, y, z));
        }
      }

      if (pointsTop.length > 1) {
        const geomT = new THREE.BufferGeometry().setFromPoints(pointsTop);
        const lineT = new THREE.Line(geomT, glowMat);
        hyperbolaLinesGroup.add(lineT);
      }

      if (pointsBottom.length > 1) {
        const geomB = new THREE.BufferGeometry().setFromPoints(pointsBottom);
        const lineB = new THREE.Line(geomB, glowMat);
        hyperbolaLinesGroup.add(lineB);
      }
    }
  }

  function onWindowResize3D() {
    const container = document.getElementById('threejs-hero-container');
    if (!container || !renderer3D || !camera3D) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera3D.aspect = width / height;
    camera3D.updateProjectionMatrix();
    renderer3D.setSize(width, height);
  }

  function animate3D() {
    requestAnimationFrame(animate3D);

    if (isAutoRotating && scene3D) {
      scene3D.rotation.y += 0.006;
    }

    if (controls3D) {
      controls3D.update();
    }

    if (renderer3D && scene3D && camera3D) {
      renderer3D.render(scene3D, camera3D);
    }
  }

  // ==========================================
  // 4. SIMULADOR 1: CENTRO EN EL ORIGEN (0, 0)
  // ==========================================
  const canvas1 = document.getElementById('canvasOrigen');
  const ctx1 = canvas1.getContext('2d');

  const sim1State = {
    orientation: 'H',
    a: 3.0,
    b: 4.0,
    showBox: true,
    showAsyn: true,
    showPoints: true
  };

  const sliderA1 = document.getElementById('sliderA1');
  const sliderB1 = document.getElementById('sliderB1');
  const valA1 = document.getElementById('valA1');
  const valB1 = document.getElementById('valB1');
  const btnOriH1 = document.getElementById('btnOriH1');
  const btnOriV1 = document.getElementById('btnOriV1');
  const cardH1 = document.getElementById('card-h-origen');
  const cardV1 = document.getElementById('card-v-origen');
  const chkBoxAux1 = document.getElementById('chkBoxAux1');
  const chkAsyntotes1 = document.getElementById('chkAsyntotes1');
  const chkPoints1 = document.getElementById('chkPoints1');
  const resetSim1 = document.getElementById('resetSim1');

  function updateSim1Buttons() {
    if (sim1State.orientation === 'H') {
      btnOriH1.classList.add('active');
      btnOriV1.classList.remove('active');
      cardH1.classList.add('active');
      cardV1.classList.remove('active');
    } else {
      btnOriV1.classList.add('active');
      btnOriH1.classList.remove('active');
      cardV1.classList.add('active');
      cardH1.classList.remove('active');
    }
  }

  function initSim1Listeners() {
    cardH1.addEventListener('click', () => {
      sim1State.orientation = 'H';
      updateSim1Buttons();
      renderSim1();
    });

    cardV1.addEventListener('click', () => {
      sim1State.orientation = 'V';
      updateSim1Buttons();
      renderSim1();
    });

    sliderA1.addEventListener('input', (e) => {
      sim1State.a = parseFloat(e.target.value);
      valA1.textContent = sim1State.a.toFixed(1);
      renderSim1();
    });

    sliderB1.addEventListener('input', (e) => {
      sim1State.b = parseFloat(e.target.value);
      valB1.textContent = sim1State.b.toFixed(1);
      renderSim1();
    });

    btnOriH1.addEventListener('click', () => {
      sim1State.orientation = 'H';
      updateSim1Buttons();
      renderSim1();
    });

    btnOriV1.addEventListener('click', () => {
      sim1State.orientation = 'V';
      updateSim1Buttons();
      renderSim1();
    });

    chkBoxAux1.addEventListener('change', (e) => {
      sim1State.showBox = e.target.checked;
      renderSim1();
    });

    chkAsyntotes1.addEventListener('change', (e) => {
      sim1State.showAsyn = e.target.checked;
      renderSim1();
    });

    chkPoints1.addEventListener('change', (e) => {
      sim1State.showPoints = e.target.checked;
      renderSim1();
    });

    resetSim1.addEventListener('click', () => {
      sim1State.a = 3.0;
      sim1State.b = 4.0;
      sim1State.orientation = 'H';
      sliderA1.value = 3.0;
      sliderB1.value = 4.0;
      valA1.textContent = '3.0';
      valB1.textContent = '4.0';
      updateSim1Buttons();
      renderSim1();
    });
  }

  function renderSim1() {
    setupHiDPICanvas(canvas1, ctx1);

    const width = canvas1.width;
    const height = canvas1.height;
    const originX = width / 2;
    const originY = height / 2;
    const scale = 25;

    ctx1.clearRect(0, 0, width, height);
    drawGrid(ctx1, width, height, originX, originY, scale);

    const a = sim1State.a;
    const b = sim1State.b;
    const isH = sim1State.orientation === 'H';
    const c = Math.sqrt(a * a + b * b);
    const e = c / a;
    const isLight = document.body.classList.contains('light-mode');

    updateLiveBox1(a, b, c, e, isH);

    // Caja auxiliar
    if (sim1State.showBox) {
      ctx1.save();
      ctx1.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.28)';
      ctx1.lineWidth = 1.2;
      ctx1.setLineDash([4, 4]);

      const boxW = isH ? a * scale : b * scale;
      const boxH = isH ? b * scale : a * scale;
      ctx1.strokeRect(originX - boxW, originY - boxH, boxW * 2, boxH * 2);
      ctx1.restore();
    }

    // Asíntotas
    if (sim1State.showAsyn) {
      ctx1.save();
      ctx1.strokeStyle = isLight ? '#2563eb' : '#3b82f6';
      ctx1.lineWidth = 1.6;
      ctx1.setLineDash([5, 5]);

      const maxUnits = 14;
      const slope = isH ? (b / a) : (a / b);

      ctx1.beginPath();
      ctx1.moveTo(originX - maxUnits * scale, originY + (maxUnits * slope) * scale);
      ctx1.lineTo(originX + maxUnits * scale, originY - (maxUnits * slope) * scale);
      ctx1.stroke();

      ctx1.beginPath();
      ctx1.moveTo(originX - maxUnits * scale, originY - (maxUnits * slope) * scale);
      ctx1.lineTo(originX + maxUnits * scale, originY + (maxUnits * slope) * scale);
      ctx1.stroke();
      ctx1.restore();
    }

    // Ramas de la Hipérbola
    ctx1.save();
    ctx1.strokeStyle = isLight ? '#b47a16' : '#dfa135';
    ctx1.lineWidth = 3;
    ctx1.shadowColor = isLight ? 'rgba(180, 122, 22, 0.3)' : 'rgba(223, 161, 53, 0.4)';
    ctx1.shadowBlur = isLight ? 4 : 8;

    const maxParam = 10;
    const step = 0.05;

    if (isH) {
      // Rama Derecha (+x)
      ctx1.beginPath();
      let first = true;
      for (let y = -maxParam; y <= maxParam; y += step) {
        const x = a * Math.sqrt(1 + (y * y) / (b * b));
        const px = originX + x * scale;
        const py = originY - y * scale;
        if (first) { ctx1.moveTo(px, py); first = false; }
        else { ctx1.lineTo(px, py); }
      }
      ctx1.stroke();

      // Rama Izquierda (-x)
      ctx1.beginPath();
      first = true;
      for (let y = -maxParam; y <= maxParam; y += step) {
        const x = -a * Math.sqrt(1 + (y * y) / (b * b));
        const px = originX + x * scale;
        const py = originY - y * scale;
        if (first) { ctx1.moveTo(px, py); first = false; }
        else { ctx1.lineTo(px, py); }
      }
      ctx1.stroke();
    } else {
      // Rama Arriba (+y)
      ctx1.beginPath();
      let first = true;
      for (let x = -maxParam; x <= maxParam; x += step) {
        const y = a * Math.sqrt(1 + (x * x) / (b * b));
        const px = originX + x * scale;
        const py = originY - y * scale;
        if (first) { ctx1.moveTo(px, py); first = false; }
        else { ctx1.lineTo(px, py); }
      }
      ctx1.stroke();

      // Rama Abajo (-y)
      ctx1.beginPath();
      first = true;
      for (let x = -maxParam; x <= maxParam; x += step) {
        const y = -a * Math.sqrt(1 + (x * x) / (b * b));
        const px = originX + x * scale;
        const py = originY - y * scale;
        if (first) { ctx1.moveTo(px, py); first = false; }
        else { ctx1.lineTo(px, py); }
      }
      ctx1.stroke();
    }
    ctx1.restore();

    // Puntos Vértices y Focos
    if (sim1State.showPoints) {
      if (isH) {
        drawPoint(ctx1, originX + a * scale, originY, '#dfa135', 'V₁(a, 0)');
        drawPoint(ctx1, originX - a * scale, originY, '#dfa135', 'V₂(−a, 0)');
        drawPoint(ctx1, originX + c * scale, originY, '#ef4444', `F₁(${c.toFixed(1)}, 0)`);
        drawPoint(ctx1, originX - c * scale, originY, '#ef4444', `F₂(−${c.toFixed(1)}, 0)`);
      } else {
        drawPoint(ctx1, originX, originY - a * scale, '#dfa135', 'V₁(0, a)');
        drawPoint(ctx1, originX, originY + a * scale, '#dfa135', 'V₂(0, −a)');
        drawPoint(ctx1, originX, originY - c * scale, '#ef4444', `F₁(0, ${c.toFixed(1)})`);
        drawPoint(ctx1, originX, originY + c * scale, '#ef4444', `F₂(0, −${c.toFixed(1)})`);
      }
    }
  }

  function updateLiveBox1(a, b, c, e, isH) {
    const a2 = (a * a).toFixed(1).replace('.0', '');
    const b2 = (b * b).toFixed(1).replace('.0', '');

    const eqEl = document.getElementById('liveEquation1');
    if (isH) {
      eqEl.innerHTML = `x² / <strong>${a2}</strong> − y² / <strong>${b2}</strong> = 1`;
      document.getElementById('calcAsyn1').textContent = `y = ± ${(b / a).toFixed(2)}x`;
      document.getElementById('calcVert1').textContent = `(±${a.toFixed(1)}, 0)`;
    } else {
      eqEl.innerHTML = `y² / <strong>${a2}</strong> − x² / <strong>${b2}</strong> = 1`;
      document.getElementById('calcAsyn1').textContent = `y = ± ${(a / b).toFixed(2)}x`;
      document.getElementById('calcVert1').textContent = `(0, ±${a.toFixed(1)})`;
    }

    document.getElementById('calcC1').textContent = c.toFixed(2);
    document.getElementById('calcE1').textContent = e.toFixed(2);
  }

  // ==========================================
  // 5. SIMULADOR 2: CENTRO FUERA DEL ORIGEN (h, k)
  // ==========================================
  const canvas2 = document.getElementById('canvasFueraOrigen');
  const ctx2 = canvas2.getContext('2d');

  const sim2State = {
    orientation: 'H',
    h: 2,
    k: -1,
    a: 3.0,
    b: 2.0,
    showBox: true,
    showAsyn: true
  };

  const sliderH2 = document.getElementById('sliderH2');
  const sliderK2 = document.getElementById('sliderK2');
  const sliderA2 = document.getElementById('sliderA2');
  const sliderB2 = document.getElementById('sliderB2');
  const valH2 = document.getElementById('valH2');
  const valK2 = document.getElementById('valK2');
  const valA2 = document.getElementById('valA2');
  const valB2 = document.getElementById('valB2');
  const btnOriH2 = document.getElementById('btnOriH2');
  const btnOriV2 = document.getElementById('btnOriV2');
  const chkBoxAux2 = document.getElementById('chkBoxAux2');
  const chkAsyntotes2 = document.getElementById('chkAsyntotes2');
  const resetSim2 = document.getElementById('resetSim2');

  function initSim2Listeners() {
    sliderH2.addEventListener('input', (e) => {
      sim2State.h = parseInt(e.target.value);
      valH2.textContent = sim2State.h;
      renderSim2();
    });

    sliderK2.addEventListener('input', (e) => {
      sim2State.k = parseInt(e.target.value);
      valK2.textContent = sim2State.k;
      renderSim2();
    });

    sliderA2.addEventListener('input', (e) => {
      sim2State.a = parseFloat(e.target.value);
      valA2.textContent = sim2State.a.toFixed(1);
      renderSim2();
    });

    sliderB2.addEventListener('input', (e) => {
      sim2State.b = parseFloat(e.target.value);
      valB2.textContent = sim2State.b.toFixed(1);
      renderSim2();
    });

    btnOriH2.addEventListener('click', () => {
      sim2State.orientation = 'H';
      btnOriH2.classList.add('active');
      btnOriV2.classList.remove('active');
      renderSim2();
    });

    btnOriV2.addEventListener('click', () => {
      sim2State.orientation = 'V';
      btnOriV2.classList.add('active');
      btnOriH2.classList.remove('active');
      renderSim2();
    });

    chkBoxAux2.addEventListener('change', (e) => {
      sim2State.showBox = e.target.checked;
      renderSim2();
    });

    chkAsyntotes2.addEventListener('change', (e) => {
      sim2State.showAsyn = e.target.checked;
      renderSim2();
    });

    resetSim2.addEventListener('click', () => {
      sim2State.h = 2;
      sim2State.k = -1;
      sim2State.a = 3.0;
      sim2State.b = 2.0;
      sim2State.orientation = 'H';
      sliderH2.value = 2;
      sliderK2.value = -1;
      sliderA2.value = 3.0;
      sliderB2.value = 2.0;
      valH2.textContent = '2';
      valK2.textContent = '-1';
      valA2.textContent = '3.0';
      valB2.textContent = '2.0';
      btnOriH2.classList.add('active');
      btnOriV2.classList.remove('active');
      renderSim2();
    });
  }

  function renderSim2() {
    setupHiDPICanvas(canvas2, ctx2);

    const width = canvas2.width;
    const height = canvas2.height;
    const originX = width / 2;
    const originY = height / 2;
    const scale = 22;

    ctx2.clearRect(0, 0, width, height);
    drawGrid(ctx2, width, height, originX, originY, scale);

    const h = sim2State.h;
    const k = sim2State.k;
    const a = sim2State.a;
    const b = sim2State.b;
    const isH = sim2State.orientation === 'H';
    const c = Math.sqrt(a * a + b * b);

    const centerX = originX + h * scale;
    const centerY = originY - k * scale;
    const isLight = document.body.classList.contains('light-mode');

    updateLiveBox2(h, k, a, b, c, isH);

    // Ejes trasladados locales en (h, k)
    ctx2.save();
    ctx2.strokeStyle = isLight ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.35)';
    ctx2.lineWidth = 1;
    ctx2.setLineDash([3, 3]);

    ctx2.beginPath();
    ctx2.moveTo(0, centerY);
    ctx2.lineTo(width, centerY);
    ctx2.moveTo(centerX, 0);
    ctx2.lineTo(centerX, height);
    ctx2.stroke();
    ctx2.restore();

    // Caja auxiliar
    if (sim2State.showBox) {
      ctx2.save();
      ctx2.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.28)';
      ctx2.lineWidth = 1.2;
      ctx2.setLineDash([4, 4]);

      const boxW = isH ? a * scale : b * scale;
      const boxH = isH ? b * scale : a * scale;
      ctx2.strokeRect(centerX - boxW, centerY - boxH, boxW * 2, boxH * 2);
      ctx2.restore();
    }

    // Asíntotas trasladadas
    if (sim2State.showAsyn) {
      ctx2.save();
      ctx2.strokeStyle = isLight ? '#2563eb' : '#3b82f6';
      ctx2.lineWidth = 1.6;
      ctx2.setLineDash([5, 5]);

      const span = 16;
      const slope = isH ? (b / a) : (a / b);

      ctx2.beginPath();
      ctx2.moveTo(centerX - span * scale, centerY + (span * slope) * scale);
      ctx2.lineTo(centerX + span * scale, centerY - (span * slope) * scale);
      ctx2.stroke();

      ctx2.beginPath();
      ctx2.moveTo(centerX - span * scale, centerY - (span * slope) * scale);
      ctx2.lineTo(centerX + span * scale, centerY + (span * slope) * scale);
      ctx2.stroke();
      ctx2.restore();
    }

    // Curvas
    ctx2.save();
    ctx2.strokeStyle = isLight ? '#b47a16' : '#dfa135';
    ctx2.lineWidth = 3;
    ctx2.shadowColor = isLight ? 'rgba(180, 122, 22, 0.3)' : 'rgba(223, 161, 53, 0.4)';
    ctx2.shadowBlur = isLight ? 4 : 8;
    ctx2.lineWidth = 3;
    ctx2.shadowColor = 'rgba(223, 161, 53, 0.4)';
    ctx2.shadowBlur = 8;

    const maxParam = 12;
    const step = 0.05;

    if (isH) {
      ctx2.beginPath();
      let first = true;
      for (let y = -maxParam; y <= maxParam; y += step) {
        const xOffset = a * Math.sqrt(1 + (y * y) / (b * b));
        const px = centerX + xOffset * scale;
        const py = centerY - y * scale;
        if (first) { ctx2.moveTo(px, py); first = false; }
        else { ctx2.lineTo(px, py); }
      }
      ctx2.stroke();

      ctx2.beginPath();
      first = true;
      for (let y = -maxParam; y <= maxParam; y += step) {
        const xOffset = -a * Math.sqrt(1 + (y * y) / (b * b));
        const px = centerX + xOffset * scale;
        const py = centerY - y * scale;
        if (first) { ctx2.moveTo(px, py); first = false; }
        else { ctx2.lineTo(px, py); }
      }
      ctx2.stroke();
    } else {
      ctx2.beginPath();
      let first = true;
      for (let x = -maxParam; x <= maxParam; x += step) {
        const yOffset = a * Math.sqrt(1 + (x * x) / (b * b));
        const px = centerX + x * scale;
        const py = centerY - yOffset * scale;
        if (first) { ctx2.moveTo(px, py); first = false; }
        else { ctx2.lineTo(px, py); }
      }
      ctx2.stroke();

      ctx2.beginPath();
      first = true;
      for (let x = -maxParam; x <= maxParam; x += step) {
        const yOffset = -a * Math.sqrt(1 + (x * x) / (b * b));
        const px = centerX + x * scale;
        const py = centerY - yOffset * scale;
        if (first) { ctx2.moveTo(px, py); first = false; }
        else { ctx2.lineTo(px, py); }
      }
      ctx2.stroke();
    }
    ctx2.restore();

    // Puntos
    drawPoint(ctx2, centerX, centerY, '#10b981', `C(${h}, ${k})`);

    if (isH) {
      drawPoint(ctx2, centerX + a * scale, centerY, '#dfa135', `V₁(${(h + a).toFixed(1)}, ${k})`);
      drawPoint(ctx2, centerX - a * scale, centerY, '#dfa135', `V₂(${(h - a).toFixed(1)}, ${k})`);
      drawPoint(ctx2, centerX + c * scale, centerY, '#ef4444', `F₁(${(h + c).toFixed(1)}, ${k})`);
      drawPoint(ctx2, centerX - c * scale, centerY, '#ef4444', `F₂(${(h - c).toFixed(1)}, ${k})`);
    } else {
      drawPoint(ctx2, centerX, centerY - a * scale, '#dfa135', `V₁(${h}, ${(k + a).toFixed(1)})`);
      drawPoint(ctx2, centerX, centerY + a * scale, '#dfa135', `V₂(${h}, ${(k - a).toFixed(1)})`);
      drawPoint(ctx2, centerX, centerY - c * scale, '#ef4444', `F₁(${h}, ${(k + c).toFixed(1)})`);
      drawPoint(ctx2, centerX, centerY + c * scale, '#ef4444', `F₂(${h}, ${(k - c).toFixed(1)})`);
    }
  }

  function updateLiveBox2(h, k, a, b, c, isH) {
    const a2 = (a * a).toFixed(1).replace('.0', '');
    const b2 = (b * b).toFixed(1).replace('.0', '');

    const termH = h === 0 ? 'x' : (h > 0 ? `(x − ${h})` : `(x + ${Math.abs(h)})`);
    const termK = k === 0 ? 'y' : (k > 0 ? `(y − ${k})` : `(y + ${Math.abs(k)})`);

    const eqEl = document.getElementById('liveEquation2');
    if (isH) {
      eqEl.innerHTML = `${termH}² / <strong>${a2}</strong> − ${termK}² / <strong>${b2}</strong> = 1`;
      document.getElementById('calcV2').textContent = `(${h}±${a.toFixed(1)}, ${k})`;
      document.getElementById('calcF2').textContent = `(${h}±${c.toFixed(1)}, ${k})`;
    } else {
      eqEl.innerHTML = `${termK}² / <strong>${a2}</strong> − ${termH}² / <strong>${b2}</strong> = 1`;
      document.getElementById('calcV2').textContent = `(${h}, ${k}±${a.toFixed(1)})`;
      document.getElementById('calcF2').textContent = `(${h}, ${k}±${c.toFixed(1)})`;
    }

    document.getElementById('calcCenter2').textContent = `(${h}, ${k})`;

    let A, C, D, E, F;
    const aVal2 = a * a;
    const bVal2 = b * b;

    if (isH) {
      A = bVal2;
      C = -aVal2;
      D = -2 * bVal2 * h;
      E = 2 * aVal2 * k;
      F = (bVal2 * h * h) - (aVal2 * k * k) - (aVal2 * bVal2);
    } else {
      A = -bVal2;
      C = aVal2;
      D = 2 * bVal2 * h;
      E = -2 * aVal2 * k;
      F = (-bVal2 * h * h) + (aVal2 * k * k) - (aVal2 * bVal2);
    }

    const fmtSign = (n) => (n >= 0 ? `+ ${n.toFixed(1).replace('.0', '')}` : `− ${Math.abs(n).toFixed(1).replace('.0', '')}`);
    const genStr = `${A.toFixed(1).replace('.0', '')}x² ${fmtSign(C)}y² ${fmtSign(D)}x ${fmtSign(E)}y ${fmtSign(F)} = 0`;
    document.getElementById('calcGen2').textContent = genStr;
  }

  // ==========================================
  // 6. ACORDEÓN INTERACTIVO DE APLICACIONES
  // ==========================================
  function initAccordion() {
    const accItems = document.querySelectorAll('.accordion-item');

    accItems.forEach(item => {
      const headerBtn = item.querySelector('.accordion-header');
      if (!headerBtn) return;

      headerBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Cerrar todos los acordeones
        accItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          const btn = otherItem.querySelector('.accordion-header');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });

        // Si no estaba activo, abrir este
        if (!isActive) {
          item.classList.add('active');
          headerBtn.setAttribute('aria-expanded', 'true');

          // Cambiar modelo 3D según el tema abierto
          const modelType = item.getAttribute('data-model');
          if (modelType === 'tower') {
            switchAppModel('tower');
          } else if (modelType === 'orbit') {
            switchAppModel('orbit');
          }
        }
      });
    });
  }

  // ==========================================
  // 7. MOTOR 3D: APLICACIONES DE LA HIPÉRBOLA
  // ==========================================
  let appScene, appCamera, appRenderer, appControls;
  let appModelGroup = null;
  let currentAppModel = 'tower';
  let isAppRotating = true;
  let satelliteMesh = null;
  let satelliteOrbitTime = 0;

  function initApp3D() {
    const container = document.getElementById('threejs-app-container');
    if (!container || typeof THREE === 'undefined') return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    appScene = new THREE.Scene();
    appCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    appCamera.position.set(6.5, 4.5, 7.5);

    appRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    appRenderer.setSize(width, height);
    appRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(appRenderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      appControls = new THREE.OrbitControls(appCamera, appRenderer.domElement);
      appControls.enableDamping = true;
      appControls.dampingFactor = 0.05;
      appControls.maxDistance = 20;
      appControls.minDistance = 3.5;
      appControls.target.set(0, 0, 0);
    }

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    appScene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xebb34d, 0.9);
    dirLight1.position.set(5, 8, 5);
    appScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.6);
    dirLight2.position.set(-5, -5, -4);
    appScene.add(dirLight2);

    appModelGroup = new THREE.Group();
    appScene.add(appModelGroup);

    // Cargar modelo inicial (Torre)
    loadTowerModel();

    // Botones de cambio de modelo
    const btnTower = document.getElementById('btnModelTower');
    const btnOrbit = document.getElementById('btnModelOrbit');
    const btnRotate = document.getElementById('btnToggleAppRotate');

    if (btnTower) {
      btnTower.addEventListener('click', () => switchAppModel('tower'));
    }
    if (btnOrbit) {
      btnOrbit.addEventListener('click', () => switchAppModel('orbit'));
    }
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        isAppRotating = !isAppRotating;
        btnRotate.innerHTML = isAppRotating ? '<i class="fa-solid fa-pause"></i> Rotación' : '<i class="fa-solid fa-play"></i> Rotación';
      });
    }

    window.addEventListener('resize', onWindowResizeApp3D);
    animateApp3D();
  }

  function switchAppModel(type) {
    if (currentAppModel === type) return;
    currentAppModel = type;

    const btnTower = document.getElementById('btnModelTower');
    const btnOrbit = document.getElementById('btnModelOrbit');
    const titleEl = document.getElementById('appModelTitle');
    const descEl = document.getElementById('appModelDesc');
    const badgeEl = document.getElementById('appModelBadge');

    if (type === 'tower') {
      if (btnTower) btnTower.classList.add('active');
      if (btnOrbit) btnOrbit.classList.remove('active');
      if (titleEl) titleEl.textContent = 'Torre de Enfriamiento Hiperboloide';
      if (descEl) descEl.innerHTML = 'Generada al revolucionar la hipérbola vertical <code>x²/a² − y²/b² = 1</code> alrededor de su centro en el origen (0,0). La curvatura cóncava resiste vientos extremos y acelera el flujo de aire caliente.';
      if (badgeEl) badgeEl.innerHTML = '<i class="fa-solid fa-industry"></i> Centro en el Origen (0, 0)';
      loadTowerModel();
    } else {
      if (btnOrbit) btnOrbit.classList.add('active');
      if (btnTower) btnTower.classList.remove('active');
      if (titleEl) titleEl.textContent = 'Trayectoria Hiperbólica de Escape Espacial';
      if (descEl) descEl.innerHTML = 'La sonda espacial sigue una hipérbola abierta con centro desplazado y excentricidad <code>e > 1</code>. El planeta actúa como uno de los focos <code>(h, k)</code> mediante asistencia gravitatoria.';
      if (badgeEl) badgeEl.innerHTML = '<i class="fa-solid fa-shuttle-space"></i> Centro Fuera del Origen (h, k)';
      loadOrbitModel();
    }
  }

  function clearAppModel() {
    while (appModelGroup.children.length > 0) {
      appModelGroup.remove(appModelGroup.children[0]);
    }
    satelliteMesh = null;
  }

  // Modelo 1: Torre Hiperboloide de 1 hoja (Centro en el Origen)
  function loadTowerModel() {
    clearAppModel();

    const a = 1.35; // Radio en la cintura estrecha
    const b = 2.1;  // Parámetro vertical
    const height = 4.2;
    const radialSegments = 36;
    const heightSegments = 24;

    // Generar malla del hiperboloide con radio r(y) = a * sqrt(1 + y^2/b^2)
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    const halfH = height / 2;

    for (let j = 0; j <= heightSegments; j++) {
      const v = j / heightSegments;
      const y = -halfH + v * height;
      const radius = a * Math.sqrt(1 + (y * y) / (b * b));

      for (let i = 0; i <= radialSegments; i++) {
        const u = (i / radialSegments) * Math.PI * 2;
        const x = radius * Math.cos(u);
        const z = radius * Math.sin(u);
        vertices.push(x, y, z);
      }
    }

    const rowLength = radialSegments + 1;
    for (let j = 0; j < heightSegments; j++) {
      for (let i = 0; i < radialSegments; i++) {
        const aIdx = j * rowLength + i;
        const bIdx = (j + 1) * rowLength + i;
        const cIdx = (j + 1) * rowLength + (i + 1);
        const dIdx = j * rowLength + (i + 1);

        indices.push(aIdx, bIdx, dIdx);
        indices.push(bIdx, cIdx, dIdx);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x1d2744,
      transparent: true,
      opacity: 0.68,
      roughness: 0.3,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const towerMesh = new THREE.Mesh(geom, mat);
    appModelGroup.add(towerMesh);

    // Vigas rectas regladas de la estructura (doble familia de generatrices)
    const beamCount = 18;
    const beamMat = new THREE.LineBasicMaterial({ color: 0x3d4f7c, transparent: true, opacity: 0.45 });

    for (let k = 0; k < beamCount; k++) {
      const angle = (k / beamCount) * Math.PI * 2;
      const shift = 1.1; // Inclinación reglada característica
      const y1 = -halfH;
      const y2 = halfH;
      const r1 = a * Math.sqrt(1 + (y1 * y1) / (b * b));
      const r2 = a * Math.sqrt(1 + (y2 * y2) / (b * b));

      // Familia 1
      const pts1 = [
        new THREE.Vector3(r1 * Math.cos(angle), y1, r1 * Math.sin(angle)),
        new THREE.Vector3(r2 * Math.cos(angle + shift), y2, r2 * Math.sin(angle + shift))
      ];
      appModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), beamMat));

      // Familia 2 cruzada
      const pts2 = [
        new THREE.Vector3(r1 * Math.cos(angle), y1, r1 * Math.sin(angle)),
        new THREE.Vector3(r2 * Math.cos(angle - shift), y2, r2 * Math.sin(angle - shift))
      ];
      appModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), beamMat));
    }

    // Línea generatriz hiperbólica en oro brillante
    const curvePoints = [];
    for (let j = 0; j <= 50; j++) {
      const y = -halfH + (j / 50) * height;
      const r = a * Math.sqrt(1 + (y * y) / (b * b));
      curvePoints.push(new THREE.Vector3(r, y, 0));
    }
    const curveGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMat = new THREE.LineBasicMaterial({ color: 0xebb34d, linewidth: 3 });
    appModelGroup.add(new THREE.Line(curveGeom, curveMat));

    // Base del suelo
    const groundGeom = new THREE.RingGeometry(0, 3.8, 32);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x0c0f17, side: THREE.DoubleSide });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.position.y = -halfH;
    appModelGroup.add(groundMesh);
  }

  // Modelo 2: Trayectoria de Escape Espacial (Centro Fuera del Origen)
  function loadOrbitModel() {
    clearAppModel();

    // Planeta situado en el foco de la hipérbola (desplazado del centro)
    const planetGeom = new THREE.SphereGeometry(0.85, 32, 32);
    const planetMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d3557,
      roughness: 0.4,
      metalness: 0.1
    });
    const planet = new THREE.Mesh(planetGeom, planetMat);
    
    // Anillos planetarios
    const ringGeom = new THREE.RingGeometry(1.2, 1.8, 32);
    ringGeom.rotateX(Math.PI / 2.3);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    planet.add(new THREE.Mesh(ringGeom, ringMat));

    // Desplazamiento del planeta (Foco F en h=1.5, k=0)
    planet.position.set(1.5, 0, 0);
    appModelGroup.add(planet);

    // Ejes cartesianos guía tenues
    const axisMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 });
    const ptsX = [new THREE.Vector3(-4, 0, 0), new THREE.Vector3(4, 0, 0)];
    const ptsZ = [new THREE.Vector3(0, 0, -4), new THREE.Vector3(0, 0, 4)];
    appModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsX), axisMat));
    appModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsZ), axisMat));

    // Curva hiperbólica de escape en el plano XZ
    // (x - h)^2 / a^2 - z^2 / b^2 = 1
    const a = 1.6;
    const b = 1.3;
    const h = -0.5; // Centro de la hipérbola en h = -0.5 (Foco en h + c ≈ 1.56, donde está el planeta)
    
    const orbitPoints = [];
    for (let t = -2.8; t <= 2.8; t += 0.08) {
      const z = t;
      const x = h + a * Math.sqrt(1 + (z * z) / (b * b));
      orbitPoints.push(new THREE.Vector3(x, 0, z));
    }

    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xebb34d, linewidth: 3 });
    appModelGroup.add(new THREE.Line(orbitGeom, orbitMat));

    // Asíntotas de escape punteadas
    const asynMat = new THREE.LineDashedMaterial({ color: 0x3b82f6, dashSize: 0.2, gapSize: 0.15, linewidth: 1.5 });
    const asyn1Pts = [
      new THREE.Vector3(h - 3 * (a/b), 0, -3),
      new THREE.Vector3(h + 3.8 * (a/b), 0, 3.8)
    ];
    const lineAsyn1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(asyn1Pts), asynMat);
    lineAsyn1.computeLineDistances();
    appModelGroup.add(lineAsyn1);

    // Satélite / Sonda espacial
    const satGroup = new THREE.Group();
    const bodyGeom = new THREE.BoxGeometry(0.2, 0.15, 0.2);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    satGroup.add(new THREE.Mesh(bodyGeom, bodyMat));

    // Paneles solares
    const panelGeom = new THREE.BoxGeometry(0.5, 0.02, 0.15);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const panelMesh = new THREE.Mesh(panelGeom, panelMat);
    satGroup.add(panelMesh);

    satelliteMesh = satGroup;
    appModelGroup.add(satelliteMesh);
  }

  function onWindowResizeApp3D() {
    const container = document.getElementById('threejs-app-container');
    if (!container || !appRenderer || !appCamera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    appCamera.aspect = width / height;
    appCamera.updateProjectionMatrix();
    appRenderer.setSize(width, height);
  }

  function animateApp3D() {
    requestAnimationFrame(animateApp3D);

    if (isAppRotating && appModelGroup) {
      appModelGroup.rotation.y += 0.005;
    }

    // Animación de la sonda espacial a lo largo de la hipérbola
    if (satelliteMesh && currentAppModel === 'orbit') {
      satelliteOrbitTime += 0.012;
      const t = Math.sin(satelliteOrbitTime) * 2.5;
      const a = 1.6;
      const b = 1.3;
      const h = -0.5;
      const z = t;
      const x = h + a * Math.sqrt(1 + (z * z) / (b * b));
      satelliteMesh.position.set(x, 0, z);
      satelliteMesh.rotation.y = -Math.atan2(z, x - h) + Math.PI / 2;
    }

    if (appControls) {
      appControls.update();
    }

    if (appRenderer && appScene && appCamera) {
      appRenderer.render(appScene, appCamera);
    }
  }

  // ==========================================
  // HELPERS CANVAS 2D
  // ==========================================
  function setupHiDPICanvas(cvs, ctx) {
    const rect = cvs.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (cvs.width !== rect.width * dpr || cvs.height !== rect.height * dpr) {
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    cvs.style.width = `${rect.width}px`;
    cvs.style.height = `${rect.height}px`;
  }

  function drawGrid(ctx, w, h, ox, oy, scale) {
    const isLight = document.body.classList.contains('light-mode');
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';

    for (let x = ox % scale; x < w; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = oy % scale; y < h; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(w, oy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, h);
    ctx.stroke();

    ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.25)';
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'center';

    for (let unit = -10; unit <= 10; unit += 2) {
      if (unit === 0) continue;
      const xPos = ox + unit * scale;
      if (xPos > 10 && xPos < w - 10) {
        ctx.fillText(unit, xPos, oy + 14);
      }
      const yPos = oy - unit * scale;
      if (yPos > 10 && yPos < h - 10) {
        ctx.fillText(unit, ox - 12, yPos + 3);
      }
    }
    ctx.restore();
  }

  function drawPoint(ctx, x, y, color, label) {
    const isLight = document.body.classList.contains('light-mode');
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (label) {
      ctx.fillStyle = isLight ? '#0f172a' : '#f3f4f6';
      ctx.font = '600 11px "Poppins", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 7, y - 5);
    }
    ctx.restore();
  }

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================
  initSim1Listeners();
  initSim2Listeners();
  initAccordion();

  renderSim1();
  renderSim2();

  // Iniciar Visor 3D en el Hero
  setTimeout(initHero3D, 150);

  // Iniciar Visor 3D de Aplicaciones
  setTimeout(initApp3D, 250);

  window.addEventListener('resize', () => {
    renderSim1();
    renderSim2();
  });

});
