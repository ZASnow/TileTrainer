"""Minimal DAWG implementation optimised for Scrabble word look‑ups.

This version keeps everything in‑memory for simplicity.  It supports:
  • build_from_wordlist()  – create a DAWG at start‑up
  • is_word(s)            – exact lookup
  • is_prefix(p)          – prefix test used by the move generator

If you later want the super‑compact on‑disk edge array described in the
Appel & Jacobson paper, swap‐out the *_EdgeTrie* class with an mmap‑backed
version – the rest of the API can stay the same.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable

__all__ = ["Dawg"]


class _Node:
    __slots__ = ("children", "terminal")

    def __init__(self):
        self.children: Dict[str, _Node] = {}
        self.terminal: bool = False


class Dawg:
    """A really just‑a‑trie helper – fast enough for <100k words."""

    def __init__(self, root: _Node | None = None):
        self._root: _Node = root or _Node()

    # ---------------------------------------------------------------------
    # Public look‑ups ------------------------------------------------------
    # ---------------------------------------------------------------------
    def is_word(self, word: str) -> bool:
        """Return *True* if *word* is found in the DAWG."""
        node = self._root
        for ch in word.upper():
            node = node.children.get(ch)
            if node is None:
                return False
        return node.terminal

    def is_prefix(self, prefix: str) -> bool:
        """Return *True* if *prefix* is a valid start of some word."""
        node = self._root
        for ch in prefix.upper():
            node = node.children.get(ch)
            if node is None:
                return False
        return True

    # ------------------------------------------------------------------
    # Construction helpers ---------------------------------------------
    # ------------------------------------------------------------------
    @classmethod
    def build_from_words(cls, words: Iterable[str]) -> "Dawg":
        root = _Node()
        for w in words:
            w = w.strip().upper()
            if len(w) < 2:
                continue
            node = root
            for ch in w:
                node = node.children.setdefault(ch, _Node())
            node.terminal = True
        return cls(root)

    @classmethod
    def from_wordlist_file(cls, path: str | Path) -> "Dawg":
        path = Path(path)
        with path.open("r", encoding="utf8") as fh:
            words = (line.strip() for line in fh)
            return cls.build_from_words(words)