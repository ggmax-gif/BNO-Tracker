# Installing BNO Tracker on a Mac

🌐 **English** · [繁體中文](INSTALL.zh-HK.md)

This app is **not signed with an Apple Developer certificate**, so macOS will
refuse to open it the first time and show a warning. That is expected. This
page explains what the warning means and how to get past it once.

> If you would rather not click through a security warning at all — which is a
> reasonable position — ask Daniel to open it for you the first time on your
> Mac. After that first launch it opens normally forever.

---

## 1. Install

1. Open the `.dmg` you were sent.
2. Drag **BNO Tracker** into your **Applications** folder.
3. Eject the disk image.

## 2. First launch

Double-clicking will **not** work the first time. macOS blocks apps that have
not been signed and notarised by Apple, and the tracker is neither.

Instead:

1. Open **System Settings → Privacy & Security**.
2. Scroll to the **Security** section.
3. You should see a line saying *"BNO Tracker" was blocked*, with an
   **Open Anyway** button. Click it.
4. Confirm with Touch ID or your password.

If no such line appears, try double-clicking the app once first — the message
only shows up after macOS has blocked a launch attempt.

From then on, the app opens by double-clicking like anything else.

> **Exact wording and menu layout change between macOS releases.** These steps
> were written against macOS 26. If what you see does not match, the thing you
> are looking for is always in **Privacy & Security**, near the bottom of the
> Security section, right after you have tried to open the app once.

---

## 3. Why the warning appears

Apple charges $99/year for a Developer ID certificate. Without one, every app —
harmless or not — gets the same warning. The warning is about **who signed it**,
not about what the app does.

You can check for yourself what it is allowed to do. The app's permissions are
declared in [`desktop/src-tauri/capabilities/default.json`](../desktop/src-tauri/capabilities/default.json):

- read and write **only** inside its own folder in Application Support
- open a web link in your browser (used by the gov.uk guidance link)
- show the system Save/Open dialog when you export or import

There is no network permission of any kind. The app makes **zero** network
requests — it works fully offline, and you can verify that by turning off Wi-Fi.

---

## 4. Where your data lives

```
~/Library/Application Support/uk.bnotracker.app/
    bno-tracker.json        ← your records
    backups/
        2026-09-03.json     ← one automatic snapshot per day, newest 30 kept
```

To get to it: in Finder press **⌘⇧G** and paste
`~/Library/Application Support/uk.bnotracker.app/`

**Back this folder up.** It is included in Time Machine automatically. If you
want a copy you can email or put on a USB stick, use **Export JSON** in the app
instead — that writes a single file wherever you choose.

**To restore:** use **Import JSON** and pick either an export or one of the
dated files from `backups/`. The app validates the file before accepting it, so
a wrong or damaged file is rejected rather than replacing your records.

---

## 5. Uninstalling

Drag the app from Applications to the Bin. Your data folder is **not** removed
with it — delete the folder above if you also want the records gone.
