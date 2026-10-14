# LocalPlumbers (localplumbers.shmor.ai)

A Shmor marketplace (shared rules in `../../CLAUDE.md`): its own brand, design and SEO. A comparison and introduction site for local plumbers in the **UK and USA**. Visitors **choose their country, then region/nation/state, then the job, before searching**, and get a plan for their area: get introduced (quote partners), check before you book (registers / licences), and guides. Repo: `Shmorai/shmor-localplumbers` (private until launch). Status: **building**, with no referral links yet.

## Where things are
| What | Where |
|---|---|
| Card on shmor.ai, search keywords, **referral links**, offers, SEO defaults | `shmor-site.json` |
| Pages (1 JSON file = 1 Google landing page) | `content/` (`home.json` = homepage) |
| Design: header (logo, UK/USA switch), footer | `templates/layout.html` |
| Design: styles | `assets/site.css` (kit defaults at the top; **LocalPlumbers theme** block at the bottom) |
| Country → region → job finder + area plan | `assets/finder.js` (regions, states, job list, safety numbers, checks) |
| Generated output (don't edit by hand) | `index.html`, `*/index.html`, `sitemap.xml`, `robots.txt`, `404.html`, `search/`, `search-index.json` |

## Pages (13)
Home (finder) · find-a-plumber (finder + plan) · emergency-plumbers · leaks-and-burst-pipes · blocked-drains · boiler-repair (UK, Gas Safe) · water-heater-repair (USA) · bathroom-plumbing · plumber-costs · choosing-a-plumber · plumbers-uk · plumbers-usa · how-it-works.
Top menu (`navOrder`): Find a plumber, Emergency, Boilers & heating, Drains, Costs, UK guide, USA guide, How it works.

## The finder (assets/finder.js)
- Any page with `<div data-finder>` in its `"heroHtml"` gets the form; `/find-a-plumber/` also has `<div data-finder-result>` for the plan.
- Steps: 1 country (UK / USA) → 2 region (UK: 9 English regions + Scotland, Wales, Northern Ireland; USA: 50 states + DC grouped by Census region) → 3 town/postcode/ZIP (optional) → 4 job (different lists per country) + how soon. The button stays disabled until country and region are chosen.
- Choices go in the URL hash (`/find-a-plumber/#uk/london/boiler/now`). **The town/postcode never leaves the browser** (sessionStorage only). Country preference is remembered (localStorage `lp-country`) and also set by the UK/USA switch in the header.
- Plan: emergency first steps (gas numbers: GB 0800 111 999, NI 0800 002 001, USA 911/utility) when "Emergency: today" is chosen; step 1 "Get introduced" shows the page's partner block (built from `find-a-plumber.json` → `"partners"`), or a "partners coming soon" note while there are none; step 2 checks (UK: Gas Safe for gas jobs, WaterSafe, CIPHE, SNIPEF for Scotland/NI, Building Regs for cylinders/installs; USA: state or local licence lookup, insurance, permits); step 3 guide links.
- The script adds `&r=uk|us` to every `https://shmor.ai/go/` link once a country is chosen, so per-region referral URLs work.

## Design
"Blueprint and copper", deliberately unlike the other Shmor sites (no full-bleed dark photo heroes): warm paper background #F5F1EA with a faint blue blueprint grid in heroes, pipe-navy ink #0D2238, copper actions #C35F25 (dark #A04B19, soft #FBEADF), water-blue highlights #2563EB (soft #E4EDFF). Fonts: Bricolage Grotesque (headings) + Inter. Split hero: text + finder on the left, framed photo on the right with a solid copper offset shadow (stacks under the text on mobile). Finder is a white card with a hard navy offset shadow. Copper/blue "pipe stripe" at the top of the page and footer. Navy footer and bottom band with a blueprint grid. Logo = copper pipe elbow + blue water drop in a navy rounded square, "Local**Plumbers**" (Plumbers in copper).
**Photos:** free-licence Unsplash images (not Unsplash+), credited, in each page's `"image"`.

## Search routing on shmor.ai
`keywords` in `shmor-site.json` (plumber, boiler repair, blocked drain, water heater, leaking tap…). Tested: "plumber near me", "emergency plumber london", "boiler repair", "blocked drain", "water heater replacement texas", "leaking tap" → LocalPlumbers; "electrician near me", "contractor quote" → Shmor Pros; "dns leak test" → BestVPNs; "heat pump installer" → Shmor Energy. "plumber" and "boiler" were removed from the planned Shmor Pros card.

## Commands (run here)
```bash
node tools/build.js           # rebuild after ANY change to content/, templates/ or shmor-site.json
node tools/build.js --check   # validate only
node tools/serve.js 4007      # preview http://localhost:4007  (preview config "localplumbers")
```
After changing `shmor-site.json`, also run `node tools/sync-network.js` in `../../shmor-ai`.

## Referral links (the money)
None yet. Likely partners: plumber quote marketplaces and directories that run affiliate/referral programmes, ideally with separate UK and US links. When the user provides links:
1. Add to `shmor-site.json` → `"links"`, using per-region URLs where needed: `"url": { "uk": "<exact link>", "us": "<exact link>" }`, plus `"blurb"` (e.g. "Get free quotes from local plumbers"). Paste URLs exactly as given.
2. Add `"partners": ["slug"]` to `find-a-plumber.json` (they appear inside step 1 of the plan) and to the job pages; optionally `"fallback": "slug"` so shmor.ai plumbing searches earn before launch.
3. `node tools/build.js`, sync the master, commit both repos.

## Honesty rules
LocalPlumbers is an introduction service: it doesn't employ, vet or guarantee plumbers (footer + how-it-works + FAQs say so). No invented prices, ratings, reviews or "X plumbers near you" counts. The costs page explains price factors without figures. Safety advice (gas numbers, stopcock, CO) is general guidance pointing to official sources.

## History & decisions
- 2026-10-14: created at the user's request: "comparison and introductions to local plumbers for the UK and USA market, with the option to select country, region etc before search, with a different design from the other sites". Kit improvements made at the same time (copied into every site): page field `"heroHtml"` (raw HTML under the hero intro) and `droplet` + `globe` block icons (the `globe` fix also restored a missing icon on PetSavings' trust bar).
- Chat setup: this site has its own pinned chat titled "LocalPlumbers".

## Ideas / next
Referral links (UK + US quote partners) · a blog answering seasonal searches (frozen pipes in winter, boiler checks before winter, sump pumps in spring) researched against official sources · city pages (e.g. plumbers in London, Manchester, New York, Houston) only with genuinely local content (water company, local licensing body, permit office).
