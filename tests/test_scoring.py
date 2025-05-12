"""Test cases for Scrabble game scoring.

Tests various scoring scenarios including:
- First move through center star (7,7)
- Words connecting with existing words
- Words using premium squares
- Words with blank tiles
- Bingo bonus (using all 7 tiles)
"""
import pytest
from game_logic.board import Board, H, V
from game_logic.dawg import Dawg
from game_logic.generator import Move, _score_move
from game_logic.debug_utils import DebugUtils
import copy

# Load dictionary
DICT_PATH = "static/data/NWL2023.txt"  # Update if your path is different
try:
    DAWG = Dawg.from_wordlist_file(DICT_PATH)
except Exception as e:
    print(f"Failed to load dictionary: {e}")
    # Create a minimal DAWG for testing with some common words
    DAWG = Dawg()
    test_words = [
        "HELLO", "WORLD", "QUARTZ", "JACK", "FARM", "PIZZA", 
        "QUIT", "PAINT", "BALLS", "WATER", "JOKER", "STRETCHY",
        "ARIZONA", "XENOPHOBIA", "QUICK", "QUIZZES", "BLANKS"
    ]
    DAWG = Dawg.build_from_words(test_words)


def apply_move_to_board(board, move):
    """Helper function to apply a move to the board."""
    new_board = copy.deepcopy(board)
    for idx, ch in enumerate(move.word):
        r = move.row + (idx if move.direction == V else 0)
        c = move.col + (idx if move.direction == H else 0)
        new_board.grid[r][c] = ch.upper() if ch.isupper() else ch
    return new_board


def test_first_move():
    """Test scoring a first move through the center square (7,7)."""
    # Create an empty board
    board = Board()
    
    # Place "HELLO" horizontally with the 'E' on the center square (7,7)
    move = Move("DOVES", 7, 3, H, 0, list("DOVES"))
    
    # Calculate the score
    score = _score_move(board, 7, 3, H, "DOVES")
    
    # Expected score: H(4) + E(1) on center square (DW) + L(1) + L(1) + O(1) = 8 * 2 = 16
    assert score == 22


def test_bonus_tiles():
    """Test scoring with various bonus tiles."""
    # Start with initial "HELLO" on the board
    base_board = Board()
    move = Move("DOVES", 7, 3, H, 0, list("DOVES"))
    board = apply_move_to_board(base_board, move)
    
    # Play "QUITTERS" vertically hitting a TW at (0,7) and connecting with 'S' in DOVES
    move1 = Move("QUITTERS", 0, 7, V, 0, list("QUITTER"))
    score1 = _score_move(board, 0, 7, V, "QUITTERS")
    
    # Expected score: 
    assert score1 == 104
    
    # Apply the move to the board
    board1 = apply_move_to_board(board, move1)
    
    # Play "JACKeT" horizontally hitting a DL and connecting with 'T' in QUITTERS
    move2 = Move("JACKET", 4, 2, H, 0, list("JACKE"))
    score2 = _score_move(board1, 4, 2, H, "JACKET")
    
    # Expected score:
    assert score2 == 38


def test_blank_tiles():
    """Test scoring with blank tiles."""
    # Start with initial "HELLO" on the board
    base_board = Board()
    first_move = Move("HELLO", 7, 5, H, 0, list("HELLO"))
    board = apply_move_to_board(base_board, first_move)
    
    # Play "Pi_ZA" vertically - using a blank for the 'Z' (lowercase in our notation)
    # Connect with the 'L' in "HELLO"
    move1 = Move("PApAL", 3, 7, V, 0, list("PApA"))
    score1 = _score_move(board, 3, 7, V, "PApAL")
    
    # Expected score: 
    assert score1 == 9
    
    # Apply the move to the board
    board1 = apply_move_to_board(board, move1)
    
    # Play "QUiT" horizontally with a blank 'i', connecting with the 'I' in "PIZZA"
    move2 = Move("Zap", 5, 5, H, 0, list("Za"))
    score2 = _score_move(board1, 5, 5, H, "Zap")
    
    # Expected score:
    assert score2 == 30


def test_bingo_bonus():
    """Test scoring with a bingo (using all 7 tiles)."""
    # Start with initial "HELLO" on the board
    base_board = Board()
    first_move = Move("HELLO", 7, 5, H, 0, list("HELLO"))
    board = apply_move_to_board(base_board, first_move)
    
    # Play "QUIZZES" vertically, using all 7 tiles, connecting with the 'E' in "HELLO"
    move = Move("RETAINS", 1, 10, V, 0, list("RETAINS"))
    score = _score_move(board, 1, 10, V, "RETAINS")
    
    # Expected score:
    assert score == 73


def test_multiple_cross_words():
    """Test scoring with multiple cross words formed in one move."""
    # Create a board with multiple words
    board = Board.from_string("""
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . O R G A N I C .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
""")
    
    # Play "PAINT" horizontally creating multiple cross words
    move = Move("EX", 6, 11, H, 0, list("EX"))
    score = _score_move(board, 6, 11, H, "EX")
    
    # Expected score:
    # P(3) + A(1) + I(1) + N(1) + T(1) = 7
    # Cross-word "MP" = M(3, existing) + P(3) = 6
    # Cross-word "AL" = A(1) + L(1, existing) = 2
    # Cross-word "IN" = I(1) + N(1) = 2 (not a valid cross-word but testing scoring)
    # Total: 7 + 6 + 2 + 2 = 17
    assert score == 36


def test_word_to_edge():
    """Test scoring a word that extends to the edge of the board."""
    # Start with "HELLO" on the board
    # Create a board with multiple words
    board = Board.from_string("""
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . O R G A N I C .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
""")

    move = Move("SHAVE", 7, 14, H, 0, list("SHAVE"))
    score = _score_move(board, 7, 14, V, "SHAVE")
    
    # Expected score:
    assert score == 69


def test_extend_existing_word():
    """Test scoring when extending an existing word."""
    board = Board.from_string("""
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . R A I N . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
""")
    move2 = Move("RAINIEST", 7, 7, H, 0, list("IEST"))
    score2 = _score_move(board, 7, 7, H, "RAINIEST")
    
    # Expected score:
    assert score2 == 27


def test_bonus_squares_with_blanks():
    """Test scoring when blank tiles land on premium squares."""
    # Start with "HELLO" on the board
    base_board = Board()
    first_move = Move("HELLO", 7, 3, H, 0, list("HELLO"))
    board = apply_move_to_board(base_board, first_move)
    
    # Play "J_KER" vertically with a blank on TW
    move = Move("bAKER", 4, 4, V, 0, list("bAke"))
    score = _score_move(board, 4, 4, V, "bAKER")
    
    # Expected score:
    assert score == 16


def test_seven_letter_word_no_bingo():
    """Test scoring a seven-letter word that doesn't use all tiles from rack (no bingo)."""
    board = Board.from_string("""
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . B R I N G . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
""")

    move = Move("RAIDING", 1, 7, V, 0, list("RAIDIN"))
    score = _score_move(board, 1, 7, V, "RAIDING")
    
    # Expected score:
    assert score == 10


def test_parallel_play():
    """Test scoring a parallel play that forms multiple words."""
    board = Board.from_string("""
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . P A I K S . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
""")

    move = Move("GOATEE", 6, 9, H, 0, list("GOATEE"))
    score = _score_move(board, 6, 9, H, "GOATEE")
    
    # Expected score:
    assert score == 19


def test_connecting_multiple_words():
    """Test scoring when connecting to multiple existing words."""
    # Create a board with multiple words
    board = Board.from_string("""
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . M E A L S . . . . .
. . . . . A . . . P . . . . .
. . . . . K . . . R . . . . .
. . . . . E . . . I . . . . .
. . . B A R . . . G . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
""")
    
    # Play "WATER" horizontally, connecting with both 'P' from PLAY and 'L' from HELLO
    move = Move("BARGING", 11, 3, H, 0, list("GIN"))
    score = _score_move(board, 11, 3, H, "BARGING")
    
    # Expected score:
    assert score == 12


if __name__ == "__main__":
    pytest.main(["-v", __file__])