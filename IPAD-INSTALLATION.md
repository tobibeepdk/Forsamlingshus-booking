# Hjortemosen på flere iPads – version 2.6.1

Webappen er udgivet på [Hjortemosen Booking](https://tobibeepdk.github.io/Forsamlingshus-booking/). Den installerede iPad-version findes som [kildepakke](Hjortemosen-iPad-v2.6.1.zip), som skal bygges og signeres med Xcode. ZIP-filen er ikke en app, der kan installeres direkte. Der er endnu ikke uploadet et build til TestFlight eller App Store.

## Klargør TestFlight

1. Hent og udpak ZIP-filen på en Mac med Xcode. Åbn `native/Hjortemosen.xcodeproj` i den udpakkede mappe.
2. Vælg target **Hjortemosen → Signing & Capabilities**, og vælg det autoriserede Apple Developer-team. Distribution kræver et betalt Apple Developer Program-medlemskab og adgang til App Store Connect. Appens bundle-ID er `dk.hjortemosen.booking`.
3. Opret appen med samme bundle-ID i App Store Connect. Vælg en generisk iOS-enhed i Xcode, og brug **Product → Archive**.
4. Vælg arkivet under **Organizer → Distribute App → App Store Connect**, kontrollér signeringen, og upload buildet.
5. Når Apple har behandlet buildet, tilføjes det til en TestFlight-gruppe. Testere installerer TestFlight på deres iPads og accepterer invitationen. Ekstern test kan kræve Apples review.

Projektet kræver **iPadOS 16 eller nyere**. Team og signering skal passe til den konto, der skal udgive appen. Et usigneret device-build kan ikke bruges som TestFlight-installation. Byggekommandoer og eksportskabelon findes i `native/README.md` i kildepakken.

Se [Apples TestFlight-vejledning](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/) for upload, testgrupper og invitationer. App Store-udgivelse kræver desuden appoplysninger, privatlivsoplysninger, screenshots og review.

## Automatisk backup og eksisterende oplysninger

Den installerede app skriver automatisk en fuld backup efter ændringer. Find den i **Filer → På min iPad → Hjortemosen → Hjortemosen → seneste-backup.json**. Op til ti tidligere versioner bevares. Appens **Mere → Åbn backupmappe** åbner dokumentvælgeren. Valg af en fil her importerer ikke automatisk dens indhold.

Hver iPad har sit eget lager. For at flytte oplysninger fra Safari eller en anden iPad: Gem en fuld JSON-backup i den nuværende app, åbn den nye app, og vælg **Mere → Flyt eller del data → Importér sikkerhedskopi**. **Erstat alle nuværende data** overfører også den aktive kontrakt, underskrift og øvrige kladder; kontrollér oversigten før bekræftelse. Der er ingen automatisk synkronisering mellem iPads.

Safari og hjemmeskærmswebappen gemmer automatisk i browserlageret. En separat kopi i Filer kræver **Gem backup i Filer**. Automatisk skrivning af en fil i Filer er en funktion i den installerede iPad-app. Appens egen mappe kan blive slettet sammen med appen; gem en kopi uden for mappen, hvis den skal bevares ved afinstallation.

## Kontrol før brug på en fysisk iPad

Webkoden har bestået **117 Node-tests**, og de offentliggjorte tilbageknapper er prøvet i browseren med bevaret bookingkladde. Den native kilde er bygget til både simulator og usigneret iPad-device, og 18 filbackupprøver består. Den automatiserede native UI-prøve blev blokeret under testmiljøets opstart, før appforløbet begyndte. Der er derfor ingen bestået native UI-prøve, TestFlight-upload eller fysisk iPad-afprøvning at rapportere.

Afprøv den signerede app på en iPad: skriv en kladde, kontrollér backupfilens indhold, gå til hjemmeskærmen og genåbn appen. Kontrollér derefter håndskrift med finger/Apple Pencil, deling af den udfyldte kontrakt via Mail/Beskeder og kalenderens udskriftsmenu. Opret kun prøvebookinger i et særskilt testlager.
