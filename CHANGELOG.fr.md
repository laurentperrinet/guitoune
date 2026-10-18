# Journal des changements

🇬🇧 [English](CHANGELOG.md) · 🇫🇷 Français · ⚜️ [Québécois](CHANGELOG.qc.md)

Les dates suivent la norme ISO 8601. Avant le 2026-10-17, les entrées résument les messages de commit ;
aucune des versions précédentes n’a été étiquetée.

## 2026-10-18, un seuil relatif au bruit, et une mesure toutes les 50 ms

### Modifié
- Le signal est analysé quand il dépasse de 3 fois le bruit de fond de la pièce, et non un niveau fixe de 0,005. Dans une pièce calme, une note douce est lue (un niveau efficace de 0,004 n’était lu sur aucune corde, et G3, B3 et E4 étaient perdues les premières) ; un son stable comme un ronflement n’est jamais pris pour une note (un ronflement à 150 Hz était lu comme le D3 à chaque analyse).
- Un niveau stable fait monter le plancher 12 fois plus vite (6 dB par seconde au lieu de 0,5) : un ronflement apparu après l’apprentissage du plancher était lu pendant 74 s, il l’est maintenant pendant 8 s.
- Une analyse toutes les 50 ms au lieu de 100 ms, et 60 lignes d’historique pour garder 3 s : une note est lue 31 ms après son début au lieu de 63 pour le E4 (67 au lieu de 88 pour le E2). Les comptes du suiveur suivent : une médiane de 5, 4 analyses pour changer de corde, 4 pour garder une corde pendant un trou.
- Une mesure claire à au moins 0,95 n’est jamais prise pour un pic, si bien qu’une corde pincée pendant que la précédente sonne encore s’affiche aussitôt : 113 ms au lieu de 188 pour le E4 puis le A2.

### Remarques
- La difficulté avec le E4 n’a pas été reproduite sur des cordes synthétiques, qui lisent le E4 aussi vite que les autres. Le seuil fixe en est la cause la plus probable : cette corde est plus faible au microphone et s’éteint plus tôt, et le contrôle automatique de gain du microphone est coupé.
- Deux idées n’ont rien donné et n’ont pas été gardées : des fenêtres plus courtes que l’habituelle pour une note qui vient de commencer, et une clarté plus basse près de la mesure précédente (0,7 point de notes en plus, un 99ᵉ centile moins bon).
- Une note qui sonne déjà au démarrage de l’accordeur est ignorée jusqu’à ce qu’elle s’éteigne, et une note qui décroît de moins de 2 dB en 2 s compte comme un son stable.

## 2026-10-18, bouton de langue

### Ajouté
- Un bouton, orné du drapeau de la langue en cours (France, Royaume-Uni, Québec), fait passer du français
  à l’anglais puis au québécois. Le choix est gardé avec les autres réglages, comme l’accordage ; le thème
  de couleurs avait déjà son propre choix gardé.

### Modifié
- Le français est la langue par défaut, au lieu de suivre la langue du navigateur : l’option
  « Automatique » a disparu, et un « auto » gardé retombe sur le français. `?lang=` impose toujours une
  langue jusqu’au prochain choix.

## 2026-10-18, pas de bandes de marge sur la corde détectée

### Modifié
- La ligne de la corde détectée n’a pas de bandes de marge : sa hauteur est dans la bonne plage et le
  tracé montre où, si bien que ce sont les bandes des autres lignes qui distinguent les notes. Elles
  s’y effacent en fondu (`STRIP_FADE_RATE`, environ une demi-seconde) et reviennent quand la note
  s’arrête, au lieu de sauter.

## 2026-10-18, activité des autres cordes dans les marges

### Ajouté
- Chaque ligne a une bande sur son bord gauche pour les cordes plus graves que la sienne, et une sur son
  bord droit pour les plus aiguës, une colonne par corde, qui glisse vers le haut comme le tracé. Elles
  montrent l’énergie du son près de chaque corde (`stringActivity` dans `pitch.js`), pour que la corde
  détectée ressorte.
- Les marges ne sont jamais vides : l’activité est relative au plancher de bruit de chaque corde, si bien
  qu’une pièce calme la fait bouger autant qu’une pièce bruyante (0,29 en moyenne, 0,15 ou plus neuf images
  sur dix, de -74 à -34 dBFS) ; quand le microphone est éteint, elles respirent doucement, et restent
  immobiles avec « réduire les animations ».
- Des tests pour les niveaux (un son pur allume sa corde et les autres restent 70 dB plus bas, les
  harmoniques allument les cordes sur lesquelles ils tombent, les deux cordes les plus graves d’une basse
  sont distinguées, le silence numérique) et pour le plancher de bruit.

### Notes
- La fenêtre est une fenêtre de Blackman-Harris, de 16384 échantillons pour une guitare : avec une fenêtre
  de Hann, une note allumait les autres cordes, et avec 8192 échantillons le 2ᵉ harmonique d’un A2
  allumait le G3 et le B3.
- Les commandes et les noms de notes sont décalés de la largeur d’une bande (`STRIP_WIDTH`).
- Les schémas d’aide ne montrent pas encore les marges.

## 2026-10-18, filtre passe-bas et filtre anti-pic

La détection du 2026-10-17 a été mesurée de nouveau, et certains de ses choix étaient faux.

### Modifié
- Un filtre passe-bas du second ordre (coupure à 3 fois la fréquence la plus haute recherchée) revient
  devant la méthode de McLeod. Sans lui, un bruit blanc à 15 dB donnait une erreur de 4,2 cents (95ᵉ
  centile) au lieu de 0,44 cent, 46 % des notes à 12 dB ou moins n’étaient pas lues (21 % maintenant), et
  le claquement de l’attaque de la corde faisait lire 10 notes sur 36 une octave ou plus trop bas, 80 ms
  après le pincement (aucune maintenant).
- `CLARITY_MIN` passe de 0,6 à 0,8 : avec le passe-bas, les notes bruitées sont de nouveau lues, et une
  clarté de 0,6 laissait 15 notes aléatoires sur 6000 être lues à tort, contre 4.
- Le suiveur utilise un filtre anti-pic (`SPIKE_CENTS`, 50 cents) au lieu d’une simple médiane :
  l’affichage a 40 ms de retard sur une hauteur qui change, au lieu de 131 ms, et l’étiquette clignote
  tout aussi peu.

### Corrigé
- Le README comparait la nouvelle détection à l’ancien algorithme sans ses filtres Web Audio, ce qui
  cachait la perte de sensibilité au bruit. Le tableau, les chiffres de clignotement (21 trous et 1 image
  fausse avant, pas 75 et 10), l’affirmation de précision (au plus 0,2 cent, 0,6 cent pour le E1 d’une
  basse) et l’explication des erreurs d’attaque sont corrigés, et les limites de la basse (ronflement du
  secteur, grondement) sont écrites.

### Ajouté
- Des tests pour le passe-bas, le bruit à 8 dB, le claquement de l’attaque, et le suiveur (une hauteur qui
  change en douceur est suivie sans retard, un saut vers une autre corde après une analyse).

### Discussions
Elles couvrent les discussions du 2026-10-18 sur la détection, les marges et les tests.

- **Qualité de la détection, deuxième regard** (commencé tard le 2026-10-17). Les sept points de l’audit
  ont été mesurés de nouveau sur le code livré, et plusieurs conclusions antérieures étaient fausses.
  Résultat : le filtre passe-bas est de retour, `CLARITY_MIN` vaut 0,8, le suiveur utilise un filtre
  anti-pic, et les chiffres du README ont été remplacés par des mesures. Cinq tests ont été ajoutés et
  vérifiés par mutation (sans le passe-bas trois échouent, sans le filtre anti-pic le test du retard
  échoue). Commité avec les marges ([`706a1cb`](https://github.com/laurentperrinet/guitoune/commit/706a1cb)) ; les mesures sont maintenant dans l’entrée ci-dessous.
- **Marges d’activité** ([`706a1cb`](https://github.com/laurentperrinet/guitoune/commit/706a1cb), entrées ci-dessus). Demande : montrer sur les côtés l’activité des
  autres notes, pour que la note détectée ressorte. Choix faits : l’énergie réelle du son, les cordes plus
  graves à gauche et les plus aiguës à droite, et une respiration lente au repos. Deux erreurs de réglage
  ont été trouvées en chemin : la fenêtre de Hann laissait une note allumer les autres cordes (d’où
  Blackman-Harris), et un plancher de bruit trop haut donnait exactement 0 dans une pièce calme (d’où un
  plancher de bruit par corde, dans `createActivityMeter()`).
- **Vérification du README.** Une deuxième passe de `/harmonize-code` a trouvé les cinq étapes du modèle
  et les 27 lignes du tableau des variables cohérentes avec `pitch.js`, en anglais et en français.
- **Tests en échec sur GitHub Actions** ([`c4185ed`](https://github.com/laurentperrinet/guitoune/commit/c4185ed)). `npm test` lance maintenant
  `node --test tests/*.test.js` (l’ancienne commande échouait sur Node 22) et le workflow utilise
  `checkout@v5` et `setup-node@v5` (plus d’avertissement sur Node 20 déprécié). Les tests de cohérence du
  README avaient alors échoué parce que `LP_RATIO` et `SPIKE_CENTS` manquaient dans le tableau des
  variables et que `CLARITY_MIN` y disait encore 0,6 : le tableau suit maintenant le code.

## 2026-10-18, ce qui a été mesuré sur la détection

Ces chiffres viennent de bancs d’essai ponctuels sur des cordes pincées **synthétiques** (6 cordes, trois spectres, raideur, bruit, ronflement, attaque, 44,1 et 48 kHz, graines explicites), en comparaison avec la chaîne qu’utilisait Guitoune auparavant : l’autocorrélation simple avec une fenêtre de Hann, derrière deux filtres Web Audio. Le script du banc d’essai n’est pas conservé dans le dépôt ; ses seuils vivent dans [tests/pitch.test.js](tests/pitch.test.js). **Aucun enregistrement réel n’a été utilisé**, et le coût sur téléphone n’a pas été mesuré.

| Condition | Erreur avant (médiane / 95ᵉ centile) | Erreur maintenant |
|-----------|---------------------------------------|-------------------|
| Son harmonique, propre | 0,13 / 1,17 cent | 0,01 / 0,03 cent |
| Bruit blanc à 25 dB | 0,12 / 1,16 cent | 0,04 / 0,11 cent |
| Bruit blanc à 15 dB | 0,13 / 1,14 cent | 0,11 / 0,44 cent |
| Corde raide ($B=4\cdot10^{-4}$) | 3,35 / 3,89 cents trop haut | 2,53 / 3,30 cents trop haut |

Sur **6000 notes aléatoires** (fondamental de 2 % à 100 % du deuxième partiel, décroissance de 0,5 à 8 fois celle d’une corde normale, bruit de 8 à 50 dB, raideur, une attaque sur la moitié d’entre elles), les mêmes notes pour les deux :

| | Avant | Maintenant |
|---|---|---|
| Erreurs grossières (plus de 100 cents) | 21 (0,35 %) | **4 (0,07 %)** |
| dont avec un bruit à 12 dB ou moins (554 notes) | 20 | 3 |
| Notes non lues | 11,2 % | 15,3 % |
| dont avec un bruit à 12 dB ou moins | 7,8 % | 20,8 % |
| Erreur, 95ᵉ / 99ᵉ centile | 4,9 / 7,0 cents | 4,2 / 6,3 cents |

Le module se trompe donc cinq fois moins souvent, mais il lit moins de notes faibles ou qui s’éteignent vite : il exige une clarté de 0,8. Avec 0,6 il en lit autant qu’avant, et se trompe 15 fois (0,25 %).

### Notes
- **Cordes raides et précision.** Les partiels d’une corde épaisse sont plus hauts que de vrais harmoniques, donc la période donne une hauteur de quelques cents au‑dessus du premier partiel : cela vient de la corde, et aucune vraie corde n’a été mesurée. Sur des sons idéaux désaccordés de -50 à +50 cents, l’erreur est d’au plus 0,18 cent sur une guitare (le E2), 0,03 cent sur un ukulélé et 0,6 cent sur le E1 d’une basse.
- **Coût.** 0,3 ms par analyse pour une guitare et 0,8 ms pour une basse, contre 8 ms auparavant. Avec un moteur JavaScript qui ne compile pas, une borne pessimiste, 16 et 33 ms contre 466 ms.
- **Erreurs d’octave.** Avec le ratio de pics habituel de 0,9, 6 notes sur 12 dont le fondamental est presque absent et qui s’éteignent vite étaient lues une octave trop haut, d’où $\kappa=0{,}97$ ; une sur 12 à une décroissance extrême (12 fois une corde normale) l’est encore.
- **Bruit et attaque.** Le passe‑bas est nécessaire. Sans lui, un bruit à 15 dB donne 4,2 cents (95ᵉ centile), 46 % des notes à 12 dB ou moins ne sont pas lues, et le claquement de l’attaque de la corde (3 fois plus fort que la note) fait lire 10 notes sur 36 une octave ou une douzième trop bas 80 ms après le pincement, l’une d’elles comme une autre corde. Le claquement abaisse $n(\tau)$ à la vraie période (à environ 0,76 au lieu de 1,0) et le laisse un peu plus haut au double de la période (0,77), si bien que le ratio de pics choisit parfois la plus longue. Maintenant aucune n’est fausse ; 29 notes sur 36 sont lues 30 ms après le pincement (22 avec le claquement), et toutes dès 80 ms.
- **Perturbations.** Le ronflement du secteur à 50 Hz donnait 17 % d’erreurs grossières avant et celui à 60 Hz 83 % ; aucune maintenant sur une guitare. Un grondement deux fois plus fort que la note faisait se tromper dès 30 Hz (8 notes sur 36, puis toutes dès 50 Hz) ; maintenant il ne trompe jamais, mais il arrête la lecture quand il est fort : à 40 Hz, 24 notes sur 36 ne sont pas lues, et aucune dès 50 Hz. **Une basse est plus exposée** : ses cordes sont proches du ronflement, qui fausse 6 notes sur 24 à 50 Hz et 3 à 60 Hz, et un grondement à 18 Hz ou plus arrête la plupart des lectures (un à 40 Hz en fausse 4 sur 24).
- **Clignotement et retard.** Dans une pièce bruyante, sur 4320 analyses, 21 trous et 1 image sur une mauvaise corde avant, 1 et 0 maintenant, et 3442 mesures contre 2700. Sans le filtre anti‑pic, 21 trous et 5 images fausses. Pendant qu’on tourne une cheville à 20 cents par seconde, l’affichage a 40 ms de retard sur la corde (0,8 cent), contre 65 ms avant ; une simple médiane de 3 mesures aurait eu 131 ms (2,6 cents), d’où le filtre anti‑pic.
- **Filtres.** Les deux sont nécessaires. Le passe‑haut empêche un grondement de masquer la période. Il était faux auparavant : Web Audio lit le `Q` de ces filtres en dB, donc l’ancienne valeur 0,707 donnait un facteur de qualité de 1,085, une résonance qui relevait 50 Hz de 0,7 dB au lieu de l’abaisser de 3 dB. Une coupure plus haute arrête un grondement à 40–60 Hz, mais échoue avec le ronflement à 60 Hz (10 à 12 notes sur 36 fausses) : 0,6 est donc conservé.
- **Marges.** Sur un son pur, les autres cordes sont à 70 dB ou plus sous la corde qui sonne, grâce à la fenêtre de Blackman-Harris (avec une fenêtre de Hann, une note allumait les autres cordes à environ 50 dB sous elle, et avec une fenêtre de 8192 échantillons le 2ᵉ harmonique d’un A2 allumait le G3 et le B3). Avec du bruit seul, l’activité vaut 0,29 en moyenne, et 0,15 ou plus neuf images sur dix, **quel que soit le niveau du bruit de −74 à −34 dBFS**, parce qu’elle est relative au plancher de bruit de chaque corde ; une note jouée dans ce bruit donne 1,00, contre 0,34 en moyenne pour les cordes qui ne sont pas sur un harmonique. Les harmoniques de la note allument les cordes sur lesquelles ils tombent (le E4 pour le 3ᵉ harmonique d’un A2), et les premiers instants d’un pincement allument toutes les cordes, l’attaque étant à large bande. La fenêtre dure 0,34 s pour une guitare, donc les marges ont environ 0,17 s de retard sur le son. Des zéros exacts, que nul microphone ne donne, ne montrent que l’opacité de base.

## 2026-10-17, détection, instruments et tests

### Modifié
- Détection de hauteur : la méthode de McLeod calculée par FFT remplace l’autocorrélation simple
  (environ 0,3 ms par analyse au lieu de 8 ms sur un Apple M3 Ultra). Le signal n’est plus fenêtré
  (la fenêtre de Hann faussait la lecture vers le haut, de 0,65 cent à 82 Hz), la bande recherchée est
  déduite de l’accordage, et la fenêtre est adaptée à la corde la plus grave.
- Le filtre passe-bas est retiré. Le filtre passe-haut est maintenant appliqué par `detectPitch()` avec un
  facteur de qualité correct : Web Audio lit `Q` en dB, donc l’ancienne valeur 0,707 valait en fait 1,085.
- La note affichée ne clignote plus : médiane des dernières mesures, choix stable de la corde, et la
  dernière corde est gardée pendant une courte interruption.
- La page charge son traitement du signal depuis `pitch.js`, comme module ES, et le tableau des variables
  de son `README` suit le code.

### Ajouté
- Les accordages de basse (4 cordes, drop D) et d’ukulélé (standard, sol grave, baryton) : 12 accordages
  en tout, avec un nombre de lignes variable.
- Interface en anglais, en français et en québécois, choisie d’après la langue du navigateur (anglais ou
  français) ou dans les réglages ; `?lang=en`, `?lang=fr` ou `?lang=qc` dans l’adresse en impose une.
- Le schéma d’explication du bouton d’aide en français et en québécois (`guitoune_howto.fr.svg`,
  `guitoune_howto.qc.svg`), affiché dans la langue de la page ; des drapeaux en haut du README pour les
  trois langues, et une section québécoise avec l’histoire du mot *guitoune*.
- Économie de batterie dans les réglages (30 images par seconde).
- Des balises Open Graph et Twitter, et une Content-Security-Policy.
- Des tests avec `node:test` pour la détection, le suiveur, et la cohérence entre le code, le README, les
  traductions et le cache hors ligne ; un workflow GitHub Actions ; `.gitignore`.

### Corrigé
- Un fort grondement basse fréquence, un décalage continu ou le ronflement du secteur à 50 Hz pouvaient
  donner une mauvaise note ou aucune.

### Discussions
- **Revue de tout le site, lots 1 à 5.** Audit de `index.html`, du README et du logo, puis corrections
  par lots. Le lot 1 a durci le microphone et l’affichage ([`bb95944`](https://github.com/laurentperrinet/guitoune/commit/bb95944)) ; le lot 2 (réglages, lecture
  numérique, thèmes, mode hors ligne) est dans [`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9) ; les lots 3 à 5 (détection de McLeod, basse et
  ukulélé, français, tests, CI) sont [`e486e87`](https://github.com/laurentperrinet/guitoune/commit/e486e87). Sur des signaux synthétiques, l’erreur de l’ancienne
  détection était d’au plus 1,2 cent, sans erreur d’octave : les vrais défauts étaient autour (traitements
  de la voix par le navigateur, étiquette verte dès qu’une corde était reconnue, pas de verrou
  d’écran).
- **Cohérence du README et version française.** `/harmonize-code` sur le README : l’étape 4 française
  décrit maintenant les boutons comme une colonne le long du bord gauche, et la puce du retour visuel
  mentionne les cases en dégradé qui glissent vers le haut. Les formules et le tableau des variables ont
  été laissés jusqu’à ce que la page importe `pitch.js`, ce que [`e486e87`](https://github.com/laurentperrinet/guitoune/commit/e486e87) a fait.
- **Français et québécois.** Des versions française et québécoise du schéma d’aide, de l’interface et du
  README, avec des drapeaux en haut du README ([`6d1f6cd`](https://github.com/laurentperrinet/guitoune/commit/6d1f6cd)). Les 32 tests passaient et la page a été essayée
  dans Firefox avec `?lang=fr` et `?lang=qc`. Un point reste ouvert : les sections « À propos du nom »
  disent encore que *guitoune* est un mot québécois pour « cigarette », ce qui n’a pas pu être confirmé.

## 2026-10-17, application web

### Ajouté
- Démarrage du microphone durci : ni annulation d’écho, ni suppression de bruit, ni contrôle automatique
  de gain, un bouton de démarrage, des erreurs affichées dans la page, verrou d’écran, suspension en
  arrière-plan ([`bb95944`](https://github.com/laurentperrinet/guitoune/commit/bb95944), [`fb7cbd4`](https://github.com/laurentperrinet/guitoune/commit/fb7cbd4)).
- Réglages (accordage, diapason A4, échelle fine), lecture numérique sous la note, annonces pour les
  lecteurs d’écran, cinq thèmes de couleurs, bouton plein écran, boîte de dialogue d’aide avec un schéma,
  application web installable hors ligne avec ses icônes ([`7572495`](https://github.com/laurentperrinet/guitoune/commit/7572495), [`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9), [`dbf6425`](https://github.com/laurentperrinet/guitoune/commit/dbf6425), [`2eec2c4`](https://github.com/laurentperrinet/guitoune/commit/2eec2c4)).
- Boutons de commande empilés en colonne le long du bord gauche ([`893d349`](https://github.com/laurentperrinet/guitoune/commit/893d349)).

### Modifié
- La licence est maintenant l’AGPLv3 ([`ff723d6`](https://github.com/laurentperrinet/guitoune/commit/ff723d6)).
- Nouveau logo et nouvelles icônes : une guitare avec un bouquet de fleurs ([`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9), [`0be4b90`](https://github.com/laurentperrinet/guitoune/commit/0be4b90),
  [`ae66629`](https://github.com/laurentperrinet/guitoune/commit/ae66629)).
- Le schéma d’explication est une image vectorielle ([`03e2304`](https://github.com/laurentperrinet/guitoune/commit/03e2304)).

### Discussions
- **Bouton microphone** ([`bb95944`](https://github.com/laurentperrinet/guitoune/commit/bb95944)). Le bouton en haut à droite allume et éteint le microphone, et sa
  couleur va du vert (silence) au rouge (maximum) selon le niveau : RMS en dBFS entre `LEVEL_MIN_DB`
  (-60) et `LEVEL_MAX_DB` (-10), qui monte vite et redescend lentement pour que l’attaque d’une corde
  reste visible.
- **Installer sur iOS et fonctionner hors connexion** ([`fb7cbd4`](https://github.com/laurentperrinet/guitoune/commit/fb7cbd4), [`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9)). Réponse à « comment
  l’utiliser sur iOS sans internet » : l’application web hors ligne (manifeste, service worker, icônes)
  suffit une fois la page servie en https, par exemple avec GitHub Pages. Garder la page ouverte a mené
  à laisser le microphone ouvert quand la page est cachée, et à la gestion d’une capture qui se termine.
- **Bouton plein écran** ([`7572495`](https://github.com/laurentperrinet/guitoune/commit/7572495)), en haut à gauche ; le commit ne contient que ses 76 lignes de
  `index.html`.
- **Licence** ([`ff723d6`](https://github.com/laurentperrinet/guitoune/commit/ff723d6)). Des alternatives à la GPL ont été comparées, la combinaison avec l’EUPL a été
  discutée, et le choix le plus simple a été gardé : l’AGPLv3, qui couvre l’usage du code comme service
  web.
- **Thèmes et cascade.** Un bouton rond en bas à gauche fait défiler cinq thèmes (sombre, clair,
  cappuccino, tons de bois, océan), le dernier étant gardé dans `localStorage`. Les couleurs qui défilent
  sont devenues des cases en dégradé avec une lueur, ce qui était trop hypnotique : les traits et les
  lueurs ont été retirés et les dégradés gardés ([`dbf6425`](https://github.com/laurentperrinet/guitoune/commit/dbf6425)).
- **Icône** ([`7962cf9`](https://github.com/laurentperrinet/guitoune/commit/7962cf9), [`0be4b90`](https://github.com/laurentperrinet/guitoune/commit/0be4b90), [`5d063b8`](https://github.com/laurentperrinet/guitoune/commit/5d063b8), [`53c5279`](https://github.com/laurentperrinet/guitoune/commit/53c5279), [`ae66629`](https://github.com/laurentperrinet/guitoune/commit/ae66629)). Une guitare vue de face avec un
  bouquet de six fleurs (une fleur par corde) et six papillons (une note à placer sur chaque fleur),
  chacun avec sa propre trajectoire de vol en tire-bouchon. La profondeur des points de la trajectoire a
  été linéarisée pour donner une impression continue, et les feuilles ont été réalignées derrière la
  tête du manche.
- **Schéma d’explication** ([`03e2304`](https://github.com/laurentperrinet/guitoune/commit/03e2304), [`6f62777`](https://github.com/laurentperrinet/guitoune/commit/6f62777), [`d83c277`](https://github.com/laurentperrinet/guitoune/commit/d83c277)). Redessiné à partir du JPEG en image
  vectorielle, avec des flèches de Bézier continues, une flèche bidirectionnelle grave/aigu, puis la
  légende des boutons de commande et leur nouvelle disposition.
- **Boîte de dialogue d’aide** ([`dbf6425`](https://github.com/laurentperrinet/guitoune/commit/dbf6425), [`2eec2c4`](https://github.com/laurentperrinet/guitoune/commit/2eec2c4)). Le bouton **?** montre le schéma avec deux flèches
  rondes pour le faire défiler à gauche et à droite (une flèche disparaît au bord) ; le titre et le lien
  « pleine taille » ont été retirés, et un lien vers le code source et la licence est à côté de
  **Fermer**.
- **Boutons de commande** ([`893d349`](https://github.com/laurentperrinet/guitoune/commit/893d349)). Tous les boutons sont groupés en colonne le long du bord gauche,
  pour qu’ils ne chevauchent plus la note E2.

## 2026-01-06 à 2026-01-25

- Fenêtre de Hann, paramètres de traitement du signal et réglages de mise en page ; panneau de débogage,
  puis simplifié ([`e65b032`](https://github.com/laurentperrinet/guitoune/commit/e65b032), [`2449c6a`](https://github.com/laurentperrinet/guitoune/commit/2449c6a), [`0975697`](https://github.com/laurentperrinet/guitoune/commit/0975697), [`6bda292`](https://github.com/laurentperrinet/guitoune/commit/6bda292)).
- README avec une version française et une image de démonstration ([`be205cc`](https://github.com/laurentperrinet/guitoune/commit/be205cc), [`3be8907`](https://github.com/laurentperrinet/guitoune/commit/3be8907), [`dae13e3`](https://github.com/laurentperrinet/guitoune/commit/dae13e3),
  [`61c5283`](https://github.com/laurentperrinet/guitoune/commit/61c5283)).

## 2025-12-20

- Premières versions : accordeur à six cordes avec un canevas par corde, affichage en cascade, logo,
  README ([`046fcde`](https://github.com/laurentperrinet/guitoune/commit/046fcde) à [`9788c5b`](https://github.com/laurentperrinet/guitoune/commit/9788c5b)).
