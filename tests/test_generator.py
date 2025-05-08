from collections import Counter

from game_logic.dawg import Dawg
from game_logic.board import Board
from game_logic.generator import find_all_moves

DICT = "static/data/NWL2023.txt"
DAWG = Dawg.from_wordlist_file(DICT)


def _empty_board_str():
    return "\n".join(" ".join("." * 15) for _ in range(15))


def test_simple_move_generation():
    """Rack CAT should yield CAT across the centre square on an empty board."""
    board = Board.from_string(_empty_board_str())
    rack = Counter("CAT")

    moves = find_all_moves(board, rack, DAWG)

    assert any(m.word == "CAT" and m.row == 7 and m.col <= 7 for m in moves)
    # There should be at least one move, even with this minimal rack
    assert len(moves) > 0