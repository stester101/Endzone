# Endzone (Friends Edition)

A simplified Android edition of Endzone for sharing with friends. It tracks ordinary NFL accumulators made from team-winner selections only. It does not include player or team props, combined markets, system bets, bookmaker import, or JSON import.

## Bet flow

1. On Games, tap one team in each of at least two different games.
2. Open the betslip and check the selections.
3. Enter the bookmaker's potential return. Stake and total odds are optional.
4. Confirm the bet. Follow progress in My bets.

A first-run guide explains the bet flow and the main icons. Tap the question-mark icon to open it again.

## Build

The friends edition uses the distinct Android application ID `com.endzone.tracker.friends`, so it can be installed beside the main Endzone app. It keeps the `Endzone` display name and uses separate local storage keys.

Build requirements: JDK 17, Android SDK 35, Android Gradle Plugin 8.9.2 and Gradle 8.11.1. GitHub Actions builds a debug APK when this branch is pushed. Development APKs are not production signed.

The app uses ESPN's public NFL data. Bet records are stored locally on the device. This app only tracks bets already placed elsewhere; it does not connect to a bookmaker or place bets.
