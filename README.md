# Guitoune: the mobile‑Friendly Guitar Tuner

Why need an app when you can do it online?

---

## What it is

**Guitoune** is a pure‑JavaScript/HTML5 guitar tuner that runs entirely in the browser.  
- **Mobile‑first** – the UI is sized for phones and tablets.  
- **Zero installation** – just open the page, grant microphone access, and start tuning.  
- **Signal processing** – a high‑pass / low‑pass **band‑pass filter** isolates the guitar’s frequency range (≈70 Hz – 450 Hz) before pitch detection.  
- **Pitch detection** – uses an autocorrelation algorithm with sub‑sample interpolation for accurate pitch estimation.  
- **Visual feedback** – a scrolling canvas shows the deviation from the target pitch in **cents**, colour‑coded (green ≤ 1 cents, yellow ≤ 10 cents, red > 10 cents).

---

## How to use

1. Open https://laurentperrinet.github.io/guitoune/ in a browser (desktop or mobile).  
2. Tap the screen (if the browser requires a user gesture) – the microphone permission prompt appears.  
3. Play each string; the tuner will automatically display the current frequency, the note’s cent offset, and a realtime scrolling graph.

---

## Technical notes

- **Audio API** – `AudioContext`, `BiquadFilterNode` (high‑pass & low‑pass), and `AnalyserNode`.  
- **FFT size** – 4096 samples (≈92 ms window) gives a smooth visual while keeping latency low.  
- **Auto‑start** – the script attempts to start the tuner on page load; if the browser blocks it, the permission dialog appears after the first tap.

---

## Why the name?

In Québécois slang, *guitoune* is a colloquial, slightly dated synonym for **cigarette**, sometimes humorously repurposed for a small guitar or any random “thing”. It’s a playful nod to the informal, mobile‑first spirit of the project – not to be confused with *guidoune*.

---

## Contributing

Feel free to fork the repository, open issues, or submit pull requests. Improvements such as alternative pitch‑detection algorithms, additional tuning presets, or UI polish are always welcome.

---

## License

[MIT License](LICENSE) – see the `LICENSE` file for details.