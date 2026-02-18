# Upstream skill catalogs (submodules)

This folder contains upstream skill catalogs tracked as **git submodules** (gitlinks), so we can reference them without vendoring their contents into this repo.

## What’s here

- `openai-skills` → https://github.com/openai/skills
- `openclaw-skills` → https://github.com/openclaw/skills
- `obra-superpowers` → https://github.com/obra/superpowers
- `anthropics-skills` → https://github.com/anthropics/skills

## Getting the contents locally

After cloning this repo:

```bash
git submodule update --init --recursive
```

To update submodules later:

```bash
git submodule update --remote --merge
```

## Windows note (openclaw)

The `openclaw/skills` repository contains paths that differ only by filename casing (for example `SKILL.md` and `skill.md` in the same directory). On default Windows filesystems (case-insensitive), that can prevent a clean checkout.

If you hit issues initializing `skills-upstream/openclaw-skills`, use one of:

- WSL2 (recommended) with a Linux filesystem checkout
- A case-sensitive directory (if your environment allows it)
- Skip that submodule and initialize the others explicitly:

```bash
git submodule update --init skills-upstream/openai-skills skills-upstream/obra-superpowers skills-upstream/anthropics-skills
```

## Licensing

Each upstream repository retains its own license(s). Treat these as read-only imports; do not copy code/content into this repo without reviewing licensing and attribution requirements.
