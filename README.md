# Außenzeit

Mobile-first PWA zum lokalen Erfassen steuerlich relevanter Auswärtstätigkeitstage.

## Funktionen

- Schnelles Markieren des aktuellen oder ausgewählten Tages
- Kategorien: `>8h`, `24h`, `Anreisetag`, `Abreisetag`
- Inland- und Auslandseinträge mit Pauschbetrags-Vorschau
- Mehrtageseinsatz-Assistent
- Jahresübersicht mit Kategorien, Summe und Filter
- Auswahlmodus mit Bestätigungsdialog zum Löschen
- CSV-Export pro Jahr
- JSON-Backup und Import
- Offline-fähig über Service Worker

## Lokal starten

```powershell
python -m http.server 4173
```

Dann im Browser öffnen:

```text
http://localhost:4173
```

## Hinweis

Die App dokumentiert Einträge und berechnet nur eine Vorschau. Ob ein Eintrag steuerlich angesetzt werden kann, hängt von den persönlichen Umständen und den jeweils gültigen steuerlichen Regeln ab.
