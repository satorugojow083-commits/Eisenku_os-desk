/* EISENKU OS · Guía de inicio (qué es, qué puede hacer, primeros pasos) en 5 idiomas */
(() => {
  'use strict';
  const E = window.EISEN, I = window.EISEN_I18N, $ = s => document.querySelector(s);
  const G = {
    es: { n: 'Español', title: 'Bienvenido a EISENKU OS', sub: 'Un escritorio completo dentro de tu navegador', what: '¿Qué es?', whatT: 'EISENKU OS es un sistema de escritorio con entornos Windows y Linux que funciona 100% en la web: no instalas nada y tus archivos y ajustes se guardan en tu propio dispositivo.', can: '¿Qué puede hacer?', items: ['🌐 Navegador con pestañas y 3 navegadores: abre cualquier página, busca lo que quieras y ejecuta apps web dentro de una pestaña.', '🎵 Música: reproductor local, Spotify, YouTube y cualquier enlace (mp3, mp4, SoundCloud…).', '📁 Archivos: guarda, importa por archivo, URL o arrastrando, y ábrelos después, incluso sin poder descargar.', '📝 Oficina: Writer (documentos), Sheets (hojas de cálculo) y visor de PDF.', '🎮 Juegos integrados, 💻 Terminal con 70+ comandos y 🛍️ tienda con EISEN Store.', '⚙️ Ajustes: tema, color, fondo (también por URL), idioma y apps vinculadas.', '✦ Maestro Domingo: asistente que explica temas, resuelve ecuaciones, abre apps y organiza tus tareas.', '🐧 Cambia entre entorno Windows y Linux en Configuración › Entorno; tus archivos se comparten.', '🗂️ Escritorio: crea carpetas (clic derecho), arrastra iconos dentro y cambia nombres e iconos.'], start: 'Primeros pasos', steps: ['Abre apps con los iconos del escritorio o el menú Inicio (⊞).', 'Cambia idioma, fondo y tema en Ajustes.', 'Para que YouTube, Spotify y otras webs carguen completas, abre el sistema con INICIAR.bat.', 'Escribe help en la Terminal para ver todos los comandos.'], go: 'Empezar', lang: 'Idioma de la guía' },
    en: { n: 'English', title: 'Welcome to EISENKU OS', sub: 'A full desktop inside your browser', what: 'What is it?', whatT: 'EISENKU OS is a desktop with Windows and Linux environments that runs 100% on the web: nothing to install, and your files and settings are stored on your own device.', can: 'What can it do?', items: ['🌐 Tabbed browser with 3 browsers: open any page, search anything and run web apps inside a tab.', '🎵 Music: local player, Spotify, YouTube and any link (mp3, mp4, SoundCloud…).', '📁 Files: save, import by file, URL or drag and drop, and open them later, even if you cannot download.', '📝 Office: Writer (documents), Sheets (spreadsheets) and a PDF viewer.', '🎮 Built-in games, 💻 Terminal with 70+ commands and a 🛍️ store with EISEN Store.', '⚙️ Settings: theme, color, wallpaper (also by URL), language and linked apps.', '✦ Maestro Domingo: an assistant that explains topics, solves equations, opens apps and organizes your tasks.', '🐧 Switch between Windows and Linux environments in Settings › Environment; your files are shared.'], start: 'Getting started', steps: ['Open apps from the desktop icons or the Start menu (⊞).', 'Change language, wallpaper and theme in Settings.', 'For YouTube, Spotify and other sites to load fully, start the system with INICIAR.bat.', 'Type help in the Terminal to see every command.'], go: 'Get started', lang: 'Guide language' },
    pt: { n: 'Português', title: 'Bem-vindo ao EISENKU OS', sub: 'Uma área de trabalho completa dentro do seu navegador', what: 'O que é?', whatT: 'O EISENKU OS é uma área de trabalho no com ambientes Windows e Linux que funciona 100% na web: nada para instalar, e seus arquivos e ajustes ficam no seu próprio dispositivo.', can: 'O que ele faz?', items: ['🌐 Navegador com abas e 3 navegadores: abra qualquer página, pesquise o que quiser e execute apps web dentro de uma aba.', '🎵 Música: player local, Spotify, YouTube e qualquer link (mp3, mp4, SoundCloud…).', '📁 Arquivos: salve, importe por arquivo, URL ou arrastando, e abra depois, mesmo sem poder baixar.', '📝 Escritório: Writer (documentos), Sheets (planilhas) e visualizador de PDF.', '🎮 Jogos integrados, 💻 Terminal com 70+ comandos e 🛍️ loja com EISEN Store.', '⚙️ Ajustes: tema, cor, papel de parede (também por URL), idioma e apps vinculados.'], start: 'Primeiros passos', steps: ['Abra apps pelos ícones da área de trabalho ou pelo menu Iniciar (⊞).', 'Mude idioma, papel de parede e tema em Ajustes.', 'Para YouTube, Spotify e outros sites carregarem por completo, abra o sistema com INICIAR.bat.', 'Digite help no Terminal para ver todos os comandos.'], go: 'Começar', lang: 'Idioma do guia' },
    fr: { n: 'Français', title: 'Bienvenue dans EISENKU OS', sub: 'Un bureau complet dans votre navigateur', what: 'Qu\'est-ce que c\'est ?', whatT: 'EISENKU OS est un bureau de avec environnements Windows et Linux qui fonctionne 100 % sur le web : rien à installer, et vos fichiers et réglages restent sur votre appareil.', can: 'Que peut-il faire ?', items: ['🌐 Navigateur à onglets avec 3 navigateurs : ouvrez n\'importe quelle page, cherchez ce que vous voulez et lancez des apps web dans un onglet.', '🎵 Musique : lecteur local, Spotify, YouTube et tout lien (mp3, mp4, SoundCloud…).', '📁 Fichiers : enregistrez, importez par fichier, URL ou glisser-déposer, et ouvrez-les plus tard, même sans pouvoir télécharger.', '📝 Bureautique : Writer (documents), Sheets (tableur) et lecteur PDF.', '🎮 Jeux intégrés, 💻 Terminal de 70+ commandes et 🛍️ boutique de EISEN Store.', '⚙️ Paramètres : thème, couleur, fond d\'écran (aussi par URL), langue et apps liées.'], start: 'Pour commencer', steps: ['Ouvrez les apps depuis les icônes du bureau ou le menu Démarrer (⊞).', 'Changez la langue, le fond et le thème dans Paramètres.', 'Pour que YouTube, Spotify et d\'autres sites se chargent complètement, lancez le système avec INICIAR.bat.', 'Tapez help dans le Terminal pour voir toutes les commandes.'], go: 'Commencer', lang: 'Langue du guide' },
    de: { n: 'Deutsch', title: 'Willkommen bei EISENKU OS', sub: 'Ein kompletter Desktop in deinem Browser', what: 'Was ist das?', whatT: 'EISENKU OS ist ein Desktop im Windows- und Linux-Umgebung, der zu 100 % im Web läuft: nichts zu installieren, und deine Dateien und Einstellungen bleiben auf deinem Gerät.', can: 'Was kann es?', items: ['🌐 Browser mit Tabs und 3 Browsern: öffne jede Seite, suche alles und starte Web-Apps in einem Tab.', '🎵 Musik: lokaler Player, Spotify, YouTube und jeder Link (mp3, mp4, SoundCloud…).', '📁 Dateien: speichern, per Datei, URL oder Drag-and-drop importieren und später öffnen, auch ohne Download-Möglichkeit.', '📝 Büro: Writer (Dokumente), Sheets (Tabellen) und PDF-Betrachter.', '🎮 Integrierte Spiele, 💻 Terminal mit 70+ Befehlen und 🛍️ Store mit EISEN Store.', '⚙️ Einstellungen: Design, Farbe, Hintergrund (auch per URL), Sprache und verknüpfte Apps.'], start: 'Erste Schritte', steps: ['Öffne Apps über die Desktop-Symbole oder das Startmenü (⊞).', 'Ändere Sprache, Hintergrund und Design in den Einstellungen.', 'Damit YouTube, Spotify und andere Seiten vollständig laden, starte das System mit INICIAR.bat.', 'Gib im Terminal help ein, um alle Befehle zu sehen.'], go: 'Los geht\'s', lang: 'Sprache der Anleitung' }
  };
  const ORDER = ['es', 'en', 'pt', 'fr', 'de'];
  let gl = I.lang || 'es', box = null;
  const esc = E.esc;
  function render() {
    const g = G[gl];
    box.querySelector('.gd-card').innerHTML = `
      <div class="gd-head"><div class="gd-logo">🖥️</div><div><h2>${esc(g.title)}</h2><p>${esc(g.sub)}</p></div></div>
      <div class="gd-lang"><span>${esc(g.lang)}:</span>${ORDER.map(k => `<button data-gl="${k}" class="${k === gl ? 'on' : ''}">${G[k].n}</button>`).join('')}</div>
      <div class="gd-body">
        <h3>${esc(g.what)}</h3><p>${esc(g.whatT)}</p>
        <h3>${esc(g.can)}</h3><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <h3>${esc(g.start)}</h3><ol>${g.steps.map(i => `<li>${esc(i)}</li>`).join('')}</ol>
      </div>
      <div class="gd-foot"><button class="btn-primary" id="gd-go">${esc(g.go)}</button></div>`;
  }
  function open() {
    gl = I.lang || 'es'; if (!G[gl]) gl = 'es';
    if (!box) {
      box = document.createElement('div'); box.className = 'gd-overlay'; box.innerHTML = '<div class="gd-card" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(box);
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-gl]');
        if (b) { gl = b.dataset.gl; I.setLang(gl); render(); return; }
        if (e.target.id === 'gd-go' || e.target === box) close();
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.style.display !== 'none') close(); });
    }
    render(); box.style.display = 'flex';
  }
  function close() { if (box) box.style.display = 'none'; E.storage.set('guide_seen', true); }
  E.guide = open;
  const ib = $('#btn-guide'); if (ib) ib.onclick = open;
  const sb = $('#cfg-btn-guide'); if (sb) sb.onclick = open;
  setTimeout(() => { if (!E.storage.get('guide_seen', false)) open(); }, 600); // 9.0: el asistente de bienvenida puede marcarla como vista antes
})();
