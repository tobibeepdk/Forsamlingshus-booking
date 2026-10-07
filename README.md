# Hjortemosen Booking – webversion 2.6.3

Booking af H/F Hjortemosens fælleshus på iPad. Appen findes som webapp/PWA og som et native iPad-projekt med de samme bookingfunktioner. Begge arbejder med lokale oplysninger og kan bruges offline, når appens filer er hentet.

## Et enklere overblik

De fem primære faner er **Overblik**, **Kalender**, **Ny booking**, **Dokumenter** og **Mere**. Overblik viser kommende bookinger, manglende betaling og den næste booking. Under Mere står backup først; **Gemte lejere** og **Blacklist** har egne genveje. Standardpriser og **Flyt eller del data** kan foldes ud efter behov. **← Tilbage** på undersiderne fører til den forrige skærm og bevarer kladden. Touchfelter og formularer er tilpasset iPad i både højformat og bredformat.

Kalenderens **Udskriv / PDF** laver en rigtig PDF af den viste måned i webappen. **Åbn PDF** viser filen, hvor den kan udskrives via **Del → Udskriv**. **Del / Gem PDF** åbner fildeling til eksempelvis Filer; **Hent PDF** henter filen. PDF viser månedens kalender og en komplet bookingliste med betalingsstatus. PDF-genereringen virker offline, når appfilerne er hentet. **Åbn udskriftsmenu** bevarer direkte browserudskrivning som et alternativ. Den tidligere native kildeversion bruger fortsat iPadens udskriftsmenu. En booking oprettes i kalenderen med **Gem booking**. Automatisk gemning af en ufærdig formular opretter alene en kladde.

## Webapp og GitHub Pages

Webappen kræver ikke Xcode. Dens HTML-, CSS-, JavaScript-, manifest-, ikon-, foto- og kontraktfiler ligger i repository-roden. GitHub Pages serverer disse filer. Den tidligere native kildeversion 2.6.1 findes som [Hjortemosen-iPad-v2.6.1.zip](Hjortemosen-iPad-v2.6.1.zip); efter udpakning ligger det under `native/`.

Efter en udgivelse skal GitHub Pages være færdig med at deploye. Når appen viser **En ny version er klar**, bruges **Opdatér app**. Kladden gemmes før opdatering. Opdateringer sletter ikke bookingdata eller backuphistorik.

På iPad eller iPhone: Åbn webappen i Safari, og vælg **Del → Føj til hjemmeskærm**. Vent på **Klar til offlinebrug**, før appen bruges uden internet. Hjemmeskærmsversionen er stadig en webapp og har samme begrænsning for automatisk skrivning i Filer som Safari.

## Installeret iPad-app og automatisk backup i Filer

Hent [iPad-kildepakken](Hjortemosen-iPad-v2.6.1.zip) og læs [installationsvejledningen](IPAD-INSTALLATION.md). ZIP-filen skal udpakkes og bygges med Xcode; den er ikke en installerbar iPad-app. Et usigneret device-build eller en usigneret `.ipa` kan heller ikke installeres direkte. Distribution til iPads gennem **TestFlight** eller **App Store** kræver signering med et autoriseret Apple Developer-team, opsætning i App Store Connect og eventuelt Apples review. Der er ikke udgivet et TestFlight- eller App Store-build som følge af en lokal buildkontrol.

Den native app kræver **iPadOS 16 eller nyere**. Se `native/README.md` i den udpakkede kildepakke for byggekommandoer, signering og distribution.

Når oplysninger eller kladder ændres i den installerede app, skriver den automatisk en fuld JSON-backup i sin Documents-mappe som `Hjortemosen/seneste-backup.json`. Mappen vises under appen i **Filer → På min iPad**. Op til ti tidligere versioner ligger ved siden af den seneste kopi. Status ændres først til gemt efter afsluttet filskrivning. Appen forsøger også at afslutte ventende gemning, når den går i baggrunden; en tvangslukning kan afbryde en ændring, som endnu ikke er færdig.

**Åbn backupmappe** viser iPadens dokumentvælger ved backupfilerne. Et filvalg her importerer ikke automatisk oplysningerne. Brug gendannelse eller **Mere → Flyt eller del data → Importér sikkerhedskopi** til at læse en kopi ind.

Backupmappen tilhører den installerede app. Sletning af appen kan også slette dens oplysninger og lokale backupfiler. Gem en kopi på en placering uden for appens mappe, for eksempel iCloud Drive, hvis den skal bevares uafhængigt af appen.

I den native app åbnes kontrakter med iPadens dokumentforhåndsvisning og deles gennem systemets delingsmenu. Kalenderudskrivning åbner iPadens udskriftsmenu. Appen sender ikke automatisk e-mail eller SMS.

## Gemning, browserbackup og gendannelse

Bookingkladden, den aktive kontraktkladde med håndskrevet underskrift, priskladden og en ufærdig blacklistformular gemmes automatisk lokalt. Gyldige standardpriser anvendes, når prisfeltet forlades. En booking kommer i kalenderen ved **Gem booking**; en person kommer på blacklist ved **Tilføj til blacklist**. Ufærdige formularer bevares uden at oprette en aftale eller blokere en lejer.

Under **Mere** ses tidspunktet for den seneste automatiske lokale backup. Appen gemmer en komplet kopi i IndexedDB og op til ti tidligere versioner ved dataændringer eller en ny dag. Tastning opdaterer den seneste kopi. Vælg en kopi og **Gendan valgt backup** for at se indholdet før bekræftelse. Gendannelse erstatter data og de gemte kladder. Den aktuelle version forsøges bevaret i historikken. Ved fejl i lagring eller data vises en advarsel; den sidste gyldige backup overskrives ikke med tomme standarddata. En afbrudt gendannelse rulles tilbage via en lokal journal ved næste åbning.

I **Safari og hjemmeskærmswebappen** åbner **Gem backup i Filer** delingsmenuen med en komplet JSON-fil. Vælg **Gem i Filer → På min iPad** for en separat kopi. Hvis fildeling ikke er tilgængelig, hentes filen til manuel lagring. Denne separate lagring kræver et tryk. Browserens automatiske kopier ligger i dens lokale lager og forsvinder sammen med browserdata, hvis disse slettes. Den installerede apps automatiske filbackup beskrevet ovenfor er en separat funktion.

Gendannelse og recovery koordineres mellem vinduer med Web Locks, som Safari understøtter fra version 15.4. Andre gemninger og backup afviser en aktiv gendannelse. Hvis Web Locks ikke er tilgængelig, bevares en nylig journal i mindst 30 sekunder, så et andet vindue ikke straks ruller en aktiv gendannelse tilbage. Browseropdatering anbefales til ældre iPads. Kilde: [WebKit Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/).

## Flyt oplysninger mellem iPads eller fra Safari

Hver iPad har sine egne oplysninger. Safari, hjemmeskærmswebappen og den installerede app kan også have separate lokale lagre. Der er ingen automatisk synkronisering mellem enheder eller mellem webappen og den installerede app.

Gem eller del en **fuld JSON-sikkerhedskopi** fra den app, der indeholder oplysningerne. Åbn den anden app, og brug **Mere → Flyt eller del data → Importér sikkerhedskopi**. Vælg **Erstat alle nuværende data**, når hele arbejdsområdet skal flyttes, inklusive den aktive kontrakt, underskrift og øvrige kladder. Se importens oversigt igennem før bekræftelse.

Ældre JSON-filer med kun bookingdata kan stadig importeres. Ved **Flet med nuværende data** bruges kun filens bookingdata; de lokale øvrige kladder beholdes, nuværende priser bevares, og konflikter stopper importen. En kopi af data fra før importen gemmes lokalt. Deling overfører en fil; den holder ikke efterfølgende de to enheder ens.

## Lejekontrakter og underskrift

Under **Dokumenter** kan de to PDF-kontrakter og Word-kontrakten udfyldes på iPad. Vælg en booking eller skriv oplysningerne, underskriv om ønsket, og vælg **Lav udfyldt kontrakt**. Se filen igennem før deling. PDF-felterne kan også redigeres senere i en PDF-app.

**Send via Outlook/Mail** kræver en gyldig modtageradresse og åbner delingsmenuen med den færdige PDF- eller Word-fil, inklusive en eventuel underskrift. Kopiér modtageradressen, vælg **Outlook** eller **Mail**, indsæt modtageren, og vælg din Hotmailkonto under **Fra**. Kontoen skal være tilføjet i mailappen. Kontrollér vedhæftningen, og tryk selv på **Send**. Kontrollér derefter **Sendt post** i den samme Hotmailkonto; en besked i **Udbakke** er endnu ikke sendt. Appen kan ikke kontrollere afsendelsen. **Åbn Sendt post i Hotmail** åbner Hotmails webmail.

Hvis fildeling ikke understøttes, hentes den udfyldte fil, og en genvej åbner en e-mailkladde med modtager og emne. Kladden indeholder ingen vedhæftning; vedhæft filen fra **Filer** eller **Downloads** før afsendelse. Hvis deling fejler, brug **Gem fil** og vedhæft manuelt. **Del via Beskeder m.m.** bevarer den almindelige fildeling. Åbn den udfyldte PDF og brug udskriftsmenuen for at udskrive.

E-mailflowet i denne webversion er ikke indbygget i den tidligere native kildepakke 2.6.1. Den pakke har fortsat den almindelige delingsmenu; et nyt signeret native build kræver en separat udgivelse.

De originale kontraktvilkår bevares: leje 1.000/1.500 kr. og depositum 500 kr. Bookinger med andre beløb, herunder gratis bestyrelsesbookinger, blokeres ved valg af booking i disse prisbestemte kontrakter. Udfyldningen ændrer ikke bookingdata. Tekst, der ikke kan stå på én linje i et PDF-felt, vises på en ekstra side med henvisning fra første side. PDF understøtter danske/latinske tegn; ved andre tegn gives en fejl med mulighed for at vælge Word. Biblioteker er versionslåste og gemt lokalt; se `THIRD-PARTY-LICENSES.txt`.

Lejeren kan skrive med en finger eller Apple Pencil i underskriftsfeltet. **Ryd underskrift** starter feltet forfra. Håndskriften indsættes i begge PDF-kontrakter og Word-kontrakten; det indtastede navn følger med. Feltet er frivilligt og udfyldes kun af brugeren. Er det tomt, oprettes kontrakten uden håndskrevet underskrift.

Kontrakteditoren har én aktiv kladde. Den gemmes med felter og håndskrift og følger med i fulde sikkerhedskopier. Ændring af kontraktens felter, vilkår eller tilknyttede booking rydder håndskriften, så ændrede oplysninger kræver en ny underskrift. Betalingsstatus alene rydder den ikke. Genererede PDF/Word-filer gemmes separat med **Gem fil**; efter genåbning kan filen laves igen fra den bevarede kladde.

## Bestyrelsens depositum

Bestyrelsesmedlemmer betaler **0 kr. i leje og 500 kr. i depositum**. Markér **Depositum betalt**, når beløbet er modtaget. Ubetalt depositum vises i overblikket og kalenderen. Beløbene er faste for bestyrelsen, også ved andre standardpriser. Ældre gemte bestyrelsesbookinger og sikkerhedskopier med 0 kr. i depositum kan stadig læses; ved redigering og gemning anvendes de 500 kr.

## Kontroller og prøver

Kør webappens Node-tests fra repository-roden:

```sh
node --test tests/*.test.cjs
```

Test backupens faktiske IndexedDB-forløb ved at åbne `tests/backup-browser.html` på en lokal HTTP-server. Node-tests omfatter blandt andet eksport/import, genåbning, gendannelsesfejl, gamle filformater og konflikter mellem vinduer. Kontroller kilde og version ved lokale prøver; en service worker kan fortsat vise en tidligere cache på samme origin.

Native lagerprøver og simulator-/device-buildkommandoer står i `native/README.md` i den udpakkede kildepakke. Et usigneret build dokumenterer bygbar kildekode og er ikke en installeret eller distribueret app. Afprøv den signerede app på en fysisk iPad, herunder Filer, baggrund/lukning, Mail/Beskeder, Apple Pencil og AirPrint. Browserprøver, diskprøver og simulator-build er ikke bevis for et gennemspillet forløb på en fysisk iPad.
