# Spiracia

Jeu de société web basé sur les règles **Complots** (ville médiévale, style cartoon).

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (icônes)
- Zustand (état global)
- React Router

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173

## Règles (résumé)

- **But :** Être le dernier survivant.
- **Setup :** 2 cartes faces cachées et 2 pièces par joueur. La Cour et le Trésor au centre.
- **Actions :** Revenu (+1), Aide étrangère (+2), Assassinat (-7), ou pouvoir d’un personnage (Duchesse, Assassin, Capitaine, Ambassadeur). Bluff autorisé.
- **Réaction :** 15 secondes pour « Mettre en doute » ou « Contrer » avant application.

## Structure

- **Accueil :** Titre + « Rejoindre une partie »
- **Lobby :** Salle d’attente (simulation : partie à 4 avec bots)
- **Partie :** Zone centrale (Trésor, Cour), cartes en bas, logs à droite, timer 15 s pour les réactions