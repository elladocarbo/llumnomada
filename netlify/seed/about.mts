import type { Block } from '../lib/types.mts';

/**
 * The "Sobre mí" page is intentionally static (not editable from the panel) — it renders
 * through the same article template as a real post, but is never stored in Blobs and never
 * appears in the post index, RSS, or sitemap.
 */
export const ABOUT_TITLE = 'Sobre mí';
export const ABOUT_DESCRIPTION = 'Qui hi ha darrere de Llum Nòmada';
export const ABOUT_COVER = '/images/hero-about.svg';

export const ABOUT_LEAD =
  "Em dic Ella i des de fa uns anys viatjo sempre que puc, sovint amb poc equipatge i encara menys pla. <strong>Llum Nòmada</strong> va néixer com un quadern de notes per no oblidar els llocs que m'han fet aturar-me a mirar, i s'ha convertit en un bloc on comparteixo rutes, ciutats i consells pràctics per a qui també li agrada viatjar amb calma.";

export const ABOUT_BLOCKS: Block[] = [
  {
    t: 'p',
    h: 'No busco les llistes de "10 imprescindibles" ni les fotos perfectes: m\'interessa més explicar com és arribar-hi, què costa, què sorprèn i què val la pena repetir. Aquí trobaràs des de travesses de muntanya fins a caps de setmana urbans, passant per guies pràctiques per fer la motxilla i viatjar més lleuger.',
  },
  {
    t: 'p',
    h: 'Si tens dubtes sobre algun dels llocs que apareixen al bloc, o simplement vols compartir la teva pròpia ruta, escriu-me a <a href="mailto:hola@llumnomada.com">hola@llumnomada.com</a>.',
  },
];
