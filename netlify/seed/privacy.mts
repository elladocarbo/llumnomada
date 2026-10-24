import type { Lang } from '../lib/i18n.mts';

/** Body of the privacy policy (everything below the title) in each language. `owner` is the
 *  already-escaped name of the data controller; `mail` the contact address. A draft written for this
 *  blog's actual data handling — worth a read by the author. */
export function privacyBody(lang: Lang, owner: string, mail: string): string {
  if (lang === 'es') {
    return `<h3>Quién es el responsable</h3>
  <p>${owner}. Puedes escribirme a <a href="mailto:${mail}">${mail}</a> para cualquier cuestión sobre tus datos. Este es un blog personal, sin publicidad ni ingresos.</p>

  <h3>Newsletter</h3>
  <p>Si te suscribes, guardo tu <strong>dirección de correo</strong>, el momento en que pediste la suscripción y en que la confirmaste, la versión del texto de consentimiento que aceptaste y si sigues suscrito/a. La finalidad es enviarte un correo cuando publico un relato nuevo. La base legal es tu <strong>consentimiento</strong>, que puedes retirar en cualquier momento con el enlace «Darme de baja» de cada correo.</p>
  <p>La suscripción solo se hace efectiva cuando confirmas la dirección con el enlace que te envío. <strong>Las direcciones que no se confirman se borran automáticamente a los 30 días.</strong> Las suscripciones confirmadas se conservan mientras sigas suscrito/a; al darte de baja dejo de escribirte y solo conservo la dirección marcada como «de baja» para que no se te vuelva a enviar nada por error. Si quieres que se borre del todo, pídemelo por correo.</p>

  <h3>Invitaciones personales</h3>
  <p>Algunas veces invito personalmente a una persona que conozco a suscribirse, con un único mensaje que contiene el enlace al formulario. La base es el interés legítimo en dar a conocer el blog a personas de mi entorno, con un mensaje breve, personal y sin ningún seguimiento. No guardo la dirección: solo un código irreversible, para no invitar a la misma persona dos veces. No se incluye a nadie en la lista sin que lo confirme él mismo. Si no te interesa, ignora el mensaje y no volveré a escribirte.</p>

  <h3>Visitas y valoraciones</h3>
  <p>Para contar visitas únicas, la web calcula un código irreversible a partir de la dirección IP y de una sal secreta que cambia cada día; <strong>no se guarda la IP</strong>. Estos códigos se descartan pasados dos días y solo queda el recuento. Para evitar votos repetidos en las valoraciones por estrellas se guarda otro código irreversible por relato, mientras el relato está en la web. La base legal es el interés legítimo en conocer el uso del blog y mantener unas valoraciones fiables. No uso cookies de seguimiento ni publicidad.</p>

  <h3>Alojamiento y servicios</h3>
  <p>La web está alojada en <strong>Netlify</strong>, que, como cualquier servidor, registra temporalmente la dirección IP de cada petición por razones de seguridad y funcionamiento. Las tipografías se sirven desde la propia web: <strong>tu navegador no contacta con Google ni con ningún otro tercero</strong> al visitar las páginas. Los correos de la newsletter los envía <strong>Brevo</strong> (Sendinblue SAS, Francia), que actúa como encargado del tratamiento solo para enviarlos. Estos proveedores pueden tratar datos fuera de la Unión Europea con las garantías contractuales que exige la normativa.</p>
  <p>El panel de administración usa una cookie de sesión que solo utiliza la autora.</p>

  <h3>Menores</h3>
  <p>Esta web no va dirigida a menores de 14 años. Si eres menor de 14 años, no te suscribas a la newsletter sin el consentimiento de tus padres o tutores.</p>

  <h3>Tus derechos</h3>
  <p>Puedes pedir el acceso, la rectificación, la supresión, la limitación o la oposición al tratamiento de tus datos, y su portabilidad, escribiendo a <a href="mailto:${mail}">${mail}</a>. Si crees que no se han respetado, puedes reclamar ante la autoridad de protección de datos (en Cataluña, la <a href="https://apdcat.gencat.cat/" rel="noopener">Autoritat Catalana de Protecció de Dades</a>).</p>
  <p><em>Última actualización: octubre de 2026.</em></p>`;
  }
  if (lang === 'en') {
    return `<h3>Who is responsible</h3>
  <p>${owner}. You can write to me at <a href="mailto:${mail}">${mail}</a> about anything concerning your data. This is a personal blog, with no advertising and no income.</p>

  <h3>Newsletter</h3>
  <p>If you subscribe, I keep your <strong>email address</strong>, the moment you asked to subscribe and the moment you confirmed it, the version of the consent text you accepted and whether you are still subscribed. The purpose is to send you an email when I publish a new story. The legal basis is your <strong>consent</strong>, which you can withdraw at any time with the “Unsubscribe” link in every email.</p>
  <p>The subscription only takes effect when you confirm your address with the link I send you. <strong>Addresses that are not confirmed are deleted automatically after 30 days.</strong> Confirmed subscriptions are kept for as long as you stay subscribed; when you unsubscribe I stop writing to you and only keep the address marked as “unsubscribed” so that nothing is sent to you by mistake. If you want it deleted completely, ask me by email.</p>

  <h3>Personal invitations</h3>
  <p>Sometimes I personally invite someone I know to subscribe, with a single message containing the link to the form. The basis is the legitimate interest in making the blog known to people around me, with a short, personal message and no tracking at all. I do not keep the address: only an irreversible code, so as not to invite the same person twice. Nobody is added to the list unless they confirm it themselves. If it is not of interest to you, ignore the message and I will not write to you again.</p>

  <h3>Visits and ratings</h3>
  <p>To count unique visits, the site calculates an irreversible code from the IP address and a secret salt that changes every day; <strong>the IP is not stored</strong>. These codes are discarded after two days and only the count remains. To prevent repeated votes in the star ratings, another irreversible code is kept per story, for as long as the story is on the site. The legal basis is the legitimate interest in knowing how the blog is used and keeping the ratings reliable. I use no tracking cookies and no advertising.</p>

  <h3>Hosting and services</h3>
  <p>The site is hosted on <strong>Netlify</strong>, which, like any server, temporarily records the IP address of each request for security and operational reasons. Typefaces are served from the site itself: <strong>your browser does not contact Google or any other third party</strong> when you visit the pages. The newsletter emails are sent by <strong>Brevo</strong> (Sendinblue SAS, France), which acts as a data processor only to send them. These providers may process data outside the European Union with the contractual safeguards required by law.</p>
  <p>The admin panel uses a session cookie that only the author uses.</p>

  <h3>Minors</h3>
  <p>This site is not aimed at children under 14. If you are under 14, do not subscribe to the newsletter without the consent of your parents or guardians.</p>

  <h3>Your rights</h3>
  <p>You can request access, rectification, erasure, restriction of or objection to the processing of your data, and its portability, by writing to <a href="mailto:${mail}">${mail}</a>. If you believe they have not been respected, you can complain to the data protection authority (in Catalonia, the <a href="https://apdcat.gencat.cat/" rel="noopener">Catalan Data Protection Authority</a>).</p>
  <p><em>Last updated: October 2026.</em></p>`;
  }
  return `<h3>Qui és el responsable</h3>
  <p>${owner}. Pots escriure’m a <a href="mailto:${mail}">${mail}</a> per a qualsevol qüestió sobre les teves dades. Aquest és un blog personal, sense publicitat ni ingressos.</p>

  <h3>Newsletter</h3>
  <p>Si et subscrius, guardo la teva <strong>adreça de correu</strong>, el moment en què vas demanar la subscripció i en què la vas confirmar, la versió del text de consentiment que vas acceptar i si continues subscrit/a. La finalitat és enviar-te un correu quan publico un relat nou. La base legal és el teu <strong>consentiment</strong>, que pots retirar en qualsevol moment amb l’enllaç «Dona’t de baixa» de cada correu.</p>
  <p>La subscripció només es fa efectiva quan confirmes l’adreça amb l’enllaç que t’envio. <strong>Les adreces que no es confirmen s’esborren automàticament als 30 dies.</strong> Les subscripcions confirmades es conserven mentre estiguis subscrit/a; en donar-te de baixa deixo d’escriure’t i només conservo l’adreça marcada com a «de baixa» perquè no se’t torni a enviar res per error. Si vols que s’esborri del tot, demana-m’ho per correu.</p>

  <h3>Invitacions personals</h3>
  <p>Algunes vegades convido personalment una persona que conec a subscriure’s, amb un únic missatge que conté l’enllaç al formulari. La base és l’interès legítim a donar a conèixer el blog a persones del meu entorn, amb un missatge breu, personal i sense cap seguiment. No guardo l’adreça: només un codi irreversible, per no convidar la mateixa persona dues vegades. No s’inclou ningú a la llista sense que ho confirmi ell mateix. Si no t’interessa, ignora el missatge i no et tornaré a escriure.</p>

  <h3>Visites i valoracions</h3>
  <p>Per comptar visites úniques, el web calcula un codi irreversible a partir de l’adreça IP i d’una sal secreta que canvia cada dia; <strong>no es guarda la IP</strong>. Aquests codis es descarten passats dos dies i només en queda el recompte. Per evitar vots repetits a les valoracions per estrelles es guarda un altre codi irreversible per relat, mentre el relat és al web. La base legal és l’interès legítim a conèixer l’ús del blog i mantenir unes valoracions fiables. No faig servir galetes de seguiment ni publicitat.</p>

  <h3>Allotjament i serveis</h3>
  <p>El web està allotjat a <strong>Netlify</strong>, que, com qualsevol servidor, registra temporalment l’adreça IP de cada petició per raons de seguretat i funcionament. Les tipografies es serveixen des del mateix web: <strong>el teu navegador no contacta amb Google ni cap altre tercer</strong> en visitar les pàgines. Els correus de la newsletter els envia <strong>Brevo</strong> (Sendinblue SAS, França), que actua com a encarregat del tractament només per enviar-los. Aquests proveïdors poden tractar dades fora de la Unió Europea amb les garanties contractuals que exigeix la normativa.</p>
  <p>El panell d’administració fa servir una galeta de sessió que només utilitza l’autora.</p>

  <h3>Menors</h3>
  <p>Aquest web no va dirigit a menors de 14 anys. Si ets menor de 14 anys, no et subscriguis a la newsletter sense el consentiment dels teus pares o tutors.</p>

  <h3>Els teus drets</h3>
  <p>Pots demanar l’accés, la rectificació, la supressió, la limitació o l’oposició al tractament de les teves dades, i la seva portabilitat, escrivint a <a href="mailto:${mail}">${mail}</a>. Si creus que no s’han respectat, pots reclamar davant l’autoritat de protecció de dades (a Catalunya, l’<a href="https://apdcat.gencat.cat/" rel="noopener">Autoritat Catalana de Protecció de Dades</a>).</p>
  <p><em>Darrera actualització: octubre de 2026.</em></p>`;
}
