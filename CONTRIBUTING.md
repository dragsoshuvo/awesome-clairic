# Contributing

Thanks for adding to the list. The whole directory lives in one file, `data/projects.json`. The README and the site at [awesomeclairic.com](https://awesomeclairic.com) are generated from it.

## Add a project

1. Fork the repo and add an object to the `projects` array in `data/projects.json`:

   ```json
   {
     "name": "clairic-mcp",
     "repo": "lmarkmann/clairic-mcp",
     "site": null,
     "description": "Remote MCP server for Cloudflare's Clairic extraction model, running on Cloudflare Workers.",
     "category": "agents",
     "language": "TypeScript",
     "stars": 0,
     "added": "2026-10-26"
   }
   ```

   - `repo` is `owner/name` on GitHub, or `null` for a project that only has a website.
   - `site` is a live URL (demo, docs, product page) or `null`.
   - `url` is only needed when there is neither a repo nor a site, for example an article.
   - `category` is one of the `id` values in the `categories` array at the top of the file.
   - `stars` and `language` are refreshed automatically for GitHub repos. Leave `stars` at `0`.

2. Check it:

   ```bash
   npm run validate
   ```

3. Open a pull request that changes only `data/projects.json`. Do not commit `README.md` or `site/index.html`; CI regenerates both after merge. One project per PR keeps review quick.

If you would rather not edit JSON, [open an issue](https://github.com/bghira/awesome-clairic/issues/new?template=submit-project.yml) with the link and a sentence about what it does.

## What gets listed

A project qualifies if it has at least one of:

- real Clairic usage: it calls `@cf/cloudflare/clairic` on Workers AI, or runs the open weights once they ship
- a library, SDK, integration, or inference runtime that specifically supports Clairic
- an application, demo, or experiment built with Clairic
- a benchmark or evaluation that includes Clairic
- technical write-ups specifically about Clairic

Not listed: projects that only mention Cloudflare, projects that only support Jev / System One decision models and "should work" with Clairic, generic AI directories, SEO pages, empty or placeholder repos, and duplicates. Clairic speaks its own typed-fields API, not the Clef/Jev questions API; compatibility alone is not enough, we want evidence the project was used or tested with Clairic.

Listing is not endorsement. We check that a project really involves Clairic; we do not audit code quality, security, licenses, or published numbers. Pull requests that remove dead, misleading, or empty entries are as welcome as additions.

## How discovery works

A nightly GitHub Action:

1. **Refreshes** stars, languages, homepages, and renames for every listed repo, rebuilds, and deploys.
2. **Discovers** new repos (`scripts/discover.mjs`) via GitHub repository search (Clairic-specific phrases in names, descriptions, and topics) and code search (`@cf/cloudflare/clairic`, `Cloudflare/clairic`).
3. **Asks Clairic** (optional). When the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets have Workers AI access, Clairic reads each candidate's README and answers two typed fields: the probability it really uses Clairic (an `estimate` from 0 to 1), and the best-fitting category (a `text` field, copied from a list of category ids embedded in the state). Candidates scored below 0.5 are not proposed.
4. **Opens a pull request** with the candidates that pass the bar, plus a list of weaker hits for a manual look. Nothing is published until a maintainer merges it.

Lookalike projects exist ("Clairich", "clairica"), so repository hits need Cloudflare / extraction-model context next to the word. False positives go in `data/exclude.json` so they never come back.

## Maintenance scripts

```bash
npm run refresh                     # update stars, language, homepages, renames, and mark removed repos
npm run discover                    # print Clairic repos that are not listed yet, with the evidence for each
npm run discover -- --add           # append the ones that pass the bar to data/projects.json
npm run discover -- --report=r.md   # also write a markdown review report
npm run validate                    # check data/projects.json (fields, categories, duplicates)
npm run build                       # regenerate README.md, site/index.html, sitemap.xml, robots.txt
npm run dev                         # build and serve the site on http://localhost:4173
```

Set `GITHUB_TOKEN` to avoid rate limits; code search only runs when it is set.

Entries whose repo returns 404 are kept in the data with `"gone": true` and hidden from the README and site until they come back.
