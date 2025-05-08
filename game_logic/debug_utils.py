"""Debug utilities for Scrabble game logic.

This module contains functions to help debug issues with the Scrabble game,
particularly focusing on cross-word validation.
"""
from __future__ import annotations
from typing import List, Dict, Tuple, Set
import sys
import json

class DebugUtils:
    @staticmethod
    def print_board(board, highlight_points=None):
        """
        Print the board with optional highlighting of specific points.
        
        Args:
            board: The Board object
            highlight_points: List of (row, col) tuples to highlight
        """
        if highlight_points is None:
            highlight_points = []
        
        highlight_set = set(highlight_points)
        
        print("   " + " ".join(f"{i:2d}" for i in range(15)))
        print("  +" + "-" * 45 + "+")
        
        for r in range(15):
            print(f"{r:2d}|", end=" ")
            for c in range(15):
                cell = board.grid[r][c]
                if cell == ".":
                    cell = " "
                
                if (r, c) in highlight_set:
                    print(f"[{cell}]", end="")
                else:
                    print(f" {cell} ", end="")
            print("|")
        
        print("  +" + "-" * 45 + "+")

    @staticmethod
    def check_extended_word(board, move, dawg):
        """
        Check if the main word extends beyond the word being played.
        
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
        
        # Apply the move to a temporary board
        from copy import deepcopy
        temp_board = deepcopy(board)
        
        # Place the move on the temporary board
        for idx, ch in enumerate(word):
            rr = r + (idx if direction == "V" else 0)
            cc = c + (idx if direction == "H" else 0)
            if temp_board.grid[rr][cc] == ".":
                temp_board.grid[rr][cc] = ch.upper()
        
        # For a horizontal move, check if there are adjacent tiles at the left or right
        if direction == "H":
            # Find the start of the word
            start_c = c
            while start_c > 0 and temp_board.grid[r][start_c-1] != ".":
                start_c -= 1
            
            # Find the end of the word
            end_c = c + len(word) - 1
            while end_c < SIZE - 1 and temp_board.grid[r][end_c+1] != ".":
                end_c += 1
            
            # If the word extends beyond what we're playing
            if start_c < c or end_c >= c + len(word):
                # Extract the complete word
                complete_word = "".join(temp_board.grid[r][start_c:end_c+1])
                is_valid = dawg.is_word(complete_word)
                return (True, complete_word, is_valid)
        
        # For a vertical move, check if there are adjacent tiles above or below
        else:  # direction == "V"
            # Find the start of the word
            start_r = r
            while start_r > 0 and temp_board.grid[start_r-1][c] != ".":
                start_r -= 1
            
            # Find the end of the word
            end_r = r + len(word) - 1
            while end_r < SIZE - 1 and temp_board.grid[end_r+1][c] != ".":
                end_r += 1
            
            # If the word extends beyond what we're playing
            if start_r < r or end_r >= r + len(word):
                # Extract the complete word
                complete_word = "".join(temp_board.grid[rr][c] for rr in range(start_r, end_r+1))
                is_valid = dawg.is_word(complete_word)
                return (True, complete_word, is_valid)
        
        return (False, "", True)

    @staticmethod
    def simulate_move(board, move, dawg):
        """
        Simulate a move and check all the words that would be formed.
        
        Args:
            board: The Board object
            move: The Move object
            dawg: The dictionary/lexicon
            
        Returns:
            dict: Simulation results with main word and cross-words
        """
        from .validation import extract_cross_words
        
        # Create a temporary board with the move applied
        from copy import deepcopy
        temp_board = deepcopy(board)
        
        # Apply the move to the temporary board
        word = move.word
        row, col = move.row, move.col
        direction = move.direction
        
        # Highlight the cells that will be modified
        modified_cells = []
        
        for idx, ch in enumerate(word):
            r = row + (idx if direction == "V" else 0)
            c = col + (idx if direction == "H" else 0)
            
            # Skip if this position already has the same letter
            if temp_board.grid[r][c] == ch.upper():
                continue
                
            # Update the board if the cell is empty
            if temp_board.grid[r][c] == ".":
                temp_board.grid[r][c] = ch.upper()
                modified_cells.append((r, c))
        
        # Print the board with the move applied
        print("\n=== Board after applying move ===")
        DebugUtils.print_board(temp_board, modified_cells)
        
        # Get all the words formed by this move
        cross_words = extract_cross_words(board, move, dawg)
        
        # Print all formed words
        print("\n=== Words formed by this move ===")
        print(f"Main word: {move.word.upper()}")
        
        for word, is_valid in cross_words:
            valid_text = "VALID" if is_valid else "INVALID"
            print(f"Cross-word: {word} - {valid_text}")
        
        # Check for any letters that extend the main word
        has_extension, extended_word, ext_valid = DebugUtils.check_extended_word(board, move, dawg)
        
        if has_extension:
            print(f"\nWARNING: Main word may be extended by existing tiles!")
            valid_text = "VALID" if ext_valid else "INVALID"
            print(f"Extended main word: {extended_word} - {valid_text}")
        
        return {
            "valid": all(is_valid for _, is_valid in cross_words) and (not has_extension or ext_valid),
            "cross_words": cross_words,
            "main_word": move.word.upper(),
            "main_word_valid": dawg.is_word(move.word.upper()),
            "extended_main": has_extension,
            "extended_word": extended_word if has_extension else "",
            "extended_valid": ext_valid
        }

    @staticmethod
    def analyze_move(board_state, move_data, dawg):
        """
        Analyze a move from JSON data for debugging.
        
        Args:
            board_state: String representation of the board
            move_data: Dictionary with move data (word, row, col, direction)
            dawg: The dictionary/lexicon
        """
        from .board import Board
        from .generator import Move
        
        # Parse the board
        board = Board.from_string(board_state)
        
        # Create a Move object
        move = Move(
            move_data["word"],
            move_data["row"],
            move_data["col"],
            move_data["direction"],
            0,  # Score will be calculated
            []  # Tiles not needed for validation
        )
        
        # Print the current board
        print("\n=== Current Board ===")
        DebugUtils.print_board(board)
        
        # Simulate the move
        result = DebugUtils.simulate_move(board, move, dawg)
        
        # Print overall validity
        is_valid = (
            result["main_word_valid"] and 
            all(is_valid for _, is_valid in result["cross_words"]) and
            (not result["extended_main"] or result["extended_valid"])
        )
        
        print("\n=== Overall Move Validity ===")
        print(f"Move '{move.word}' at ({move.row},{move.col}) {move.direction} is {'VALID' if is_valid else 'INVALID'}")
        
        return is_valid

    @staticmethod
    def test_from_command_line():
        """Run a test from command line arguments."""
        if len(sys.argv) < 2:
            print("Usage: python -m game_logic.debug_utils <board_json> <move_json>")
            return
        
        from .dawg import Dawg
        dawg = Dawg.from_wordlist_file("static/data/NWL2023.txt")
        
        with open(sys.argv[1], "r") as f:
            board_state = f.read()
        
        with open(sys.argv[2], "r") as f:
            move_data = json.load(f)
        
        DebugUtils.analyze_move(board_state, move_data, dawg)


if __name__ == "__main__":
    DebugUtils.test_from_command_line()