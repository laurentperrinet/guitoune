/* Tests of the pitch detection (pitch.js).
 * Run with `npm test`. The thresholds are those measured on the synthetic strings of synth.js:
 * see the entry "what was measured on the detection" of the CHANGELOG. */

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PITCH_CONFIG, fft, highPass, lowPass, windowLength, searchBand, detectPitch, centsBetween, createTracker,
        createLevelGate, stringActivity, createActivityMeter} from '../pitch.js';
import {SPECTRA, INSTRUMENTS, pluck, whiteNoise, firstPartial, centsError, rng, gaussian} from './synth.js';

const CAPTURE_CENTS = 100;   // as DSP_CONFIG.CAPTURE_CENTS in index.html

// Detects the note of a window, with the band of the instrument as the page does
function read(signal, strings, sampleRate = 48000){
  return detectPitch(signal, sampleRate, searchBand(strings, CAPTURE_CENTS));
}

// All the (instrument, string, detune) combinations, with a different seed for each
function* notes({detunes = [-30, 0, 25], sampleRates = [48000]} = {}){
  let seed = 1;
  for (const [instrument, strings] of Object.entries(INSTRUMENTS)){
    for (const base of strings) for (const detune of detunes) for (const sampleRate of sampleRates){
      yield {instrument, strings, freq: base * Math.pow(2, detune / 1200), sampleRate, seed: seed++};
    }
  }
}

test('ideal harmonic tones are read within 0.5 cent, on guitar, bass and ukulele, at 44.1 and 48 kHz', () => {
  let worst = 0, count = 0;
  for (const n of notes({sampleRates: [44100, 48000]})){
    const out = read(pluck({freq: n.freq, sampleRate: n.sampleRate, seed: n.seed}), n.strings, n.sampleRate);
    assert.ok(out, `no reading for ${n.freq.toFixed(2)} Hz`);
    worst = Math.max(worst, Math.abs(centsError(out.freq, n.freq)));
    count++;
  }
  assert.ok(count >= 70, `only ${count} notes tested`);
  assert.ok(worst < 0.5, `worst error ${worst.toFixed(3)} cent`);
});

test('a missing fundamental on a note that dies away fast is not read an octave too high', () => {
  // With a peak ratio of 0.9 or less, 6 of these 12 notes are read one octave too high.
  // The level is set on the analysed window, as a note that has decayed is amplified by the gain control of a phone.
  let seed = 1;
  for (const base of INSTRUMENTS.guitar) for (const detune of [-23, 7]){
    const freq = base * Math.pow(2, detune / 1200);
    const signal = pluck({freq, spectrum: SPECTRA.missing, decay: 8, snrDb: 60, length: 8192 + 4096, levelWindow: 8192, onset: 0.15, seed: seed++}).slice(-8192);
    const out = read(signal, INSTRUMENTS.guitar);
    assert.ok(out, `no reading for ${freq.toFixed(2)} Hz`);
    assert.ok(Math.abs(centsError(out.freq, freq)) < 10, `${freq.toFixed(2)} Hz read as ${out.freq.toFixed(2)} Hz`);
  }
});

test('a weak fundamental on a normal note is read right', () => {
  for (const n of notes({detunes: [-23, 7]})){
    if (n.instrument !== 'guitar') continue;
    const out = read(pluck({freq: n.freq, spectrum: SPECTRA.weak, snrDb: 40, seed: n.seed}), n.strings);
    assert.ok(out && Math.abs(centsError(out.freq, n.freq)) < 1, `${n.freq.toFixed(2)} Hz`);
  }
});

test('a stiff string reads a few cents above its first partial, never more than 4', () => {
  for (const n of notes({detunes: [0]})){
    if (n.instrument !== 'guitar') continue;
    const B = 4e-4;
    const out = read(pluck({freq: n.freq, inharmonicity: B, seed: n.seed}), n.strings);
    const error = centsError(out.freq, firstPartial(n.freq, B));
    assert.ok(error > -0.5 && error < 4, `${n.freq.toFixed(2)} Hz: ${error.toFixed(2)} cents`);
  }
});

test('white noise: within 0.5 cent at 25 dB and 1.5 cents at 15 dB (without the low-pass, 4 cents at 15 dB)', () => {
  for (const [snrDb, limit] of [[25, 0.5], [15, 1.5]]){
    for (const n of notes({detunes: [7]})){
      if (n.instrument !== 'guitar') continue;
      const out = read(pluck({freq: n.freq, snrDb, seed: n.seed}), n.strings);
      assert.ok(out, `no reading at ${snrDb} dB for ${n.freq.toFixed(2)} Hz`);
      assert.ok(Math.abs(centsError(out.freq, n.freq)) < limit, `${snrDb} dB, ${n.freq.toFixed(2)} Hz: ${centsError(out.freq, n.freq).toFixed(2)} cents`);
    }
  }
});

test('notes are still read at 8 dB of noise, and none is read wrongly', () => {
  // Without the low-pass filter, 22 of 108 such notes are read; with it, all of them.
  let readCount = 0, count = 0;
  for (const n of notes({detunes: [-23, 7]})){
    if (n.instrument !== 'guitar') continue;
    for (const spectrum of Object.values(SPECTRA)){
      const out = read(pluck({freq: n.freq, spectrum, snrDb: 8, seed: n.seed}), n.strings);
      count++;
      if (!out) continue;
      readCount++;
      assert.ok(Math.abs(centsError(out.freq, n.freq)) < 100, `${n.freq.toFixed(2)} Hz read as ${out.freq.toFixed(2)} Hz`);
    }
  }
  assert.ok(readCount >= 0.95 * count, `only ${readCount} of ${count} notes read`);
});

test('the click of the attack of the string does not make the note read an octave too low', () => {
  // The buffer ends 80 ms after the pluck: silence, then a click 3 times as loud as the note, then the note.
  // Without the low-pass filter, 10 of 36 such notes are read one octave or a twelfth too low.
  const tEnd = 0.08;
  let seed = 1, read36 = 0, count = 0;
  for (const base of INSTRUMENTS.guitar) for (const spectrum of Object.values(SPECTRA)) for (const detune of [-23, 7]){
    const freq = base * Math.pow(2, detune / 1200);
    const signal = pluck({freq, spectrum, attack: 3, snrDb: 40, onset: tEnd - 16384 / 48000, levelWindow: Math.round(tEnd * 48000), seed: seed++});
    const out = read(signal, INSTRUMENTS.guitar);
    count++;
    if (!out) continue;
    read36++;
    assert.ok(Math.abs(centsError(out.freq, freq)) < 100, `${freq.toFixed(2)} Hz read as ${out.freq.toFixed(2)} Hz`);
  }
  assert.ok(read36 >= 30, `only ${read36} of ${count} notes read`);
});

test('50 Hz mains hum does not produce a wrong reading', () => {
  for (const spectrum of Object.values(SPECTRA)){
    for (const n of notes({detunes: [-23, 7]})){
      if (n.instrument !== 'guitar') continue;
      const out = read(pluck({freq: n.freq, spectrum, hum: true, snrDb: 25, seed: n.seed}), n.strings);
      assert.ok(out, `no reading for ${n.freq.toFixed(2)} Hz`);
      assert.ok(Math.abs(centsError(out.freq, n.freq)) < 10, `${n.freq.toFixed(2)} Hz read as ${out.freq.toFixed(2)} Hz`);
    }
  }
});

test('a constant offset and a strong 18 Hz rumble do not prevent the reading', () => {
  for (const disturbance of [{dc: 0.2}, {rumble: 0.1}]){
    for (const n of notes({detunes: [-23, 7]})){
      if (n.instrument !== 'guitar') continue;
      const out = read(pluck({freq: n.freq, snrDb: 40, seed: n.seed, ...disturbance}), n.strings);
      assert.ok(out, `no reading for ${n.freq.toFixed(2)} Hz with ${JSON.stringify(disturbance)}`);
      assert.ok(Math.abs(centsError(out.freq, n.freq)) < 2, `${n.freq.toFixed(2)} Hz: ${centsError(out.freq, n.freq).toFixed(2)} cents`);
    }
  }
});

test('silence, faint hiss and white noise are not taken for a note', () => {
  const strings = INSTRUMENTS.guitar;
  assert.equal(read(new Float32Array(16384), strings), null);
  assert.equal(read(whiteNoise(16384, 0.001, 3), strings), null);
  let accepted = 0;
  for (let seed = 1; seed <= 200; seed++) if (read(whiteNoise(16384, 0.05, seed), strings)) accepted++;
  assert.equal(accepted, 0, `${accepted} of 200 frames of white noise accepted`);
});

test('the window is adapted to the lowest string', () => {
  const guitar = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS), bass = searchBand(INSTRUMENTS.bass, CAPTURE_CENTS);
  const ukulele = searchBand(INSTRUMENTS.ukulele, CAPTURE_CENTS);
  const lengths = [guitar, bass, ukulele].map(b => windowLength(48000, b.minFreq, PITCH_CONFIG.FFT_SIZE));
  assert.ok(Math.abs(lengths[0] - 3703) < 20, `guitar window ${lengths[0]}`);
  assert.ok(lengths[1] > lengths[0] && lengths[0] > lengths[2], `windows ${lengths}`);
  assert.equal(lengths[2], PITCH_CONFIG.MIN_WINDOW);
  assert.equal(windowLength(48000, 10, 5000), 5000, 'never more than the samples available');
});

test('the search band is that of the strings, with a margin, within the limits', () => {
  const guitar = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS);
  assert.ok(Math.abs(guitar.minFreq - 82.41 / Math.pow(2, 100 / 1200)) < 1e-9);
  assert.ok(Math.abs(guitar.maxFreq - 329.63 * Math.pow(2, 100 / 1200)) < 1e-9);
  assert.equal(searchBand([10, 5000], 100).minFreq, PITCH_CONFIG.MIN_FREQ);
  assert.equal(searchBand([10, 5000], 100).maxFreq, PITCH_CONFIG.MAX_FREQ);
});

test('an analysis takes well under 5 ms (about 0.3 ms on an Apple M3 Ultra)', () => {
  const strings = INSTRUMENTS.guitar, band = searchBand(strings, CAPTURE_CENTS);
  const signal = pluck({freq: 110, snrDb: 30, seed: 5});
  for (let i = 0; i < 10; i++) detectPitch(signal, 48000, band);   // warm-up
  const start = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) detectPitch(signal, 48000, band);
  const milliseconds = Number(process.hrtime.bigint() - start) / 1e6 / 100;
  assert.ok(milliseconds < 5, `${milliseconds.toFixed(2)} ms per analysis`);
});

test('the low-pass filter is at -3 dB at its cut-off, passes the strings and stops the noise above', () => {
  const sampleRate = 48000, cutoff = 1000;
  const gain = frequency => {
    const x = Float64Array.from({length: 24000}, (_, i) => Math.sin(2 * Math.PI * frequency * i / sampleRate));
    lowPass(x, x.length, sampleRate, cutoff);
    let peak = 0;
    for (let i = 12000; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
    return peak;
  };
  assert.ok(gain(100) > 0.99, `100 Hz: ${gain(100)}`);
  assert.ok(Math.abs(gain(cutoff) - Math.SQRT1_2) < 0.02, `cut-off: ${gain(cutoff)}`);
  assert.ok(gain(10000) < 0.02, `10 kHz: ${gain(10000)}`);
});

test('the FFT agrees with a direct Fourier transform, and inverts', () => {
  const size = 32, random = Array.from({length: size}, (_, i) => Math.sin(i * 1.3) + 0.5 * Math.cos(i * 0.4 + 1));
  const re = Float64Array.from(random), im = new Float64Array(size);
  fft(re, im);
  for (let k = 0; k < size; k++){
    let sr = 0, si = 0;
    for (let n = 0; n < size; n++){ sr += random[n] * Math.cos(2 * Math.PI * k * n / size); si -= random[n] * Math.sin(2 * Math.PI * k * n / size); }
    assert.ok(Math.abs(re[k] - sr) < 1e-9 && Math.abs(im[k] - si) < 1e-9, `bin ${k}`);
  }
  fft(re, im, true);
  for (let n = 0; n < size; n++) assert.ok(Math.abs(re[n] / size - random[n]) < 1e-9, `sample ${n}`);
});

test('the high-pass filter stops a rumble, passes the strings, and is at -6 dB at its cut-off', () => {
  const sampleRate = 48000, cutoff = 47;
  const gain = frequency => {
    const x = Float32Array.from({length: 24000}, (_, i) => Math.sin(2 * Math.PI * frequency * i / sampleRate));
    const y = highPass(x, 0, x.length, sampleRate, cutoff);
    let peak = 0;
    for (let i = 12000; i < x.length; i++) peak = Math.max(peak, Math.abs(y[i]));
    return peak;
  };
  assert.ok(gain(10) < 0.01, `10 Hz: ${gain(10)}`);
  assert.ok(gain(200) > 0.97, `200 Hz: ${gain(200)}`);
  assert.ok(Math.abs(gain(cutoff) - 0.5) < 0.05, `cut-off: ${gain(cutoff)}`);
});

test('centsBetween: an octave is 1200 cents, a semitone 100', () => {
  assert.ok(Math.abs(centsBetween(220, 110) - 1200) < 1e-9);
  assert.ok(Math.abs(centsBetween(110 * Math.pow(2, 1 / 12), 110) - 100) < 1e-9);
});

/*============== tracker ================*/
const strings = [{freq: 110}, {freq: 110 * Math.pow(2, 100 / 1200)}];   // two strings one semitone apart
const rawTracker = () => createTracker({...PITCH_CONFIG, MEDIAN_LENGTH: 1, HOLD_FRAMES: 2});

test('tracker: the spike filter removes an isolated wrong reading', () => {
  const tracker = createTracker();
  const out = [110, 110, 220, 110].map(f => tracker.update(f, [{freq: 110}, {freq: 220}], CAPTURE_CENTS));
  assert.deepEqual(out.map(o => o.activeIdx), [0, 0, 0, 0]);
  assert.ok(Math.abs(out[2].freq - 110) < 1e-9, `the outlier gave ${out[2].freq}`);
});

test('tracker: a pitch that changes smoothly is followed without delay', () => {
  // A peg turned at 60 cents per second: 6 cents between two analyses. A plain median of 3 would lag by one analysis.
  const tracker = createTracker(), one = [{freq: 110}];
  for (let k = 0; k < 10; k++){
    const freq = 110 * Math.pow(2, (-45 + 6 * k) / 1200);
    assert.ok(Math.abs(tracker.update(freq, one, CAPTURE_CENTS).freq - freq) < 1e-9, `analysis ${k}`);
  }
});

test('tracker: a jump to another string waits for the median, unless the reading is very clear', () => {
  const far = [{freq: 110}, {freq: 146.83}], wait = Math.floor(PITCH_CONFIG.MEDIAN_LENGTH / 2);
  // Without a clarity, the new string is shown once it is the majority of the last readings
  const tracker = createTracker();
  const plain = [110, 110, 110, 110, 146.83, 146.83, 146.83, 146.83].map(f => tracker.update(f, far, CAPTURE_CENTS).activeIdx);
  assert.deepEqual(plain.slice(4), [...Array(wait).fill(0), ...Array(4 - wait).fill(1)]);
  // A reading that is clear enough to be a new note is shown at once
  const fast = createTracker();
  const clear = [110, 110, 110, 110, 146.83, 146.83].map(f => fast.update(f, far, CAPTURE_CENTS, 0.99).activeIdx);
  assert.deepEqual(clear.slice(4), [1, 1]);
  // ... but an octave jump that is only fairly clear is still taken for a spike
  const spike = createTracker();
  const octave = [110, 110, 110, 220, 110].map(f => spike.update(f, [{freq: 110}, {freq: 220}], CAPTURE_CENTS, 0.9));
  assert.ok(Math.abs(octave[3].freq - 110) < 1e-9, `the octave jump gave ${octave[3].freq}`);
});

test('tracker: a new string needs two analyses in a row when the old one is still in range', () => {
  const tracker = rawTracker();
  const nearOld = 110 * Math.pow(2, 40 / 1200), nearNew = 110 * Math.pow(2, 60 / 1200);   // both within 100 cents of the two strings
  const sequence = [nearOld, nearOld, nearNew, nearOld, nearNew, nearNew].map(f => tracker.update(f, strings, CAPTURE_CENTS).activeIdx);
  assert.deepEqual(sequence, [0, 0, 0, 0, 0, 1]);
});

test('tracker: the string changes at once when the old one is out of range', () => {
  const tracker = rawTracker();
  const far = [{freq: 110}, {freq: 220}];
  assert.deepEqual([110, 110, 220].map(f => tracker.update(f, far, CAPTURE_CENTS).activeIdx), [0, 0, 1]);
});

test('tracker: a short gap keeps the string, the next analysis clears it, and the history restarts', () => {
  const tracker = createTracker(), kept = PITCH_CONFIG.DROPOUT_FRAMES;
  tracker.update(110, strings, CAPTURE_CENTS); tracker.update(110, strings, CAPTURE_CENTS);
  const gaps = Array.from({length: kept + 1}, () => tracker.update(null, strings, CAPTURE_CENTS));
  assert.deepEqual(gaps.map(g => [g.activeIdx, g.held]), [...Array(kept).fill([0, true]), [-1, false]]);
  const next = tracker.update(110.5, strings, CAPTURE_CENTS);
  assert.ok(Math.abs(next.freq - 110.5) < 1e-9, 'the median must not use the readings before the gap');
});

test('tracker: a pitch more than 100 cents from every string selects none', () => {
  const tracker = rawTracker();
  assert.equal(tracker.update(110 * Math.pow(2, 350 / 1200), strings, CAPTURE_CENTS).activeIdx, -1);
});

/*============== activity of the strings (margins of the display) ================*/
const sine = (frequency, amplitude, length = 16384, sampleRate = 48000) =>
  Float32Array.from({length}, (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate));

test('activity: a tone lights its own string, at its level, and the others far below', () => {
  // A2 with an amplitude of 0.1 is -20 dB; a frequency between two bins costs up to 1 dB
  const levels = stringActivity(sine(110, 0.1), 48000, INSTRUMENTS.guitar);
  assert.ok(Math.abs(levels[1] + 20) < 2, `A2: ${levels[1].toFixed(1)} dB`);
  // The leakage of the window is far below: with a Hann window the others are at about -70 dB
  levels.forEach((level, i) => { if (i !== 1) assert.ok(level < levels[1] - 70, `string ${i}: ${level.toFixed(1)} dB`); });
});

test('activity: the harmonics of the note played light the strings they fall on', () => {
  // The 3rd harmonic of the E2 is at 247.2 Hz (the B3) and the 4th at 329.6 Hz (the E4)
  const e2 = 82.41, signal = sine(e2, 0.1).map((v, i) => v + 0.04 * Math.sin(2 * Math.PI * 3 * e2 * i / 48000) + 0.04 * Math.sin(2 * Math.PI * 4 * e2 * i / 48000));
  const levels = stringActivity(signal, 48000, INSTRUMENTS.guitar);
  const [lowE, a2, d3, g3, b3, highE] = levels;
  assert.ok(b3 > a2 + 20 && b3 > d3 + 20 && highE > g3 + 20, `levels ${levels.map(l => l.toFixed(0))}`);
  assert.ok(lowE > b3 + 5, 'the note itself is the highest');
});

test('activity: the two lowest strings of a bass, 14 Hz apart, are told apart', () => {
  const levels = stringActivity(sine(41.2, 0.1), 48000, INSTRUMENTS.bass);
  assert.ok(Math.abs(levels[0] + 20) < 2, `E1: ${levels[0].toFixed(1)} dB`);
  assert.ok(levels[1] < levels[0] - 25, `A1: ${levels[1].toFixed(1)} dB`);
});

test('activity: silence gives very low, finite levels, and a short buffer is accepted', () => {
  for (const level of stringActivity(new Float32Array(16384), 48000, INSTRUMENTS.guitar)){
    assert.ok(Number.isFinite(level) && level < -100, `${level}`);
  }
  assert.deepEqual(stringActivity(new Float32Array(1000), 48000, INSTRUMENTS.guitar), INSTRUMENTS.guitar.map(() => -180));
});

// What the page does: every 0.1 s, 4800 new samples enter the buffer, and the levels go to the meter
function noiseActivities(sigma, frames, seed){
  const random = rng(seed), buffer = new Float32Array(16384), meter = createActivityMeter(), out = [];
  for (let f = 0; f < frames; f++){
    buffer.copyWithin(0, 4800);
    for (let i = 16384 - 4800; i < 16384; i++) buffer[i] = sigma * gaussian(random);
    out.push(meter.update(stringActivity(buffer, 48000, INSTRUMENTS.guitar), 0.1));
  }
  return out;
}

test('activity meter: noise alone keeps the margins moving, whatever its level', () => {
  // The activity is relative to the noise floor of each string: it is the same in a quiet room (-70 dBFS)
  // as in a noisy one (-34 dBFS). Measured: 0.29 on average, 0.15 or more nine frames in ten.
  for (const sigma of [0.0003, 0.02]){
    const settled = noiseActivities(sigma, 200, 5).slice(60), all = settled.flat();
    const mean = all.reduce((p, q) => p + q, 0) / all.length;
    const alive = settled.filter(frame => Math.max(...frame) >= 0.05).length / settled.length;
    assert.ok(mean > 0.15 && mean < 0.5, `noise ${sigma}: mean ${mean.toFixed(2)}`);
    assert.ok(alive > 0.98, `noise ${sigma}: ${(100 * alive).toFixed(0)} % of the frames are alive`);
  }
});

test('activity meter: a note stands out from the noise, and a held note fades out', () => {
  const meter = createActivityMeter();
  for (let k = 0; k < 30; k++) meter.update([-85, -86], 0.1);
  const note = meter.update([-30, -87], 0.1);
  assert.ok(note[0] === 1 && note[1] === 0, `note: ${note}`);
  // The same level for 120 s: the floor has risen to it (0.5 dB per second), the activity is gone
  let held = note;
  for (let k = 0; k < 1200; k++) held = meter.update([-30, -87], 0.1);
  assert.ok(held[0] < 0.02, `held: ${held[0]}`);
  meter.reset();
  assert.equal(meter.update([-30, -61], 0.1)[0], 0, 'after a reset the first level is the floor');
});

test('activity meter: a digital silence gives 0 and is not taken for the noise floor', () => {
  const meter = createActivityMeter();
  assert.deepEqual(meter.update([-180, -180], 0.1), [0, 0]);
  // The first real levels are the floor; a note then lights its string, and the leakage on the other does not
  meter.update([-100, -100], 0.1);
  const values = meter.update([-20, -103], 0.1);
  assert.equal(values[0], 1);
  assert.equal(values[1], 0);
});

/*============== level gate ================*/
// A room of white noise, then a note: what a user does. Returns what the gate lets through.
function playInRoom({noise, level, gated, freq = 110, spectrum = SPECTRA.strong}){
  const gate = createLevelGate(), band = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS);
  for (let k = 0; k < 12; k++){     // 1.2 s of the room: the floor is learnt
    const stats = {};
    detectPitch(whiteNoise(16384, noise, 100 + k), 48000, {...band, minRms: gated ? gate.threshold() : undefined, stats});
    gate.update(stats.rms, 0.1);
  }
  const signal = pluck({freq, spectrum, level, snrDb: 20 * Math.log10(level / noise), onset: 0.05, length: 16384, seed: 3});
  return detectPitch(signal, 48000, {...band, minRms: gated ? gate.threshold() : undefined});
}

test('gate: a soft note is read in a quiet room, and with the fixed threshold it is not', () => {
  // An RMS of 0.004 is below the fixed threshold of 0.005: nothing was read, on any string
  for (const freq of INSTRUMENTS.guitar){
    assert.equal(playInRoom({noise: 0.0005, level: 0.004, gated: false, freq}), null, `${freq} Hz, fixed threshold`);
    const out = playInRoom({noise: 0.0005, level: 0.004, gated: true, freq});
    assert.ok(out && Math.abs(centsError(out.freq, freq)) < 1, `${freq} Hz, gate`);
  }
});

test('gate: a very soft note, -56 dBFS, is read too', () => {
  const out = playInRoom({noise: 0.0003, level: 0.0015, gated: true, freq: 329.63});
  assert.ok(out && Math.abs(centsError(out.freq, 329.63)) < 1);
});

test('gate: a steady hum is never taken for a note, which the fixed threshold did', () => {
  // 150 Hz is near the D3 (146.8 Hz): +36 cents. Hum is the usual 3rd harmonic of the mains.
  const band = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS), gate = createLevelGate();
  let fixedReads = 0, gatedReads = 0;
  for (let k = 0; k < 40; k++){
    const hum = whiteNoise(16384, 0.0003, 200 + k).map((v, i) => v + 0.02 * Math.sin(2 * Math.PI * 150 * (i + k * 4800) / 48000));
    if (detectPitch(hum, 48000, band)) fixedReads++;
    const stats = {}, out = detectPitch(hum, 48000, {...band, minRms: gate.threshold(), stats});
    gate.update(stats.rms, 0.1);
    if (k >= 5 && out) gatedReads++;
  }
  assert.ok(fixedReads >= 35, `the fixed threshold read the hum ${fixedReads} times of 40`);
  assert.equal(gatedReads, 0);
});

test('gate: before the floor is known the fixed threshold applies, and a note that is already sounding at the start is ignored until it dies away', () => {
  const gate = createLevelGate(), band = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS);
  assert.equal(gate.threshold(), PITCH_CONFIG.RMS_THRESHOLD);
  const loud = pluck({freq: 196, level: 0.05, snrDb: 40, seed: 4}), stats = {};
  assert.ok(detectPitch(loud, 48000, {...band, minRms: gate.threshold(), stats}), 'the first analysis reads it');
  gate.update(stats.rms, 0.1);
  assert.equal(detectPitch(loud, 48000, {...band, minRms: gate.threshold()}), null, 'the same note, steady, is now the floor');
  // The note dies away, the floor follows it down at once, and the next note is read
  gate.update(0.00001, 0.1);
  assert.ok(detectPitch(loud, 48000, {...band, minRms: gate.threshold()}), 'then a new note is read');
});

test('gate: a hum that starts late is read for a few seconds, not for a minute', () => {
  // 5 s of a quiet room, then a 150 Hz hum (near the D3) switches on and stays; one analysis every 50 ms.
  // The floor follows a steady level 12 times faster: read for 8 s here, 74 s before.
  const band = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS), gate = createLevelGate();
  let lastRead = 0;
  for (let f = 0; f < 400; f++){
    const t0 = f * 0.05, hum = t0 >= 5;
    const x = whiteNoise(16384, 0.0003, 400 + f).map((v, i) => v + (hum ? 0.02 * Math.sin(2 * Math.PI * 150 * (i + f * 2400) / 48000) : 0));
    const stats = {}, out = detectPitch(x, 48000, {...band, minRms: gate.threshold(), stats});
    gate.update(stats.rms, 0.05);
    if (hum && out) lastRead = t0;
  }
  assert.ok(lastRead - 5 < 12, `read until ${(lastRead - 5).toFixed(1)} s after it started`);
});

test('gate: a note that rings for seconds is not mistaken for a steady sound', () => {
  // A note that decays 2 dB per second (a decay of 0.1 times a normal string), read every 50 ms for 9 s.
  // If it were taken for a steady sound, the floor would rise 12 times faster and close the gate after 7 s.
  const band = searchBand(INSTRUMENTS.guitar, CAPTURE_CENTS), gate = createLevelGate();
  const note = pluck({freq: 110, level: 0.02, snrDb: 40, decay: 0.1, length: 48000 * 10, onset: 0, seed: 8});
  for (let j = 0; j < 12; j++){ const stats = {}; detectPitch(whiteNoise(16384, 0.0003, 700 + j), 48000, {...band, minRms: gate.threshold(), stats}); gate.update(stats.rms, 0.05); }
  let read = 0, count = 0;
  for (let end = 2400; end <= 48000 * 9; end += 2400){
    const buffer = new Float32Array(16384), from = end - 16384;
    for (let i = 0; i < 16384; i++) buffer[i] = from + i >= 0 ? note[from + i] : 0;
    const stats = {}, out = detectPitch(buffer, 48000, {...band, minRms: gate.threshold(), stats});
    gate.update(stats.rms, 0.05);
    if (end >= 4800){ count++; if (out) read++; }
  }
  assert.ok(read >= 0.9 * count, `read in ${read} of ${count} analyses`);
});

test('gate: the threshold follows the noise, and is never below GATE_MIN_RMS', () => {
  const gate = createLevelGate();
  for (let k = 0; k < 10; k++) gate.update(0.002, 0.1);
  assert.ok(Math.abs(gate.threshold() - PITCH_CONFIG.GATE_RATIO * 0.002) < 1e-6, `${gate.threshold()}`);
  for (let k = 0; k < 10; k++) gate.update(1e-9, 0.1);     // a digital silence
  assert.equal(gate.threshold(), PITCH_CONFIG.GATE_MIN_RMS);
  gate.reset();
  assert.equal(gate.threshold(), PITCH_CONFIG.RMS_THRESHOLD);
});

test('detectPitch gives the level of the window in options.stats, even without a reading', () => {
  const stats = {};
  assert.equal(detectPitch(whiteNoise(16384, 0.002, 1), 48000, {minFreq: 77, maxFreq: 350, stats}), null);
  // The level is that of the filtered window: of white noise of 0.002, the share in 47-1047 Hz is a fifth
  const expected = 0.002 * Math.sqrt((1048 - 47) / 24000);
  assert.ok(Math.abs(stats.rms - expected) < 0.3 * expected, `${stats.rms} instead of about ${expected}`);
});
