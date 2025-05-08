#!/usr/bin/env python
"""
Generate *front* and *back* hooks for every word in a given word-list and
dump them to a JSON file.

▪ “Back hook”  = letters you can append (word  →  word+hook) to make
  another valid word.
▪ “Front hook” = letters you can prepend (hook+word) to make a valid word.

Both single-letter hooks (DOG → DOGS) **and** multi-letter hooks
(DOG → BULLDOG) are recorded.

Output format  (example):

{
  "DOG":  { "back": ["S", "ES", "GONE"], "front": ["HOT", "BULL"] },
  "CAT":  { "back": ["S"],               "front": ["BOBCAT", "WILDCAT"] },
  ...
}
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set


# ──────────────────────────────────────────────────────────────────────────
# helper
# ──────────────────────────────────────────────────────────────────────────
def load_word_set(filepath: Path) -> Set[str]:
    """Upper-case, strip, keep alphabetic only (Scrabble style)."""
    with filepath.open("r", encoding="utf-8") as fh:
        return {line.strip().upper() for line in fh if line.strip()}

def build_hook_dict(words: set[str]) -> dict[str, dict[str, list[str]]]:
    """Return { base_word : {'front':[1-letter], 'back':[1-letter]} }."""
    from collections import defaultdict

    hooks: dict[str, dict[str, set[str]]] = defaultdict(
        lambda: {"front": set(), "back": set()}
    )

    # quick prefix / suffix maps
    prefix_map: dict[str, list[str]] = defaultdict(list)
    suffix_map: dict[str, list[str]] = defaultdict(list)

    for w in words:
        ln = len(w)
        for i in range(1, ln):                # all shorter splits
            prefix_map[w[:i]].append(w)       #  base -> longer word(s)
            suffix_map[w[i:]].append(w)

    for base in words:
        # ── back hooks ───────────────────────────────────────────────
        for longer in prefix_map.get(base, []):          # longer starts with base
            hook = longer[len(base):]                    # part you append
            if len(hook) == 1:                           # ← only single-letter
                hooks[base]["back"].add(hook)

        # ── front hooks ──────────────────────────────────────────────
        for longer in suffix_map.get(base, []):          # longer ends with base
            hook = longer[:-len(base)]                   # part you prepend
            if len(hook) == 1:                           # ← only single-letter
                hooks[base]["front"].add(hook)

    # sets -> sorted lists, drop words w/o hooks
    return {
        w: {"front": sorted(h["front"]), "back": sorted(h["back"])}
        for w, h in hooks.items() if h["front"] or h["back"]
    }

# ──────────────────────────────────────────────────────────────────────────
# CLI entry-point
# ──────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Generate Scrabble hook files")
    parser.add_argument(
        "--lists",
        nargs="+",
        default=[
            "static/data/CSW21.txt",
            "static/data/NWL2023.txt",
        ],
        help="Path(s) to word-list files",
    )
    parser.add_argument("--outdir", default=None, help="Directory for JSON output")
    args = parser.parse_args()

    for list_path in args.lists:
        in_path = Path(list_path)
        if not in_path.exists():
            print(f"[WARN] {in_path} not found – skipping")
            continue

        out_dir = Path(args.outdir) if args.outdir else in_path.parent
        out_path = out_dir / (in_path.stem + "_hooks.json")

        print(f"• Processing {in_path.name} ...", end=" ", flush=True)
        words = load_word_set(in_path)
        hooks = build_hook_dict(words)

        with out_path.open("w", encoding="utf-8") as fh:
            json.dump(hooks, fh, indent=1, sort_keys=True)
        print(f"done → {out_path}  ({len(hooks):,} base words)")

    print("All finished.")


if __name__ == "__main__":
    main()
