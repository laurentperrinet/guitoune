# Guitoune: the Mobile-Friendly Guitar Tuner

(:fr: French version below)

Why need an app when you can do it online?

<p align="center">
  <img src="logo.svg" alt="Guitoune logo" width="120"/>
</p>

---

## How to Use

1. Open the page https://laurentperrinet.github.io/guitoune/ in a browser (desktop or mobile)
2. Tap the screen (if required by browser) to allow microphone access
3. Play a string - the tuner automatically displays:
   - The current frequency
   - The closest note
   - The cent deviation from the target pitch
   - A real-time waterfall visualization

4. The display shows ±100 cents (±1 semitone) by default
5. The vertical bars represent correct tuning in green and  **± 10 cents** in yellow

---

## What it is  

**Guitoune** is a pure‑JavaScript/HTML5 guitar tuner that runs entirely in the browser.  

- **Mobile-first design** - Responsive interface for phones and tablets
- **No installation** - Works directly in your browser
- **No advertisement** - This is open-source and free to use. You can even propose improvments.
- **Optimized signal processing**:
  - Band-pass filter (70Hz-1200Hz) focused on guitar fundamentals
  - High-pass (70Hz) to remove low-frequency noise
  - Low-pass (1200Hz) to reduce harmonics
  - Hanning window for reduced spectral leakage
- **Advanced pitch detection**:
  - Normalized autocorrelation with parabolic interpolation
  - <5 cents typical accuracy
  - fast updates (100ms updates)
- **Visual feedback**:
  - Color-coded waterfall display
  - Temporal fading for smoother visual transitions
  - Real-time response with minimal latency

---

## Technical Details

| Parameter | Value | Description |
|-----------|-------|-------------|
| FFT Size | 16384 | Large window for better frequency resolution |
| Update Rate | 10Hz | 100ms between analyses |
| Frequency Range | 75-350Hz | Optimized for guitar strings |
| Band-pass | 70-1200Hz | Isolates guitar fundamentals |
| RMS Threshold | 0.005 | Minimum signal level |
| Correlation Threshold | 0.4 | Minimum confidence for detection |
| Display Range | ±100 cents | One semitone on each side |
| Visual Resolution | 35 columns × 30 rows | Smooth waterfall display |

---

## About the Name

In Québécois slang, *guitoune* is a colloquial, slightly dated synonym for **cigarette**, sometimes humorously repurposed for a small guitar or any random “thing”. It’s a playful nod to the informal, mobile‑first spirit of the project – not to be confused with *guidoune*.  

---

## Contributing

Contributions are welcome! Feel free to:
- Fork the repository
- Open issues for bugs/features
- Submit pull requests

---

## License

[GPLv3 License](LICENSE) – see the `LICENSE` file for details. US citizens supporting MAGA must be accompanied by an adult.


# Guitoune : l'accordeur de guitare compatible mobile

Pourquoi installer une application quand on peut le faire en ligne ?

<p align="center">
  <img src="logo.svg" alt="Logo Guitoune" width="120"/>
</p>

---

## Mode d'emploi

1. Ouvrez la page [https://laurentperrinet.github.io/guitoune/](https://laurentperrinet.github.io/guitoune/) dans un navigateur (ordinateur ou mobile).
2. Touchez l'écran (si nécessaire selon le navigateur) pour autoriser l'accès au micro.
3. Jouez une corde – l'accordeur affiche automatiquement :
   - La fréquence actuelle
   - La note la plus proche
   - L'écart en cents par rapport à la hauteur cible
   - Une visualisation en cascade en temps réel.

4. L'affichage montre par défaut ±100 cents (±1 demi-ton).
5. Les barres verticales indiquent un accord correct en vert et **±10 cents** en jaune.

---

## Qu'est-ce que c'est ?

**Guitoune** est un accordeur de guitare en JavaScript/HTML5 pur, fonctionnant entièrement dans le navigateur.

- **Conçu pour le mobile** : Interface adaptée aux téléphones et tablettes.
- **Aucune installation** : Fonctionne directement dans votre navigateur.
- **Sans publicité** : Logiciel libre et open source. Vous pouvez même proposer des améliorations.
- **Traitement du signal optimisé** :
  - Filtre passe-bande (70 Hz–1200 Hz) centré sur les fondamentales de la guitare.
  - Passe-haut (70 Hz) pour éliminer les bruits graves.
  - Passe-bas (1200 Hz) pour réduire les harmoniques.
  - Fenêtre de Hanning pour limiter les fuites spectrales.
- **Détection de hauteur avancée** :
  - Autocorrélation normalisée avec interpolation parabolique.
  - Précision typique < 5 cents.
  - Mise à jour rapide (100 ms entre chaque analyse).
- **Retour visuel** :
  - Affichage en cascade codé par couleurs.
  - Estompage temporel pour des transitions visuelles plus fluides.
  - Réponse en temps réel avec une latence minimale.

---

## Détails techniques

| Paramètre          | Valeur      | Description                                      |
|--------------------|-------------|--------------------------------------------------|
| Taille FFT         | 16384       | Grande fenêtre pour une meilleure résolution fréquentielle. |
| Fréquence de mise à jour | 10 Hz   | 100 ms entre chaque analyse.                     |
| Plage de fréquences| 75–350 Hz   | Optimisé pour les cordes de guitare.              |
| Passe-bande        | 70–1200 Hz  | Isolement des fondamentales de la guitare.       |
| Seuil RMS          | 0,005       | Niveau minimal du signal.                         |
| Seuil de corrélation | 0,4       | Confiance minimale pour la détection.            |
| Plage d'affichage  | ±100 cents  | Un demi-ton de chaque côté.                       |
| Résolution visuelle| 35×30       | Affichage fluide en cascade.                      |

---

## À propos du nom

En québécois, *guitoune* est un synonyme familier et un peu désuet de **cigarette**, parfois réutilisé humoristiquement pour désigner une petite guitare ou un objet quelconque. C'est un clin d'œil ludique à l'esprit informel et mobile du projet.

---

## Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à :
- Forker le dépôt.
- Ouvrir des *issues* pour signaler des bugs ou proposer des fonctionnalités.
- Soumettre des *pull requests*.

---

## Licence

[Licence GPLv3](LICENSE) – Voir le fichier `LICENSE` pour plus de détails.
