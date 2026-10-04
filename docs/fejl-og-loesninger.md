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
