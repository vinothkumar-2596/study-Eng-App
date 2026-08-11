# Expo HAS CHANGED

This project is pinned to **SDK 54** because that is what the Expo Go build on the
test iPhone supports. Do not bump it without checking the phone first — a newer
SDK makes Expo Go refuse the project with "incompatible with this version".

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code.

Notable for this SDK:

- `expo-file-system` is the new `File` / `Directory` / `Paths` API. `copy()`,
  `create()` and `delete()` are **synchronous**; `base64()` and `text()` return
  promises.
- React Native 0.81 still has `StyleSheet.absoluteFillObject`. (SDK 57 removed it
  in favour of a spreadable `absoluteFill`, so that migration flips back and
  forth — check which one typechecks.)
