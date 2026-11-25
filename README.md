# EISENKU Technology · EISEN OS PRIME

**Innova. Explora. Crea.**

EISEN OS PRIME es un escritorio completo (164 apps, 28 juegos y navegador) que funciona en Android, PC, Xbox y cualquier navegador.

| Carpeta | Qué es |
| --- | --- |
| `index.html` | Página de EISENKU Technology |
| `os/` | EISEN OS PRIME para el navegador (versión web estática) |
| `descargas/` | APK para Android y ZIP para PC (con servidor local y modo red para Xbox/TV) |
| `release.json` | Versión publicada y huellas SHA-256 de las descargas |

## Cómo se publica

- **Vercel**, **Netlify** y **GitHub Pages** publican esta rama tal cual: no hay paso de compilación (`netlify.toml` y `vercel.json` ya están configurados).
- La versión web no incluye el servidor proxy del navegador interno: Vercel y la mayoría de plataformas de alojamiento prohíben alojar proxies. El proxy va dentro del APK y de la versión para PC, es decir, en el propio dispositivo de cada persona.
- Para subirlo a otra plataforma estática (Netlify, Cloudflare Pages, Render, Surge…), sube el contenido de esta carpeta; `_headers` ya trae las cabeceras de seguridad.

## Firma del APK

Certificado de EISENKU Technology, huella SHA-256:
`e36406b2aeb875370a628c8f554707267ea112f6e3fc95d348fa81d6c7ec04f2`

© 2026 EISENKU Technology. Xbox, Game Pass, GeForce NOW, Genshin Impact, Among Us, WhatsApp, Android y Google Play son marcas de sus respectivos propietarios.
