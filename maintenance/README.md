# Page de maintenance Piové Cosmetics

Ouvrir `index.html` pour prévisualiser la page. Le HTML, le CSS et les images sont locaux : aucun framework, service distant, JavaScript ou compilation n'est nécessaire.

Le fichier `maintenance_piove_cosmetics.html` à la racine du projet est la version autonome : son CSS et ses images sont intégrés. Il peut être renommé `maintenance.html` et installé seul sur l'hébergement.

La page est préparée pour piovecosmetics.com. L'adresse de contact reprise du site existant est contact@piovecosmetics.dz. Modifier les liens `mailto:` si nécessaire.

Cette préparation n'active pas la maintenance du site existant. Lors de l'activation côté hébergement, servir la page avec le statut HTTP 503 et, si une durée est connue, un en-tête Retry-After. Une balise HTML ne remplace pas le statut HTTP. Rétablir le routage normal à la fin de la maintenance.

Les visuels et le logo proviennent des fichiers Piové du projet. Aucune date de réouverture ni durée de maintenance n'est annoncée.
