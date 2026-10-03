# Hjortemosen Booking PWA – version 2.5.0

Ren webapp/PWA til iPhone og iPad. Ingen Xcode nødvendig.

## Nyt i version 1.4

- “Husnummer” er ændret til “Have nummer” i hele brugerfladen.
- Bookingkladden gemmes automatisk lokalt, mens der skrives.
- En kladde kan også gemmes manuelt.
- Hele databasen kan gemmes som JSON-sikkerhedskopi.
- Sikkerhedskopien kan deles via iPhones delingsmenu og importeres på en anden enhed.
- En læsbar bookingoversigt kan deles som tekst.

## GitHub Pages

Upload alle filer fra denne mappe direkte til roden af GitHub-repositoriet. Erstat de eksisterende filer. Vent derefter 1–3 minutter og genindlæs GitHub Pages-siden.

På iPhone kan det være nødvendigt at slette det gamle ikon fra hjemmeskærmen og tilføje siden igen via Safari → Del → Føj til hjemmeskærm.

## Vigtigt om deling

Appen er offline og bruger lokal lagring. Deling overfører en sikkerhedskopifil; det er ikke live-synkronisering. Den anden bruger importerer filen under Mere → Gem og del data → Importér data.


Udfyldte lejekontrakter (v2.3.0): Under Dokumenter kan de to PDF-kontrakter og Word-kontrakten udfyldes på iPad. Vælg en booking eller skriv oplysningerne, lav filen, og se den igennem. PDF-felterne kan også redigeres senere i en PDF-app. Del udfyldt kontrakt åbner iPadens delingsmenu med den færdige fil. Vælg Mail/Beskeder og modtageren; e-mail og telefonnummer kan kopieres fra formularen. Appen sender ikke automatisk. Hvis fildeling ikke understøttes, gemmes filen til manuel vedhæftning. Underskriftsfeltet er frivilligt og udfyldes kun af brugeren.

De originale vilkår bevares: leje 1.000/1.500 kr., depositum 500 kr. Bookinger med andre beløb, herunder gratis bestyrelsesbookinger, blokeres ved valg af booking. Udfyldningen ændrer ikke bookingdata. Den aktive kontraktformular gemmes automatisk på enheden og indgår i komplette sikkerhedskopier fra version 2.5.0. Tekst, der ikke kan stå på én linje i et PDF-felt, vises på en ekstra side med henvisning fra første side. PDF understøtter danske/latinske tegn; ved andre tegn gives en fejl med mulighed for at vælge Word. Biblioteker er versionslåste og gemt lokalt; se THIRD-PARTY-LICENSES.txt.

Test: `node --test tests/*.test.cjs`. Fysisk iPad Mail/Beskeder og AirPrint bør afprøves på enheden; browser- og filtestene kontrollerer de udfyldte filer og delingsgrænsen.


## Håndskrevet underskrift på iPad (v2.4.0)

Under Dokumenter kan lejeren skrive med en finger eller Apple Pencil i underskriftsfeltet. Brug Ryd underskrift for at starte igen. Den håndskrevne underskrift indsættes i begge PDF-kontrakter og i Word-kontrakten; navnet følger med. Opret den færdige fil med Lav udfyldt kontrakt og del den via Mail eller Beskeder.

Underskriften gemmes sammen med den aktive kontraktkladde og kommer med i den færdige kontraktfil og komplette sikkerhedskopier. Ændringer i kontraktfelter, valg af en anden kontrakt/booking og nulstilling rydder underskriften. Betalingsstatus alene rydder den ikke. Hvis underskriftsfeltet er tomt, oprettes kontrakten uden håndskrevet underskrift.

## Bestyrelsens depositum (v2.4.1)

Bestyrelsesmedlemmer betaler 0 kr. i leje og 500 kr. i depositum. Markér **Depositum betalt**, når beløbet er modtaget. Ubetalt depositum vises i overblikket og kalenderen. Beløbene er faste for bestyrelsen, også ved andre standardpriser. Ældre gemte bestyrelsesbookinger og sikkerhedskopier med 0 kr. i depositum kan stadig læses; ved redigering og gemning anvendes de 500 kr.

## Automatisk gemning og lokal backup (v2.5.0)

Bookingkladden, den aktive kontraktkladde med håndskrevet underskrift, priskladden og en ufærdig blacklistformular gemmes automatisk lokalt. Gyldige standardpriser anvendes, når prisfeltet forlades. En booking kommer i kalenderen ved **Gem booking**; en person kommer på blacklist ved **Tilføj til blacklist**. Ufærdige formularer bliver dermed bevaret uden at oprette en aftale eller blokere en lejer.

Under **Mere** ses tidspunktet for den seneste automatiske backup. Appen gemmer en komplet kopi i IndexedDB og op til ti tidligere versioner ved dataændringer eller en ny dag. Tastning opdaterer den seneste kopi. Vælg en kopi og **Gendan valgt backup** for at se indholdet før bekræftelse. Gendannelse erstatter data og de gemte kladder. Den aktuelle version forsøges bevaret i historikken. Ved fejl i lagring eller data vises en advarsel; den sidste gyldige backup overskrives ikke med tomme standarddata. En afbrudt gendannelse rulles tilbage via en lokal journal ved næste åbning.

**Gem backup i Filer** åbner iPadens delingsmenu med en komplet JSON-fil. Vælg **Gem i Filer → På min iPad** for en separat kopi. Hvis fildeling ikke er tilgængelig, hentes filen til manuel lagring. Safari tillader ikke automatisk, løbende lagring i en vilkårlig mappe i Filer. De automatiske kopier ligger i appens browserlager og forsvinder sammen med browserdata, hvis disse slettes. En separat fil bør derfor også gemmes. Opdateringer af appen sletter ikke dens bookingdata eller backuphistorik.

Eksport og erstatningsimport inkluderer den aktive kontrakt, underskrift og øvrige kladder. Ældre JSON-filer med kun bookingdata kan stadig importeres. Ved fletning bruges kun filens bookingdata; de lokale øvrige kladder beholdes. Kontrakteditoren har én aktiv kladde. Genererede PDF/Word-filer gemmes separat med **Gem fil**; efter genåbning kan filen laves igen fra den bevarede kladde. Ændring af kontraktens felter, vilkår eller tilknyttede booking rydder stadig håndskriften, så ændrede oplysninger kræver en ny underskrift.

Test backupens faktiske IndexedDB-forløb ved at åbne `tests/backup-browser.html` på en lokal HTTP-server. De almindelige Node-tests omfatter også eksport/import, genåbning, gendannelsesfejl, gamle filformater og konflikter mellem vinduer. Kontroller kilde/version ved lokale prøver; service worker kan fortsat vise en tidligere cache på samme origin.

Gendannelse og recovery koordineres mellem vinduer med Web Locks, som Safari understøtter fra version 15.4. Andre gemninger og backup afviser en aktiv gendannelse. Hvis Web Locks ikke er tilgængelig, bevares en nylig journal i mindst 30 sekunder, så et andet vindue ikke straks ruller en aktiv gendannelse tilbage. Browseropdatering anbefales til ældre iPads. Kilde: [WebKit Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/).
