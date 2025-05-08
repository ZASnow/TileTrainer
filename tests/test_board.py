from game_logic.board import Board, H, V
from game_logic.dawg import Dawg

DICT = "static/data/NWL2023.txt"
DAWG = Dawg.from_wordlist_file(DICT)


def _empty_board_str():
    return "\n".join(" ".join("." * 15) for _ in range(15))


def test_first_move_anchors():
    board = Board.from_string(_empty_board_str())

    # On an empty board, only centre (7,7) is an anchor
    anchors = board.anchors()
    assert anchors == {(7, 7)}

    # Cross-checks on an empty board should allow any letter
    cc = board.cross_checks(DAWG)
    assert (7, 7) in cc
    assert len(cc[(7, 7)][H]) == 26
    assert len(cc[(7, 7)][V]) == 26

