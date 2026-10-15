# Service de notifications d'Ascension

Petit service (Cloudflare Workers, offre gratuite) qui envoie aux heures choisies les
notifications « notion du jour » et « rappel de série ». Le texte affiché est choisi sur le
téléphone (`public/push-sw.js`) : le service n'envoie que le type de message.

**Données conservées** (stockage KV) : adresse d'abonnement push anonyme fournie par le
navigateur, heures choisies, fuseau horaire. Ni nom, ni e-mail, ni résultats.

## Déploiement (une fois)

Prérequis : un compte Cloudflare gratuit.

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create SUBS
```

1. Recopier l'`id` affiché dans `wrangler.toml` (section `[[kv_namespaces]]`).
2. Définir le secret (clé privée générée par `node scripts/vapid-keys.mjs`, dans `worker/.vapid.json`) :

```bash
node -e "process.stdout.write(JSON.stringify(require('./.vapid.json').privateJwk))" | npx wrangler secret put VAPID_PRIVATE_JWK
```

3. Déployer :

```bash
npx wrangler deploy
```

4. Reporter l'adresse affichée (`https://ascension-push.<sous-domaine>.workers.dev`) dans
   `.env.production` (`VITE_PUSH_URL`), puis publier l'application (push sur `main`).

## Limites de l'offre gratuite

Tâche planifiée toutes les 5 minutes (288 exécutions par jour), 1 000 listes et
100 000 lectures KV par jour : largement suffisant pour quelques dizaines d'abonnés.
