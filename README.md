<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./icon-dark.png" />
    <img src="./icon-light.png" alt="Autopilot" width="144" />
  </picture>
</p>

<div align="center">

# Autopilot

</div>

A focused workspace for turning one important objective into a guarded, reviewable execution loop.

> **The public home of `ryu-autopilot`.** Source, builds, and releases live here —
> binaries for every platform are attached to each release.
>
> This tree is generated from the Ryu monorepo, so commits pushed here
> directly are replaced on the next sync. **Pull requests are welcome** —
> open them here and they are ported into the monorepo, then flow back out.
> Ryu as a whole: https://github.com/amajorai/ryu

## Install

**App:** [Install](ryu://apps/@ryu/autopilot) (opens the Ryu desktop app and asks you to confirm)

**CLI:**

```bash
ryu apps add @ryu/autopilot
```

## Source & build

This is the **source of record** for the app UI. It imports Ryu's private
`@ryu/ui` design system, so it does **not** build standalone outside the
monorepo — it **builds inside the amajorai/ryu monorepo workspace**.
The **shipped bundle below is the built artifact**: a prebuilt single-file
companion bundle is included at [`dist/autopilot.ui.html`](./dist/autopilot.ui.html) —
the runnable UI Ryu loads for this app.

## License

Apache-2.0 — see [LICENSE](./LICENSE).

## The launch chain

1. **One job** — choose the smallest outcome the first release should own and
   write down what it will not do yet.
2. **Positioning** — name the category, current alternatives, market opening,
   differentiation, and value proposition.
3. **First ICP** — narrow by a shared situation and buying trigger; name the
   buyer and who is out of scope.
4. **Outreach + copy** — derive a proof-oriented conversation, headline,
   subhead, and call to action from the same job and ICP.

Autopilot sits upstream of execution tools. It is not another CRM, outbound
sequencer, marketing suite, or generic copy generator. Those tools can act on a
clearer decision; Autopilot keeps the decision coherent before activation.

Autopilot owns the strategy draft, launch-chain state, strategy-pass ledger,
and guardrails. It does not copy CRM, Mail, Social, Workflows, or other app
data. Those apps remain the systems of record, and their own grants and
approval gates still apply to every agent action.

## Ryu primitives used

- `hook:run-agent` dispatches one bounded positioning-first strategy pass
  through the selected agent.
- `storage:kv` stores the strategy draft, launch-chain state, strategy-pass
  history, and local Autopilot log in the app's tenant namespace.
- `core:list_agents` supplies the secret-free runtime catalog for the agent
  picker.
- `shell:integrate` keeps the Companion on Ryu's live theme and host sidebar
  contract.
- `ui:toast` provides operation feedback.

Navigation is contributed through Ryu's sidebar. The Companion does not render a
competing app-owned sidebar.

When no host bridge is available, the UI renders a clearly labeled demo node.
Demo passes update preview state and never call an external agent or tool.

## Build and test

```sh
bun run --cwd apps-store/autopilot/ui test
bun run --cwd apps-store/autopilot/ui check-types
bun run --cwd apps-store/autopilot/ui build
```

The UI build emits one self-contained `dist/index.html` for the sandboxed
Companion host.
