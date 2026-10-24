import type { IndexEntry, Post, PostTranslation } from './types.mts';

/** Languages of the public site. Catalan is the original and lives at the root (/blog/...); the
 *  translations live under /es/... and /en/... and mirror every public path. */
export type Lang = 'ca' | 'es' | 'en';
export const LANGS: Lang[] = ['ca', 'es', 'en'];
export type TransLang = Exclude<Lang, 'ca'>;
export const TRANS_LANGS: TransLang[] = ['es', 'en'];

export const LANG_LABEL: Record<Lang, string> = { ca: 'CA', es: 'ES', en: 'EN' };
export const LANG_NAME: Record<Lang, string> = { ca: 'Català', es: 'Castellano', en: 'English' };
export const HTML_LANG: Record<Lang, string> = { ca: 'ca', es: 'es', en: 'en' };
export const OG_LOCALE: Record<Lang, string> = { ca: 'ca_ES', es: 'es_ES', en: 'en_GB' };
const DATE_LOCALE: Record<Lang, string> = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };

export function isLang(v: unknown): v is Lang {
  return v === 'ca' || v === 'es' || v === 'en';
}

/** "/es/blog/x/" → { lang: 'es', rest: '/blog/x/' }; paths without a prefix are Catalan. */
export function splitLangPath(pathname: string): { lang: Lang; rest: string } {
  const m = pathname.match(/^\/(es|en)(\/.*)?$/);
  if (!m) return { lang: 'ca', rest: pathname };
  return { lang: m[1] as Lang, rest: m[2] || '/' };
}

/** Public path of a page in a language: lp('es', '/blog/x/') → '/es/blog/x/'; Catalan has no prefix. */
export function lp(lang: Lang, path: string): string {
  if (lang === 'ca') return path;
  return `/${lang}${path === '/' ? '/' : path}`;
}

export function formatDateLang(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(DATE_LOCALE[lang], { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------------------------
// Interface texts
// ---------------------------------------------------------------------------------------------

const CA = {
  'nav.aria': 'Navegació principal',
  'nav.home': 'Inici',
  'nav.posts': 'Relats',
  'nav.destinations': 'Destinacions',
  'nav.about': 'Sobre mí',
  'lang.aria': 'Idioma',
  'footer.tagline': 'Explicant el món, un lloc a la vegada.',
  'footer.newsletter': 'Newsletter',
  'footer.privacy': 'Privacitat',
  'footer.contact': 'Contacte',
  'footer.panel': 'Panell',
  'site.tagline': 'Un bloc de viatges sobre rutes, ciutats i racons del món explicats amb calma.',
  'meta.reading': '{n} min de lectura',
  'meta.updated': 'Actualitzat el {d}',
  'info.title': 'Fitxa pràctica',
  'info.days': 'Durada',
  'info.season': 'Època',
  'info.budget': 'Pressupost',
  'info.transport': 'Com moure’s',
  'map.note': 'La línia uneix els llocs en ordre de visita; no és el recorregut exacte.',
  'map.aria': 'Mapa de la ruta, amb els llocs visitats numerats en ordre',
  'series.aria': 'Aquest relat forma part d’una sèrie',
  'series.label': 'Sèrie · {n} {parts}',
  'series.part': 'part',
  'series.parts': 'parts',
  'series.start': 'Per començar: {x}',
  'series.here': 'ets aquí',
  'series.min': '{n} min',
  'series.prev': '← Part anterior',
  'series.next': 'Part següent →',
  'series.toStart': 'Per començar',
  'series.desc': 'Tots els relats de la sèrie «{name}» de {site}, en ordre de lectura.',
  'post.nav': 'Més relats',
  'post.prev': '← Relat anterior',
  'post.next': 'Relat següent →',
  'rating.title': 'Et fa ganes, aquest viatge?',
  'rating.l1': 'No se m’hi ha perdut res, aquí.',
  'rating.l2': 'No és prioritari.',
  'rating.l3': 'Ho incloc a la llista de viatges futurs.',
  'rating.l4': 'És el meu proper destí.',
  'rating.l5': 'Ja hi estic volant!',
  'rating.star': 'estrella',
  'rating.stars': 'estrelles',
  'rating.vote': 'vot',
  'rating.votes': 'vots',
  'rating.thanks': 'Gràcies pel teu vot! Si vols, pots tornar a triar una altra puntuació.',
  'toc.aria': 'Índex del relat',
  'toc.title': 'Índex del relat',
  'toc.sections': '({n} seccions)',
  'img.enlarge': 'Amplia la imatge',
  'home.cta': 'Descobreix els relats',
  'home.about': 'Sobre mí →',
  'home.latest': 'Darrers relats',
  'home.all': 'Veure tots els relats →',
  'blog.title': 'Relats',
  'blog.category': 'Relats: {c}',
  'blog.categoryDesc': 'Tots els relats de la categoria «{c}» de {site}.',
  'blog.chips': 'Relats per tema',
  'dest.title': 'Destinacions',
  'dest.intro': 'Els llocs on he estat, país per país.',
  'dest.desc': 'Els relats de viatge de {site} agrupats per país.',
  'dest.map': 'Mapa dels llocs visitats',
  'dest.jump': 'Salta a un país',
  'dest.byTheme': 'Per tema',
  'dest.empty': 'Aviat hi haurà aquí els primers destins.',
  'dest.one': 'relat',
  'dest.many': 'relats',
  'nl.title': 'Newsletter',
  'nl.formTitle': 'Rep els relats nous al correu',
  'nl.formText': 'Un correu quan publico un relat. Res més.',
  'nl.email': 'El teu correu electrònic',
  'nl.placeholder': 'el-teu@correu.cat',
  'nl.button': 'Subscriu-me',
  'nl.consent': 'Accepto rebre la newsletter de {site} i que es guardi la meva adreça fins que em doni de baixa. Més informació a la <a href="{url}">política de privacitat</a>.',
  'nl.checkTitle': 'Revisa el correu',
  'nl.checkText': 'T’hem enviat un missatge per confirmar la subscripció. Prem l’enllaç que hi trobaràs i ja està. Si no el veus d’aquí a uns minuts, mira la carpeta de correu brossa.',
  'nl.confirmedTitle': 'Subscripció confirmada',
  'nl.confirmedText': 'Gràcies! A partir d’ara rebràs un correu cada vegada que publiqui un relat nou.',
  'nl.goneTitle': 'Ja t’has donat de baixa',
  'nl.goneText': 'No et tornaré a enviar cap correu. Si algun dia canvies d’idea, pots tornar-te a subscriure.',
  'nl.errorTitle': 'Alguna cosa no ha anat bé',
  'nl.errorText': 'L’enllaç no és vàlid o ha caducat, o s’han fet massa intents seguits. Torna-ho a provar d’aquí a una estona.',
  'nl.offTitle': 'Newsletter no disponible',
  'nl.offText': 'La newsletter encara no està activa. Mentrestant, pots seguir el blog per RSS.',
  'nl.back': 'Torna als relats',
  'nl.unsubPage': 'Donar-se de baixa',
  'nl.unsubTitle': 'Vols donar-te de baixa?',
  'nl.unsubText': 'Deixaràs de rebre els relats nous per correu.',
  'nl.unsubButton': 'Sí, dona’m de baixa',
  'privacy.title': 'Política de privacitat',
  'privacy.desc': 'Com es tracten les dades al blog {site}.',
  'notfound.title': 'Pàgina no trobada',
  'notfound.text': 'Aquest camí no existeix.',
  'notfound.home': 'Torna a l’inici',
  'notice.untranslated': 'Aquest relat encara no està traduït: el pots llegir en català.',
  'notice.draft': 'Esborrany de traducció: només el veus tu; encara no és públic.',
  'jobTitle': 'Autora de viatges',
  'crumb.home': 'Inici',
  'crumb.posts': 'Relats',
} as const;

export type UiKey = keyof typeof CA;

const ES: Record<UiKey, string> = {
  'nav.aria': 'Navegación principal',
  'nav.home': 'Inicio',
  'nav.posts': 'Relatos',
  'nav.destinations': 'Destinos',
  'nav.about': 'Sobre mí',
  'lang.aria': 'Idioma',
  'footer.tagline': 'Contando el mundo, un lugar cada vez.',
  'footer.newsletter': 'Newsletter',
  'footer.privacy': 'Privacidad',
  'footer.contact': 'Contacto',
  'footer.panel': 'Panel',
  'site.tagline': 'Un blog de viajes sobre rutas, ciudades y rincones del mundo contados con calma.',
  'meta.reading': '{n} min de lectura',
  'meta.updated': 'Actualizado el {d}',
  'info.title': 'Ficha práctica',
  'info.days': 'Duración',
  'info.season': 'Época',
  'info.budget': 'Presupuesto',
  'info.transport': 'Cómo moverse',
  'map.note': 'La línea une los lugares en orden de visita; no es el recorrido exacto.',
  'map.aria': 'Mapa de la ruta, con los lugares visitados numerados en orden',
  'series.aria': 'Este relato forma parte de una serie',
  'series.label': 'Serie · {n} {parts}',
  'series.part': 'parte',
  'series.parts': 'partes',
  'series.start': 'Para empezar: {x}',
  'series.here': 'estás aquí',
  'series.min': '{n} min',
  'series.prev': '← Parte anterior',
  'series.next': 'Parte siguiente →',
  'series.toStart': 'Para empezar',
  'series.desc': 'Todos los relatos de la serie «{name}» de {site}, en orden de lectura.',
  'post.nav': 'Más relatos',
  'post.prev': '← Relato anterior',
  'post.next': 'Relato siguiente →',
  'rating.title': '¿Te apetece este viaje?',
  'rating.l1': 'No se me ha perdido nada, aquí.',
  'rating.l2': 'No es prioritario.',
  'rating.l3': 'Lo incluyo en la lista de viajes futuros.',
  'rating.l4': 'Es mi próximo destino.',
  'rating.l5': '¡Ya estoy volando!',
  'rating.star': 'estrella',
  'rating.stars': 'estrellas',
  'rating.vote': 'voto',
  'rating.votes': 'votos',
  'rating.thanks': '¡Gracias por tu voto! Si quieres, puedes elegir otra puntuación.',
  'toc.aria': 'Índice del relato',
  'toc.title': 'Índice del relato',
  'toc.sections': '({n} secciones)',
  'img.enlarge': 'Ampliar la imagen',
  'home.cta': 'Descubre los relatos',
  'home.about': 'Sobre mí →',
  'home.latest': 'Últimos relatos',
  'home.all': 'Ver todos los relatos →',
  'blog.title': 'Relatos',
  'blog.category': 'Relatos: {c}',
  'blog.categoryDesc': 'Todos los relatos de la categoría «{c}» de {site}.',
  'blog.chips': 'Relatos por tema',
  'dest.title': 'Destinos',
  'dest.intro': 'Los lugares donde he estado, país por país.',
  'dest.desc': 'Los relatos de viaje de {site} agrupados por país.',
  'dest.map': 'Mapa de los lugares visitados',
  'dest.jump': 'Salta a un país',
  'dest.byTheme': 'Por tema',
  'dest.empty': 'Pronto estarán aquí los primeros destinos.',
  'dest.one': 'relato',
  'dest.many': 'relatos',
  'nl.title': 'Newsletter',
  'nl.formTitle': 'Recibe los relatos nuevos en el correo',
  'nl.formText': 'Un correo cuando publico un relato. Nada más.',
  'nl.email': 'Tu correo electrónico',
  'nl.placeholder': 'tu@correo.es',
  'nl.button': 'Suscríbeme',
  'nl.consent': 'Acepto recibir la newsletter de {site} y que se guarde mi dirección hasta que me dé de baja. Más información en la <a href="{url}">política de privacidad</a>.',
  'nl.checkTitle': 'Revisa el correo',
  'nl.checkText': 'Te hemos enviado un mensaje para confirmar la suscripción. Pulsa el enlace que encontrarás y ya está. Si no lo ves en unos minutos, mira la carpeta de correo no deseado.',
  'nl.confirmedTitle': 'Suscripción confirmada',
  'nl.confirmedText': '¡Gracias! A partir de ahora recibirás un correo cada vez que publique un relato nuevo.',
  'nl.goneTitle': 'Ya te has dado de baja',
  'nl.goneText': 'No volveré a enviarte ningún correo. Si algún día cambias de idea, puedes volver a suscribirte.',
  'nl.errorTitle': 'Algo no ha ido bien',
  'nl.errorText': 'El enlace no es válido o ha caducado, o se han hecho demasiados intentos seguidos. Vuelve a probarlo dentro de un rato.',
  'nl.offTitle': 'Newsletter no disponible',
  'nl.offText': 'La newsletter todavía no está activa. Mientras tanto, puedes seguir el blog por RSS.',
  'nl.back': 'Volver a los relatos',
  'nl.unsubPage': 'Darse de baja',
  'nl.unsubTitle': '¿Quieres darte de baja?',
  'nl.unsubText': 'Dejarás de recibir los relatos nuevos por correo.',
  'nl.unsubButton': 'Sí, dame de baja',
  'privacy.title': 'Política de privacidad',
  'privacy.desc': 'Cómo se tratan los datos en el blog {site}.',
  'notfound.title': 'Página no encontrada',
  'notfound.text': 'Este camino no existe.',
  'notfound.home': 'Volver al inicio',
  'notice.untranslated': 'Este relato todavía no está traducido: puedes leerlo en catalán.',
  'notice.draft': 'Borrador de traducción: solo lo ves tú; todavía no es público.',
  'jobTitle': 'Autora de viajes',
  'crumb.home': 'Inicio',
  'crumb.posts': 'Relatos',
};

const EN: Record<UiKey, string> = {
  'nav.aria': 'Main navigation',
  'nav.home': 'Home',
  'nav.posts': 'Stories',
  'nav.destinations': 'Destinations',
  'nav.about': 'About me',
  'lang.aria': 'Language',
  'footer.tagline': 'Telling the world, one place at a time.',
  'footer.newsletter': 'Newsletter',
  'footer.privacy': 'Privacy',
  'footer.contact': 'Contact',
  'footer.panel': 'Admin',
  'site.tagline': 'A travel blog about routes, cities and corners of the world, told without hurry.',
  'meta.reading': '{n} min read',
  'meta.updated': 'Updated on {d}',
  'info.title': 'Practical info',
  'info.days': 'Length',
  'info.season': 'Season',
  'info.budget': 'Budget',
  'info.transport': 'Getting around',
  'map.note': 'The line joins the places in the order they were visited; it is not the exact route.',
  'map.aria': 'Route map, with the places visited numbered in order',
  'series.aria': 'This story is part of a series',
  'series.label': 'Series · {n} {parts}',
  'series.part': 'part',
  'series.parts': 'parts',
  'series.start': 'To begin with: {x}',
  'series.here': 'you are here',
  'series.min': '{n} min',
  'series.prev': '← Previous part',
  'series.next': 'Next part →',
  'series.toStart': 'To begin with',
  'series.desc': 'All the stories of the series “{name}” on {site}, in reading order.',
  'post.nav': 'More stories',
  'post.prev': '← Previous story',
  'post.next': 'Next story →',
  'rating.title': 'Do you fancy this trip?',
  'rating.l1': 'Nothing here for me, thanks.',
  'rating.l2': 'Not a priority.',
  'rating.l3': 'It goes on my future-trips list.',
  'rating.l4': 'It’s my next destination.',
  'rating.l5': 'I’m already on my way!',
  'rating.star': 'star',
  'rating.stars': 'stars',
  'rating.vote': 'vote',
  'rating.votes': 'votes',
  'rating.thanks': 'Thanks for your vote! If you like, you can choose a different score.',
  'toc.aria': 'Contents of the story',
  'toc.title': 'Contents',
  'toc.sections': '({n} sections)',
  'img.enlarge': 'Enlarge the image',
  'home.cta': 'Discover the stories',
  'home.about': 'About me →',
  'home.latest': 'Latest stories',
  'home.all': 'See all the stories →',
  'blog.title': 'Stories',
  'blog.category': 'Stories: {c}',
  'blog.categoryDesc': 'All the stories in the “{c}” category on {site}.',
  'blog.chips': 'Stories by theme',
  'dest.title': 'Destinations',
  'dest.intro': 'The places I have been, country by country.',
  'dest.desc': 'The travel stories of {site}, grouped by country.',
  'dest.map': 'Map of the places visited',
  'dest.jump': 'Jump to a country',
  'dest.byTheme': 'By theme',
  'dest.empty': 'The first destinations will be here soon.',
  'dest.one': 'story',
  'dest.many': 'stories',
  'nl.title': 'Newsletter',
  'nl.formTitle': 'Get new stories by email',
  'nl.formText': 'One email when I publish a story. Nothing else.',
  'nl.email': 'Your email address',
  'nl.placeholder': 'you@example.com',
  'nl.button': 'Subscribe me',
  'nl.consent': 'I agree to receive the {site} newsletter and to have my address stored until I unsubscribe. More information in the <a href="{url}">privacy policy</a>.',
  'nl.checkTitle': 'Check your email',
  'nl.checkText': 'We have sent you a message to confirm your subscription. Click the link in it and you are done. If you don’t see it in a few minutes, check your spam folder.',
  'nl.confirmedTitle': 'Subscription confirmed',
  'nl.confirmedText': 'Thank you! From now on you will get an email every time I publish a new story.',
  'nl.goneTitle': 'You have unsubscribed',
  'nl.goneText': 'I won’t send you any more emails. If you ever change your mind, you can subscribe again.',
  'nl.errorTitle': 'Something went wrong',
  'nl.errorText': 'The link is not valid or has expired, or there have been too many attempts in a row. Please try again in a while.',
  'nl.offTitle': 'Newsletter not available',
  'nl.offText': 'The newsletter is not active yet. In the meantime, you can follow the blog by RSS.',
  'nl.back': 'Back to the stories',
  'nl.unsubPage': 'Unsubscribe',
  'nl.unsubTitle': 'Do you want to unsubscribe?',
  'nl.unsubText': 'You will stop receiving new stories by email.',
  'nl.unsubButton': 'Yes, unsubscribe me',
  'privacy.title': 'Privacy policy',
  'privacy.desc': 'How data is handled on the {site} blog.',
  'notfound.title': 'Page not found',
  'notfound.text': 'This path does not exist.',
  'notfound.home': 'Back to the home page',
  'notice.untranslated': 'This story is not translated yet: you can read it in Catalan.',
  'notice.draft': 'Draft translation: only you can see it; it is not public yet.',
  'jobTitle': 'Travel writer',
  'crumb.home': 'Home',
  'crumb.posts': 'Stories',
};

const UI: Record<Lang, Record<UiKey, string>> = { ca: CA as unknown as Record<UiKey, string>, es: ES, en: EN };

/** Interface text in a language, with {placeholders} filled in. */
export function t(lang: Lang, key: UiKey, vars: Record<string, string | number> = {}): string {
  let s = UI[lang][key] ?? UI.ca[key];
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// ---------------------------------------------------------------------------------------------
// Names that appear as data (categories and countries are stored in Catalan)
// ---------------------------------------------------------------------------------------------

const CATEGORY_NAMES: Record<TransLang, Record<string, string>> = {
  es: {
    muntanya: 'montaña',
    senderisme: 'senderismo',
    ciutat: 'ciudad',
    'cap-de-setmana': 'fin de semana',
    desert: 'desierto',
    'viatge-llarg': 'viaje largo',
    consells: 'consejos',
    equipatge: 'equipaje',
    platja: 'playa',
    natura: 'naturaleza',
  },
  en: {
    muntanya: 'mountain',
    senderisme: 'hiking',
    ciutat: 'city',
    'cap-de-setmana': 'weekend',
    desert: 'desert',
    'viatge-llarg': 'long trip',
    consells: 'tips',
    equipatge: 'packing',
    platja: 'beach',
    natura: 'nature',
  },
};

/** Display name of a category (the URL keeps the Catalan slug). */
export function categoryName(lang: Lang, category: string): string {
  if (lang !== 'ca') {
    const n = CATEGORY_NAMES[lang][category];
    if (n) return n;
  }
  return category.replace(/-/g, ' ');
}

const COUNTRY_NAMES: Record<TransLang, Record<string, string>> = {
  es: { Irlanda: 'Irlanda', Dinamarca: 'Dinamarca', Itàlia: 'Italia', Alemanya: 'Alemania', Marroc: 'Marruecos', Catalunya: 'Cataluña', Espanya: 'España', França: 'Francia', Portugal: 'Portugal', Croàcia: 'Croacia', Grècia: 'Grecia', 'Regne Unit': 'Reino Unido' },
  en: { Irlanda: 'Ireland', Dinamarca: 'Denmark', Itàlia: 'Italy', Alemanya: 'Germany', Marroc: 'Morocco', Catalunya: 'Catalonia', Espanya: 'Spain', França: 'France', Portugal: 'Portugal', Croàcia: 'Croatia', Grècia: 'Greece', 'Regne Unit': 'United Kingdom' },
};

export function countryName(lang: Lang, country: string): string {
  return lang === 'ca' ? country : (COUNTRY_NAMES[lang][country] ?? country);
}

// ---------------------------------------------------------------------------------------------
// Translated content of relats
// ---------------------------------------------------------------------------------------------

/** Whether a post's translation can be shown: published ones always, drafts only in preview. */
export function translationOf(post: Post, lang: Lang, includeDrafts: boolean): PostTranslation | undefined {
  if (lang === 'ca') return undefined;
  const tr = post.translations?.[lang];
  if (!tr) return undefined;
  return tr.status === 'published' || includeDrafts ? tr : undefined;
}

/** The post as it should be shown in a language (falls back to the Catalan original). */
export function localizePost(post: Post, lang: Lang, includeDrafts: boolean): { post: Post; translated: boolean; draft: boolean } {
  const tr = translationOf(post, lang, includeDrafts);
  if (!tr) return { post, translated: lang === 'ca', draft: false };
  return {
    post: {
      ...post,
      title: tr.title,
      lead: tr.lead,
      blocks: tr.blocks,
      location: tr.location ?? post.location,
      refs: tr.refs ?? post.refs,
      info: tr.info ?? post.info,
      seriesLabel: tr.seriesLabel ?? post.seriesLabel,
    },
    translated: true,
    draft: tr.status !== 'published',
  };
}

/** A list entry as it should be shown in a language: title, place and series label translated.
 *  `series` stays in Catalan (it is the key behind the series URL); `seriesName` is what is shown. */
export function localizeEntry(entry: IndexEntry, lang: Lang, includeDrafts: boolean): IndexEntry & { seriesName?: string } {
  const tr = lang === 'ca' ? undefined : entry.i18n?.[lang];
  if (!tr || (tr.status !== 'published' && !includeDrafts)) return { ...entry, seriesName: entry.series };
  return {
    ...entry,
    title: tr.title,
    lead: tr.lead ?? entry.lead,
    location: tr.location ?? entry.location,
    seriesLabel: tr.seriesLabel ?? entry.seriesLabel,
    seriesName: tr.series ?? entry.series,
  };
}

/** Languages in which a list entry can be read (always Catalan). */
export function entryLangs(entry: IndexEntry, includeDrafts: boolean): Lang[] {
  const out: Lang[] = ['ca'];
  for (const l of TRANS_LANGS) {
    const tr = entry.i18n?.[l];
    if (tr && (tr.status === 'published' || includeDrafts)) out.push(l);
  }
  return out;
}
