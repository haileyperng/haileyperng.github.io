// Home page: a 3D exploded mirrorless camera (a6700-style body, E-mount lens, hot-shoe flash),
// rendered like a CAD assembly drawing.
//
//  - Explore mode: starts assembled; clicking the camera opens it up (parts float apart) or closes it along their assembly axes; dashed lines show where they
//    came from. Callouts link to sections (Lens → Film, LCD → Photography, Viewfinder → About,
//    Flash → Photo Booth, Battery → Purpose on the About page).
//  - Build mode: parts scatter and you put the camera together, one step at a time. Click a
//    part (or its tag) to install it. When every step is done the flash fires.
//  - Move the cursor to tilt, drag to rotate.
//
// Returns false if WebGL isn't available so the page can fall back to the 2D drawing.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { setCursorLabel } from "/js/cursor.js";

export const SECTIONS = {
  lens:   { href: "/film/",        num: "01", part: "Lens · E-mount",  title: "Film",        blurb: "Moving images" },
  screen: { href: "/photography/", num: "02", part: "Vari-angle LCD",  title: "Photography", blurb: "Still frames" },
  evf:    { href: "/about/",       num: "03", part: "Viewfinder",      title: "About",       blurb: "How I see" },
  flash:  { href: "#booth",        num: "04", part: "Flash · hot shoe", title: "Senior Photos", blurb: "Portraits & bookings", booth: true },
  battery: { href: "/about/#purpose", num: "05", part: "Battery",       title: "Purpose",     blurb: "What keeps me charged" },
};

// Build mode: the order the checklist suggests (any order works)
export const STEPS = [
  { id: "battery", name: "Battery",            note: "Into the grip" },
  { id: "card",    name: "Memory card",        note: "Side slot" },
  { id: "screws",  name: "Base screws ×3",     note: "M2 × 4" },
  { id: "screen",  name: "Vari-angle LCD",     note: "Hinge, left side" },
  { id: "evf",     name: "Viewfinder module",  note: "OLED + eyepiece" },
  { id: "dials",   name: "Mode dial & shutter", note: "Top plate" },
  { id: "lens",    name: "Lens",               note: "Align dots, twist" },
  { id: "flash",   name: "Flash",              note: "Slide into shoe" },
];

// Where each callout sits relative to its part on screen (px), desktop / phone
const LABEL_OFFSET = {
  lens:   [[40, 50], [-30, 60]],
  screen: [[50, 40], [-40, 50]],
  evf:    [[60, -40], [10, -60]],
  flash:  [[-230, -40], [-140, -40]],
  battery: [[-230, -30], [-150, 20]],
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
  renderer.toneMappingExposure = 1.1;
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
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(6, 3, -8);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.4;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------------------------------------------------------------- materials */
  const M = materials();

  /* ---------------------------------------------------------------- model */
  const pivot = new THREE.Group();          // rotates with cursor / drag
  const model = new THREE.Group();          // offset so the exploded model is centered
  model.position.set(-0.45, -0.35, -1.6);
  pivot.add(model);
  scene.add(pivot);

  const partsRoot = new THREE.Group();      // everything raycastable
  const linesRoot = new THREE.Group();      // assembly lines
  model.add(partsRoot, linesRoot);

  // A mover slides between home (assembled, p = 0) and home + offset (exploded, p = 1)
  const movers = [];
  const addMover = (obj, home, offset, { delay = 0, step = null } = {}) => {
    obj.position.copy(home);
    obj.userData.step = step;
    partsRoot.add(obj);
    const g = new THREE.BufferGeometry().setFromPoints([home, home.clone().add(offset)]);
    const line = new THREE.Line(g, M.line.clone());
    line.computeLineDistances();
    linesRoot.add(line);
    const m = { obj, home: home.clone(), offset: offset.clone(), delay, step, p: 0, target: 0, at: 0, pending: 0, line };
    movers.push(m);
    return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* Body ---------------------------------------------------------------
     Units ≈ 29 mm. Lens axis at x 0.35, y -0.1. +z is the front, +x the camera's left. */
  const body = new THREE.Group();
  body.userData.kind = "body";
  body.add(mesh(new RoundedBoxGeometry(4.2, 2.3, 1.3, 5, 0.16), M.shell));
  const topCap = mesh(new RoundedBoxGeometry(4.22, 0.34, 1.32, 4, 0.12), M.gunmetal); topCap.position.y = 1.0; body.add(topCap);
  // grip (camera's right, so -x) and rear thumb rest
  const grip = mesh(new RoundedBoxGeometry(1.08, 2.26, 1.0, 6, 0.34), M.leather); grip.position.set(-1.56, -0.01, 0.82); body.add(grip);
  const thumb = mesh(new RoundedBoxGeometry(0.8, 0.55, 0.22, 4, 0.08), M.rubber); thumb.position.set(-1.6, 0.72, -0.7); body.add(thumb);
  // E-mount: bright flange, black throat, sensor
  const flangeRing = mesh(annulus(0.8, 1.0, 0.08), M.aluBright); flangeRing.rotation.x = Math.PI / 2; flangeRing.position.set(0.35, -0.1, 0.68); body.add(flangeRing);
  const throat = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.42, 72, 1, true), M.blackInside); throat.rotation.x = Math.PI / 2; throat.position.set(0.35, -0.1, 0.45); body.add(throat);
  const sensorFrame = mesh(new THREE.BoxGeometry(1.0, 0.72, 0.04), M.steel); sensorFrame.position.set(0.35, -0.1, 0.25); body.add(sensorFrame);
  const sensor = mesh(new THREE.PlaneGeometry(0.81, 0.54), M.sensor); sensor.position.set(0.35, -0.1, 0.275); body.add(sensor);
  for (let k = 0; k < 3; k++) {   // bayonet tabs
    const tab = mesh(new THREE.BoxGeometry(0.34, 0.06, 0.05), M.aluBright);
    const a = (k / 3) * Math.PI * 2 + 0.4;
    tab.position.set(0.35 + Math.cos(a) * 0.76, -0.1 + Math.sin(a) * 0.76, 0.64);
    tab.rotation.z = a + Math.PI / 2;
    body.add(tab);
  }
  const release = mesh(cyl(0.11, 0.08, 32), M.steel); release.rotation.x = Math.PI / 2; release.position.set(-0.78, -0.5, 0.68); body.add(release);
  const afLamp = mesh(cyl(0.08, 0.05, 24), M.lamp); afLamp.rotation.x = Math.PI / 2; afLamp.position.set(-0.95, 0.72, 0.67); body.add(afLamp);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), M.badge); badge.position.set(1.55, 0.78, 0.656); body.add(badge);
  // top: hot shoe, C1 and record buttons, engraved name
  const shoe = mesh(new THREE.BoxGeometry(0.66, 0.04, 0.6), M.steel); shoe.position.set(0.35, 1.18, -0.05); body.add(shoe);
  for (const sx of [-1, 1]) { const rail = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), M.steel); rail.position.set(0.35 + sx * 0.3, 1.21, -0.05); body.add(rail); }
  const c1 = mesh(cyl(0.09, 0.06, 32), M.steel); c1.position.set(-0.98, 1.19, -0.3); body.add(c1);
  const rec = mesh(cyl(0.09, 0.06, 32), M.black); rec.position.set(-0.98, 1.19, 0.05); body.add(rec);
  const recRing = mesh(annulus(0.09, 0.115, 0.05), M.red); recRing.position.set(-0.98, 1.19, 0.05); body.add(recRing);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.16), M.engraving); plate.rotation.x = -Math.PI / 2; plate.position.set(1.25, 1.172, 0.35); body.add(plate);
  // rear: control wheel, buttons
  const wheel = mesh(annulus(0.2, 0.34, 0.06), M.aluBright); wheel.rotation.x = Math.PI / 2; wheel.position.set(-1.55, -0.35, -0.67); body.add(wheel);
  const ok = mesh(cyl(0.16, 0.05, 32), M.black); ok.rotation.x = Math.PI / 2; ok.position.set(-1.55, -0.35, -0.68); body.add(ok);
  [[-1.25, 0.25], [-1.85, 0.25], [-1.25, -0.9], [-1.85, -0.9]].forEach(([x, y]) => {
    const b = mesh(cyl(0.07, 0.05, 24), M.black); b.rotation.x = Math.PI / 2; b.position.set(x, y, -0.67); body.add(b);
  });
  // strap lugs, tripod socket
  for (const sx of [-1, 1]) { const lug = mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 24), M.steel); lug.rotation.y = Math.PI / 2; lug.position.set(sx * 2.12, 0.78, 0); body.add(lug); }
  const socket = mesh(annulus(0.05, 0.14, 0.03), M.steel); socket.position.set(0.35, -1.16, 0); body.add(socket);
  addMover(body, V(0, 0, 0), V(0, 0, 0));

  /* 05 Battery → Purpose: drops out of the grip; its charge meter fills on hover */
  const battery = sectionGroup("battery");
  battery.add(mesh(new RoundedBoxGeometry(0.72, 1.6, 0.86, 3, 0.05), M.battery));
  const cells = [0, 1, 2, 3, 4].map((i) => {
    const c = mesh(new THREE.BoxGeometry(0.42, 0.15, 0.02), M.cell.clone());
    c.position.set(0, -0.62 + i * 0.2, 0.435);
    battery.add(c);
    return c;
  });
  const contacts = mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), M.gold); contacts.position.y = 0.81; battery.add(contacts);
  battery.userData.anchor = V(0, -0.2, 0.43);
  const batteryMover = addMover(battery, V(-1.56, -0.3, 0.75), V(-1.5, -2.4, -1.0), { delay: 0.05, step: "battery" });
  const door = mesh(new THREE.BoxGeometry(0.98, 0.05, 1.0), M.shell); door.userData.step = "battery";
  addMover(door, V(-1.56, -1.17, 0.78), V(-0.7, -1.2, -0.5), { delay: 0.0, step: "battery" });

  /* SD card: slides out of the side slot */
  const card = mesh(new THREE.BoxGeometry(0.06, 0.83, 1.1), M.card);
  addMover(card, V(-1.95, -0.25, 0.1), V(-1.9, 0, 0), { delay: 0.1, step: "card" });

  /* Base screws */
  [[1.5, 0.3], [-0.9, 0.35], [1.5, -0.35]].forEach(([x, z], i) => {
    addMover(screw(M), V(x, -1.17, z), V(0, -1.6, 0), { delay: 0.12 + i * 0.04, step: "screws" });
  });

  /* 02 Vari-angle LCD → Photography. Pivot at the hinge on the camera's left (+x). */
  const screen = sectionGroup("screen");
  const panel = mesh(new RoundedBoxGeometry(2.75, 1.62, 0.14, 3, 0.06), M.shell); panel.position.x = -1.38;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(2.52, 1.42), M.display); display.rotation.y = Math.PI; display.position.set(-1.38, 0, -0.072);
  const hinge = mesh(cyl(0.06, 1.2, 24), M.steel);
  screen.add(panel, display, hinge);
  screen.userData.anchor = V(-1.38, 0.5, 0);
  const screenMover = addMover(screen, V(2.0, -0.3, -0.73), V(0.35, -0.1, -0.5), { delay: 0.15, step: "screen" });

  /* 03 Viewfinder module → About: eyecup, eyepiece optics, OLED panel strung along the axis */
  const evf = sectionGroup("evf");
  const eyecup = mesh(new RoundedBoxGeometry(0.95, 0.62, 0.32, 4, 0.1), M.rubber); eyecup.position.z = -0.16;
  const eyeGlass = mesh(new THREE.PlaneGeometry(0.5, 0.34), M.darkGlass); eyeGlass.rotation.y = Math.PI; eyeGlass.position.z = -0.325;
  const eyeLens = mesh(lensElement(0.24, 0.07, 0.02), M.glass); eyeLens.rotation.x = Math.PI / 2;
  const oled = new THREE.Group();
  const oledFrame = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.06), M.steel);
  const oledFace = mesh(new THREE.PlaneGeometry(0.4, 0.28), M.oled); oledFace.rotation.y = Math.PI; oledFace.position.z = -0.031;
  oled.add(oledFrame, oledFace);
  evf.add(eyecup, eyeGlass, eyeLens, oled);
  evf.userData.anchor = V(0.4, 0.3, -0.2);
  const evfMover = addMover(evf, V(1.45, 0.8, -0.66), V(0.25, 0.35, -1.5), { delay: 0.2, step: "evf" });

  /* Mode dial + shutter assembly: lift off the top plate */
  const modeDial = knurledDial(0.3, 0.2, M.black, M.aluBright);
  addMover(modeDial, V(-0.45, 1.27, -0.2), V(0, 0.85, 0), { delay: 0.1, step: "dials" });
  const shutter = new THREE.Group();
  const collar = mesh(annulus(0.13, 0.3, 0.07), M.gunmetal);
  const lever = mesh(new THREE.BoxGeometry(0.22, 0.06, 0.1), M.gunmetal); lever.position.set(0.32, 0, 0.12); lever.rotation.y = -0.6;
  const button = mesh(cyl(0.12, 0.1, 40), M.aluBright); button.position.y = 0.06;
  const frontDial = knurl(0.28, 0.08, 40, M.black); frontDial.position.set(0.2, -0.12, -0.38);
  shutter.add(collar, lever, button, frontDial);
  addMover(shutter, V(-1.56, 1.2, 0.95), V(0, 1.15, 0.1), { delay: 0.15, step: "dials" });

  /* 01 Lens → Film: built along +y, then pointed along +z */
  const lens = sectionGroup("lens");
  const lensAxis = new THREE.Group(); lensAxis.rotation.x = Math.PI / 2; lens.add(lensAxis);
  const lFlange = mesh(cyl(0.98, 0.1), M.aluBright); lFlange.position.y = 0.05;
  const lBase = mesh(cyl(1.0, 0.36), M.black); lBase.position.y = 0.28;
  const focusRing = knurl(1.03, 0.32, 96, M.rubber); focusRing.position.y = 0.62;
  const lMid = mesh(cyl(1.0, 0.12), M.black); lMid.position.y = 0.84;
  const zoomRing = knurl(1.06, 0.7, 110, M.rubber); zoomRing.position.y = 1.26;
  const lFront = mesh(cyl(1.0, 0.36), M.black); lFront.position.y = 1.79;
  const frontRing = new THREE.Group();
  frontRing.add(mesh(annulus(0.7, 1.0, 0.12), M.black));
  const ringText = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.98, 96), M.lensText);
  ringText.rotation.x = -Math.PI / 2; ringText.position.y = 0.061; frontRing.add(ringText);
  frontRing.position.y = 2.03;
  const mountDot = mesh(new THREE.SphereGeometry(0.04, 12, 12), M.white); mountDot.position.set(0, 0.28, -1.0);
  lensAxis.add(lFlange, lBase, focusRing, lMid, zoomRing, lFront, frontRing, mountDot);
  const elements = [
    { r: 0.62, s: 0.16, e: 0.04, y: 0.5, to: 2.6 },
    { r: 0.66, s: 0.13, e: 0.03, y: 1.1, to: 3.1 },
    { r: 0.7, s: 0.22, e: 0.04, y: 1.9, to: 3.7 },
  ].map((d) => {
    const el = mesh(lensElement(d.r, d.s, d.e), M.glass);
    el.position.y = d.y;
    lensAxis.add(el);
    return { el, ...d };
  });
  lens.userData.anchor = V(0.95, 0.4, 2.0);
  const lensMover = addMover(lens, V(0.35, -0.1, 0.68), V(0, 0, 2.0), { delay: 0.25, step: "lens" });

  /* 04 Flash (speedlight on the multi-interface shoe) → Photo Booth */
  const flash = sectionGroup("flash");
  const foot = mesh(new THREE.BoxGeometry(0.56, 0.08, 0.52), M.steel); foot.position.y = 0.04;
  const lockWheel = mesh(cyl(0.3, 0.07, 40), M.black); lockWheel.position.y = 0.12;
  const fBase = mesh(new RoundedBoxGeometry(1.05, 1.1, 0.78, 3, 0.07), M.shell); fBase.position.y = 0.72;
  const fLcd = mesh(new THREE.PlaneGeometry(0.6, 0.3), M.oled); fLcd.rotation.y = Math.PI; fLcd.position.set(0, 0.85, -0.392);
  const neck = mesh(new THREE.BoxGeometry(0.82, 0.14, 0.6), M.black); neck.position.y = 1.33;
  const head = new THREE.Group(); head.position.y = 1.4;
  const fHead = mesh(new RoundedBoxGeometry(1.25, 0.72, 0.95, 3, 0.07), M.shell); fHead.position.y = 0.36;
  const fresnel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), M.fresnel); fresnel.position.set(0, 0.36, 0.477);
  head.add(fHead, fresnel);
  const fBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.14), M.flashBadge); fBadge.position.set(0, 0.45, 0.392);
  flash.add(foot, lockWheel, fBase, fLcd, neck, head, fBadge);
  flash.userData.anchor = V(-0.5, 1.9, 0);
  const flashMover = addMover(flash, V(0.35, 1.21, -0.05), V(0, 1.85, 0), { delay: 0.3, step: "flash" });

  // Optical axis
  const axisGeo = new THREE.BufferGeometry().setFromPoints([V(0.35, -0.1, -2.2), V(0.35, -0.1, 7.2)]);
  const axisLine = new THREE.Line(axisGeo, M.axis); axisLine.computeLineDistances();
  linesRoot.add(axisLine);

  partsRoot.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  partsRoot.traverse((o) => { if (o.isMesh && (o.material === M.glass || o.material === M.display)) o.castShadow = false; });

  const sections = { lens, screen, evf, flash, battery };
  const sectionMover = { lens: lensMover, screen: screenMover, evf: evfMover, flash: flashMover, battery: batteryMover };

  /* ---------------------------------------------------------------- overlay: callouts, build tags, checklist */
  const overlay = document.createElement("div");
  overlay.className = "camera-overlay";
  overlay.innerHTML = `<svg class="camera-leaders" aria-hidden="true"></svg>` +
    Object.entries(SECTIONS).map(([id, s]) => `
      <a class="camera-callout" href="${s.href}" data-id="${id}" data-cursor-label="Open"${s.booth ? " data-booth-open" : ""}>
        <span class="label">${s.num} — ${s.part}</span>
        <strong>${s.title}</strong>
        <span class="label">${s.blurb}</span>
      </a>`).join("") +
    STEPS.map((s, i) => `
      <button class="camera-tag" type="button" data-step="${s.id}" data-cursor-label="Install">
        <span class="camera-tag-num">${String(i + 1).padStart(2, "0")}</span>${s.name}
      </button>`).join("");
  stage.append(overlay);
  const leaders = overlay.querySelector(".camera-leaders");
  const callouts = Object.fromEntries([...overlay.querySelectorAll(".camera-callout")].map((a) => [a.dataset.id, a]));
  const tags = Object.fromEntries([...overlay.querySelectorAll(".camera-tag")].map((b) => [b.dataset.step, b]));

  Object.entries(callouts).forEach(([id, a]) => {
    a.addEventListener("pointerenter", () => (hovered = id));
    a.addEventListener("pointerleave", () => (hovered = null));
    a.addEventListener("focus", () => (hovered = id));
    a.addEventListener("blur", () => (hovered = null));
  });
  Object.entries(tags).forEach(([id, b]) => {
    b.addEventListener("click", () => install(id));
    b.addEventListener("pointerenter", () => (hoverStep = id));
    b.addEventListener("pointerleave", () => (hoverStep = null));
  });

  // Build checklist (replaces the title block while building)
  const panelEl = document.createElement("div");
  panelEl.className = "camera-steps";
  panelEl.setAttribute("aria-live", "polite");
  stage.append(panelEl);

  /* ---------------------------------------------------------------- state */
  const hoverK = { lens: 0, screen: 0, evf: 0, flash: 0, battery: 0 };
  let hovered = null;          // section id under pointer / focused
  let hoverStep = null;        // build step under pointer
  let overModel = false;
  let mode = "explore";        // "explore" | "build"
  let exploded = true;
  const installed = new Set();
  let flashPulse = 0;
  let yaw = -0.62, pitch = 0.2, dragYaw = 0;
  let tiltX = 0, tiltY = 0;

  const toggleBtn = stage.querySelector("[data-camera-toggle]");
  const buildBtn = stage.querySelector("[data-camera-build]");
  const hintEl = stage.querySelector("[data-camera-hint]");
  const figEl = stage.querySelector(".camera-fig");

  function setTargets(filter, target, stagger = true) {
    const now = performance.now();
    for (const m of movers) {
      if (!filter(m)) continue;
      m.pending = target;
      m.at = now + (reduceMotion || !stagger ? 0 : m.delay * (target ? 900 : 500));
    }
  }

  const setExploded = (v) => {
    exploded = v;
    setTargets(() => true, v ? 1 : 0);
    stage.classList.toggle("is-exploded", v);
    if (toggleBtn) toggleBtn.textContent = v ? "Assemble" : "Explode";
    if (hintEl) hintEl.textContent = v ? "Click the camera to close it · drag to rotate" : "Click the camera to open it · drag to rotate";
    if (figEl) figEl.textContent = v ? "Fig. 1 — Exploded assembly" : "Fig. 1 — General assembly";
  };

  function renderSteps() {
    const done = installed.size;
    const next = STEPS.find((s) => !installed.has(s.id));
    panelEl.innerHTML = `
      <p class="label">Assembly · ${done}/${STEPS.length}</p>
      <ol>${STEPS.map((s, i) => `
        <li class="${installed.has(s.id) ? "is-done" : s === next ? "is-next" : ""}">
          <span>${installed.has(s.id) ? "✓" : String(i + 1).padStart(2, "0")}</span>${s.name}<em>${s.note}</em>
        </li>`).join("")}
      </ol>
      <p class="camera-steps-next label">${next ? `Next: ${next.name}` : "Complete"}</p>`;
    Object.entries(tags).forEach(([id, b]) => {
      b.hidden = installed.has(id);
      b.classList.toggle("is-next", next?.id === id);
    });
  }

  function startBuild() {
    mode = "build";
    installed.clear();
    stage.classList.add("is-building");
    stage.classList.remove("is-complete");
    setTargets((m) => m.step, 1);
    exploded = true;
    if (buildBtn) buildBtn.textContent = "Exit build";
    if (toggleBtn) toggleBtn.hidden = true;
    renderSteps();
  }

  function endBuild(complete) {
    mode = "explore";
    stage.classList.remove("is-building");
    if (buildBtn) buildBtn.textContent = "Build it";
    if (toggleBtn) toggleBtn.hidden = false;
    if (complete) {
      setExploded(false);
      stage.classList.add("is-complete");
      flashPulse = 1;
      setTimeout(() => stage.classList.remove("is-complete"), 4200);
    } else {
      setExploded(true);
    }
  }

  function install(step) {
    if (mode !== "build" || installed.has(step)) return;
    installed.add(step);
    setTargets((m) => m.step === step, 0);
    renderSteps();
    if (installed.size === STEPS.length) setTimeout(() => endBuild(true), reduceMotion ? 0 : 1100);
  }

  toggleBtn?.addEventListener("click", () => setExploded(!exploded));
  buildBtn?.addEventListener("click", () => (mode === "build" ? endBuild(false) : startBuild()));

  // Start assembled; the first click opens it up
  setExploded(false);
  movers.forEach((m) => { m.p = m.target = m.pending = 0; m.at = 0; });

  /* ---------------------------------------------------------------- pointer */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(partsRoot, true)[0];
    if (!hit) return {};
    let o = hit.object, section = null, step = null;
    while (o && o !== partsRoot) {
      section ||= o.userData.section || null;
      step ||= o.userData.step || null;
      o = o.parent;
    }
    return { hit: true, section, step };
  }

  function cursorFor(p) {
    if (!p.hit) return "";
    if (mode === "build") return p.step && !installed.has(p.step) ? "Install" : "";
    return exploded ? "Close" : "Open";
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
    overModel = !!p.hit;
    hovered = mode === "explore" ? p.section : null;
    hoverStep = mode === "build" && p.step && !installed.has(p.step) ? p.step : null;
    const label = cursorFor(p);
    setCursorLabel(label, !!label);
  });
  canvas.addEventListener("pointerleave", () => { hovered = hoverStep = null; overModel = false; tiltX = tiltY = 0; setCursorLabel(""); });
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, yaw: dragYaw, dragged: false }; });
  addEventListener("pointerup", (e) => {
    if (!down) return;
    const wasDrag = down.dragged;
    down = null;
    if (wasDrag || e.target !== canvas) return;
    const p = pick(e);
    if (!p.hit) return;
    if (mode === "build") { if (p.step) install(p.step); return; }
    setExploded(!exploded);
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
  let zoomT = 0;

  function loop() {
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const time = clock.elapsedTime;
    const now = performance.now();

    // per-part progress (wall-clock based so slow frame rates still finish in ~1.4s)
    let sum = 0, count = 0;
    for (const m of movers) {
      if (m.at && now >= m.at) { m.target = m.pending; m.at = 0; }
      m.p = reduceMotion ? m.target : m.p + Math.sign(m.target - m.p) * Math.min(Math.abs(m.target - m.p), Math.min(raw, 0.5) / 1.4);
      const e = ease(m.p);
      m.obj.position.copy(m.home).addScaledVector(m.offset, e);
      m.line.material.opacity = 0.9 * e;
      if (m.step) { sum += m.p; count++; }
    }
    const tAll = sum / count;
    axisLine.material.opacity = 0.9 * ease(lensMover.p);

    // hover easing
    for (const id in hoverK) hoverK[id] += ((hovered === id ? 1 : 0) - hoverK[id]) * Math.min(1, dt * 8);

    // hover: lift each section a little further along its explode direction
    for (const id in sections) {
      const m = sectionMover[id];
      tmp.copy(m.offset).normalize().multiplyScalar(0.25 * hoverK[id] * ease(m.p));
      sections[id].position.add(tmp);
    }
    // build hover: nudge the hovered part toward its slot
    if (hoverStep) for (const m of movers) if (m.step === hoverStep) m.obj.position.addScaledVector(m.offset, -0.06);

    // lens: elements fly out of the barrel; hover spreads them; zoom ring turns
    const le = ease(lensMover.p);
    for (const e of elements) e.el.position.y = e.y + (e.to - e.y) * le + (e.to - 2.2) * 0.35 * hoverK.lens;
    frontRing.position.y = 2.03 + 0.4 * le + 0.15 * hoverK.lens;
    zoomRing.rotation.y += dt * 1.5 * hoverK.lens;

    // LCD swings out on its hinge
    screen.rotation.y = -1.9 * ease(screenMover.p) - 0.3 * hoverK.screen;
    M.display.emissiveIntensity = 0.85 + 0.5 * hoverK.screen;

    // viewfinder: optics strung out along the eye axis
    const ve = ease(evfMover.p);
    eyeLens.position.z = 0.05 + 0.45 * ve + 0.15 * hoverK.evf;
    oled.position.z = 0.15 + 0.95 * ve + 0.3 * hoverK.evf;

    // flash: head tilts up on hover, fires once when hover starts (and on click / completion)
    head.rotation.x = -0.5 * hoverK.flash;
    if (hovered === "flash" && hoverK.flash < 0.15) flashPulse = 1;
    flashPulse = Math.max(0, flashPulse - dt * 2.2);
    M.fresnel.emissiveIntensity = flashPulse * 3;

    // battery: charge cells light up one by one on hover (and stay lit once assembled)
    const charge = Math.max(hoverK.battery, 1 - ease(batteryMover.p));
    cells.forEach((c, i) => {
      const on = THREE.MathUtils.clamp(charge * 5 - i, 0, 1);
      c.material.emissiveIntensity = 0.15 + 1.6 * on + (hovered === "battery" ? 0.3 * Math.sin(time * 6 - i) * on : 0);
    });

    // mode dial idles round
    if (!reduceMotion) modeDial.rotation.y += dt * 0.3;

    // view: cursor tilt + drag, zoom out as it explodes
    zoomT += (tAll - zoomT) * Math.min(1, dt * 3);
    const ty = yaw + dragYaw + (reduceMotion ? 0 : tiltX * 0.25);
    const tp = pitch + (reduceMotion ? 0 : tiltY * 0.08);
    pivot.rotation.y += (ty - pivot.rotation.y) * Math.min(1, dt * 4);
    pivot.rotation.x += (tp - pivot.rotation.x) * Math.min(1, dt * 4);
    // make room for the checklist on the right while building
    const shiftX = mode === "build" && !isPhone() ? -1.3 : 0;
    pivot.position.x += (shiftX - pivot.position.x) * Math.min(1, dt * 3);
    pivot.position.y = -0.55 * (1 - ease(zoomT));   // assembled: sit lower so the flash isn't clipped
    const fit = fitDistance(isPhone() ? 5.1 : 4.4) * (0.58 + 0.42 * ease(zoomT));
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

  function project(obj, anchor) {
    tmp.copy(anchor || obj.userData.anchor || V(0, 0, 0));
    obj.localToWorld(tmp);
    tmp.project(camera);
    return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H];
  }

  function placeLabels() {
    const phone = isPhone() ? 1 : 0;
    const top = 44, bottom = H - 60;
    let boxes = [];

    const showCallouts = mode === "explore" && Object.values(sectionMover).every((m) => m.p > 0.92);
    overlay.classList.toggle("is-visible", showCallouts || mode === "build");
    overlay.classList.toggle("is-build", mode === "build");
    if (showCallouts) {
      boxes = Object.keys(sections).map((id) => {
        const [ax, ay] = project(sections[id]);
        const [ox, oy] = LABEL_OFFSET[id][phone];
        const el = callouts[id];
        return { el, active: hovered === id, ax, ay, lw: el.offsetWidth, lh: el.offsetHeight, ox, oy };
      });
    } else if (mode === "build") {
      boxes = STEPS.filter((s) => !installed.has(s.id)).map((s) => {
        const m = movers.find((mv) => mv.step === s.id);
        const [ax, ay] = project(m.obj, m.obj.userData.anchor);
        const el = tags[s.id];
        return { el, active: hoverStep === s.id, ax, ay, lw: el.offsetWidth, lh: el.offsetHeight, ox: 16, oy: -14 };
      });
    }
    if (!boxes.length) { leaders.innerHTML = ""; return; }
    boxes.forEach((b) => {
      b.lx = THREE.MathUtils.clamp(b.ax + b.ox, 8, W - b.lw - 8);
      b.ly = THREE.MathUtils.clamp(b.ay + b.oy, top, bottom - b.lh);
    });

    // nudge labels apart vertically so they never cover each other
    boxes.sort((a, b) => a.ly - b.ly);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const overlapX = a.lx < b.lx + b.lw + 4 && b.lx < a.lx + a.lw + 4;
          const overlapY = a.ly < b.ly + b.lh + 6 && b.ly < a.ly + a.lh + 6;
          if (overlapX && overlapY) b.ly = a.ly + a.lh + 6;
        }
      }
      const last = boxes[boxes.length - 1];
      const over = last.ly + last.lh - bottom;
      if (over > 0) boxes.forEach((bx) => (bx.ly = Math.max(top, bx.ly - over)));
    }

    let paths = "";
    for (const { el, active, ax, ay, lw, lh, lx, ly } of boxes) {
      el.style.transform = `translate(${lx}px, ${ly}px)`;
      el.classList.toggle("is-active", active);
      const ex = ax < lx ? lx : ax > lx + lw ? lx + lw : ax;
      const ey = ay < ly ? ly : ay > ly + lh ? ly + lh : ly + lh / 2;
      paths += `<circle cx="${ax}" cy="${ay}" r="3"/><polyline points="${ax},${ay} ${ex},${ey}"${active ? ' class="is-active"' : ""}/>`;
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
  g.userData.step = id;
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

// Ridged ring (focus/zoom grip, dial edge) around the y axis
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
  const cap = mesh(cyl(r * 0.72, 0.03), capMat);
  cap.position.y = h / 2 + 0.01;
  const mark = mesh(new THREE.BoxGeometry(0.03, 0.02, r * 0.5), capMat);
  mark.position.set(0, h / 2, r * 0.5);
  g.add(cap, mark);
  return g;
}

function screw(M) {
  const g = new THREE.Group();
  const head = mesh(cyl(0.09, 0.05, 32), M.aluBright); head.position.y = -0.03;
  const slot = mesh(new THREE.BoxGeometry(0.13, 0.02, 0.025), M.black); slot.position.y = -0.055;
  const shaft = mesh(cyl(0.04, 0.26, 16), M.steel); shaft.position.y = 0.13;
  g.add(head, slot, shaft);
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
  const sans = (px, weight = 600) => `${weight} ${px}px "Inter", system-ui, sans-serif`;

  const noise = (repeat, dots, rMin, rMax) => {
    const t = tex(256, 256, (g, w, h) => {
      g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < dots; i++) {
        const v = 90 + Math.random() * 90 | 0;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rMin + Math.random() * (rMax - rMin), 0, 7); g.fill();
      }
    });
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    return t;
  };
  const grain = noise([3, 3], 5000, 0.8, 2.6);     // grip leatherette
  const satin = noise([6, 4], 9000, 0.4, 0.9);     // fine body texture

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

  const engraving = tex(1024, 110, (g, w, h) => {
    g.fillStyle = "#c9ccd0"; g.font = mono(50); g.textBaseline = "middle";
    g.fillText("HAILEY PERNG", 8, h / 2);
    g.font = mono(32, 400); g.textAlign = "right";
    g.fillText("HP-001 · NO. 0426", w - 8, h / 2 + 3);
  });

  const badge = tex(512, 140, (g, w, h) => {
    g.fillStyle = "#d6d8dc"; g.textBaseline = "middle"; g.textAlign = "right";
    g.font = sans(96, 500); g.fillText("α6700", w - 10, h / 2 + 4);
  });

  const flashBadge = tex(512, 100, (g, w, h) => {
    g.fillStyle = "#bfc2c6"; g.textBaseline = "middle"; g.textAlign = "center";
    g.font = mono(54); g.fillText("HP-F60  GN60", w / 2, h / 2);
  });

  const lensText = tex(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#e8e9eb"; g.font = mono(40); g.textAlign = "center"; g.textBaseline = "middle";
    const txt = "E 18–135 mm  F3.5–5.6  OSS  ·  Ø55  ·  HAILEY PERNG  ·  ";
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

  // Rear LCD: live-view style UI over a soft portrait silhouette
  const displayTex = tex(1024, 576, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#3b3d42"); bg.addColorStop(1, "#141518");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {   // bokeh
      g.fillStyle = `rgba(230,230,235,${0.04 + Math.random() * 0.08})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.7, 20 + Math.random() * 60, 0, 7); g.fill();
    }
    g.fillStyle = "#8d9096";
    g.beginPath(); g.ellipse(w * 0.5, h * 0.42, 78, 96, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(w * 0.5, h * 1.02, 230, 210, 0, Math.PI, 0); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = 1.5;
    [1, 2].forEach((k) => { g.beginPath(); g.moveTo((w * k) / 3, 0); g.lineTo((w * k) / 3, h); g.moveTo(0, (h * k) / 3); g.lineTo(w, (h * k) / 3); g.stroke(); });
    g.strokeStyle = "#ffffff"; g.lineWidth = 4;
    const fx = w * 0.5 - 70, fy = h * 0.42 - 70, fs = 140, c = 28;
    [[fx, fy, 1, 1], [fx + fs, fy, -1, 1], [fx, fy + fs, 1, -1], [fx + fs, fy + fs, -1, -1]].forEach(([x, y, sx, sy]) => {
      g.beginPath(); g.moveTo(x + sx * c, y); g.lineTo(x, y); g.lineTo(x, y + sy * c); g.stroke();
    });
    g.fillStyle = "#ffffff"; g.font = mono(30); g.textBaseline = "top";
    g.fillText("P    1/250   F2.8   ISO 400   ±0.0", 28, 22);
    g.textBaseline = "bottom";
    g.fillText("4K 24p   STBY", 28, h - 22);
    g.textAlign = "right"; g.fillText("■■■ 86%", w - 28, h - 22);
    g.fillStyle = "#e5483f"; g.beginPath(); g.arc(w - 220, h - 40, 9, 0, 7); g.fill();
  });

  const oledTex = tex(256, 180, (g, w, h) => {
    g.fillStyle = "#0b0c0e"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#9fd0ff"; g.lineWidth = 3; g.strokeRect(20, 20, w - 40, h - 40);
    g.fillStyle = "#9fd0ff"; g.font = mono(22); g.fillText("1/250 F2.8", 30, h - 34);
  });

  const batteryTex = tex(512, 512, (g, w, h) => {
    g.fillStyle = "#2a2b2f"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#d6d8dc"; g.fillRect(40, 60, w - 80, 120);
    g.fillStyle = "#1a1b1e"; g.font = mono(54); g.textBaseline = "middle";
    g.fillText("Li-ion  7.2V", 60, 120);
    g.fillStyle = "#c9ccd0"; g.font = mono(34, 400);
    g.fillText("16.4Wh  2280mAh", 50, 260);
    g.fillText("HP-FZ100", 50, 320);
  });

  const cardTex = tex(256, 340, (g, w, h) => {
    g.fillStyle = "#16171a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#d6d8dc"; g.fillRect(0, h * 0.42, w, h * 0.22);
    g.fillStyle = "#16171a"; g.font = mono(40); g.textBaseline = "middle"; g.fillText("64 GB", 24, h * 0.53);
    g.fillStyle = "#c9a84a"; for (let i = 0; i < 8; i++) g.fillRect(16 + i * 28, 10, 18, 40);
    g.fillStyle = "#c9ccd0"; g.font = mono(26); g.fillText("V60  U3", 24, h * 0.85);
  });

  const alu = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.34, roughnessMap: brushed });
  return {
    alu,
    aluBright: new THREE.MeshStandardMaterial({ color: 0xeceef0, metalness: 1, roughness: 0.2, roughnessMap: brushed }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 1, roughness: 0.42 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x2c2e32, metalness: 0.7, roughness: 0.45, bumpMap: satin, bumpScale: 0.3 }),
    shell: new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.15, roughness: 0.62, bumpMap: satin, bumpScale: 0.4 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151517, metalness: 0.3, roughness: 0.5 }),
    blackInside: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, metalness: 0, roughness: 0.95, side: THREE.DoubleSide }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0, roughness: 0.92 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x121214, metalness: 0, roughness: 0.85, bumpMap: grain, bumpScale: 1.2 }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc8352d, roughness: 0.4 }),
    lamp: new THREE.MeshPhysicalMaterial({ color: 0x3a2a22, roughness: 0.1, clearcoat: 1 }),
    sensor: new THREE.MeshPhysicalMaterial({ color: 0x24303a, metalness: 0.6, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 }),
    darkGlass: new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, metalness: 0.2, roughness: 0.05, clearcoat: 1 }),
    // Coated optical glass: reflective + see-through, with a faint anti-reflective sheen
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9fb1c2, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.45,
      clearcoat: 1, clearcoatRoughness: 0, ior: 1.52, specularIntensity: 1,
      iridescence: 0.6, iridescenceIOR: 1.35, envMapIntensity: 2.2, depthWrite: false,
    }),
    display: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: displayTex, emissiveIntensity: 0.85, roughness: 0.15, metalness: 0 }),
    oled: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: oledTex, emissiveIntensity: 1, roughness: 0.2 }),
    engraving: new THREE.MeshStandardMaterial({ map: engraving, transparent: true, metalness: 0.4, roughness: 0.5 }),
    badge: new THREE.MeshStandardMaterial({ map: badge, transparent: true, metalness: 0.8, roughness: 0.3 }),
    flashBadge: new THREE.MeshStandardMaterial({ map: flashBadge, transparent: true, metalness: 0.4, roughness: 0.5 }),
    lensText: new THREE.MeshStandardMaterial({ map: lensText, transparent: true, metalness: 0.2, roughness: 0.6 }),
    fresnel: new THREE.MeshStandardMaterial({ map: fresnelTex, roughness: 0.25, emissive: 0xffffff, emissiveIntensity: 0 }),
    battery: new THREE.MeshStandardMaterial({ map: batteryTex, metalness: 0.2, roughness: 0.55 }),
    card: new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.5 }),
    cell: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xeef3f6, emissiveIntensity: 0.15, roughness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a84a, metalness: 1, roughness: 0.3 }),
    line: new THREE.LineDashedMaterial({ color: 0x8a8f96, dashSize: 0.14, gapSize: 0.08, transparent: true, opacity: 0 }),
    axis: new THREE.LineDashedMaterial({ color: 0xa9adb3, dashSize: 0.35, gapSize: 0.1, transparent: true, opacity: 0 }),
  };
}
