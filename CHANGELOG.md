# Changelog

🇬🇧 English · 🇫🇷 [Français](CHANGELOG.fr.md) · ⚜️ [Québécois](CHANGELOG.qc.md)

Dates are ISO 8601. Before 2026-10-17 the entries summarise the commit messages; none of the earlier
versions was tagged.

## 2026-10-18, a threshold relative to the noise, and a reading every 50 ms

### Shared on social media

* 🇬🇧 [Bluesky, announcement](https://bsky.app/profile/laurentperrinet.bsky.social/post/3my66ezvf7k2s)
* 🇫🇷 [Bluesky, announcement](https://bsky.app/profile/laurentperrinet.bsky.social/post/3my66gr7bwk2s)
* 🇬🇧 [Mastodon (neuromatch.social), announcement](https://neuromatch.social/@laurentperrinet/117463933759174531)
* 🇫🇷 [Mastodon (neuromatch.social), announcement](https://neuromatch.social/@laurentperrinet/117463926472506339)
* 🇬🇧 [Facebook, announcement](https://www.facebook.com/laurentperrinet/posts/pfbid023yCu6jqAvzFXN8Y6FMprmwvFQhtqq5fcN5Lr6v8ZnyBWHdiAhjvUB39nBPVPMTowl)
* 🇬🇧 [Reddit, comment in r/Guitar](https://www.reddit.com/r/Guitar/comments/186blxg/comment/phjcdb2/)
* 🇬🇧 [Reddit, comment in r/guitars](https://www.reddit.com/r/guitars/comments/1e0kiwj/comment/phjbt90/)
* 🇬🇧 [Reddit, comment in r/guitarlessons](https://www.reddit.com/r/guitarlessons/comments/z2imsy/comment/phjbh6j/)

### Changed
- The signal is analysed when it is 3 times above the noise floor of the room, not above a fixed level of 0.005. In a quiet room a soft note is read (an RMS of 0.004 was never read, on any string, and G3, B3 and E4 were lost first); a steady sound such as a hum is never taken for a note (a 150 Hz hum was read as the D3 in every analysis).
- A steady level makes the floor rise 12 times faster (6 dB per second instead of 0.5): a hum that started after the floor was learnt was read for 74 s, and is read for 8 s now.
- One analysis every 50 ms instead of 100 ms, and 60 rows of history to keep 3 s: a note is read 31 ms after it starts instead of 63 for the E4 (67 instead of 88 for the E2). The counts of the tracker follow: a median of 5, 4 analyses to change string, 4 to keep a string through a gap.
- A reading at least 0.95 clear is never taken for a spike, so that a string plucked while the previous one rings is shown at once: 113 ms instead of 188 for the E4 then the A2.

### Notes
- The trouble with the E4 was not reproduced on synthetic strings, which read the E4 as fast as the others. The fixed threshold is the likeliest cause: that string is quieter at the microphone and dies away sooner, and the automatic gain of the microphone is switched off.
- Two ideas gave nothing and were not kept: windows shorter than the usual one for a note that has just started, and a lower clarity near the previous reading (0.7 point of notes more, a worse 99th percentile).
- A note that is already sounding when the tuner starts is ignored until it dies away, and a note that decays by less than 2 dB in 2 s counts as a steady sound.

## 2026-10-18, language button

### Added
- A button with the flag of the current language (France, United Kingdom, Québec) cycles through French,
  English and Québécois. The choice is saved with the other settings, like the tuning; the colour theme
  already had its own saved choice.

### Changed
- French is the default language, instead of following the language of the browser: the "Automatic"
  option is gone, and a saved "auto" falls back to French. `?lang=` still forces a language until the next
  choice.

## 2026-10-18, no margin strips on the string detected

### Changed
- The row of the string detected has no margin strips: its pitch is in range and the trace shows where,
  so the strips of the other rows are what tells the notes apart. They fade out there (`STRIP_FADE_RATE`,
  about half a second) and come back when the note stops, instead of jumping.

## 2026-10-18, activity of the other strings in the margins

### Added
- Each row has a strip on its left edge for the strings that are lower than its own, and one on its right
  edge for the higher ones, one column per string, gliding upwards like the trace. They show the energy of
  the sound near each string (`stringActivity` in `pitch.js`), so that the string detected stands out.
- The margins are never blank: the activity is relative to the noise floor of each string, so a quiet room
  makes it move as much as a noisy one (0.29 on average, 0.15 or more nine frames in ten, from -74 to
  -34 dBFS); while the microphone is off, they breathe slowly, and stay still with "reduce motion".
- Tests for the levels (a tone lights its string and the others stay 70 dB below, the harmonics light the
  strings they fall on, the two lowest strings of a bass are told apart, digital silence) and for the
  noise floor.

### Notes
- The window is a Blackman-Harris one, of 16384 samples for a guitar: with a Hann window a note lit the
  other strings, and the 2nd harmonic of an A2 lit the G3 and the B3 with 8192 samples.
- The controls and the note names are moved aside by the width of a strip (`STRIP_WIDTH`).
- The how-to diagrams do not show the margins yet.

## 2026-10-18, low-pass filter and spike filter

The detection of 2026-10-17 was measured again, and some of its choices were wrong.

### Changed
- A second-order low-pass filter (cut-off at 3 times the highest searched frequency) is back in front of
  the McLeod method. Without it, white noise at 15 dB gave a 4.2 cents error (95th percentile) instead of
  0.44 cent, 46 % of the notes at 12 dB or less were not read (21 % now), and the click of the attack of
  the string made 10 of 36 notes read an octave or more too low, 80 ms after the pluck (none now).
- `CLARITY_MIN` goes from 0.6 to 0.8: with the low-pass filter, noisy notes are read again, and a
  clarity of 0.6 let 15 of 6000 random notes be read wrongly, against 4.
- The tracker uses a spike filter (`SPIKE_CENTS`, 50 cents) instead of a plain median: the display lags
  40 ms behind a pitch that changes, instead of 131 ms, and the label flickers as little.

### Fixed
- The README compared the new detection with the old algorithm without its Web Audio filters, which hid
  the loss of sensitivity to noise. The table, the flicker figures (21 gaps and 1 wrong frame before, not
  75 and 10), the accuracy claim (at most 0.2 cent, 0.6 cent for the E1 of a bass) and the explanation of
  the attack errors are corrected, and the limits of the bass (mains hum, rumble) are written down.

### Added
- Tests for the low-pass filter, the noise at 8 dB, the click of the attack, and the tracker (a pitch that
  changes smoothly is followed without delay, a jump to another string after one analysis).

### Discussions
These cover the discussions of 2026-10-18 on the detection, the margins and the tests.

- **Detection quality, second look** (started late on 2026-10-17). The seven points of the audit were
  measured again on the shipped code, and several earlier conclusions were wrong. Result: the low-pass
  filter is back, `CLARITY_MIN` is 0.8, the tracker uses a spike filter, and the README figures were
  replaced by measurements. Five tests were added and checked by mutation (without the low-pass filter
  three fail, without the spike filter the lag test fails). Committed with the margins ([`706a1cb`](https://github.com/laurentperrinet/guitoune/commit/706a1cb));
  the measurements are now in the entry below.
- **Activity margins** ([`706a1cb`](https://github.com/laurentperrinet/guitoune/commit/706a1cb), entries above). Request: show on the sides the activity of the other notes, so that
  the detected note stands out. Choices made: the real energy of the sound, lower strings on the left and
  higher ones on the right, and a slow breathing at rest. Two tuning errors were found on the way: the
  Hann window let a note light up the other strings (hence Blackman-Harris), and a noise floor set too
  high gave exactly 0 in a quiet room (hence one noise floor per string, in `createActivityMeter()`).
- **README check.** A second `/harmonize-code` run found the five steps of the model and the 27 rows of
  the table of variables consistent with `pitch.js`, in English and in French.
- **Failing tests on GitHub Actions** ([`c4185ed`](https://github.com/laurentperrinet/guitoune/commit/c4185ed)). `npm test` now runs `node --test tests/*.test.js`
  (the former command failed on Node 22) and the workflow uses `checkout@v5` and `setup-node@v5` (no more
  Node 20 deprecation warning). The README consistency tests had then failed because `LP_RATIO` and
  `SPIKE_CENTS` were missing from the table of variables and `CLARITY_MIN` still said 0.6 there: the
  table now follows the code.

## 2026-10-18, what was measured on the detection

These figures come from one-off benchmarks on **synthetic** plucked strings (6 strings, three spectra, stiffness, noise, hum, attack, 44.1 and 48 kHz, explicit seeds), comparing with the pipeline that Guitoune used before: the plain autocorrelation with a Hann window, behind two Web Audio filters. The benchmark script is not kept in the repository; its thresholds live on in [tests/pitch.test.js](tests/pitch.test.js). **No real recording was used**, and the cost on a phone has not been measured.

| Condition | Error before (median / 95th percentile) | Error now |
|-----------|------------------------------------------|-----------|
| Harmonic tone, clean | 0.13 / 1.17 cent | 0.01 / 0.03 cent |
| White noise at 25 dB | 0.12 / 1.16 cent | 0.04 / 0.11 cent |
| White noise at 15 dB | 0.13 / 1.14 cent | 0.11 / 0.44 cent |
| Stiff string ($B=4\cdot10^{-4}$) | 3.35 / 3.89 cents sharp | 2.53 / 3.30 cents sharp |

On **6000 random notes** (fundamental from 2 % to 100 % of the second partial, decay from 0.5 to 8 times a normal string, noise from 8 to 50 dB, stiffness, an attack on half of them), the same notes for both:

| | Before | Now |
|---|---|---|
| Gross errors (more than 100 cents) | 21 (0.35 %) | **4 (0.07 %)** |
| of which with noise at 12 dB or less (554 notes) | 20 | 3 |
| Notes not read | 11.2 % | 15.3 % |
| of which with noise at 12 dB or less | 7.8 % | 20.8 % |
| Error, 95th / 99th percentile | 4.9 / 7.0 cents | 4.2 / 6.3 cents |

So the module is wrong five times less often, but it reads fewer faint or fast-dying notes: it needs a clarity of 0.8. With 0.6 it reads as many as before, and is wrong 15 times (0.25 %).

### Notes
- **Stiff strings and accuracy.** The partials of a thick string are higher than true harmonics, so the period gives a pitch a few cents above the first partial: this comes from the string, and no real string was measured. On ideal tones detuned from -50 to +50 cents, the error is at most 0.18 cent on a guitar (the E2), 0.03 cent on a ukulele and 0.6 cent on the E1 of a bass.
- **Cost.** 0.3 ms per analysis for a guitar and 0.8 ms for a bass, against 8 ms before. With a JavaScript engine that does no compilation, a pessimistic bound, 16 and 33 ms against 466 ms.
- **Octave errors.** With the usual peak ratio of 0.9, 6 of 12 notes with an almost absent fundamental and a fast decay were read one octave too high, hence $\kappa=0.97$; one of 12 at an extreme decay (12 times a normal string) still is.
- **Noise and the attack.** The low-pass filter is needed. Without it, noise at 15 dB gives 4.2 cents (95th percentile), 46 % of the notes at 12 dB or less are not read, and the click of the attack of the string (3 times as loud as the note) makes 10 of 36 notes read one octave or a twelfth too low 80 ms after the pluck, one of them as another string. The click lowers $n(\tau)$ at the true period (to about 0.76 instead of 1.0) and leaves it a little higher at twice the period (0.77), so that the peak ratio sometimes picks the longer one. Now none is wrong; 29 of 36 notes are read 30 ms after the pluck (22 with the click), and all of them from 80 ms.
- **Disturbances.** Mains hum at 50 Hz made 17 % of gross errors before and 60 Hz made 83 %; none now on a guitar. A rumble twice as loud as the note was wrong from 30 Hz upwards before (8 of 36, then every note from 50 Hz); now it is never wrong, but it stops the reading when it is strong: at 40 Hz, 24 of 36 notes are not read, and none from 50 Hz. **A bass is more exposed**: its strings are close to the hum, which is wrong for 6 of 24 notes at 50 Hz and 3 at 60 Hz, and a rumble at 18 Hz or more stops most readings (one at 40 Hz makes 4 of 24 notes wrong).
- **Flicker and delay.** In a noisy room, over 4320 analyses, 21 gaps and 1 frame on a wrong string before, 1 and 0 now, and 3442 readings against 2700. Without the spike filter, 21 gaps and 5 wrong frames. While a peg is turned at 20 cents per second, the display lags 40 ms behind the string (0.8 cent), against 65 ms before; a plain median of 3 readings would have lagged 131 ms (2.6 cents), which is why a spike filter is used instead.
- **Filters.** Both are needed. The high-pass filter keeps a rumble from hiding the period. It was wrong before: Web Audio reads the `Q` of these filters in dB, so the former value 0.707 was a quality factor of 1.085, a resonance that raised 50 Hz by 0.7 dB instead of lowering it by 3 dB. A higher cut-off stops a rumble at 40 to 60 Hz, but it fails with 60 Hz hum (10 to 12 notes of 36 wrong), so 0.6 is kept.
- **Margins.** On a tone, the other strings are 70 dB or more below the string that sounds, thanks to the Blackman-Harris window (with a Hann window a note lit the other strings at about 50 dB below it, and with a window of 8192 samples the 2nd harmonic of an A2 lit the G3 and the B3). In noise alone the activity averages 0.29, and is 0.15 or more nine frames in ten, **at any noise level from -74 to -34 dBFS**, because it is relative to the noise floor of each string; a note played in that noise gives 1.00, against 0.34 on average for the strings that are not on a harmonic. The harmonics of the note light the strings they fall on (the E4 for the 3rd harmonic of an A2), and the first instants of a pluck light every string, the onset being broadband. The window is 0.34 s long for a guitar, so the margins lag by about 0.17 s behind the sound. Exact zeros, which no microphone gives, show nothing but the base opacity.

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
- Interface in English, French and Québécois, chosen from the browser language (English or French) or in
  the settings; `?lang=en`, `?lang=fr` or `?lang=qc` in the address forces one.
- The explanation diagram of the help button in French and Québécois (`guitoune_howto.fr.svg`,
  `guitoune_howto.qc.svg`), shown in the language of the page; flags at the top of the README for the
  three languages, and a Québécois section with the history of the word *guitoune*.
- Battery saver in the settings (30 frames per second).
- Open Graph and Twitter tags, and a Content-Security-Policy.
- Tests with `node:test` for the detection, the tracker, and the consistency between the code, the
  README, the translations and the offline cache; GitHub Actions workflow; `.gitignore`.

### Fixed
- A strong low-frequency rumble, a constant offset or 50 Hz mains hum could give a wrong note or none.

### Discussions
- **Review of the whole site, batches 1 to 5.** Audit of `index.html`, the README and the logo, then the
  fixes by batches. Batch 1 hardened the microphone and the rendering ([`bb95944`](https://github.com/laurentperrinet/guitoune/commit/bb95944)); batch 2 (settings,
  numeric readout, themes, offline mode) went into [`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9); batches 3 to 5 (McLeod detection, bass and
  ukulele, French, tests, CI) are [`e486e87`](https://github.com/laurentperrinet/guitoune/commit/e486e87). On synthetic signals the error of the former detection was
  at most 1.2 cent, with no octave error: the real defects were around it (voice processing of the
  browser, label green as soon as a string was recognised, no wake lock).
- **README consistency and French version.** `/harmonize-code` on the README: the French step 4 now
  describes the buttons as a column along the left edge, and the visual feedback bullet mentions the
  gradient boxes sliding upwards. The formulas and the table of variables were left until the page
  imports `pitch.js`, which [`e486e87`](https://github.com/laurentperrinet/guitoune/commit/e486e87) did.
- **French and Québécois.** French and Québécois versions of the how-to diagram, of the interface and of
  the README, with flags at the top of the README ([`6d1f6cd`](https://github.com/laurentperrinet/guitoune/commit/6d1f6cd)). The 32 tests passed and the page was tried
  in Firefox with `?lang=fr` and `?lang=qc`. One point stays open: the "About the name" sections still say
  that *guitoune* is a Québécois word for "cigarette", which could not be confirmed.

## 2026-10-17, web app

### Added
- Hardened microphone start-up: no echo cancellation, noise suppression or automatic gain control,
  a start button, errors shown in the page, screen wake lock, suspension in the background
  ([`bb95944`](https://github.com/laurentperrinet/guitoune/commit/bb95944), [`fb7cbd4`](https://github.com/laurentperrinet/guitoune/commit/fb7cbd4)).
- Settings (tuning, reference pitch A4, fine scale), numeric readout under the note, announcements for
  screen readers, five colour themes, full screen button, help dialog with a diagram, installable
  offline web app with its icons ([`7572495`](https://github.com/laurentperrinet/guitoune/commit/7572495), [`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9), [`dbf6425`](https://github.com/laurentperrinet/guitoune/commit/dbf6425), [`2eec2c4`](https://github.com/laurentperrinet/guitoune/commit/2eec2c4)).
- Control buttons stacked in a column along the left edge ([`893d349`](https://github.com/laurentperrinet/guitoune/commit/893d349)).

### Changed
- The licence is now the AGPLv3 ([`ff723d6`](https://github.com/laurentperrinet/guitoune/commit/ff723d6)).
- New logo and icons: a guitar with a bouquet of flowers ([`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9), [`0be4b90`](https://github.com/laurentperrinet/guitoune/commit/0be4b90), [`ae66629`](https://github.com/laurentperrinet/guitoune/commit/ae66629)).
- The how-to diagram is a vector image ([`03e2304`](https://github.com/laurentperrinet/guitoune/commit/03e2304)).

### Discussions
- **Microphone button** ([`bb95944`](https://github.com/laurentperrinet/guitoune/commit/bb95944)). The button at the top right switches the microphone on and off, and
  its colour goes from green (silence) to red (maximum) with the level: RMS in dBFS mapped from
  `LEVEL_MIN_DB` (-60) to `LEVEL_MAX_DB` (-10), rising fast and falling slowly so that the attack of a
  string stays visible.
- **Installing on iOS and working offline** ([`fb7cbd4`](https://github.com/laurentperrinet/guitoune/commit/fb7cbd4), [`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9)). Answer to "how do I use it on iOS
  without internet": the offline web app (manifest, service worker, icons) is enough once the page is
  served over https, for instance with GitHub Pages. Keeping the page open led to the microphone staying
  open when the page is hidden, and to the handling of a capture that ends.
- **Full screen button** ([`7572495`](https://github.com/laurentperrinet/guitoune/commit/7572495)), top left; the commit contains only its 76 lines of `index.html`.
- **Licence** ([`ff723d6`](https://github.com/laurentperrinet/guitoune/commit/ff723d6)). Alternatives to the GPL were compared, the combination with the EUPL was
  discussed, and the simplest choice was kept: the AGPLv3, which covers the use of the code as a web
  service.
- **Themes and waterfall.** A round button at the bottom left cycles through five themes (dark, light,
  cappuccino, wood tones, ocean), the last one kept in `localStorage`. The scrolling colours became
  gradient boxes with a glow, which was too hypnotic: the lines and glows were removed and the gradients
  kept ([`dbf6425`](https://github.com/laurentperrinet/guitoune/commit/dbf6425)).
- **Icon** ([`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9), [`0be4b90`](https://github.com/laurentperrinet/guitoune/commit/0be4b90), [`5d063b8`](https://github.com/laurentperrinet/guitoune/commit/5d063b8), [`53c5279`](https://github.com/laurentperrinet/guitoune/commit/53c5279), [`ae66629`](https://github.com/laurentperrinet/guitoune/commit/ae66629)). A guitar seen from the front with a
  bouquet of six flowers (one flower per string) and six butterflies (one note to place on each flower),
  each with its own corkscrew flight trail. The depth of the trail dots was linearised to give a
  continuous impression, and the leaves were realigned behind the headstock.
- **How-to diagram** ([`03e2304`](https://github.com/laurentperrinet/guitoune/commit/03e2304), [`6f62777`](https://github.com/laurentperrinet/guitoune/commit/6f62777), [`d83c277`](https://github.com/laurentperrinet/guitoune/commit/d83c277)). Redrawn from the JPEG as a vector image with
  continuous Bézier arrows, a bidirectional low/high pitch arrow, then the legend of the control buttons
  and the new layout of the buttons.
- **Help dialog** ([`dbf6425`](https://github.com/laurentperrinet/guitoune/commit/dbf6425), [`2eec2c4`](https://github.com/laurentperrinet/guitoune/commit/2eec2c4)). The **?** button shows the diagram with two round arrows to
  scroll left and right (an arrow disappears at its edge); the title and the "full size" link were removed,
  and a link to the source code and licence sits next to **Close**.
- **Control buttons** ([`893d349`](https://github.com/laurentperrinet/guitoune/commit/893d349)). All the buttons are grouped in a column along the left edge, so that
  they no longer overlap the note E2.

## 2026-01-06 to 2026-01-25

- 🇬🇧 [Bluesky, first announcement](https://bsky.app/profile/laurentperrinet.bsky.social/post/3mdbmsoynnk2n)
- Hann window, DSP parameters and layout adjustments; debug panel, then simplified ([`e65b032`](https://github.com/laurentperrinet/guitoune/commit/e65b032),
  [`2449c6a`](https://github.com/laurentperrinet/guitoune/commit/2449c6a), [`0975697`](https://github.com/laurentperrinet/guitoune/commit/0975697), [`6bda292`](https://github.com/laurentperrinet/guitoune/commit/6bda292)).
- README with a French version and a demo image ([`be205cc`](https://github.com/laurentperrinet/guitoune/commit/be205cc), [`3be8907`](https://github.com/laurentperrinet/guitoune/commit/3be8907), [`dae13e3`](https://github.com/laurentperrinet/guitoune/commit/dae13e3), [`61c5283`](https://github.com/laurentperrinet/guitoune/commit/61c5283)).

## 2025-12-20

- First versions: six-string tuner with a canvas per string, waterfall display, logo, README
  ([`046fcde`](https://github.com/laurentperrinet/guitoune/commit/046fcde) to [`9788c5b`](https://github.com/laurentperrinet/guitoune/commit/9788c5b)).
