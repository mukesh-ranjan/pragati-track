// Pragati rate calculator. Written 2019 by the old ops team. Do not touch the zone table without asking Suresh.
// Used by the booking desk: node ratecalc.js <from> <to> <weightKg> <service> [LxWxH cm]
const zones = require('./zones.json');

// Money is scaled to paise (rupees x 100) and rounded to the nearest paisa exactly
// once, in toRupees, so quotes never carry floating-point tails.
const BASE_PAISE = { A: 4500, B: 7000, C: 9500, D: 13000 };   // first 0.5 kg, by zone
const PER_HALF_KG_PAISE = { A: 1200, B: 1800, C: 2400, D: 3200 };
const FUEL_PERCENT = 12;      // fuel surcharge
const EXPRESS_PERCENT = 50;   // express costs 1.5x standard
const GST_PERCENT = 18;

// Sanity limits for a single parcel. Anything beyond these is a typo or a misuse of
// the form, not a booking; confirm the actual ceilings with ops before raising them.
const MAX_WEIGHT_KG = 100;
const MAX_DIM_CM = 300;
const SERVICES = ['standard', 'express'];

// Thrown by quote() for bad input. `field` names the offending argument so a form can
// highlight it; every other error coming out of quote() is a bug, not user error.
class ValidationError extends Error {
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// City names typed at the booking desk vary in case and spacing ('pune', ' PUNE ').
// The zone tables are keyed by the lowercased name so one normalisation covers every rule.
const cityKey = (name) => String(name || '').trim().toLowerCase();
const METRO = new Set(zones.metro.map(cityKey));
const REGIONAL = new Set(zones.regional.map(cityKey));
const SPECIAL = Object.fromEntries(
  Object.entries(zones.special).map(([pair, zone]) => [pair.toLowerCase(), zone])
);
// Every city the zone table knows about, including the ends of the special pairs.
const KNOWN_CITIES = new Set([
  ...METRO,
  ...REGIONAL,
  ...Object.keys(SPECIAL).flatMap((pair) => pair.split('-')),
]);

function describe(value) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function requireCity(field, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(field, `city name is required, got ${describe(value)}`);
  }
  if (!KNOWN_CITIES.has(cityKey(value))) {
    throw new ValidationError(field, `unknown city ${describe(value.trim())}`);
  }
  return value;
}

// Accepts a finite number or a string that is entirely a number ('2.3', not '2.3kg').
function parseNumber(field, value) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new ValidationError(field, `must be a number, got ${describe(value)}`);
  }
  return n;
}

function requireWeight(value) {
  const kg = parseNumber('weightKg', value);
  if (kg <= 0) throw new ValidationError('weightKg', `must be greater than 0, got ${kg}`);
  if (kg > MAX_WEIGHT_KG) {
    throw new ValidationError('weightKg', `must be at most ${MAX_WEIGHT_KG} kg, got ${kg}`);
  }
  return kg;
}

// Dimensions are optional. When given they must be 'LxBxH' in centimetres; returns the
// three sides as numbers, or undefined when no dimensions were supplied.
function requireDims(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError('dims', `must be a string like '40x30x20', got ${describe(value)}`);
  }
  const parts = value.trim().split(/\s*[xX]\s*/);
  if (parts.length !== 3 || parts.some((p) => p === '' || !Number.isFinite(Number(p)))) {
    throw new ValidationError('dims', `must be three numbers like '40x30x20', got ${describe(value)}`);
  }
  const sides = parts.map(Number);
  if (sides.some((s) => s <= 0)) {
    throw new ValidationError('dims', `every side must be greater than 0, got ${describe(value)}`);
  }
  if (sides.some((s) => s > MAX_DIM_CM)) {
    throw new ValidationError('dims', `every side must be at most ${MAX_DIM_CM} cm, got ${describe(value)}`);
  }
  return sides;
}

function requireService(value) {
  if (value === undefined) return 'standard';
  const service = typeof value === 'string' ? value.trim().toLowerCase() : value;
  if (!SERVICES.includes(service)) {
    throw new ValidationError('service', `must be one of ${SERVICES.join(', ')}, got ${describe(value)}`);
  }
  return service;
}

function zoneFor(rawFrom, rawTo) {
  const from = cityKey(rawFrom);
  const to = cityKey(rawTo);
  if (from === to) return 'A';
  if (METRO.has(from) && METRO.has(to)) return 'B';
  const special = SPECIAL[from + '-' + to];
  if (special) return special;
  return REGIONAL.has(to) ? 'C' : 'D';
}

// Carriers charge the GREATER of actual and volumetric weight (L x B x H / 5000),
// rounded UP to the next half kilo (T-4519 follow-up).
// `dims` is either an 'LxBxH' string or the three sides already parsed by requireDims.
function chargeableWeight(weightKg, dims) {
  let w = weightKg;
  if (dims) {
    const [l, b, h] = Array.isArray(dims) ? dims : dims.split('x').map(Number);
    const vol = (l * b * h) / 5000;
    w = Math.max(w, vol);
  }
  return Math.ceil(w * 2) / 2;
}

// Half-kilo steps charged on top of the first 0.5 kg that the base rate covers.
function extraHalfKilos(chargeableKg) {
  return Math.max(0, (chargeableKg - 0.5) / 0.5);
}

function listPricePaise(zone, chargeableKg) {
  return BASE_PAISE[zone] + extraHalfKilos(chargeableKg) * PER_HALF_KG_PAISE[zone];
}

// Multiply first so whole-paise results stay exact.
function addPercent(paise, percent) {
  return (paise * (100 + percent)) / 100;
}

// The only rounding step.
function toRupees(paise) {
  return Math.round(paise) / 100;
}

// Throws ValidationError on bad input; see requireCity/requireWeight/requireDims/requireService.
function quote(rawFrom, rawTo, rawWeightKg, rawService, rawDims) {
  const from = requireCity('from', rawFrom);
  const to = requireCity('to', rawTo);
  const weightKg = requireWeight(rawWeightKg);
  const service = requireService(rawService);
  const dims = requireDims(rawDims);

  const zone = zoneFor(from, to);
  const chargeableKg = chargeableWeight(weightKg, dims);
  let beforeTaxPaise = addPercent(listPricePaise(zone, chargeableKg), FUEL_PERCENT);
  if (service === 'express') beforeTaxPaise = addPercent(beforeTaxPaise, EXPRESS_PERCENT);
  const totalPaise = addPercent(beforeTaxPaise, GST_PERCENT);
  return {
    zone,
    chargeableKg,
    beforeTax: toRupees(beforeTaxPaise),
    total: toRupees(totalPaise),
  };
}

module.exports = { quote, zoneFor, chargeableWeight, ValidationError, MAX_WEIGHT_KG, MAX_DIM_CM };

if (require.main === module) {
  const a = process.argv.slice(2);
  try {
    // The weight is passed through as typed so '2.3kg' is rejected rather than read as 2.3.
    const q = quote(a[0], a[1], a[2], a[3], a[4]);
    console.log(`Zone ${q.zone}, ${q.chargeableKg} kg, total Rs ${q.total.toFixed(2)}`);
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    console.error(`Invalid input - ${err.message}`);
    console.error('Usage: node ratecalc.js <from> <to> <weightKg> [standard|express] [LxWxH cm]');
    process.exitCode = 1;
  }
}
