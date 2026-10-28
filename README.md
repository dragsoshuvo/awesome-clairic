# Awesome Clairic [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated list of projects, tools, SDKs, applications, experiments and resources built around [Cloudflare Clairic](https://developers.cloudflare.com/workers-ai/models/clairic/).

Site: **[awesomeclairic.com](https://awesomeclairic.com)** (searchable, with GitHub stars refreshed daily).

Clairic is a System One-style extraction model from Cloudflare, currently in preview. It takes a state (text and up to 4 images) plus a schema of typed fields (`text`, `number`, `date`, `list`, `estimate`, `forecast`, ...) and returns a typed value for every field in one forward pass — exact spans for text, median and intervals for estimates, and a confidence score with null probabilities on every answer. Workers AI id `@cf/cloudflare/clairic`, 65k context, $0.10/M input tokens. Open weights have not been released yet.

Community-maintained. Not affiliated with Cloudflare. A listing means a project meets the [inclusion rules](CONTRIBUTING.md#what-gets-listed), not that it has been reviewed for quality or security; read the code before you depend on it. To add a project, open a pull request or [file an issue](https://github.com/bghira/awesome-clairic/issues/new?template=submit-project.yml). See [CONTRIBUTING.md](CONTRIBUTING.md).

5 entries · last refreshed 2026-10-28

## Contents

- [Official](#official)
- [SDKs & integrations](#sdks-integrations)
- [Agents & tooling](#agents-tooling)
- [Browser & computer use](#browser-computer-use)
- [Applications](#applications)
- [Demos & playgrounds](#demos-playgrounds)
- [Benchmarks & evals](#benchmarks-evals)
- [Fine-tuning & RL](#fine-tuning-rl)
- [Self-hosting & inference](#self-hosting-inference)
- [Other lists](#other-lists)
- [Articles & tutorials](#articles-tutorials)
- [Contributing](#contributing)

## Official

Docs and announcements from Cloudflare.

- [Clairic on Workers AI](https://developers.cloudflare.com/workers-ai/models/clairic/) - Model page for @cf/cloudflare/clairic, the System One-style extraction model in preview: typed fields, usage, input/output schema, context window, and pricing.

## SDKs & integrations

Client libraries, framework integrations, and gateways with Clairic support.



## Agents & tooling

Routers, gates, MCP servers, and skills that put Clairic inside coding agents and agent loops.

- [clairic-mcp](https://github.com/lmarkmann/clairic-mcp) - Remote MCP server for Cloudflare's Clairic extraction model, running on Cloudflare Workers.

## Browser & computer use

Browser, desktop, and mobile automation with Clairic extracting typed data from screens.



## Applications

Products, services, and pipelines that call Clairic.



## Demos & playgrounds

Playgrounds, games, and small experiments you can run.

- [clairic-trust-slider](https://github.com/lucataco/clairic-trust-slider) - Which answers can you trust without checking? Clairic's confidence scores on 1,000 invoice answers, on Cloudflare Workers.
- [clairic-demo](https://github.com/takeenoki/clairic-demo) - A Japanese-language demo of the Clairic extraction model announced by Cloudflare.

## Benchmarks & evals

Benchmarks, evaluations, and head-to-head comparisons.

- [aotn-clairic](https://github.com/tameernoor/aotn-clairic) - Extract first, decide second: Cloudflare's Clairic and Clef compared on Norwegian debt collection emails and invoice parsing.

## Fine-tuning & RL

Training, fine-tuning, and quantization recipes — once open Clairic weights ship.



## Self-hosting & inference

Run Clairic on your own hardware — once open weights ship.



## Other lists

Related curated lists.



## Articles & tutorials

Write-ups, explainers, and discussion.



## Contributing

Pull requests welcome. Edit `data/projects.json` (it drives both this README and the site) and run `npm run validate`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the entry format and inclusion criteria.

## License

[CC0 1.0](LICENSE). Forked from [awesome-clef](https://github.com/rohinrohin/awesome-clef) (also CC0), which forked it from [awesome-jev](https://github.com/hellogumbo/awesome-jev). Linked projects, names and trademarks belong to their owners.
