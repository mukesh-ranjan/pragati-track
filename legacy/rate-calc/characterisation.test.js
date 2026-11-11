// Characterisation tests for the legacy rate calculator.
//
// These pin the EXACT output of quote() as observed on 2026-11-12, including
// values that look wrong. They exist so that any future refactor of ratecalc.js
// can prove it has not changed behaviour by accident. When a suspicious value is
// deliberately fixed, update the expectation here in the same commit and cite the
// ticket.
//
// Do not "correct" an expectation because it looks wrong. Each suspicious case
// carries a comment naming the likely bug instead.
//
// Deliberate changes already pinned here (12 Nov 2026):
//   - Totals are rounded to the nearest paisa (money is computed in paise and rounded
//     once). Only totals changed; the pre-rounding values are in git history.
//   - City names are matched case-insensitively and trimmed, so 'pune' and 'Pune' get
//     the same zone. Before this 'pune' to 'Pune' quoted zone C.
//   - Chargeable weight is the GREATER of actual and volumetric, rounded UP to the next
//     half kilo (T-4519 follow-up). Before this it took the smaller and rounded down.
const test = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('./ratecalc');

test('Pune to Pune, 1 kg, standard', () => {
  // Same city => zone A. 1 kg = base 45 + one extra half-kilo at 12 = 57, x1.12 fuel = 63.84.
  assert.deepEqual(quote('Pune', 'Pune', 1, 'standard'), {
    zone: 'A',
    chargeableKg: 1,
    beforeTax: 63.84,
    total: 75.33,
  });
});

test('pune (lowercase) to Pune quotes the same as Pune to Pune', () => {
  assert.deepEqual(quote('pune', 'Pune', 1, 'standard'), quote('Pune', 'Pune', 1, 'standard'));
});

test('Mumbai to Delhi, 0.5 kg, standard', () => {
  // Metro to metro => zone B. Exactly the first half kilo, so no per-half-kg charge:
  // 70 x 1.12 = 78.4, x1.18 GST = 92.512, rounded to the nearest paisa = 92.51.
  assert.deepEqual(quote('Mumbai', 'Delhi', 0.5, 'standard'), {
    zone: 'B',
    chargeableKg: 0.5,
    beforeTax: 78.4,
    total: 92.51,
  });
});

test('Mumbai to Pune, 2.3 kg, standard, 40x30x20 cm', () => {
  // Volumetric = 40*30*20 / 5000 = 4.8 kg beats actual 2.3 kg; rounded up to 5 kg.
  // Zone C: 95 + 9 half-kilos x 24 = 311, x1.12 fuel = 348.32, x1.18 GST = 411.02.
  assert.deepEqual(quote('Mumbai', 'Pune', 2.3, 'standard', '40x30x20'), {
    zone: 'C',
    chargeableKg: 5,
    beforeTax: 348.32,
    total: 411.02,
  });
});

test('Mumbai to Jaipur, 7.2 kg, express', () => {
  // Metro to regional => zone C. 7.2 kg rounds up to 7.5 kg. Express multiplier applied
  // after the fuel surcharge: (95 + 14 x 24) x 1.12 x 1.5 = 724.08, x1.18 GST = 854.41.
  assert.deepEqual(quote('Mumbai', 'Jaipur', 7.2, 'express'), {
    zone: 'C',
    chargeableKg: 7.5,
    beforeTax: 724.08,
    total: 854.41,
  });
});
