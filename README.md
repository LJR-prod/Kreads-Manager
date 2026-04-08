# Kreads Manager

Application interne de management de l'équipe montage Kreads.

## Stack
- Next.js 16 (App Router)
- Supabase (Auth Google OAuth + PostgreSQL)
- Tailwind CSS v4
- Vercel (déploiement)

## Modules
1. **Calendrier** — disponibilités par monteur (cours / tournage / congé)
2. **Objectifs** — suivi mensuel des concepts montés (5/jour travaillé)
3. **Admin** — dashboard global, variables trimestrielles, liens CS
4. **Évaluations** — formulaire public CS par quarter

## Setup local

```bash
cp .env.local.example .env.local
# Remplir avec les clés Supabase
npm install
npm run dev
```

## Déploiement

Voir les instructions complètes dans la conversation Claude.

1. GitHub → push
2. Supabase → exécuter `supabase-schema.sql`
3. Vercel → importer le repo + variables d'env
