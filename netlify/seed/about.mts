import type { Block } from '../lib/types.mts';

/**
 * The "Sobre mí" page is intentionally static (not editable from the panel) — it renders
 * through the same article template as a real post, but is never stored in Blobs and never
 * appears in the post index, RSS, or sitemap.
 *
 * Content below transcribed from "L'art de viatjar - introducció.docx" (manifesto/bio essay).
 */
export const ABOUT_TITLE = 'Sobre mí';
export const ABOUT_DESCRIPTION = "L'art de viatjar, explicat des de dins: per què viatjar és l'únic vici que ens fa més rics.";
export const ABOUT_COVER = '/images/hero-about.svg';

/** Short blurb shown on the homepage, linking through to the full "Sobre mí" page. */
export const ABOUT_SUMMARY =
  "Viatjar és, per damunt de tot, l'art de gaudir: la curiositat que mou la humanitat des de sempre, avui a l'abast de gairebé tothom. Aquest bloc neix com un refugi per a l'ànima del viatger, lluny de llistats i rànquings, per compartir una mirada personal i íntima sobre el món.";

export const ABOUT_LEAD =
  "L'ésser humà porta inscrit en el seu codi genètic un impuls innat cap al descobriment; una atracció irresistible per la incertesa i per esbrinar què s'amaga darrere de la següent frontera. En aquesta recerca, la curiositat pel que es pot trobar sempre ha superat el temor a enfrontar-se al mateix descobriment. Ha estat precisament aquest afany de coneixement el que ha impulsat la humanitat a assolir avenços científics increïbles, a edificar autèntiques meravelles i a concebre l'art en totes les seves expressions, des de la música i la pintura fins a arribar, inevitablement, a l'art de viatjar.";

export const ABOUT_BLOCKS: Block[] = [
  { t: 'h3', h: "L'art de fer la maleta: per què viatjar és l'únic vici que ens fa més rics" },
  {
    t: 'p',
    h: "Avui dia ens referim al viatge com una expressió artística i de lleure, però històricament l'acció de traslladar-se responia a una necessitat purament biològica o econòmica. Els pobles nòmades es movien per supervivència i a la recerca de caça; altres cultures ho feien per conquerir noves riqueses, i moltes comunitats es veien forçades a emigrar per fugir de l'adversitat i la misèria. Per tant, el concepte de viatjar tal com l'entenem en la contemporaneïtat és un fenomen molt recent. Inicialment, quan el viatge va començar a vincular-se amb l'oci durant el segle XIX i gran part del segle XX, estava reservat exclusivament a les elits socials, esdevenint un luxe inaccessible i un somni prohibit per a la majoria de la població. Per sort, actualment viatjar s'ha democratitzat fins a esdevenir una oportunitat a l'abast de gairebé qualsevol butxaca; una opció vital que no s'hauria de desaprofitar.",
  },
  {
    t: 'p',
    h: "Si girem la vista enrere, veurem que aquesta pulsió nòmada ja fascinava les ments dels grans pensadors de la història. Des de l'antiguitat clàssica, filòsofs i literats van lloar els beneficis de l'exploració. Sant Agustí afirmava que «el món és un llibre, i els qui no viatgen només en llegeixen una pàgina», mentre que Sèneca assegurava que «l'agressivitat del viatge cura la ment». Segles més tard, Miguel de Cervantes lligava el moviment al coneixement recordant que «el qui llegeix molt i camina molt, veu molt i sap molt».",
  },
  {
    t: 'p',
    h: "Aquesta visió va transcendir fins a l'època moderna, on escriptors de la talla de Mark Twain van advertir que «viatjar és mortal per als prejudicis, la intolerància i la mentalitat estreta», i Hans Christian Andersen va resumir el concepte en una màxima cèlebre: «Viatjar és viure». Per la seva banda, Aldous Huxley destacava el seu caràcter desmitificador en dir que «viatjar és descobrir que tothom s'equivoca sobre els altres països», un creixement intel·lectual que Émile Zola sentenciava assegurant que «res desenvolupa tant la intel·ligència com viatjar». Finalment, John Steinbeck capturava el misticisme de l'experiència en admetre que «no prenem nosaltres un viatge; el viatge ens pren a nosaltres».",
  },
  {
    t: 'p',
    h: "Des dels grans exploradors de la història com Alexandre el Gran, Marco Polo, Ibn Battuta, Magalhães, Elcano o Cook, fins a l'epopeia espacial d'Iuri Gagarin —i és que, tot i que els cercadors d'internet encara no incloguin la Lluna com a destinació, tot arribarà—, l'anhel d'aventura de l'home ha transformat el nostre destí. És del tot comprensible, doncs, que tantes persones basin la seva escala de valors i les seves prioritats en l'acció de viatjar, ja que poques experiències ofereixen un estímul tan profund i transformador per a l'ànima humana.",
  },
  {
    t: 'p',
    h: "I jo sóc d'aquesta ètnia, i això m'ha dut a iniciar tot això que esteu llegint i que, si us crida l'atenció, podeu continuar seguint a continuació.",
  },
  {
    t: 'p',
    h: "Aquest espai es distingeix de qualsevol crònica de viatges convencional perquè neix com un refugi per a l'ànima del viatger. Lluny de buscar un consens o fixar dogmes, aquestes pàgines respecten la brúixola i el mapa que cada lector porta a dins, entenent que l'acte de viatjar és un art purament íntim i personal. Per això, us convido a mirar a través dels meus ulls per reviure els paisatges, les músiques i els sabors que m'han marcat profundament. Com que cada travessia és una experiència única, és natural que les nostres percepcions divergeixin; al cap i a la fi, la vertadera bellesa del camí rau en la mirada particular de qui el recorre.",
  },
  {
    t: 'p',
    h: "Dins d'aquest prisma tan personal, vull compartir una certesa que estic segur que qualsevol viatger ha experimentat alguna vegada: la revelació absoluta d'haver trobat el lloc de la teva vida. No em refereixo a les teves coordenades de naixement, sinó a aquell racó del món on t'hi trobes i, de sobte, et sents com a casa. És un indret que t'envolta amb una pau i una seguretat inexplicables, on camines amb el pas ferm d'un nadiu i on s'activa un vincle immediat. Allà, les olors, el clima, la música i el gust del menjar et xiuxiuegen a l'oïda un càlid «bentornat». Sentir aquesta necessitat irrefrenable de tornar-hi —i fer-ho— significa haver trobat el teu lloc al món; una connexió tan profunda i extraordinària que, en lloc d'explicar-se, simplement es viu amb una intensitat increïble.",
  },
  {
    t: 'p',
    h: "És per aquest motiu que en aquest espai no trobareu manuals d'instruccions sobre targetes de dades ni els llistats d'horaris de vols que ja saturen internet. En lloc d'això, prefereixo oferir-vos, de forma transparent, la meva pròpia rutina de viatge: aquelles poques directrius pràctiques que m'aplico en el dia a dia, en les quals confio plenament i que mantinc intactes sota la premissa que el que funciona, és millor no tocar-ho.",
  },

  { t: 'h3', h: 'Més enllà del que coneixem: per què sortir de la zona de confort canvia la teva vida' },
  {
    t: 'p',
    h: "Vivim tancats en una bombolla de certeses, en una rutina dissenyada per fer-nos sentir segurs. No obstant això, la veritable evolució personal comença just a la frontera on s'acaba el que ens és familiar. Sortir de la zona de confort no és un simple capritx; és un dels actes més valents i transformadors que podem experimentar.",
  },
  { t: 'h3', h: 'Un viatge cap a fora i cap a dins' },
  {
    t: 'p',
    h: "Quan fem el pas d'explorar el desconegut, iniciem una doble exploració. D'una banda, és una oportunitat única per conèixer i aprendre a conviure tant amb el món exterior com amb l'interior propi. Enfrontar-nos a situacions inèdites ens obliga a mirar cap endins, a gestionar les nostres pors i a descobrir fortaleses que ni imaginàvem que teníem.",
  },
  {
    t: 'p',
    h: 'Aquest procés té un efecte radical sobre la nostra ment: t\'elimina els prejudicis; no alguns, sinó tots. Les idees preconcebudes es desintegren quan toquem la realitat amb les nostres pròpies mans.',
  },
  { t: 'h3', h: "L'aprenentatge de la humilitat" },
  {
    t: 'p',
    h: "Un dels majors canvis de perspectiva és adonar-se que el teu món no és el millor, senzillament és el teu, el que coneixes. Tendim a pensar que la nostra manera de viure és la correcta, però la realitat és molt més diversa. Sortir a fora ens ensenya a mostrar un respecte absolut cap als altres mons, doncs cadascú ha nascut on li ha tocat, no pas on ha triat. L'atzar geogràfic o cultural no ens fa superiors, ens fa simplement diferents.",
  },
  { t: 'h3', h: 'Creixement, estímuls i noves perspectives' },
  {
    t: 'p',
    h: 'Lluny de fer-nos febles, aquesta obertura augmenta l’autoestima i la capacitat d’adaptació a altres medis, cultures, sabors i olors. Cada vegada que superem un repte en un entorn estrany, la confiança en nosaltres mateixos es multiplica. Ens tornem resilients, flexibles i curiosos.',
  },
  {
    t: 'p',
    h: "A l'últim, trencar les nostres barreres personals t'enriqueix de coneixements, múltiples visions i interpretacions d'un mateix tema. Deixem de veure la vida en blanc i negre per començar a entendre-la en tota la seva gamma de grisos i colors.",
  },
  { t: 'q', h: "I tu, t'atreveixes a fer el primer pas fora de la teva zona de confort avui mateix?" },

  { t: 'h3', h: "L'art de viatjar: com començar a explorar el món (i a tu mateix)" },
  {
    t: 'p',
    h: "Som-hi, doncs! Per on comencem? Què és primer: l'ou o la gallina? O, traslladat al nostre terreny: què va primer, el destí o l'elecció de si hi vas sol o acompanyat?",
  },
  {
    t: 'p',
    h: "La resposta és ben senzilla: el que et demanin el cos i la ment. Segons el moment vital en què et trobis, et veuràs empès a decidir on anar i amb qui. I és ben igual si tens parella o no, o si tens fills: viatjar no equival necessàriament a perdre's durant un mes a l'illa més remota del planeta o a submergir-se en la urbs més caòtica del món.",
  },
  {
    t: 'p',
    h: "Viatjar és, en essència, sortir de la zona de confort. Significa trencar amb les dinàmiques monòtones de la rutina diària i concedir un respir al cos i a l'esperit, encara que només sigui per 24 o 48 hores. El propòsit real és regalar-te aquests parèntesis per desconnectar de l'entorn i reconnectar amb tu mateix. Sovint ens abandonem i ens posterguem a causa del ritme frenètic que ens imposa un món absorbent, implacable i absent de recolliment personal. Aquests instants d'evasió t'enriqueixen a tu i, per extensió, enriqueixen tot allò que t'envolta.",
  },
  {
    t: 'p',
    h: "Com que per algun lloc s'ha de començar, comencem pel destí: el teu primer viatge més enllà de les teves fronteres geogràfiques i mentals.",
  },
  { t: 'h3', h: "L'aclimatació: un aprenentatge gradual" },
  {
    t: 'p',
    h: "La primera aventura no hauria de ser a l'altra punta del món. Com en qualsevol aprenentatge, cal un procés d'aclimatació. Qui comença a córrer no s'estrena amb una marató, de la mateixa manera que qui aprèn a cuinar no debuta amb un plat d'alta gastronomia. Amb els viatges passa exactament igual: t'hi has d'adaptar.",
  },
  {
    t: 'p',
    h: "És aconsellable minimitzar el primer xoc cultural i idiomàtic perquè no resulti massa impactant. Si a la primera de canvi estàs volant cap a la Xina o l'Índia, el contrast pot ser tan brusc que potser no voldràs tornar a sortir de casa; i no es tracta d'això. Per tant, la teva primera sortida a l'estranger hauria de complir uns requisits bàsics:",
  },
  {
    t: 'p',
    h: [
      "— <strong>L'idioma:</strong> tria un lloc on la llengua no sigui una barrera insalvable. Busca països on es parli el teu mateix idioma, una llengua similar o l'idioma universal: l'anglès.",
      '— <strong>La gastronomia:</strong> opta per un destí on el menjar no et faci passar més temps visitant els banys que els monuments o els paisatges.',
      "— <strong>El clima i la distància:</strong> cerca un clima que no condicioni les teves activitats i una distància de vol moderada que t'estalviï el jet lag (que és ben real) durant els primers dies d'estada.",
    ].join('<br>'),
  },
  {
    t: 'p',
    h: "Per exemple, el meu primer viatge en solitari va ser a Roma. Dominant el català i el castellà, l'italià no representa cap gran dificultat. A més, el clima i la dieta són mediterranis, i la ciutat es troba a una distància molt raonable que no arriba a les dues hores de vol.",
  },
  { t: 'h3', h: 'Els quatre imprescindibles del viatger' },
  {
    t: 'p',
    h: "<strong>Gaudeix i assaboreix el moment.</strong><br>Vagis on vagis, absorbeix-ho tot amb els cinc sentits. Sigues conscient que, molt probablement, és un lloc on no tornaràs mai més.",
  },
  {
    t: 'p',
    h: "<strong>El descans és innegociable.</strong><br>Per viatjar i esprémer l'experiència al màxim, cal estar descansat. Per a mi, el llit és sagrat: un bon matalàs i un entorn sense sorolls que interrompin el son són fonamentals. Reconec que soc obertament anti-habitacions compartides de més de dues persones (tu i la teva parella). Soc conscient que és un estil de viatge molt comú i que el pressupost es redueix sensiblement, però el meu descans i el meu gaudi no tenen preu. Per tant, tot i respectar-ho profundament, aquí deixarem de banda aquesta opció.",
  },
  {
    t: 'p',
    h: "<strong>Integra't en l'entorn.</strong><br>Camina sense rumb fix (però tenint clar per on trepitges). Entra a les petites botigues de comerç de proximitat i pregunta als veïns on menjar o què visitar, anant molt més enllà de les ressenyes de Google o Tripadvisor. Si et fons amb el lloc, viuràs l'experiència d'una manera molt més enriquidora i personal. Compte, que jo també m'he fet la foto de rigor a l'Empire State! Considero que cal fer la ruta dels llocs típics que realment valen la pena, però soc partidari de trobar un equilibri que et permeti transcendir el turisme convencional.",
  },
  {
    t: 'p',
    h: "<strong>Equipatge lleuger i una bona farmaciola.</strong><br>Cada vegada viatjo més lleuger i prioritzo el que és realment essencial. Si penses en la roba que tens a l'armari de casa, quina et poses en el dia a dia? Sempre la mateixa: tendim a utilitzar allò que ens resulta còmode, ho embrutem, ho rentem i ens ho tornem a posar. La resta es queda a l'armari \"per si de cas\". Llavors, per què t'has d'emportar mig armari per a un viatge de dues o tres setmanes si faràs el mateix? Recorda un detall vital: a tot el món hi ha bugaderies.",
  },
  {
    t: 'p',
    h: "Viatja només amb les mudes que hagis d'utilitzar i dona prioritat, en canvi, a una bona farmaciola. Allà on vagis, els noms comercials i les nomenclatures dels fàrmacs varien, així que és millor portar de casa allò que saps del cert que et funciona. Et recomano incloure:",
  },
  {
    t: 'p',
    h: [
      '— Un antiàlgic (per al mal de cap o malestars generals).',
      '— Un antiinflamatori.',
      "— Protector o tractament per a problemes gàstrics (el canvi d'aigua i de dieta sol afectar el sistema digestiu de forma habitual).",
      '— <strong>Calçat còmode:</strong> imprescindible per recórrer el món. Els peus són sagrats! Inclou a la farmaciola tiretes, benes i iode per prevenir o curar rascades i ampolles.',
      "— <strong>Ergonomia en els trajectes:</strong> si faràs desplaçaments llargs en avió, autobús o tren, un coixí lumbar i un de cervical marcaran la diferència. No et recomanaré cap marca; simplement ves a una botiga especialitzada i prova'ls tu mateix fins a trobar el teu.",
    ].join('<br>'),
  },

  { t: 'h3', h: 'Viatjar amb consciència: el valor de la prevenció i el respecte' },
  {
    t: 'p',
    h: 'Viatjar és obrir la ment a la imprevisibilitat. No es tracta de planificar cada minut al mil·límetre —visca la màgia de la improvisació!—, sinó de conèixer el terreny que trepitgem. Sovint em sorprenen els vídeos virals amb títols alarmistes com "Les ciutats més perilloses de...". La realitat és molt més senzilla: si hi apliquem el sentit comú, la gran majoria de destinacions ens oferiran una experiència segura, allunyada d\'oxímorons o ensurts greus, més enllà dels contratemps habituals de qualsevol ruta (retards en els vols, pèrdues d\'equipatge o una mala elecció culinària).',
  },
  {
    t: 'p',
    h: "Per a mi, el sentit comú és aquella alarma interna que s'activa davant de situacions evidents. Parlo de zones en plena inestabilitat política, països en conflicte bèl·lic —o fronterers amb ells— o alertes climàtiques severes. També implica gestionar la lògica del dia i la nit: hi ha barris idonis per explorar sota la llum del sol que, en fer-se fosc, demanen prudència. De nit es pot gaudir igualment, però prioritzant sempre els eixos més transitats.",
  },
  {
    t: 'p',
    h: 'Sembla una obvietat, però sovint veiem notícies de viatgers en situacions de risc que ens fan qüestionar: «De debò calia exposar-se així tal com estan les coses?». Actuar amb trellat minimitza els riscos dràsticament. No obstant això, el risc zero no existeix; els girs del destí que ens té reservats la vida passaran igualment, fem el que fem.',
  },
  {
    t: 'p',
    h: 'Per tot plegat, la clau rau en ser previsor i respectuós a través de tres pilars fonamentals:',
  },
  {
    t: 'p',
    h: [
      "— <strong>Respecte absolut per la cultura local:</strong> com a viatgers, som nosaltres els qui ens hem d'adaptar al país d'acollida, mai a l'inrevés. Si un espai sagrat requereix una vestimenta determinada, ens hi adaptem sense reserves. No viatgem per canviar el món, sinó per experimentar-lo i entendre'l. Si no connectes amb els valors o l'estil de vida d'un lloc, la solució és senzilla: tria una altra destinació.",
      '— <strong>Garantir un "Travel Safe" intel·ligent:</strong> per a la teva tranquil·litat, assegura com a mínim la reserva de la primera i l\'última nit del viatge. Sobretot, investiga prèviament la reputació del barri on t\'allotjaràs. No té cap sentit patir situacions de tensió o comprometre la teva seguretat personal només per estalviar-te vint euros per nit.',
      '— <strong>Logística digital i financera:</strong> abans de marxar, verifica les condicions de roaming de la teva companyia i posa a la maleta una bateria externa fiable. Així mateix, confirma que les teves targetes bancàries estiguin actives per a l\'estranger i viatja sempre amb una quantitat mínima d\'efectiu en moneda local. El pagament digital encara no és universal.',
    ].join('<br>'),
  },
  { t: 'p', h: "Amb aquesta premissa a la motxilla, ja estàs a punt per enlairar-te." },

  { t: 'h3', h: "L'art de planificar com a part del viatge: el plaer de tenir-ho tot lligat" },
  {
    t: 'p',
    h: "Davant l'eterna dicotomia viatgera, on et situes? Ets de les persones que compren un bitllet d'avió a cegues i es llencen a l'aventura de l'imprevist, o prefereixes la seguretat de tenir cada detall prèviament lligat? Si hagués de definir-me, m'inclouria sens dubte en aquest segon grup. Això sí, amb un matís indispensable: sempre reservo dies intercalats per a la improvisació i la sorpresa. Aquesta pulsió per l'ordre no respon a cap mania estranya ni a un trastorn obsessiu; és una tria purament personal i passional. M'apassiona, literalment, planificar.",
  },
  {
    t: 'p',
    h: "Per a mi, la preparació d'un itinerari no és un tràmit feixuc, sinó el veritable quilòmetre zero de l'experiència. Mentre organitzes, busques i selecciones, la ment ja comença a viatjar. Cada minut dedicat a investigar sobre un destí es converteix en un oasi de desconnexió de la rutina diària, una oportunitat daurada per projectar-se emocionalment i geogràfica en un altre racó del món.",
  },
  {
    t: 'p',
    h: "A més, el procés de planificació és un motor potentíssim per a la imaginació. Imaginar és un acte meravellós que genera un benestar tan intens, ric i expectant que, de vegades, el viatge real o determinades parades del camí no aconsegueixen superar el llistó de les nostres expectatives. Qui no ha experimentat mai la típica sensació de «m'esperava una altra cosa»? Doncs és exactament aquest fenomen psicològic el que fa tan màgica la fase prèvia.",
  },
  { t: 'q', h: 'Així que... a planificar s\'ha dit!' },

  { t: 'h3', h: 'El meu mètode: de la gènesi de la idea a la creació de la ruta' },
  {
    t: 'p',
    h: "Aquest sistema és fruit d'una evolució totalment personal, un mètode que he anat polint i perfeccionant viatge rere viatge (i que, a mesura que us vagi desgranant les meves aventures, anireu entenent millor). Tot i així, per norma general, la meva estructura de treball se sosté sobre tres pilars fonamentals:",
  },
  {
    t: 'p',
    h: [
      '— <strong>La tria del destí:</strong> el punt de partida neix de la recerca d\'un lloc que connecti de forma directa amb les meves grans passions: la història (tant l\'antiga com la contemporània), la mitologia, els paisatges naturals imponents o el xoc amb cultures llunyanes. Un cop seleccionat el lloc, ja disposo del "punt A" o camp base d\'arribada.',
      "— <strong>El disseny cartogràfic de la ruta:</strong> aquest node inicial es converteix en l'eix vertebrador de tots els meus moviments. Com que posseeixo un perfil nòmada i actiu, el meu objectiu és esprémer al màxim les hores de llum solar. Per optimitzar l'energia, prioritzo estrictament el descans, establint una treva sagrada que va des de les 22:00 h fins a les 06:00 h de l'endemà.",
      '— <strong>La resolució del trencaclosques logístic:</strong> la meva prioritat analítica és avaluar els millors mitjans de transport disponibles (tren, metro, tramvia o autobús), estudiant les combinacions òptimes, els trasllats eficients i les millors ubicacions per allotjar-me. És evident que com més ambiciós és el viatge i més coses vols encabir-hi, més complex es torna aquest trencaclosques d\'horaris i check-ins. Tot i la dificultat, trobo que és un procés altament divertit i estimulant. La satisfacció intel·lectual que sents quan aconsegueixes que totes les peces encaixin a la perfecció és, simplement, enorme.',
    ].join('<br>'),
  },

  { t: 'h3', h: 'Micromons urbans enfront de grans metròpolis' },
  {
    t: 'p',
    h: "Aquest sistema minuciós de connexions i enllaços resulta ideal quan es visiten zones geogràfiques esquitxades de ciutats petites; aquelles localitats amb encant que es poden explorar a fons en un parell de dies abans de fer el salt cap al següent destí.",
  },
  {
    t: 'p',
    h: 'En canvi, el panorama canvia radicalment quan ens enfrontem a ciutats en majúscules, d\'aquelles que tenen una identitat desbordant, com Londres, Nova York, París, Roma o Tòquio. En aquestes grans capitals, la tipologia i la naturalesa del viatge es transformen per complet. L\'estratègia organitzativa adopta una altra dimensió però, paradoxalment, el procés es torna molt i molt més senzill.',
  },

  { t: 'h3', h: 'L\'art de viatjar sense mapes dictats' },
  {
    t: 'p',
    h: "Com us plantejaré els viatges que he fet? Ja us he anat avançant que aquest racó no pretén ser com tants d'altres que ja saturen la xarxa; no espereu trobar-hi llistats infinits de vols, combinacions mil·limètriques, rànquings d'hotels ni un catàleg d'opcions impersonals.",
  },
  {
    t: 'p',
    h: "Tingueu en compte que la meva intenció no és, en absolut, dissenyar-vos l'itinerari. La immersió us pertany exclusivament a vosaltres. Aquesta és la vostra aventura, el reflex dels vostres desitjos, el batec de les vostres il·lusions i el compliment de les vostres pròpies promeses. Jo, senzillament, obriré una finestra al meu propi viatge: compartint els llocs exactes que vaig trepitjar, ni més ni menys, i buscant transmetre la vibració d'aquells instants a través de la paraula i de la fotografia. La imatge és un art meravellós, capaç de congelar moments únics i irrepetibles; malauradament, però, mai podrà atrapar la totalitat de la bellesa de l'instant viscut. Això últim és feina vostra, de la vostra mirada i de la vostra presència.",
  },
  {
    t: 'p',
    h: "Allò que us ressoni i vulgueu incloure en el vostre camí, serà genial. El que descarteu, també ho serà, perquè si parlem de viatjar, parlem de gustos profundament personals i subjectius. Ningú ens obliga a fer, veure o menjar quelcom pel simple fet de fer-ho. Feu allò que us neixi de dins, no el que dictin els algorismes o les modes digitals. Viatjar és, per damunt de tot, l'art de gaudir. No ho oblideu mai.",
  },
  {
    t: 'p',
    h: 'Si tens dubtes sobre algun dels llocs que apareixen al bloc, o simplement vols compartir la teva pròpia ruta, escriu-me a <a href="mailto:hola@llumnomada.com">hola@llumnomada.com</a>.',
  },
];
