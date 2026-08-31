# Außenzeit

Mobile-first PWA zum lokalen Erfassen von Arbeitstagen, Fahrten zur ersten Tätigkeitsstätte und steuerlich relevanten Auswärtstätigkeitstagen.

## Funktionen

- Schnelles Markieren des aktuellen oder ausgewählten Tages
- Arbeitstag-Status mit offener, positiver und negativer Antwort
- Separate Erfassung tatsächlicher Fahrten zur ersten Tätigkeitsstätte
- Kategorien: `>8h`, `24h`, `Anreisetag`, `Abreisetag`
- Inland- und Auslandseinträge mit Pauschbetrags-Vorschau
- Mehrtageseinsatz-Assistent
- Jahresübersicht mit Arbeitstagen, Fahrttagen, Auswärtskategorien, Summe und Filtern
- Auswahlmodus mit Bestätigungsdialog zum Löschen
- Zusammengeführter CSV-Export von Tagesstatus und Auswärtseinträgen pro Jahr
- JSON-Backup und Import
- Offline-fähig über Service Worker

## Lokal starten

```powershell
node server.mjs
```

Dann im Browser öffnen:

```text
http://localhost:4173
```

## Tests

```powershell
node --check app.js
node tests/app-data.test.mjs
```

## PWA installieren

Android-Browser zeigen die automatische PWA-Installation nur, wenn die App von einem sicheren Ursprung kommt. `localhost` und `127.0.0.1` gelten nur auf demselben Gerät als sicher. Wenn das Smartphone die App über eine lokale Netzwerkadresse wie `http://192.168.x.x:4173` öffnet, erscheint meist nur "Zum Startbildschirm hinzufügen", aber keine echte PWA-Installation.

Für den echten Installationsprompt:

- die App per HTTPS hosten
- oder auf dem Smartphone selbst unter `localhost` ausführen
- Manifest, Service Worker und PNG-Icons beibehalten

### Hinweis zu Samsung Internet

Samsung Internet erzeugt bei der PWA-Installation selbst ein Android-App-Paket (WebAPK). Aktuelle Versionen können dabei auf neueren Android-Geräten eine Play-Protect-Warnung auslösen, dass die App für eine ältere Android-Version erstellt wurde. Die Android-Zielversion dieses Pakets lässt sich nicht über das Web-App-Manifest festlegen.

Bis Samsung den Installationsdienst aktualisiert, die HTTPS-Adresse in Chrome öffnen und dort `App installieren` wählen. Die App erkennt Samsung Internet und bietet dafür direkt `In Chrome öffnen` an. Das einfache Hinzufügen als Startbildschirm-Verknüpfung bleibt ebenfalls möglich.

## Hinweis

Die App dokumentiert Einträge und berechnet nur eine Vorschau. Für die Entfernungspauschale wird deshalb getrennt erfasst, ob die erste Tätigkeitsstätte an einem Arbeitstag tatsächlich aufgesucht wurde. Ob ein Eintrag steuerlich angesetzt werden kann, hängt von den persönlichen Umständen und den jeweils gültigen steuerlichen Regeln ab.

Das fachliche Erweiterungskonzept steht in [`KONZEPT_ARBEITSTAGE.md`](KONZEPT_ARBEITSTAGE.md).
