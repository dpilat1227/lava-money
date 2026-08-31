# Getting Lava Money onto TestFlight

Everything that could be prepped in advance is done: `app.json` has a real
bundle identifier (`com.lavamesh.lavamoney`), `eas.json` has build profiles,
and `lavamoney.io/privacy` + `/support` are live (App Store Connect requires
both URLs).

What's left needs your Apple ID / 2FA / Expo account in an interactive
terminal — none of that can be done through an agent. Run these yourself,
in order, in a terminal at the repo root (`cd lava_finance` from wherever
you keep it).

## 1. Log into Expo (free account, separate from Apple)

```bash
npx eas-cli login
```

Prompts for an Expo account email/password. If you don't have one yet, it'll
offer to create one — go with that, it's free.

## 2. Link this project to an EAS project

```bash
npx eas-cli init
```

This creates a project on expo.dev and writes its ID into `app.json`'s
`extra.eas.projectId` automatically. Say yes to creating a new project when
asked.

## 3. Build for iOS

```bash
npx eas-cli build --platform ios --profile production
```

This is the one with the real interactive steps:

- It'll ask to log into your **Apple Developer account** — email + password
  + 2FA code from your phone.
- It'll offer to **create an App Store Connect API key automatically** —
  say yes, this is the modern, recommended way (skips generating one by
  hand in the App Store Connect website).
- It'll ask to **register the bundle identifier** (`com.lavamesh.lavamoney`)
  with your Apple account and **create a distribution certificate +
  provisioning profile** — say yes to both. EAS manages and stores these
  for you; you'll never have to touch Xcode's certificate UI.
- Then it uploads your code and builds on Expo's servers — takes roughly
  10-20 minutes. You'll get a link to watch progress, and the terminal
  can just sit there until it's done (or `eas-cli` can email/notify you).

## 4. Submit the build to App Store Connect / TestFlight

Once the build finishes:

```bash
npx eas-cli submit --platform ios --latest
```

This uploads the finished build to App Store Connect. It reuses the App
Store Connect API key from step 3, so this one should be non-interactive.
Apple takes a few minutes to process the build for TestFlight (not a full
review — internal testing skips that).

## 5. Add yourself as an internal tester

In [App Store Connect](https://appstoreconnect.apple.com) → your app →
TestFlight tab → Internal Testing → add your own Apple ID (the one on your
Developer account is automatically eligible). Install the **TestFlight**
app from the App Store on your phone, and the build will show up there once
Apple finishes processing it (usually a few minutes, no review).

## After that

Once steps 1-4 succeed once, **future builds don't need the interactive
Apple steps again** — credentials are stored by EAS. At that point I can
run `eas build --platform ios --profile production --auto-submit` myself
for any future update, and you'd just re-install from TestFlight when it
notifies you.

See `docs/app-store-listing.md` for the App Store Connect copy (description,
keywords, etc.) — not needed for internal TestFlight, only for external
testing or a real App Store submission later.
