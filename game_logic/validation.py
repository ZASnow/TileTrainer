"""Enhanced cross-word validation for move generator.

This enhances cross-word validation to ensure that all words formed by a move
are valid dictionary words.
"""
from __future__ import annotations
from typing import List, Set, Tuple

def extract_cross_words(board, move, dawg):
    """
    Extract all cross-words that would be formed by this move.
    
    Args:
        board: The Board object
        move: The Move object
        dawg: The dictionary/lexicon
    
    Returns:
        List of tuples (cross_word, is_valid)
    """
    word = move.word
    row = move.row
    col = move.col
    direction = move.direction
    
    SIZE = 15
    cross_words = []
    
    # First, validate the main word
    main_word = move.word.upper()
    main_word_valid = dawg.is_word(main_word)
    
    # print(f"Main word: {main_word} - Valid: {main_word_valid}")
    
    # Then check all cross-words
    for idx, ch in enumerate(word):
        r = row + (idx if direction == "V" else 0)
        c = col + (idx if direction == "H" else 0)
        
        # Skip if this position already has a letter (not a new tile)
        if board.grid[r][c] != ".":
            continue
        
        # Check for potential cross-word in the perpendicular direction
        if direction == "H":  # Horizontal move, check vertical cross-words
            # Get the vertical word formed by this tile
            top = ""
            rr = r - 1
            while rr >= 0 and board.grid[rr][c] != ".":
                top = board.grid[rr][c] + top
                rr -= 1
            
            bottom = ""
            rr = r + 1
            while rr < SIZE and board.grid[rr][c] != ".":
                bottom += board.grid[rr][c]
                rr += 1
            
            # If there's a vertical cross-word (top or bottom has content)
            if top or bottom:
                cross_word = top + ch.upper() + bottom
                is_valid = dawg.is_word(cross_word)
                cross_words.append((cross_word, is_valid))
                # print(f"Cross-word (vertical): {cross_word} - Valid: {is_valid}")
        
        else:  # Vertical move, check horizontal cross-words
            # Get the horizontal word formed by this tile
            left = ""
            cc = c - 1
            while cc >= 0 and board.grid[r][cc] != ".":
                left = board.grid[r][cc] + left
                cc -= 1
            
            right = ""
            cc = c + 1
            while cc < SIZE and board.grid[r][cc] != ".":
                right += board.grid[r][cc]
                cc += 1
            
            # If there's a horizontal cross-word (left or right has content)
            if left or right:
                cross_word = left + ch.upper() + right
                is_valid = dawg.is_word(cross_word)
                cross_words.append((cross_word, is_valid))
                # print(f"Cross-word (horizontal): {cross_word} - Valid: {is_valid}")
    
    return cross_words


def check_extended_main_word(board, move, dawg):
    """
    Check if the main word extends beyond the word being played by connecting
    with existing tiles on the board, and if that extended word is valid.
    
    Args:
        board: The Board object
        move: The Move object
        dawg: The dictionary/lexicon
        
    Returns:
        Tuple of (has_extension, extended_word, is_valid)
    """
    r, c = move.row, move.col
    direction = move.direction
    word = move.word
    SIZE = 15
    
    # For a horizontal move, check if there are adjacent tiles at the left or right
    if direction == "H":
        # Check left
        left_word = ""
        cc = c - 1
        while cc >= 0 and board.grid[r][cc] != ".":
            left_word = board.grid[r][cc] + left_word
            cc -= 1
        
        # Check right
        right_word = ""
        cc = c + len(word)
        while cc < SIZE and board.grid[r][cc] != ".":
            right_word += board.grid[r][cc]
            cc += 1
        
        # If there are adjacent tiles, validate the complete word
        if left_word or right_word:
            complete_word = left_word + word.upper() + right_word
            is_valid = dawg.is_word(complete_word)
            # print(f"Extended main word: {complete_word} - Valid: {is_valid}")
            return (True, complete_word, is_valid)
    
    # For a vertical move, check if there are adjacent tiles above or below
    else:  # direction == "V"
        # Check above
        top_word = ""
        rr = r - 1
        while rr >= 0 and board.grid[rr][c] != ".":
            top_word = board.grid[rr][c] + top_word
            rr -= 1
        
        # Check below
        bottom_word = ""
        rr = r + len(word)
        while rr < SIZE and board.grid[rr][c] != ".":
            bottom_word += board.grid[rr][c]
            rr += 1
        
        # If there are adjacent tiles, validate the complete word
        if top_word or bottom_word:
            complete_word = top_word + word.upper() + bottom_word
            is_valid = dawg.is_word(complete_word)
            # print(f"Extended main word: {complete_word} - Valid: {is_valid}")
            return (True, complete_word, is_valid)
    
    return (False, "", True)


def validate_cross_words(board, move, dawg):
    """
    Check that all words formed by the move are valid dictionary words.
    
    Args:
        board: The Board object
        move: The Move object to validate
        dawg: The dictionary/lexicon
    
    Returns:
        bool: True if all formed words are valid, False otherwise
    """
    # Check extended main word FIRST (if any)
    has_extension, extended_word, ext_valid = check_extended_main_word(board, move, dawg)
    if has_extension and not ext_valid:
        # print(f"Invalid extended main word: {extended_word}")
        return False
    
    # Then check the main word if there's no extension
    if not has_extension:
        main_word = move.word.upper()
        main_word_valid = dawg.is_word(main_word)
        if not main_word_valid:
            # print(f"Invalid main word: {main_word}")
            return False
    
    # Extract and validate all cross-words
    cross_words = extract_cross_words(board, move, dawg)
    
    # Check if any cross-word is invalid
    for cross_word, is_valid in cross_words:
        if not is_valid:
            # print(f"Invalid cross-word: {cross_word}")
            return False
    
    # print(f"Move forms {len(cross_words)} valid cross-words")
    return True


def find_all_moves_with_validation(board, rack, dawg):
    """
    Find all legal moves with full cross-word validation.
    
    This is a wrapper around find_all_moves that adds cross-word validation.
    """
    from .generator import find_all_moves
    
    # Get candidate moves
    moves = find_all_moves(board, rack, dawg)
    print(f"Found {len(moves)} potential moves before cross-word validation")
    
    # Validate cross-words
    valid_moves = []
    invalid_moves = []
    
    for move in moves:
        if validate_cross_words(board, move, dawg):
            valid_moves.append(move)
        else:
            invalid_moves.append(move)
    
    if invalid_moves:
        print(f"Filtered out {len(invalid_moves)} moves with invalid cross-words")
        for i, move in enumerate(invalid_moves[:5]):
            print(f"  Invalid move {i+1}: {move}")
    
    valid_moves.sort(key=lambda m: m.total_score, reverse=True)
    return valid_moves