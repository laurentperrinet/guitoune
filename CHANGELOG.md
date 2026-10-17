# Changelog

Dates are ISO 8601. Before 2026-10-17 the entries summarise the commit messages; none of the earlier
versions was tagged.

## 2026-10-17, detection, instruments and tests

### Changed
- Pitch detection: the McLeod method computed with an FFT replaces the plain autocorrelation
  (about 0.3 ms per analysis instead of 8 ms on an Apple M3 Ultra). The signal is no longer windowed
  (the Hann window biased the reading sharp, by 0.65 cent at 82 Hz), the band searched is derived
  from the tuning, and the window is adapted to the lowest string.
- The low-pass filter is removed. The high-pass filter is now applied by `detectPitch()` with a
  correct quality factor: Web Audio reads `Q` in dB, so the former value 0.707 was in fact 1.085.
- The note shown no longer flickers: median of the last readings, stable choice of the string,
  and the last string is kept during a short gap.
- The page loads its signal processing from `pitch.js`, as an ES module, and its `README` table of
  variables follows the code.

### Added
- Bass (4 strings, drop D) and ukulele (standard, low G, baritone) tunings: 12 tunings in all, with a
  variable number of rows.
- Interface in English and French, chosen from the browser language or in the settings.
- Battery saver in the settings (30 frames per second).
- Open Graph and Twitter tags, and a Content-Security-Policy.
- Tests with `node:test` for the detection, the tracker, and the consistency between the code, the
  README, the translations and the offline cache; GitHub Actions workflow; `.gitignore`.

### Fixed
- A strong low-frequency rumble, a constant offset or 50 Hz mains hum could give a wrong note or none.

## 2026-10-17, web app

### Added
- Hardened microphone start-up: no echo cancellation, noise suppression or automatic gain control,
  a start button, errors shown in the page, screen wake lock, suspension in the background
  (`bb95944`, `fb7cbd4`).
- Settings (tuning, reference pitch A4, fine scale), numeric readout under the note, announcements for
  screen readers, five colour themes, full screen button, help dialog with a diagram, installable
  offline web app with its icons (`7572495`, `7962cf9`, `dbf6425`, `2eec2c4`).
- Control buttons stacked in a column along the left edge (`893d349`).

### Changed
- The licence is now the AGPLv3 (`ff723d6`).
- New logo and icons: a guitar with a bouquet of flowers (`7962cf9`, `0be4b90`, `ae66629`).
- The how-to diagram is a vector image (`03e2304`).

## 2026-01-06 to 2026-01-25

- Hann window, DSP parameters and layout adjustments; debug panel, then simplified (`e65b032`,
  `2449c6a`, `0975697`, `6bda292`).
- README with a French version and a demo image (`be205cc`, `3be8907`, `dae13e3`, `61c5283`).

## 2025-12-20

- First versions: six-string tuner with a canvas per string, waterfall display, logo, README
  (`046fcde` to `9788c5b`).
