// Bot des missions I324 : vérifie l'état complet du dépôt pour l'élève qui vient de pousser.
// Sans dépendance : Node.js + git. Sortie : resultat.json (commentaire à publier, tag à supprimer).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const git = (...args) => {
    try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { return null; }
};
const existe = (ref) => git('rev-parse', '--verify', '--quiet', ref + '^{commit}') !== null;
const ancetre = (a, b) => { try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; } catch { return false; } };
const sujets = (plage) => { const s = git('log', '--format=%s', '--reverse', plage); return s ? s.split('\n').filter(Boolean) : []; };
const fichierDans = (ref, chemin) => git('cat-file', '-e', `${ref}:${chemin}`) !== null;

// ---------------------------------------------------------------- programme à reconstruire
const lignesPour = (pseudo) => [
    `const pseudo = '${pseudo}';`,
    "const [version, type] = process.argv.slice(2);",
    "const [maj, min, cor] = version.replace('v', '').split('.').map(Number);",
    "if (type.endsWith('!')) {",
    "  console.log(`v${maj + 1}.0.0-${pseudo}`);",
    "} else if (type === 'feat') {",
    "  console.log(`v${maj}.${min + 1}.0-${pseudo}`);",
    "} else {",
    "  console.log(`v${maj}.${min}.${cor + 1}-${pseudo}`);",
    "}",
];
const CAS = [['v1.4.2', 'fix', 'v1.4.3'], ['v2.0.0', 'feat', 'v2.1.0'], ['v3.7.9', 'feat!', 'v4.0.0'],
             ['v1.9.5', 'feat', 'v1.10.0'], ['v0.3.1', 'docs', 'v0.3.2']];

// ---------------------------------------------------------------- données propres à l'élève
function profil(pseudo) {
    const h = crypto.createHash('sha256').update(pseudo).digest();
    const depart = [1 + (h[0] % 5), h[1] % 10, h[2] % 10];
    // ordre des lignes données mission après mission (permutation propre à l'élève)
    const ordre = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort((a, b) => (h[3 + a] - h[3 + b]) || (a - b));
    return {
        depart,
        t1: `v${depart[0]}.${depart[1] + 1}.0-${pseudo}`,
        t2: `v${depart[0] + 1}.0.0-${pseudo}`,
        ordre,
    };
}

const RE = {
    feat: /^feat(\([a-z0-9-]+\))?: \S/,
    docs: /^docs(\([a-z0-9-]+\))?: \S/,
    fix: /^fix(\([a-z0-9-]+\))?: \S/,
    portee: /^(feat|fix|docs|test|refactor|chore)\([a-z0-9-]+\): \S/,
    casse: /^(feat|fix|docs|test|refactor|chore)(\([a-z0-9-]+\))?!: \S/,
    convention: /^(feat|fix|docs|test|refactor|chore)(\([a-z0-9-]+\))?!?: \S/,
};

// Explique pourquoi un message de commit ne respecte pas la convention
function diagnostic(msg) {
    if (/\u00a0|\u202f/.test(msg)) return 'il contient une espace insécable (invisible) : retapez les espaces au clavier';
    if (/^\S+ +:/.test(msg)) return 'il y a une espace avant les deux-points';
    if (/^[^:]+: {2,}/.test(msg)) return 'il y a plusieurs espaces après les deux-points, une seule est attendue';
    if (/^[^:]+:\S/.test(msg)) return 'il manque l\'espace après les deux-points';
    if (!msg.includes(':')) return 'il manque le type suivi de deux-points, par exemple `feat: …`';
    const type = msg.split(/[(!:]/)[0];
    if (type !== type.toLowerCase()) return 'le type doit être en minuscules';
    if (!/^(feat|fix|docs|test|refactor|chore)$/.test(type)) return `le type \`${type}\` n'existe pas (feat, fix, docs, test, refactor, chore)`;
    if (/\([^)]*[^a-z0-9-)][^)]*\)/.test(msg)) return 'la portée doit être en minuscules, sans espace ni accent';
    return 'le format attendu est `type: description` ou `type(portée): description`';
}

// ---------------------------------------------------------------- évaluation des 10 missions
function evaluer(pseudo, p) {
    const F = `origin/feature/${pseudo}`, H = `origin/hotfix/${pseudo}`;
    const D = 'origin/develop', M = 'origin/main';
    const fExiste = existe(F);
    const fc = fExiste ? sujets(`${D}..${F}`) : [];
    const tag = (t) => existe(`refs/tags/${t}`) ? `refs/tags/${t}` : null;
    const contient = (ref, re) => sujets(`${D}..${ref}`).some((s) => re.test(s));
    const md = `missions/${pseudo}.md`, js = `missions/${pseudo}.js`;

    const M_ = [
        {
            titre: `Créer la branche \`feature/${pseudo}\` à partir de \`develop\` et la pousser`,
            ok: () => fExiste && ancetre(D, F),
            aide: () => fExiste ? 'Votre branche ne part pas de `develop` (vous êtes peut-être parti de `main`). Supprimez-la et recréez-la depuis `develop`.'
                : `La branche \`feature/${pseudo}\` n'existe pas encore sur GitHub (attention : minuscules, sans espace).`,
        },
        {
            titre: `Créer le fichier \`${md}\` et le commiter avec un message de type \`feat\``,
            ok: () => fichierDans(F, md) && fc.some((s) => RE.feat.test(s)),
            aide: () => !fichierDans(F, md) ? `Le fichier \`${md}\` est introuvable sur votre branche.`
                : 'Aucun commit de type `feat` trouvé. Format : `feat: description`.',
        },
        {
            titre: 'Compléter ce fichier et commiter avec un message de type `docs`',
            ok: () => fc.some((s) => RE.docs.test(s)),
            aide: () => 'Aucun commit de type `docs` trouvé. Format : `docs: description`.',
        },
        {
            titre: 'Corriger une faute dans ce fichier et commiter avec un message de type `fix`',
            ok: () => fc.some((s) => RE.fix.test(s)),
            aide: () => 'Aucun commit de type `fix` trouvé. Format : `fix: description`.',
        },
        {
            titre: `Calculer votre version suivante à partir de votre version de départ \`v${p.depart.join('.')}\` et pousser le tag \`vX.Y.Z-${pseudo}\` sur le dernier commit de votre branche`,
            ok: () => { const t = tag(p.t1); return t && ancetre(t, F) && contient(t, RE.feat) && contient(t, RE.fix); },
            aide: () => `Partez de votre version de départ \`v${p.depart.join('.')}\` et regardez les types de vos commits. Le tag se termine par \`-${pseudo}\`.`,
        },
        {
            titre: `Créer la branche \`hotfix/${pseudo}\` à partir de \`main\`, y ajouter \`missions/${pseudo}-hotfix.md\` et commiter avec un message \`fix\``,
            ok: () => existe(H) && ancetre(M, H) && !ancetre(D, H) && fichierDans(H, `missions/${pseudo}-hotfix.md`)
                && sujets(`${M}..${H}`).some((s) => RE.fix.test(s)),
            aide: () => !existe(H) ? `La branche \`hotfix/${pseudo}\` n'existe pas encore sur GitHub.`
                : (fExiste && ancetre(F, H)) ? `Votre hotfix part de votre branche \`feature/${pseudo}\`. En GitFlow, un hotfix part de \`main\` (la production). Supprimez-le et recréez-le depuis \`origin/main\`.`
                : ancetre(D, H) ? 'Votre hotfix part de `develop`. En GitFlow, un hotfix part de `main` (la production). Supprimez-le et recréez-le depuis `origin/main`.'
                : `Il manque le fichier \`missions/${pseudo}-hotfix.md\` ou un commit \`fix\` sur la branche hotfix.`,
        },
        {
            titre: `Revenir sur \`feature/${pseudo}\` et faire un commit avec une portée, par exemple \`docs(missions): …\``,
            ok: () => fc.some((s) => RE.portee.test(s)),
            aide: () => 'Aucun commit avec portée trouvé sur `feature/' + pseudo + '`. Format : `type(portée): description`, portée en minuscules.',
        },
        {
            titre: 'Faire un commit qui casse la compatibilité (type suivi de `!`)',
            ok: () => fc.some((s) => RE.casse.test(s)),
            aide: () => 'Aucun commit avec `!` trouvé. Format : `feat!: description`.',
        },
        {
            titre: `Calculer la version suivante depuis votre tag de la mission 5 et pousser le nouveau tag \`vX.Y.Z-${pseudo}\``,
            ok: () => { const t = tag(p.t2); return t && ancetre(t, F) && contient(t, RE.casse); },
            aide: () => 'Repartez de votre tag de la mission 5. Quel incrément impose un commit avec `!` ?',
        },
        {
            titre: `Remettre les 10 fragments dans l'ordre dans \`${js}\`, puis commiter avec le message exact \`feat: ajoute le calcul de version\``,
            ok: () => fichierDans(F, js) && fc.includes('feat: ajoute le calcul de version') && testerProgramme(F, js).ok,
            aide: () => !fichierDans(F, js) ? `Le fichier \`${js}\` est introuvable sur votre branche.`
                : !fc.includes('feat: ajoute le calcul de version') ? 'Le commit `feat: ajoute le calcul de version` est introuvable.'
                : testerProgramme(F, js).message,
        },
    ];
    return M_;
}

let pseudoTest = '';
function testerProgramme(ref, chemin) {
    const code = git('show', `${ref}:${chemin}`);
    if (code === null) return { ok: false, message: 'Programme introuvable.' };
    const f = path.join(os.tmpdir(), `prog-${process.pid}.js`);
    fs.writeFileSync(f, code);
    for (const [v, t, attendu] of CAS) {
        let sortie;
        try { sortie = execFileSync('node', [f, v, t], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
        catch (e) {
            const err = String(e.stderr || '').split('\n').find((l) => /Error/.test(l)) || 'erreur inconnue';
            return { ok: false, message: `\`node ${chemin} ${v} ${t}\` plante : « ${err.trim()} ». Vérifiez l'ordre des lignes.` };
        }
        const att = `${attendu}-${pseudoTest}`;
        if (sortie !== att) return { ok: false, message: `\`node ${chemin} ${v} ${t}\` affiche \`${sortie}\` au lieu de \`${att}\`. Vérifiez l'ordre des lignes.` };
    }
    return { ok: true };
}

// ---------------------------------------------------------------- contrôle d'un tag poussé
function controlerTag(nom, pseudo, p) {
    if (!nom.endsWith(`-${pseudo}`)) {
        return `Le tag \`${nom}\` n'est pas autorisé : vos tags doivent se terminer par \`-${pseudo}\`.`;
    }
    if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-[a-z0-9-]+$/.test(nom)) {
        return `Le tag \`${nom}\` ne respecte pas le format \`vMAJEUR.MINEUR.CORRECTIF-${pseudo}\` (v minuscule, trois nombres).`;
    }
    const F = `origin/feature/${pseudo}`;
    const ref = `refs/tags/${nom}`;
    if (!existe(F) || !ancetre(ref, F)) return `Le tag \`${nom}\` doit être posé sur un commit de votre branche \`feature/${pseudo}\`.`;
    if (nom === p.t1) {
        const s = sujets(`origin/develop..${ref}`);
        if (!s.some((x) => RE.feat.test(x)) || !s.some((x) => RE.fix.test(x))) return `Le tag \`${nom}\` est posé trop tôt : faites d'abord les missions 2 à 4.`;
        return null;
    }
    if (nom === p.t2) {
        if (!sujets(`origin/develop..${ref}`).some((x) => RE.casse.test(x))) return `Le tag \`${nom}\` est posé trop tôt : faites d'abord la mission 8.`;
        return null;
    }
    return `Le tag \`${nom}\` ne correspond pas à la version attendue. Recalculez : version de départ \`v${p.depart.join('.')}\`, puis l'incrément imposé par vos commits.`;
}

// ---------------------------------------------------------------- principal
function main() {
    const acteur = process.env.ACTEUR;
    const ref = process.env.REF || '';
    const avant = process.env.AVANT || '';
    const pseudo = acteur.toLowerCase();
    pseudoTest = pseudo;
    const p = profil(pseudo);
    const LIGNES = lignesPour(pseudo);
    const res = { commentaire: '', supprimerTag: null, termine: false };
    const corriger = [];

    if (ref.startsWith('refs/tags/')) {
        const nom = ref.slice('refs/tags/'.length);
        const erreur = controlerTag(nom, pseudo, p);
        if (erreur) {
            res.supprimerTag = nom;
            git('tag', '-d', nom);
            corriger.push(`Tag refusé et supprimé de GitHub. ${erreur}`,
                `Supprimez-le aussi sur votre PC : \`git tag -d ${nom}\`.`);
        }
    } else if (ref.startsWith('refs/heads/')) {
        const br = ref.slice('refs/heads/'.length);
        // Pas de nouveau commit dans ce push : pas de réponse (on ne commente que les commits de l'élève)
        const vide = !avant || /^0+$/.test(avant);
        if (!git('log', '--format=%H', vide ? `origin/develop..origin/${br}` : `${avant}..origin/${br}`)) {
            fs.writeFileSync(process.env.SORTIE || 'resultat.json', JSON.stringify(res));
            return;
        }
        if (br !== `feature/${pseudo}` && br !== `hotfix/${pseudo}`) {
            corriger.push(`La branche \`${br}\` ne correspond à aucune mission. Noms attendus : \`feature/${pseudo}\` ou \`hotfix/${pseudo}\`.`);
        }
        // seulement les commits de ce push
        const nul = /^0+$/.test(avant);
        const plage = (!avant || nul) ? `origin/develop..origin/${br}` : `${avant}..origin/${br}`;
        for (const sj of sujets(plage)) {
            if (!RE.convention.test(sj) && !sj.startsWith('Merge ')) {
                corriger.push(`Le commit « ${sj} » ne respecte pas la convention : ${diagnostic(sj)}. Il ne compte pas : refaites un commit correct.`);
            }
        }
    }

    const missions = evaluer(pseudo, p);
    const fragments = [];
    let courante = null;
    for (let i = 0; i < missions.length; i++) {
        if (missions[i].ok()) { if (i < 9) fragments.push(p.ordre[i]); } else { courante = i; break; }
    }
    const reussies = courante === null ? 10 : courante;

    const L = [`@${acteur}`, '', `## Progression : ${reussies} sur 10`, ''];
    if (corriger.length) {
        L.push('### À corriger', '', ...corriger.map((c) => `- ${c}`), '');
    }
    if (reussies === 1) {
        L.push(`Votre version de départ est \`v${p.depart.join('.')}\`. Notez-la, elle servira à la mission 5.`, '');
    }
    if (courante === null) {
        res.termine = true;
        L.push('### Bravo', '', 'Les 10 missions sont réussies. Montrez ce message à votre enseignant.');
    } else {
        if (fragments.length && courante < 9) {
            L.push(`### Nouveau fragment (mission ${reussies})`, '', '```javascript', LIGNES[fragments[fragments.length - 1]], '```', '');
        }
        if (courante === 9) {
            L.push('### Tous vos fragments, dans le désordre', '', '```javascript');
            const tous = [...fragments];
            tous.splice(3, 0, 9); // dernier fragment offert, glissé au milieu
            tous.forEach((n) => L.push(LIGNES[n]));
            L.push('```', '');
        }
        L.push(`### Mission ${courante + 1}`, '', `${missions[courante].titre}.`, '', `> Indice : ${missions[courante].aide()}`, '',
            '_Chaque mission se termine par un push : sans push, le bot ne voit rien._');
    }
    res.commentaire = L.join('\n');
    fs.writeFileSync(process.env.SORTIE || 'resultat.json', JSON.stringify(res));
    if (process.env.AFFICHER) console.log(res.commentaire);
}

if (require.main === module) main();
module.exports = { profil, lignesPour, CAS };
