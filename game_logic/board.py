"""Light‑weight board representation + enhanced helper methods.

The design keeps the move generator pure: all board‑specific rules live here.
This version includes improved cross-check handling for better validation.
"""
from __future__ import annotations

from typing import List, Set, Tuple, Dict
from collections import Counter
import string

# Constants ------------------------------------------------------------
SIZE = 15
H, V = "H", "V"

# Bonus squares – classic layout (0‑based).  Only those needed for scoring
# are stored; the generator only needs anchor/cross‑check info.
TW = {(0, 0), (0, 7), (0, 14), (7, 0), (7, 14), (14, 0), (14, 7), (14, 14)}
DW = {
    (1, 1), (2, 2), (3, 3), (4, 4), (7, 7),
    (10, 10), (11, 11), (12, 12), (13, 13),
    (1, 13), (2, 12), (3, 11), (4, 10),
    (10, 4), (11, 3), (12, 2), (13, 1),
}
TL = {
    (1, 5), (1, 9), (5, 1), (5, 5), (5, 9), (5, 13),
    (9, 1), (9, 5), (9, 9), (9, 13), (13, 5), (13, 9),
}
DL = {
    (0, 3), (0, 11), (2, 6), (2, 8), (3, 0), (3, 7), (3, 14),
    (6, 2), (6, 6), (6, 8), (6, 12), (7, 3), (7, 11),
    (8, 2), (8, 6), (8, 8), (8, 12), (11, 0), (11, 7),
    (11, 14), (12, 6), (12, 8), (14, 3), (14, 11)
}

TILE_POINTS = {
    **{ch: 1 for ch in "EAIONRTLSU"},
    **{ch: 2 for ch in "DG"},
    **{ch: 3 for ch in "BCMP"},
    **{ch: 4 for ch in "FHVWY"},
    "K": 5,
    **{ch: 8 for ch in "JX"},
    **{ch: 10 for ch in "QZ"},
}


class Board:
    """15×15 board with helper methods used by the generator."""

    __slots__ = ("grid",)

    def __init__(self, grid: List[List[str]] | None = None):
        if grid is None:
            grid = [["." for _ in range(SIZE)] for _ in range(SIZE)]
        self.grid = grid

    # ----------------------------------------------------------- parsing
    @classmethod
    def from_string(cls, s: str) -> "Board":
        rows = [row.split() for row in s.strip().splitlines() if row.strip()]
        return cls(rows)

    def to_string(self) -> str:
        return "\n".join(" ".join(r) for r in self.grid)

    def __str__(self) -> str:
        result = []
        result.append("  " + " ".join(f"{i:2d}" for i in range(SIZE)))
        result.append("  " + "-" * 45)
        
        for r in range(SIZE):
            line = f"{r:2d}|"
            for c in range(SIZE):
                cell = self.grid[r][c] if self.grid[r][c] != "." else " "
                line += f" {cell} "
            line += "|"
            result.append(line)
        
        result.append("  " + "-" * 45)
        return "\n".join(result)

    # ------------------------------------------------ anchors / helpers
    def is_first_move(self) -> bool:
        return all(cell == "." for row in self.grid for cell in row)

    def anchors(self) -> Set[Tuple[int, int]]:
        """Return all squares where a new word must touch existing tiles."""
        if self.is_first_move():
            return {(7, 7)}
        anchors: Set[Tuple[int, int]] = set()
        for r in range(SIZE):
            for c in range(SIZE):
                if self.grid[r][c] != ".":
                    continue
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < SIZE and 0 <= nc < SIZE and self.grid[nr][nc] != ".":
                        anchors.add((r, c))
                        break
        return anchors

    def get_full_word(self, r: int, c: int, direction: str) -> Tuple[str, int, int]:
        """
        Get the full word at given position in the specified direction.
        Returns the word, the start row, and the start column.
        
        Args:
            r: Row index
            c: Column index
            direction: "H" for horizontal, "V" for vertical
            
        Returns:
            Tuple of (word, start_row, start_col)
        """
        if direction == H:
            # Find the start of the word (leftmost letter)
            start_c = c
            while start_c > 0 and self.grid[r][start_c-1] != ".":
                start_c -= 1
            
            # Build the word from left to right
            word = ""
            cc = start_c
            while cc < SIZE and self.grid[r][cc] != ".":
                word += self.grid[r][cc]
                cc += 1
            
            return (word, r, start_c)
        
        else:  # direction == V
            # Find the start of the word (topmost letter)
            start_r = r
            while start_r > 0 and self.grid[start_r-1][c] != ".":
                start_r -= 1
            
            # Build the word from top to bottom
            word = ""
            rr = start_r
            while rr < SIZE and self.grid[rr][c] != ".":
                word += self.grid[rr][c]
                rr += 1
            
            return (word, start_r, c)

    def cross_checks(self, dawg: "Dawg") -> Dict[Tuple[int, int], Dict[str, Set[str]]]:
        """
        Pre‑compute legal letters for each empty square (horizontal & vertical).
        Enhanced to ensure cross-words validity.
        """
        from .dawg import Dawg  # local import to avoid cycle

        checks: Dict[Tuple[int, int], Dict[str, Set[str]]] = {}
        az = set(string.ascii_uppercase)

        for r in range(SIZE):
            for c in range(SIZE):
                if self.grid[r][c] != ".":
                    continue
                
                # Horizontal cross‑check (what letters can go here when playing horizontally?)
                # We need to check what vertical word would be formed
                top = ""
                rr = r - 1
                while rr >= 0 and self.grid[rr][c] != ".":
                    top = self.grid[rr][c] + top
                    rr -= 1
                
                bottom = ""
                rr = r + 1
                while rr < SIZE and self.grid[rr][c] != ".":
                    bottom += self.grid[rr][c]
                    rr += 1
                
                # If there's no vertical constraint (no tiles above or below),
                # any letter can go here horizontally
                h_possible = az
                
                # Otherwise, check what letters would form valid vertical words
                if top or bottom:
                    h_possible = {
                        ch for ch in az if dawg.is_word(top + ch + bottom)
                    }
                    print(f"H cross-check at ({r},{c}): {top}X{bottom} -> {len(h_possible)} possible letters")
                
                # Vertical cross‑check (what letters can go here when playing vertically?)
                # We need to check what horizontal word would be formed
                left = ""
                cc = c - 1
                while cc >= 0 and self.grid[r][cc] != ".":
                    left = self.grid[r][cc] + left
                    cc -= 1
                
                right = ""
                cc = c + 1
                while cc < SIZE and self.grid[r][cc] != ".":
                    right += self.grid[r][cc]
                    cc += 1
                
                # If there's no horizontal constraint (no tiles to left or right),
                # any letter can go here vertically
                v_possible = az
                
                # Otherwise, check what letters would form valid horizontal words
                if left or right:
                    v_possible = {
                        ch for ch in az if dawg.is_word(left + ch + right)
                    }
                    print(f"V cross-check at ({r},{c}): {left}X{right} -> {len(v_possible)} possible letters")
                
                checks[(r, c)] = {H: h_possible, V: v_possible}
        
        return checks

    def is_move_valid(self, move, dawg: "Dawg") -> bool:
        """
        Check if a move is valid (all formed words are valid).
        
        Args:
            move: The Move object to validate
            dawg: The dictionary/lexicon
            
        Returns:
            bool: True if the move is valid, False otherwise
        """
        from .validation import validate_cross_words
        return validate_cross_words(self, move, dawg)

    def calculate_score(self, move) -> int:
        """
        Recalculate the score for a move based on the board state.
        
        Args:
            move: The Move object
            
        Returns:
            int: The score for the move
        """
        from .generator import _score_move
        return _score_move(self, move.row, move.col, move.direction, move.word)