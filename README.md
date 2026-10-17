# Guitoune: the Mobile-Friendly Guitar Tuner

[( :fr: French version below)](#version-française)

Why need an app when you can do it online?

<p align="center">
  <img src="icons/icon.svg" alt="Guitoune logo" width="120"/>
</p>

---

## How to Use

1. Open the page https://laurentperrinet.github.io/guitoune/ in a browser (desktop or mobile)
2. Tap **Start tuner** and allow microphone access
3. Play a string. The tuner displays a real-time waterfall in 6 horizontal blocks, ordered from top to bottom E2, A2, D3, G3, B3 and E4 in standard tuning:
   - The block of the closest string shows the note being played, in **green** when the string is in tune (within **± 10 cents**) and in **orange** otherwise
   - Under the note, a readout gives the direction to turn the peg (**↑** raise the pitch, **↓** lower it, **✓** in tune), the error in cents and the frequency in Hz
   - The waterfall shows the last 3 seconds, with the newest reading at the bottom. The green vertical line marks the exact pitch and the two orange lines mark ± 10 cents
4. Use the round buttons stacked in a column along the left edge, from top to bottom:
   - **microphone**: switch the microphone on or off, its colour follows the input level;
   - **settings**: choose the tuning, the reference pitch and the scale of the display;
   - **colour theme**: cycle through the five colour themes;
   - **help** (**?**): show the diagram below;
   - **full screen** (only when the browser allows it).
5. Optional: install it from the browser menu ("Add to Home Screen" or "Install"). Once opened, it works without a network connection.

![howto](guitoune_howto.svg)

---

## What it is

**Guitoune** is a pure‑JavaScript/HTML5 guitar tuner that runs entirely in the browser.

- **Mobile-first design** - Responsive interface for phones and tablets
- **No installation** - Works directly in your browser, and can be installed to work offline
- **No advertisement** - This is open-source and free to use. You can even propose improvements.
- **7 tunings** - Standard, Drop D, half step down, full step down, DADGAD, Open G and Open D
- **Adjustable reference pitch** - A4 from 415 Hz to 466 Hz (440 Hz by default)
- **Two display scales** - ± 50 cents, or ± 15 cents (fine mode) for the last touches
- **Accessible** - the note and the error are also given as text, and announced to screen readers
- **Optimised signal processing**:
  - High-pass (50 Hz) to remove low-frequency noise
  - Low-pass (1000 Hz) to reduce harmonics
  - Hann window to reduce spectral leakage
  - No echo cancellation, noise suppression or automatic gain control: they are designed for speech and attenuate sustained notes
- **Pitch detection**:
  - Normalised autocorrelation with parabolic interpolation
  - Error below 2 cents on clean synthetic tones (real strings, with noise and inharmonicity, may do worse)
  - New reading every 100 ms
- **Visual feedback**:
  - Colour-coded waterfall display: gradient cells that glide upwards
  - Real-time response with minimal latency

### The model

Each analysis takes the last $N$ samples $x[n]$ of the microphone, sampled at $f_s$, and goes through four steps.

**1. Window and level.** A Hann window reduces the spectral leakage, and the signal is ignored when it is too quiet:

$$x_w[n] = x[n]\,\frac{1}{2}\left(1-\cos\frac{2\pi n}{N}\right), \qquad x_{\mathrm{rms}} = \sqrt{\frac{1}{N}\sum_{n=0}^{N-1} x_w[n]^2} \;\geq\; x_{\min}$$

**2. Normalised autocorrelation.** For each lag $\tau$ (in samples) between $f_s/f_{\max}$ and $f_s/f_{\min}$:

$$r(\tau)=\frac{\sum_{n=0}^{N-\tau-1} x_w[n]\,x_w[n+\tau]}{\sqrt{\sum_{n=0}^{N-\tau-1} x_w[n]^2\;\sum_{n=0}^{N-\tau-1} x_w[n+\tau]^2}}$$

The best lag is $\tau^\ast=\arg\max_\tau r(\tau)$. The reading is rejected when $r(\tau^\ast)<r_{\min}$.

**3. Frequency.** A parabola through $r(\tau^\ast-1)$, $r(\tau^\ast)$ and $r(\tau^\ast+1)$ refines the lag to a fraction of a sample, with $y_1=r(\tau^\ast-1)$, $y_2=r(\tau^\ast)$, $y_3=r(\tau^\ast+1)$:

$$\delta=\frac{y_1-y_3}{2\,(y_1-2y_2+y_3)}, \qquad f=\frac{f_s}{\tau^\ast+\delta}$$

**4. Strings and error.** The frequency of the string $k$ comes from its MIDI note number $m_k$ (A4 is 69) and from the reference pitch $f_{A4}$. The error is measured in cents (1 cent is 1/100 of a semitone):

$$f_k = f_{A4}\;2^{(m_k-69)/12}, \qquad c_k = 1200\,\log_2\frac{f}{f_k}$$

The played string is the one with the smallest $|c_k|$, provided that $|c_k|\le C_c$. On the waterfall, an error $c$ (limited to $[-C_d,\,C_d]$) is drawn at the horizontal position $x = \dfrac{W}{2}\left(1+\dfrac{c}{C_d}\right)$, where $W$ is the width of the block. Each reading is a cell of width $W/N_c$ whose colour is a vertical gradient from the hue of the previous reading to its own; the cells glide upwards continuously and fade out with age.

### Variables

The values below are those of the code ([index.html](index.html), `DSP_CONFIG` and `TUNINGS`).

| Symbol | Name in the code | Default value | Role |
|--------|------------------|---------------|------|
| $f_s$ | `audioCtx.sampleRate` | set by the device, typically 48 000 Hz | Sampling frequency |
| $N$ | `FFT_SIZE` | 8192 samples (about 0.17 s at 48 kHz) | Length of the analysed window |
| $\Delta t$ | `UPDATE_INTERVAL` | 0.1 s (100 ms in the code) | Time between two analyses |
| $f_{hp}$ | `HP_CUT` | 50 Hz | Cut-off of the high-pass filter |
| $f_{lp}$ | `LP_CUT` | 1000 Hz | Cut-off of the low-pass filter |
| $Q$ | `BAND_Q` | 0.707 (no unit) | Quality factor of both filters |
| $x_{\min}$ | `RMS_THRESHOLD` | 0.005 (full scale = 1) | Minimum level of the windowed signal |
| $r_{\min}$ | `CORRELATION_MIN` | 0.4 (no unit) | Minimum correlation to accept a reading |
| $f_{\min}$ | `MIN_FREQ` | 50 Hz | Lowest searched frequency |
| $f_{\max}$ | `MAX_FREQ` | 1000 Hz | Highest searched frequency |
| $f_{A4}$ | `settings.a4` (`A4_DEFAULT`) | 440 Hz (415 to 466 Hz) | Reference pitch of A4 |
| $m_k$ | `TUNINGS[].midi` | 40, 45, 50, 55, 59, 64 (standard) | MIDI note number of each string |
| $C_d$ | `DISPLAY_CENTS` | 50 cents | Half-width of the waterfall |
| $C_d$ (fine mode) | `FINE_DISPLAY_CENTS` | 15 cents | Half-width of the waterfall in fine mode |
| $C_c$ | `CAPTURE_CENTS` | 100 cents | Largest distance at which a string counts as played |
| $C_t$ | `IN_TUNE_CENTS` | 10 cents | Largest error of a string in tune (green) |
| $N_c$ | `COLS` | 35 columns | Sets the width of the trace ($W/N_c$) |
| $N_r$ | `ROWS` | 30 rows (about 3 s of history) | Number of readings kept in the waterfall |
| - | `LEVEL_MIN_DB` | -60 dBFS | Input level shown in green on the microphone button |
| - | `LEVEL_MAX_DB` | -10 dBFS | Input level shown in red on the microphone button |

---

## About the Name

In Québécois slang, *guitoune* is a colloquial, slightly dated synonym for **cigarette**, sometimes humorously repurposed for a small guitar or any random “thing”. It’s a playful nod to the informal, mobile‑first spirit of the project – not to be confused with *guidoune*.  

---

## Contributing

Contributions are welcome! Feel free to:
- Fork the repository
- Open issues for bugs/features
- Submit pull requests

The whole tuner is in [index.html](index.html). The offline mode is in [sw.js](sw.js): when you add a file that the page needs, list it in `SHELL` there, and change the date or the counter in `CACHE_NAME`.

---

## License

[AGPLv3 License](LICENSE) – see the `LICENSE` file for details. US citizens supporting MAGA must be accompanied by an adult.


---
---
---

# <a name="version-française"></a> Guitoune : l’accordeur de guitare adapté aux mobiles

Pourquoi avoir besoin d’une application quand vous pouvez le faire en ligne ?

<p align="center">
  <img src="icons/icon.svg" alt="Logo de Guitoune" width="120"/>
</p>

---

## Comment l’utiliser

1. Ouvrez la page https://laurentperrinet.github.io/guitoune/ dans un navigateur (ordinateur de bureau ou mobile)  
2. Touchez **Start tuner** et autorisez l’accès au microphone  
3. Jouez une corde. L’accordeur affiche une cascade en temps réel dans 6 blocs horizontaux, ordonnés de haut en bas : E2, A2, D3, G3, B3 et E4 en accordage standard :
   - Le bloc de la corde la plus proche affiche la note jouée, en **vert** quand la corde est accordée (à **± 10 cents**) et en **orange** sinon  
   - Sous la note, une ligne indique le sens dans lequel tourner la cheville (**↑** monter la hauteur, **↓** la baisser, **✓** accordée), l’écart en cents et la fréquence en Hz  
   - La cascade montre les 3 dernières secondes, la mesure la plus récente en bas. La ligne verticale verte marque la hauteur exacte et les deux lignes orange marquent ± 10 cents  
4. Utilisez les boutons ronds dans les coins :
   - **microphone** (en haut à droite) : allume ou éteint le microphone, sa couleur suit le niveau d’entrée ;
   - **plein écran** (en haut à gauche, quand le navigateur le permet) ;
   - **réglages** (en haut à gauche, à côté) : choix de l’accordage, du diapason et de l’échelle d’affichage ;
   - **thème de couleurs** (en bas à gauche) : passe d’un des cinq thèmes au suivant ;
   - **aide** (**?**, en bas à gauche, à côté) : affiche le schéma ci‑dessous.
5. Facultatif : installez-le depuis le menu du navigateur (« Ajouter à l’écran d’accueil » ou « Installer »). Une fois ouvert, il fonctionne sans connexion.

![howto](guitoune_howto.svg)

---

## Qu’est‑ce que c’est

**Guitoune** est un accordeur de guitare pure‑JavaScript/HTML5 qui s’exécute entièrement dans le navigateur.

- **Design mobile‑first** – Interface réactive pour smartphones et tablettes  
- **Pas d’installation** – Fonctionne directement dans votre navigateur, et peut être installé pour fonctionner hors connexion  
- **Aucune publicité** – Projet open‑source et gratuit. Vous pouvez même proposer des améliorations.  
- **7 accordages** – Standard, Drop D, un demi‑ton plus bas, un ton plus bas, DADGAD, Open G et Open D  
- **Diapason réglable** – A4 de 415 Hz à 466 Hz (440 Hz par défaut)  
- **Deux échelles d’affichage** – ± 50 cents, ou ± 15 cents (mode fin) pour les derniers réglages  
- **Accessible** – la note et l’écart sont aussi donnés en texte, et annoncés aux lecteurs d’écran  
- **Traitement du signal optimisé** :
  - Filtre passe‑haut (50 Hz) pour éliminer le bruit basse fréquence  
  - Filtre passe‑bas (1000 Hz) pour réduire les harmoniques  
  - Fenêtre de Hann pour diminuer les fuites spectrales  
  - Ni annulation d’écho, ni suppression de bruit, ni contrôle automatique de gain : ils sont conçus pour la voix et atténuent les notes tenues  
- **Détection de hauteur** :
  - Autocorrélation normalisée avec interpolation parabolique  
  - Erreur inférieure à 2 cents sur des sons synthétiques propres (les vraies cordes, avec bruit et inharmonicité, peuvent faire moins bien)  
  - Nouvelle mesure toutes les 100 ms  
- **Retour visuel** :
  - Affichage en cascade coloré  
  - Réaction en temps réel avec latence minimale  

### Le modèle

Chaque analyse prend les $N$ derniers échantillons $x[n]$ du microphone, échantillonné à $f_s$, et suit quatre étapes.

**1. Fenêtre et niveau.** Une fenêtre de Hann diminue les fuites spectrales, et le signal est ignoré s’il est trop faible :

$$x_w[n] = x[n]\,\frac{1}{2}\left(1-\cos\frac{2\pi n}{N}\right), \qquad x_{\mathrm{rms}} = \sqrt{\frac{1}{N}\sum_{n=0}^{N-1} x_w[n]^2} \;\geq\; x_{\min}$$

**2. Autocorrélation normalisée.** Pour chaque retard $\tau$ (en échantillons) compris entre $f_s/f_{\max}$ et $f_s/f_{\min}$ :

$$r(\tau)=\frac{\sum_{n=0}^{N-\tau-1} x_w[n]\,x_w[n+\tau]}{\sqrt{\sum_{n=0}^{N-\tau-1} x_w[n]^2\;\sum_{n=0}^{N-\tau-1} x_w[n+\tau]^2}}$$

Le meilleur retard est $\tau^\ast=\arg\max_\tau r(\tau)$. La mesure est rejetée si $r(\tau^\ast)<r_{\min}$.

**3. Fréquence.** Une parabole passant par $r(\tau^\ast-1)$, $r(\tau^\ast)$ et $r(\tau^\ast+1)$ affine le retard à une fraction d’échantillon, avec $y_1=r(\tau^\ast-1)$, $y_2=r(\tau^\ast)$, $y_3=r(\tau^\ast+1)$ :

$$\delta=\frac{y_1-y_3}{2\,(y_1-2y_2+y_3)}, \qquad f=\frac{f_s}{\tau^\ast+\delta}$$

**4. Cordes et écart.** La fréquence de la corde $k$ vient de son numéro de note MIDI $m_k$ (A4 vaut 69) et du diapason $f_{A4}$. L’écart se mesure en cents (1 cent vaut 1/100 de demi‑ton) :

$$f_k = f_{A4}\;2^{(m_k-69)/12}, \qquad c_k = 1200\,\log_2\frac{f}{f_k}$$

La corde jouée est celle de plus petit $|c_k|$, à condition que $|c_k|\le C_c$. Sur la cascade, un écart $c$ (limité à $[-C_d,\,C_d]$) est tracé à la position horizontale $x = \dfrac{W}{2}\left(1+\dfrac{c}{C_d}\right)$, où $W$ est la largeur du bloc. Chaque mesure est une case de largeur $W/N_c$ dont la couleur est un dégradé vertical de la teinte de la mesure précédente à la sienne ; les cases glissent de façon continue vers le haut et s’estompent avec l’âge.

### Variables

Les valeurs ci‑dessous sont celles du code ([index.html](index.html), `DSP_CONFIG` et `TUNINGS`).

| Symbole | Nom dans le code | Valeur par défaut | Rôle |
|---------|------------------|-------------------|------|
| $f_s$ | `audioCtx.sampleRate` | fixée par l’appareil, typiquement 48 000 Hz | Fréquence d’échantillonnage |
| $N$ | `FFT_SIZE` | 8192 échantillons (environ 0,17 s à 48 kHz) | Longueur de la fenêtre analysée |
| $\Delta t$ | `UPDATE_INTERVAL` | 0,1 s (100 ms dans le code) | Durée entre deux analyses |
| $f_{hp}$ | `HP_CUT` | 50 Hz | Fréquence de coupure du filtre passe‑haut |
| $f_{lp}$ | `LP_CUT` | 1000 Hz | Fréquence de coupure du filtre passe‑bas |
| $Q$ | `BAND_Q` | 0,707 (sans unité) | Facteur de qualité des deux filtres |
| $x_{\min}$ | `RMS_THRESHOLD` | 0,005 (pleine échelle = 1) | Niveau minimal du signal fenêtré |
| $r_{\min}$ | `CORRELATION_MIN` | 0,4 (sans unité) | Corrélation minimale pour accepter une mesure |
| $f_{\min}$ | `MIN_FREQ` | 50 Hz | Fréquence la plus basse recherchée |
| $f_{\max}$ | `MAX_FREQ` | 1000 Hz | Fréquence la plus haute recherchée |
| $f_{A4}$ | `settings.a4` (`A4_DEFAULT`) | 440 Hz (415 à 466 Hz) | Diapason de A4 |
| $m_k$ | `TUNINGS[].midi` | 40, 45, 50, 55, 59, 64 (standard) | Numéro de note MIDI de chaque corde |
| $C_d$ | `DISPLAY_CENTS` | 50 cents | Demi‑largeur de la cascade |
| $C_d$ (mode fin) | `FINE_DISPLAY_CENTS` | 15 cents | Demi‑largeur de la cascade en mode fin |
| $C_c$ | `CAPTURE_CENTS` | 100 cents | Plus grande distance à laquelle une corde est considérée jouée |
| $C_t$ | `IN_TUNE_CENTS` | 10 cents | Plus grand écart d’une corde accordée (vert) |
| $N_c$ | `COLS` | 35 colonnes | Fixe la largeur du tracé ($W/N_c$) |
| $N_r$ | `ROWS` | 30 lignes (environ 3 s d’historique) | Nombre de mesures gardées dans la cascade |
| - | `LEVEL_MIN_DB` | -60 dBFS | Niveau d’entrée affiché en vert sur le bouton microphone |
| - | `LEVEL_MAX_DB` | -10 dBFS | Niveau d’entrée affiché en rouge sur le bouton microphone |

---

## À propos du nom

En argot québécois, *guitoune* est un synonyme familier, légèrement désuet de **cigarette**, parfois détourné avec humour pour désigner une petite guitare ou n’importe quel « truc ». C’est un clin d’œil ludique à l’esprit informel, mobile‑first du projet – à ne pas confondre avec *guidoune*.

---

## Contribuer

Les contributions sont les bienvenues ! N’hésitez pas à :

- Faire un fork du dépôt  
- Ouvrir des tickets pour les bogues / les fonctionnalités  
- Soumettre des pull‑requests  

Tout l’accordeur est dans [index.html](index.html). Le mode hors connexion est dans [sw.js](sw.js) : quand vous ajoutez un fichier dont la page a besoin, listez‑le dans `SHELL` et changez la date ou le compteur de `CACHE_NAME`.

---

## Licence

[Licence AGPLv3](LICENSE) – voir le fichier `LICENSE` pour plus de détails. Les citoyens américains soutenant le MAGA doivent être accompagnés d’un adulte.
