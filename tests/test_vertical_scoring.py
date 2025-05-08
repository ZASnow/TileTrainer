from game_logic.board import Board
from game_logic.generator import _score_move, H, V

EMPTY = "\n".join(" ".join("." * 15) for _ in range(15))

def test_vertical_double_word():
    board = Board.from_string(EMPTY)
    # play 'DOG' vertically, centre letter on the star (DW)
    score = _score_move(board, 6, 7, V, "DOG")
    # D(2)+O(1)+G(2)=5  -> double word =10
    assert score == 10