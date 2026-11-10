# I324 – Missions GitFlow

Bienvenue dans le dépôt des missions. Vous allez réaliser **10 missions** sur Git et GitHub.
Après chaque push, un **bot** vérifie votre travail et vous envoie par e-mail la mission suivante, avec un fragment de code.
À la fin, vous remettez les fragments dans l'ordre pour obtenir un programme qui fonctionne.

Dans tout le parcours, `<pseudo>` = votre nom d'utilisateur GitHub **en minuscules**.

## Avant de commencer

1. **Accepter l'invitation** au dépôt : e-mail reçu de GitHub, ou https://github.com/notifications.
2. **Régler les notifications** pour ne recevoir que vos propres messages : en haut de cette page, bouton **Watch** › **Participating and @mentions**.
3. **Rester discret** : ce dépôt est public, tout le monde peut le lire. Avant votre premier commit :
   - sur https://github.com/settings/emails, cochez **Keep my email addresses private** et copiez l'adresse qui se termine par `@users.noreply.github.com` ;
   - dans le terminal de VS Code, tapez :
     ```
     git config --global user.name "<pseudo>"
     git config --global user.email "<adresse noreply copiée>"
     ```
   - n'écrivez aucune information personnelle (nom réel, photo, données privées) dans vos fichiers ni dans vos messages.
4. **Cloner le dépôt** dans VS Code : `Ctrl+Shift+P` › `Git: Clone` › coller l'adresse donnée par l'enseignant.

## Mission 1

Créez la branche `feature/<pseudo>` **à partir de `develop`**, puis faites-y un premier commit.

Dans VS Code :

1. En bas à gauche, cliquez sur le nom de la branche › **Create new branch from…** › choisissez `origin/develop`.
2. Nommez la branche `feature/<pseudo>`.
3. Dans le dossier `missions`, créez le fichier `<pseudo>.md` avec une ligne de texte.
4. Onglet **Source Control** (`Ctrl+Shift+G`) : message `feat: ajoute ma fiche de mission`, **Commit**, puis **Publish Branch**.

Environ 30 secondes plus tard, le bot vous répond à ce commit, par **e-mail**. La suite arrive de la même façon.
Si rien n'arrive : vérifiez vos spams et que **Email** est coché dans https://github.com/settings/notifications.

## Règles du jeu

- Chaque mission se termine par un **push** : sans push, le bot ne voit rien.
- Pour pousser un tag, utilisez son nom : `git push origin <tag>`.
- Ne vous placez jamais sur un tag (VS Code afficherait le nom du tag en bas à gauche) : restez sur vos branches.
- Votre rangée peut vous aider à comprendre, mais c'est vous qui faites chaque action.

---

Application to-do d'origine : [docker/getting-started-app](https://github.com/docker/getting-started-app), licence MIT. Elle servira dans les prochaines semaines.
