# Guitoune: the mobile‑Friendly Guitar Tuner  

(:fr: french below)

Why need an app when you can do it online?  

---  

## How to use  

1. Open https://laurentperrinet.github.io/guitoune/ in a browser (desktop or mobile).  
2. Tap the screen (if the browser requires a user gesture) – the microphone permission prompt appears.  
3. Play a string; the tuner will automatically display:  

   * the current frequency,  
   * the note name,  
   * the cent offset, and  
   * a real‑time scrolling graph.  

4. The horizontal axis spans **± DISPLAY_CENTS** cents. With the default `DISPLAY_CENTS = 100` you see **‑100 cents (one semitone flat) on the left** and **+100 cents (one semitone sharp) on the right**.  
5. The vertical bars at the centre represent **± 10 cents** (green ≤ 1 cent, yellow ≤ 10 cents, red > 10 cents).  

---  

## What it is  

**Guitoune** is a pure‑JavaScript/HTML5 guitar tuner that runs entirely in the browser.  

- **Mobile‑first** – the UI is sized for phones and tablets.  
- **Zero installation** – just open the page, grant microphone access, and start tuning.  
- **Signal‑processing chain** –  

  1. **High‑pass (30 Hz) → Low‑pass (1800 Hz)** creates a band‑pass that isolates the useful part of a guitar’s spectrum (≈70 Hz – 450 Hz).  
  2. A **high‑shelf pre‑emphasis** filter boosts the spectrum roughly linearly with frequency, so higher‑pitched notes (B3, E4) are a little louder in the analysis.  
  3. An **AnalyserNode** (FFT) supplies the time‑domain data for the pitch algorithm.  

- **Pitch detection** – an autocorrelation algorithm with parabolic (sub‑sample) interpolation delivers a frequency estimate with < 5 cents typical error.  
- **Visual feedback** – a scrolling waterfall shows the deviation from the target pitch in **cents**, colour‑coded (green ≈ ≤ 1 cent, yellow ≈ ≤ 10 cents, red > 10 cents).  
- **Loudness indicator** – a transparent canvas in the lower‑left corner displays a red disc whose radius follows the RMS level; the disc is drawn at **80 % opacity** and has no border.  

---  

## Technical notes  

| Item | Value / Explanation |
|------|----------------------|
| **Audio API** | `AudioContext`, two `BiquadFilterNode`s (high‑pass & low‑pass), one `BiquadFilterNode` (high‑shelf pre‑emphasis), and an `AnalyserNode`. |
| **FFT size** | `32768` samples (≈ 680 ms at a 48 kHz sample‑rate). This gives a frequency bin spacing of ~0.75 Hz, which produces a very smooth waterfall. If you run on a low‑power device you can change `FFT_SIZE` back to `16384` (≈ 340 ms) to save CPU. |
| **Update interval** | The heavy pitch analysis runs every **100 ms** (`UPDATE_INTERVAL = 100`). |
| **Band‑pass limits** | `HP_CUT = 30 Hz`, `LP_CUT = 1800 Hz`. The low‑pass cutoff is high enough to keep the fundamentals of B3 (≈ 247 Hz) and E4 (≈ 330 Hz). |
| **Correlation smoothing** | `CORRELATION_SMOOTH_ALPHA = 0.2` (slow colour fading) and `SMOOTH_ALPHA_OLD = 0.8` (slow decay when no pitch is found). |
| **Pitch history** | `PITCH_HISTORY_LENGTH = 20`. The median filter works on the last 20 raw detections, which reduces outliers and makes the waterfall trajectory smoother. |
| **Display resolution** | `COLS = 51` (≈ 4 cents per column) and `ROWS = 30` (more vertical granularity). |
| **Correlation threshold** | `CORRELATION_MIN = 0.05`. A lower threshold keeps the graph from “dropping out” on weak notes. |
| **Other‑string dimming** | `OTHER_DIM_FACTOR = 0.3` – non‑active strings are dimmed to 30 % of the active colour, reducing visual contrast. |
| **Auto‑start** | The script attempts to start the tuner on page load; if the browser blocks it, the permission dialog appears after the first user tap. |

---  

## Why the name?  

In Québécois slang, *guitoune* is a colloquial, slightly dated synonym for **cigarette**, sometimes humorously repurposed for a small guitar or any random “thing”. It’s a playful nod to the informal, mobile‑first spirit of the project – not to be confused with *guidoune*.  

---  

## Contributing  

Feel free to fork the repository, open issues, or submit pull requests. 

---  

## License  

[GPLv3 License](LICENSE) – see the `LICENSE` file for details.

---  
---  

# Guitoune : l’accordeur de guitare mobile‑friendly  

Pourquoi installer une application alors que l’on peut le faire en ligne ?  

---  

## Qu’est‑ce que c’est  

**Guitoune** est un accordeur de guitare 100 % JavaScript/HTML5 qui fonctionne entièrement dans le navigateur.  

- **Mobile‑first** – l’interface est conçue pour les téléphones et les tablettes.  
- **Aucune installation** – ouvrez simplement la page, autorisez l’accès au micro et commencez à accorder.  
- **Chaîne de traitement du signal** –  

  1. **High‑pass (30 Hz) → Low‑pass (1800 Hz)** forme un filtre passe‑bande qui isole la partie utile du spectre d’une guitare (≈ 70 Hz – 450 Hz).  
  2. Un filtre **high‑shelf de pré‑accentuation** augmente le spectre de façon à peu près linéaire avec la fréquence, ce qui rend les notes plus aigües (B3, E4) légèrement plus fortes pour l’analyse.  
  3. Un **AnalyserNode** (FFT) fournit les données temporelles nécessaires à l’algorithme de détection.  

- **Détection de hauteur** – autocorrélation avec interpolation parabolique (sous‑échantillonnage) qui donne une précision typique < 5 cents.  
- **Retour visuel** – une « waterfall » défilante montre l’écart par rapport à la note cible en **cents**, colorée : vert ≈ ≤ 1 cent, jaune ≈ ≤ 10 cents, rouge > 10 cents.  
- **Indicateur de volume** – un canevas transparent en bas à gauche affiche un disque rouge dont le rayon suit le niveau RMS ; le disque est dessiné avec **80 % d’opacité** et n’a aucun contour.  

---  

## Comment l’utiliser  

1. Ouvrez https://laurentperrinet.github.io/guitoune/ dans un navigateur (bureau ou mobile).  
2. Touchez l’écran (si le navigateur exige un geste utilisateur) – la boîte de dialogue de permission du micro apparaît.  
3. Jouez une corde ; l’accordeur affichera automatiquement :  

   * la fréquence détectée,  
   * le nom de la note,  
   * l’écart en cents, et  
   * le graphique défilant en temps réel.  

4. L’axe horizontal couvre **± DISPLAY_CENTS** cents. Avec la valeur par défaut `DISPLAY_CENTS = 100` vous voyez **‑100 cents (une demi‑tonalité à plat) à gauche** et **+100 cents (une demi‑tonalité à hausse) à droite**.  
5. Les barres verticales centrales représentent **± 10 cents** (vert ≤ 1 cent, jaune ≤ 10 cents, rouge > 10 cents).  

---  

## Notes techniques  

| Élément | Valeur / Explication |
|---------|----------------------|
| **Audio API** | `AudioContext`, deux `BiquadFilterNode` (high‑pass & low‑pass), un `BiquadFilterNode` (high‑shelf de pré‑accentuation) et un `AnalyserNode`. |
| **Taille de la FFT** | `32768` échantillons (≈ 680 ms à 48 kHz). Cela donne un pas de fréquence d’environ 0,75 Hz, ce qui rend la waterfall très fluide. Sur des appareils peu puissants, on peut repasser à `16384` (≈ 340 ms) pour alléger la charge CPU. |
| **Intervalle de mise à jour** | L’analyse lourde de hauteur s’exécute toutes les **100 ms** (`UPDATE_INTERVAL = 100`). |
| **Limites du passe‑bande** | `HP_CUT = 30 Hz`, `LP_CUT = 1800 Hz`. La coupe haute est suffisante pour conserver les fondamentaux de B3 (≈ 247 Hz) et E4 (≈ 330 Hz). |
| **Lissage de la corrélation** | `CORRELATION_SMOOTH_ALPHA = 0.2` (fading de couleur lent) et `SMOOTH_ALPHA_OLD = 0.8` (dégradation lente lorsqu’aucune hauteur n’est détectée). |
| **Historique de hauteur** | `PITCH_HISTORY_LENGTH = 20`. Le filtre médian travaille sur les 20 dernières détections brutes, ce qui réduit les valeurs aberrantes et rend la trajectoire de la waterfall plus lisse. |
| **Résolution d’affichage** | `COLS = 51` (≈ 4 cents par colonne) et `ROWS = 30` (plus de lignes verticales). |
| **Seuil de corrélation** | `CORRELATION_MIN = 0.05`. Un seuil plus bas évite que le graphique disparaisse sur des notes faibles. |
| **Atténuation des cordes non actives** | `OTHER_DIM_FACTOR = 0.3` – les cordes qui ne sont pas la corde active sont atténuées à 30 % de la couleur active, ce qui diminue le contraste visuel. |
| **Démarrage automatique** | Le script tente de lancer l’accordeur au chargement de la page ; si le navigateur bloque l’opération, la boîte de dialogue apparaît après le premier tap. |

---  

## Pourquoi ce nom ?  

En québécois, *guitoune* est un synonyme familier (et légèrement vieilli) de **cigarette**, parfois détourné humoristiquement pour désigner une petite guitare ou n’importe quel « truc ». C’est un clin d’œil ludique à l’esprit informel et mobile‑first du projet – à ne pas confondre avec *guidoune*.  

---  

## Contribuer  

N’hésitez pas à forker le dépôt, ouvrir des issues ou soumettre des pull‑requests. 

---  

## Licence  

[GPLv3 License](LICENSE) – voir le fichier `LICENSE` pour les détails.