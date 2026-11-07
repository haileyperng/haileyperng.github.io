// Home page: a 3D exploded camera, rendered like a CAD assembly drawing.
//
//  - Each section is a real sub-assembly: Lens → Film, Aperture → Photography,
//    Viewfinder prism → About, Flash → Contact. Click a part (or its label) to open it.
//  - Parts slide apart along their assembly axes; dashed lines show where they came from.
//  - Hovering a part shows what it does: lens elements spread, iris closes, prism lifts,
//    flash fires. Gears always turn.
//  - Move the cursor to tilt, drag to rotate, click the body to assemble / explode.
//
// Returns false if WebGL isn't available so the page can fall back to the 2D drawing.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { setCursorLabel } from "/js/cursor.js";

export const SECTIONS = {
  lens:     { href: "/film/",        num: "01", part: "Lens assy.",  title: "Film",        blurb: "Moving images" },
  aperture: { href: "/photography/", num: "02", part: "Iris diaphragm", title: "Photography", blurb: "Still frames" },
  prism:    { href: "/about/",       num: "03", part: "Pentaprism",  title: "About",       blurb: "How I see" },
  flash:    { href: "/contact/",     num: "04", part: "Flash unit",  title: "Contact",     blurb: "Send a signal" },
};

// Where each label sits relative to its part on screen (px), desktop / phone
const LABEL_OFFSET = {
  lens:     [[70, 60], [-20, 70]],
  aperture: [[-200, 90], [-120, 80]],
  prism:    [[-210, -60], [-130, -70]],
  flash:    [[60, -70], [-10, -90]],
};

export function initCamera3D(stage) {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return false;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isPhone = () => stage.clientWidth < 700;

  /* ---------------------------------------------------------------- renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "camera-canvas";
  canvas.dataset.cursorManaged = "";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(6, 3, -8);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------------------------------------------------------------- materials */
  const M = materials();

  /* ---------------------------------------------------------------- model */
  const pivot = new THREE.Group();          // rotates with cursor / drag
  const model = new THREE.Group();          // offset so the exploded model is centered
  model.position.set(0.3, -0.75, -2.2);
  pivot.add(model);
  scene.add(pivot);

  const partsRoot = new THREE.Group();      // everything clickable / raycastable
  const linesRoot = new THREE.Group();      // assembly lines
  model.add(partsRoot, linesRoot);

  const movers = [];                        // { obj, home, offset, delay }
  const addMover = (obj, home, offset, delay = 0) => {
    obj.position.copy(home);
    partsRoot.add(obj);
    movers.push({ obj, home: home.clone(), offset: offset.clone(), delay });
    // assembly line from home to exploded position
    const g = new THREE.BufferGeometry().setFromPoints([home, home.clone().add(offset)]);
    const line = new THREE.Line(g, M.line);
    line.computeLineDistances();
    linesRoot.add(line);
  };

  // Body core (black leatherette) with lens mount
  const body = new THREE.Group();
  body.userData.kind = "body";
  const core = mesh(new RoundedBoxGeometry(4.2, 1.7, 1.2, 4, 0.1), M.leather);
  body.add(core);
  const mount = mesh(cyl(0.86, 0.12), M.aluBright);
  mount.rotation.x = Math.PI / 2; mount.position.z = 0.64;
  const throat = mesh(cyl(0.66, 0.13), M.black);
  throat.rotation.x = Math.PI / 2; throat.position.z = 0.65;
  body.add(mount, throat);
  for (const sx of [-1, 1]) {
    const lug = mesh(new THREE.BoxGeometry(0.08, 0.2, 0.14), M.steel);
    lug.position.set(sx * 2.13, 0.55, 0);
    body.add(lug);
  }
  addMover(body, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));

  // Top plate with dials and engraved name
  const top = new THREE.Group();
  top.userData.kind = "body";
  top.add(mesh(new RoundedBoxGeometry(4.3, 0.46, 1.3, 4, 0.09), M.alu));
  const speedDial = knurledDial(0.36, 0.2, M.aluBright, M.steel); speedDial.position.set(1.3, 0.33, 0); top.add(speedDial);
  const rewind = knurledDial(0.3, 0.26, M.black, M.steel); rewind.position.set(-1.45, 0.36, 0); top.add(rewind);
  const button = mesh(cyl(0.11, 0.12), M.steel); button.position.set(1.85, 0.3, 0.32); top.add(button);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.26), M.engraving);
  plate.position.set(-0.35, 0, 0.651); top.add(plate);
  addMover(top, new THREE.Vector3(0, 1.08, 0), new THREE.Vector3(0, 0.9, 0), 0.05);

  // Bottom plate + screws
  const bottom = mesh(new RoundedBoxGeometry(4.3, 0.3, 1.3, 4, 0.08), M.alu);
  bottom.userData.kind = "body";
  addMover(bottom, new THREE.Vector3(0, -0.99, 0), new THREE.Vector3(0, -1.0, 0), 0.05);
  [[-1.6, 0.35], [1.6, 0.35], [-1.6, -0.35], [1.6, -0.35]].forEach(([x, z], i) => {
    const s = screw(M);
    addMover(s, new THREE.Vector3(x, -1.15, z), new THREE.Vector3(0, -1.9, 0), 0.12 + i * 0.03);
  });

  // 01 Lens assembly → Film
  const lens = sectionGroup("lens");
  const lensAxis = new THREE.Group(); lensAxis.rotation.x = Math.PI / 2; lens.add(lensAxis); // build along +y, point along +z
  const flange = mesh(cyl(0.82, 0.12), M.aluBright); flange.position.y = 0.06;
  const apRing = mesh(cyl(0.77, 0.14), M.alu); apRing.position.y = 0.2;
  const barrel = mesh(cyl(0.72, 1.1), M.black); barrel.position.y = 0.72;
  const focus = knurl(0.79, 0.5, 80, M.rubber); focus.position.y = 0.66;
  const frontRing = new THREE.Group();
  const fr = mesh(cyl(0.8, 0.14), M.black); frontRing.add(fr);
  const ringText = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.79, 96), M.lensText);
  ringText.rotation.x = -Math.PI / 2; ringText.position.y = 0.071; frontRing.add(ringText);
  frontRing.position.y = 1.34;
  lensAxis.add(flange, apRing, barrel, focus, frontRing);
  const elements = [
    { r: 0.48, s: 0.16, e: 0.04, y: 0.5, to: 2.15 },
    { r: 0.52, s: 0.12, e: 0.03, y: 0.85, to: 2.6 },
    { r: 0.56, s: 0.2, e: 0.04, y: 1.15, to: 3.1 },
  ].map((d) => {
    const el = mesh(lensElement(d.r, d.s, d.e), M.glass);
    el.castShadow = false;
    el.position.y = d.y;
    lensAxis.add(el);
    return { el, ...d };
  });
  lens.userData.anchor = new THREE.Vector3(0.8, 0.2, 1.6);
  addMover(lens, new THREE.Vector3(0, 0, 0.64), new THREE.Vector3(0, 0, 2.0), 0.15);

  // 02 Iris diaphragm → Photography
  const aperture = sectionGroup("aperture");
  const irisAxis = new THREE.Group(); irisAxis.rotation.x = Math.PI / 2; aperture.add(irisAxis);
  irisAxis.add(mesh(annulus(0.5, 0.8, 0.1), M.aluBright));
  const cover = mesh(annulus(0.63, 0.8, 0.03), M.alu); cover.position.y = 0.07; irisAxis.add(cover);
  const blades = [];
  for (let k = 0; k < 9; k++) {
    const hinge = new THREE.Group();
    hinge.rotation.y = (k / 9) * Math.PI * 2;
    const blade = mesh(new THREE.BoxGeometry(0.66, 0.012, 0.3), k % 2 ? M.bladeA : M.bladeB);
    blade.position.set(0, 0.02 + k * 0.003, 0.6);
    hinge.add(blade);
    irisAxis.add(hinge);
    blades.push(blade);
  }
  aperture.userData.anchor = new THREE.Vector3(0, -0.85, 0);
  addMover(aperture, new THREE.Vector3(0, 0, 0.7), new THREE.Vector3(0, 0, 0.95), 0.1);

  // 03 Pentaprism housing → About
  const prism = sectionGroup("prism");
  const housing = mesh(prismGeometry(1.0), M.alu);
  const eyepiece = mesh(cyl(0.22, 0.3), M.rubber); eyepiece.rotation.x = Math.PI / 2; eyepiece.position.set(0, 0.32, -0.78);
  const shoe = mesh(new THREE.BoxGeometry(0.52, 0.05, 0.44), M.steel); shoe.position.y = 0.75;
  const housingGroup = new THREE.Group(); housingGroup.add(housing, eyepiece, shoe);
  const prismGlass = mesh(prismGeometry(0.72), M.glass); prismGlass.castShadow = false;
  prism.add(housingGroup, prismGlass);
  prism.userData.anchor = new THREE.Vector3(0, 0.6, 0);
  addMover(prism, new THREE.Vector3(0, 1.31, 0), new THREE.Vector3(0, 2.5, 0), 0.2);

  // 04 Flash unit → Contact
  const flash = sectionGroup("flash");
  const foot = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.42), M.steel); foot.position.y = 0.05;
  const fBody = mesh(new RoundedBoxGeometry(0.95, 0.75, 0.7, 3, 0.06), M.black); fBody.position.y = 0.5;
  const fHead = mesh(new RoundedBoxGeometry(1.15, 0.56, 0.86, 3, 0.06), M.alu); fHead.position.y = 1.15;
  const fresnel = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.4), M.fresnel); fresnel.position.set(0, 1.15, 0.431);
  flash.add(foot, fBody, fHead, fresnel);
  flash.userData.anchor = new THREE.Vector3(0.55, 1.3, 0);
  addMover(flash, new THREE.Vector3(0, 2.1, 0), new THREE.Vector3(2.7, 1.2, 0.3), 0.25);

  // Gear train + film canister (decoration)
  const gears = [
    { teeth: 18, r: 0.7, home: [-1.0, 0.15, -0.15], to: [-4.1, 0.75, -0.9], mat: M.aluBright },
    { teeth: 12, r: 0.46, home: [-0.6, -0.2, -0.15], to: [-2.99, 0.75, -0.9], mat: M.steel },
    { teeth: 10, r: 0.38, home: [-1.4, -0.3, -0.15], to: [-3.55, -0.27, -0.9], mat: M.steel },
  ].map((d, i) => {
    const g = gear(d.teeth, d.r, M, d.mat);
    const home = new THREE.Vector3(...d.home);
    addMover(g, home, new THREE.Vector3(...d.to).sub(home), 0.3 + i * 0.05);
    return { g, ratio: 18 / d.teeth * (i === 1 ? -1 : i === 2 ? -1 : 1) };
  });
  const can = canister(M);
  addMover(can, new THREE.Vector3(1.4, -0.05, -0.1), new THREE.Vector3(2.1, -1.3, 0.4), 0.35);

  // Optical axis
  const axisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, 7.4)]);
  const axisLine = new THREE.Line(axisGeo, M.axis); axisLine.computeLineDistances();
  linesRoot.add(axisLine);

  partsRoot.traverse((o) => { if (o.isMesh && o.castShadow !== false) { o.castShadow = true; o.receiveShadow = true; } });
  [prismGlass, ...elements.map((e) => e.el)].forEach((o) => (o.castShadow = false));

  /* ---------------------------------------------------------------- labels */
  const overlay = document.createElement("div");
  overlay.className = "camera-overlay";
  overlay.innerHTML = `<svg class="camera-leaders" aria-hidden="true"></svg>` + Object.entries(SECTIONS).map(([id, s]) => `
    <a class="camera-callout" href="${s.href}" data-id="${id}" data-cursor-label="Open">
      <span class="label">${s.num} — ${s.part}</span>
      <strong>${s.title}</strong>
      <span class="label">${s.blurb}</span>
    </a>`).join("");
  stage.append(overlay);
  const leaders = overlay.querySelector(".camera-leaders");
  const callouts = Object.fromEntries([...overlay.querySelectorAll(".camera-callout")].map((a) => [a.dataset.id, a]));
  Object.entries(callouts).forEach(([id, a]) => {
    a.addEventListener("pointerenter", () => (hovered = id));
    a.addEventListener("pointerleave", () => (hovered = null));
    a.addEventListener("focus", () => (hovered = id));
    a.addEventListener("blur", () => (hovered = null));
  });

  /* ---------------------------------------------------------------- state */
  const sections = { lens, aperture, prism, flash };
  const hoverK = { lens: 0, aperture: 0, prism: 0, flash: 0 };
  let hovered = null;          // section id under pointer / focused
  let overBody = false;
  let exploded = true;
  let t = reduceMotion ? 1 : 0; // 0 assembled → 1 exploded
  let flashPulse = 0;
  let yaw = -0.98, pitch = 0.24, dragYaw = 0;
  let tiltX = 0, tiltY = 0;

  const toggleBtn = stage.querySelector("[data-camera-toggle]");
  const setExploded = (v) => {
    exploded = v;
    stage.classList.toggle("is-exploded", v);
    if (toggleBtn) toggleBtn.textContent = v ? "Assemble" : "Explode";
  };
  toggleBtn?.addEventListener("click", () => setExploded(!exploded));
  setExploded(false);
  setTimeout(() => setExploded(true), reduceMotion ? 0 : 450);

  /* ---------------------------------------------------------------- pointer */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(partsRoot, true)[0];
    let o = hit?.object;
    while (o && o !== partsRoot) {
      if (o.userData.section) return { section: o.userData.section };
      if (o.userData.kind === "body") return { body: true };
      o = o.parent;
    }
    return {};
  }

  canvas.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    tiltX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tiltY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (down) {
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 4) down.dragged = true;
      if (down.dragged) { dragYaw = down.yaw + dx * 0.008; setCursorLabel("Rotate"); return; }
    }
    if (e.pointerType !== "mouse") return;
    const p = pick(e);
    hovered = p.section || null;
    overBody = !!p.body;
    setCursorLabel(hovered ? "Open" : overBody ? (exploded ? "Assemble" : "Explode") : "", !!(hovered || overBody));
  });
  canvas.addEventListener("pointerleave", () => { hovered = null; overBody = false; tiltX = tiltY = 0; setCursorLabel(""); });
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, yaw: dragYaw, dragged: false }; });
  addEventListener("pointerup", (e) => {
    if (!down) return;
    const wasDrag = down.dragged;
    down = null;
    if (wasDrag || e.target !== canvas) return;
    const p = pick(e);
    if (p.section) location.href = SECTIONS[p.section].href;
    else if (p.body) setExploded(!exploded);
  });

  /* ---------------------------------------------------------------- sizing */
  let W = 1, H = 1;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------------------------------------------------------------- loop */
  let running = true;
  let raf = 0;
  new IntersectionObserver(([en]) => { running = en.isIntersecting; if (running && !raf) loop(); }).observe(stage);

  const clock = new THREE.Clock();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tmp = new THREE.Vector3();

  function loop() {
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const time = clock.elapsedTime;

    // explode progress (wall-clock based so slow frame rates still finish in ~1.6s)
    const target = exploded ? 1 : 0;
    t = reduceMotion ? target : t + Math.sign(target - t) * Math.min(Math.abs(target - t), Math.min(raw, 0.5) / 1.6);

    for (const m of movers) {
      const local = THREE.MathUtils.clamp((t - m.delay * (exploded ? 1 : 0.4)) / (1 - m.delay), 0, 1);
      m.obj.position.copy(m.home).addScaledVector(m.offset, ease(local));
    }
    linesRoot.children.forEach((l) => (l.material.opacity = 0.9 * ease(t)));

    // hover easing
    for (const id in hoverK) hoverK[id] += ((hovered === id ? 1 : 0) - hoverK[id]) * Math.min(1, dt * 8);

    // hover: lift each section a little further along its explode direction
    for (const id in sections) {
      const m = movers.find((mv) => mv.obj === sections[id]);
      tmp.copy(m.offset).normalize().multiplyScalar(0.25 * hoverK[id] * t);
      sections[id].position.add(tmp);
    }

    // lens: elements fly out of the barrel; hover spreads them further
    for (const e of elements) e.el.position.y = e.y + (e.to - e.y) * ease(t) + (e.to - 1.6) * 0.35 * hoverK.lens;
    frontRing.position.y = 1.34 + 0.55 * ease(t) + 0.15 * hoverK.lens;

    // iris: blades close on hover
    const d = 0.62 - 0.3 * hoverK.aperture;
    blades.forEach((b) => { b.position.z = d; b.rotation.y = 0.35 + 0.5 * hoverK.aperture; });

    // prism: glass drops out of the housing; hover lifts housing
    prismGlass.position.y = -0.95 * ease(t) - 0.2 * hoverK.prism;
    prismGlass.rotation.y = time * 0.3 * hoverK.prism;
    housingGroup.position.y = 0.15 * hoverK.prism;

    // flash: fire once when hover starts
    if (hovered === "flash" && hoverK.flash < 0.15) flashPulse = 1;
    flashPulse = Math.max(0, flashPulse - dt * 2.2);
    M.fresnel.emissiveIntensity = flashPulse * 3;

    // gears
    if (!reduceMotion) {
      const speed = (0.4 + (hovered ? 1.2 : 0)) * dt;
      gears.forEach(({ g, ratio }) => (g.rotation.z += speed * ratio));
    }

    // view: cursor tilt + drag, zoom out as it explodes
    const ty = yaw + dragYaw + (reduceMotion ? 0 : tiltX * 0.25);
    const tp = pitch + (reduceMotion ? 0 : tiltY * 0.08);
    pivot.rotation.y += (ty - pivot.rotation.y) * Math.min(1, dt * 4);
    pivot.rotation.x += (tp - pivot.rotation.x) * Math.min(1, dt * 4);
    const fit = fitDistance(isPhone() ? 4.9 : 4.7) * (0.7 + 0.3 * ease(t));
    camera.position.set(0, fit * 0.16, fit);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    placeLabels();
  }

  function fitDistance(radius) {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    return radius / Math.sin(Math.min(vfov, hfov) / 2);
  }

  function placeLabels() {
    const show = t > 0.92;
    overlay.classList.toggle("is-visible", show);
    if (!show) return;
    const phone = isPhone() ? 1 : 0;
    const top = 44, bottom = H - 56;

    // 1. ideal spot for each label next to its part
    const boxes = Object.keys(sections).map((id) => {
      const g = sections[id];
      tmp.copy(g.userData.anchor);
      g.localToWorld(tmp);
      tmp.project(camera);
      const ax = (tmp.x * 0.5 + 0.5) * W;
      const ay = (-tmp.y * 0.5 + 0.5) * H;
      const [ox, oy] = LABEL_OFFSET[id][phone];
      const el = callouts[id];
      const lw = el.offsetWidth, lh = el.offsetHeight;
      return {
        id, ax, ay, lw, lh,
        lx: THREE.MathUtils.clamp(ax + ox, 8, W - lw - 8),
        ly: THREE.MathUtils.clamp(ay + oy, top, bottom - lh),
      };
    });

    // 2. nudge labels apart vertically so they never cover each other
    boxes.sort((a, b) => a.ly - b.ly);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const overlapX = a.lx < b.lx + b.lw && b.lx < a.lx + a.lw;
          const overlapY = a.ly < b.ly + b.lh + 6 && b.ly < a.ly + a.lh + 6;
          if (overlapX && overlapY) b.ly = a.ly + a.lh + 6;
        }
      }
      // keep inside the stage: if pushed past the bottom, shift everything up
      const last = boxes[boxes.length - 1];
      const over = last.ly + last.lh - bottom;
      if (over > 0) boxes.forEach((bx) => (bx.ly = Math.max(top, bx.ly - over)));
    }

    let paths = "";
    for (const { id, ax, ay, lw, lh, lx, ly } of boxes) {
      const el = callouts[id];
      el.style.transform = `translate(${lx}px, ${ly}px)`;
      el.classList.toggle("is-active", hovered === id);
      // leader: anchor → nearest edge of the label
      const ex = ax < lx ? lx : ax > lx + lw ? lx + lw : ax;
      const ey = ay < ly ? ly : ay > ly + lh ? ly + lh : ly + lh / 2;
      paths += `<circle cx="${ax}" cy="${ay}" r="3"/><polyline points="${ax},${ay} ${ex},${ey}"${hovered === id ? ' class="is-active"' : ""}/>`;
    }
    leaders.innerHTML = paths;
  }

  if (!raf) loop();
  return true;
}

/* ================================================================ builders */

function mesh(geo, mat) { return new THREE.Mesh(geo, mat); }
function cyl(r, h, seg = 72) { return new THREE.CylinderGeometry(r, r, h, seg); }

function sectionGroup(id) {
  const g = new THREE.Group();
  g.userData.section = id;
  return g;
}

// Ring (washer) around the y axis
function annulus(rIn, rOut, h) {
  const pts = [[rIn, -h / 2], [rOut, -h / 2], [rOut, h / 2], [rIn, h / 2], [rIn, -h / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 96);
}

// Biconvex lens element around the y axis
function lensElement(r, sag, edge) {
  const pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector2(r * u, -(edge + (sag - edge) * (1 - u * u)))); }
  for (let i = 20; i >= 0; i--) { const u = i / 20; pts.push(new THREE.Vector2(r * u, edge + (sag - edge) * (1 - u * u))); }
  return new THREE.LatheGeometry(pts, 96);
}

// Ridged ring (focus grip / dial edge) around the y axis
function knurl(r, h, count, mat) {
  const g = new THREE.Group();
  g.add(mesh(cyl(r - 0.025, h), mat));
  const ridges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, h, 0.05), mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    p.set(Math.cos(a) * (r - 0.01), 0, Math.sin(a) * (r - 0.01));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    ridges.setMatrixAt(i, m.compose(p, q, s));
  }
  g.add(ridges);
  return g;
}

function knurledDial(r, h, mat, capMat) {
  const g = knurl(r, h, 48, mat);
  const cap = mesh(cyl(r * 0.7, 0.03), capMat);
  cap.position.y = h / 2 + 0.01;
  g.add(cap);
  return g;
}

// Pentaprism hump: profile in (z, y), extruded along x
function prismGeometry(scale) {
  const s = new THREE.Shape();
  const P = [[-0.6, 0], [0.6, 0], [0.6, 0.22], [0.22, 0.72], [-0.22, 0.72], [-0.6, 0.22]].map(([u, v]) => [u * scale, v * scale]);
  s.moveTo(...P[0]); P.slice(1).forEach((p) => s.lineTo(...p)); s.closePath();
  const depth = 1.3 * scale;
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function gear(teeth, r, M, mat) {
  const shape = new THREE.Shape();
  const root = r - 0.1, step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    [[0, root], [0.15, r], [0.45, r], [0.6, root]].forEach(([f, rad], j) => {
      const x = rad * Math.cos(a + f * step), y = rad * Math.sin(a + f * step);
      i === 0 && j === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const holeR = (root - 0.12) * 0.3;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2, hr = (root + 0.12) * 0.5;
    const h = new THREE.Path(); h.absarc(hr * Math.cos(a), hr * Math.sin(a), holeR, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 });
  geo.center();
  const g = new THREE.Group();
  g.add(mesh(geo, mat));
  const axle = mesh(cyl(0.08, 0.4, 32), M.black); axle.rotation.x = Math.PI / 2; g.add(axle);
  return g;
}

function screw(M) {
  const g = new THREE.Group();
  const head = mesh(cyl(0.1, 0.05, 32), M.aluBright); head.position.y = -0.03;
  const slot = mesh(new THREE.BoxGeometry(0.15, 0.02, 0.025), M.black); slot.position.y = -0.055;
  const shaft = mesh(cyl(0.045, 0.28, 16), M.steel); shaft.position.y = 0.14;
  g.add(head, slot, shaft);
  return g;
}

function canister(M) {
  const g = new THREE.Group();
  const shell = mesh(cyl(0.38, 1.0), M.canLabel);
  const capT = mesh(cyl(0.4, 0.08), M.aluBright); capT.position.y = 0.53;
  const capB = mesh(cyl(0.4, 0.08), M.aluBright); capB.position.y = -0.53;
  const spool = mesh(cyl(0.12, 0.16, 24), M.steel); spool.position.y = 0.64;
  const leader = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), M.film);
  leader.position.set(0.88, 0, 0.3); leader.rotation.y = -0.35;
  g.add(shell, capT, capB, spool, leader);
  g.rotation.z = -0.25;
  return g;
}

/* ================================================================ materials */

function materials() {
  const tex = (w, h, draw) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const mono = (px, weight = 500) => `${weight} ${px}px "JetBrains Mono", ui-monospace, Menlo, monospace`;

  // Leatherette grain (bump)
  const grain = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 90 + Math.random() * 90 | 0;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.8, 0, 7); g.fill();
    }
  });
  grain.colorSpace = THREE.NoColorSpace;
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(5, 2);

  // Brushed-metal streaks (roughness variation)
  const brushed = tex(512, 64, (g, w, h) => {
    g.fillStyle = "#5a5a5a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      const v = 70 + Math.random() * 60 | 0;
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.fillRect(0, Math.random() * h, w, Math.random() < 0.8 ? 1 : 2);
    }
  });
  brushed.colorSpace = THREE.NoColorSpace;
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;

  const engraving = tex(1024, 102, (g, w, h) => {
    g.fillStyle = "#1a1a1c";
    g.font = mono(54); g.textBaseline = "middle";
    g.fillText("HAILEY PERNG", 8, h / 2);
    g.font = mono(34, 400); g.textAlign = "right";
    g.fillText("HP-001  ·  NO. 0426", w - 8, h / 2 + 4);
  });

  const lensText = tex(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#e8e9eb"; g.font = mono(46); g.textAlign = "center"; g.textBaseline = "middle";
    const txt = "HP-NIKKOR  50MM  1:1.4  ·  ∅52  ·  HAILEY PERNG  ·  ";
    const rad = c * 0.86;
    [...txt].forEach((ch, i) => {
      const a = (i / txt.length) * Math.PI * 2 - Math.PI / 2;
      g.save(); g.translate(c + Math.cos(a) * rad, c + Math.sin(a) * rad); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    });
  });

  const fresnelTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#f2f2f0"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.18)";
    for (let y = 4; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 6; x < w; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });

  const canTex = tex(1024, 256, (g, w, h) => {
    g.fillStyle = "#121214"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#d9dadc"; g.fillRect(0, h * 0.34, w, h * 0.32);
    g.fillStyle = "#121214"; g.font = mono(54); g.textBaseline = "middle";
    for (let x = 20; x < w; x += 520) g.fillText("HP 400  ·  35MM", x, h / 2);
  });

  const filmTex = tex(512, 320, (g, w, h) => {
    g.fillStyle = "#2a2522"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.0)";
    g.globalCompositeOperation = "destination-out";
    for (let x = 12; x < w; x += 34) { g.fillRect(x, 14, 18, 26); g.fillRect(x, h - 40, 18, 26); }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#3a332f"; g.fillRect(0, 60, w, h - 120);
  });

  const alu = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.34, roughnessMap: brushed });
  return {
    alu,
    aluBright: new THREE.MeshStandardMaterial({ color: 0xeceef0, metalness: 1, roughness: 0.2, roughnessMap: brushed }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 1, roughness: 0.42 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151517, metalness: 0.3, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0, roughness: 0.92 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0, roughness: 0.85, bumpMap: grain, bumpScale: 1.2 }),
    bladeA: new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.8, roughness: 0.35 }),
    bladeB: new THREE.MeshStandardMaterial({ color: 0x3d4045, metalness: 0.8, roughness: 0.3 }),
    // Coated optical glass: reflective + see-through, with a faint anti-reflective sheen
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9fb1c2, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.45,
      clearcoat: 1, clearcoatRoughness: 0, ior: 1.52, specularIntensity: 1,
      iridescence: 0.6, iridescenceIOR: 1.35, envMapIntensity: 2.2, depthWrite: false,
    }),
    engraving: new THREE.MeshStandardMaterial({ map: engraving, transparent: true, metalness: 0.4, roughness: 0.5 }),
    lensText: new THREE.MeshStandardMaterial({ map: lensText, transparent: true, metalness: 0.2, roughness: 0.6 }),
    fresnel: new THREE.MeshStandardMaterial({ map: fresnelTex, roughness: 0.25, emissive: 0xffffff, emissiveIntensity: 0 }),
    canLabel: new THREE.MeshStandardMaterial({ map: canTex, metalness: 0.5, roughness: 0.35 }),
    film: new THREE.MeshStandardMaterial({ map: filmTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 }),
    line: new THREE.LineDashedMaterial({ color: 0x8a8f96, dashSize: 0.14, gapSize: 0.08, transparent: true, opacity: 0 }),
    axis: new THREE.LineDashedMaterial({ color: 0xa9adb3, dashSize: 0.35, gapSize: 0.1, transparent: true, opacity: 0 }),
  };
}
