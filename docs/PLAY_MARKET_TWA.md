# Eduhistory Android PWA + TWA

This project packages `https://eduhistory.uz` as a Trusted Web Activity Android app.

## App Identity

- Package name: `uz.eduhistory.app`
- Launch URL: `https://eduhistory.uz/dashboard?source=twa`
- Web manifest: `https://eduhistory.uz/manifest.webmanifest`
- Digital Asset Links: `https://eduhistory.uz/.well-known/assetlinks.json`

## Build

Open the `android/` folder in Android Studio, let Gradle sync, then build:

```bash
cd android
./gradlew bundleRelease
```

The Play Store artifact will be:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

If Android Studio does not detect your SDK, copy `android/local.properties.example` to `android/local.properties` and set `sdk.dir`.

## Signing

A local upload keystore has been generated at:

```text
android/keystores/eduhistory-upload.jks
```

The matching local signing config is:

```text
android/signing.properties
```

Both files are intentionally ignored by git. Back them up securely before uploading to Play Console.

Current upload-key SHA-256 fingerprint included in `assetlinks.json`:

```text
08:35:FD:CE:84:10:47:AF:5D:E9:41:B5:DC:1D:D6:E7:16:E0:AD:24:E7:1B:F7:9E:BD:2D:A6:9F:59:32:F1:ED
```

Important: after creating the app in Play Console, open Play App Signing and add the Play app signing certificate SHA-256 fingerprint to `public/.well-known/assetlinks.json`. Google Play may re-sign the app, and TWA verification must match the certificate used on installed devices.

## Verification Checklist

1. Deploy the site.
2. Open `https://eduhistory.uz/manifest.webmanifest` and verify icons load.
3. Open `https://eduhistory.uz/.well-known/assetlinks.json` and verify valid JSON.
4. Build and install the release app on a real Android device.
5. Confirm the app opens fullscreen without a browser address bar.
6. Turn off internet and confirm the app shows the Eduhistory offline screen instead of freezing.
