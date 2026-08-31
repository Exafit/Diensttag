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
node server.mjs
```

Dann im Browser öffnen:

```text
http://localhost:4173
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

Die App dokumentiert Einträge und berechnet nur eine Vorschau. Ob ein Eintrag steuerlich angesetzt werden kann, hängt von den persönlichen Umständen und den jeweils gültigen steuerlichen Regeln ab.
