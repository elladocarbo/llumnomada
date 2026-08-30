# Llum Nòmada

Bloc de viatges construït amb [Astro](https://astro.build). Rutes de muntanya, caps de setmana urbans i consells pràctics per viatjar lleuger, en català.

Desplegat a Netlify des del repositori de GitHub: cada push a `main` genera un nou desplegament a [llumnomada.netlify.app](https://llumnomada.netlify.app).

## 🚀 Estructura del projecte

```text
├── public/
│   └── images/          # il·lustracions dels articles (SVG)
├── src/
│   ├── components/
│   ├── content/
│   │   └── blog/        # articles en Markdown / MDX
│   ├── layouts/
│   ├── pages/
│   └── styles/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Cada article viu a `src/content/blog/` com a fitxer `.md` o `.mdx`, amb capçalera (frontmatter) del tipus:

```yaml
---
title: 'Títol de l’article'
description: 'Resum breu per a SEO i xarxes'
pubDate: 'March 3 2026'
heroImage: '/images/hero-exemple.svg'
location: 'Ciutat, País' # opcional
tags: ['etiqueta1', 'etiqueta2'] # opcional
---
```

## 🧞 Ordres

| Ordre                     | Acció                                            |
| :------------------------ | :------------------------------------------------ |
| `npm install`              | Instal·la les dependències                        |
| `npm run dev`               | Aixeca el servidor de desenvolupament a `localhost:4321` |
| `npm run build`             | Genera el lloc de producció a `./dist/`           |
| `npm run preview`           | Previsualitza el build en local abans de publicar |

## 👀 Vols saber-ne més?

Consulta la [documentació d'Astro](https://docs.astro.build).
