# Command Centre fonts (self-hosted)

These woff2 files replace the `next/font/google` calls the Command Centre decks
used to make. Google's loader downloads from `fonts.gstatic.com` **during
`next build`**, so any build without egress to that host failed the compile:

```
NextFontError: Failed to fetch `JetBrains Mono` from Google Fonts.
```

Self-hosting removes that build-time network dependency. `next/font/local` still
fingerprints, preloads and size-adjusts the files, so runtime behaviour is
unchanged.

## What is here

| File | Family | Axis / weight | Upstream version |
|---|---|---|---|
| `chakra-petch-{400,500,600,700}.woff2` | Chakra Petch | static, one file per weight | v13 |
| `syne-variable.woff2` | Syne | variable, `wght 400..800` | v24 |
| `jetbrains-mono-variable.woff2` | JetBrains Mono | variable, `wght 400..600` | v24 |

All are the **latin** subset only — matching the `subsets: ['latin']` the deck
pages previously declared. No other subset was ever requested, so nothing was
dropped in the move.

## Licence

All three families are licensed under the SIL Open Font License 1.1. The full
licence text for each ships alongside the binaries as required:

- `OFL-chakrapetch.txt` — Copyright 2018 The Chakra Petch Project Authors
- `OFL-syne.txt` — Copyright 2017 The Syne Project Authors
- `OFL-jetbrainsmono.txt` — Copyright 2020 The JetBrains Mono Project Authors

## Refreshing

Only needed to pick up a new upstream release. For each family, request the CSS
with a modern browser User-Agent (Google serves woff2 only to browsers that
advertise support), take the `/* latin */` `@font-face` block, and download the
`src` URL:

```
https://fonts.googleapis.com/css2?family=Syne:wght@400..800&display=swap
```

Replace the file in place and keep the name — `index.ts` refers to these paths
literally.
