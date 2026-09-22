# Cameron U BOP 13-5/8" 10,000 psi — Documentation Audit & Architecture

Research phase, 2026-09-22. Scope: the Cameron (SLB) Type U ram-type BOP, 13-5/8" bore, 10,000 psi working pressure.

## 0. Summary

- **One official Cameron document is publicly accessible and usable:** the Cameron *Type U / UM BOP replacement parts catalog* (© Cameron International Corporation, PDF created 2014-12-08, 62 pages). It has the full 43-item parts list for the 13-5/8" 10,000 psi U BOP, an exploded-view drawing (SD17500), a hydraulic cutaway, operating-fluid data, and part numbers for rams, packers, seals, kits and options. It is the backbone of this project.
- **The two Scribd documents you linked cannot be read.** The 28-page *U BOP Operation Manual* and the 64-page *U & UM parts catalog* each show only a title page. Everything else is behind a paywall. Nothing in this audit comes from them. Operation, maintenance and test procedures are therefore **not available**.
- **SLB's own public material** is a product page and a one-page data sheet (DRL-1005, 2025). Both give features only: no dimensions and no part numbers.
- **The only dimensions come from rental companies** (Patterson Services, Quail Tools). These are third-party data sheets with their own disclaimers, and they disagree with each other in places.
- **No official CAD or 3D geometry exists in the public domain.** No drawing gives internal dimensions, materials, tolerances or seal cross-sections. **Every mesh in the app will be an educational approximation.** Only the overall size (a few rental-sheet lengths and heights) and the part layout and counts (from the Cameron exploded view) have any documentary basis.
- **Your proposed component tree needs corrections.** (a) There is no separate "Connecting Rod" part. The catalog has one *Piston, Operating* (item 5), with a connecting-rod seal and a tail-rod seal on its two ends. (b) The standard lock on this BOP is a **manual locking screw**. Wedgelocks are an option, and the catalog lists no wedgelock parts for this size. (c) There is no separate "Hydraulic System" assembly. The hydraulics are the operating cylinder and piston, the ram-change cylinders and pistons, and passages through the bonnet and intermediate flange. (d) The standard bonnet has the same part number on the left and right. Only the large-bore shear bonnet has separate left and right assemblies.

## Source register

| ID | Document | Publisher | Access | Used for | Reliability |
|---|---|---|---|---|---|
| SRC-CAM-CAT-2014 | *Type U & UM BOP* parts catalog, 62 pp. (`sources/pdf/cameron-u-um-bop-parts-catalog-2014.pdf`, sha256 `e4cfe92c…453e`). Hosted at cdn.energydais.com | Cameron International Corp. | Public PDF | Part numbers, parts tree, exploded view, hydraulic cutaway, fluid volumes, ratios, options | **OEM primary.** The catalog itself says: "weights, dimensions, part numbers, etc. should be confirmed for your specific equipment" |
| SRC-SLB-DS-2025 | *Type U* data sheet DRL-1005 (`sources/pdf/slb-type-u-data-sheet-DRL-1005.pdf`) | SLB | Public PDF | Features only | OEM primary. Contains one unrelated copy-paste line ("untreated crude through the electrostatic field"). Ignore that line |
| SRC-SLB-WEB | U Ram-Type BOP product page (slb.com) | SLB | Public | Size/WP range, lock types, bonnet options | OEM primary, marketing level |
| SRC-PAT | *BOP Information Sheet — Cameron U BOP Double 13-5/8" 10K* (`sources/pdf/patterson-13-625-10k-double-u-bop.pdf`) | Patterson Services (rental) | Public PDF | Overall dimensions, weights, torques, flange bolting, gaskets | **Third-party secondary.** Their disclaimer: "for reference only… Dimensions may vary" |
| SRC-QT | *BOP Spec & Performance Data Sheet — 13-5/8" 10M Cameron Type U Double* (`sources/pdf/quailtools-13-625-10m-double-u-bop.pdf`), generated 2025-06-19 | Quail Tools (rental) | Public PDF | Dimensions for one specific configuration (upper standard bonnets, lower large-bore + tandem boosters) | Third-party secondary. Says it was "generated from material provided by the manufacturer where available" |
| SRC-DM | drillingmanual.com "Cameron U BOP" article | Drilling Manual | Public web | Nothing (it cites no sources) | Not used as evidence |
| — | Scribd 986535494 (Operation Manual, 28 pp.), Scribd 416211245 (U & UM catalog, 64 pp.) | Cameron (uploaded by third parties) | **Paywalled. Only the title page is visible** | Nothing | Not accessible. Also see §7 on redistribution |
| — | Human Atlas repo `ashemag/human-atlas` | Open source | Public | UX and architecture reference only | — |

Every claim below cites a source ID and page. "p." means the catalog page number printed in the PDF.

---

## 1. Documented component tree (13-5/8" 10,000 psi, Model II)

Item numbers are the catalog balloon numbers (p.12 list = p.9 drawing SD17500). "Qty" is per **double** BOP (per single in brackets). The grouping into sub-assemblies is **my derivation from part names and the p.6/p.9 figures (tier E2)**. The catalog itself gives a flat list.

```
Cameron U BOP 13-5/8" 10,000 psi WP (double shown in p.9 drawing; single also catalogued)
├── Body (item 1) — forged; no part number listed ("-----")                       [p.12, p.5]
│   ├── Top & bottom connections: 13-5/8" 10K, type 6BX flange std for 10k WP        [p.8]
│   ├── Side outlets (optional, up to 4-1/16", beneath each ram set)                 [p.8]
│   └── Ram cavities ×2 (double) — geometry undocumented
├── Bonnet Assembly ×4 [×2] (one each side of each cavity; standard L = R part numbers)
│   ├── Structure
│   │   ├── Intermediate Flange (2)          ├── Bonnet (3)
│   │   ├── Bolt, Bonnet (12) ×16 [8]        ├── O-Ring, Bonnet Bolt Retainer (34) ×16 [8]
│   │   ├── Cap Screw, Int Flange to Bonnet (35) ×48 [24]
│   │   ├── Pin, Ram Guide (23) ×8 [4]       └── Lifting Eye (38) ×2 [2]
│   ├── Ram operating system (closes/opens ram)
│   │   ├── Cylinder, Operating (6)
│   │   ├── Piston, Operating (5) — one part; carries connecting-rod end and tail-rod end
│   │   ├── Lip Seal, Operating Piston (26)  ├── Wear Ring, Operating Piston (42)
│   │   ├── O-Ring, Operating Cylinder (24) ×8 [4]
│   │   ├── O-Ring, Operating Piston Rod to Int Flg (25)
│   │   ├── Seal Ring, Connecting Rod (20)   ├── Ring Back-Up (21) ×8 [4] (10k/15k only)
│   │   ├── Seal Ring, Tail Rod (27)         └── O-Ring, Wiping (28)
│   ├── Ram-change / bonnet-moving system
│   │   ├── Cylinder, Ram Change (11) ×8 [4]
│   │   ├── Piston, Ram Change/Open (9)      ├── Piston, Ram Change/Close (10)
│   │   └── O-Rings 29–33 (piston-to-body, rod-to-int-flg, cyl-to-int-flg, cyl-to-bonnet, piston)
│   ├── Manual locking system (standard lock)
│   │   ├── Housing, Locking Screw (7)       ├── Locking Screw (8)
│   │   ├── Stud, Locking Screw Housing (13) ×32 [16]
│   │   └── Nut, Locking Screw Housing (14) ×32 [16]
│   ├── Secondary (plastic-packing) connecting-rod seal
│   │   ├── Check Valve, Plastic Packing (15)  ├── Screw, Plastic Packing (16)
│   │   ├── Pipe Plug, Plastic Packing (17)    ├── Ring, Plastic Packing (18)
│   │   ├── Ring, Plastic Energizing (19)      └── Packing, Plastic (39) ×20 [10] (not drawn)
│   ├── Bleeder: Gland, Bleeder (36); Plug, Bleeder (37)
│   └── Misc: Washer (40); Ring, Retainer (41); Spacer, Shear (43) (qty "--", not drawn)
├── Seal, Bonnet (22) ×4 [2] — bonnet-to-body face seal (alt.: bonnet seal carrier, p.60)
├── Ram Assembly (4) ×4 [2] — 644225-( ) family; dash number = ram type/pipe size (p.43)
│   ├── Ram body   ├── Packer   └── Top seal (644223-01-00-01 for 13-5/8" 3–10k pipe rams)
│   └── Variants: pipe, blind, VBR-II, FLEXPACKER(-NR), shearing blind (SBR), H2S SBR,
│       severe-service SBR, ISR shear (p.43–55)
└── Options / accessories (documented with part numbers)
    ├── Large-bore shear bonnet (L/R assemblies) + softgoods kit       [p.18–19]
    ├── Tandem booster, composite style (11" 15k & 13-5/8" 3/5/10k)   [p.21]
    ├── Bonnet seal carrier                                           [p.60]
    ├── Optional ram wear pads (needs ram block modification)         [p.59]
    ├── CAMRAM 350 packers/top seals; CAMLAST bonnet & conn-rod seals [p.57–59]
    ├── Lifting plate 50 t / 100 t                                    [p.17]
    ├── Bonnet rebuild softgoods kit                                  [p.15–16]
    ├── Standard tools (ram lube, box wrench, Allen wrench, handwheel, U-joint, extension) [p.40]
    └── Wedgelock (hydraulic lock) — documented as an option [p.5, SRC-SLB-DS]; NO part numbers
```

**What the documents do NOT support in your draft tree:**
- "Connecting Rod" as its own mesh or part. You can show it as a *named region* of item 5, labelled "part of Piston, Operating (item 5)".
- "Hydraulic System" as an assembly of parts. Build it as a *system filter* over items 5, 6, 9–11, 24–33 plus a schematic overlay of passages. The passage routing is only shown schematically on p.6.
- "Locking Components" as wedgelocks. For this model they are items 7, 8, 13 and 14 (manual locking screw).

## 2. Part numbers available

All 13-5/8" 10,000 psi part numbers were extracted by script (`scripts/research/extract_catalog.py`) into `data/extracted/cameron-catalog-13-5-8-10k.json`. No value was typed by hand. Main list (p.12, 10,000 psi Model II column):

| # | Description | Qty dbl | P/N | # | Description | Qty dbl | P/N |
|---|---|---|---|---|---|---|---|
| 1 | Body | 1 | *not listed* | 23 | Pin, Ram Guide | 8 | 030313-01 |
| 2 | Intermediate Flange | 4 | 236499-34-11-02 | 24 | O-Ring, Operating Cylinder | 8 | 702645-45-51 |
| 3 | Bonnet | 4 | 031241 | 25 | O-Ring, Op. Piston Rod to Int Flg | 4 | 018492-90 |
| 4 | Ram Assembly | 4 | 644225-( ) | 26 | Lip Seal, Operating Piston | 4 | 710538 |
| 5 | Piston, Operating | 4 | 2245074-01-01 | 27 | Seal Ring, Tail Rod | 4 | 212741-34-00-01 |
| 6 | Cylinder, Operating | 4 | 030274-01-70 | 28 | O-Ring, Wiping | 4 | 702645-33-71 |
| 7 | Housing, Locking Screw | 4 | 030308-03 | 29 | O-Ring, Ram Change Piston to Body | 8 | 702645-32-81 |
| 8 | Locking Screw | 4 | 030307 | 30 | O-Ring, RC Piston Rod to Int Flg | 8 | 702645-33-31 |
| 9 | Piston, Ram Change/Open | 4 | 031239-03 | 31 | O-Ring, RC Cylinder to Int Flg | 8 | 702645-34-61 |
| 10 | Piston, Ram Change/Close | 4 | 031238-03 | 32 | O-Ring, RC Cylinder to Bonnet | 8 | 702645-42-51 |
| 11 | Cylinder, Ram Change | 8 | 030273-01-70 | 33 | O-Ring, Ram Change Piston | 8 | 702645-33-81 |
| 12 | Bolt, Bonnet | 16 | 2010181-06-01 (!) | 34 | O-Ring, Bonnet Bolt Retainer | 16 | 702645-23-91 |
| 13 | Stud, Locking Screw Housing | 32 | 219061-14-06-01 (!) | 35 | Cap Screw, Int Flange to Bonnet | 48 | 702585-25-00-54 |
| 14 | Nut, Locking Screw Housing | 32 | 2709000-14-01 | 36 | Gland, Bleeder | 4 | 017454-08 |
| 15 | Check Valve, Plastic Packing | 4 | M517988 | 37 | Plug, Bleeder | 4 | 017454-09 |
| 16 | Screw, Plastic Packing | 4 | 005940-09 | 38 | Lifting Eye | 2 | 011849-01 |
| 17 | Pipe Plug, Plastic Packing | 4 | 005930-05-10 | 39 | Packing, Plastic | 20 | 07650-25 (!) |
| 18 | Ring, Plastic Packing | 4 | 012469-24 | 40 | Washer | 4 | 689523-01 |
| 19 | Ring, Plastic Energizing | 4 | 018586-01 | 41 | Ring, Retainer | 4 | 018572-85 |
| 20 | Seal Ring, Connecting Rod | 4 | 212741-36-00-01 | 42 | Wear Ring, Operating Piston | 4 | 049223-01 |
| 21 | Ring Back-Up | 8 | 021792-26 | 43 | Spacer, Shear | -- | 687117-03 |
| 22 | Seal, Bonnet | 4 | 644197-03-00-01 | | | | |

(!) = printed value differs from the neighbouring pressure columns in a way that looks like a catalog typo. Show these exactly as printed, with a "print anomaly — confirm with SLB" flag. Do not correct them. Full list of anomalies is in the JSON (`knownPrintAnomalies`).

**Other 13-5/8" 10k part numbers found** (all SRC-CAM-CAT-2014):
- Pipe rams (3,000/5,000/10,000 psi), top seal 644223-01-00-01, p.43. Examples: blind 644225-01-00-01 (ram 044147-01-00-01, packer 644224-01-00-01); 5" pipe 644225-14-00-01 (ram 644738-03-00-01, packer 644224-14-00-01). 38 table rows in the JSON.
- Shearing blind ram, 5k & 10k (p.48): upper subassy 046748-01-00-01, body 046749-01-00-01, blade packer 644435-01-00-01, side packers 046751-01-00-02 / 046752-01-00-02; lower subassy 046748-02-00-01, body 046750-01-00-01, top seal 644223-01-00-01.
- H2S SBR (p.49), severe-service H2S SBR (p.50), ISR shear ram (p.52), VBR-II (4 ranges, p.54), FLEXPACKER-NR (3 ranges, p.55), CAMRAM 350 top seal 644707-01-00-01 (p.57).
- Large-bore shear bonnet, 10,000 psi (p.18): assembly R 614498-01-70-01, L 614498-02-70-01; int. flange/shear 236499-34-21-03; bonnet/shear 614772-01; operating piston/shear 2245074-02-01; lip seal 710542; wear ring 049223-04. Softgoods kit 644860-07 (p.19).
- Bonnet rebuild softgoods kit (pipe) 644909-03 (p.16). Composite tandem booster 2010886-01, repair kit 2164148-02 (p.21).
- Bonnet seals: nitrile 644197-03-00-01, CAMLAST 644573-03-00-01. Connecting-rod seals: nitrile 212741-36-00-01, CAMLAST 645077-36-00-01 (p.59).
- Seal carrier 645507-01-00-02 ×2, retainer ring 702645-27-91 ×2, bonnet seals 645509-01-00-01 ×4 (p.60). Wear pads L 2011277-01 / R "20112277-02" (!), screws 644349-01 ×4 (p.59).
- Lifting plate 644930-01 (50 t) or 644930-05 (100 t) (p.17). Tools for 13-5/8" 10k: 713878, 713114-13, 008721-01, 005298, 006018-03, 005526 (p.40).

## 3. Internal components with documentation

Documentation here means a name plus a part number plus a quantity. For most internals it also means a place in the exploded view. **Function** is documented for only a few parts:

| Documented function | Source |
|---|---|
| Rams are pressure-energized: wellbore pressure increases the sealing force and keeps the seal if hydraulic pressure is lost | p.5; SRC-SLB-DS |
| Ram closing pressure closes the rams. With the bonnet bolts removed, closing pressure opens the bonnet. Opening pressure opens the rams and later closes the bonnets. Rams are pulled outward before the bonnets move toward the body. Hydraulic pressure then draws the bonnets tight against the body, and the bolts are reinstalled | p.6 |
| Wedgelocks lock the ram hydraulically and hold it mechanically when pressure is released. Sequence caps interlock them. A pressure-balance chamber is used subsea | p.5; SRC-SLB-WEB |
| Bonnet seal carrier: a bore-type seal that replaces the face seal. Sealing does not depend on bolt torque. One seal sits in the body bore and one in the intermediate flange bore | p.60 |
| Pipe rams are self-feeding, have a large packer rubber reservoir, and packers lock in place. H2S service per NACE MR-01-75. CAMRAM top seals are standard | p.41 |
| SBRs shear the pipe, then bend the lower section so the rams can close and seal. They can be used as blind rams | p.47 |
| "Internal reversible piston provides additional force necessary for shearing" | SRC-SLB-DS (general, not size-specific) |
| Most operating-system seals can be replaced with the bonnet in the ram-change position | SRC-SLB-DS |

**Function undocumented** (name and part number only): plastic packing system (15–19, 39), bleeder (36–37), shear spacer (43), washer (40), retainer ring (41), guide pins (23). Their purpose can be *inferred* from their names, for example "secondary seal injected through the check valve". That is a tier-E2/E3 inference and must be labelled as one.

## 4. Components with drawings

| Drawing | What it shows | Scale/dims |
|---|---|---|
| p.9 **SD17500 "Double U BOP"** exploded view | Balloons for items 1–38, 40, 41, 42 in assembly order, plus a 3D view of an assembled double. Items 39 and 43 are not drawn. `*` marks recommended spares: 18–22, 24–34, 42 | **Not to scale. No dimensions.** Generic across sizes |
| p.6 hydraulic control system: section plus 3D cutaway | Passage routing, "Ram Open, Bonnet Closed" (green) vs "Ram Closed, Bonnet Open" (blue), piston/rod/tail rod, ram-change cylinders | Schematic, no dims |
| p.41 pipe ram sketch Sd-10825 | Ram body, packer, top seal | No dims |
| p.53 DSI/DVS ram sketch | Blade seal, side packers, bodies | No dims |
| p.15 SD 017515 bonnet softgoods | Seal locations | No dims |
| p.8 dimension letters A-1 … J | Defines dimension *names* | **The dimension chart itself is missing** from this edition for the U BOP. It is present only for the UM |

## 5. Dimensions available

The only dimensions for the U BOP 13-5/8" 10k are *overall* dimensions, and they come from rental sheets.

| Quantity | Value | Source | Note |
|---|---|---|---|
| Nominal bore | 13-5/8" (13.625 in) | all | |
| Working pressure | 10,000 psi | all | |
| Height, double, flanged | 66.625 in | SRC-PAT | SRC-QT: 66.630 in |
| Length, bonnets closed | 114.125 in | SRC-PAT | SRC-QT "closed & locked": 115.66 in (!) |
| Length, bonnets opened | 172.750 in | SRC-PAT | SRC-QT "open & unlocked": 175.54 in (!) |
| Length with large-bore + tandem boosters, closed/open | 153.625 / 212.250 in | SRC-PAT | SRC-QT: 160.24 / 220.92 in (!) |
| Weight, double, standard | 18,400 lb | SRC-PAT | SRC-QT 26,810 lb is a different configuration |
| Hydraulic operating pressure / max | 1,500 / 3,000 psi | SRC-PAT, SRC-QT | **Not in the Cameron catalog** |
| Fluid to open / close (standard bonnet, 1 set) | 5.5 / 5.8 gal | p.7 | matches SRC-PAT, SRC-QT |
| Closing / opening ratio (standard) | 7.0:1 / 2.3:1 | p.7 | SRC-QT prints close 6.80 (!) |
| Large-bore shear bonnet: open/close gal, ratios | 10.5 / 10.9 gal, 10.8:1 / 4.5:1 | p.7 | |
| Locking screw turns (each end) | 32 | p.7 | |
| Hydraulic ports | 1" NPT, two per ram set. Wedgelock ports ½" NPT | p.8 | |
| Bonnet bolt torque | 14,500 ft·lb (API lube) / 7,500 ft·lb (moly) | SRC-PAT | SRC-QT: 8,982 ft·lb (moly) (!) **conflict** |
| Flange bolting / gaskets | 1-7/8" × 17-3/4" ×20 per 13-5/8" flange; BX-159; outlets 4-1/16" 10K, BX-155 | SRC-PAT (+SRC-QT gaskets) | |

**Not available anywhere public:** body forging dimensions, cavity dimensions, ram block dimensions, bonnet/cylinder/piston diameters and strokes, bolt circle, wall thicknesses, all internal clearances.

## 6. Missing information

For each of these the app must display **"Not available in verified public documentation."**

- **Materials** for every part. The only material facts are: forged body (closed-die forgings, p.8); nitrile connecting-rod seals (p.59); CAMLAST elastomer in CAMRAM 350 (p.57); SBR blades are SSC-susceptible while SBR bodies are SSC-resistant (p.47); NACE and API 16A suitability statements.
- Tolerances, surface finishes, heat treatment.
- Internal geometry and every part dimension.
- Seal cross-sections and O-ring sizes. The 702645-xx-xx numbering *may* encode a size, but that is undocumented. Do not decode it.
- Maintenance, disassembly and test procedures: they are in the paywalled manual.
- Rated temperatures and elastomer temperature classes.
- Wedgelock hardware for 13-5/8" 10k: no part numbers or drawings.
- Shearing capability for specific pipe grades: the catalog refers to Engineering Bulletin EB702D, which is not public.
- Hang-off loads for 13-5/8" specifically. The p.47 table does not say which BOP size it covers, and it refers to EB636D.
- The body part number (printed as "-----").
- Which revision of the 13-5/8" 10k body you are modelling. Pre-2014 bodies may lack the bore seal needed for the seal carrier (p.5).

## 7. Does an accurate or legal 3D model or CAD file exist?

**No public OEM CAD exists.** Searches of SLB, GrabCAD and the general web turned up no Cameron U BOP CAD from SLB/Cameron. GrabCAD has community BOP models. They are user-made, not OEM geometry, and each has its own licence. They are not a source of truth.

Legal points. This is not legal advice; get a review before any public release.
- **OEM CAD** would need a licence or NDA from SLB. If you or your employer have a legitimate relationship with SLB, ask for a *simplified envelope/marketing model*. It is the one route to tier-1 geometry.
- **Scribd uploads** of OEM manuals are third-party redistributions. Treat them as unauthorized sources. Get the manual through SLB or the equipment owner instead.
- **The Cameron catalog** is copyrighted. Citing facts from it (names, part numbers, quantities, with attribution) is the intended use of a parts catalog. Do **not** ship the PDF or its drawings/renders inside a public app. Keep `sources/` out of the deployed bundle.
- **Trademarks** such as U, UM, CAMRAM, CAMLAST, FLEXPACKER and VBR belong to SLB/Cameron. Use them only to refer to the product, and add a clear "not affiliated with or endorsed by SLB/Cameron" notice. Do not use the Cameron or SLB logo.
- **Your own reconstruction** is legal to create and publish if it is not traced from copyrighted drawings in a way that copies their expression. Build from the part list, the topology and the published overall dimensions.

## 8. Best method to build the 3D model

**Recommendation: parametric, code-generated geometry driven by a provenance-tagged parameter file.** Do not hand-sculpt in Blender.

1. **Keep a `geometry-params` file** for every dimension the generator uses. Each entry records its value, unit, **tier** (T1 verified manufacturer / T2 reconstructed from documentation / T3 educational approximation), source ID and page, and a free-text rationale. Example: overall closed length 114.125 in is **T2** (SRC-PAT). Operating cylinder bore is **T3** ("sized to fit the envelope; no public value").
2. **Generate the meshes in TypeScript** with three.js primitives, lathe and extrude geometry, and CSG (three-bvh-csg) for the cavities and bores. Run it in a build script and export GLB (with `userData.componentId` and `userData.geometryTier` on every node). The same code can also run live for debugging.
3. **Build from the topology outward.** Take part order and adjacency from SD17500 and the p.6 cutaway (T2 for *arrangement*). Take the overall size from SRC-PAT (T2). Everything else is T3.
4. **Upgrade in place.** When a real value arrives (licensed CAD, the manual, or a physical measurement with the owner's permission), change one parameter, set its tier and source, and regenerate. Nothing else changes.
5. **Render the tier visibly.** Use a per-mesh badge and an optional "provenance colour" mode (T1 solid, T2 hatched, T3 translucent or dashed outline). Show a permanent footer: "Educational reconstruction. Not Cameron/SLB CAD."

Why this approach: accuracy beats appearance, and this method makes every millimetre auditable. An artist-made mesh hides which dimensions were invented. The best upgrade path is photogrammetry or caliper measurement of a disassembled bonnet at a service shop. It is the only route to real internal geometry without SLB CAD.

## 9. Database structure

Store the data as a static, versioned JSON dataset in git, validated with zod at build time. There is no server database. Every change to an engineering claim then goes through review. The core rule: **every engineering field is a `Claim`, never a bare value.**

```ts
type Tier = 'T1_verified_manufacturer' | 'T2_reconstructed_from_docs' | 'T3_educational_approximation';
type Confidence = 'A' | 'B' | 'C' | 'D';            // see §Coverage legend

interface SourceRef { sourceId: string; page?: number; locator?: string; quote?: string }
interface Claim<T> { value: T; sources: SourceRef[]; confidence: Confidence;
                     conflicts?: { value: T; sources: SourceRef[] }[]; note?: string }
// UI rule: a missing Claim renders "Not available in verified public documentation."

interface Source   { id: string; title: string; publisher: string; kind: 'oem'|'third_party'|'derived';
                     url?: string; sha256?: string; accessed: string; license: string }
interface Component {
  id: string;                        // 'bonnet.L1.operating-piston'
  catalogItem?: number;              // 5
  name: string;                      // exact catalog description
  aliases: string[];                 // 'connecting rod', 'op piston'
  assemblyId: string; systemIds: string[];   // 'ram-operating', 'hydraulic', 'seals', 'locking', 'structure', 'fasteners'
  instance?: { side: 'L'|'R'; cavity: 'upper'|'lower' };
  partNumber?: Claim<string>; qtyPerAssembly?: Claim<number>;
  function?: Claim<string>; material?: Claim<string>; dimensions?: Record<string, Claim<number>>;
  drawingRefs: SourceRef[]; recommendedSpare?: Claim<boolean>;
  geometry: { meshIds: string[]; tier: Tier; paramIds: string[] };
}
interface Assembly  { id: string; name: string; parentId?: string; childIds: string[]; explodeVector: [number,number,number] }
interface System    { id: string; name: string; description: Claim<string>; color: string }
interface Connection{ id: string; from: string; to: string;
                      kind: 'mechanical'|'hydraulic'|'seal-interface'|'fastened'|'sliding'; basis: Claim<string> }
interface GeometryParam { id: string; value: number; unit: 'in'|'mm'; tier: Tier; sources: SourceRef[]; rationale: string }
interface AnimationDef  { id: string; name: string; basis: Claim<string>; tracks: { componentId: string; axis: 'x'|'y'|'z'; from: number; to: number; t0: number; t1: number }[] }
```

Files: `data/sources.json`, `data/components/*.json`, `data/assemblies.json`, `data/systems.json`, `data/connections.json`, `data/geometry-params.json`, `data/animations.json`. The validator fails the build if a Claim has no source, if a source ID is unknown, or if a component has no geometry tier.

## 10. Application architecture

Human Atlas uses Vite, React, three.js and shadcn/ui on Vercel. Its AI hook is two WebMCP tools, `find_anatomy` and `inspect_anatomical_structure`, registered through `modelContext.registerTool()`. Its meshes are batched, with per-structure GPU textures for visibility and selection. With about 150 meshes (43 items × instances), this project does not need batching at the start.

- **Client:** Vite + React + TypeScript + React Three Fiber + drei + Tailwind (+ shadcn/ui). A **zustand viewer store** holds the selection, hidden and isolated sets, explode factors (global and per assembly), x-ray, active systems, animation state and camera target.
- **Command bus:** every viewer action is a typed command: `selectComponent`, `isolateComponent`, `hideComponent`, `explodeAssembly`, `focusCamera`, `showSystem`, `showConnections`, `playAnimation`, `setXray`. The UI, the keyboard, URL deep links and the AI all dispatch the same commands. The AI therefore cannot do anything a user cannot.
- **AI assistant:** a serverless endpoint (Vercel Function) calls Claude with tool use.
  - Knowledge tools run server-side against the dataset: `search_components`, `get_component`, `get_source`.
  - Viewer tools are returned to the client as commands.
  - The system prompt limits engineering statements to facts returned by tools, with source citations.
  - A **post-response validator** extracts every part-number-like token and every number with a unit from the answer. If any does not appear in the tool results for that turn, the validator replaces it with the "Not available…" string.
  - "Explain how the BOP closes" is answered from the p.6 claims plus a `playAnimation('close')` command.
- **Animations:** keyframed translations only. Operating piston, rod and ram move inward, and the bonnet moves on the ram-change cylinders. Every animation cites its `basis` Claim (p.6). Stroke lengths are T3 and labelled as such.
- **Hosting:** static site plus one function. The `sources/` folder is never deployed.

## 11. Recommended folder structure

```
slb project/
├── docs/research/AUDIT.md            ← this file
├── sources/                          ← PRIVATE: source PDFs + renders, never deployed (.gitignore'd PDFs)
├── data/
│   ├── extracted/cameron-catalog-13-5-8-10k.json   ← machine extraction (done)
│   ├── sources.json  components/  assemblies.json  systems.json
│   ├── connections.json  geometry-params.json  animations.json
├── scripts/
│   ├── research/extract_catalog.py   ← done
│   ├── validate-data.ts              ← zod: every Claim sourced, ids resolve
│   └── build-model.ts                ← params → GLB with userData
├── src/
│   ├── app/            (App.tsx, routes, layout)
│   ├── viewer/         (Scene, BopModel, materials, xray, explode, selection, camera, animations)
│   ├── geometry/       (parametric part generators, one file per part family)
│   ├── state/          (viewer store, command bus)
│   ├── data/           (typed loaders, search index)
│   ├── panels/         (ComponentTree, DetailPanel, SearchBar, SystemFilters, ProvenanceBadge)
│   ├── assistant/      (chat UI, command executor)
│   └── lib/
├── api/assistant.ts    (serverless: Claude + knowledge tools + validator)
└── tests/              (unit: data, commands; e2e: Playwright flows)
```

## 12. Development roadmap

| Phase | Deliverable | Exit test |
|---|---|---|
| 0 (done) | Research audit, source register, programmatic part-number extraction | This document |
| 1 | Dataset: sources, 43 components × instances, assemblies, systems, connections, schema, validator | `validate-data` passes. Every rendered field traces to a source or shows the "Not available" string |
| 2 | Parametric geometry v0 (T2 envelope + T3 parts), GLB export, R3F viewer with orbit/zoom/pan, pick, tree, detail panel, search | Click any of the ~150 meshes → the correct catalog item and part number appear |
| 3 | Hide/isolate, x-ray, global and per-assembly explode, system filters, connections overlay, provenance mode | Playwright E2E for each control, desktop and mobile |
| 4 | Animations: ram close/open, bonnet open via ram change, lock | Each animation shows its source claim |
| 5 | AI assistant with tools and the numeric/part-number validator | Adversarial eval set: invented part numbers, materials and torques must all come back as "Not available…" |
| 6 | Mobile layout, performance, accessibility | Mid-range phone at 60 fps. Lighthouse check |
| 7 | Accuracy upgrades: get the OEM manual legitimately, SME review, measured geometry | Parameters move from T3 to T2 |

## Coverage table

Legend. **Confidence:** A = OEM document, value read directly. B = OEM document with a print anomaly or ambiguity. C = third-party secondary only. D = derived or inferred (label it in the UI). — = nothing.
**3D Geometry:** T2-pos = arrangement and count from SD17500/p.6. T3 = shape and size are an educational approximation. No component reaches T1.
Source "CAT p.12/9" means SRC-CAM-CAT-2014, parts list p.12, drawing p.9.

| Component (item) | Documented | Part Number | Drawing | Dimensions | 3D Geometry | Source | Confidence |
|---|---|---|---|---|---|---|---|
| Body (1) | Yes (name, forged, flanges, outlets) | Not listed | p.9 (3D view) | Overall height only (third-party) | T2-pos (envelope) / T3 | CAT p.5, 8, 9, 12; PAT; QT | A (name) / C (dims) |
| Top/bottom flange 13-5/8" 10K 6BX | Yes | — (BX-159 gasket) | p.9 | Bolting 1-7/8"×17-3/4" ×20 | T3 | CAT p.8; PAT | A / C |
| Side outlet 4-1/16" 10K (optional) | Yes | — (BX-155 gasket) | p.9 | Size only | T3 | CAT p.8; PAT | A / C |
| Intermediate Flange (2) | Name, P/N, qty | 236499-34-11-02 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Bonnet (3) | Name, P/N, qty | 031241 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Ram Assembly (4) | Yes + variants | 644225-( ) family | p.9, p.41 | — | T2-pos / T3 | CAT p.12, 41–55 | A |
| ↳ Ram body / packer / top seal | Yes | per p.43 (e.g. 644738-03-00-01 / 644224-14-00-01 / 644223-01-00-01 for 5") | p.41 | — | T3 | CAT p.43 | A |
| Piston, Operating (5), incl. rod and tail-rod ends | Name, P/N, qty. Function p.6 | 2245074-01-01 | p.9, p.6 | — | T2-pos / T3 | CAT p.12/9/6 | A |
| "Connecting rod" (as separate part) | **No**: region of item 5 | — | p.6 | — | T3 (sub-region of 5) | CAT p.12, 20 (seal name) | D |
| Cylinder, Operating (6) | Name, P/N, qty | 030274-01-70 | p.9, p.6 | — | T2-pos / T3 | CAT p.12/9 | A |
| Housing, Locking Screw (7) | Name, P/N, qty | 030308-03 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Locking Screw (8) | Name, P/N, qty, 32 turns | 030307 | p.9 | Turns only | T2-pos / T3 | CAT p.12/9/7 | A |
| Piston, Ram Change/Open (9) | Name, P/N, qty. Function p.6 | 031239-03 | p.9 | — | T2-pos / T3 | CAT p.12/9/6 | A |
| Piston, Ram Change/Close (10) | Name, P/N, qty. Function p.6 | 031238-03 | p.9 | — | T2-pos / T3 | CAT p.12/9/6 | A |
| Cylinder, Ram Change (11) | Name, P/N, qty | 030273-01-70 | p.9, p.6 | — | T2-pos / T3 | CAT p.12/9 | A |
| Bolt, Bonnet (12) | Name, P/N, qty, torque (3rd-party) | 2010181-06-01 (!) | p.9 | Torque conflicting | T2-pos / T3 | CAT p.12/9; PAT; QT | B / C |
| Stud, Locking Screw Housing (13) | Name, P/N, qty | 219061-14-06-01 (!) | p.9 | — | T2-pos / T3 | CAT p.12/9 | B |
| Nut, Locking Screw Housing (14) | Name, P/N, qty | 2709000-14-01 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Check Valve, Plastic Packing (15) | Name, P/N, qty | M517988 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Screw, Plastic Packing (16) | Name, P/N, qty | 005940-09 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Pipe Plug, Plastic Packing (17) | Name, P/N, qty | 005930-05-10 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Ring, Plastic Packing (18) * | Name, P/N, qty, spare | 012469-24 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Ring, Plastic Energizing (19) * | Name, P/N, qty, spare | 018586-01 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Seal Ring, Connecting Rod (20) * | Name, P/N, qty. Nitrile (p.59) | 212741-36-00-01 | p.9 | — | T2-pos / T3 | CAT p.12/9/59 | A |
| Ring Back-Up (21) * | Name, P/N, qty | 021792-26 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Seal, Bonnet (22) * | Name, P/N, qty. CAMLAST alt. | 644197-03-00-01 | p.9 | — | T2-pos / T3 | CAT p.12/9/59 | A |
| Pin, Ram Guide (23) | Name, P/N, qty | 030313-01 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| O-Rings 24, 25, 28–34 * | Name, P/N, qty each | see §2 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Lip Seal, Operating Piston (26) * | Name, P/N, qty | 710538 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Seal Ring, Tail Rod (27) * | Name, P/N, qty | 212741-34-00-01 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Cap Screw, Int Flange to Bonnet (35) | Name, P/N, qty | 702585-25-00-54 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Gland, Bleeder (36) / Plug, Bleeder (37) | Name, P/N, qty | 017454-08 / -09 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Lifting Eye (38) | Name, P/N, qty, ram lifting use p.6 | 011849-01 | p.9 | — | T2-pos / T3 | CAT p.12/9/6 | A |
| Packing, Plastic (39) | Name, P/N, qty | 07650-25 (!) | **Not drawn** | — | T3 | CAT p.12 | B |
| Washer (40) / Ring, Retainer (41) | Name, P/N, qty | 689523-01 / 018572-85 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Wear Ring, Operating Piston (42) * | Name, P/N, qty | 049223-01 | p.9 | — | T2-pos / T3 | CAT p.12/9 | A |
| Spacer, Shear (43) | Name, P/N (qty "--") | 687117-03 | **Not drawn** | — | T3 (or omit) | CAT p.12 | B |
| Hydraulic passages / ports | Schematic + 1" NPT ports | — | p.6 | Port size only | T3 overlay | CAT p.6, 8 | A (ports) / D (routing) |
| Manual lock system (7, 8, 13, 14) | Yes | see rows | p.9 | Turns | T2-pos / T3 | CAT p.7, 12 | A |
| Wedgelock (option) | Function only | **None** | None | ½" NPT port | Do not model (or T3, flagged) | CAT p.5, 8; SLB-DS | A (function) |
| Shearing blind ram (option) | Yes | 046748-01/-02-00-01 subassys etc. | p.47 | — | T3 | CAT p.48 | A |
| VBR-II / FLEXPACKER-NR / ISR (options) | Yes | p.52, 54, 55 | p.53–55 | Pipe ranges | T3 | CAT | A |
| Large-bore shear bonnet (option) | Yes | 614498-01/02-70-01 | — | 3rd-party lengths | T3 | CAT p.18–19; PAT; QT | A / C |
| Tandem booster, composite (option) | Yes | 2010886-01 | p.21 figure | — | T3 | CAT p.21 | A |
| Bonnet seal carrier (option) | Yes + function | 645507-01-00-02 | p.60 | — | T3 | CAT p.60 | A |
| Ram wear pads (option) | Yes | 2011277-01 / 20112277-02 (!) | — | — | T3 | CAT p.59 | B |
| Lifting plate (accessory) | Yes | 644930-01 / 644930-05 | — | Rating 50/100 t | T3 | CAT p.17 | A |
| Materials (all parts) | **No** (except notes in §6) | — | — | — | — | — | — |
| Maintenance procedures | **No** (paywalled manual) | — | — | — | — | — | — |

## Decisions needed from you before Phase 1

1. **Configuration to model.** Rental sheets and SD17500 describe a *double*. Which rams go in which cavity? A common default is upper = pipe ram (for example 5"), lower = shearing blind ram. I recommend a double with 5" pipe rams in the upper cavity and an SBR in the lower, with ram type switchable in the UI.
2. **Audience.** Public website or internal/training use? This changes the legal posture in §7, for example how much of the catalog you cite and whether trademarks appear in the UI.
3. **Better sources.** Do you have legitimate access, through an employer or rig contractor, to the OEM operation manual or a physical unit? Either one is the only way to move geometry and procedures beyond "not available".

## Build status (2026-09-23)

Phases 1 to 6 of the roadmap are implemented in this repository (see `README.md`). Defaults chosen for the three open decisions: a double BOP with 5" pipe rams upper and shearing blind rams lower (switchable in the UI); public-safe handling (no logos, a not-affiliated notice, source PDFs never deployed); geometry at tier T3 until better sources exist. Phase 7 (legitimate OEM manual, SME review, measured geometry) remains open.
