import json
import os
from collections import defaultdict, deque, Counter
import math

def find_graph_path():
    candidates = [
        ".agents/graphify-out/graph.json",
        "./.agents/graphify-out/graph.json",
        "./.agents/graphify-out/graph.json",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("graph.json not found in .agents/graphify-out")


def load_graph(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    nodes = data.get("nodes") or data.get("vertices") or []
    edges = data.get("links") or data.get("edges") or data.get("relationships") or []
    return nodes, edges


def node_key(n):
    for k in ("path", "file", "label", "name", "id"):
        if isinstance(n, dict) and k in n and n[k]:
            return str(n[k])
    return str(n)


def edge_ends(e):
    if isinstance(e, dict):
        for a,b in (("source","target"),("from","to"),("u","v")):
            if a in e and b in e:
                return str(e[a]), str(e[b])
    return None, None


def build_adj(nodes, edges):
    id_to_label = {}
    for n in nodes:
        nid = n.get("id") if isinstance(n, dict) else None
        lbl = node_key(n)
        if nid is None:
            nid = lbl
        id_to_label[str(nid)] = lbl

    adj = defaultdict(set)
    for e in edges:
        a,b = edge_ends(e)
        if a is None or b is None:
            continue
        a = str(a)
        b = str(b)
        adj[a].add(b)
        adj[b].add(a)
    for nid in id_to_label:
        adj.setdefault(nid, set())
    return adj, id_to_label


def connected_components(adj):
    seen = set()
    components = []
    for node in adj:
        if node in seen:
            continue
        comp = []
        dq = deque([node])
        seen.add(node)
        while dq:
            u = dq.popleft()
            comp.append(u)
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    dq.append(v)
        components.append(comp)
    return components


def top_level_folder(path):
    if not path:
        return ""
    p = path.replace("\\", "/")
    parts = p.split("/")
    return parts[0] if parts else p


def analyze(nodes, edges):
    adj, id_to_label = build_adj(nodes, edges)
    node_count = len(id_to_label)
    edge_count = sum(len(v) for v in adj.values()) // 2

    degrees = {n: len(adj[n]) for n in adj}
    deg_vals = list(degrees.values())
    avg_deg = sum(deg_vals)/len(deg_vals) if deg_vals else 0
    sd = math.sqrt(sum((x-avg_deg)**2 for x in deg_vals)/len(deg_vals)) if deg_vals else 0

    top_nodes = sorted(degrees.items(), key=lambda x: x[1], reverse=True)[:20]
    god_threshold = avg_deg + 3*sd
    god_nodes = [ (n, degrees[n]) for n in degrees if degrees[n] >= max(god_threshold, (sorted(deg_vals, reverse=True)[9] if len(deg_vals)>=10 else 0)) ]

    components = connected_components(adj)
    comp_sizes = sorted([(len(c), c[:5]) for c in components], key=lambda x: x[0], reverse=True)

    folder_counter = Counter()
    for nid, lbl in id_to_label.items():
        folder_counter[top_level_folder(lbl)] += 1

    surprising = []
    seen_pairs = set()
    for a, nbrs in adj.items():
        for b in nbrs:
            pair = tuple(sorted((a,b)))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            fa = top_level_folder(id_to_label.get(a, str(a)))
            fb = top_level_folder(id_to_label.get(b, str(b)))
            if fa and fb and fa != fb:
                surprising.append((a,b, fa, fb))
    surprising = surprising[:50]

    analysis = {
        "nodes": node_count,
        "edges": edge_count,
        "avg_degree": avg_deg,
        "stddev_degree": sd,
        "top_nodes": [ {"id": n, "label": id_to_label.get(n), "degree": d} for n,d in top_nodes ],
        "god_nodes": [ {"id": n, "label": id_to_label.get(n), "degree": d} for n,d in god_nodes ],
        "components_count": len(components),
        "largest_components": [ {"size": s, "sample": [id_to_label.get(x) for x in sample]} for s,sample in comp_sizes[:10] ],
        "top_folders": folder_counter.most_common(20),
        "surprising_connections_sample": [ {"a": id_to_label.get(a), "b": id_to_label.get(b), "a_folder": fa, "b_folder": fb} for a,b,fa,fb in surprising ],
    }
    return analysis


def write_outputs(analysis, out_dir=".agents/graphify-out"):
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, "graph_analysis.json")
    md_path = os.path.join(out_dir, "GRAPH_REPORT.md")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(analysis, f, indent=2)

    lines = []
    lines.append(f"# Graphify Analysis Report\n")
    lines.append(f"- Nodes: {analysis['nodes']}")
    lines.append(f"- Edges: {analysis['edges']}")
    lines.append(f"- Avg degree: {analysis['avg_degree']:.2f} (sd {analysis['stddev_degree']:.2f})\n")

    lines.append("## Top nodes by degree\n")
    for t in analysis['top_nodes'][:20]:
        lines.append(f"- {t['label']} — degree {t['degree']}")

    lines.append("\n## God nodes (high-degree)\n")
    if analysis['god_nodes']:
        for g in analysis['god_nodes']:
            lines.append(f"- {g['label']} — degree {g['degree']}")
    else:
        lines.append("- (none found)\n")

    lines.append("\n## Largest components\n")
    for c in analysis['largest_components']:
        sample = ", ".join(c['sample'][:5])
        lines.append(f"- size {c['size']} (examples: {sample})")

    lines.append("\n## Top folders by node count\n")
    for f,cnt in analysis['top_folders']:
        lines.append(f"- {f or '(root)'}: {cnt}")

    lines.append("\n## Surprising connections (sample)\n")
    for s in analysis['surprising_connections_sample'][:20]:
        lines.append(f"- {s['a']} <-> {s['b']} ({s['a_folder']} -> {s['b_folder']})")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"WROTE {json_path}")
    print(f"WROTE {md_path}")


def main():
    try:
        path = find_graph_path()
        nodes, edges = load_graph(path)
        analysis = analyze(nodes, edges)
        write_outputs(analysis)
    except Exception as e:
        print("ERROR:", e)


if __name__ == '__main__':
    main()
