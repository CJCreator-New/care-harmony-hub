#!/usr/bin/env python3
"""Simple graphify runner: walks repo, builds file nodes and basic edges.

Outputs `graphify-out/graph.json` and `graphify-out/index.html`.
"""
import os
import re
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'graphify-out')

IGNORE_DIRS = {'.git', 'node_modules', 'graphify-out', '.venv', '__pycache__'}

import_pattern = re.compile(r"(?:from|import)\s+['\"](.+?)['\"]")
require_pattern = re.compile(r"require\(\s*['\"](.+?)['\"]\s*\)")

def collect_files():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # filter ignored dirs
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            # skip binary-ish or large files
            if f.endswith(('.png', '.jpg', '.jpeg', '.exe', '.dll')):
                continue
            path = os.path.join(dirpath, f)
            rel = os.path.relpath(path, ROOT)
            files.append(rel.replace('\\', '/'))
    return files

def build_graph(files):
    nodes = {f: {'id': f} for f in files}
    edges = []
    file_set = set(files)
    for f in files:
        path = os.path.join(ROOT, f)
        try:
            with open(path, 'r', encoding='utf-8') as fh:
                txt = fh.read()
        except Exception:
            continue
        # find imports/requires
        targets = set(import_pattern.findall(txt) + require_pattern.findall(txt))
        for t in targets:
            # normalize simple relative paths
            if t.startswith('.'):
                candidate = os.path.normpath(os.path.join(os.path.dirname(f), t))
                # try common extensions
                for ext in ['', '.js', '.ts', '.jsx', '.tsx', '.py', '/index.js']:
                    cand = (candidate + ext).replace('\\', '/')
                    if cand in file_set:
                        edges.append({'source': f, 'target': cand})
                        break
            else:
                # if target matches a filename somewhere, link by basename
                basename = os.path.basename(t)
                matches = [x for x in files if x.endswith('/' + basename) or x == basename]
                for m in matches:
                    edges.append({'source': f, 'target': m})
    return {'nodes': list(nodes.values()), 'edges': edges}

def write_outputs(graph):
    os.makedirs(OUT, exist_ok=True)
    json_path = os.path.join(OUT, 'graph.json')
    with open(json_path, 'w', encoding='utf-8') as fh:
        json.dump(graph, fh, indent=2)
    html_path = os.path.join(OUT, 'index.html')
    with open(html_path, 'w', encoding='utf-8') as fh:
        fh.write('<!doctype html>\n<html><head><meta charset="utf-8"><title>Graphify Output</title></head><body>')
        fh.write('<h1>Graphify Output</h1>')
        fh.write('<p>Generated graph.json with {} nodes and {} edges.</p>'.format(len(graph['nodes']), len(graph['edges'])))
        fh.write('<pre id="json">')
        fh.write(json.dumps(graph, indent=2))
        fh.write('</pre></body></html>')
    print('Wrote', json_path, 'and', html_path)

def main():
    print('Scanning repo root:', ROOT)
    files = collect_files()
    print('Found', len(files), 'files')
    graph = build_graph(files)
    write_outputs(graph)

if __name__ == '__main__':
    main()
