document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const resetRackButton = document.getElementById('reset-rack');
    const shuffleRackButton = document.getElementById('shuffle-rack');
    const playerRack = document.getElementById('player-rack');

    const popupContainer = document.getElementById('popup-container');
    const blankTileSubmit = document.getElementById('blank-tile-submit');

    const optionsButton = document.getElementById('options-button');
    const passButton = document.getElementById('pass-button');
    const exchangeButton = document.getElementById('exchange-button');
    const playButton = document.getElementById('play-button');

    let isFirstMove = true;

    // Define special tile positions
    const specialTiles = {
        'triple-word': [
            [0, 0], [0, 7], [0, 14],
            [7, 0], [7, 14],
            [14, 0], [14, 7], [14, 14]
        ],
        'double-word': [
            [1, 1], [2, 2], [3, 3], [4, 4], [7, 7],
            [10, 10], [11, 11], [12, 12], [13, 13],
            [1, 13], [2, 12], [3, 11], [4, 10],
            [10, 4], [11, 3], [12, 2], [13, 1]
        ],
        'triple-letter': [
            [1, 5], [1, 9],
            [5, 1], [5, 5], [5, 9], [5, 13],
            [9, 1], [9, 5], [9, 9], [9, 13],
            [13, 5], [13, 9]
        ],
        'double-letter': [
            [0, 3], [0, 11], [2, 6], [2, 8],
            [3, 0], [3, 7], [3, 14], [6, 2],
            [6, 6], [6, 8], [6, 12], [7, 3],
            [7, 11], [8, 2], [8, 6], [8, 8],
            [8, 12], [11, 0], [11, 7], [11, 14],
            [12, 6], [12, 8], [14, 3], [14, 11]
        ],
        'star': [[7, 7]]
    };

    function isSpecialTile(i, j, type) {
        return specialTiles[type].some(pos => pos[0] === i && pos[1] === j);
    }

    // Create the board
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            const cell = document.createElement('div');
            cell.classList.add('board-cell');
            cell.dataset.row = i;
            cell.dataset.col = j;

            if (isSpecialTile(i, j, 'triple-word')) cell.classList.add('triple-word');
            else if (isSpecialTile(i, j, 'double-word')) cell.classList.add('double-word');
            else if (isSpecialTile(i, j, 'triple-letter')) cell.classList.add('triple-letter');
            else if (isSpecialTile(i, j, 'double-letter')) cell.classList.add('double-letter');
            if (isSpecialTile(i, j, 'star')) {
                cell.classList.add('star');
                cell.innerHTML = '<i class="fa-regular fa-star"></i>';
            }

            board.appendChild(cell);
        }
    }

    // Tile distribution and drawing function
    const tileDistribution = {
        'A': { count: 9, points: 1 }, 'B': { count: 2, points: 3 }, 'C': { count: 2, points: 3 }, 'D': { count: 4, points: 2 },
        'E': { count: 12, points: 1 }, 'F': { count: 2, points: 4 }, 'G': { count: 3, points: 2 }, 'H': { count: 2, points: 4 },
        'I': { count: 9, points: 1 }, 'J': { count: 1, points: 8 }, 'K': { count: 1, points: 5 }, 'L': { count: 4, points: 1 },
        'M': { count: 2, points: 3 }, 'N': { count: 6, points: 1 }, 'O': { count: 8, points: 1 }, 'P': { count: 2, points: 3 },
        'Q': { count: 1, points: 10 }, 'R': { count: 6, points: 1 }, 'S': { count: 4, points: 1 }, 'T': { count: 6, points: 1 },
        'U': { count: 4, points: 1 }, 'V': { count: 2, points: 4 }, 'W': { count: 2, points: 4 }, 'X': { count: 1, points: 8 },
        'Y': { count: 2, points: 4 }, 'Z': { count: 1, points: 10 }, '': { count: 2, points: 0 }  // Blanks
    };

    let tileBag = [];

    for (const [letter, { count, points }] of Object.entries(tileDistribution)) {
        for (let i = 0; i < count; i++) {
            tileBag.push({ letter, points, id: `${letter}-${points}-${i}` }); // Add a unique ID for each tile
        }
    }

    function drawTiles(num) {
        const drawnTiles = [];
        for (let i = 0; i < num; i++) {
            if (tileBag.length === 0) break;
            const randomIndex = Math.floor(Math.random() * tileBag.length);
            drawnTiles.push(tileBag.splice(randomIndex, 1)[0]);
        }
        return drawnTiles;
    }

    let playerTiles = drawTiles(7).sort((a, b) => a.letter.localeCompare(b.letter)); // Sort tiles alphabetically

    function updatePlayerTiles(newTiles) {
        playerTiles = newTiles.sort((a, b) => a.letter.localeCompare(b.letter));
    }

    // Create the player's rack
    function createPlayerRack(tiles) {
        playerRack.innerHTML = ''; // Clear existing tiles
        tiles.forEach(({ letter, points, id, isBlank }) => {
            const tile = document.createElement('div');
            tile.id = `tile-${id}`; // Use the unique ID
            tile.classList.add('tile');
            tile.setAttribute('draggable', 'true');
            if (isBlank || letter === '') {
                tile.classList.add('blank-tile');  // Add class for blank tiles
                tile.innerHTML = `<span class="tile-points">0</span>`;
            } else {
                tile.innerHTML = `${letter}<span class="tile-points">${points}</span>`;
            }
            playerRack.appendChild(tile);
        });
        addDragAndDropEvents(); // Re-add drag and drop events
    }
    
    createPlayerRack(playerTiles);

    // Add drag and drop functionality
    function addDragAndDropEvents() {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragend', handleDragEnd); // Add dragend event
        });

        board.addEventListener('dragover', handleDragOver);
        board.addEventListener('drop', handleDrop);

        playerRack.addEventListener('dragover', handleDragOver);
        playerRack.addEventListener('drop', handleRackDrop);
    }

    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        setTimeout(() => {
            e.target.style.visibility = 'hidden';
            e.target.classList.add('dragging'); // Add a class to indicate the tile is being dragged
        }, 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function showBlankTilePopup(tile) {
        document.getElementById('blank-tile-letter').value = ''; // Clear input field
        popupContainer.style.display = 'flex';
        blankTileSubmit.onclick = () => {
            const letter = document.getElementById('blank-tile-letter').value.toUpperCase();
            if (letter.match(/^[A-Z]$/)) {
                tile.innerHTML = `${letter}<span class="tile-points">0</span>`;
                tile.classList.add('blank-tile'); // Add a class for blank tiles
                tile.dataset.assignedLetter = letter; // Store the assigned letter
                popupContainer.style.display = 'none';
            } else {
                alert('Please enter a valid letter.');
            }
        };
    }      

    function handleDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        const tile = document.getElementById(id);
        tile.style.visibility = 'visible';
        tile.classList.remove('dragging'); // Remove the dragging class
    
        // Check if the target is a board cell and if it's already occupied
        if (e.target.classList.contains('board-cell') && !e.target.querySelector('.tile')) {
            e.target.appendChild(tile);
            tile.classList.add('newly-placed'); // Add a class to flag the tile
    
            // If the tile is placed on the star cell, hide the star icon
            if (e.target.classList.contains('star')) {
                e.target.classList.add('tile-placed');
            }
    
            // Check if the tile is a blank tile
            if (tile.classList.contains('blank-tile') && !tile.dataset.assignedLetter) {
                showBlankTilePopup(tile);
                tile.addEventListener('click', handleBlankTileClick); // Add click event listener for newly placed blank tile
            }
        } else if (e.target.parentElement.classList.contains('board-cell') && !e.target.parentElement.querySelector('.tile')) {
            e.target.parentElement.appendChild(tile);
            tile.classList.add('newly-placed'); // Add a class to flag the tile
    
            // If the tile is placed on the star cell, hide the star icon
            if (e.target.parentElement.classList.contains('star')) {
                e.target.parentElement.classList.add('tile-placed');
            }
    
            // Check if the tile is a blank tile
            if (tile.classList.contains('blank-tile') && !tile.dataset.assignedLetter) {
                showBlankTilePopup(tile);
                tile.addEventListener('click', handleBlankTileClick); // Add click event listener for newly placed blank tile
            }
        }
    }
    
    function handleBlankTileClick() {
        showBlankTilePopup(this);
    }         

    function handleRackDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        const tile = document.getElementById(id);
        tile.style.visibility = 'visible';
        tile.classList.remove('dragging'); // Remove the dragging class
    
        // Reset blank tile to its original state when returned to the rack
        if (tile.classList.contains('blank-tile')) {
            tile.innerHTML = `<span class="tile-points">0</span>`;
            tile.removeEventListener('click', handleBlankTileClick); // Remove click event listener after setting letter
            delete tile.dataset.assignedLetter; // Remove the assigned letter attribute
        }
    
        // Append the tile to the player rack in the exact position it was dragged from
        const draggedTile = playerRack.querySelector('.dragging');
        if (draggedTile) {
            const index = Array.from(playerRack.children).indexOf(draggedTile);
            playerRack.insertBefore(tile, playerRack.children[index]);
        } else {
            playerRack.appendChild(tile);
        }
    }        

    function handleDragEnd(e) {
        e.target.style.visibility = 'visible';
        e.target.classList.remove('dragging'); // Remove the dragging class
    }

    // Reset the rack
    resetRackButton.addEventListener('click', () => {
        // Clear the newly placed tiles from the board
        board.querySelectorAll('.tile.newly-placed').forEach(tile => tile.remove());
    
        createPlayerRack(playerTiles);
    });    

    // Shuffle the rack
    shuffleRackButton.addEventListener('click', () => {
        const tiles = Array.from(playerRack.querySelectorAll('.tile'));
        const shuffledTiles = tiles.map(tile => {
            return {
                letter: tile.classList.contains('blank-tile') ? '' : tile.textContent.trim().charAt(0),
                points: parseInt(tile.querySelector('.tile-points').textContent) || 0,
                id: tile.id.replace('tile-', ''),
                isBlank: tile.classList.contains('blank-tile')
            };
        }).sort(() => Math.random() - 0.5);
    
        createPlayerRack(shuffledTiles);
    });    

    // Event listeners for new buttons
    optionsButton.addEventListener('click', () => {
        console.log('Options button clicked');
    });

    passButton.addEventListener('click', () => {
        console.log('Pass button clicked');
    });

    exchangeButton.addEventListener('click', () => {
        console.log('Exchange button clicked');
    });

    playButton.addEventListener('click', () => {
        const newlyPlacedTiles = Array.from(board.querySelectorAll('.tile.newly-placed'));

        if (newlyPlacedTiles.length === 0) {
            alert("No tiles placed.");
            return;
        }

        // Ensure the first word crosses through the center tile (7,7)
        if (isFirstMove) {
            const crossesCenter = newlyPlacedTiles.some(tile => {
                const cell = tile.parentElement;
                return cell.dataset.row == 7 && cell.dataset.col == 7;
            });

            if (!crossesCenter) {
                alert("The first word must cross the center tile (7,7).");
                return;
            }
        }

        // Ensure subsequent moves are adjacent to existing tiles
        if (!isFirstMove) {
            const allTiles = Array.from(board.querySelectorAll('.tile:not(.newly-placed)'));

            const isAdjacentToExistingTile = newlyPlacedTiles.some(tile => {
                const cell = tile.parentElement;
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);

                return allTiles.some(existingTile => {
                    const existingCell = existingTile.parentElement;
                    const existingRow = parseInt(existingCell.dataset.row);
                    const existingCol = parseInt(existingCell.dataset.col);

                    return (
                        (row === existingRow && Math.abs(col - existingCol) === 1) ||
                        (col === existingCol && Math.abs(row - existingRow) === 1)
                    );
                });
            });

            if (!isAdjacentToExistingTile) {
                alert("Tiles must be placed adjacent to existing tiles.");
                return;
            }
        }

        const words = getNewWords(newlyPlacedTiles);

        // Check each word's validity
        checkWordsValidity(words, newlyPlacedTiles);
    });
    
    // Function to get new words formed by newly placed tiles
    function getNewWords(newlyPlacedTiles) {
        const words = [];
    
        // Collect coordinates of newly placed tiles
        const coordinates = newlyPlacedTiles.map(tile => {
            const cell = tile.parentElement;
            return { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col), letter: tile.textContent.trim().charAt(0) };
        });
    
        // Sort by row and column
        coordinates.sort((a, b) => (a.row === b.row) ? a.col - b.col : a.row - b.row);
    
        // Determine if the main word is vertical or horizontal
        const isHorizontal = coordinates.every(coord => coord.row === coordinates[0].row);
        const isVertical = coordinates.every(coord => coord.col === coordinates[0].col);
    
        if (!isHorizontal && !isVertical) {
            alert("Tiles must be placed in a straight line.");
            return [];
        }
    
        // Get the main word formed
        let mainWord = "";
        let startRow = coordinates[0].row;
        let startCol = coordinates[0].col;
    
        if (isHorizontal) {
            // Find the starting column of the main word
            while (startCol > 0 && board.querySelector(`[data-row="${startRow}"][data-col="${startCol - 1}"] .tile`)) {
                startCol--;
            }
            // Construct the main word
            let col = startCol;
            while (col < 15 && board.querySelector(`[data-row="${startRow}"][data-col="${col}"] .tile`)) {
                const tile = board.querySelector(`[data-row="${startRow}"][data-col="${col}"] .tile`);
                mainWord += tile.textContent.trim().charAt(0);
                col++;
            }
        } else {
            // Find the starting row of the main word
            while (startRow > 0 && board.querySelector(`[data-row="${startRow - 1}"][data-col="${startCol}"] .tile`)) {
                startRow--;
            }
            // Construct the main word
            let row = startRow;
            while (row < 15 && board.querySelector(`[data-row="${row}"][data-col="${startCol}"] .tile`)) {
                const tile = board.querySelector(`[data-row="${row}"][data-col="${startCol}"] .tile`);
                mainWord += tile.textContent.trim().charAt(0);
                row++;
            }
        }
        if (mainWord.length > 1) words.push(mainWord);
    
        // Get adjacent words formed
        coordinates.forEach(coord => {
            const row = coord.row;
            const col = coord.col;
    
            if (isHorizontal) {
                // Check vertically for adjacent words
                let verticalWord = coord.letter;
                for (let i = row - 1; i >= 0; i--) {
                    const aboveTile = board.querySelector(`[data-row="${i}"][data-col="${col}"] .tile`);
                    if (aboveTile) {
                        verticalWord = aboveTile.textContent.trim().charAt(0) + verticalWord;
                    } else {
                        break;
                    }
                }
                for (let i = row + 1; i < 15; i++) {
                    const belowTile = board.querySelector(`[data-row="${i}"][data-col="${col}"] .tile`);
                    if (belowTile) {
                        verticalWord += belowTile.textContent.trim().charAt(0);
                    } else {
                        break;
                    }
                }
                if (verticalWord.length > 1) words.push(verticalWord);
            } else {
                // Check horizontally for adjacent words
                let horizontalWord = coord.letter;
                for (let i = col - 1; i >= 0; i--) {
                    const leftTile = board.querySelector(`[data-row="${row}"][data-col="${i}"] .tile`);
                    if (leftTile) {
                        horizontalWord = leftTile.textContent.trim().charAt(0) + horizontalWord;
                    } else {
                        break;
                    }
                }
                for (let i = col + 1; i < 15; i++) {
                    const rightTile = board.querySelector(`[data-row="${row}"][data-col="${i}"] .tile`);
                    if (rightTile) {
                        horizontalWord += rightTile.textContent.trim().charAt(0);
                    } else {
                        break;
                    }
                }
                if (horizontalWord.length > 1) words.push(horizontalWord);
            }
        });
        return words;
    }    

    // Function to check words validity
    function checkWordsValidity(words) {
        const checkWordPromises = words.map(word => {
            return fetch('/check_word', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word: word }),
            }).then(response => response.json());
        });
    
        Promise.all(checkWordPromises)
            .then(results => {
                const invalidWords = results.filter(result => result.validity.includes("not valid"));
                if (invalidWords.length > 0) {
                    alert("Invalid word played.");
                    // Clear the newly placed tiles from the board
                    board.querySelectorAll('.tile.newly-placed').forEach(tile => tile.remove());
                    createPlayerRack(playerTiles);
                } else { 
                    // Remove the newly-placed class from all tiles on the board
                    const newlyPlacedTiles = board.querySelectorAll('.tile.newly-placed');
                    newlyPlacedTiles.forEach(tile => {
                        tile.classList.remove('newly-placed');
                        tile.setAttribute('draggable', 'false');
                    });
                    
                    // Draw new tiles for the player
                    const remainingTiles = Array.from(playerRack.querySelectorAll('.tile')).map(tile => ({
                        letter: tile.textContent.trim().charAt(0) === '0' ? '' : tile.textContent.trim().charAt(0), // Handle blank tiles
                        points: parseInt(tile.querySelector('.tile-points').textContent),
                        id: tile.id.replace('tile-', '')
                    }));
    
                    const newTiles = drawTiles(7 - remainingTiles.length).sort((a, b) => a.letter.localeCompare(b.letter));
                    const updatedTiles = remainingTiles.concat(newTiles).sort((a, b) => a.letter.localeCompare(b.letter));
                    
                    createPlayerRack(updatedTiles);
                    updatePlayerTiles(updatedTiles);
                    updateSidebar();

                    // Mark that the first move has been made
                    if (isFirstMove) isFirstMove = false;
                }
            });
    }

    // Update sidebar information
    function updateSidebar() {
        document.getElementById('tiles-left').textContent = tileBag.length;
        const bagContents = document.getElementById('bag-contents');
        bagContents.innerHTML = '';
        for (const [letter, { count }] of Object.entries(tileDistribution)) {
            const remainingCount = tileBag.filter(tile => tile.letter === letter).length;
            if (remainingCount > 0) {
                const tileInfo = document.createElement('div');
                tileInfo.textContent = `${letter}: ${remainingCount}`;
                bagContents.appendChild(tileInfo);
            }
        }
    }

    // Initial sidebar update
    updateSidebar();
});
