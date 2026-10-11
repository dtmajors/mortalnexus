# Website Redirect

The Netlify package contains index.html and _redirects at its root.
It redirects every path to https://github.com/dtmajors/mortalnexus.
No build, account system, payment backend, or runtime secrets are required.

1. Extract MortalNexus-Netlify-Redirect.zip.
2. In Netlify, deploy the extracted folder containing index.html and _redirects.
3. Open the resulting Netlify URL and confirm it goes to the GitHub product page.
4. Add mortalnexus.com and www.mortalnexus.com as custom domains in Netlify.
5. At Namecheap, use the DNS records shown by Netlify for this exact project.
   Preserve existing mail MX and TXT records. Remove only conflicting website
   A, AAAA, CNAME, or redirect records for @ and www.
6. Wait for Netlify to confirm DNS and provision HTTPS, then test both domains.

Alternatively, Namecheap's unmasked URL Redirect Records for @ and www can
point to the Netlify URL. A Netlify custom domain is preferable if HTTPS must
work reliably for both apex and www domains. Do not use masked forwarding.

The domain registrar still charges its normal domain-renewal fee. This change
removes the application dependency on Railway and KeyAuth; it does not remove
domain renewal costs or guarantee future hosting-provider free-tier terms.
