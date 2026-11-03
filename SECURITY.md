# Security policy

## Supported versions

Only the latest release of `astro-eclipse` gets fixes.

## Reporting a vulnerability

Please don't open a public issue. Use GitHub's [private vulnerability reporting](https://github.com/jantursky/astro-eclipse/security/advisories/new), or email jan.tursky@gmail.com with a description and, if you can, a minimal reproduction.

You'll get an answer within a week. Once a fix is released, the advisory is published with credit, unless you'd rather stay anonymous.

Issues in Astro itself should go to the [Astro repository](https://github.com/withastro/astro/security).

## Things to know

- The head script is inlined into every page. It is built from your validated config: theme names must be letters, digits and dashes, starting with a letter; `attribute` must be `class` or `data-*`; and the config is JSON-encoded with `<` escaped, so it can't close the script tag.
- The inline script is a script, so a Content Security Policy that forbids inline scripts will block it. Allow it with a hash or a nonce.
- The library stores only the theme name the visitor picked (or `system`) in `localStorage`, under the key you configure. It stores nothing else.
- It makes no network requests and sets no cookies.
