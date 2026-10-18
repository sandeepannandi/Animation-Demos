import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOLE_DEFAULTS, shadowRadius, photonSphereRadius, iscoRadius, deflectionAngle,
  einsteinRadius, sourceOffset, imagePositions, imageMagnification, totalMagnification,
  keplerBeta, lorentzGamma, dopplerFactor, gravRedshift, diskTemperature, DISK_TEMP_PEAK,
  diskAngularVelocity, makeDiskNoise, diskEmission, makeStars, holeTarget,
  PLANET_DEFAULTS, holeMassFromRs, rocheLimit, tidalAcceleration, planetSurfaceGravity,
  tidalRatio, debrisKick, makePlanet, planetStep, isCaptured,
} from './holeMath.ts';

const RS = HOLE_DEFAULTS.rs;
const TE = HOLE_DEFAULTS.einstein;
const CFG = { width: 340, height: 380, rs: RS, einstein: TE, diskOut: HOLE_DEFAULTS.diskOut, inclCos: HOLE_DEFAULTS.inclCos, spin: HOLE_DEFAULTS.spin };

test('shadow sits at the exact Schwarzschild critical impact parameter', () => {
  assert.ok(Math.abs(shadowRadius(RS) / RS - (3 * Math.sqrt(3)) / 2) < 1e-12);
  assert.ok(Math.abs(shadowRadius(RS) - 23.38268590217984) < 1e-9);
});

test('photon sphere and ISCO sit at 1.5 and 3 Schwarzschild radii', () => {
  assert.equal(photonSphereRadius(RS), 1.5 * RS);
  assert.equal(iscoRadius(RS), 3 * RS);
});

test('weak-field deflection is 2rs over b', () => {
  assert.ok(Math.abs(deflectionAngle(100 * RS, RS) - 0.02) < 1e-12);
  assert.ok(Math.abs(deflectionAngle(RS, RS) - 2) < 1e-12);
  assert.ok(deflectionAngle(10, RS) > deflectionAngle(100, RS));
});

test('configured Einstein radius matches a point lens with the stated geometry', () => {
  const dEff = (TE * TE) / (2 * RS);
  assert.ok(Math.abs(einsteinRadius(RS, dEff) - TE) < 1e-9);
});

test('backward map inverts the analytic two-image solution', () => {
  for (const beta of [-120, -40, -5, 0.5, 12, 77, 200]) {
    const [plus, minus] = imagePositions(beta, TE);
    assert.ok(Math.abs(sourceOffset(plus, TE) - beta) < 1e-9, `plus ${beta}`);
    assert.ok(Math.abs(sourceOffset(minus, TE) - beta) < 1e-9, `minus ${beta}`);
  }
});

test('a source directly behind the hole images onto the Einstein ring', () => {
  const [plus, minus] = imagePositions(0, TE);
  assert.ok(Math.abs(plus - TE) < 1e-12);
  assert.ok(Math.abs(minus + TE) < 1e-12);
  assert.ok(Math.abs(sourceOffset(TE, TE)) < 1e-9);
  assert.ok(Math.abs(imageMagnification(TE * 1.0001, TE)) > 1000);
});

test('magnification diverges at the ring and falls to one far away', () => {
  assert.ok(totalMagnification(0.1, TE) > totalMagnification(TE, TE));
  assert.ok(Math.abs(totalMagnification(40 * TE, TE) - 1) < 0.01);
});

test('Keplerian orbital speed at the ISCO is sqrt(1/6) of light', () => {
  const b = keplerBeta(iscoRadius(RS), RS);
  assert.ok(Math.abs(b - Math.sqrt(1 / 6)) < 1e-12);
  assert.ok(Math.abs(lorentzGamma(b) - Math.sqrt(6 / 5)) < 1e-12);
  assert.ok(keplerBeta(2 * RS, RS) === 0.5);
});

test('doppler beaming brightens the approaching side and dims the receding side', () => {
  const beta = keplerBeta(2 * RS, RS);
  const approaching = dopplerFactor(beta, 0.9);
  const receding = dopplerFactor(beta, -0.9);
  assert.ok(approaching > 1.3);
  assert.ok(receding < 0.7);
  assert.ok(approaching > receding);
  assert.ok(Math.abs(approaching * receding - 1 / (lorentzGamma(beta) ** 2 * (1 - beta * beta * 0.81))) < 1e-9);
  assert.ok(Math.abs(dopplerFactor(0, 0.9) - 1) < 1e-12);
});

test('gravitational redshift factor is exact at sampled radii', () => {
  assert.ok(Math.abs(gravRedshift(3 * RS, RS) - Math.sqrt(2 / 3)) < 1e-12);
  assert.ok(Math.abs(gravRedshift(4 * RS, RS) - Math.sqrt(3) / 2) < 1e-12);
  assert.ok(Math.abs(gravRedshift(1e6 * RS, RS) - 1) < 1e-6);
});

test('Page-Thorne temperature peaks at 49/36 of the inner edge and vanishes at it', () => {
  const rIn = iscoRadius(RS);
  assert.equal(diskTemperature(rIn, rIn), 0);
  let best = 0;
  let bestR = 0;
  for (let r = rIn; r <= 4 * rIn; r += rIn / 2000) {
    const t = diskTemperature(r, rIn);
    if (t > best) { best = t; bestR = r; }
  }
  assert.ok(Math.abs(bestR / rIn - 49 / 36) < 0.002, `peak at ${bestR / rIn}`);
  assert.ok(Math.abs(best - 1) < 0.002, `peak height ${best}`);
  assert.ok(DISK_TEMP_PEAK > 0.48 && DISK_TEMP_PEAK < 0.49);
  assert.ok(diskTemperature(30 * rIn, rIn) < 0.2);
});

test('disk spins with the Keplerian r^-3/2 profile', () => {
  const rIn = iscoRadius(RS);
  assert.equal(diskAngularVelocity(rIn, rIn, 0.6), 0.6);
  assert.ok(Math.abs(diskAngularVelocity(8 * rIn, rIn, 0.6) - 0.6 / Math.pow(8, 1.5)) < 1e-12);
  assert.ok(diskAngularVelocity(2 * rIn, rIn, 0.6) < diskAngularVelocity(rIn, rIn, 0.6));
});

test('the approaching side of the disk emits more than the receding side', () => {
  const noise = makeDiskNoise(8, 32, 1);
  const opts = { ...HOLE_DEFAULTS, noiseRings: 8, noiseSectors: 32 };
  const r = 1.4 * iscoRadius(RS);
  const left = diskEmission(r, Math.PI, 0, 1, CFG, opts, noise);
  const right = diskEmission(r, 0, 0, 1, CFG, opts, noise);
  const lum = (c) => c[0] + c[1] + c[2];
  assert.ok(lum(left) > 1.5 * lum(right), `left ${lum(left)} right ${lum(right)}`);
});

test('scene and noise generators are deterministic', () => {
  const a = makeStars(HOLE_DEFAULTS.seed, 340, 380, 210);
  const b = makeStars(HOLE_DEFAULTS.seed, 340, 380, 210);
  assert.deepEqual(a, b);
  const n1 = makeDiskNoise(16, 64, 7);
  const n2 = makeDiskNoise(16, 64, 7);
  assert.deepEqual([...n1], [...n2]);
  assert.ok(n1.every((v) => v >= 0 && v <= 1));
});

test('the hole stays inside the canvas with its shadow fully visible', () => {
  const t = holeTarget(-50, 1000, CFG, HOLE_DEFAULTS);
  assert.ok(t.x >= shadowRadius(RS) + 8 && t.x <= CFG.width - shadowRadius(RS) - 8);
  assert.ok(t.y >= shadowRadius(RS) + 8 && t.y <= CFG.height - shadowRadius(RS) - 8);
  const bad = holeTarget(NaN, NaN, CFG, HOLE_DEFAULTS);
  assert.deepEqual(bad, { x: CFG.width / 2, y: CFG.height / 2 });
});

test('rigid Roche limit matches R*(2M/m)^(1/3)', () => {
  const q = PLANET_DEFAULTS.massRatio;
  assert.ok(Math.abs(rocheLimit(PLANET_DEFAULTS.radius, q) - 11 * Math.pow(2 / 0.03, 1 / 3)) < 1e-12);
  assert.ok(rocheLimit(10, 0.02) > rocheLimit(10, 0.05));
  assert.ok(rocheLimit(10, 0.02) === rocheLimit(20, 0.02) / 2);
});

test('tidal acceleration equals surface gravity exactly at the Roche limit', () => {
  const m = holeMassFromRs(RS);
  const q = 0.017;
  const R = 9;
  const dR = rocheLimit(R, q);
  const aTide = tidalAcceleration(m, R, dR);
  const gSurf = planetSurfaceGravity(m, q, R);
  assert.ok(Math.abs(aTide / gSurf - 1) < 1e-12);
});

test('tidal ratio grows as d^-3 and equals (dR/d)^3', () => {
  const m = holeMassFromRs(RS);
  const q = 0.03;
  const R = 11;
  const dR = rocheLimit(R, q);
  for (const d of [30, 55, 90, 160]) {
    assert.ok(Math.abs(tidalRatio(m, q, R, d) - Math.pow(dR / d, 3)) < 1e-9);
  }
  assert.ok(Math.abs(tidalRatio(m, q, R, 2 * dR) / tidalRatio(m, q, R, dR) - 1 / 8) < 1e-9);
});

test('tidal debris kick scales as R*sqrt(M/d^3)', () => {
  const m = holeMassFromRs(RS);
  assert.ok(Math.abs(debrisKick(m, 11, 50) / debrisKick(m, 11, 100) - Math.pow(2, 1.5)) < 1e-12);
  assert.ok(Math.abs(debrisKick(m, 22, 50) / debrisKick(m, 11, 50) - 2) < 1e-12);
  assert.ok(Math.abs(debrisKick(4 * m, 11, 50) / debrisKick(m, 11, 50) - 2) < 1e-12);
});

test('planet disrupts inside the Roche limit and never recovers', () => {
  const sim = makePlanet(PLANET_DEFAULTS, 7);
  const dR = rocheLimit(PLANET_DEFAULTS.radius, PLANET_DEFAULTS.massRatio);
  for (let i = 0; i < 240; i++) planetStep(sim, sim.x + dR * 2.5, sim.y, 1 / 60, HOLE_DEFAULTS, PLANET_DEFAULTS);
  assert.equal(sim.state, 'intact');
  assert.ok(sim.stretch < 0.35);
  for (let i = 0; i < 60; i++) planetStep(sim, sim.x + dR * 0.9, sim.y, 1 / 60, HOLE_DEFAULTS, PLANET_DEFAULTS);
  assert.equal(sim.state, 'disrupted');
  for (let i = 0; i < 600; i++) planetStep(sim, sim.x + dR * 3, sim.y, 1 / 60, HOLE_DEFAULTS, PLANET_DEFAULTS);
  assert.notEqual(sim.state, 'intact');
  assert.ok(sim.bodyScale === 0);
});

test('released debris falls inward and speeds up under 1/r^2 gravity', () => {
  const sim = makePlanet(PLANET_DEFAULTS, 11);
  const hx = 170, hy = 168;
  sim.state = 'disrupted';
  sim.shedAcc = 0;
  sim.shedTime = 0;
  sim.bodyScale = 1;
  const before = Math.hypot(sim.x - hx, sim.y - hy);
  for (let i = 0; i < 90; i++) planetStep(sim, hx, hy, 1 / 60, HOLE_DEFAULTS, PLANET_DEFAULTS);
  assert.ok(sim.debris.length > 5);
  const inward = sim.debris.filter((p) => Math.hypot(p.x - hx, p.y - hy) < before);
  assert.ok(inward.length >= sim.debris.length * 0.6);
  const fast = sim.debris.filter((p) => Math.hypot(p.vx, p.vy) > 0.05);
  assert.ok(fast.length === sim.debris.length);
});

test('a plunging particle is captured inside the shadow and feeds the disk', () => {
  const sim = makePlanet(PLANET_DEFAULTS, 3);
  const hx = 170, hy = 168;
  sim.state = 'disrupted';
  sim.debris.push({ x: hx + 30, y: hy, vx: 0, vy: 0, age: 0, size: 1, tone: 0.5 });
  let fed = 0;
  for (let i = 0; i < 600 && sim.debris.length; i++) {
    planetStep(sim, hx, hy, 1 / 60, HOLE_DEFAULTS, PLANET_DEFAULTS);
    fed = Math.max(fed, sim.feed);
  }
  assert.equal(sim.debris.length, 0);
  assert.ok(fed > 0);
  assert.ok(isCaptured(hx + 5, hy, hx, hy, RS));
  assert.ok(!isCaptured(hx + 40, hy, hx, hy, RS));
});
