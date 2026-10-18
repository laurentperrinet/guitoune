/* Synthetic plucked strings for the tests.
 *
 * Everything is deterministic: each signal takes an explicit seed, so that a failure can be
 * reproduced and the runs are comparable. No dependency. */

// Linear congruential generator, uniform in [0, 1)
export function rng(seed){
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Standard normal variable (Box-Muller)
export function gaussian(random){
  return Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());
}

// Amplitudes of the partials 1, 2, 3, ... of a note
export const SPECTRA = {
  strong : [1, 0.6, 0.4, 0.3, 0.2, 0.1],   // plucked string, strong fundamental
  weak   : [0.15, 1, 0.7, 0.5, 0.3, 0.2],   // fundamental weaker than the second partial
  missing: [0.02, 1, 0.8, 0.5, 0.3, 0.2]    // small loudspeaker or phone microphone
};

// Strings of some instruments (Hz), lowest first, for A4 = 440 Hz
export const INSTRUMENTS = {
  guitar : [82.41, 110.0, 146.83, 196.0, 246.94, 329.63],
  bass   : [41.2, 55.0, 73.42, 98.0],
  ukulele: [392.0, 261.63, 329.63, 440.0]
};

// Frequency of the first partial of a string tuned to `freq` with inharmonicity `B`:
// the partial k is at k * freq * sqrt(1 + B * k^2), so the first one is slightly above `freq`
export function firstPartial(freq, B = 0){
  return freq * Math.sqrt(1 + B);
}

export function centsError(measured, reference){
  return 1200 * Math.log2(measured / reference);
}

/* One analysis window of a decaying plucked string.
 * Args:
 *   freq: tuning of the string (Hz); sampleRate: sampling frequency (Hz);
 *   length: number of samples (the newest at the end);
 *   spectrum: amplitudes of the partials (SPECTRA);
 *   inharmonicity: coefficient B of the stiff string (no unit), 0 for exact harmonics;
 *   snrDb: ratio between the string and white noise (dB), Infinity for no noise;
 *   decay: decay speed of the partials, 1 for a normal string (no unit);
 *   hum: add 50 Hz mains hum with its 2nd and 3rd harmonics;
 *   rumble: amplitude of an 18 Hz rumble (full scale = 1); dc: constant offset (full scale = 1);
 *   level: RMS of the string alone (full scale = 1), measured over the newest `levelWindow` samples
 *   (default: all of them), so that a note that dies away is still loud where it is analysed;
 *   onset: time of the first sample since the pluck (s), negative when the buffer starts before it
 *   (the string is silent until the pluck);
 *   attack: level of the click of the attack of the string, as a multiple of `level` (decays in 15 ms);
 *   seed: seed of the random phases and of the noise.
 * Returns: Float32Array. */
export function pluck({freq, sampleRate = 48000, length = 16384, spectrum = SPECTRA.strong, inharmonicity = 0,
                       snrDb = Infinity, decay = 1, hum = false, rumble = 0, dc = 0, level = 0.05, levelWindow = length,
                       attack = 0, onset = 0.15, seed = 1}){
  const random = rng(seed);
  const phases = spectrum.map(() => 2 * Math.PI * random());
  const x = new Float64Array(length);
  let energy = 0;
  for (let i = 0; i < length; i++){
    const t = onset + i / sampleRate;
    let v = 0;
    if (t >= 0) spectrum.forEach((amplitude, index) => {
      const k = index + 1;
      const f = k * freq * Math.sqrt(1 + inharmonicity * k * k);
      v += amplitude * Math.exp(-t * decay * (1.2 + 0.5 * k)) * Math.sin(2 * Math.PI * f * t + phases[index]);
    });
    x[i] = v;
    if (i >= length - levelWindow) energy += v * v;
  }
  const gain = level / Math.sqrt(energy / levelWindow);
  const sigma = Number.isFinite(snrDb) ? level / Math.pow(10, snrDb / 20) : 0;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++){
    const t = i / sampleRate;
    let v = x[i] * gain + (sigma ? sigma * gaussian(random) : 0) + dc;
    const sincePluck = onset + i / sampleRate;
    if (attack && sincePluck >= 0) v += attack * level * gaussian(random) * Math.exp(-sincePluck / 0.015);
    if (hum) v += 0.015 * (Math.sin(2 * Math.PI * 50 * t) + 0.6 * Math.sin(2 * Math.PI * 100 * t) + 0.3 * Math.sin(2 * Math.PI * 150 * t));
    if (rumble) v += rumble * Math.sin(2 * Math.PI * 18 * t + 1);
    out[i] = v;
  }
  return out;
}

// White noise of standard deviation `sigma`
export function whiteNoise(length, sigma, seed){
  const random = rng(seed);
  return Float32Array.from({length}, () => sigma * gaussian(random));
}
