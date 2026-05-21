# Graphify Skill

Description:

Transforms any input (code, docs, papers, images) into a knowledge graph and clustered communities, then outputs HTML, JSON and an audit report. Use this skill when a user asks about codebase structure, file relationships, architecture, or to generate a persistent graph (graphify-out/).

Primary Capabilities:

- Parse repository files and produce nodes/edges representing symbols, files, and references.
- Run community detection and cluster related components.
- Provide interactive query helpers (BFS/DFS, neighbor lookups) and god-node summaries.
- Export outputs as HTML visualizations, JSON graph data, and an audit report describing methodology.

Usage:

- Invoke when asked to analyze or visualize a codebase, project architecture, or large document collection.
- Prefer exploring the repo with the `graphify` agent, then write outputs to `graphify-out/`.

Notes:

- This skill is workspace-scoped; ensure it lives under `.agents/skills/graphify`.
- Add any implementation stubs or tooling (scripts) under the same folder when extending functionality.
