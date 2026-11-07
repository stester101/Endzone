# Endzone Android

Android app packaging of the approved Endzone design with live ESPN data: Games, Bets, compact views, score popups, result accumulator builder and linked Live Feed. Fits the device viewport, respects Android system bars/keyboard, supports Android Back, bundles icons offline, and stores bets/draft/preferences locally between launches.

## Install
Open [Releases](https://github.com/stester101/Endzone/releases), download **Endzone.apk**, and open it on your Galaxy Flip 6. Android may ask you to allow installation from your browser. Android 8+ supported.

## Status
This version connects to ESPN’s public NFL scoreboard and game summaries. Scores refresh every 30 seconds while open; pull down or tap refresh for an immediate update. Missing probabilities display — and failed refreshes show the last update. Accumulator estimates multiply separate-game probabilities. Existing website bets are not imported or modified.

## Bookmaker bet import

The Android app accepts shared bookmaker text from the Android Share menu. It can also open a screenshot from the Share menu or the betslip import screen and read its text on-device with bundled ML Kit OCR. Imported selections open as a draft. Review every selection and enter a potential return before saving. Stake and total odds are optional for an ordinary bet; Endzone calculates a return when both are supplied. Screenshot OCR adds about 4 MB per supported architecture to the APK and works offline.

Automatic text mapping currently supports NFL team-winner selections for fixtures loaded by ESPN. It does not import soccer markets, draws, spreads, or player markets from bookmaker text. Use the existing selection builder for markets that do not map automatically. System bets still need a stake per bet and odds for each selection so Endzone can calculate their separate returns.

## Build
GitHub Actions builds, runs Android lint, uploads an APK artifact and publishes a release on each main push. For local builds install JDK 17, Android SDK 35, and Gradle 8.11.1, then run `gradle :app:assembleDebug :app:lintDebug`.

Development APKs use Android debug signing. The workflow caches the debug key so successive installs normally preserve app data; a cache eviction can change the key and require uninstalling. A persistent private release-signing key should be configured before distributing production builds. Do not uninstall/clear storage if you need saved bets. No betting transactions occur in this app.

Bundled Lucide icons are ISC licensed; football artwork is Twemoji CC-BY 4.0 (Twitter, Inc. and contributors).
