import * as THREE from "three";
import type { SkinViewer } from "skinview3d";
import { COSMETICS, type CosmeticKind } from "./cosmetics";

/**
 * Wings, headwear, trails and pets for the launcher's skinview3d preview, built from plain three.js shapes
 * in the item's color. Look-alikes of the mod's models, not copies: the real ones render in game.
 * skinview3d units are skin pixels: head spans y 0..8, body y -12..0 (back face at z -2), feet at y -24.
 */
export type Worn = Partial<Record<Exclude<CosmeticKind, "cape">, string>>;

type Tick = (t: number) => void;

const color = (kind: CosmeticKind, id: string) => new THREE.Color(COSMETICS[kind].find((i) => i.id === id)?.color ?? "#ffffff");

function mat(c: THREE.Color, opts: { glow?: number; opacity?: number } = {}) {
  return new THREE.MeshLambertMaterial({
    color: c,
    emissive: c.clone().multiplyScalar(opts.glow ?? 0.15),
    side: THREE.DoubleSide,
    transparent: (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
  });
}

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}

// ---- wings ------------------------------------------------------------------------------------------

/** Outline of one (right) wing in the x/y plane, root at the origin, pointing +x. */
function wingShape(id: string): THREE.Shape {
  const s = new THREE.Shape();
  if (["bat", "dragon", "phantom"].includes(id)) {
    // membrane between finger bones, scalloped trailing edge
    s.moveTo(0, 0);
    s.lineTo(4, 5);
    s.lineTo(16, 7);
    const tips: [number, number][] = [[16, 7], [13, -6], [8, -9], [3, -7]];
    for (let i = 0; i < tips.length - 1; i++) {
      const [x1, y1] = tips[i];
      const [x2, y2] = tips[i + 1];
      s.quadraticCurveTo((x1 + x2) / 2 - 1.5, (y1 + y2) / 2 + 1.5, x2, y2);
    }
    s.lineTo(0, -2);
  } else if (["butterfly", "fairy"].includes(id)) {
    s.moveTo(0, 0);
    s.bezierCurveTo(4, 10, 15, 11, 13, 3);
    s.bezierCurveTo(12, 0, 6, 0, 2, -1);
    s.bezierCurveTo(8, -3, 10, -9, 5, -9);
    s.bezierCurveTo(2, -9, 0, -5, 0, 0);
  } else if (["mech", "crystal", "neon"].includes(id)) {
    s.moveTo(0, 1);
    s.lineTo(6, 6);
    s.lineTo(15, 8);
    s.lineTo(12, 2);
    s.lineTo(14, -3);
    s.lineTo(8, -2);
    s.lineTo(7, -8);
    s.lineTo(2, -3);
    s.lineTo(0, -1);
  } else {
    // feathered: rounded leading edge, a row of feather tips along the bottom
    s.moveTo(0, 0);
    s.quadraticCurveTo(6, 9, 16, 8);
    let x = 16;
    let y = 8;
    for (let i = 0; i < 6; i++) {
      const nx = 16 - (i + 1) * 2.7;
      const ny = 4 - i * 1.9 - (i % 2) * 0.6;
      s.quadraticCurveTo(x - 0.4, y - 4, nx, ny);
      s.lineTo(nx + 0.6, ny + 2.5);
      x = nx;
      y = ny + 2.5;
    }
    s.lineTo(0, -2);
  }
  return s;
}

function buildWings(id: string, group: THREE.Group): Tick {
  const c = color("wings", id);
  const glow = ["neon", "crystal", "aurora", "phoenix", "seraph"].includes(id) ? 0.6 : 0.15;
  const m = mat(c, { glow, opacity: ["crystal", "fairy", "aurora"].includes(id) ? 0.8 : 1 });
  const geo = new THREE.ExtrudeGeometry(wingShape(id), { depth: 0.4, bevelEnabled: false });
  const pairs = id === "seraph" ? [1, 0.6] : [1];
  const pivots: THREE.Group[] = [];
  pairs.forEach((scale, row) => {
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.2, 3 - row * 5, -2.4); // body-local: the body box spans y -6..6
      const wing = new THREE.Mesh(geo, m);
      wing.scale.set(side * scale, scale, 1);
      pivot.add(wing);
      group.add(pivot);
      pivots.push(pivot);
    }
  });
  const speed = ["butterfly", "fairy", "bat"].includes(id) ? 5 : 2.2;
  return (t) => {
    const flap = 0.35 + Math.sin(t * speed) * 0.25;
    pivots.forEach((p, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      p.rotation.y = side * flap; // folded back, flapping
    });
  };
}

// ---- headwear ---------------------------------------------------------------------------------------

function buildHead(id: string, g: THREE.Group): Tick {
  const c = color("head", id);
  const m = mat(c);
  const white = mat(new THREE.Color("#f4f4f6"));
  const dark = mat(new THREE.Color("#1a1b22"));
  const add = (o: THREE.Object3D) => g.add(o);
  const cyl = (rt: number, rb: number, h: number, mm: THREE.Material, y: number, seg = 24) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mm);
    o.position.y = y;
    return o;
  };
  switch (id) {
    case "halo": {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.45, 8, 32), mat(c, { glow: 0.8 }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 11;
      add(halo);
      return (t) => (halo.position.y = 11 + Math.sin(t * 2) * 0.4);
    }
    case "horns":
      for (const s of [1, -1]) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(1, 4.5, 10), m);
        h.position.set(s * 3, 9.6, 0);
        h.rotation.z = -s * 0.45;
        add(h);
      }
      break;
    case "crown":
      add(cyl(4.5, 4.5, 2, m, 9, 8));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2, 4), m);
        p.position.set(Math.cos(a) * 4.3, 11, Math.sin(a) * 4.3);
        add(p);
      }
      break;
    case "cat":
    case "bunny":
      for (const s of [1, -1]) {
        const ear =
          id === "cat"
            ? new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.4, 4), m)
            : box(1.6, 6.5, 0.7, m);
        ear.position.set(s * 2.4, id === "cat" ? 9.6 : 11, 0);
        ear.rotation.z = -s * (id === "cat" ? 0.2 : 0.12);
        add(ear);
      }
      break;
    case "kasa":
      add(cyl(0.3, 9, 4, m, 10.2));
      break;
    case "tophat":
      add(cyl(6, 6, 0.6, m, 8.4));
      add(cyl(3.8, 3.8, 6.5, m, 11.9));
      add(cyl(3.85, 3.85, 1, mat(new THREE.Color("#b0303a")), 9.3));
      break;
    case "wizard": {
      add(cyl(7, 7, 0.5, m, 8.4));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.8, 12, 20), m);
      cone.position.set(0.8, 14.5, 0);
      cone.rotation.z = -0.18;
      add(cone);
      break;
    }
    case "cowboy": {
      const brim = cyl(8, 8, 0.5, m, 8.4);
      brim.scale.z = 0.8;
      add(brim);
      add(cyl(3.6, 4.2, 4.5, m, 10.6));
      break;
    }
    case "santa": {
      const fur = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.9, 8, 24), white);
      fur.rotation.x = Math.PI / 2;
      fur.position.y = 8.6;
      add(fur);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.3, 8, 20), m);
      cone.position.set(1, 12.6, 0);
      cone.rotation.z = -0.35;
      add(cone);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), white);
      pom.position.set(3.6, 16, 0);
      add(pom);
      break;
    }
    case "party":
      add(new THREE.Mesh(new THREE.ConeGeometry(3, 8, 20), m).translateY(12));
      add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), white).translateY(16.2));
      break;
    case "beanie": {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(4.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
      dome.position.y = 7.6;
      add(dome);
      add(cyl(4.8, 4.8, 1.6, m, 7.8));
      break;
    }
    case "cap": {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
      dome.position.y = 7.8;
      add(dome);
      add(box(7, 0.4, 4, m, 0, 7.9, 5.6));
      break;
    }
    case "headphones": {
      const band = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.5, 8, 24, Math.PI), m);
      band.position.y = 4.5;
      add(band);
      for (const s of [1, -1]) {
        const cup = cyl(1.7, 1.7, 1.2, dark, 0);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(s * 4.7, 4, 0);
        add(cup);
      }
      break;
    }
    case "flower": {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.4, 6, 24), mat(new THREE.Color("#4caf50")));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 8.6;
      add(ring);
      const petals = ["#ff9bc8", "#ffd84d", "#ffffff", "#b48cff"];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), mat(new THREE.Color(petals[i % 4])));
        f.position.set(Math.cos(a) * 4.5, 8.9, Math.sin(a) * 4.5);
        add(f);
      }
      break;
    }
    case "shades":
      add(box(9, 1.6, 0.4, dark, 0, 4.6, 4.3));
      break;
    default:
      break;
  }
  return () => {};
}

// ---- trails -----------------------------------------------------------------------------------------

function buildTrail(id: string, g: THREE.Group): Tick {
  const c = color("trail", id);
  if (id === "aura" || id === "rings") {
    const rings = Array.from({ length: id === "rings" ? 3 : 2 }, () => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(6, 0.35, 6, 40), mat(c, { glow: 0.9, opacity: 0.8 }));
      r.rotation.x = Math.PI / 2;
      r.position.y = -23.6;
      g.add(r);
      return r;
    });
    return (t) =>
      rings.forEach((r, i) => {
        const k = (t * 0.6 + i / rings.length) % 1;
        const s = id === "rings" ? 0.3 + k * 1.4 : 0.9 + Math.sin(t * 2 + i) * 0.12;
        r.scale.set(s, s, s);
        if (id === "rings") r.position.y = -23.6 + k * 3;
        (r.material as THREE.MeshLambertMaterial).opacity = id === "rings" ? 1 - k : 0.7;
      });
  }
  const n = 46;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const seed = Array.from({ length: n }, () => Math.random());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: id === "steps" ? 2.6 : 1.9, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  g.add(points);
  const tmp = new THREE.Color();
  return (t) => {
    for (let i = 0; i < n; i++) {
      const k = (t * 0.35 + seed[i]) % 1;
      const a = seed[i] * Math.PI * 2 + (id === "helix" ? t * 2 : 0);
      let x: number;
      let y: number;
      let z: number;
      if (id === "helix") {
        const side = i % 2 ? Math.PI : 0;
        x = Math.cos(k * 10 + side + t * 2) * 5;
        z = Math.sin(k * 10 + side + t * 2) * 5;
        y = -24 + k * 22;
      } else if (id === "steps") {
        x = (i % 2 ? 1.8 : -1.8) + Math.sin(seed[i] * 9) * 0.3;
        z = -k * 18;
        y = -23.9;
      } else {
        const r = 3 + seed[(i + 7) % n] * 5;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = id === "snow" || id === "sakura" ? -4 - k * 20 : -24 + k * 14;
      }
      pos.set([x, y, z], i * 3);
      const fade = 1 - k;
      if (id === "rainbow") tmp.setHSL((seed[i] + t * 0.1) % 1, 0.9, 0.6);
      else tmp.copy(c);
      col.set([tmp.r * fade + 0.05, tmp.g * fade + 0.05, tmp.b * fade + 0.05], i * 3);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  };
}

// ---- pets -------------------------------------------------------------------------------------------

function buildPet(id: string, g: THREE.Group): Tick {
  const pet = new THREE.Group();
  const c = color("pet", id);
  const m = mat(c);
  const white = mat(new THREE.Color("#f4f0ea"));
  const dark = mat(new THREE.Color("#18181c"));
  if (id === "fox") {
    pet.add(box(5, 4, 8, m, 0, 0, 0));
    pet.add(box(5, 4, 4, m, 0, 2, 5));
    pet.add(box(3, 1.6, 2, white, 0, 1, 7.6));
    pet.add(box(1.2, 1.6, 0.8, m, -1.6, 4.6, 5), box(1.2, 1.6, 0.8, m, 1.6, 4.6, 5));
    pet.add(box(0.8, 0.8, 0.3, dark, -1.3, 2.6, 7.1), box(0.8, 0.8, 0.3, dark, 1.3, 2.6, 7.1));
    const tail = box(2.6, 2.6, 6, m, 0, 0.6, -6.5);
    tail.rotation.x = 0.4;
    pet.add(tail, box(2.7, 2.7, 1.6, white, 0, -0.6, -9.3));
  } else if (id === "bee") {
    pet.add(box(5, 5, 6, m), box(5.1, 5.1, 1.2, dark, 0, 0, -1), box(5.1, 5.1, 1.2, dark, 0, 0, 1.6));
    pet.add(box(0.8, 0.8, 0.3, dark, -1.3, 1, 3.1), box(0.8, 0.8, 0.3, dark, 1.3, 1, 3.1));
    const wm = mat(new THREE.Color("#dff3ff"), { opacity: 0.6, glow: 0.4 });
    for (const s of [1, -1]) {
      const w = box(4, 0.2, 3, wm, s * 2.5, 2.8, 0);
      w.name = "wing";
      pet.add(w);
    }
  } else {
    pet.add(box(4, 3, 8, m), box(5, 3.4, 4, m, 0, 0.4, 5.4));
    const gill = mat(new THREE.Color("#d0457c"));
    for (const s of [1, -1]) pet.add(box(1, 2.4, 0.6, gill, s * 3, 1, 5.4));
    pet.add(box(0.8, 0.8, 0.3, dark, -1.4, 0.8, 7.5), box(0.8, 0.8, 0.3, dark, 1.4, 0.8, 7.5));
    pet.add(box(0.6, 2.6, 5, m, 0, 0.4, -6));
  }
  pet.scale.setScalar(0.85);
  pet.position.set(10, -18, 8);
  pet.rotation.y = -0.5;
  g.add(pet);
  const fly = id === "bee";
  return (t) => {
    pet.position.y = (fly ? -10 : -22) + (fly ? Math.sin(t * 2.5) * 1.5 : Math.abs(Math.sin(t * 3)) * 0.6);
    pet.children.forEach((ch) => {
      if (ch.name === "wing") ch.rotation.x = Math.sin(t * 30) * 0.5;
    });
  };
}

// ---- mount ------------------------------------------------------------------------------------------

/** Puts the worn items on the viewer's player; returns a cleanup that removes them and stops their motion. */
export function dress(viewer: SkinViewer, worn: Worn): () => void {
  const player = viewer.playerObject;
  const parts: [THREE.Object3D, THREE.Group][] = [];
  const ticks: Tick[] = [];
  const mount = (parent: THREE.Object3D, build: (g: THREE.Group) => Tick) => {
    const g = new THREE.Group();
    ticks.push(build(g));
    parent.add(g);
    parts.push([parent, g]);
  };
  if (worn.wings && worn.wings !== "none") mount(player.skin.body, (g) => buildWings(worn.wings!, g));
  if (worn.head && worn.head !== "none") mount(player.skin.head, (g) => buildHead(worn.head!, g));
  if (worn.trail && worn.trail !== "none") mount(player.skin, (g) => buildTrail(worn.trail!, g));
  if (worn.pet && worn.pet !== "none") mount(player.skin, (g) => buildPet(worn.pet!, g));

  let raf = 0;
  const start = performance.now();
  const loop = () => {
    const t = (performance.now() - start) / 1000;
    ticks.forEach((f) => f(t));
    raf = requestAnimationFrame(loop);
  };
  if (ticks.length) loop();

  return () => {
    cancelAnimationFrame(raf);
    for (const [parent, g] of parts) {
      parent.remove(g);
      g.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mm = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mm) ? mm : mm ? [mm] : []).forEach((x) => x.dispose());
      });
    }
  };
}
