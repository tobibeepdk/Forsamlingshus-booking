# Fejl og afprøvede løsninger

## 2026-10-03 · version 2.5.0 · fundet før udgivelse

### Underskrift forsvandt ved genåbning af kontrakt

Symptom: Felterne kom tilbage, men bookingvalget og den gemte håndskrift blev ryddet.
Årsag: En native HTML-select accepterer kun en værdi, hvis dens option allerede findes. Den gemte booking blev valgt, før listen var opbygget. Sikkerheden er høj: både browserforløbet og en kontrol med native select-semantik reproducerede tabet.
Afprøvet løsning: Opbyg bookinglisten før gendannelse af valg og underskrift. Bevar kontrollen af, om aftalen er ændret.
Forebyggelse: Testformularens select skal afvise ukendte optionværdier. Test betalinger separat fra ændringer i aftalen.
Bevis: `tests/contract-ui.test.cjs`, prøverne om native select, ændret booking og bevaret underskrift.

### Samtidige vinduer kunne miste data eller kladder

Symptom: Et gammelt bookingvindue kunne rulle en nyere depositumbetaling tilbage; blacklistindsendelse kunne slette et andet vindues kladde; forsinket backup kunne erstatte en nyere kopi.
Årsag: Baseline for den åbne formular blev ikke bevaret, sletning sammenlignede ikke kladder, og backup antog kun én aktiv kø. Sikkerheden er høj: Node-prøver reproducerede formularfejlene, og rigtig IndexedDB reproducerede to-kø-fejlen.
Afprøvet løsning: Kontroller bookingens baseline fra åbningen før gemning, afvis fremmede blacklistkladder, og genlæs den delte tilstand inde i backuptransaktionen. Begræns også historik ved uændret seneste tilstand.
Forebyggelse og bevis: Konfliktprøver i `tests/app.test.cjs` og to-manager-/historikprøver i `tests/backup-browser.html`.

### En kopi med kun standardpriser kunne erstattes af tomme standarddata

Årsag: Beskyttelsen mod manglende primærdata betragtede kun poster og kladder som indhold.
Afprøvet løsning: Registrer, om en kopi oprindeligt havde en primær database. Hvis den senere mangler, bevares enhver tidligere kopi, også en kopi med kun priser. En helt ny app uden database kan stadig gemme en ufærdig kladde.
Sikkerhed og bevis: Høj; prøven med brugerdefinerede priser i `tests/backup-browser.html` fejlede før rettelsen og bestod efter.

### En ny fane kunne behandle en aktiv gendannelse som et nedbrud

Symptom: Gendannelse kunne rapportere succes med den gamle database og nye kladder blandet.
Årsag: Startup-recovery rullede en journal tilbage, mens et andet vindue stadig skrev den nye tilstand.
Afprøvet løsning: Gendannelse og recovery deler en Web Lock. Opstart venter på recovery, og gemninger/backup afviser en aktiv journal. Baseline kontrolleres igen ved selve commit. En nylig journal beskyttes konservativt i browsere uden Web Locks.
Sikkerhed og bevis: Høj; prøven i `tests/backup-browser.html` reproducerede fejlen før rettelsen og består med rigtig Web Locks. Node-prøven kontrollerer, at backup ikke læser en ufærdig gendannelse.

## Testmiljø · ikke en produktionsfejl

En lokal testserver kunne ikke binde porten i sandboxen. Browseren viste derefter en tidligere appcache fra en anden testserver. Versionen i den synlige side afslørede fejlen; den nye implementering var ikke testet i dette forløb.
Afprøvet løsning: Start en godkendt lokal server på en særskilt port, kontroller sidens version, og brug en frisk origin eller cacheversion ved ændret kilde.
Forebyggelse: En simulering eller en ældre service worker-cache tæller ikke som en gennemspillet test af den nye kode. Gem testscope, version og faktisk resultat ved hver udgivelse.

### Browser-testens fill sendte input, men udløste ikke native change ved blur

Symptom: Priskladden blev gemt, mens den anvendte standardpris stadig var gammel i prøven. Det skyldtes testværktøjets indtastning; ingen produktionskode blev ændret. Native ArrowUp efterfulgt af Tab udløste change og viste Standardpriser gemt automatisk.
Bevis: Faktisk iPad-layout på version2.5.0, lokal frisk origin; efter keyboard-handlingen indgik den ændrede pris i backuphistorikken. Brug native keyboardhændelser til change/blur-forløb og kontroller den anvendte pris separat fra kladden.


## v2.6.0 · iPad-opstart og native grænser (rettet før udgivelse)

**Symptom:** Native-opstart læser backupfilen asynkront. En baggrundshændelse kunne oprette en tom priskladde før læsningen og dermed få næste åbning til at springe filgendannelse over. **Årsag/sikkerhed:** Formularers livscyklusgemning var aktiv før native recovery; høj sikkerhed ud fra konkrete write-entrypoints. **Løsning:** `nativeReady` blokerer alle kladdegemninger og native backup, indtil gendannelse er afsluttet. Formularer er `inert` under læsning og genprøvning. Kontrakteditoren afventer `HjortAppReady`. **Forebyggelse:** Vent også på recovery ved native baggrundsgemning. **Bevis:** `tests/app.test.cjs` kontrollerer tomt lager under ventende `readLatest`, efter fejlsvar og efter `saveOpenForms`; den eksisterende fil gendannes før første backup.

**Symptom:** Kontrakttests kunne ikke dele de genererede filer efter native-integrationen. **Årsag/sikkerhed:** Det selvstændige VM-testmiljø manglede appens nye `nativeApp`/`nativeReady`-globals; høj. Dette var en testmiljøfejl. **Løsning:** VM-fixturen følger den faktiske bootkontrakt; produktionskode ændres ikke for fixturefejlen. **Bevis:** 78 målrettede app-, kontrakt- og SW-tests bestod, inklusive actual PDF-felter og håndskrift gennem native delingsgrænsen.

**Symptom:** Native filgendannelse kunne behandle en eksisterende fil med ugyldig UTF-8 som en manglende fil. Native `confirm()` manglede desuden og kunne afvise import eller kassering uden en dialog. **Årsag/sikkerhed:** Optional tekstdekodning og manglende WKUIDelegate; høj, fundet ved source-review før udgivelse. **Løsning:** Afvis beskadiget eksisterende fil uden overskrivning; vis UIKit-bekræftelse med én completion. **Forebyggelse/bevis:** Native filtests og den konkrete simulatorprøve dokumenteres separat i `native/fejl-og-loesninger.md` og udgivelsens QA-filer.


## 2026-10-04 · v2.6.1 · miljø og tilbageknapper

### iCloud-pladsholdere blokerede læsning og gav tomme testkopier

Symptom: Git, Xcode og almindelige filkopier stod stille under læsning i Documents. En kopi af en testfil havde 0 bytes og gav en misvisende Node-rapport om én bestået testfil uden de forventede tests.
Årsag/sikkerhed: `ls -lO` viste `compressed,dataless`; procesprøver placerede Xcode i NSFileCoordinator. Høj sikkerhed for filadgangsproblemet; ingen dokumenteret fejl i appens runtime. En læser kunne se en tom mellemliggende fil fra en forsinket skriver.
Afprøvet løsning: Materialisér de konkrete projektfiler med `/usr/bin/brctl download /absolut/filsti`, og kopier derefter til en særskilt mappe i `/private/tmp`. Kontroller nonzero-størrelse, hash og forventet testantal før bygning eller upload. Kommandoen gennemførte, og de tidligere ventende læsninger kunne fortsætte.
Forebyggelse: Brug den fungerende runtime og en komplet midlertidig kildekopi. Ret ikke produktionskode for en filadgangs- eller testværktøjsfejl. En tom testfil er ikke et bestået produktforløb.
Bevis: `outputs/hjortemosen-v2.6.1/qa/source-verification.json` og `qa/node-tests.txt` uden for repository-kopien dokumenterer de præcise kildefiler og 117 faktisk gennemførte Node-tests. Native compile-, disk- og UI-testscope dokumenteres særskilt.

### Tilbage gemmer kladden og undgår en fastlåst navigation

Ændring: Seks tilbageknapper på undersider går til forrige appside; gentagne tryk på samme fane opretter ingen dubletter. En tom historik fører til Overblik. Åbne formularer gemmes før navigation og nulstilles ikke.
Bevis/sikkerhed: To målrettede tests i `tests/app.test.cjs` kontrollerer bevaret navn, gemt kladde, uændrede bookinger, dubletter og fallback. Alle 117 Node-tests bestod for version 2.6.1. Kodegennemgang fandt ingen konkrete tilbagefejl. Dette beviser VM-adfærd, ikke et fysisk iPad-forløb.

Offentlig browserkontrol: GitHub Pages-run `37177169918` gennemførte commit `8ee05966c44d1dd600ba43d9d11499b5ed9f0870`. Appen blev opdateret fra 2.5.0 via Opdatér app med bevaret kladde. Dokumenter → Tilbage → Kalender → Tilbage → Overblik virkede. 15 synlige bookingfelter var identiske før og efter Tilbage og Fortsæt kladden. Ingen browserfejl eller advarsler blev registreret. Bevis: udgivelsens `qa/publication-and-back.json` og `qa/back-live.png`; dette var browsernavigation, ikke en fysisk iPad.

### Pakkekontrol fangede en udeladt versionsopdatering i testkode

Symptom: Kildepakkens hashkontrol stoppede på `tests/sw.test.cjs`, fordi den offentliggjorte test stadig brugte 2.5.0, mens den faktisk afprøvede testkopi brugte 2.6.1. Årsag/sikkerhed: Testfilen var ikke med i den første testupload; høj sikkerhed ud fra blob-hash og diff. Dette var en udgivelsesprocesfejl, ikke en ny fejl i appkoden.
Afprøvet løsning: Upload den allerede beståede SW-test med 2.6.1-henvisninger og native-bridge.js. Sammenlign derefter alle 21 webassets og ni testfiler i kildepakken med GitHubs blob-hashes. Ingen runtime-kode blev ændret, og uændrede beståede tests blev ikke kørt igen.
Forebyggelse/bevis: Pakning afviser enhver kilde, der afviger fra den udgivne version. Den sidste testopdatering ligger i commit `834cc8147211870c4736bba3a3da9675539259db`; kildepakken har filmanifest og integritetskontrol.

### Simulatorens testmanager kunne blokere før native UI-testen

Symptom: Native UI-testbuildet kompilerede, men første teststart stod stille i testmanagerd/xpcproxy. Årsag/sikkerhed: Procesprøver viste ventende dyld_shared_cache/mmap i testværktøjets OS-proces før testforløbet; høj sikkerhed for placeringen af opstartsblokeringen, den underliggende OS-årsag er ukendt. Der er ikke dokumenteret en runtime-fejl i Hjortemosen ud fra dette.
Afprøvet håndtering: Gem procesprøver og log, genstart kun den dedikerede QA-simulator uden at slette data, og afgræns én genprøvning. Beståede diskprøver og compile-log er separate beviser; de tæller ikke som et gennemført WKWebView/UI-forløb. Ret ikke produktionskode for testmanagerens opstart.
Bevis: `qa/native/testmanager-startup-sample.txt`, `qa/native/ui-test-startup-sample.txt` og de særskilte build-/testlogs i udgivelsen 2.6.1. Den ene genprøvning ramte samme OS-blokering før app-testen: 0 gennemførte UI-tests. Containerinspektion fandt ingen Hjortemosen-appcontainer, så der rapporteres ingen rigtig QA-backupfil eller native screenshot. Den dedikerede simulator blev lukket uden datasletning. Native QA-status skelner dette fra de 18 beståede diskprøver og de to beståede builds.


## 2026-10-07 · webversion 2.6.2 · manuel e-mail fra Hotmail

### Delingsknappen blev opfattet som en afsendelse

Symptom: Brugeren fandt ingen kontraktmail i Hotmails Sendt post efter brug af appens deling.
Årsag/sikkerhed: Den eksisterende kode kaldte alene systemets fildeling. Den indeholdt ingen mailafsendelse eller kontrol af en mailbox. Høj sikkerhed for denne kodeadfærd; brugerens konkrete mailkonto og eventuelle Udbakke er ikke inspiceret.
Afprøvet løsning: Brugeren valgte selv at trykke Send i Outlook/Mail. Den nye knap Send via Outlook/Mail deler den faktisk genererede PDF/Word-fil og kræver en gyldig modtageradresse. Vejledningen kræver modtager, Hotmail i Fra, vedhæftning og manuelt Send; en genvej åbner Hotmails Sendt post. Uden fildeling hentes den udfyldte fil og en mailto-kladde kræver manuel vedhæftning. Ved delingsfejl bevares filen og Gem fil kan bruges. Annullering meldes aldrig som afsendelse. Ændring af kontrakten fjerner den gamle fil og mailto-kladde; en ventende deling overskriver ikke nyere status.
Forebyggelse: Et afsluttet share-kald er ikke bevis for en sendt e-mail. Mailto kan ikke vedhæfte filen. Clipboard-afventning før navigator.share kan miste Safaris brugeraktivering, så fildelingen starter direkte fra trykket.
Bevis/scope: 125 faktiske Node-tests bestod i /private/tmp/hjortemosen-email-20261007, heraf otte nye e-mailprøver med reelt udfyldte PDF/Word-bytes, PDF-underskriftsbillede, validering, annullering, fejl, native bridge og samtidige ændringer. Browseren på en frisk lokal origin viste 2.6.2, lavede en testkontrakt, afviste manglende e-mail og gendannede felter efter genåbning; ingen consolefejl/advarsler. Web Share blev startet, men hostens systemdelingsforløb kunne ikke gennemspilles af browserværktøjet. Ingen e-mail blev sendt, ingen Hotmail-mailbox blev kontrolleret, og ingen fysisk iPad blev testet. Den tidligere native kildepakke forbliver 2.6.1.

### Test- og cachemiljø blev afgrænset fra mailfunktionen

En negativ tekstassertion ramte delstrengen “er Sendt” i “derefter Sendt post”. Testens ordgrænser blev rettet; produktionskode blev ikke ændret for dette fixtureproblem. En tidligere lokal origin viste cacheversion 2.4.0. Prøven blev flyttet til en frisk port og synlig version 2.6.2 blev kontrolleret før fortsættelse. Den første serverstart var blokeret af sandboxen; den godkendte localhost-server startede. Disse hændelser er test-/miljøproblemer og dokumenterer ingen ny runtime-fejl i appen.


## 2026-10-07 · webversion 2.6.3 · kalender-PDF og bestyrelsestekst

### Udskriv / PDF reagerede ikke på brugerens enhed

Symptom: Brugeren viste kalenderen i den installerede app og oplyste, at Udskriv / PDF ikke gjorde noget. Den tidligere webknap kaldte alene window.print(). Årsag/sikkerhed: Høj sikkerhed for den tidligere kodeadfærd; en begrænsning i den konkrete browser-/PWA-udskriftsmenu er sandsynlig, men den præcise iOS-årsag og en universel platformfejl er ikke dokumenteret.
Afprøvet løsning: Webknappen genererer nu faktiske PDF-bytes offline med en A4-kalender og en komplet bookingliste. Et synligt panel tilbyder Åbn PDF, Hent PDF og Del / Gem PDF. Fildeling starter fra et nyt brugertryk, efter filen er klar. Direkte browserudskrivning og native udskriftsbro bevares. Ændret måned eller booking revokerer den gamle fil; forsinket generering kan ikke gøre en gammel måned klar. Delingsannullering bevarer filen og meldes aldrig som en udskrift.
Forebyggelse: Knyt filen til et snapshot af måned og bookinger. Afprøv faktiske PDF-bytes, betalingsstatus inklusive depositum, dubletter, skuddag, seks kalenderuger og lange tekstfelter. En afsluttet deling er ikke bevis for gemning eller fysisk udskrivning.
Bevis/scope: 139 faktiske Node-tests bestod i /private/tmp/hjortemosen-print-20261007, heraf otte rendererprøver og seks nye UI-prøver. Real-PDF-prøver parser indhold og sidegrænser; en særskilt syntetisk PDF med 81 bookinger og 15 sider blev genereret fra den aktuelle renderer, og side 1, 2 og 15 blev renderet og visuelt kontrolleret. Browseren på friske lokale origins viste version 2.6.3 og et klart PDF-panel efter et faktisk tryk. Endeligt layout ved 390×844 og 820×1180 havde ingen vandret overflow; alle PDF-panelhandlinger er mindst 48 px høje. Ingen consolefejl/advarsler blev registreret i den endelige lokale browserprøve. Dette beviser ikke en fysisk iPad-udskrift.

### Fund før udgivelse og særskilte testbegrænsninger

Kodegennemgang fandt en ventende fejlet PDF-generering, der kunne efterlade teksten Laver kalender-PDF efter et månedsskift. En ny regressionstest fejlede før rettelsen og bestod efter; knappen aktiveres igen med en tydelig besked om den ændrede kalender. Rendererens dubletindikator kunne overlappe betalingsstatus i en seksugers måned; den blev rettet og en PDF-geometritest kontrollerer mindst 2 pt afstand. Visuel mobilkontrol fandt, at den nye tredje værktøjsknap kunne stikke ud over skærmkanten; max-width:100% lader den bryde til en ny linje. Disse fejl blev fundet og rettet før udgivelse.

De første fire integrationstests med rigtige PDF-bytes fejlede, fordi VM-fixturen indsprøjtede hostens Array/Object-konstruktører, mens literalerne tilhørte VM-konteksten. PDFLibs instanceof-validering afviste derfor gyldige side-/farveobjekter. Sikkerheden er høj ud fra fejlsvar og en målrettet fixtureprøve. Array/Object bevares nu i samme VM-realm, mens bytekonstruktører deles til læsning af filen; produktionskoden blev ikke ændret for denne testfejl.

Browserværktøjets Hent PDF/downloadMedia-forløb gav timeout. Åbn PDF blev derefter afvist af browserens sikkerhedspolitik; den blokerede navigation blev ikke omgået. PDF-panelgenerering og read-only linkkontrol er browserbevis; de uafhængigt genererede PDF-bytes og renderinger er særskilt bevis. Ingen systemdeling, filgemning eller fysisk udskrivning på iPad/iPhone blev gennemspillet. Den tidligere native kildepakke forbliver version 2.6.1.

### Fjernet forklarende tekst uden ændret betaling

Brugeren bad om at slette Bestyrelsesmedlemmer har gratis leje. Kun denne sætning er fjernet fra formularen. Pris er fortsat 0 kr. og depositum 500 kr. Browserens faktiske bestyrelsesvalg viste Depositum: 500 kr., readonly pris 0 og readonly depositum 500; den slettede sætning findes ikke i bookingformularen. Ingen booking blev oprettet i browserprøven.


## 2026-10-07 · webversion 2.6.4 · manuel Gmail og modtaget post

Brugerønske og valg: Appen skal bruges sammen med Gmail til at modtage og sende post. Brugeren valgte at åbne Gmail på iPad, selv læse post og selv trykke Send. Dette er en udvidelse af det eksisterende mailforløb, ikke en dokumenteret ny afsendelsesfejl.

Tidligere begrænsning/årsag: Knap, vejledning og status nævnte kun Outlook/Mail og Hotmail. Delingskoden var allerede fælles for iPadens mailapps. Høj sikkerhed ud fra den udgivne 2.6.3-kilde; ingen Gmailkonto eller konkret Gmail-installation blev inspiceret.

Afprøvet løsning: Send via Gmail deler den allerede genererede udfyldte PDF/Word-fil med eventuel underskrift. Vejledningen kræver Gmail i delingsmenuen, korrekt Googlekonto i Fra, modtager, vedhæftning og eget tryk på Send. Hvis Gmail ikke vises, kan filen gemmes og vedhæftes fra Filer i Gmail. Outlook/Mail kan stadig vælges i delingsmenuen. Mailto-fallback forklarer, at iPadens standardmailapp åbnes uden vedhæftning; Gmail skal vælges som standard eller åbnes manuelt. Annullering, fejl og gamle filer behandles som før uden nogen sendt-bekræftelse.

Modtaget post: Dokumenter har Gmail-genveje, som åbner https://mail.google.com/ i browseren. Brugeren vælger sin konto via profilbilledet og Indbakke eller Sendt. Der bruges ingen udokumenteret garanti om en bestemt konto eller mappe. Selve postlæsningen foregår i Gmail. Bookingappen har ingen OAuth-adgang eller indbygget indbakke; den kan hverken vælge systemets delingsmål eller kontrollere Gmail-afsendelse.

Forebyggelse og kilder: En afsluttet fildeling tæller ikke som sendt mail. Kontoen skal kontrolleres både før afsendelse og i Sendt. Start delingen direkte fra brugertrykket med den færdige fil; afvent ikke udklipsholderen først. Googles iPad-vejledning dokumenterer vedhæftning fra Filer: https://support.google.com/mail/answer/6584?hl=da&co=GENIE.Platform%3DiOS . Standardmailapp er særskilt: https://support.google.com/accounts/answer/16262222?hl=da . Flere konti kan give en anden standardkonto: https://support.google.com/accounts/answer/1721977?hl=da .

Bevis/scope: Fire Gmail-assertioner fejlede før de ændrede vejledningstekster; derefter bestod alle 26 målrettede kontrakt-UI-tests. To nye tests kontrollerer faktisk udfyldt og signeret Word ZIP med identiske PNG-signaturbytes samt en fejlet ventende deling, der ikke må gendanne en gammel kladdegenvej. PDF-tests kontrollerer faktisk fil, felter og underskriftsbillede. Alle 141 Node-tests bestod i /private/tmp/hjortemosen-gmail-20261007. Den lokale browser på en frisk origin viste 2.6.4, Gmail-genveje og Send via Gmail efter generering af en syntetisk kontrakt; manglende modtager blev afvist med filen bevaret. Layout ved 820×1180 og 390×844 havde ingen vandret overflow; Gmail-genveje var mindst 48 px høje. Ingen consolefejl/advarsler blev registreret.

Begrænsninger: Filtransport er testet gennem simulerede share/native-grænser med reelle kontraktbytes. Der blev ikke sendt mail, læst en mailbox eller gennemspillet Gmail-systemdeling på en fysisk iPad. Eksterne Gmail-links blev kun kontrolleret i DOM mod den officielle generiske destination. Den tidligere blokerede blob-PDF-navigation blev ikke forsøgt igen. Native kildepakken forbliver 2.6.1; ændringen udgives i webappen.

## 2026-10-07 · webversion 2.6.5 · SMS-genvej til Beskeder

Brugerønske: Appen skal kunne sende SMS eller åbne et vindue, hvor brugeren selv sender. Den tidligere knap Del via Beskeder m.m. var fildeling, ikke en direkte SMS-genvej. Dette er en ny mulighed; der er ikke dokumenteret en fejl i en konkret SMS-afsendelse.

Afprøvet løsning: Åbn SMS/Beskeder findes ved kontraktens telefonnummer og ved den færdige fil. Den første kan bruges med kun et telefonnummer, uden en genereret kontrakt. Begge links følger det aktuelle felt ved tastning, ændring, bookingvalg, gendannelse, refresh og rydning. Ved selve trykket valideres nummeret igen synkront, så et tidligere link ikke kan vælge en gammel modtager. Kendte formateringstegn fjernes, et indledende plus bevares, og der gættes ingen landekode. Kun ét nummer med 3–15 cifre accepteres; andre tegn, flere modtagere og URI/query-indhold afvises med en synlig fejl ved telefonfeltet og fokus på feltet.

Platform og forebyggelse: Den direkte brugeraktiverede genvej er sms:<nummer>, uden tekst, query eller vedhæftning. Apples arkiverede SMS Links dokumenterer dette format og udelukker beskedtekst: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html . Brugeren skriver teksten, kontrollerer modtageren og trykker selv Send i Beskeder. Almindelige SMS'er på iPad kræver videresendelse fra en iPhone med samme Apple-konto: https://support.apple.com/da-dk/102545 . Et åbnet vindue er ikke bevis for afsendelse. Kontraktfilen deles separat med Del kontrakt via Beskeder m.m. SMS-trykket ændrer ingen kontraktfil, håndskrift eller gemt kladde.

Bevis/scope: Seks SMS-prøver fejlede før rettelsen (32 målrettede tests: 26 pass, 6 fail). Den ekstra fejltekst ved telefonfeltet blev derefter testet først og gav to forventede fejl. Efter rettelsen bestod alle 33 kontrakt-UI-tests, inklusive syv SMS-prøver. Tests kontrollerer faktiske URI'er, blokering af default-handlingen, aktuel modtager, kladdegendannelse og bevarelse af reelle signerede PDF-bytes og håndskrift. Hele pakken bestod med 148 tests i /private/tmp/hjortemosen-sms-20261007; git diff --check bestod. En uafhængig read-only kodegennemgang fandt ingen konkrete problemer.

Browserbevis: Frisk lokal origin på port 18767 viste 2.6.5. Et faktisk tryk uden nummer blev blokeret og viste fejl ved feltet. Et syntetisk formateret nummer gav sms:+4512345678 og fjernede fejlen. En testkontrakt blev genereret, og begge SMS-links pegede på samme nummer. Efter genåbning var kontraktfelter og SMS-link gendannet. Layout ved 820×1180 og 390×844 havde ingen vandret overflow; begge SMS-knapper var mindst 48 px høje. Ingen consolefejl/advarsler blev registreret.

Begrænsninger og testmiljø: De gyldige SMS-links blev kontrolleret read-only i DOM; Beskeder blev ikke åbnet gennem computerens systemhandler, og ingen SMS blev sendt. Der blev ikke afprøvet en fysisk iPad eller iPhone-videresendelse. Før den endelige rettelse var port 18766 blevet åbnet; den blev fravalgt til final kontrol for at undgå tidligere service-worker-cache. Ingen produktionskode blev ændret for dette cacheforhold. Tidligere blokeret PDF-navigation og systemfildeling blev ikke gentaget. Den native kildepakke forbliver 2.6.1; denne ændring udgives i webappen.
