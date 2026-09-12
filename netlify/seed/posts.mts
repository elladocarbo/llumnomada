import type { Block } from '../lib/types.mts';

export interface SeedPost {
  id: string;
  slug: string;
  title: string;
  categories: string[];
  lead: string;
  blocks: Block[];
  cover: string;
  refs: string[];
  location: string;
  date: string;
  status: 'published';
  scheduledAt: null;
}

const p = (h: string): Block => ({ t: 'p', h });
const h3 = (h: string): Block => ({ t: 'h3', h });
const q = (h: string): Block => ({ t: 'q', h });

export const SEED_POSTS: SeedPost[] = [
  {
    id: 'lisboa-cap-de-setmana',
    slug: 'lisboa-cap-de-setmana',
    title: 'Un cap de setmana llarg a Lisboa',
    categories: ['ciutat', 'cap-de-setmana'],
    lead:
      "Lisboa és una ciutat que castiga les cames i ho compensa amb escreix amb la llum. Hi vam anar per tres dies llargs, sense gaire pla més enllà de caminar, i va ser exactament el que calia.",
    blocks: [
      h3("On vam dormir i com moure’s"),
      p(
        "Vam triar allotjament a l’Alfama, el barri més antic, tot i saber que això vol dir pujades constants. Recomanació honesta: el tramvia 28 és més aviat una atracció turística plena de gent que un mitjà de transport pràctic. Per moure’s de veritat funcionen millor els funiculars (l’Elevador da Glória, per exemple) combinats amb caminar.",
      ),
      h3('Tres coses que no ens vam voler perdre'),
      p(
        '1. <strong>Mirador de Santa Luzia</strong>, a primera hora del matí, quan encara no hi ha cues i la llum sobre el riu Tejo és de pel·lícula.<br>2. <strong>LX Factory</strong>, un antic complex industrial reconvertit en botigues, llibreries i restaurants, ideal per una tarda més tranquil·la.<br>3. <strong>Time Out Market</strong>, per tastar de tot sense haver de decidir un sol restaurant per sopar.',
      ),
      h3('La pregunta del pastel de nata'),
      p(
        "Vam fer la comparativa \"científica\" entre els de Pastéis de Belém i els d’una pastisseria de barri a l’Alfama. Guanya Belém per la massa cruixent, però la diferència no justifica la cua d’una hora si vas curt de temps: qualsevol bon forn de la ciutat en fa un que s’hi acosta molt.",
      ),
      p(
        "Lisboa no necessita un itinerari minuciós. Necessita sabates còmodes, ganes de perdre’s pels carrerons i acceptar que et perdràs alguna cosa —sempre queda una excusa per tornar-hi.",
      ),
    ],
    cover: '/images/hero-lisboa.svg',
    refs: [],
    location: 'Lisboa, Portugal',
    date: '2026-03-03',
    status: 'published',
    scheduledAt: null,
  },
  {
    id: 'marroc-marrakech-desert',
    slug: 'marroc-marrakech-desert',
    title: 'De Marràkech al desert del Sàhara',
    categories: ['desert', 'viatge-llarg'],
    lead:
      "El Marroc et rep amb els sentits saturats: olor d’espècies, crits dels venedors dels souks, el color de les teles penjades a cada racó de la medina. Vam passar-hi set dies: tres a Marràkech i la resta en ruta cap al desert.",
    blocks: [
      h3("Marràkech: perdre’s és el pla"),
      p(
        "La medina de Marràkech no es camina, s’hi navega. El primer dia vam intentar seguir un mapa i vam desistir abans de dinar. El segon dia vam deixar-nos portar i va ser molt millor. Un parell d’aturades que sí que val la pena buscar de forma conscient:",
      ),
      p(
        '— <strong>Jardí Majorelle</strong>, un oasi de blau i verd enmig de la ciutat, sobretot recomanable a primera hora per evitar aglomeracions.<br>— <strong>Plaça Jemaa el-Fna</strong> a la posta de sol, quan els paradets de menjar comencen a muntar-se i la plaça es transforma per complet.',
      ),
      h3('La ruta cap al desert'),
      p(
        'Vam contractar una ruta de tres dies fins a Merzouga amb parades a Aït Ben Haddou i les gorges de Todra. És un trajecte llarg amb moltes hores de furgoneta, però cada parada compensa el cansament. Aït Ben Haddou, amb les seves construccions de tapial, sembla directament un decorat de cinema (i de fet ho ha estat més d’una vegada).',
      ),
      q(
        'Dormir al campament al mig de les dunes, amb el silenci absolut del desert i un cel ple d’estrelles sense cap contaminació lumínica, va ser el moment del viatge que encara recordo amb més claredat.',
      ),
      h3('Consells pràctics'),
      p(
        "Porteu efectiu en dírhams per als tràmits més petits, negocieu sempre els preus als souks (és part del joc, no us ho preneu com una ofensa) i, si feu la ruta al desert a l’hivern, no subestimeu el fred nocturn: de dia fa calor, però a la nit les temperatures baixen molt.",
      ),
    ],
    cover: '/images/hero-marroc.svg',
    refs: [],
    location: 'Marràkech i Merzouga, Marroc',
    date: '2026-01-18',
    status: 'published',
    scheduledAt: null,
  },
  {
    id: 'motxilla-viatjar-lleuger',
    slug: 'motxilla-viatjar-lleuger',
    title: 'Com faig la motxilla per viatjar lleuger',
    categories: ['consells', 'equipatge'],
    lead:
      'Fa uns anys viatjava amb maleta gran "per si de cas". Ara, viatgi per una setmana o per un mes, tot em cap en una motxilla de 40 litres. No és cap fórmula màgica: és sobretot acceptar que la majoria de "per si de cas" no arriben mai a passar.',
    blocks: [
      h3('La regla que segueixo'),
      p(
        "Abans de ficar res a la motxilla, em pregunto si ho faria servir almenys tres vegades durant el viatge. Si la resposta és no, es queda a casa. Aquesta única regla m’ha estalviat més pes que qualsevol llista.",
      ),
      h3('La llista base'),
      p(
        [
          '— 3 samarretes que combinen entre elles',
          '— 1 pantaló llarg + 1 curt (o bermuda)',
          '— 1 jersei prim i 1 impermeable lleuger',
          '— Roba interior i mitjons per a 4-5 dies (es renta pel camí)',
          "— Sabates còmodes ja \"rodades\", mai noves",
          '— Necesser bàsic + protector solar',
          '— Carregador, adaptador universal i bateria externa',
          '— Documentació, targetes i una còpia digital de tot plegat',
        ].join('<br>'),
      ),
      h3('El que sempre em sobra'),
      p(
        "Quasi sempre és roba: torno a casa amb peces que no m’he posat ni una vegada. Per això, des de fa un parell de viatges, faig la motxilla i després en trec una peça més abans de tancar-la. Funciona més sovint del que sembla.",
      ),
      h3('I si fa fred?'),
      p(
        "La clau no és portar roba d’hivern sencera, sinó capes: una samarreta tèrmica, un jersei prim i un impermeable bo abriguen més i pesen menys que un abric gruixut. És l’ajust que més diferència fa quan viatges a llocs amb climes molt diferents en un mateix trajecte.",
      ),
    ],
    cover: '/images/hero-motxilla.svg',
    refs: [],
    location: '',
    date: '2026-02-09',
    status: 'published',
    scheduledAt: null,
  },
  {
    id: 'pirineus-aiguestortes',
    slug: 'pirineus-aiguestortes',
    title: "Tres dies caminant per Aigüestortes",
    categories: ['muntanya', 'senderisme'],
    lead:
      "Hi ha llocs que costa explicar sense caure en el tòpic, i el Parc Nacional d’Aigüestortes i Estany de Sant Maurici n’és un. Vam fer-hi una travessa de tres dies, dormint a refugis, i em quedo sobretot amb el silenci: aquell que només es troba quan portes hores caminant i l’únic soroll és el del vent entre els estanys.",
    blocks: [
      h3('El pla'),
      p(
        "Vam entrar per Espot i sortir per Boí, fent nit al refugi Ernest Mallafré el primer dia i al refugi J.M. Blanc el segon. És una ruta clàssica, però funciona precisament perquè està ben pensada: cada etapa té una durada raonable (entre 4 i 6 hores) i sempre hi ha un estany a prop per parar a dinar.",
      ),
      p(
        [
          '— <strong>Dia 1</strong>: Espot → Estany de Sant Maurici → Refugi Ernest Mallafré (fàcil, bona per agafar ritme)',
          "— <strong>Dia 2</strong>: Refugi Ernest Mallafré → Portarró d’Espot → Refugi J.M. Blanc (la més exigent, amb el port com a punt alt)",
          '— <strong>Dia 3</strong>: Refugi J.M. Blanc → Aigüestortes → Boí (baixada llarga, cames cansades)',
        ].join('<br>'),
      ),
      h3('Coses que hauria volgut saber abans'),
      p(
        "Reservar refugi amb setmanes d’antelació a l’estiu no és opcional. Vam trucar amb prou marge, però vam sentir més d’un grup que es va quedar sense plaça. També val la pena portar diners en efectiu: la cobertura és pràcticament inexistent i no tots els refugis accepten targeta.",
      ),
      q(
        "El tram del Portarró d’Espot, amb els estanys gelats a banda i banda al maig, va ser el moment que em va fer venir ganes de tornar-hi a la tardor.",
      ),
      h3('Val la pena?'),
      p(
        'Sense cap dubte. No cal ser un excursionista expert per fer-la —cal, això sí, tenir un mínim de forma física i respectar els horaris de sortida per no trobar-te el pas de muntanya amb tempesta. Si busques desconnectar de veritat, poques rutes properes ho posen tan fàcil.',
      ),
    ],
    cover: '/images/hero-pirineus.svg',
    refs: [],
    location: 'Aigüestortes, Pirineus',
    date: '2026-05-12',
    status: 'published',
    scheduledAt: null,
  },
];
