# U BOP Atlas

An interactive, educational 3D atlas of the Cameron U ram-type BOP, 13-5/8 in, 10,000 psi. It works like an anatomy atlas: every documented part is a separate selectable model piece. Each part shows its catalog part number, documented function and sources, and there is an assistant that can drive the viewer.

**Accuracy rule.** Every engineering value in the app cites a public source. When a fact is not documented, the app shows "Not available in verified public documentation." The 3D geometry is an **educational reconstruction** (tier T3), not Cameron or SLB CAD. The project is not affiliated with or endorsed by SLB or Cameron. The research behind the data is in [`docs/research/AUDIT.md`](docs/research/AUDIT.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 93 unit tests: data integrity, options, share links, Excel and PDF export, lessons, quiz, assistant, API loop
npm run build        # validate data -> typecheck -> bundle API -> production build
```

The assistant works without any key: it falls back to a rule-based offline assistant that answers only from the dataset. To use Claude, set `ANTHROPIC_API_KEY` in the environment of the dev server or the deployment. The server uses model `claude-opus-5` with server-side refusal fallbacks enabled (`fallbacks: "default"`).

## Features

- Rotate, zoom and pan (drag, scroll, right-drag). 186 selectable parts in the default double configuration.
- Component tree grouped the way the catalog groups the parts. The numbers in circles are the catalog item numbers from the Cameron exploded view SD17500.
- Search by name, alias, catalog item ("item 22") or part number.
- Hide, isolate and focus, an x-ray mode, and an "Evidence" mode that colours parts by how well their part number is documented.
- An organized two-stage explode (`src/geometry/explode-layout.ts`). First each bonnet assembly slides straight out like a drawer, taking its ram out of the body. Then the parts spread in assembly order along the axis, with seals in rows above their parent part and bolts pulled out of their holes. Exploding one bonnet assembly also brings out its ram.
- System filters: structure, rams, hydraulics, seals, locking, fasteners.
- A connection graph. Solid lines are interfaces named or shown in the catalog; dashed lines are inferred and labelled as such.
- Animations: close and lock, unlock and open, piston to rod to ram, and opening and closing the bonnets for a ram change. The order of events follows catalog p.6; strokes are approximations.
- Configuration: double or single BOP, and per cavity the ram type and the bonnet type. Rams: every 13-5/8" pipe ram size with a complete catalog row, blind ram, shearing blind ram (SBR), interlocking shear ram (ISR, p.52), the four VBR-II ranges and the extended range high temperature VBR-II (p.54), and the three FLEXPACKER-NR ranges (p.55). Bonnets: standard (p.12), large-bore shear bonnets (p.18, with their own operating data from p.7 and kit 644860-07) and tandem boosters (p.20-21, 26 listed parts, with the lock moved to the outside end of the booster). Where the catalog leaves a gap, the app says so: for example the FLEXPACKER-NR ram body has no part number, and two of its top seals are marked as inferred.
- Share links. The Share button copies a link that reopens the exact view: setup, selected part, explode, hidden and isolated parts, x-ray, paint and camera angle. Links are validated on load; anything the catalog or the dataset does not know is ignored.
- Parts-list export. Export the whole BOP, the assembly of the selected part, the parts visible now, or the recommended spares, as a PDF or an Excel file. The PDF (A4 landscape, generated in the browser) opens with a summary page: setup, key counts, a part-number evidence chart, a picture of the current 3D view and a linked table of contents. Then come the bill of materials, the parts grouped by location and sub-assembly with the catalog item balloons, the part number notes (print anomalies and inferred values) and the sources, with page numbers on every page. The Excel file has the same data in four sheets. Every row carries its part number, evidence level and source page.
- Learn tab. Four guided lessons (a tour of the BOP, how a ram seals, shearing options, anatomy of a bonnet) move the camera, isolate parts and play animations step by step. Lessons carry no facts of their own: each fact is looked up from the sourced dataset and shows its source. Two quizzes ("Find the part" by tapping the model, "Name the part" from four choices) use the parts of the current setup and remember the best score on the device.
- A built-in assistant that works with no API key. Type `help` for every command, with tap-to-run examples. It can also change ram and bonnet types ("lower rams ISR", "large bore shear bonnets"), start lessons and quizzes, and open the share and export windows. It finds and explains parts, hides and isolates parts or whole systems, explodes (with percentages or a single bonnet), plays animations, changes paint, quality and the ram configuration, lists assemblies and systems, counts parts, and lists recommended spares, the rebuild kit, the sources and what is not documented. It understands follow-ups about the selected part ("hide it", "its part number"), suggests near matches for typos, and offers follow-up chips. Every fact comes from the sourced data.
- Optional Claude assistant (Vercel deploy only) with viewer tools (`select_component`, `isolate_components`, `hide_components`, `explode_assembly`, `focus_camera`, `show_system`, `show_connections`, `play_animation`, `set_xray`). Claude's answers pass a grounding filter: any part number or measured value that the knowledge tools did not return is removed from the answer.
- Part shapes and arrangement follow the catalog's exploded view and 3D view (p.9) and section (p.6): a vertical body column with a housing for each ram set; a stepped bonnet with its bolt heads; an octagonal intermediate flange pierced by the two ram-change cylinders; a round-flanged locking-screw housing on short studs; a square-drive locking screw. Sizes remain approximations (tier T3).
- Studio lighting built in code (no HDR download), soft contact shadows, and ambient occlusion in "High quality" rendering. Phones default to "Standard". Paint colour (neutral grey or the red of the catalog render) and surface finishes are illustrative only.
- Desktop and phone layouts. On phones the Parts, Details, Assistant and Learn panels open as bottom sheets with the model still visible above.

## How accuracy is enforced

| Mechanism | Where |
|---|---|
| Part numbers are extracted from the catalog PDF by script, never typed by hand | `scripts/research/extract_catalog.py` -> `data/extracted/*.json` |
| Build fails if any displayed part number is missing from the extracted data, or if any claim lacks a source | `src/data/integrity.ts`, `npm run validate` |
| Every value is a `Claim` with sources and a confidence (A = OEM, B = OEM print anomaly, C = third-party, D = inferred) | `src/data/types.ts` |
| Every model dimension carries a tier (T2 = from documents, T3 = approximation) | `src/geometry/params.ts` |
| Catalog items not drawn on SD17500 (items 39, 43) get no invented geometry | `src/geometry/bonnet-geometry.ts` |
| Paint and finishes are illustrative and labelled so; no colour encodes a documented material | `src/viewer/materials.ts`, `src/viewer/paints.ts` |
| Assistant output passes the grounding filter | `server/grounding.ts` |

## Improving accuracy later

To replace an approximation with a real value (from licensed CAD, the OEM manual obtained legitimately, or a measurement of a real unit taken with the owner's permission), edit the entry in `src/geometry/params.ts`: set `value`, `tier: 'T2'` and `sources`. The model regenerates from the parameters. New documented facts go into `src/data/curation.ts` or `src/data/build-*.ts` as `Claim`s with sources.

## Live site (GitHub Pages)

`npm run deploy:pages` builds the site and publishes it to the `gh-pages` branch, which GitHub Pages serves. Run it again after any change to update the live site. GitHub Pages hosts static files only, so on that site the assistant runs in offline mode (answers from the dataset, no Claude). For the Claude assistant, deploy to Vercel as below.

## Deploying (Vercel)

`vercel.json` builds the Vite site into `dist/`. The assistant function is bundled by `npm run build:api` into `api/assistant.mjs`; the generated file is committed so it exists whatever order the platform builds in. Set `ANTHROPIC_API_KEY` in the project's environment variables. The in-memory rate limit (12 requests per minute per IP) is per instance, so add a platform firewall rule for a hard limit.

The folders `sources/pdf/` and `sources/renders/` hold third-party copyrighted documents for local verification only. They are git-ignored and never deployed.
