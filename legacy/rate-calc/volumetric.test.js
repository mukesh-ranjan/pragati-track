// T-4519 follow-up: big light boxes were charged on actual weight.
// Chargeable weight is the GREATER of actual and volumetric (L x B x H / 5000),
// rounded UP to the next half kilo.
const test = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('./ratecalc');

test('express parcel with dimensions is charged on volumetric weight', () => {
  // actual 2.3 kg, volumetric 40*30*20/5000 = 4.8 kg -> 5 kg
  assert.equal(quote('Mumbai', 'Delhi', 2.3, 'express', '40x30x20').chargeableKg, 5);
});

test('standard parcel on another route is also charged on volumetric weight', () => {
  // actual 1.1 kg, volumetric 50*40*30/5000 = 12 kg -> 12 kg
  const q = quote('Pune', 'Jaipur', 1.1, 'standard', '50x40x30');
  assert.equal(q.chargeableKg, 12);
  // zone C: 95 + 23 half-kilos x 24 = 647, x1.12 fuel = 724.64
  assert.equal(q.zone, 'C');
  assert.equal(q.beforeTax, 724.64);
});

test('heavy small parcel is charged on actual weight, rounded up to the half kilo', () => {
  // actual 3.1 kg, volumetric 10*10*10/5000 = 0.2 kg -> 3.5 kg
  assert.equal(quote('Mumbai', 'Delhi', 3.1, 'standard', '10x10x10').chargeableKg, 3.5);
});
