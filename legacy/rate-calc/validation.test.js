// quote() is about to be called from the booking form with raw user input. Every bad
// value must throw a ValidationError naming the field, instead of silently pricing the
// parcel (negative weight used to quote the base rate, an unknown city quoted zone D,
// an empty city pair quoted zone A, and non-numeric input produced NaN prices).
const test = require('node:test');
const assert = require('node:assert/strict');
const { quote, ValidationError, MAX_WEIGHT_KG, MAX_DIM_CM } = require('./ratecalc');

// A known-good parcel; each case below changes exactly one argument.
const good = ['Mumbai', 'Pune', 2.3, 'standard', '40x30x20'];
const withArg = (index, value) => good.map((v, i) => (i === index ? value : v));
const FROM = 0, TO = 1, WEIGHT = 2, SERVICE = 3, DIMS = 4;

function assertRejects(args, field, messagePart) {
  assert.throws(
    () => quote(...args),
    (err) => {
      assert.ok(err instanceof ValidationError, `expected ValidationError, got ${err}`);
      assert.equal(err.name, 'ValidationError');
      assert.equal(err.field, field);
      assert.match(err.message, messagePart);
      return true;
    },
    `quote(${JSON.stringify(args)}) should be rejected`
  );
}

test('the known-good parcel still quotes', () => {
  assert.equal(quote(...good).total, 411.02);
});

test.describe('weight', () => {
  test('rejects a negative weight', () => {
    assertRejects(withArg(WEIGHT, -5), 'weightKg', /greater than 0.*-5/);
  });

  test('rejects a zero weight', () => {
    assertRejects(withArg(WEIGHT, 0), 'weightKg', /greater than 0.*\b0\b/);
  });

  test('rejects a weight above the maximum', () => {
    assertRejects(withArg(WEIGHT, MAX_WEIGHT_KG + 1), 'weightKg', /at most 100 kg/);
    assert.equal(quote(...withArg(WEIGHT, MAX_WEIGHT_KG)).chargeableKg, MAX_WEIGHT_KG);
  });

  test('rejects Infinity and NaN', () => {
    assertRejects(withArg(WEIGHT, Infinity), 'weightKg', /must be a number/);
    assertRejects(withArg(WEIGHT, NaN), 'weightKg', /must be a number/);
  });

  test('rejects non-numeric, empty and missing weights', () => {
    assertRejects(withArg(WEIGHT, 'abc'), 'weightKg', /must be a number.*"abc"/);
    assertRejects(withArg(WEIGHT, '2.3kg'), 'weightKg', /must be a number.*"2.3kg"/);
    assertRejects(withArg(WEIGHT, ''), 'weightKg', /must be a number/);
    assertRejects(withArg(WEIGHT, '   '), 'weightKg', /must be a number/);
    assertRejects(withArg(WEIGHT, undefined), 'weightKg', /must be a number.*undefined/);
    assertRejects(withArg(WEIGHT, null), 'weightKg', /must be a number.*null/);
    assertRejects(withArg(WEIGHT, {}), 'weightKg', /must be a number/);
  });

  test('accepts a weight typed as a numeric string', () => {
    assert.deepEqual(quote(...withArg(WEIGHT, '2.3')), quote(...good));
    assert.deepEqual(quote(...withArg(WEIGHT, ' 2.3 ')), quote(...good));
  });
});

test.describe('box size', () => {
  test('rejects a size with the wrong number of sides', () => {
    assertRejects(withArg(DIMS, '40x30'), 'dims', /three numbers.*"40x30"/);
    assertRejects(withArg(DIMS, '40x30x20x10'), 'dims', /three numbers/);
    assertRejects(withArg(DIMS, '40'), 'dims', /three numbers/);
  });

  test('rejects a malformed size', () => {
    assertRejects(withArg(DIMS, 'abc'), 'dims', /three numbers.*"abc"/);
    assertRejects(withArg(DIMS, '40xx20'), 'dims', /three numbers/);
    assertRejects(withArg(DIMS, '40x30x'), 'dims', /three numbers/);
    assertRejects(withArg(DIMS, '40x30x20cm'), 'dims', /three numbers/);
    assertRejects(withArg(DIMS, '40*30*20'), 'dims', /three numbers/);
    assertRejects(withArg(DIMS, '40x30xInfinity'), 'dims', /three numbers/);
  });

  test('rejects a size that is not a string', () => {
    assertRejects(withArg(DIMS, 40), 'dims', /must be a string/);
    assertRejects(withArg(DIMS, [40, 30, 20]), 'dims', /must be a string/);
    assertRejects(withArg(DIMS, {}), 'dims', /must be a string/);
  });

  test('rejects zero or negative sides', () => {
    assertRejects(withArg(DIMS, '40x0x20'), 'dims', /greater than 0/);
    assertRejects(withArg(DIMS, '-40x30x20'), 'dims', /greater than 0/);
    assertRejects(withArg(DIMS, '40x30x-20'), 'dims', /greater than 0/);
  });

  test('rejects a side above the maximum', () => {
    assertRejects(withArg(DIMS, `40x30x${MAX_DIM_CM + 1}`), 'dims', /at most 300 cm/);
    assertRejects(withArg(DIMS, '40x30x99999999'), 'dims', /at most 300 cm/);
  });

  test('accepts upper-case X, spaces and decimals', () => {
    const expected = quote(...good);
    assert.deepEqual(quote(...withArg(DIMS, '40X30X20')), expected);
    assert.deepEqual(quote(...withArg(DIMS, ' 40 x 30 x 20 ')), expected);
    assert.equal(quote(...withArg(DIMS, '40.5x30x20')).chargeableKg, 5);
  });

  test('treats a missing or blank size as no size', () => {
    const expected = quote('Mumbai', 'Pune', 2.3, 'standard');
    assert.equal(expected.chargeableKg, 2.5);
    assert.deepEqual(quote(...withArg(DIMS, undefined)), expected);
    assert.deepEqual(quote(...withArg(DIMS, null)), expected);
    assert.deepEqual(quote(...withArg(DIMS, '')), expected);
  });
});

test.describe('city names', () => {
  test('rejects an unknown origin or destination', () => {
    assertRejects(withArg(FROM, 'Mumbi'), 'from', /unknown city "Mumbi"/);
    assertRejects(withArg(TO, 'Atlantis'), 'to', /unknown city "Atlantis"/);
  });

  test('rejects an empty, blank or missing city', () => {
    assertRejects(withArg(FROM, ''), 'from', /city name is required/);
    assertRejects(withArg(FROM, '   '), 'from', /city name is required/);
    assertRejects(withArg(FROM, undefined), 'from', /city name is required/);
    assertRejects(withArg(TO, null), 'to', /city name is required/);
  });

  test('rejects a city that is not a string', () => {
    assertRejects(withArg(FROM, 42), 'from', /city name is required/);
    assertRejects(withArg(TO, { name: 'Pune' }), 'to', /city name is required/);
  });

  test('an empty pair no longer quotes as the same city (zone A)', () => {
    assertRejects(['', '', 2, 'standard'], 'from', /required/);
    assertRejects([undefined, undefined, 2, 'standard'], 'from', /required/);
  });

  test('accepts every city in the zone table, including special-pair cities', () => {
    for (const city of ['Mumbai', 'Pune', 'Guwahati', 'Srinagar']) {
      assert.equal(quote('Delhi', city, 1, 'standard').chargeableKg, 1);
    }
    assert.equal(quote('Kolkata', 'Guwahati', 1, 'standard').zone, 'C');
  });

  test('still accepts case and whitespace variants of a known city', () => {
    assert.deepEqual(quote(' pune ', 'MUMBAI', 1, 'standard'), quote('Pune', 'Mumbai', 1, 'standard'));
  });
});

test.describe('service', () => {
  test('rejects an unknown service instead of pricing it as standard', () => {
    assertRejects(withArg(SERVICE, 'overnight'), 'service', /one of standard, express.*"overnight"/);
    assertRejects(withArg(SERVICE, ''), 'service', /one of standard, express/);
    assertRejects(withArg(SERVICE, null), 'service', /one of standard, express/);
    assertRejects(withArg(SERVICE, 1), 'service', /one of standard, express/);
  });

  test('defaults a missing service to standard and ignores case', () => {
    assert.deepEqual(quote(...withArg(SERVICE, undefined)), quote(...good));
    assert.deepEqual(quote(...withArg(SERVICE, 'EXPRESS')), quote(...withArg(SERVICE, 'express')));
    assert.deepEqual(quote(...withArg(SERVICE, ' Express ')), quote(...withArg(SERVICE, 'express')));
  });
});

test('validation errors name the field and are distinguishable from bugs', () => {
  try {
    quote('Mumbai', 'Pune', -1, 'standard');
    assert.fail('expected a throw');
  } catch (err) {
    assert.ok(err instanceof ValidationError);
    assert.ok(err instanceof Error);
    assert.equal(err.field, 'weightKg');
    assert.equal(err.message, 'weightKg: must be greater than 0, got -1');
  }
});
