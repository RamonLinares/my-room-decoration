import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import {
  SafeFrameCameraController,
  calculateSafeFrameFit,
  safeFrameNdc,
} from '../src/systems/SafeFrameCamera';

test.describe('safe-frame camera math', () => {
  test('accounts for both horizontal and vertical FOV plus asymmetric UI insets', () => {
    const unobstructed = calculateSafeFrameFit({
      verticalFovDegrees: 50,
      aspect: 16 / 9,
      viewport: { width: 1280, height: 720 },
      halfWidth: 5,
      halfHeight: 3,
    });
    const withSidebar = calculateSafeFrameFit({
      verticalFovDegrees: 50,
      aspect: 16 / 9,
      viewport: { width: 1280, height: 720 },
      insets: { left: 360, bottom: 100 },
      halfWidth: 5,
      halfHeight: 3,
    });

    expect(unobstructed.horizontalFovRadians).toBeGreaterThan(
      unobstructed.verticalFovRadians,
    );
    expect(withSidebar.distance).toBeGreaterThan(unobstructed.distance);
    expect(withSidebar.safeCenterNdc.x).toBeGreaterThan(0);
    expect(withSidebar.safeCenterNdc.y).toBeGreaterThan(0);
    expect(withSidebar.safeViewport).toEqual({
      left: 360,
      top: 0,
      width: 920,
      height: 620,
    });
  });

  test('clamps impossible insets to a valid one-pixel safe frame', () => {
    const frame = safeFrameNdc(
      { width: 100, height: 50 },
      { left: 1000, right: 1000, top: 1000, bottom: 1000 },
    );
    expect(frame.safeViewport.width).toBe(1);
    expect(frame.safeViewport.height).toBe(1);
    expect(Number.isFinite(frame.safeCenterNdc.x)).toBe(true);
    expect(Number.isFinite(frame.safeCenterNdc.y)).toBe(true);
  });

  test('keeps degenerate direction and distance inputs finite', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const box = new THREE.Box3(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1),
    );
    const controller = new SafeFrameCameraController(camera);
    const preset = controller.focusBox(box, {
      viewport: { width: 1, height: 1 },
      direction: new THREE.Vector3(),
      minDistance: 5,
      maxDistance: 2,
      reducedMotion: true,
    });
    expect(preset.distance).toBe(5);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
    expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
  });

  test('projects a focused selection into the safe center and keeps its bounds visible', () => {
    const camera = new THREE.PerspectiveCamera(50, 1280 / 720, 0.1, 100);
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const box = new THREE.Box3(
      new THREE.Vector3(-2, 0, -1.5),
      new THREE.Vector3(2, 3, 1.5),
    );
    const controller = new SafeFrameCameraController(camera);
    const preset = controller.focusBox(box, {
      viewport: { width: 1280, height: 720 },
      insets: { left: 360, bottom: 96 },
      direction: new THREE.Vector3(1, 0.65, 1),
      reducedMotion: true,
    });
    const projectedCenter = preset.target.clone().project(camera);
    const expected = safeFrameNdc(
      { width: 1280, height: 720 },
      { left: 360, bottom: 96 },
    );

    expect(projectedCenter.x).toBeCloseTo(expected.safeCenterNdc.x, 5);
    expect(projectedCenter.y).toBeCloseTo(expected.safeCenterNdc.y, 5);
    expect(controller.isTransitioning()).toBe(false);
    expect(controller.getTarget()).toEqual(preset.target);

    for (let mask = 0; mask < 8; mask += 1) {
      const corner = new THREE.Vector3(
        mask & 1 ? box.max.x : box.min.x,
        mask & 2 ? box.max.y : box.min.y,
        mask & 4 ? box.max.z : box.min.z,
      ).project(camera);
      expect(corner.x).toBeGreaterThanOrEqual(
        expected.safeCenterNdc.x - expected.safeHalfSpanNdc.x - 0.001,
      );
      expect(corner.x).toBeLessThanOrEqual(
        expected.safeCenterNdc.x + expected.safeHalfSpanNdc.x + 0.001,
      );
      expect(corner.y).toBeGreaterThanOrEqual(
        expected.safeCenterNdc.y - expected.safeHalfSpanNdc.y - 0.001,
      );
      expect(corner.y).toBeLessThanOrEqual(
        expected.safeCenterNdc.y + expected.safeHalfSpanNdc.y + 0.001,
      );
    }
  });

  test('animates presets deterministically and snaps for reduced motion', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 0, 0);
    const controller = new SafeFrameCameraController(camera, {
      defaultDurationMs: 400,
    });
    const preset = {
      target: new THREE.Vector3(3, 1, 0),
      direction: new THREE.Vector3(0, 0, 1),
      distance: 6,
    };

    controller.focusPreset(preset);
    expect(controller.isTransitioning()).toBe(true);
    const start = camera.position.clone();
    controller.update(0.2);
    expect(camera.position.equals(start)).toBe(false);
    expect(controller.isTransitioning()).toBe(true);
    controller.update(0.2);
    expect(controller.isTransitioning()).toBe(false);

    controller.focusPreset(
      { ...preset, target: new THREE.Vector3(-2, 0, 1) },
      { reducedMotion: true },
    );
    expect(controller.isTransitioning()).toBe(false);
    expect(controller.getTarget()).toEqual(new THREE.Vector3(-2, 0, 1));
  });
});
