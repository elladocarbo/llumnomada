/** The newsletter is dormant until a Brevo API key is set as the BREVO_API_KEY environment variable
 *  of the Netlify site: no form is shown and the endpoints answer "not configured". */
export function newsletterEnabled(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}
