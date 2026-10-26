#!/usr/bin/env node
// Finds GitHub repos that use Cloudflare Clairic and are not in data/projects.json yet.
// Two signals: repository search (name/description/topics) and code search for the
// model ids (code search needs GITHUB_TOKEN). Prints candidates by default.
//   --add            append candidates that pass the inclusion bar to data/projects.json
//   --report=FILE    write a markdown review report (used as the nightly PR body)
//   --days=N         only repos pushed in the last N days (default 7)
// Nothing is published directly: the nightly workflow opens a pull request for review.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { categorize, RELEVANT } from "./categorize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "data/projects.json");
const data = JSON.parse(readFileSync(file, "utf8"));
const exclude = JSON.parse(readFileSync(resolve(root, "data/exclude.json"), "utf8"));
const args = process.argv.slice(2);
const add = args.includes("--add");
const reportPath = (args.find((a) => a.startsWith("--report=")) || "").slice(9);
const days = Number((args.find((a) => a.startsWith("--days=")) || "--days=7").slice(7));
const since = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);

const known = new Set(data.projects.filter((p) => p.repo).map((p) => p.repo.toLowerCase()));
const skip = new Set(exclude.repos.map((r) => r.toLowerCase()));
const names = new Set(data.projects.map((p) => p.name));
const token = process.env.GITHUB_TOKEN;
const headers = { Accept: "application/vnd.github+json", "User-Agent": "awesome-clairic-discover" };
if (token) headers.Authorization = `Bearer ${token}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const repoQueries = [
  `"cloudflare clairic" pushed:>=${since}`,
  `clairic cloudflare pushed:>=${since}`,
  `clairic workers-ai pushed:>=${since}`,
  `clairic extraction pushed:>=${since}`,
  `clairic "typed fields" pushed:>=${since}`,
  `clairic systemone pushed:>=${since}`,
  `clairic system one pushed:>=${since}`,
  `clairic jev pushed:>=${since}`,
  `topic:clairic pushed:>=${since}`,
];
// Exact model ids / Cloudflare references in source, READMEs, and config.
const codeQueries = ['"@cf/cloudflare/clairic"', '"Cloudflare/clairic"'];

const found = new Map(); // full_name lower -> { repo, evidence:Set }
const note = (r, why) => {
  const key = r.full_name.toLowerCase();
  if (known.has(key) || skip.has(key) || r.fork || r.archived) return;
  if (!found.has(key)) found.set(key, { repo: r, evidence: new Set() });
  found.get(key).evidence.add(why);
};

for (const q of repoQueries) {
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`${q} p${page}: ${res.status}`);
      break;
    }
    const body = await res.json();
    for (const r of body.items || []) {
      // Name/description must say Clairic; topics alone are too easy to stuff.
      if (RELEVANT.test(`${r.full_name} ${r.description || ""}`)) note(r, "description");
      else if (RELEVANT.test(`${r.full_name} ${r.description || ""} ${(r.topics || []).join(" ")}`)) note(r, "topics");
    }
    if ((body.items || []).length < 100) break;
    await sleep(2500);
  }
}

if (token) {
  const codeRepos = new Map();
  for (const q of codeQueries) {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=100&page=${page}`, { headers });
      if (!res.ok) {
        console.warn(`code ${q} p${page}: ${res.status}`);
        break;
      }
      const body = await res.json();
      for (const it of body.items || []) {
        const key = it.repository.full_name.toLowerCase();
        if (!codeRepos.has(key)) codeRepos.set(key, { name: it.repository.full_name, paths: new Set() });
        codeRepos.get(key).paths.add(it.path);
      }
      if ((body.items || []).length < 100) break;
      await sleep(7000); // code search allows ~10 requests/minute
    }
    await sleep(7000);
  }
  for (const [key, { name, paths }] of codeRepos) {
    if (known.has(key) || skip.has(key)) continue;
    const res = await fetch(`https://api.github.com/repos/${name}`, { headers });
    if (!res.ok) continue;
    const r = await res.json();
    if (r.pushed_at.slice(0, 10) < since) continue;
    note(r, `code: ${[...paths].slice(0, 3).join(", ")}`);
  }
} else {
  console.warn("GITHUB_TOKEN not set: skipping code search (model-id usage).");
}

const description = (r) => (r.description || "").trim().replace(/\s+/g, " ");

// Optional: ask Clairic itself (@cf/cloudflare/clairic on Workers AI) whether each candidate really
// uses Clairic, and which category fits. Needs CLOUDFLARE_ACCOUNT_ID and a token with Workers AI access.
// Clairic has no choice/noul fields, so the category is span-extracted: the category ids are embedded
// in the state and the model must copy one of them verbatim.
const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfToken = process.env.CLOUDFLARE_AI_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const categoryIds = data.categories.filter((c) => c.id !== "official").map((c) => c.id).join(", ");
const readme = async (name) => {
  const res = await fetch(`https://api.github.com/repos/${name}/readme`, { headers: { ...headers, Accept: "application/vnd.github.raw" } });
  return res.ok ? (await res.text()).slice(0, 4000) : "";
};
const judge = async (r) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/cloudflare/clairic`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "clairic",
      state: JSON.stringify({
        repository: r.full_name,
        description: r.description || "",
        topics: r.topics || [],
        category_ids: categoryIds,
        readme: await readme(r.full_name),
      }),
      fields: {
        uses_clairic: {
          type: "estimate",
          min: 0,
          max: 1,
          step: 0.05,
          instructions:
            "Probability from 0 to 1 that this repository itself uses Cloudflare's Clairic model (calling @cf/cloudflare/clairic on Workers AI, or supporting Clairic as a named backend). Merely mentioning Cloudflare, Jev, or decision models in general is not enough.",
        },
        category: {
          type: "text",
          instructions: "Copy verbatim the one category id from the state's category_ids list that fits this project best.",
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Workers AI ${res.status}`);
  const { result } = await res.json();
  const uses = result.answers.uses_clairic.value ?? result.answers.uses_clairic.median ?? 0;
  const category = result.answers.category.value || null;
  return { uses, category };
};
if (cfAccount && cfToken) {
  let failed = 0;
  for (const c of found.values()) {
    try {
      c.clairic = await judge(c.repo);
    } catch (e) {
      if (++failed === 3) console.warn(`Clairic judge disabled after errors: ${e.message}`);
      if (failed >= 3) break;
    }
  }
} else {
  console.warn("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN not set: skipping the Clairic relevance check.");
}
const categoryOf = (c) => (c.clairic && c.clairic.category ? c.clairic.category : categorize(c.repo));
const clairicNote = (c) => (c.clairic ? `clairic: uses ${c.clairic.uses.toFixed(2)}, suggests ${c.clairic.category || "(none)"}` : null);

// Inclusion bar for automatic proposals. Everything still goes through PR review.
// - the description itself must say it is about Clairic (not just a code hit in a big repo)
// - a real description and a non-trivial repo (size is in KB)
// - when Clairic judged it, Clairic must agree it really uses Clairic
const qualifies = ({ repo: r, evidence, clairic }) => {
  if (clairic && clairic.uses < 0.5) return false;
  if (!evidence.has("description") && !(clairic && clairic.uses >= 0.85)) return false;
  if (description(r).length < 20) return false;
  if (r.size < 20) return false;
  if (categorize(r) === "lists") return r.stargazers_count >= 5;
  return true;
};
const site = (r) => {
  const h = (r.homepage || "").trim();
  if (!/^https?:\/\//.test(h) || /github\.com|huggingface\.co\/Cloudflare|developers\.cloudflare\.com/i.test(h)) return null;
  return h;
};
const uniqueName = (r) => {
  const base = r.full_name.split("/")[1];
  const name = names.has(base) ? `${base} (${r.full_name.split("/")[0]})` : base;
  names.add(name);
  return name;
};

const rows = [...found.values()].sort((a, b) => b.repo.stargazers_count - a.repo.stargazers_count);
const line = (c) => {
  const r = c.repo;
  return `${qualifies(c) ? "+" : " "}${String(r.stargazers_count).padStart(6)}  ${r.full_name.padEnd(45)} ${(r.language || "-").padEnd(12)} ${categoryOf(c)}\n         ${description(r) || "(no description)"}\n         evidence: ${[...c.evidence, clairicNote(c)].filter(Boolean).join("; ")}${site(r) ? `\n         ${site(r)}` : ""}`;
};

console.log(`${rows.length} candidates pushed since ${since} not yet listed:\n`);
for (const c of rows) console.log(line(c));
console.log(`\n${rows.filter(qualifies).length} pass the bar (+).`);

if (reportPath) {
  const md = (c) => {
    const r = c.repo;
    return `- [${r.full_name}](https://github.com/${r.full_name}) ★${r.stargazers_count} · ${r.language || "-"} · \`${categoryOf(c)}\` — ${description(r) || "_no description_"}  \n  evidence: ${[...c.evidence, clairicNote(c)].filter(Boolean).join("; ")}`;
  };
  const yes = rows.filter(qualifies);
  // Weaker hits, best first: Clairic's own score, then stars.
  const maybe = rows.filter((c) => !qualifies(c)).sort((a, b) => (b.clairic?.uses ?? 0) - (a.clairic?.uses ?? 0) || b.repo.stargazers_count - a.repo.stargazers_count);
  writeFileSync(
    reportPath,
    `Nightly discovery for repos pushed since ${since}.\n\n` +
      `**Before merging:** open each repo and confirm it really uses Clairic. Fix the category or description in \`data/projects.json\` if needed, and move false positives to \`data/exclude.json\`.\n\n` +
      `### Added in this PR (${yes.length})\n\n${yes.map(md).join("\n") || "_none_"}\n\n` +
      `### Needs a manual look, not added (${maybe.length})\n\nCode hits in larger repos, thin descriptions, or tiny repos. Add by hand if they genuinely support Clairic.\n\n${maybe.slice(0, 50).map(md).join("\n") || "_none_"}${maybe.length > 50 ? `\n\n…and ${maybe.length - 50} more; run \`npm run discover\` locally for the full list.` : ""}\n`
  );
}

if (!add) process.exit(0);

const added = [];
for (const c of rows) {
  if (!qualifies(c)) continue;
  const r = c.repo;
  added.push({
    name: uniqueName(r),
    repo: r.full_name,
    site: site(r),
    description: description(r),
    category: categoryOf(c),
    language: r.language || null,
    stars: r.stargazers_count,
    added: today,
    created: r.created_at.slice(0, 10),
    pushed: r.pushed_at.slice(0, 10),
  });
}
if (added.length) {
  data.projects.push(...added);
  data.updated = today;
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
console.log(`Added ${added.length} of ${rows.length} candidates (pushed since ${since}).`);
for (const p of added) console.log(`  + ${p.repo} [${p.category}] ★${p.stars}`);
