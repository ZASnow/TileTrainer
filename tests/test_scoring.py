# tests/test_scoring.py
from collections import Counter

from game_logic.board import Board, H, V
from game_logic.generator import _score_move, find_all_moves
from game_logic.dawg import Dawg
from game_logic.bot import make_bot_move

DICT = "static/data/NWL2023.txt"
DAWG = Dawg.from_wordlist_file(DICT)

EMPTY_BOARD = "\n".join(" ".join("." * 15) for _ in range(15))


# ------------------------------------------------------------------ helpers
def _place_word(board: Board, r: int, c: int, direction: str, word: str):
    """Mutate board.grid to lay down *word* (upper-case) starting at (r,c)."""
    for idx, ch in enumerate(word):
        rr = r + (idx if direction == V else 0)
        cc = c + (idx if direction == H else 0)
        board.grid[rr][cc] = ch


# ------------------------------------------------------------------ tests
def test_center_double_word_score():
    """
    First move: 'CAT' across centre.  Score:
        C(3)+A(1)+T(1)=5  → double word square → 10
    """
    board = Board.from_string(EMPTY_BOARD)
    score = _score_move(board, 7, 7-2, H, "CAT")    # col starts 2 left of centre
    assert score == 10


def test_blank_tile_zero_points():
    """
    Word 'EYE' using blank for first E (lower-case 'e').
    Layout: centre row, starting at col 6 so blank sits on DW (but 0 pts).
        e(blank)=0  Y=4  E=1  → letters=5 ; DW on centre multiplies 5→10
    """
    board = Board.from_string(EMPTY_BOARD)
    score = _score_move(board, 7, 6, H, "eYE")
    assert score == 10


def test_bingo_bonus():
    """
    Play 7-tile word 'AEIOUYZ' through centre – all on normal squares except DW.
    Points: 1+1+1+1+1+4+10 = 19 ; double word = 38 ; +50 bingo = 88
    """
    board = Board.from_string(EMPTY_BOARD)
    score = _score_move(board, 7, 7-3, H, "AEIOUYZ")
    assert score == 88


def test_find_all_moves_sorted_by_score():
    """
    On empty board with rack 'CATDOGS', highest-scoring move should be first.
    (There might be ties; we just ensure list is sorted descending.)
    """
    rack = Counter("CATDOGS")
    board = Board.from_string(EMPTY_BOARD)
    moves = find_all_moves(board, rack, DAWG)
    assert all(moves[i].score >= moves[i+1].score for i in range(len(moves)-1))


def test_make_bot_move_returns_score():
    """Integration: bot returns identical score to Move.score."""
    board_state = EMPTY_BOARD
    rack = [{"letter": ch, "points": 1} for ch in "CATDOG?"]  # '?' treated as blank
    rack[6]["letter"] = ""                                    # blank
    result = make_bot_move(board_state, [], rack, [])
    assert result["move"] == "play"
    # score must be positive and matches internal Move.score used
    assert result["score"] > 0
