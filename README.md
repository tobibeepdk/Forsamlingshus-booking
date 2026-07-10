# Hjortemosen Booking – PWA

En offline webapp til booking og administration af fælleshuset i H/F Hjortemosen.

## Funktioner
- Kalender med bookede og ledige datoer
- Beskyttelse mod dobbeltbooking
- Gemte lejere med navn, telefon, mail og husnummer
- Prisgrupper: haveforeningsmedlem, ven og andre
- Betalingsstatus for leje og depositum
- Bemærkninger på bookinger
- Blacklist med blokering af nye bookinger
- Offline lokal lagring
- Eksport/import af sikkerhedskopi
- Lejekontrakter som PDF/Word med åbning, download og print

## Kør lokalt
En service worker virker ikke ved blot at dobbeltklikke på index.html. Start en lokal server i mappen:

```bash
python3 -m http.server 8080
```

Åbn derefter `http://localhost:8080`.

## GitHub Pages
1. Opret et nyt offentligt GitHub-repository.
2. Upload alle filer og mapper fra denne projektmappe til roden af repositoryet.
3. Gå til **Settings → Pages**.
4. Vælg **Deploy from a branch**.
5. Vælg `main` og `/root`, og tryk **Save**.
6. Åbn den viste Pages-adresse i Safari på iPhone eller iPad.
7. Tryk **Del → Føj til hjemmeskærm**.

Data gemmes lokalt i Safari på den enkelte enhed. Brug eksportfunktionen til sikkerhedskopier.
