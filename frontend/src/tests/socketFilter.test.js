import test from 'node:test';
import assert from 'node:assert/strict';
import { isSocketCompatible, isUniversalComponent } from '../utils/socketFilter.js';

test('Socket Filter - ALL', () => {
  const am5Cpu = { category_name: 'CPU', socket: 'AM5', name: 'Ryzen 7 7800X3D' };
  const intelCpu = { category_name: 'CPU', socket: 'LGA1700', name: 'Core i7-14700K' };
  const am5Mobo = { category_name: 'Motherboard', socket: 'AM5', name: 'B650E-F' };
  const intelMobo = { category_name: 'Motherboard', socket: 'LGA1700', name: 'Z790-E' };
  const gpu = { category_name: 'Graphics Card', socket: null, name: 'RTX 4080 Super' };
  const unknownCpu = { category_name: 'CPU', socket: null, name: 'Generic CPU' };

  assert.equal(isSocketCompatible(am5Cpu, 'ALL'), true);
  assert.equal(isSocketCompatible(intelCpu, 'ALL'), true);
  assert.equal(isSocketCompatible(am5Mobo, 'ALL'), true);
  assert.equal(isSocketCompatible(intelMobo, 'ALL'), true);
  assert.equal(isSocketCompatible(gpu, 'ALL'), true);
  assert.equal(isSocketCompatible(unknownCpu, 'ALL'), true);
});

test('Socket Filter - AM5', () => {
  const am5Cpu = { category_name: 'CPU', socket: 'AM5', name: 'Ryzen 7 7800X3D' };
  const am5Mobo = { category_name: 'Motherboard', socket: 'AM5', name: 'ROG STRIX B650E-F' };
  const intelCpu = { category_name: 'CPU', socket: 'LGA1700', name: 'Core i7-14700K' };
  const intelMobo = { category_name: 'Motherboard', socket: 'LGA1700', name: 'ROG MAXIMUS Z790' };
  const ambiguousCpu = { category_name: 'CPU', socket: null, name: 'Socketless Engineering Sample' };
  const ambiguousMobo = { category_name: 'Motherboard', socket: '', name: 'Prototype Board' };
  const universalGpu = { category_name: 'Graphics Card', socket: null, name: 'RTX 4070 Ti' };
  const universalPsu = { category_name: 'Power Supply', socket: null, name: 'RM850x' };

  // Compatible
  assert.equal(isSocketCompatible(am5Cpu, 'AM5'), true);
  assert.equal(isSocketCompatible(am5Mobo, 'AM5'), true);
  assert.equal(isSocketCompatible(universalGpu, 'AM5'), true);
  assert.equal(isSocketCompatible(universalPsu, 'AM5'), true);

  // Incompatible
  assert.equal(isSocketCompatible(intelCpu, 'AM5'), false);
  assert.equal(isSocketCompatible(intelMobo, 'AM5'), false);

  // Eliminates ambiguous CPU / Motherboards
  assert.equal(isSocketCompatible(ambiguousCpu, 'AM5'), false);
  assert.equal(isSocketCompatible(ambiguousMobo, 'AM5'), false);
});

test('Socket Filter - LGA1700', () => {
  const am5Cpu = { category_name: 'CPU', socket: 'AM5', name: 'Ryzen 7 7800X3D' };
  const intelCpu = { category_name: 'CPU', socket: 'LGA1700', name: 'Core i9-14900K' };
  const intelMobo = { category_name: 'Motherboard', socket: 'LGA1700', name: 'MSI MAG Z790 TOMAHAWK' };
  const universalCase = { category_name: 'Case', socket: null, name: 'Lian Li O11 Dynamic' };
  const universalRam = { category_name: 'Memory', socket: null, name: 'Corsair Vengeance RGB 32GB' };

  assert.equal(isSocketCompatible(intelCpu, 'LGA1700'), true);
  assert.equal(isSocketCompatible(intelMobo, 'LGA1700'), true);
  assert.equal(isSocketCompatible(universalCase, 'LGA1700'), true);
  assert.equal(isSocketCompatible(universalRam, 'LGA1700'), true);

  assert.equal(isSocketCompatible(am5Cpu, 'LGA1700'), false);
});

test('Socket Filter - Universal Identification', () => {
  const gpu = { category_name: 'Graphics Card', socket: null, name: 'GeForce RTX 4080' };
  const psu = { category_name: 'Power Supply', socket: null, name: 'Corsair RM1000e' };
  const storage = { category_name: 'Storage', socket: null, name: 'Samsung 990 Pro 2TB' };
  const pcCase = { category_name: 'Case', socket: null, name: 'NZXT H9 Flow' };
  const universalCooler = { category_name: 'Cooler', socket: 'Universal', name: 'Noctua NH-D15' };

  const cpu = { category_name: 'CPU', socket: 'AM5', name: 'Ryzen 7 7700X' };
  const motherboard = { category_name: 'Motherboard', socket: 'LGA1700', name: 'ASUS Prime Z790' };
  const namelessCpu = { category_name: 'CPU', socket: null, name: 'Core i5 13600K' };

  assert.equal(isUniversalComponent(gpu), true);
  assert.equal(isUniversalComponent(psu), true);
  assert.equal(isUniversalComponent(storage), true);
  assert.equal(isUniversalComponent(pcCase), true);
  assert.equal(isUniversalComponent(universalCooler), true);

  assert.equal(isUniversalComponent(cpu), false);
  assert.equal(isUniversalComponent(motherboard), false);
  assert.equal(isUniversalComponent(namelessCpu), false);
});
