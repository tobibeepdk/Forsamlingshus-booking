# Hjortemosen Booking PWA – version 1.4

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

De originale vilkår bevares: leje 1.000/1.500 kr., depositum 500 kr. Bookinger med andre beløb, herunder gratis bestyrelsesbookinger, blokeres ved valg af booking. Udfyldningen ændrer ikke bookingdata. Formularen opbevares kun, mens appen er åben, og indgår ikke i sikkerhedskopier. Tekst, der ikke kan stå på én linje i et PDF-felt, vises på en ekstra side med henvisning fra første side. PDF understøtter danske/latinske tegn; ved andre tegn gives en fejl med mulighed for at vælge Word. Biblioteker er versionslåste og gemt lokalt; se THIRD-PARTY-LICENSES.txt.

Test: `node --test tests/*.test.cjs`. Fysisk iPad Mail/Beskeder og AirPrint bør afprøves på enheden; browser- og filtestene kontrollerer de udfyldte filer og delingsgrænsen.
