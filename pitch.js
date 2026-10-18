/* Pitch detection for Guitoune.
 *
 * Pure signal processing: no DOM and no Web Audio, so that the same file runs in the page
 * (as an ES module) and in the Node tests (tests/pitch.test.js).
 *
 * Algorithm: McLeod pitch method (MPM). The normalised square difference function
 *
 *     n(tau) = 2 r(tau) / m(tau),   r(tau) = sum_j x[j] x[j+tau],   m(tau) = sum_j (x[j]^2 + x[j+tau]^2)
 *
 * lies in [-1, 1] whatever the level. The first lobe whose peak is close to the highest one is
 * taken as the period. r(tau) is computed with an FFT, in O(N log N) instead of O(N^2).
 *
 * Choices made from measurements on synthetic strings (see CHANGELOG.md, "what was measured on the detection"):
 *   - PEAK_RATIO is high (0.97): with the usual 0.9, a note with an almost absent fundamental that
 *     dies away quickly was read one octave too high;
 *   - the band searched is the one of the tuning (searchBand), so that 50 Hz mains hum is out of it;
 *   - a high-pass filter is applied first: a low-frequency rumble keeps n(tau) positive over the
 *     whole search range, and no peak is found at all;
 *   - a low-pass filter follows: without it, a noise at 15 dB below the note gave a 4 cents error
 *     (1 cent with it), nearly half of the notes at 12 dB or less were not read, and the broadband
 *     click of the attack of the string made the period read one octave too low: it lowers n(tau) at the
 *     true period (about 0.76 instead of 1) and leaves it a little higher at twice the period;
 *   - CLARITY_MIN is high (0.8): with the low-pass, noisy notes are read again, and some of them wrongly;
 *   - the signal is not windowed: a Hann window biased the reading sharp (+0.65 cent at 82 Hz). */

/*============== CONFIG =================*/
export const PITCH_CONFIG = {
  FFT_SIZE        : 16384,  // samples kept from the microphone, the longest window ever needed (bass)
  PERIODS         : 6,      // periods of the lowest string that a window must contain
  MIN_WINDOW      : 2048,   // shortest window (samples)
  SETTLE_SAMPLES  : 2048,   // samples filtered before the window, so that the filter has settled
  HP_RATIO        : 0.6,    // high-pass cut-off, as a fraction of the lowest searched frequency (no unit)
  LP_RATIO        : 3,      // low-pass cut-off, as a multiple of the highest searched frequency (no unit)
  RMS_THRESHOLD   : 0.005,  // minimum level of the signal (full scale = 1)
  CLARITY_MIN     : 0.8,    // minimum value of n(tau) at the chosen peak (no unit)
  PEAK_RATIO      : 0.97,   // a peak is accepted when n(tau) >= PEAK_RATIO * highest peak (no unit)
  MIN_FREQ        : 35,     // lowest searched frequency (Hz)
  MAX_FREQ        : 1000,   // highest searched frequency (Hz)
  MEDIAN_LENGTH   : 3,      // latest readings whose median is the reference of the spike filter
  SPIKE_CENTS     : 50,     // a reading farther than this from that median is replaced by it (cents)
  HOLD_FRAMES     : 2,      // analyses a new string must stay the closest before it is selected
  DROPOUT_FRAMES  : 2,      // analyses without a reading during which the last string is kept
  ACTIVITY_CENTS  : 60,     // half-width of the band, around a string, where its energy is looked for (cents)
  ACTIVITY_BINS   : 8,      // FFT bins wanted between the two closest strings: twice the half-width of the main lobe (no unit)
  ACTIVITY_SPAN_DB: 40,     // range between the noise floor of a string and its full activity (dB)
  ACTIVITY_RISE_DB: 0.5,    // speed at which the noise floor of a string rises towards a steady level (dB per s)
  ACTIVITY_SILENCE_DB: -150  // a level below this (dB) is a digital silence: it is ignored, not taken for a noise floor
};

/*============== FFT =================*/
const tables = new Map();    // per size: twiddle factors and bit reversal
const scratch = new Map();   // per size: work buffers, reused to avoid allocating at each analysis

function tablesFor(size){
  let t = tables.get(size);
  if (t) return t;
  const cos = new Float64Array(size / 2), sin = new Float64Array(size / 2);
  for (let k = 0; k < size / 2; k++){
    cos[k] = Math.cos(2 * Math.PI * k / size);
    sin[k] = -Math.sin(2 * Math.PI * k / size);
  }
  const rev = new Uint32Array(size);
  const bits = Math.log2(size);
  for (let i = 0; i < size; i++){
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    rev[i] = r;
  }
  t = {cos, sin, rev};
  tables.set(size, t);
  return t;
}

// In-place radix-2 FFT of a power-of-two size. The inverse is not scaled.
export function fft(re, im, inverse = false){
  const size = re.length;
  const {cos, sin, rev} = tablesFor(size);
  for (let i = 0; i < size; i++){
    const j = rev[i];
    if (j > i){
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= size; len <<= 1){
    const half = len >> 1, step = size / len;
    for (let start = 0; start < size; start += len){
      for (let k = 0; k < half; k++){
        const wr = cos[k * step], wi = inverse ? -sin[k * step] : sin[k * step];
        const a = start + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr;        im[a] += xi;
      }
    }
  }
}

function nextPow2(n){
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/*============== HIGH-PASS FILTER =================*/
let filtered = new Float64Array(0);   // output of highPass(), reused

/* Fourth-order high-pass (two identical second-order sections with Q = 1/sqrt(2), -6 dB at the
 * cut-off), applied to buf[from .. from + count). The result is in a shared buffer that is
 * overwritten by the next call.
 * Args:
 *   buf: Float32Array of samples; from, count: part to filter (samples);
 *   sampleRate: sampling frequency (Hz); cutoff: cut-off frequency (Hz). */
export function highPass(buf, from, count, sampleRate, cutoff){
  if (filtered.length < count) filtered = new Float64Array(count);
  const w = 2 * Math.PI * cutoff / sampleRate, cw = Math.cos(w), alpha = Math.sin(w) * Math.SQRT1_2;
  const a0 = 1 + alpha;
  const b0 = (1 + cw) / 2 / a0, b1 = -(1 + cw) / a0, a1 = -2 * cw / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;          // first section
  let u1 = 0, u2 = 0, z1 = 0, z2 = 0;          // second section
  for (let i = 0; i < count; i++){
    const x = buf[from + i];
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    const z = b0 * y + b1 * u1 + b0 * u2 - a1 * z1 - a2 * z2;
    u2 = u1; u1 = y; z2 = z1; z1 = z;
    filtered[i] = z;
  }
  return filtered;
}

/* Second-order low-pass filter (Q = 1/sqrt(2), -3 dB at the cut-off), applied in place.
 * It removes the broadband noise and the click of the attack of the string, which are mostly above
 * the harmonics that give the period.
 * Args:
 *   data: Float64Array, filtered in place; count: samples to filter;
 *   sampleRate: sampling frequency (Hz); cutoff: cut-off frequency (Hz), kept below 0.45 sampleRate. */
export function lowPass(data, count, sampleRate, cutoff){
  const w = 2 * Math.PI * Math.min(cutoff, 0.45 * sampleRate) / sampleRate;
  const cw = Math.cos(w), alpha = Math.sin(w) * Math.SQRT1_2;
  const a0 = 1 + alpha;
  const b0 = (1 - cw) / 2 / a0, b1 = (1 - cw) / a0, a1 = -2 * cw / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < count; i++){
    const x = data[i];
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    data[i] = y;
  }
}

/*============== PITCH =================*/
// Number of samples to analyse: enough periods of the lowest string, and never more than available.
export function windowLength(sampleRate, minFreq, available){
  const wanted = Math.ceil(PITCH_CONFIG.PERIODS * sampleRate / minFreq);
  return Math.min(available, Math.max(PITCH_CONFIG.MIN_WINDOW, wanted));
}

// Search band of a tuning: from a little below its lowest string to a little above its highest,
// so that a harmonic or a sub-harmonic outside the strings cannot be mistaken for the pitch.
export function searchBand(freqs, captureCents){
  const margin = Math.pow(2, captureCents / 1200);
  return {
    minFreq: Math.max(PITCH_CONFIG.MIN_FREQ, Math.min(...freqs) / margin),
    maxFreq: Math.min(PITCH_CONFIG.MAX_FREQ, Math.max(...freqs) * margin)
  };
}

/* Detects the pitch of the most recent samples of `buf`.
 * Args:
 *   buf: Float32Array, mono samples (-1..1), the newest at the end.
 *   sampleRate: sampling frequency (Hz).
 *   options.minFreq, options.maxFreq: searched band (Hz), default MIN_FREQ and MAX_FREQ.
 *   options.length: number of samples to analyse, default windowLength() for minFreq.
 *   options.filter: false to skip the high-pass and low-pass filters (tests only), default true.
 * Returns: {freq (Hz), clarity (0..1)} or null when the signal is too quiet or not periodic. */
export function detectPitch(buf, sampleRate, options = {}){
  const minFreq = options.minFreq ?? PITCH_CONFIG.MIN_FREQ;
  const maxFreq = options.maxFreq ?? PITCH_CONFIG.MAX_FREQ;
  const n = options.length ?? windowLength(sampleRate, minFreq, buf.length);
  const start = buf.length - n;

  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(n - 2, Math.ceil(sampleRate / minFreq));
  if (maxLag <= minLag + 2) return null;

  // The window, high-passed: the filter runs on some earlier samples too, to settle first
  let src = buf, offset = start;
  if (options.filter !== false){
    const settle = Math.min(start, PITCH_CONFIG.SETTLE_SAMPLES);
    src = highPass(buf, start - settle, n + settle, sampleRate, PITCH_CONFIG.HP_RATIO * minFreq);
    lowPass(src, n + settle, sampleRate, PITCH_CONFIG.LP_RATIO * maxFreq);
    offset = settle;
  }

  // Remove the mean: a DC offset would correlate with itself at every lag
  let mean = 0;
  for (let i = 0; i < n; i++) mean += src[offset + i];
  mean /= n;

  const size = nextPow2(2 * n);   // zero padding avoids the circular wrap of the correlation
  let work = scratch.get(size);
  if (!work){ work = {re: new Float64Array(size), im: new Float64Array(size), x: new Float64Array(n)}; scratch.set(size, work); }
  const {re, im} = work;
  const x = work.x.length === n ? work.x : (work.x = new Float64Array(n));

  let energy = 0;
  for (let i = 0; i < n; i++){
    const v = src[offset + i] - mean;
    x[i] = v;
    re[i] = v;
    energy += v * v;
  }
  if (Math.sqrt(energy / n) < PITCH_CONFIG.RMS_THRESHOLD) return null;
  re.fill(0, n);
  im.fill(0);

  // Autocorrelation r(tau) = IFFT(|FFT(x)|^2)
  fft(re, im);
  for (let i = 0; i < size; i++){ re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
  fft(re, im, true);

  // n(tau) = 2 r(tau) / m(tau), with m updated recursively from the squares of the samples
  const nsdf = new Float64Array(maxLag + 2);
  let m = 2 * energy;
  for (let tau = 0; tau <= maxLag + 1; tau++){
    if (tau > 0) m -= x[tau - 1] * x[tau - 1] + x[n - tau] * x[n - tau];
    nsdf[tau] = m > 1e-12 ? 2 * (re[tau] / size) / m : 0;
  }

  // Key maxima: the highest point of each lobe above zero, after the lobe around tau = 0
  let pos = 0;
  while (pos <= maxLag && nsdf[pos] > 0) pos++;
  const keys = [];
  while (pos <= maxLag){
    while (pos <= maxLag && nsdf[pos] <= 0) pos++;
    let best = -1;
    while (pos <= maxLag && nsdf[pos] > 0){
      if (best < 0 || nsdf[pos] > nsdf[best]) best = pos;
      pos++;
    }
    if (best >= minLag && best < maxLag) keys.push(best);
  }
  if (keys.length === 0) return null;

  let highest = -1;
  for (const k of keys) if (nsdf[k] > highest) highest = nsdf[k];
  const peak = keys.find(k => nsdf[k] >= PITCH_CONFIG.PEAK_RATIO * highest);

  // Parabolic interpolation around the peak, for a period in fractions of a sample
  const y1 = nsdf[peak - 1], y2 = nsdf[peak], y3 = nsdf[peak + 1];
  const curvature = y1 - 2 * y2 + y3;
  const delta = curvature < 0 ? 0.5 * (y1 - y3) / curvature : 0;
  const clarity = y2 - 0.25 * (y1 - y3) * delta;
  if (clarity < PITCH_CONFIG.CLARITY_MIN) return null;

  return {freq: sampleRate / (peak + delta), clarity: Math.min(1, clarity)};
}

/*============== ACTIVITY OF THE STRINGS =================*/
const windowTables = new Map();    // per size: window and its sum
const activityScratch = new Map(); // per size: work buffers

// Blackman-Harris window (4 terms): its side lobes are at -92 dB, where those of a Hann window (-31 dB,
// falling slowly) let a note light every other string at about -50 dB. The price is a main lobe of
// +-4 bins instead of +-2, hence ACTIVITY_BINS.
function blackmanHarris(size){
  let table = windowTables.get(size);
  if (!table){
    const w = new Float64Array(size);
    let sum = 0;
    for (let i = 0; i < size; i++){
      const x = 2 * Math.PI * i / size;
      w[i] = 0.35875 - 0.48829 * Math.cos(x) + 0.14128 * Math.cos(2 * x) - 0.01168 * Math.cos(3 * x);
      sum += w[i];
    }
    table = {w, sum};
    windowTables.set(size, table);
  }
  return table;
}

/* Energy of the sound near each string, to show which notes are sounding besides the one detected.
 * The newest samples are windowed (Blackman-Harris) and transformed; for each string, the highest level in a band of
 * +-ACTIVITY_CENTS around its frequency is kept. The window is long enough for the two closest strings
 * to be ACTIVITY_BINS bins apart (16384 samples for a guitar, which is the most that the buffer holds,
 * and for a bass, whose strings are then 4.7 bins apart; 8192 for a ukulele), so that a component that
 * is not on a string, such as the 2nd harmonic of the A2 between the G3 and the B3, does not leak into
 * the band of one of them.
 * Note that the harmonics of the note played are in the band of other strings: the third harmonic of
 * the E2 of a guitar is at the B3.
 * Args:
 *   buf: Float32Array, mono samples (-1..1), the newest at the end;
 *   sampleRate: sampling frequency (Hz); freqs: frequency of each string (Hz).
 * Returns: Array of levels (dB, relative to a sine of amplitude 1), one per string; -180 for silence. */
export function stringActivity(buf, sampleRate, freqs){
  let spacing = Infinity;
  for (let i = 0; i < freqs.length; i++) for (let j = i + 1; j < freqs.length; j++){
    const d = Math.abs(freqs[i] - freqs[j]);
    if (d > 1e-6 && d < spacing) spacing = d;
  }
  const wanted = Number.isFinite(spacing) ? Math.ceil(PITCH_CONFIG.ACTIVITY_BINS * sampleRate / spacing) : 2048;
  let largest = 1;
  while (largest * 2 <= buf.length) largest *= 2;
  if (largest < 2048) return freqs.map(() => -180);
  let size = 2048;
  while (size < wanted && size * 2 <= largest) size *= 2;

  let work = activityScratch.get(size);
  if (!work){ work = {re: new Float64Array(size), im: new Float64Array(size)}; activityScratch.set(size, work); }
  const {re, im} = work;
  const {w: window, sum: windowSum} = blackmanHarris(size), start = buf.length - size;
  for (let i = 0; i < size; i++) re[i] = buf[start + i] * window[i];
  im.fill(0);
  fft(re, im);

  const half = size / 2, binHz = sampleRate / size, margin = Math.pow(2, PITCH_CONFIG.ACTIVITY_CENTS / 1200);
  return Array.from(freqs, f => {
    const lo = Math.max(1, Math.floor(f / margin / binHz)), hi = Math.min(half - 1, Math.ceil(f * margin / binHz));
    let best = 0;
    for (let k = lo; k <= hi; k++){
      const power = re[k] * re[k] + im[k] * im[k];
      if (power > best) best = power;
    }
    // A sine of amplitude A gives |X| = A * (sum of the window) / 2 at its bin
    return 20 * Math.log10(2 * Math.sqrt(best) / windowSum + 1e-9);
  });
}

/* Turns the levels of the strings into activities between 0 and 1, so that the display never goes blank
 * and a note stands out. Each string has its own noise floor: it follows the lowest level seen, at once
 * downwards and slowly upwards (ACTIVITY_RISE_DB per second), so that a quiet room still makes the
 * margins move whatever its level (the activity of noise is 0.29 on average, with 0.15 or more nine frames
 * in ten), and a note that is held fades out after some time. The activity is the level above that floor,
 * over ACTIVITY_SPAN_DB. A level below ACTIVITY_SILENCE_DB (exact zeros: no microphone is that quiet) gives
 * 0 and leaves the floor alone, otherwise the leakage of a note would light every other string.
 * update(levels, seconds) takes the levels (dB) and the time since the previous call (s). */
export function createActivityMeter(config = PITCH_CONFIG){
  let floors = null;   // per string; null until the string has had a level that is not a digital silence
  function update(levels, seconds){
    if (!floors || floors.length !== levels.length) floors = levels.map(() => null);
    return levels.map((level, i) => {
      if (level <= config.ACTIVITY_SILENCE_DB) return 0;
      if (floors[i] === null || level < floors[i]) floors[i] = level;
      else floors[i] += Math.min(level - floors[i], config.ACTIVITY_RISE_DB * seconds);
      return Math.max(0, Math.min(1, (level - floors[i]) / config.ACTIVITY_SPAN_DB));
    });
  }
  function reset(){ floors = null; }
  return {update, reset};
}

/*============== STRINGS AND TRACKING =================*/
export function centsBetween(freq, reference){
  return 1200 * Math.log2(freq / reference);
}

function median(values){
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/* Follows the readings over time so that the displayed string does not flicker.
 *   - a spike filter removes isolated wrong readings (octave jumps, tails of notes): the latest reading
 *     is kept, unless it is farther than SPIKE_CENTS from the median of the last MEDIAN_LENGTH ones, which
 *     is then used instead. A plain median would do the same, but delays the display by about 90 ms
 *     (131 ms instead of 40 ms while a peg is turned at 20 cents per second);
 *   - a string is selected only when it stays the closest for HOLD_FRAMES analyses in a row,
 *     unless there is none yet or the current one is out of range;
 *   - a short gap without a reading keeps the last string for DROPOUT_FRAMES analyses.
 * update(freq, strings, captureCents) returns {freq, activeIdx, held}:
 *   freq: frequency (Hz) after the spike filter, or null; activeIdx: index in `strings` (objects with a
 *   `freq`), or -1; held: true when there was no reading and the last string is kept. */
export function createTracker(config = PITCH_CONFIG){
  let recent = [];
  let current = -1;
  let candidate = -1;
  let candidateCount = 0;
  let misses = 0;
  let lastFreq = null;

  function reset(){
    recent = []; current = -1; candidate = -1; candidateCount = 0; misses = 0; lastFreq = null;
  }

  function nearest(freq, strings, captureCents){
    let idx = -1, best = Infinity;
    strings.forEach((s, i) => {
      const d = Math.abs(centsBetween(freq, s.freq));
      if (d < best){ best = d; idx = i; }
    });
    return best <= captureCents ? idx : -1;
  }

  function update(freq, strings, captureCents){
    if (freq === null || freq === undefined){
      misses++;
      if (current >= 0 && misses <= config.DROPOUT_FRAMES) return {freq: lastFreq, activeIdx: current, held: true};
      reset();
      return {freq: null, activeIdx: -1, held: false};
    }
    misses = 0;
    recent.push(freq);
    if (recent.length > config.MEDIAN_LENGTH) recent.shift();
    // The latest reading, unless it jumps away from the median of the last ones
    const middle = median(recent);
    const spiked = recent.length >= 3 && Math.abs(centsBetween(freq, middle)) > config.SPIKE_CENTS;
    const smoothed = spiked ? middle : freq;
    lastFreq = smoothed;

    const idx = nearest(smoothed, strings, captureCents);
    if (idx === current || idx < 0){
      current = idx; candidate = -1; candidateCount = 0;
    } else if (current < 0 || Math.abs(centsBetween(smoothed, strings[current].freq)) > captureCents){
      current = idx; candidate = -1; candidateCount = 0;
    } else {
      candidateCount = idx === candidate ? candidateCount + 1 : 1;
      candidate = idx;
      if (candidateCount >= config.HOLD_FRAMES){ current = idx; candidate = -1; candidateCount = 0; }
    }
    return {freq: smoothed, activeIdx: current, held: false};
  }

  return {update, reset};
}
