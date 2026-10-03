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
