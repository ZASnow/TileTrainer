"""Public interface for the new game_logic package."""
from pathlib import Path
from .dawg import Dawg
from .board import Board
from .generator import find_all_moves
from .bot import make_bot_move

def load_word_list(path: str | Path) -> set[str]:
    """Return an UPPER-CASE set of words from a plain-text list."""
    path = Path(path)
    return {line.strip().upper() for line in path.open(encoding="utf8")}

__all__ = [
    "Dawg",
    "Board",
    "find_all_moves",
    "make_bot_move",
    "load_word_list"
]