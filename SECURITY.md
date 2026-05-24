# Security and Privacy

## Protections in the site

- A Content Security Policy limits scripts, frames, media, network calls, and form targets to services the site uses.
- A `no-referrer` policy prevents page addresses from being sent to external services.
- Wikipedia links open without access to the source browser tab.
- The contact interface does not post form content to this website. It validates locally and opens the visitor's configured email app with an encoded draft.

## Deployment requirements

The published site URL indicates GitHub Pages hosting. In the GitHub Pages settings, enable **Enforce HTTPS**.

Some important controls require HTTP response headers and cannot be fully provided by HTML meta tags. If the site is later served through a host or proxy that permits custom headers, configure at least:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self'; connect-src 'self' https://en.wikipedia.org; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://www.google.com; frame-ancestors 'none'; upgrade-insecure-requests
Permissions-Policy: geolocation=(), payment=(), usb=()
```

Only add `includeSubDomains` to HSTS if all subdomains are HTTPS-ready.

## Contact limits

The current contact feature opens an email draft; it does not provide server-side spam filtering, rate limiting, CAPTCHA, file scanning, or private database storage. Those protections require a contact backend or a trusted form service.

The current contact feature opens an email draft; it does not provide server-side spam filtering, rate limiting, CAPTCHA, file scanning, or private database storage. Those protections require a contact backend or a trusted form service.
