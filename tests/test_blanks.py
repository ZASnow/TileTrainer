from collections import Counter
from game_logic.board import Board
from game_logic.dawg import Dawg
from game_logic.generator import find_all_moves

DAWG = Dawg.from_wordlist_file("static/data/NWL2023.txt")
EMPTY = "\n".join(" ".join("." * 15) for _ in range(15))


def test_blank_tile_generates_word():
    board = Board.from_string(EMPTY)
    rack = Counter({"": 1, "C": 1, "A": 1, "T": 1})  # blank + CAT
    moves = find_all_moves(board, rack, DAWG)
    assert any(m.word.upper() == "CAST" for m in moves)
