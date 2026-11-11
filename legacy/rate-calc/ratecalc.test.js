// T-4519: express quotes look too high.
// Express must cost exactly EXPRESS (1.5x) the standard price before tax for the same parcel.
const test = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('./ratecalc');

const EXPRESS_MULTIPLIER = 1.5;

test('express before-tax price is exactly 1.5x standard for the same parcel', () => {
  const standard = quote('Mumbai', 'Pune', 2.3, 'standard', '40x30x20');
  const express = quote('Mumbai', 'Pune', 2.3, 'express', '40x30x20');

  assert.equal(express.zone, standard.zone);
  assert.equal(express.chargeableKg, standard.chargeableKg);
  assert.equal(
    express.beforeTax.toFixed(2),
    (standard.beforeTax * EXPRESS_MULTIPLIER).toFixed(2),
    'express before-tax should be standard before-tax x 1.5 (fuel surcharge charged once)'
  );
});
