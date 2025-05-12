"""Test script for validating words that extend beyond the start position.

This script tests the validation logic that ensures a word is not valid if it
connects with existing tiles before its start position to form an invalid word.
"""
import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import game_logic modules
parent_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(parent_dir))

# Import necessary modules from game_logic
from game_logic.board import Board, H, V
from game_logic.dawg import Dawg
from game_logic.generator import Move
from game_logic.validation import validate_cross_words, check_extended_main_word
from game_logic.debug_utils import DebugUtils

# Load the dictionary
dict_path = "static/data/NWL2023.txt"
dawg = Dawg.from_wordlist_file(dict_path)

def test_word_extending_before_start():
    """Test case for a move that would connect with tiles before its start position."""
    # Create a board with 'B' at position (7,6) and we'll try to play 'WORD' starting at (7,7)
    board_str = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . B . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    """
    
    board = Board.from_string(board_str)
    
    print("Testing board with 'B' at position (7,6):")
    DebugUtils.print_board(board)
    
    # Create the WORD move that should be invalid because it would form BWORD
    word_move = Move("WORD", 7, 7, H, 10, ["W", "O", "R", "D"])
    
    # Test with both the check_extended_main_word function and validate_cross_words
    has_extension, extended_word, is_valid = check_extended_main_word(board, word_move, dawg)
    
    print(f"\ncheck_extended_main_word result:")
    print(f"Has extension: {has_extension}")
    print(f"Extended word: {extended_word}")
    print(f"Is valid: {is_valid}")
    
    # This should be invalid since "BWORD" is not a valid word
    assert has_extension, "Should detect that the word extends before its start"
    assert extended_word == "BWORD", "Extended word should be BWORD"
    assert not is_valid, "BWORD should not be a valid word"
    
    # Test the full validation function
    valid_move = validate_cross_words(board, word_move, dawg)
    assert not valid_move, "WORD should be invalid because it forms BWORD"
    
    print(f"\nvalidate_cross_words result: {'VALID' if valid_move else 'INVALID'} (should be INVALID)")
    
    # Now test a valid move where there's no extension or the extension is valid
    # Create a board with 'A' at position (7,6) and we'll try to play 'WAY' starting at (7,7)
    board_str2 = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . A . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    """
    
    board2 = Board.from_string(board_str2)
    
    print("\nTesting board with 'A' at position (7,6):")
    DebugUtils.print_board(board2)
    
    # Create the WAY move that should be valid because AWAY is a valid word
    way_move = Move("WAY", 7, 7, H, 10, ["W", "A", "Y"])
    
    # Test with both the check_extended_main_word function and validate_cross_words
    has_extension2, extended_word2, is_valid2 = check_extended_main_word(board2, way_move, dawg)
    
    print(f"\ncheck_extended_main_word result:")
    print(f"Has extension: {has_extension2}")
    print(f"Extended word: {extended_word2}")
    print(f"Is valid: {is_valid2}")
    
    # This should be valid since "AWAY" is a valid word
    assert has_extension2, "Should detect that the word extends before its start"
    assert extended_word2 == "AWAY", "Extended word should be AWAY"
    assert is_valid2, "AWAY should be a valid word"
    
    # Test the full validation function
    valid_move2 = validate_cross_words(board2, way_move, dawg)
    assert valid_move2, "WAY should be valid because it forms the valid word AWAY"
    
    print(f"\nvalidate_cross_words result: {'VALID' if valid_move2 else 'INVALID'} (should be VALID)")


def test_word_extending_after_end():
    """Test case for a move that would connect with tiles after its end position."""
    # Create a board with 'S' at position (7,8) and we'll try to play 'CAT' ending at (7,7)
    board_str = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . S . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    """
    
    board = Board.from_string(board_str)
    
    print("\nTesting board with 'S' at position (7,8):")
    DebugUtils.print_board(board)
    
    # Create the CAT move that should be valid because CATS is a valid word
    cat_move = Move("CAT", 7, 5, H, 10, ["C", "A", "T"])
    
    # Test with both the check_extended_main_word function and validate_cross_words
    has_extension, extended_word, is_valid = check_extended_main_word(board, cat_move, dawg)
    
    print(f"\ncheck_extended_main_word result:")
    print(f"Has extension: {has_extension}")
    print(f"Extended word: {extended_word}")
    print(f"Is valid: {is_valid}")
    
    # This should be valid since "CATS" is a valid word
    assert has_extension, "Should detect that the word extends after its end"
    assert extended_word == "CATS", "Extended word should be CATS"
    assert is_valid, "CATS should be a valid word"
    
    # Test the full validation function
    valid_move = validate_cross_words(board, cat_move, dawg)
    assert valid_move, "CAT should be valid because it forms the valid word CATS"
    
    print(f"\nvalidate_cross_words result: {'VALID' if valid_move else 'INVALID'} (should be VALID)")
    
    # Now try an invalid extension case
    # Create a board with 'Q' at position (7,8) and we'll try to play 'CAT' ending at (7,7)
    board_str2 = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . Q . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    """
    
    board2 = Board.from_string(board_str2)
    
    print("\nTesting board with 'Q' at position (7,8):")
    DebugUtils.print_board(board2)
    
    # Create the CAT move that should be invalid because CATQ is not a valid word
    cat_move2 = Move("CAT", 7, 5, H, 10, ["C", "A", "T"])
    
    # Test with both the check_extended_main_word function and validate_cross_words
    has_extension2, extended_word2, is_valid2 = check_extended_main_word(board2, cat_move2, dawg)
    
    print(f"\ncheck_extended_main_word result:")
    print(f"Has extension: {has_extension2}")
    print(f"Extended word: {extended_word2}")
    print(f"Is valid: {is_valid2}")
    
    # This should be invalid since "CATQ" is not a valid word
    assert has_extension2, "Should detect that the word extends after its end"
    assert extended_word2 == "CATQ", "Extended word should be CATQ"
    assert not is_valid2, "CATQ should not be a valid word"
    
    # Test the full validation function
    valid_move2 = validate_cross_words(board2, cat_move2, dawg)
    assert not valid_move2, "CAT should be invalid because it forms CATQ"
    
    print(f"\nvalidate_cross_words result: {'VALID' if valid_move2 else 'INVALID'} (should be INVALID)")


def test_complex_board_scenario1():
    """Test playing EBBS where the second B is already on the board."""
    board_str = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . C A T S . . . . . . .
    . . . . . . . T . . . . . . .
    . . . . . . . A . . . . . . .
    . . . . B O A R D . . . . . .
    . . . . . . . T . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    """
    
    board = Board.from_string(board_str)
    
    print("\nTesting EBBS with existing B:")
    DebugUtils.print_board(board)
    
    # Create a move for "EBBS" where the second B is already on the board at (7,4)
    # This means we only need to play "E", "B", and "S" tiles
    # The tiles list should only include the tiles we're actually playing
    ebbs_move = Move("EBBS", 5, 4, V, 15, ["E", "B", "S"])
    
    # Validate if this move is valid
    # It should be INVALID because when it connects with the C above, it forms "CEBBS"
    valid_move = validate_cross_words(board, ebbs_move, dawg)
    print(f"\nPlaying 'EBBS' vertically at (5,4) is {'VALID' if valid_move else 'INVALID'} (should be INVALID)")
    
    # This should fail because CEBBS is not a valid word
    assert not valid_move, "EBBS should be invalid because it forms CEBBS when connected with C above"
    
    # Check the extended word directly
    has_extension, extended_word, is_valid = check_extended_main_word(board, ebbs_move, dawg)
    
    print(f"\ncheck_extended_main_word result:")
    print(f"Has extension: {has_extension}")
    print(f"Extended word: {extended_word}")
    print(f"Is valid: {is_valid}")
    
    assert has_extension, "Should detect that the word extends before its start"
    assert extended_word == "CEBBS", "Extended word should be CEBBS"
    assert not is_valid, "CEBBS should not be a valid word"
    

def test_complex_board_scenario2():
    """Test playing TONIC."""
    board_str = """
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . A . . .
    . . . . . . . . . . . W . . .
    . . . . . . . . . . T A . . .
    . . . . . . . . . b O R A . .
    . . . . . . . V A R V E D . .
    . . . . . . . . . A A . I S .
    . . . . . . . . . E R . E H .
    . . . . . . . . . . I . U M .
    . . . . . . . . . . C . . O P
    . . . . . . . . . A h . . . Y
    . . . . . . . . . J . . . . I
    . . . . . . . . . I . . . . C
    """
    
    board = Board.from_string(board_str)
    
    print("\nTesting EBBS with existing B:")
    DebugUtils.print_board(board)
    
    # The tiles list should only include the tiles we're actually playing
    tonic_move = Move("TONIC", 14, 10, H, 8, ["T", "O", "N", "I"])
    
    # Validate if this move is valid
    # It should be INVALID because when it connects with the I next to it, it forms "ITONIC"
    valid_move = validate_cross_words(board, tonic_move, dawg)
    print(f"\nPlaying 'TONIC' horizontally at (5,4) is {'VALID' if valid_move else 'INVALID'} (should be INVALID)")
    
    # This should fail because ITONIC is not a valid word
    assert not valid_move, "TONIC should be invalid because it forms ITONIC when connected with C above"
    
    # Check the extended word directly
    has_extension, extended_word, is_valid = check_extended_main_word(board, tonic_move, dawg)
    
    print(f"\ncheck_extended_main_word result:")
    print(f"Has extension: {has_extension}")
    print(f"Extended word: {extended_word}")
    print(f"Is valid: {is_valid}")
    
    assert has_extension, "Should detect that the word extends before its start"
    assert extended_word == "ITONIC", "Extended word should be ITONIC"
    assert not is_valid, "ITONIC should not be a valid word"


if __name__ == "__main__":
    test_word_extending_before_start()
    test_word_extending_after_end()
    test_complex_board_scenario1()