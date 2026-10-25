# Génère public/library.json (quiz prêts à l'emploi). Lancer : python3 tools/make_library.py
import json, os
packs = []

def single(text, good, wrongs, explain=''):
    return {'t': 'single', 'text': text, 'good': good, 'wrongs': wrongs, 'explain': explain}

def quiz(pid, title, theme, level, items):
    qs = []
    for i, it in enumerate(items):
        choices = list(it['wrongs'])
        pos = (i * 3) % (len(choices) + 1)
        choices.insert(pos, it['good'])
        qs.append({'type': 'single', 'text': it['text'], 'image': '', 'choices': choices, 'correct': pos,
                   'answers': [], 'double': False, 'explain': it['explain']})
    packs.append({'pid': pid, 'theme': theme, 'level': level, 'kind': 'quiz', 'title': title, 'questions': qs})

quiz('capitales', 'Capitales du monde', 'Géographie', 'Facile', [
 single('Quelle est la capitale de l\'Australie ?', 'Canberra', ['Sydney', 'Melbourne', 'Perth'], 'Sydney est la plus grande ville, mais la capitale est Canberra.'),
 single('Quelle est la capitale du Canada ?', 'Ottawa', ['Toronto', 'Montréal', 'Vancouver'], 'Ottawa se trouve dans la province de l\'Ontario.'),
 single('Quelle est la capitale du Brésil ?', 'Brasilia', ['Rio de Janeiro', 'São Paulo', 'Salvador'], 'Brasilia est capitale depuis 1960, Rio l\'était avant.'),
 single('Quelle est la capitale du Japon ?', 'Tokyo', ['Kyoto', 'Osaka', 'Hiroshima'], 'Kyoto a été capitale impériale pendant plus de mille ans.'),
 single('Quelle est la capitale de l\'Égypte ?', 'Le Caire', ['Alexandrie', 'Louxor', 'Assouan'], 'Le Caire est au bord du Nil.'),
 single('Quelle est la capitale de la Turquie ?', 'Ankara', ['Istanbul', 'Izmir', 'Antalya'], 'Istanbul est plus grande, mais Ankara est la capitale depuis 1923.'),
 single('Quelle est la capitale de l\'Espagne ?', 'Madrid', ['Barcelone', 'Séville', 'Valence'], 'Madrid est la capitale, au centre du pays.'),
 single('Quelle est la capitale du Maroc ?', 'Rabat', ['Casablanca', 'Marrakech', 'Fès'], 'Casablanca est la plus grande ville, Rabat est la capitale.'),
 single('Quelle est la capitale de la Suisse ?', 'Berne', ['Zurich', 'Genève', 'Bâle'], 'Berne est appelée « ville fédérale ».'),
 single('Quelle est la capitale de l\'Argentine ?', 'Buenos Aires', ['Córdoba', 'Rosario', 'Mendoza'], 'Buenos Aires est aussi la plus grande ville du pays.'),
])
quiz('animaux', 'Animaux', 'Nature', 'Facile', [
 single('Quel est le plus grand animal terrestre ?', 'L\'éléphant d\'Afrique', ['La girafe', 'Le rhinocéros', 'L\'hippopotame'], 'Il peut peser plus de 6 tonnes.'),
 single('Combien de pattes a une araignée ?', '8', ['6', '10', '4'], 'Les insectes en ont 6, les araignées 8.'),
 single('Quel animal est le plus rapide sur terre ?', 'Le guépard', ['Le lion', 'Le cheval', 'L\'antilope'], 'Le guépard atteint environ 100 km/h en pointe.'),
 single('Quel animal pond des œufs ?', 'L\'ornithorynque', ['Le dauphin', 'Le chat', 'La chauve-souris'], 'C\'est un des rares mammifères qui pondent des œufs.'),
 single('Comment s\'appelle le petit de la chèvre ?', 'Le chevreau', ['L\'agneau', 'Le veau', 'Le poulain'], 'Le petit de la brebis est l\'agneau.'),
 single('Quel est le plus grand animal du monde ?', 'La baleine bleue', ['L\'éléphant', 'Le requin-baleine', 'Le calmar géant'], 'C\'est le plus grand animal connu qui ait jamais vécu.'),
 single('Que mange principalement un panda géant ?', 'Du bambou', ['De la viande', 'Des fruits', 'Du poisson'], 'Il en mange plusieurs kilos par jour.'),
 single('Quel animal change de couleur pour se camoufler ?', 'Le caméléon', ['Le lézard vert', 'Le serpent', 'Le crocodile'], 'Il change aussi de couleur selon son humeur.'),
 single('Combien de cœurs a une pieuvre ?', '3', ['1', '2', '4'], 'Deux pour les branchies, un pour le reste du corps.'),
 single('Quel oiseau ne sait pas voler ?', 'Le manchot', ['Le pigeon', 'L\'hirondelle', 'Le faucon'], 'Il nage très bien grâce à ses ailes en forme de nageoires.'),
])
quiz('espace', 'L\'espace et les planètes', 'Sciences', 'Facile', [
 single('Quelle est la planète la plus proche du Soleil ?', 'Mercure', ['Vénus', 'Mars', 'La Terre'], 'Mercure est aussi la plus petite planète du système solaire.'),
 single('Quelle planète est surnommée la planète rouge ?', 'Mars', ['Jupiter', 'Vénus', 'Saturne'], 'Sa couleur vient de l\'oxyde de fer (la rouille) dans le sol.'),
 single('Quelle est la plus grande planète du système solaire ?', 'Jupiter', ['Saturne', 'Neptune', 'La Terre'], 'On pourrait y faire entrer plus de 1000 Terres.'),
 single('Quelle planète est connue pour ses anneaux ?', 'Saturne', ['Mars', 'Mercure', 'Vénus'], 'Jupiter, Uranus et Neptune ont aussi des anneaux, mais plus discrets.'),
 single('Comment s\'appelle notre galaxie ?', 'La Voie lactée', ['Andromède', 'Le Grand Nuage', 'Orion'], 'Le Soleil est une étoile parmi des centaines de milliards.'),
 single('Combien y a-t-il de planètes dans le système solaire ?', '8', ['9', '7', '10'], 'Pluton est maintenant classée « planète naine » depuis 2006.'),
 single('Comment s\'appelle le satellite naturel de la Terre ?', 'La Lune', ['Phobos', 'Titan', 'Europe'], 'Elle met environ 27 jours à faire le tour de la Terre.'),
 single('Qui a été le premier humain dans l\'espace ?', 'Youri Gagarine', ['Neil Armstrong', 'Buzz Aldrin', 'Thomas Pesquet'], 'C\'était en 1961, à bord de Vostok 1.'),
 single('Qui a marché le premier sur la Lune ?', 'Neil Armstrong', ['Youri Gagarine', 'Buzz Aldrin', 'John Glenn'], 'C\'était en juillet 1969, mission Apollo 11.'),
 single('Quelle étoile est la plus proche de la Terre ?', 'Le Soleil', ['Proxima du Centaure', 'Sirius', 'L\'étoile Polaire'], 'La lumière du Soleil met environ 8 minutes à nous arriver.'),
])
quiz('histoire-france', 'Histoire de France', 'Histoire', 'Moyen', [
 single('En quelle année a eu lieu la prise de la Bastille ?', '1789', ['1492', '1815', '1914'], 'Le 14 juillet 1789, début de la Révolution française.'),
 single('Qui était le roi surnommé « le Roi-Soleil » ?', 'Louis XIV', ['Louis XVI', 'François Ier', 'Henri IV'], 'Il a régné 72 ans et fait construire Versailles.'),
 single('Qui a été sacré empereur des Français en 1804 ?', 'Napoléon Bonaparte', ['Louis XVIII', 'Charlemagne', 'Charles de Gaulle'], 'Il s\'est couronné lui-même à Notre-Dame.'),
 single('Quelle héroïne a été brûlée à Rouen en 1431 ?', 'Jeanne d\'Arc', ['Marie-Antoinette', 'Aliénor d\'Aquitaine', 'Catherine de Médicis'], 'Elle a aidé Charles VII pendant la guerre de Cent Ans.'),
 single('En quelle année a débuté la Première Guerre mondiale ?', '1914', ['1905', '1918', '1939'], 'Elle a duré jusqu\'au 11 novembre 1918.'),
 single('Comment s\'appelle la période de 1939 à 1945 ?', 'La Seconde Guerre mondiale', ['La guerre de Cent Ans', 'La Révolution', 'La Guerre froide'], 'Elle s\'est terminée en Europe le 8 mai 1945.'),
 single('Quel roi a fait construire le château de Versailles ?', 'Louis XIV', ['Louis XI', 'Charles V', 'Napoléon III'], 'Louis XIII y avait seulement un pavillon de chasse.'),
 single('Quelle bataille a eu lieu en 1815 ?', 'Waterloo', ['Austerlitz', 'Verdun', 'Marignan'], 'C\'est la défaite finale de Napoléon.'),
 single('Qui était le premier président de la Ve République ?', 'Charles de Gaulle', ['Georges Pompidou', 'François Mitterrand', 'Valéry Giscard d\'Estaing'], 'Élu fin 1958, en fonction en 1959, après la Constitution de 1958.'),
 single('Quel monument a été offert à New York par la France ?', 'La statue de la Liberté', ['La tour Eiffel', 'Le Sphinx', 'L\'Arc de triomphe'], 'Inaugurée en 1886, elle a été conçue par Bartholdi.'),
])
quiz('corps', 'Le corps humain', 'Sciences', 'Facile', [
 single('Combien d\'os a un adulte ?', '206', ['106', '306', '412'], 'Un bébé en a environ 300, certains se soudent en grandissant.'),
 single('Quel organe pompe le sang dans le corps ?', 'Le cœur', ['Le foie', 'Les poumons', 'L\'estomac'], 'Il bat environ 100 000 fois par jour.'),
 single('Quel est le plus grand organe du corps humain ?', 'La peau', ['Le foie', 'L\'intestin', 'Le cerveau'], 'Elle couvre environ 2 m² chez un adulte.'),
 single('Combien de dents a un adulte (avec les dents de sagesse) ?', '32', ['28', '30', '36'], '28 sans les dents de sagesse.'),
 single('Quel gaz respirons-nous pour vivre ?', 'L\'oxygène', ['Le gaz carbonique', 'L\'azote seul', 'L\'hélium'], 'L\'air contient environ 21 % d\'oxygène.'),
 single('Quel organe nous permet de penser ?', 'Le cerveau', ['Le cœur', 'Le foie', 'Les reins'], 'Il contient des milliards de neurones.'),
 single('Comment s\'appelle l\'os de la cuisse ?', 'Le fémur', ['Le tibia', 'L\'humérus', 'Le radius'], 'C\'est le plus long et le plus solide os du corps.'),
 single('Combien de sens principaux avons-nous ?', '5', ['3', '4', '7'], 'La vue, l\'ouïe, l\'odorat, le goût et le toucher.'),
 single('Quel organe filtre le sang et produit l\'urine ?', 'Les reins', ['Le foie', 'La rate', 'Le pancréas'], 'Nous avons deux reins.'),
 single('Dans quelle partie du corps trouve-t-on l\'étrier, le plus petit os ?', 'L\'oreille', ['Le nez', 'La main', 'Le pied'], 'Il mesure environ 3 mm.'),
])
quiz('france-geo', 'Géographie de la France', 'Géographie', 'Facile', [
 single('Quel est le plus long fleuve de France ?', 'La Loire', ['La Seine', 'Le Rhône', 'La Garonne'], 'Elle mesure environ 1 000 km.'),
 single('Quel est le point culminant de France ?', 'Le mont Blanc', ['Le Puy de Dôme', 'Le mont Ventoux', 'Le Canigou'], 'Il culmine à environ 4 800 m.'),
 single('Quelle ville est surnommée « la ville rose » ?', 'Toulouse', ['Montpellier', 'Bordeaux', 'Albi'], 'À cause de ses bâtiments en briques rouges.'),
 single('Combien de régions compte la France métropolitaine ?', '13', ['12', '18', '22'], 'Depuis la réforme de 2016.'),
 single('Quelle mer borde le sud de la France ?', 'La Méditerranée', ['La mer du Nord', 'La Baltique', 'La mer Noire'], 'Marseille, Nice et Montpellier sont près de cette mer.'),
 single('Quelle est la plus grande ville de France après Paris ?', 'Marseille', ['Lyon', 'Toulouse', 'Nice'], 'Marseille est la deuxième ville de France en habitants.'),
 single('Quel pays n\'est PAS voisin de la France ?', 'Le Portugal', ['L\'Espagne', 'L\'Italie', 'La Belgique'], 'Le Portugal est voisin de l\'Espagne, pas de la France.'),
 single('Dans quelle ville se trouve la cathédrale Notre-Dame, rénovée après un incendie en 2019 ?', 'Paris', ['Reims', 'Chartres', 'Strasbourg'], 'Elle a rouvert ses portes en décembre 2024.'),
 single('Quelle île française est surnommée « l\'île de Beauté » ?', 'La Corse', ['La Réunion', 'La Martinique', 'Belle-Île'], 'Elle se trouve en Méditerranée.'),
 single('Quel département porte le numéro 75 ?', 'Paris', ['Lyon', 'Marseille', 'Lille'], 'Les départements sont numérotés par ordre alphabétique à l\'origine.'),
])
quiz('sciences', 'Sciences et nature', 'Sciences', 'Moyen', [
 single('Quelle est la formule chimique de l\'eau ?', 'H2O', ['CO2', 'O2', 'NaCl'], 'Deux atomes d\'hydrogène et un d\'oxygène.'),
 single('À quelle température l\'eau bout-elle (au niveau de la mer) ?', '100 °C', ['90 °C', '120 °C', '80 °C'], 'Elle gèle à 0 °C.'),
 single('Quel est le symbole chimique de l\'or ?', 'Au', ['Or', 'Ag', 'Go'], 'Vient du latin « aurum ».'),
 single('Qu\'est-ce que la photosynthèse ?', 'Les plantes fabriquent leur énergie avec la lumière', ['Les animaux digèrent leur nourriture', 'Les roches se transforment', 'Les nuages se forment'], 'Elles absorbent du CO2 et rejettent de l\'oxygène.'),
 single('Quelle force nous attire vers le sol ?', 'La gravité', ['Le magnétisme', 'La friction', 'L\'inertie'], 'Newton aurait compris la gravité en voyant tomber une pomme.'),
 single('Combien de continents compte-t-on généralement ?', '5 à 7 selon les modèles', ['3', '9', '12'], 'En France, on en compte souvent 5 ou 6.'),
 single('Dans quel état est l\'eau en dessous de 0 °C ?', 'Solide (glace)', ['Gazeux', 'Liquide', 'Plasma'], 'On parle de solidification.'),
 single('Quelle est la vitesse approximative de la lumière ?', '300 000 km/s', ['3 000 km/s', '30 000 km/s', '3 millions km/s'], 'Rien ne va plus vite dans le vide.'),
 single('Qui a découvert la gravitation universelle ?', 'Isaac Newton', ['Albert Einstein', 'Galilée', 'Marie Curie'], 'Il a publié sa théorie en 1687.'),
 single('Quel gaz les plantes absorbent-elles ?', 'Le dioxyde de carbone', ['L\'oxygène', 'L\'hélium', 'L\'azote'], 'Elles le transforment en matière avec la lumière du soleil.'),
])
quiz('culture', 'Culture générale', 'Culture générale', 'Moyen', [
 single('Qui a peint la Joconde ?', 'Léonard de Vinci', ['Michel-Ange', 'Raphaël', 'Picasso'], 'Elle est exposée au musée du Louvre.'),
 single('Combien de joueurs y a-t-il dans une équipe de football sur le terrain ?', '11', ['9', '10', '12'], 'Gardien compris.'),
 single('Quel est le plus grand océan ?', 'L\'océan Pacifique', ['L\'Atlantique', 'L\'Indien', 'L\'Arctique'], 'Il couvre environ un tiers de la surface du globe.'),
 single('Dans quelle ville se trouve la tour Eiffel ?', 'Paris', ['Lyon', 'Londres', 'Rome'], 'Elle a été terminée en 1889.'),
 single('Combien de jours compte une année bissextile ?', '366', ['365', '364', '367'], 'Le 29 février existe tous les 4 ans (en général).'),
 single('Quel écrivain a écrit « Les Misérables » ?', 'Victor Hugo', ['Émile Zola', 'Molière', 'Alexandre Dumas'], 'Publié en 1862.'),
 single('Quelle langue parle-t-on au Brésil ?', 'Le portugais', ['L\'espagnol', 'Le brésilien', 'L\'anglais'], 'Le brésilien n\'existe pas comme langue : c\'est du portugais.'),
 single('Quel est le plus petit pays du monde ?', 'Le Vatican', ['Monaco', 'Saint-Marin', 'Malte'], 'Moins d\'un demi-kilomètre carré.'),
 single('Combien de couleurs a l\'arc-en-ciel ?', '7', ['5', '6', '8'], 'Rouge, orange, jaune, vert, bleu, indigo, violet.'),
 single('Quel instrument a 88 touches ?', 'Le piano', ['L\'orgue', 'L\'accordéon', 'Le violon'], 'Il y a 52 touches blanches et 36 noires.'),
])
quiz('drapeaux', 'Drapeaux (en émojis)', 'Géographie', 'Facile', [
 single('À quel pays appartient ce drapeau : 🇯🇵 ?', 'Le Japon', ['La Chine', 'La Corée du Sud', 'Le Vietnam'], 'Un disque rouge sur fond blanc.'),
 single('À quel pays appartient ce drapeau : 🇧🇷 ?', 'Le Brésil', ['L\'Argentine', 'Le Portugal', 'Le Mexique'], 'Vert et jaune avec un globe bleu.'),
 single('À quel pays appartient ce drapeau : 🇨🇦 ?', 'Le Canada', ['La Suisse', 'La Pologne', 'L\'Autriche'], 'Il porte une feuille d\'érable.'),
 single('À quel pays appartient ce drapeau : 🇮🇹 ?', 'L\'Italie', ['L\'Irlande', 'La Hongrie', 'Le Mexique'], 'Vert, blanc, rouge à la verticale.'),
 single('À quel pays appartient ce drapeau : 🇪🇸 ?', 'L\'Espagne', ['Le Portugal', 'L\'Andorre', 'La Roumanie'], 'Rouge et jaune.'),
 single('À quel pays appartient ce drapeau : 🇩🇪 ?', 'L\'Allemagne', ['La Belgique', 'L\'Autriche', 'Les Pays-Bas'], 'Noir, rouge et or à l\'horizontale.'),
 single('À quel pays appartient ce drapeau : 🇨🇭 ?', 'La Suisse', ['Le Danemark', 'La Géorgie', 'Malte'], 'Une croix blanche sur fond rouge, carré.'),
 single('À quel pays appartient ce drapeau : 🇦🇺 ?', 'L\'Australie', ['La Nouvelle-Zélande', 'Le Royaume-Uni', 'Fidji'], 'Avec l\'Union Jack et des étoiles.'),
 single('À quel pays appartient ce drapeau : 🇲🇦 ?', 'Le Maroc', ['La Turquie', 'La Tunisie', 'L\'Algérie'], 'Rouge avec une étoile verte.'),
 single('À quel pays appartient ce drapeau : 🇫🇷 ?', 'La France', ['Les Pays-Bas', 'La Russie', 'Le Luxembourg'], 'Bleu, blanc, rouge à la verticale.'),
])
quiz('homophones', 'Compléter la phrase : le bon mot', 'Français', 'Moyen', [])
# phrases à trous : texte avec _____ ; la bonne réponse est le mot manquant
def gap(sentence_with_brackets, wrongs, explain):
    import re
    m = re.search(r'\[([^\]]+)\]', sentence_with_brackets)
    good = m.group(1)
    text = sentence_with_brackets.replace(m.group(0), '_____')
    return {'type': 'single', 'text': text, 'image': '', 'choices': [good] + wrongs, 'correct': 0, 'answers': [], 'double': False, 'explain': explain, 'gapSrc': sentence_with_brackets}
packs[-1]['questions'] = [
 gap('Il [a] mangé toute la tarte.', ['à', 'as'], '« a » est le verbe avoir. Astuce : on peut dire « avait ».'),
 gap('Elle va [à] l\'école.', ['a', 'as'], '« à » est une préposition. Astuce : on ne peut pas dire « avait ».'),
 gap('[Ses] amis sont arrivés.', ['Ces', 'C\'est'], '« ses » = à lui ou à elle. Astuce : on peut dire « mes » ou « tes ».'),
 gap('[Ces] livres sont intéressants.', ['Ses', 'S\'est'], '« ces » montre quelque chose (ces livres-ci).'),
 gap('Il [et] elle sont partis.', ['est', 'ai'], '« et » relie deux mots. Astuce : on peut dire « et puis ».'),
 gap('Il [est] très content.', ['et', 'ai'], '« est » est le verbe être. Astuce : on peut dire « était ».'),
 gap('Nous [sommes] arrivés hier.', ['sont', 'somme'], '« sommes » est le verbe être avec « nous ».'),
 gap('Où [est] mon cartable ?', ['et', 'ai'], 'On peut dire « où était mon cartable ? ».'),
]
for q in packs[-1]['questions']:
    pass
quiz('ordre-planetes', 'Remettre dans l\'ordre', 'Sciences', 'Moyen', [])
packs[-1]['questions'] = [
 {'type': 'order', 'text': 'Classe les planètes de la plus proche à la plus éloignée du Soleil', 'image': '', 'choices': ['Mercure', 'Vénus', 'La Terre', 'Mars'], 'correct': 0, 'answers': [], 'double': False, 'explain': 'Mercure, Vénus, la Terre, puis Mars.'},
 {'type': 'order', 'text': 'Classe ces animaux du plus petit au plus grand', 'image': '', 'choices': ['La fourmi', 'Le chat', 'Le cheval', 'L\'éléphant', 'La baleine bleue'], 'correct': 0, 'answers': [], 'double': False, 'explain': 'La baleine bleue est le plus grand animal connu.'},
 {'type': 'order', 'text': 'Remets ces événements dans l\'ordre chronologique', 'image': '', 'choices': ['Prise de la Bastille', 'Sacre de Napoléon', 'Première Guerre mondiale', 'Seconde Guerre mondiale'], 'correct': 0, 'answers': [], 'double': False, 'explain': '1789, 1804, 1914, 1939.'},
 {'type': 'order', 'text': 'Remets les jours de la semaine dans l\'ordre, en commençant par jeudi', 'image': '', 'choices': ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Lundi'], 'correct': 0, 'answers': [], 'double': False, 'explain': 'Jeudi, vendredi, samedi, dimanche, lundi.'},
 {'type': 'order', 'text': 'Classe ces unités de la plus petite à la plus grande', 'image': '', 'choices': ['Le millimètre', 'Le centimètre', 'Le mètre', 'Le kilomètre'], 'correct': 0, 'answers': [], 'double': False, 'explain': '1 km = 1 000 m = 100 000 cm.'},
 {'type': 'order', 'text': 'Remets les étapes de la vie d\'un papillon dans l\'ordre', 'image': '', 'choices': ['L\'œuf', 'La chenille', 'La chrysalide', 'Le papillon'], 'correct': 0, 'answers': [], 'double': False, 'explain': 'C\'est la métamorphose.'},
]

def tf(pid, title, theme, rows):
    qs = [{'type': 'tf', 'text': t, 'image': '', 'choices': ['Vrai', 'Faux'], 'correct': 0 if v else 1, 'answers': [], 'double': False, 'explain': e} for t, v, e in rows]
    packs.append({'pid': pid, 'theme': theme, 'level': 'Facile', 'kind': 'quiz', 'flavor': 'tfrush', 'title': title, 'questions': qs})

tf('tf-nature', 'Vrai ou faux : nature et sciences', 'Nature', [
 ('Le dauphin est un poisson.', False, 'C\'est un mammifère.'),
 ('La baleine est un mammifère.', True, 'Elle respire de l\'air et allaite ses petits.'),
 ('Les chauves-souris sont des oiseaux.', False, 'Ce sont des mammifères.'),
 ('Le soleil est une étoile.', True, 'C\'est l\'étoile la plus proche de la Terre.'),
 ('Les araignées sont des insectes.', False, 'Elles ont 8 pattes : ce sont des arachnides.'),
 ('La Terre tourne autour du Soleil.', True, 'Un tour dure environ 365 jours.'),
 ('L\'eau bout à 50 °C au niveau de la mer.', False, 'Elle bout à 100 °C.'),
 ('Le cœur de la crevette est dans sa tête.', True, 'Il est situé dans la partie avant du corps.'),
 ('Le manchot vit au pôle Nord.', False, 'Les manchots vivent dans l\'hémisphère Sud.'),
 ('Un kilo de plumes pèse moins qu\'un kilo de plomb.', False, 'Les deux pèsent 1 kilo !'),
])
tf('tf-histoire', 'Vrai ou faux : histoire et monde', 'Histoire', [
 ('Napoléon était très petit.', False, 'Il mesurait environ 1,69 m, dans la moyenne de l\'époque.'),
 ('La tour Eiffel se trouve à Lyon.', False, 'Elle est à Paris.'),
 ('Paris est la capitale de la France.', True, ''),
 ('La Révolution française a commencé en 1789.', True, 'Avec la prise de la Bastille le 14 juillet.'),
 ('Les Vikings portaient des casques à cornes.', False, 'C\'est une légende née au XIXe siècle.'),
 ('Le Nil est un fleuve d\'Afrique.', True, 'Il traverse notamment l\'Égypte.'),
 ('L\'Australie est un pays et un continent.', True, 'C\'est l\'un des rares dans ce cas.'),
 ('Christophe Colomb est arrivé en Amérique en 1492.', True, 'Il pensait atteindre les Indes.'),
 ('La Grande Muraille de Chine est visible depuis la Lune à l\'œil nu.', False, 'C\'est un mythe.'),
 ('Cléopâtre vivait plus près de nous que de la construction des pyramides de Gizeh.', True, 'Les pyramides ont environ 4 500 ans, Cléopâtre 2 000 ans.'),
])

def wheel(pid, title, category, theme, pairs):
    packs.append({'pid': pid, 'theme': theme, 'level': 'Facile', 'kind': 'wheel', 'title': title, 'category': category, 'pairs': [{'q': a, 'a': b} for a, b in pairs]})
wheel('paires-europe', 'Pays et capitales d\'Europe', 'Reliez chaque pays à sa capitale', 'Géographie', [
 ('France', 'Paris'), ('Italie', 'Rome'), ('Espagne', 'Madrid'), ('Allemagne', 'Berlin'), ('Portugal', 'Lisbonne'),
 ('Belgique', 'Bruxelles'), ('Autriche', 'Vienne'), ('Grèce', 'Athènes'), ('Pologne', 'Varsovie'), ('Irlande', 'Dublin')])
wheel('paires-petits', 'Les petits des animaux', 'Reliez chaque animal à son petit', 'Nature', [
 ('La vache', 'Le veau'), ('Le cheval', 'Le poulain'), ('La brebis', 'L\'agneau'), ('La chèvre', 'Le chevreau'),
 ('La poule', 'Le poussin'), ('Le chien', 'Le chiot'), ('Le chat', 'Le chaton'), ('Le cerf', 'Le faon')])
wheel('paires-metiers', 'Les métiers et leurs outils', 'Reliez chaque métier à son outil', 'Culture générale', [
 ('Le médecin', 'Le stéthoscope'), ('Le peintre', 'Le pinceau'), ('Le jardinier', 'La bêche'), ('Le boulanger', 'Le four'),
 ('Le pompier', 'La lance à incendie'), ('Le coiffeur', 'Les ciseaux'), ('L\'astronome', 'Le télescope'), ('Le maçon', 'La truelle')])
wheel('paires-nombres', 'Chiffres romains', 'Reliez chaque chiffre romain à sa valeur', 'Maths', [
 ('I', '1'), ('V', '5'), ('X', '10'), ('L', '50'), ('C', '100'), ('D', '500'), ('M', '1000'), ('IX', '9')])

def letters(pid, title, theme, rows):
    packs.append({'pid': pid, 'theme': theme, 'level': 'Moyen', 'kind': 'letters', 'title': title, 'items': [{'q': q, 'word': w, 'image': ''} for q, w in rows]})
letters('mots-fruits', 'Mots : fruits et légumes', 'Nature', [
 ('Fruit jaune que mangent les singes', 'Banane'), ('Fruit rouge qui pousse sur un fraisier', 'Fraise'), ('Légume orange que mangent les lapins', 'Carotte'),
 ('Fruit rond et rouge qui tombe de l\'arbre selon Newton', 'Pomme'), ('Légume vert en forme d\'arbre miniature', 'Brocoli'), ('Fruit qui pousse en grappes et sert à faire le vin', 'Raisin'),
 ('Fruit tropical avec une couronne de feuilles', 'Ananas'), ('Légume qui fait pleurer en le coupant', 'Oignon')])
letters('mots-pays', 'Mots : pays', 'Géographie', [
 ('Pays en forme de botte', 'Italie'), ('Pays des kangourous', 'Australie'), ('Pays de la tour Eiffel', 'France'),
 ('Pays des pyramides', 'Égypte'), ('Pays du soleil levant', 'Japon'), ('Pays où se trouve le Taj Mahal', 'Inde'),
 ('Pays de la samba et du carnaval de Rio', 'Brésil'), ('Pays de la vodka et des matriochkas', 'Russie')])

# Nettoyage
for p in packs:
    if p['kind'] == 'quiz':
        for q in p['questions']:
            q.setdefault('explain', '')
os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'public'), exist_ok=True)
with open(os.path.join(os.path.dirname(__file__), '..', 'public', 'library.json'), 'w', encoding='utf-8') as f:
    json.dump(packs, f, ensure_ascii=False, indent=1)
print(len(packs), 'quiz,', sum(len(p.get('questions', p.get('pairs', p.get('items', [])))) for p in packs), 'éléments')
