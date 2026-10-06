# Endzone Android

Android app packaging of the approved Endzone design: Games, Bets, compact views, score popups, result accumulator builder and linked Live Feed. Fits the device viewport, respects Android system bars/keyboard, supports Android Back, bundles icons offline, and stores bets/draft/preferences locally between launches.

## Install
Open [Releases](https://github.com/stester101/Endzone/releases), download **Endzone.apk**, and open it on your Galaxy Flip 6. Android may ask you to allow installation from your browser. Android 8+ supported.

## Status
This is the current **demo-data prototype**, not an ESPN-connected live tracker. The refresh button is a demo confirmation. Accumulator estimates multiply separate-game probabilities. Existing website bets are not imported or modified.

## Build
GitHub Actions builds, runs Android lint, uploads an APK artifact and publishes a release on each main push. For local builds install JDK 17, Android SDK 35, and Gradle 8.11.1, then run `gradle :app:assembleDebug :app:lintDebug`.

Development APKs use Android debug signing. The workflow caches the debug key so successive installs normally preserve app data; a cache eviction can change the key and require uninstalling. A persistent private release-signing key should be configured before distributing production builds. Do not uninstall/clear storage if you need saved bets. No betting transactions occur in this app.

Bundled Lucide icons are ISC licensed; football artwork is Twemoji CC-BY 4.0 (Twitter, Inc. and contributors).
