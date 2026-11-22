/* EISENKU OS · Idiomas. El texto base está en español; aquí se traduce al vuelo (texto, placeholder, title, alert/confirm/prompt). */
(() => {
  'use strict';
  const LANGS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch' };
  // [español, English, Português, Français, Deutsch]
  const R = [
    ['🎵 Local','🎵 Local','🎵 Local','🎵 Local','🎵 Lokal'],
    ['🔗 Enlace','🔗 Link','🔗 Link','🔗 Lien','🔗 Link'],
    ['Pega un enlace de Spotify (canción, álbum, playlist, podcast)','Paste a Spotify link (song, album, playlist, podcast)','Cole um link do Spotify (música, álbum, playlist, podcast)','Collez un lien Spotify (titre, album, playlist, podcast)','Spotify-Link einfügen (Song, Album, Playlist, Podcast)'],
    ['Cargar','Load','Carregar','Charger','Laden'],
    ['🔑 Iniciar sesión en Spotify','🔑 Log in to Spotify','🔑 Entrar no Spotify','🔑 Se connecter à Spotify','🔑 Bei Spotify anmelden'],
    ['🔗 Conectar cuenta (buscar y mis playlists)','🔗 Connect account (search & my playlists)','🔗 Conectar conta (buscar e minhas playlists)','🔗 Connecter le compte (recherche et mes playlists)','🔗 Konto verbinden (Suche & meine Playlists)'],
    ['Busca canciones, álbumes, artistas…','Search songs, albums, artists…','Busque músicas, álbuns, artistas…','Cherchez titres, albums, artistes…','Songs, Alben, Künstler suchen…'],
    ['Mis playlists','My playlists','Minhas playlists','Mes playlists','Meine Playlists'],
    ['Busca en YouTube o pega un enlace de video/lista','Search YouTube or paste a video/playlist link','Pesquise no YouTube ou cole um link de vídeo/lista','Cherchez sur YouTube ou collez un lien vidéo/liste','YouTube durchsuchen oder Video-/Playlist-Link einfügen'],
    ['URL de música o video (mp3, mp4, Spotify, YouTube, SoundCloud…)','Music or video URL (mp3, mp4, Spotify, YouTube, SoundCloud…)','URL de música ou vídeo (mp3, mp4, Spotify, YouTube, SoundCloud…)','URL de musique ou vidéo (mp3, mp4, Spotify, YouTube, SoundCloud…)','Musik- oder Video-URL (mp3, mp4, Spotify, YouTube, SoundCloud…)'],
    ['Reproducir','Play','Reproduzir','Lire','Abspielen'],
    ['Sin resultados','No results','Sem resultados','Aucun résultat','Keine Ergebnisse'],
    ['Conectado como','Connected as','Conectado como','Connecté en tant que','Verbunden als'],
    ['Puedes añadir una clave API de YouTube en Ajustes › Aplicaciones vinculadas.','You can add a YouTube API key in Settings › Linked apps.','Você pode adicionar uma chave de API do YouTube em Ajustes › Aplicativos vinculados.','Vous pouvez ajouter une clé API YouTube dans Paramètres › Applications liées.','Du kannst unter Einstellungen › Verknüpfte Apps einen YouTube-API-Schlüssel hinzufügen.'],
    ['Canal de Twitch','Twitch channel','Canal da Twitch','Chaîne Twitch','Twitch-Kanal'],
    ['Ver','Watch','Assistir','Regarder','Ansehen'],
    ['Escribe el nombre de un canal de Twitch.','Type the name of a Twitch channel.','Digite o nome de um canal da Twitch.','Saisissez le nom d\'une chaîne Twitch.','Gib den Namen eines Twitch-Kanals ein.'],
    ['Spotify funciona en la app Música (pestaña Spotify).','Spotify works in the Music app (Spotify tab).','O Spotify funciona no app Música (aba Spotify).','Spotify fonctionne dans l\'app Musique (onglet Spotify).','Spotify funktioniert in der Musik-App (Tab Spotify).'],
    ['Pega un enlace de Spotify válido','Paste a valid Spotify link','Cole um link válido do Spotify','Collez un lien Spotify valide','Füge einen gültigen Spotify-Link ein'],
    ['Inicia sesión en la ventana y luego recarga el reproductor','Log in in the window, then reload the player','Entre na janela e depois recarregue o player','Connectez-vous dans la fenêtre puis rechargez le lecteur','Melde dich im Fenster an und lade den Player neu'],
    ['Primero escribe tu Spotify Client ID en Ajustes › Aplicaciones vinculadas','First enter your Spotify Client ID in Settings › Linked apps','Primeiro digite seu Client ID do Spotify em Ajustes › Aplicativos vinculados','Saisissez d\'abord votre Client ID Spotify dans Paramètres › Applications liées','Gib zuerst deine Spotify-Client-ID unter Einstellungen › Verknüpfte Apps ein'],
    ['Permite las ventanas emergentes para iniciar sesión','Allow pop-ups to log in','Permita pop-ups para entrar','Autorisez les fenêtres contextuelles pour vous connecter','Erlaube Pop-ups für die Anmeldung'],
    ['No se pudo conectar con Spotify','Could not connect to Spotify','Não foi possível conectar ao Spotify','Impossible de se connecter à Spotify','Verbindung zu Spotify fehlgeschlagen'],
    ['Spotify rechazó la conexión: revisa el Client ID y la Redirect URI','Spotify refused the connection: check the Client ID and Redirect URI','O Spotify recusou a conexão: verifique o Client ID e a Redirect URI','Spotify a refusé la connexion : vérifiez le Client ID et la Redirect URI','Spotify hat die Verbindung abgelehnt: prüfe Client-ID und Redirect-URI'],
    ['Spotify conectado','Spotify connected','Spotify conectado','Spotify connecté','Spotify verbunden'],
    ['No se pudieron cargar tus playlists','Could not load your playlists','Não foi possível carregar suas playlists','Impossible de charger vos playlists','Deine Playlists konnten nicht geladen werden'],
    ['Escribe una búsqueda o pega un enlace de YouTube','Type a search or paste a YouTube link','Digite uma busca ou cole um link do YouTube','Saisissez une recherche ou collez un lien YouTube','Suchbegriff eingeben oder YouTube-Link einfügen'],
    ['Abierto en el Navegador EISEN','Opened in the EISEN Browser','Aberto no Navegador EISEN','Ouvert dans le navigateur EISEN','Im EISEN-Browser geöffnet'],
    ['URL de la imagen (https://...)','Image URL (https://...)','URL da imagem (https://...)','URL de l\'image (https://...)','Bild-URL (https://...)'],
    ['Aplicar URL','Apply URL','Aplicar URL','Appliquer l\'URL','URL anwenden'],
    ['También puedes arrastrar una imagen (o un enlace de imagen) sobre el escritorio o esta ventana.','You can also drag an image (or an image link) onto the desktop or this window.','Você também pode arrastar uma imagem (ou link de imagem) para a área de trabalho ou esta janela.','Vous pouvez aussi glisser une image (ou un lien d\'image) sur le bureau ou cette fenêtre.','Du kannst auch ein Bild (oder einen Bildlink) auf den Desktop oder dieses Fenster ziehen.'],
    ['La dirección de la imagen no es válida','The image address is not valid','O endereço da imagem não é válido','L\'adresse de l\'image n\'est pas valide','Die Bildadresse ist ungültig'],
    ['Ese archivo no es una imagen','That file is not an image','Esse arquivo não é uma imagem','Ce fichier n\'est pas une image','Diese Datei ist kein Bild'],
    ['Imagen grande: se usará solo en esta sesión','Large image: it will only be used in this session','Imagem grande: será usada só nesta sessão','Image volumineuse : utilisée uniquement pour cette session','Großes Bild: wird nur in dieser Sitzung verwendet'],
    ['Aplicaciones vinculadas','Linked apps','Aplicativos vinculados','Applications liées','Verknüpfte Apps'],
    ['Clave API de YouTube (opcional)','YouTube API key (optional)','Chave de API do YouTube (opcional)','Clé API YouTube (facultative)','YouTube-API-Schlüssel (optional)'],
    ['Spotify Client ID (opcional)','Spotify Client ID (optional)','Client ID do Spotify (opcional)','Client ID Spotify (facultatif)','Spotify-Client-ID (optional)'],
    ['Borrar reglas por sitio','Clear per-site rules','Apagar regras por site','Effacer les règles par site','Regeln pro Website löschen'],
    ['Reglas por sitio borradas','Per-site rules cleared','Regras por site apagadas','Règles par site effacées','Regeln pro Website gelöscht'],
    ['La clave de YouTube activa la búsqueda oficial. El Client ID de Spotify permite iniciar sesión, buscar y ver tus playlists: créalo en developer.spotify.com y registra como Redirect URI la dirección de arriba.','The YouTube key enables official search. The Spotify Client ID lets you log in, search and see your playlists: create it at developer.spotify.com and register the address above as the Redirect URI.','A chave do YouTube ativa a busca oficial. O Client ID do Spotify permite entrar, buscar e ver suas playlists: crie-o em developer.spotify.com e registre o endereço acima como Redirect URI.','La clé YouTube active la recherche officielle. Le Client ID Spotify permet de se connecter, rechercher et voir vos playlists : créez-le sur developer.spotify.com et enregistrez l\'adresse ci-dessus comme Redirect URI.','Der YouTube-Schlüssel aktiviert die offizielle Suche. Mit der Spotify-Client-ID kannst du dich anmelden, suchen und deine Playlists sehen: Erstelle sie auf developer.spotify.com und trage die obige Adresse als Redirect-URI ein.'],
    ['🔗 URL','🔗 URL','🔗 URL','🔗 URL','🔗 URL'],
    ['Pega la dirección (URL) del archivo:','Paste the file address (URL):','Cole o endereço (URL) do arquivo:','Collez l\'adresse (URL) du fichier :','Füge die Datei-Adresse (URL) ein:'],
    ['La dirección no es válida','The address is not valid','O endereço não é válido','L\'adresse n\'est pas valide','Die Adresse ist ungültig'],
    ['Descargando a EISEN…','Downloading into EISEN…','Baixando para o EISEN…','Téléchargement dans EISEN…','Wird in EISEN heruntergeladen…'],
    ['No se pudo descargar ese enlace','Could not download that link','Não foi possível baixar esse link','Impossible de télécharger ce lien','Dieser Link konnte nicht geladen werden'],
    ['Si la página no se ve bien, cambia el modo de carga:','If the page does not look right, change the loading mode:','Se a página não aparecer bem, mude o modo de carregamento:','Si la page ne s\'affiche pas bien, changez le mode de chargement :','Wenn die Seite nicht gut aussieht, ändere den Lademodus:'],
    ['Directo','Direct','Direto','Direct','Direkt'],
    ['Proxy','Proxy','Proxy','Proxy','Proxy'],
    ['Compatibilidad','Compatibility','Compatibilidade','Compatibilité','Kompatibilität'],
    ['Guía','Guide','Guia','Guide','Anleitung'],
    ['Ver guía de inicio','View welcome guide','Ver guia de início','Voir le guide de démarrage','Startanleitung ansehen'],
    ['Mis carpetas','My folders','Minhas pastas','Mes dossiers','Meine Ordner'],
    ['Crea tu primera carpeta con ＋ Carpeta','Create your first folder with ＋ Folder','Crie sua primeira pasta com ＋ Pasta','Créez votre premier dossier avec ＋ Dossier','Erstelle deinen ersten Ordner mit ＋ Ordner'],
    ['Esta carpeta está vacía. Pulsa ＋ Añadir.','This folder is empty. Press ＋ Add.','Esta pasta está vazia. Toque em ＋ Adicionar.','Ce dossier est vide. Appuyez sur ＋ Ajouter.','Dieser Ordner ist leer. Tippe auf ＋ Hinzufügen.'],
    ['＋ Añadir','＋ Add','＋ Adicionar','＋ Ajouter','＋ Hinzufügen'],
    ['Nombre de la carpeta:','Folder name:','Nome da pasta:','Nom du dossier :','Ordnername:'],
    ['¿Eliminar esta carpeta del Inicio?','Delete this folder from Start?','Excluir esta pasta do Início?','Supprimer ce dossier du menu Démarrer ?','Diesen Ordner aus dem Startmenü löschen?'],
    ['Buscar apps…','Search apps…','Buscar apps…','Rechercher des apps…','Apps suchen…'],
    ['Listo','Done','Pronto','Terminé','Fertig'],
    ['Ventanas e Inicio','Windows & Start','Janelas e Início','Fenêtres et Démarrer','Fenster & Start'],
    ['Restablecer tamaño de ventanas','Reset window sizes','Redefinir tamanho das janelas','Réinitialiser la taille des fenêtres','Fenstergrößen zurücksetzen'],
    ['Carpetas del Inicio','Start folders','Pastas do Início','Dossiers du menu Démarrer','Startmenü-Ordner'],
    ['Tamaño de ventanas restablecido','Window sizes reset','Tamanho das janelas redefinido','Taille des fenêtres réinitialisée','Fenstergrößen zurückgesetzt'],
    ['Arrastra los bordes o esquinas de cualquier ventana para hacerla más pequeña o más grande. Crea carpetas con tus apps en el menú Inicio con ＋ Carpeta.','Drag the edges or corners of any window to make it smaller or larger. Create folders with your apps in the Start menu with ＋ Folder.','Arraste as bordas ou cantos de qualquer janela para torná-la menor ou maior. Crie pastas com seus apps no menu Iniciar com ＋ Pasta.','Faites glisser les bords ou coins d\'une fenêtre pour la réduire ou l\'agrandir. Créez des dossiers d\'apps dans le menu Démarrer avec ＋ Dossier.','Ziehe an den Rändern oder Ecken eines Fensters, um es kleiner oder größer zu machen. Erstelle im Startmenü mit ＋ Ordner Ordner mit deinen Apps.'],
    ['Por seguridad este sitio no permite iniciar sesión dentro de otra página. Ábrelo en una pestaña real del navegador.','For security, this site does not allow sign-in inside another page. Open it in a real browser tab.','Por segurança, este site não permite login dentro de outra página. Abra-o em uma aba real do navegador.','Pour des raisons de sécurité, ce site n\'autorise pas la connexion dans une autre page. Ouvrez-le dans un vrai onglet du navigateur.','Aus Sicherheitsgründen erlaubt diese Seite keine Anmeldung innerhalb einer anderen Seite. Öffne sie in einem echten Browser-Tab.'],
    ['Intentar aquí de todos modos','Try here anyway','Tentar aqui mesmo assim','Essayer ici quand même','Trotzdem hier versuchen'],
    ['⏳ La página tarda en responder.','⏳ The page is taking too long to respond.','⏳ A página está demorando para responder.','⏳ La page met du temps à répondre.','⏳ Die Seite antwortet nur langsam.'],
    ['Reintentar','Retry','Tentar novamente','Réessayer','Erneut versuchen'],
    ['Tienda Apps','Apps Store','Loja de Apps','Boutique d\'apps','App-Store'],
    ['Archivos','Files','Arquivos','Fichiers','Dateien'],
    ['Videojuegos','Games','Jogos','Jeux vidéo','Spiele'],
    ['Navegador','Browser','Navegador','Navigateur','Browser'],
    ['Música','Music','Música','Musique','Musik'],
    ['Ajustes','Settings','Ajustes','Paramètres','Einstellungen'],
    ['Nuevo Documento Word','New Word Document','Novo documento Word','Nouveau document Word','Neues Word-Dokument'],
    ['Nueva Hoja Excel','New Excel Sheet','Nova planilha Excel','Nouvelle feuille Excel','Neue Excel-Tabelle'],
    ['Nueva Carpeta','New Folder','Nova pasta','Nouveau dossier','Neuer Ordner'],
    ['Cambiar fondo de pantalla','Change wallpaper','Mudar papel de parede','Changer le fond d\'écran','Hintergrund ändern'],
    ['Configuración del sistema','System settings','Configurações do sistema','Paramètres système','Systemeinstellungen'],
    ['EISEN Writer · Procesador de Textos','EISEN Writer · Word Processor','EISEN Writer · Processador de Texto','EISEN Writer · Traitement de texte','EISEN Writer · Textverarbeitung'],
    ['• Lista','• List','• Lista','• Liste','• Liste'],
    ['▦ Tabla','▦ Table','▦ Tabela','▦ Tableau','▦ Tabelle'],
    ['💾 Guardar','💾 Save','💾 Salvar','💾 Enregistrer','💾 Speichern'],
    ['Exportar PDF','Export PDF','Exportar PDF','Exporter en PDF','PDF exportieren'],
    ['Documento de Trabajo','Working Document','Documento de trabalho','Document de travail','Arbeitsdokument'],
    ['Bienvenido a','Welcome to','Bem-vindo ao','Bienvenue dans','Willkommen bei'],
    ['. Puedes redactar, dar formato y exportar tus tareas e informes directamente a PDF o a tus archivos de EISENKU OS.','. You can write, format and export your assignments and reports directly to PDF or to your EISENKU OS files.','. Você pode redigir, formatar e exportar suas tarefas e relatórios direto para PDF ou para seus arquivos do EISENKU OS.','. Vous pouvez rédiger, mettre en forme et exporter vos devoirs et rapports directement en PDF ou dans vos fichiers EISENKU OS.','. Du kannst deine Aufgaben und Berichte schreiben, formatieren und direkt als PDF oder in deine EISENKU-OS-Dateien exportieren.'],
    ['EISEN Sheets · Hojas de Cálculo','EISEN Sheets · Spreadsheets','EISEN Sheets · Planilhas','EISEN Sheets · Tableur','EISEN Sheets · Tabellenkalkulation'],
    ['＋ Fila','＋ Row','＋ Linha','＋ Ligne','＋ Zeile'],
    ['Σ Suma rápida','Σ Quick sum','Σ Soma rápida','Σ Somme rapide','Σ Schnellsumme'],
    ['⇅ Ordenar A-Z','⇅ Sort A-Z','⇅ Ordenar A-Z','⇅ Trier A-Z','⇅ A-Z sortieren'],
    ['📈 Gráfico','📈 Chart','📈 Gráfico','📈 Graphique','📈 Diagramm'],
    ['Exportar CSV','Export CSV','Exportar CSV','Exporter en CSV','CSV exportieren'],
    ['Escribe un valor o fórmula (=SUM(B1:B5))','Type a value or formula (=SUM(B1:B5))','Digite um valor ou fórmula (=SUM(B1:B5))','Saisissez une valeur ou une formule (=SUM(B1:B5))','Wert oder Formel eingeben (=SUM(B1:B5))'],
    ['📂 Cargar PDF del dispositivo','📂 Load PDF from device','📂 Carregar PDF do dispositivo','📂 Charger un PDF depuis l\'appareil','📂 PDF vom Gerät laden'],
    ['🖨️ Imprimir / Guardar','🖨️ Print / Save','🖨️ Imprimir / Salvar','🖨️ Imprimer / Enregistrer','🖨️ Drucken / Speichern'],
    ['Visor PDF','PDF Viewer','Visualizador de PDF','Lecteur PDF','PDF-Betrachter'],
    ['Selecciona un archivo PDF para visualizarlo aquí.','Select a PDF file to view it here.','Selecione um arquivo PDF para vê-lo aqui.','Sélectionnez un fichier PDF pour l\'afficher ici.','Wähle eine PDF-Datei aus, um sie hier anzuzeigen.'],
    ['EISEN Gaming Hub · Videojuegos Integrados','EISEN Gaming Hub · Built-in Games','EISEN Gaming Hub · Jogos integrados','EISEN Gaming Hub · Jeux intégrés','EISEN Gaming Hub · Integrierte Spiele'],
    ['🚀 Space Shooter 2D','🚀 Space Shooter 2D','🚀 Space Shooter 2D','🚀 Space Shooter 2D','🚀 Space Shooter 2D'],
    ['♟️ Ajedrez (IA / 2P)','♟️ Chess (AI / 2P)','♟️ Xadrez (IA / 2J)','♟️ Échecs (IA / 2J)','♟️ Schach (KI / 2P)'],
    ['Puntuación:','Score:','Pontuação:','Score :','Punkte:'],
    ['Vidas:','Lives:','Vidas:','Vies :','Leben:'],
    ['Récord:','Best:','Recorde:','Record :','Rekord:'],
    ['Iniciar / Reiniciar','Start / Restart','Iniciar / Reiniciar','Démarrer / Redémarrer','Start / Neustart'],
    ['Usa A/D o Flechas para moverte; Espacio o Click para disparar. Táctil: toca a los lados y centro.','Use A/D or arrow keys to move; Space or click to shoot. Touch: tap the sides and the center.','Use A/D ou setas para mover; Espaço ou clique para atirar. Toque: toque nas laterais e no centro.','Utilisez A/D ou les flèches pour bouger ; Espace ou clic pour tirer. Tactile : touchez les côtés et le centre.','Mit A/D oder Pfeiltasten bewegen; Leertaste oder Klick zum Schießen. Touch: Seiten und Mitte antippen.'],
    ['Turno: Blancas','Turn: White','Vez: Brancas','Tour : Blancs','Zug: Weiß'],
    ['Vs Computadora','Vs Computer','Contra o computador','Contre l\'ordinateur','Gegen Computer'],
    ['Dos Jugadores','Two Players','Dois jogadores','Deux joueurs','Zwei Spieler'],
    ['Nueva Partida','New Game','Nova partida','Nouvelle partie','Neues Spiel'],
    ['Puntos:','Points:','Pontos:','Points :','Punkte:'],
    ['Iniciar','Start','Iniciar','Démarrer','Starten'],
    ['EISEN Store · Catálogo de 200+ Aplicaciones','EISEN Store · Catalog of 200+ Apps','EISEN Store · Catálogo de 200+ aplicativos','EISEN Store · Catalogue de 200+ applications','EISEN Store · Katalog mit 200+ Apps'],
    ['Buscar entre las más de 200 aplicaciones...','Search among 200+ apps...','Buscar entre mais de 200 aplicativos...','Rechercher parmi plus de 200 applications...','In über 200 Apps suchen...'],
    ['＋ Añadir App Web','＋ Add Web App','＋ Adicionar app web','＋ Ajouter une app web','＋ Web-App hinzufügen'],
    ['Todas','All','Todas','Toutes','Alle'],
    ['Productividad','Productivity','Produtividade','Productivité','Produktivität'],
    ['Desarrollo','Development','Desenvolvimento','Développement','Entwicklung'],
    ['Creatividad','Creativity','Criatividade','Créativité','Kreativität'],
    ['Multimedia','Multimedia','Multimídia','Multimédia','Multimedia'],
    ['Ciencia y Educación','Science & Education','Ciência e Educação','Science et éducation','Wissenschaft & Bildung'],
    ['Ciencia','Science','Ciência','Science','Wissenschaft'],
    ['Juegos','Games','Jogos','Jeux','Spiele'],
    ['Sistema','System','Sistema','Système','System'],
    ['Explorador de Archivos · EISEN Files','File Explorer · EISEN Files','Explorador de Arquivos · EISEN Files','Explorateur de fichiers · EISEN Files','Datei-Explorer · EISEN Files'],
    ['🏠 Este Equipo','🏠 This Device','🏠 Este dispositivo','🏠 Cet appareil','🏠 Dieses Gerät'],
    ['📄 Documentos','📄 Documents','📄 Documentos','📄 Documents','📄 Dokumente'],
    ['🖼️ Imágenes','🖼️ Images','🖼️ Imagens','🖼️ Images','🖼️ Bilder'],
    ['🎵 Música','🎵 Music','🎵 Música','🎵 Musique','🎵 Musik'],
    ['⬇️ Descargas','⬇️ Downloads','⬇️ Downloads','⬇️ Téléchargements','⬇️ Downloads'],
    ['/Este Equipo/Documentos','/This Device/Documents','/Este dispositivo/Documentos','/Cet appareil/Documents','/Dieses Gerät/Dokumente'],
    ['＋ Archivo','＋ File','＋ Arquivo','＋ Fichier','＋ Datei'],
    ['＋ Carpeta','＋ Folder','＋ Pasta','＋ Dossier','＋ Ordner'],
    ['Importar','Import','Importar','Importer','Importieren'],
    ['Reproductor de Audio','Audio Player','Reprodutor de áudio','Lecteur audio','Audioplayer'],
    ['EISEN Synthwave (Sintetizador)','EISEN Synthwave (Synthesizer)','EISEN Synthwave (Sintetizador)','EISEN Synthwave (Synthétiseur)','EISEN Synthwave (Synthesizer)'],
    ['Sonido Procedimental WebAudio','Procedural WebAudio sound','Som procedural WebAudio','Son procédural WebAudio','Prozedurales WebAudio-Audio'],
    ['📂 Cargar mis canciones','📂 Load my songs','📂 Carregar minhas músicas','📂 Charger mes morceaux','📂 Meine Songs laden'],
    ['🌐 Navegador EISEN','🌐 EISEN Browser','🌐 Navegador EISEN','🌐 Navigateur EISEN','🌐 EISEN-Browser'],
    ['Atrás','Back','Voltar','Retour','Zurück'],
    ['Adelante','Forward','Avançar','Avancer','Vorwärts'],
    ['Recargar / detener','Reload / stop','Recarregar / parar','Actualiser / arrêter','Neu laden / stoppen'],
    ['Página de inicio','Home page','Página inicial','Page d\'accueil','Startseite'],
    ['Busca lo que quieras o escribe una dirección','Search anything or type an address','Pesquise qualquer coisa ou digite um endereço','Recherchez ce que vous voulez ou saisissez une adresse','Suche etwas oder gib eine Adresse ein'],
    ['Abrir esta página en una pestaña real de tu navegador','Open this page in a real tab of your browser','Abrir esta página em uma aba real do seu navegador','Ouvrir cette page dans un vrai onglet de votre navigateur','Diese Seite in einem echten Browser-Tab öffnen'],
    ['Cambiar de navegador','Switch browser','Trocar de navegador','Changer de navigateur','Browser wechseln'],
    ['Nueva pestaña','New tab','Nova aba','Nouvel onglet','Neuer Tab'],
    ['Cerrar pestaña','Close tab','Fechar aba','Fermer l\'onglet','Tab schließen'],
    ['Cerrar aviso','Dismiss notice','Fechar aviso','Fermer l\'avis','Hinweis schließen'],
    ['Documento','Document','Documento','Document','Dokument'],
    ['Modo compatibilidad: algunas webs complejas pueden verse incompletas.','Compatibility mode: some complex sites may look incomplete.','Modo de compatibilidade: alguns sites complexos podem aparecer incompletos.','Mode compatibilité : certains sites complexes peuvent s\'afficher de façon incomplète.','Kompatibilitätsmodus: Manche komplexe Seiten werden evtl. unvollständig angezeigt.'],
    ['Conexión directa: si sale "rechazó la conexión", el sitio no permite verse aquí.','Direct connection: if it says "refused to connect", the site does not allow being shown here.','Conexão direta: se aparecer "recusou a conexão", o site não permite ser exibido aqui.','Connexion directe : si « connexion refusée » s\'affiche, le site ne permet pas l\'affichage ici.','Direkte Verbindung: Wenn „Verbindung abgelehnt“ erscheint, erlaubt die Seite die Anzeige hier nicht.'],
    ['Probar conexión directa','Try direct connection','Tentar conexão direta','Essayer la connexion directe','Direkte Verbindung testen'],
    ['Usar modo compatibilidad','Use compatibility mode','Usar modo de compatibilidade','Utiliser le mode compatibilité','Kompatibilitätsmodus nutzen'],
    ['Abrir en pestaña real ↗','Open in real tab ↗','Abrir em aba real ↗','Ouvrir dans un vrai onglet ↗','In echtem Tab öffnen ↗'],
    ['Terminal Bash Simulator','Bash Terminal Simulator','Simulador de Terminal Bash','Simulateur de terminal Bash','Bash-Terminal-Simulator'],
    ['(c) EISEN Corp. Terminal segura simulada.','(c) EISEN Corp. Simulated secure terminal.','(c) EISEN Corp. Terminal segura simulado.','(c) EISEN Corp. Terminal sécurisé simulé.','(c) EISEN Corp. Simuliertes sicheres Terminal.'],
    ['Escribe \'help\' para ver la lista de comandos disponibles.','Type \'help\' to see the list of available commands.','Digite \'help\' para ver a lista de comandos disponíveis.','Tapez \'help\' pour voir la liste des commandes disponibles.','Gib \'help\' ein, um die verfügbaren Befehle zu sehen.'],
    ['Configuración de Windows','Windows Settings','Configurações do Windows','Paramètres Windows','Windows-Einstellungen'],
    ['Personalización & Aspecto','Personalization & Appearance','Personalização e aparência','Personnalisation et apparence','Personalisierung & Aussehen'],
    ['Tema General','General Theme','Tema geral','Thème général','Allgemeines Design'],
    ['Color de Acento','Accent Color','Cor de destaque','Couleur d\'accent','Akzentfarbe'],
    ['Fondo de Pantalla','Wallpaper','Papel de parede','Fond d\'écran','Hintergrundbild'],
    ['Windows 11 Flow (Azul)','Windows 11 Flow (Blue)','Windows 11 Flow (Azul)','Windows 11 Flow (Bleu)','Windows 11 Flow (Blau)'],
    ['Paisaje Aurora','Aurora Landscape','Paisagem Aurora','Paysage Aurore','Polarlicht-Landschaft'],
    ['Subir imagen','Upload image','Enviar imagem','Importer une image','Bild hochladen'],
    ['Idioma y archivos','Language & files','Idioma e arquivos','Langue et fichiers','Sprache & Dateien'],
    ['Idioma','Language','Idioma','Langue','Sprache'],
    ['Guardado de archivos','File saving','Salvamento de arquivos','Enregistrement des fichiers','Dateien speichern'],
    ['Descargar y guardar copia en EISEN','Download and keep a copy in EISEN','Baixar e guardar uma cópia no EISEN','Télécharger et garder une copie dans EISEN','Herunterladen und Kopie in EISEN behalten'],
    ['Solo descargar','Download only','Somente baixar','Télécharger seulement','Nur herunterladen'],
    ['Solo guardar dentro de EISEN (sin descargas)','Save only inside EISEN (no downloads)','Salvar só dentro do EISEN (sem downloads)','Enregistrer uniquement dans EISEN (sans téléchargement)','Nur in EISEN speichern (ohne Downloads)'],
    ['Si tu dispositivo no permite descargar, elige "Solo guardar dentro de EISEN": los archivos se guardan en Archivos › Descargas y los abres desde ahí.','If your device cannot download files, choose "Save only inside EISEN": files are kept in Files › Downloads and you open them from there.','Se o seu dispositivo não permite baixar, escolha "Salvar só dentro do EISEN": os arquivos ficam em Arquivos › Downloads e você os abre de lá.','Si votre appareil ne permet pas de télécharger, choisissez « Enregistrer uniquement dans EISEN » : les fichiers sont dans Fichiers › Téléchargements et s\'ouvrent à partir de là.','Wenn dein Gerät keine Downloads erlaubt, wähle „Nur in EISEN speichern“: Die Dateien liegen unter Dateien › Downloads und werden dort geöffnet.'],
    ['Navegador Web','Web Browser','Navegador web','Navigateur web','Webbrowser'],
    ['Navegador activo','Active browser','Navegador ativo','Navigateur actif','Aktiver Browser'],
    ['Modo de carga','Loading mode','Modo de carregamento','Mode de chargement','Lademodus'],
    ['Automático (recomendado)','Automatic (recommended)','Automático (recomendado)','Automatique (recommandé)','Automatisch (empfohlen)'],
    ['Solo proxy propio','Own proxy only','Somente proxy próprio','Proxy propre uniquement','Nur eigener Proxy'],
    ['Directo (sin proxy)','Direct (no proxy)','Direto (sem proxy)','Direct (sans proxy)','Direkt (ohne Proxy)'],
    ['Dirección del proxy (vacío = /proxy?url= incluido en el proyecto)','Proxy address (empty = built-in /proxy?url=)','Endereço do proxy (vazio = /proxy?url= incluído)','Adresse du proxy (vide = /proxy?url= inclus)','Proxy-Adresse (leer = integriertes /proxy?url=)'],
    ['Almacenamiento Local & Sistema','Local Storage & System','Armazenamento local e sistema','Stockage local et système','Lokaler Speicher & System'],
    ['Calculando uso de memoria...','Calculating memory usage...','Calculando uso de memória...','Calcul de l\'utilisation de la mémoire...','Speichernutzung wird berechnet...'],
    ['Exportar Respaldo JSON','Export JSON backup','Exportar backup JSON','Exporter la sauvegarde JSON','JSON-Backup exportieren'],
    ['Restaurar Copia','Restore backup','Restaurar cópia','Restaurer la copie','Backup wiederherstellen'],
    ['Restablecer Sistema','Reset system','Redefinir sistema','Réinitialiser le système','System zurücksetzen'],
    ['Escribe aquí para buscar apps o archivos...','Type here to search apps or files...','Digite aqui para buscar apps ou arquivos...','Tapez ici pour rechercher des apps ou fichiers...','Hier tippen, um Apps oder Dateien zu suchen...'],
    ['Anclado','Pinned','Fixados','Épinglé','Angeheftet'],
    ['Todas las apps ➔','All apps ➔','Todos os apps ➔','Toutes les apps ➔','Alle Apps ➔'],
    ['Recomendado','Recommended','Recomendado','Recommandé','Empfohlen'],
    ['Eisen Usuario','Eisen User','Usuário Eisen','Utilisateur Eisen','Eisen-Benutzer'],
    ['Reiniciar sesión','Restart session','Reiniciar sessão','Redémarrer la session','Sitzung neu starten'],
    ['Oscuro','Dark','Escuro','Sombre','Dunkel'],
    ['En reproducción','Now playing','Tocando agora','En lecture','Wiedergabe'],
    ['Widgets & Tiempo','Widgets & Weather','Widgets e clima','Widgets et météo','Widgets & Wetter'],
    ['Inicio','Start','Início','Démarrer','Start'],
    ['Buscar','Search','Pesquisar','Rechercher','Suchen'],
    ['Explorador de Archivos','File Explorer','Explorador de Arquivos','Explorateur de fichiers','Datei-Explorer'],
    ['Zona Gaming','Gaming Zone','Zona Gamer','Zone Gaming','Gaming-Zone'],
    ['Configuración rápida','Quick settings','Configurações rápidas','Paramètres rapides','Schnelleinstellungen'],
    ['Carpeta vacía','Empty folder','Pasta vazia','Dossier vide','Leerer Ordner'],
    ['Abrir','Open','Abrir','Ouvrir','Öffnen'],
    ['Descargar','Download','Baixar','Télécharger','Herunterladen'],
    ['Renombrar','Rename','Renomear','Renommer','Umbenennen'],
    ['Eliminar','Delete','Excluir','Supprimer','Löschen'],
    ['Nuevo nombre:','New name:','Novo nome:','Nouveau nom :','Neuer Name:'],
    ['¿Eliminar este archivo?','Delete this file?','Excluir este arquivo?','Supprimer ce fichier ?','Diese Datei löschen?'],
    ['Archivos importados a EISEN','Files imported into EISEN','Arquivos importados para o EISEN','Fichiers importés dans EISEN','Dateien in EISEN importiert'],
    ['No se pudo abrir este tipo de archivo aquí. Usa Descargar.','This file type cannot be opened here. Use Download.','Este tipo de arquivo não pode ser aberto aqui. Use Baixar.','Ce type de fichier ne peut pas être ouvert ici. Utilisez Télécharger.','Dieser Dateityp kann hier nicht geöffnet werden. Nutze Herunterladen.'],
    ['Buscador:','Search engine:','Buscador:','Moteur de recherche :','Suchmaschine:'],
    ['No se pudo cargar la página','The page could not be loaded','Não foi possível carregar a página','Impossible de charger la page','Die Seite konnte nicht geladen werden'],
    ['Abriendo:','Opening:','Abrindo:','Ouverture :','Öffne:'],
    ['Documento guardado localmente en EISENKU OS.','Document saved locally in EISENKU OS.','Documento salvo localmente no EISENKU OS.','Document enregistré localement dans EISENKU OS.','Dokument lokal in EISENKU OS gespeichert.'],
    ['El archivo no parece ser un respaldo válido de EISENKU OS.','This file does not look like a valid EISENKU OS backup.','O arquivo não parece ser um backup válido do EISENKU OS.','Ce fichier ne semble pas être une sauvegarde EISENKU OS valide.','Diese Datei scheint kein gültiges EISENKU-OS-Backup zu sein.'],
    ['El navegador no permite imprimir este PDF desde el visor integrado. Usa los controles del visor para guardarlo o imprimirlo.','The browser does not allow printing this PDF from the built-in viewer. Use the viewer controls to save or print it.','O navegador não permite imprimir este PDF no visualizador integrado. Use os controles do visualizador para salvar ou imprimir.','Le navigateur ne permet pas d\'imprimer ce PDF depuis la visionneuse intégrée. Utilisez ses commandes pour l\'enregistrer ou l\'imprimer.','Der Browser erlaubt kein Drucken dieser PDF im integrierten Betrachter. Nutze dessen Steuerung zum Speichern oder Drucken.'],
    ['Elige una imagen de hasta 4 MB para no llenar el almacenamiento local.','Choose an image up to 4 MB so local storage does not fill up.','Escolha uma imagem de até 4 MB para não encher o armazenamento local.','Choisissez une image de 4 Mo maximum pour ne pas saturer le stockage local.','Wähle ein Bild bis 4 MB, damit der lokale Speicher nicht voll wird.'],
    ['Escribe números en la columna A para crear un gráfico.','Type numbers in column A to create a chart.','Digite números na coluna A para criar um gráfico.','Saisissez des nombres dans la colonne A pour créer un graphique.','Gib Zahlen in Spalte A ein, um ein Diagramm zu erstellen.'],
    ['Este navegador no admite audio web.','This browser does not support web audio.','Este navegador não suporta áudio web.','Ce navigateur ne prend pas en charge l\'audio web.','Dieser Browser unterstützt kein Web-Audio.'],
    ['No se pudo reproducir este archivo de audio.','This audio file could not be played.','Não foi possível reproduzir este arquivo de áudio.','Impossible de lire ce fichier audio.','Diese Audiodatei konnte nicht abgespielt werden.'],
    ['Primero carga un PDF.','Load a PDF first.','Carregue um PDF primeiro.','Chargez d\'abord un PDF.','Lade zuerst eine PDF.'],
    ['Respaldo restaurado. La página se recargará.','Backup restored. The page will reload.','Backup restaurado. A página será recarregada.','Sauvegarde restaurée. La page va se recharger.','Backup wiederhergestellt. Die Seite wird neu geladen.'],
    ['Toca Reproducir para permitir el audio en el navegador.','Tap Play to allow audio in the browser.','Toque em Reproduzir para permitir o áudio no navegador.','Touchez Lecture pour autoriser l\'audio dans le navigateur.','Tippe auf Wiedergabe, um Audio im Browser zu erlauben.'],
    ['¿Reiniciar la interfaz de EISENKU OS?','Restart the EISENKU OS interface?','Reiniciar a interface do EISENKU OS?','Redémarrer l\'interface EISENKU OS ?','EISENKU-OS-Oberfläche neu starten?'],
    ['¿Restablecer EISENKU OS? Se borrarán los datos locales. Exporta un respaldo antes si quieres conservarlos.','Reset EISENKU OS? Local data will be erased. Export a backup first if you want to keep it.','Redefinir o EISENKU OS? Os dados locais serão apagados. Exporte um backup antes se quiser mantê-los.','Réinitialiser EISENKU OS ? Les données locales seront effacées. Exportez d\'abord une sauvegarde pour les conserver.','EISENKU OS zurücksetzen? Lokale Daten werden gelöscht. Exportiere vorher ein Backup, wenn du sie behalten willst.'],
    ['Nombre del nuevo archivo:','Name of the new file:','Nome do novo arquivo:','Nom du nouveau fichier :','Name der neuen Datei:'],
    ['Número de columnas:','Number of columns:','Número de colunas:','Nombre de colonnes :','Anzahl der Spalten:'],
    ['Número de filas:','Number of rows:','Número de linhas:','Nombre de lignes :','Anzahl der Zeilen:'],
    ['Promoción: escribe dama, torre, alfil o caballo','Promotion: type queen, rook, bishop or knight','Promoção: digite dama, torre, bispo ou cavalo','Promotion : saisissez dame, tour, fou ou cavalier','Umwandlung: Dame, Turm, Läufer oder Springer eingeben'],
    ['Organiza tareas, notas y documentos.','Organize tasks, notes and documents.','Organize tarefas, notas e documentos.','Organisez tâches, notes et documents.','Organisiere Aufgaben, Notizen und Dokumente.'],
    ['Crea, prueba o consulta código.','Create, test or look up code.','Crie, teste ou consulte código.','Créez, testez ou consultez du code.','Code erstellen, testen oder nachschlagen.'],
    ['Diseña gráficos, dibujos y prototipos.','Design graphics, drawings and prototypes.','Projete gráficos, desenhos e protótipos.','Concevez graphiques, dessins et prototypes.','Grafiken, Zeichnungen und Prototypen gestalten.'],
    ['Reproduce o edita contenido multimedia.','Play or edit multimedia content.','Reproduza ou edite conteúdo multimídia.','Lisez ou modifiez du contenu multimédia.','Multimedia-Inhalte abspielen oder bearbeiten.'],
    ['Abre un juego o servicio de entretenimiento.','Open a game or entertainment service.','Abra um jogo ou serviço de entretenimento.','Ouvrez un jeu ou un service de divertissement.','Ein Spiel oder einen Unterhaltungsdienst öffnen.'],
    ['Explora conceptos científicos.','Explore scientific concepts.','Explore conceitos científicos.','Explorez des concepts scientifiques.','Wissenschaftliche Konzepte erkunden.'],
    ['Utilidad auxiliar para el entorno web.','Helper utility for the web environment.','Utilitário auxiliar para o ambiente web.','Utilitaire d\'aide pour l\'environnement web.','Hilfsprogramm für die Web-Umgebung.'],
    ['Acceso rápido a una herramienta web.','Quick access to a web tool.','Acesso rápido a uma ferramenta web.','Accès rapide à un outil web.','Schnellzugriff auf ein Web-Tool.'],
    ['Crea páginas, notas y bases de datos.','Create pages, notes and databases.','Crie páginas, notas e bancos de dados.','Créez des pages, notes et bases de données.','Seiten, Notizen und Datenbanken erstellen.'],
    ['Organiza proyectos con tableros y tarjetas.','Organize projects with boards and cards.','Organize projetos com quadros e cartões.','Organisez vos projets avec tableaux et cartes.','Projekte mit Boards und Karten organisieren.'],
    ['Comunícate con equipos y canales.','Communicate with teams and channels.','Comunique-se com equipes e canais.','Communiquez avec équipes et canaux.','Mit Teams und Kanälen kommunizieren.'],
    ['Planifica proyectos y tareas compartidas.','Plan projects and shared tasks.','Planeje projetos e tarefas compartilhadas.','Planifiez projets et tâches partagées.','Projekte und gemeinsame Aufgaben planen.'],
    ['Crea listas de tareas y recordatorios.','Create to-do lists and reminders.','Crie listas de tarefas e lembretes.','Créez des listes de tâches et rappels.','To-do-Listen und Erinnerungen erstellen.'],
    ['Guarda notas y recortes web.','Save notes and web clippings.','Salve notas e recortes da web.','Enregistrez notes et extraits web.','Notizen und Web-Ausschnitte speichern.'],
    ['Conecta notas mediante enlaces.','Connect notes through links.','Conecte notas por meio de links.','Reliez vos notes par des liens.','Notizen über Links verbinden.'],
    ['Colabora en pizarras digitales.','Collaborate on digital whiteboards.','Colabore em quadros digitais.','Collaborez sur des tableaux blancs numériques.','Auf digitalen Whiteboards zusammenarbeiten.'],
    ['Organiza información en bases de datos.','Organize information in databases.','Organize informações em bancos de dados.','Organisez l\'information en bases de données.','Informationen in Datenbanken organisieren.'],
    ['Combina documentos con tablas y flujos.','Combine documents with tables and workflows.','Combine documentos com tabelas e fluxos.','Combinez documents, tableaux et flux.','Dokumente mit Tabellen und Abläufen kombinieren.'],
    ['Edita código desde el navegador.','Edit code from the browser.','Edite código pelo navegador.','Modifiez du code depuis le navigateur.','Code im Browser bearbeiten.'],
    ['Aloja repositorios y colabora en código.','Host repositories and collaborate on code.','Hospede repositórios e colabore em código.','Hébergez des dépôts et collaborez sur le code.','Repositories hosten und gemeinsam am Code arbeiten.'],
    ['Prueba HTML, CSS y JavaScript.','Try HTML, CSS and JavaScript.','Teste HTML, CSS e JavaScript.','Testez HTML, CSS et JavaScript.','HTML, CSS und JavaScript ausprobieren.'],
    ['Programa y ejecuta proyectos online.','Code and run projects online.','Programe e execute projetos online.','Programmez et exécutez des projets en ligne.','Projekte online programmieren und ausführen.'],
    ['Desarrolla aplicaciones web en el navegador.','Build web apps in the browser.','Desenvolva aplicativos web no navegador.','Développez des applications web dans le navigateur.','Web-Apps im Browser entwickeln.'],
    ['Prueba solicitudes a APIs.','Test API requests.','Teste requisições a APIs.','Testez des requêtes d\'API.','API-Anfragen testen.'],
    ['Visualiza y edita datos JSON.','View and edit JSON data.','Visualize e edite dados JSON.','Visualisez et modifiez des données JSON.','JSON-Daten ansehen und bearbeiten.'],
    ['Crea y prueba expresiones regulares.','Create and test regular expressions.','Crie e teste expressões regulares.','Créez et testez des expressions régulières.','Reguläre Ausdrücke erstellen und testen.'],
    ['Consulta documentación técnica.','Browse technical documentation.','Consulte documentação técnica.','Consultez la documentation technique.','Technische Dokumentation nachschlagen.'],
    ['Crea y comparte proyectos web.','Create and share web projects.','Crie e compartilhe projetos web.','Créez et partagez des projets web.','Web-Projekte erstellen und teilen.'],
    ['Experimenta con código web.','Experiment with web code.','Experimente com código web.','Expérimentez avec du code web.','Mit Web-Code experimentieren.'],
    ['Diseña interfaces y prototipos.','Design interfaces and prototypes.','Projete interfaces e protótipos.','Concevez interfaces et prototypes.','Oberflächen und Prototypen gestalten.'],
    ['Diseña presentaciones, carteles e imágenes.','Design presentations, posters and images.','Crie apresentações, cartazes e imagens.','Créez présentations, affiches et images.','Präsentationen, Poster und Bilder gestalten.'],
    ['Edita imágenes por capas.','Edit images with layers.','Edite imagens por camadas.','Modifiez des images par calques.','Bilder mit Ebenen bearbeiten.'],
    ['Dibuja diagramas a mano alzada.','Draw hand-drawn style diagrams.','Desenhe diagramas à mão livre.','Dessinez des diagrammes à main levée.','Diagramme freihändig zeichnen.'],
    ['Genera paletas de colores.','Generate color palettes.','Gere paletas de cores.','Générez des palettes de couleurs.','Farbpaletten erzeugen.'],
    ['Crea sprites y animaciones pixel art.','Create sprites and pixel-art animations.','Crie sprites e animações pixel art.','Créez sprites et animations pixel art.','Sprites und Pixel-Art-Animationen erstellen.'],
    ['Explora y edita escenas 3D.','Explore and edit 3D scenes.','Explore e edite cenas 3D.','Explorez et modifiez des scènes 3D.','3D-Szenen erkunden und bearbeiten.'],
    ['Crea y modifica gráficos SVG.','Create and edit SVG graphics.','Crie e modifique gráficos SVG.','Créez et modifiez des graphiques SVG.','SVG-Grafiken erstellen und bearbeiten.'],
    ['Escucha música en streaming.','Listen to streaming music.','Ouça música em streaming.','Écoutez de la musique en streaming.','Musik im Stream hören.'],
    ['Busca y reproduce videos.','Search and play videos.','Pesquise e reproduza vídeos.','Cherchez et lisez des vidéos.','Videos suchen und abspielen.'],
    ['Mira transmisiones en directo.','Watch live streams.','Assista a transmissões ao vivo.','Regardez des diffusions en direct.','Live-Streams ansehen.'],
    ['Descubre y comparte audio.','Discover and share audio.','Descubra e compartilhe áudio.','Découvrez et partagez de l\'audio.','Audio entdecken und teilen.'],
    ['Graba y mezcla música online.','Record and mix music online.','Grave e mixe música online.','Enregistrez et mixez de la musique en ligne.','Musik online aufnehmen und mischen.'],
    ['Edita audio y formas de onda.','Edit audio and waveforms.','Edite áudio e formas de onda.','Modifiez audio et formes d\'onde.','Audio und Wellenformen bearbeiten.'],
    ['Juega ajedrez y resuelve problemas.','Play chess and solve puzzles.','Jogue xadrez e resolva problemas.','Jouez aux échecs et résolvez des problèmes.','Schach spielen und Aufgaben lösen.'],
    ['Juega ajedrez gratis online.','Play chess online for free.','Jogue xadrez grátis online.','Jouez gratuitement aux échecs en ligne.','Kostenlos online Schach spielen.'],
    ['Accede a un juego de disparos web.','Access a web shooter game.','Acesse um jogo de tiro web.','Accédez à un jeu de tir web.','Zugriff auf ein Web-Shooter-Spiel.'],
    ['Adivina lugares usando imágenes de mapas.','Guess places using map imagery.','Adivinhe lugares usando imagens de mapas.','Devinez des lieux à partir d\'images de cartes.','Orte anhand von Kartenbildern erraten.'],
    ['Navegador general con buscador Google.','General browser with Google search.','Navegador geral com busca do Google.','Navigateur général avec recherche Google.','Allgemeiner Browser mit Google-Suche.'],
    ['Búsquedas con DuckDuckGo, sin rastreo.','DuckDuckGo searches, no tracking.','Buscas com DuckDuckGo, sem rastreamento.','Recherches DuckDuckGo, sans pistage.','DuckDuckGo-Suche ohne Tracking.'],
    ['Búsquedas con Bing.','Bing searches.','Buscas com Bing.','Recherches avec Bing.','Bing-Suche.']
  ];
  // Mensajes con texto variable al final (prefijos)
  const PFX = [
    ['Juego terminado. Puntos: ','Game over. Points: ','Fim de jogo. Pontos: ','Partie terminée. Points : ','Spiel vorbei. Punkte: '],
    ['¡Fin de la partida! Puntuación final: ','Game over! Final score: ','Fim da partida! Pontuação final: ','Fin de la partie ! Score final : ','Spielende! Endpunktzahl: '],
    ['Abriendo: ','Opening: ','Abrindo: ','Ouverture : ','Öffne: '],
    ['Guardado en Archivos › Descargas: ','Saved in Files › Downloads: ','Salvo em Arquivos › Downloads: ','Enregistré dans Fichiers › Téléchargements : ','Gespeichert in Dateien › Downloads: '],
    ['Guardado en Archivos: ','Saved in Files: ','Salvo em Arquivos: ','Enregistré dans Fichiers : ','Gespeichert in Dateien: ']
  ];
  const IDX = { en: 1, pt: 2, fr: 3, de: 4 };
  const D = {}, PD = {};
  Object.keys(IDX).forEach(l => { D[l] = {}; PD[l] = []; R.forEach(r => { D[l][r[0]] = r[IDX[l]]; }); PFX.forEach(r => PD[l].push([r[0], r[IDX[l]]])); });
  const norm = s => s.trim().replace(/\s+/g, ' ');
  let lang = 'es';
  const tr = s => {
    if (lang === 'es' || typeof s !== 'string') return s;
    const k = norm(s); if (D[lang] && D[lang][k]) return D[lang][k];
    if (PD[lang]) for (const [a, b] of PD[lang]) if (s.startsWith(a)) return b + s.slice(a.length);
    // 9.0: paquetes de idioma adicionales y textos de respaldo (js/os9/i18n9.js)
    const X = window.EISEN_I18N_X; if (X) { const r = X(k, lang); if (r != null) return r; }
    return s;
  };
  const orig = new WeakMap(), setv = new WeakMap(), ATTR = ['title', 'placeholder', 'aria-label'];
  function textNode(n) {
    const cur = n.nodeValue; if (!cur || !cur.trim()) return;
    let o = orig.get(n);
    if (o === undefined || setv.get(n) !== cur) { o = cur; orig.set(n, o); }
    const t = lang === 'es' ? null : tr(o.trim());
    const out = t && t !== o.trim() ? o.replace(o.trim(), () => t) : o;
    if (out !== cur) n.nodeValue = out;
    setv.set(n, out);
  }
  function attrs(e) {
    if (!e.getAttribute) return;
    e.__io = e.__io || {}; e.__is = e.__is || {};
    ATTR.forEach(a => {
      if (!e.hasAttribute(a)) return;
      const cur = e.getAttribute(a);
      if (e.__io[a] === undefined || e.__is[a] !== cur) e.__io[a] = cur;
      const t = lang === 'es' ? e.__io[a] : tr(e.__io[a]);
      if (t !== cur) e.setAttribute(a, t);
      e.__is[a] = t;
    });
  }
  function walk(root) {
    if (root.nodeType === 3) { textNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (/^(SCRIPT|STYLE|IFRAME)$/.test(root.tagName)) return; attrs(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeType === 1 && /^(SCRIPT|STYLE|IFRAME)$/.test(n.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
  }
  let obs = null;
  function start() {
    if (obs) return;
    obs = new MutationObserver(ms => {
      if (lang === 'es') return;
      ms.forEach(m => {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes') attrs(m.target);
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  function setLang(l) {
    lang = LANGS[l] ? l : 'es';
    try { localStorage.setItem('eisen_lang', JSON.stringify(lang)); } catch { /* ignorar */ }
    document.documentElement.lang = lang;
    walk(document.body);
    start();
    const sel = document.getElementById('cfg-lang'); if (sel) sel.value = lang;
  }
  // alert / confirm / prompt traducidos
  const oa = window.alert.bind(window), oc = window.confirm.bind(window), op = window.prompt.bind(window);
  window.alert = m => oa(tr(String(m)));
  window.confirm = m => oc(tr(String(m)));
  window.prompt = (m, d) => op(tr(String(m)), d);
  window.EISEN_I18N = { tr, setLang, langs: LANGS, get lang() { return lang; }, dict: l => D[l] || null, walk: () => walk(document.body) };

  const sel = document.getElementById('cfg-lang');
  if (sel) { sel.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''); sel.onchange = e => setLang(e.target.value); }
  let saved = 'es'; try { saved = JSON.parse(localStorage.getItem('eisen_lang')) || 'es'; } catch { /* ignorar */ }
  if (saved !== 'es') setTimeout(() => setLang(saved), 0); else if (sel) sel.value = 'es';
  start();
})();
