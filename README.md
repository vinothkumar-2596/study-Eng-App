# study-Eng App

React Native (Expo SDK 54) build of [study-Eng](../english-pdf-reader). Open an
English PDF on the phone, tap a word for its Tamil meaning, press and hold a
sentence for a translation plus grammar. Saved words and sentences live on the
device.

## How the reader works

The one thing React Native cannot do natively is tell you **which word** was
tapped inside a rendered PDF page — that needs a DOM text layer. So the PDF page
alone lives in a `WebView`; everything the reader sees and touches around it is
native.

```
Native (Home · Toolbar · Learning sheet · Library · Settings)
└── WebView — pdf.js canvas + text layer, reports word/sentence hits only
```

`assets/reader/reader.html` is a self-contained document: the pdf.js UMD build
plus the same `wordAtPoint` / `contextFor` / `buildPageText` helpers the web app
uses, so context selection behaves identically on both platforms. On first launch
`src/lib/readerAssets.ts` copies `reader.html`, `pdf.lib.js` and `pdf.worker.js`
side by side into the document directory, so relative `<script src>` tags resolve
and nothing is fetched from a CDN.

Two details worth knowing before editing that file:

- WKWebView refuses to create a Web Worker from a `file://` origin, so
  `pdf.worker.js` is loaded as a plain script. That publishes
  `globalThis.pdfjsWorker`, which pdf.js checks first — it renders on the main
  thread instead of failing a worker attempt and re-fetching the same file.
- Books are copied into `reader/books/`, so the WebView opens them with a plain
  relative path. If that file read is ever refused, `ReaderScreen` falls back to
  streaming the PDF across the bridge as base64 chunks.

Bump `BUNDLE_VERSION` in `readerAssets.ts` whenever a bundled reader file changes,
or installed copies will not be refreshed.

## Run it on an iPhone (from Windows — no Mac needed)

1. Install **Expo Go** from the App Store on the phone.
2. Put the phone and this computer on the same Wi-Fi.

> The project is pinned to **SDK 54** to match the Expo Go build on the test
> phone. Each Expo Go release supports exactly one SDK, so bumping this without
> updating the phone gets you "project is incompatible with this version".

3. ```powershell
   cd E:\study-Eng-App
   npx expo start
   ```
4. Scan the QR code with the iPhone camera.

If the QR does not connect, Windows Firewall is usually blocking port 8081 —
allow Node.js on private networks, or run `npx expo start --tunnel`.

## Where meanings come from

`Settings` has two addresses:

| | |
|---|---|
| **Hosted server** | `https://study-eng-two.vercel.app` — runs in offline mode, so it only knows the ~22 word built-in dictionary. Fine for a first test, not for real reading. |
| **Local Ollama** | Full coverage. Point it at this computer, e.g. `http://192.168.1.2:11434`. |

Unlike the web app there is no CORS handshake and no local-network permission
prompt — a native `fetch` is not a browser request. On the computer, once:

```powershell
$env:OLLAMA_HOST = "0.0.0.0"
ollama serve
ollama pull qwen3:4b
```

and allow port 11434 through Windows Firewall. **Test connection** in Settings
reports exactly what is wrong when it is not reachable.

Word lookups race Google Translate, local Ollama (when configured), and the hosted server. The first successful result is shown, while the direct Tamil word meaning is normalized with Google Translate and cached on-device. Sentence lookups race the configured model and hosted server.

## Checks

```powershell
npx tsc --noEmit
npx expo-doctor
```

## Not done yet

- App Store / TestFlight builds (needs EAS Build and an Apple Developer account).
  The dependency list was chosen to stay EAS-compatible; `NSAllowsLocalNetworking`
  is already set in `app.json` so the LAN Ollama keeps working in a standalone
  build.
- Android is unverified.
- OCR for scanned PDFs — detected and reported, not handled.
- Sync between the web app and this one. Storage keys and record shapes are
  deliberately identical so it can be added later.
