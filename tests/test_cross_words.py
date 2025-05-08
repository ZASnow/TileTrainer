"""Test script for cross-word validation fixes.

This script tests the cross-word validation logic with the specific "AAL" example.
"""
import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import game_logic modules
parent_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(parent_dir))

# Import necessary modules from game_logic
from game_logic.board import Board, H, V  # Import H and V directly from board module
from game_logic.dawg import Dawg
from game_logic.generator import Move
from game_logic.validation import validate_cross_words, extract_cross_words
from game_logic.debug_utils import DebugUtils

# Load the dictionary
dict_path = "static/data/NWL2023.txt"
dawg = Dawg.from_wordlist_file(dict_path)

def test_aal_move():
    # Create a board with the specific game state from the example
    board_str = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . Z . . . . . .
    . . . . . . . B E L L . . . .
    . . . . . . K I N O . . . . .
    . . . . . M A T . . . . . . .
    . . . . . . T . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    """
    
    board = Board.from_string(board_str)
    
    print("Testing board with current state:")
    DebugUtils.print_board(board)
    
    # Create the AAL move that incorrectly passes validation
    aal_move = Move("AAL", 5, 9, "V", 16, ["A", "A", "L"])
    
    # Use our debug utils to analyze the move
    print("\n=== Testing AAL move that should be invalid ===")
    is_valid = DebugUtils.analyze_move(board_str, {
        "word": "AAL",
        "row": 5,
        "col": 9,
        "direction": "V"
    }, dawg)
    
    print(f"\nTest result: Move is {'VALID' if is_valid else 'INVALID'} (should be INVALID)")
    assert not is_valid, "AAL should be invalid because it forms AALO"
    
    # Test some known valid moves as well
    valid_move = Move("AH", 5, 9, "H", 10, ["A", "H"])
    
    print("\n=== Testing a valid move 'AH' horizontal ===")
    is_valid = DebugUtils.analyze_move(board_str, {
        "word": "AH",
        "row": 5,
        "col": 9,
        "direction": "H"
    }, dawg)
    
    print(f"\nTest result: Move is {'VALID' if is_valid else 'INVALID'} (should be VALID)")
    assert is_valid, "AH should be a valid move"
    
    # Show the cross-checks for the position
    print("\n=== Analyzing cross-checks ===")
    cross_checks = board.cross_checks(dawg)
    r, c = 5, 9  # Position where AAL is played
    
    if (r, c) in cross_checks:
        h_allowed = cross_checks[(r, c)][H]  # Use imported H constant
        v_allowed = cross_checks[(r, c)][V]  # Use imported V constant
        print(f"Horizontal play allowed letters at ({r},{c}): {sorted(h_allowed)}")
        print(f"Vertical play allowed letters at ({r},{c}): {sorted(v_allowed)}")
    else:
        print(f"No cross-checks found for position ({r},{c})")


if __name__ == "__main__":
    test_aal_move()