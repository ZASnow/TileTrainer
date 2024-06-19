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
    let currentTile;
    let playerScore = 0;

    // Track the selected cell and arrow state
    let selectedCell = null;
    let arrowDirection = null;

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

    function handleCellClick(cell) {
        if (selectedCell && selectedCell !== cell) {
            selectedCell.classList.remove('arrow-down', 'arrow-right');
            const overlay = selectedCell.querySelector('.overlay');
            if (overlay) {
                overlay.remove();
            }
            arrowDirection = null;
        }
    
        if (selectedCell === cell) {
            if (arrowDirection === null) {
                addOverlay(cell);
                cell.classList.add('arrow-down');
                arrowDirection = 'down';
            } else if (arrowDirection === 'down') {
                cell.classList.remove('arrow-down');
                cell.classList.add('arrow-right');
                arrowDirection = 'right';
            } else if (arrowDirection === 'right') {
                cell.classList.remove('arrow-right');
                const overlay = cell.querySelector('.overlay');
                if (overlay) {
                    overlay.remove();
                }
                arrowDirection = null;
                selectedCell = null;
            }
        } else {
            if (selectedCell) {
                selectedCell.classList.remove('arrow-down', 'arrow-right');
                const overlay = selectedCell.querySelector('.overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
            selectedCell = cell;
            addOverlay(cell);
            cell.classList.add('arrow-down');
            arrowDirection = 'down';
        }
    }
    
    function addOverlay(cell) {
        const overlay = document.createElement('div');
        overlay.classList.add('overlay');
        cell.appendChild(overlay);
    }

    document.addEventListener('keydown', handleKeyPress);

    let placedTilesStack = [];

    function handleKeyPress(event) {
    
        const key = event.key.toUpperCase();
    
        if (key === 'BACKSPACE') {
            // Remove existing score bubble if any
            const existingBubble = document.querySelector('.score-bubble');
            if (existingBubble) {
                existingBubble.remove();
            }
            undoLastTile();
            return;
        }
    
        if (key === 'ENTER') {
            playButton.click();
            return;
        }

        if (!selectedCell || !arrowDirection) return;

        // Ensure the key pressed is a letter from A to Z
        if (!/^[A-Z]$/.test(key)) {
            return;
        }
    
        // Check if the selected cell already has a tile
        if (selectedCell.querySelector('.tile')) {
            return;
        }
    
        let letterTile = playerTiles.find(tile => tile.letter === key);
    
        // If the pressed key does not match any tile in the player's hand, use a blank tile
        if (!letterTile) {
            letterTile = playerTiles.find(tile => tile.letter === '' || tile.isBlank);
            if (letterTile) {
                letterTile.letter = key; // Assign the pressed key to the blank tile
                letterTile.points = 0; // Points for a blank tile is 0
                letterTile.isBlank = true; // Mark as blank tile
    
                // Create the tile element with data-assigned-letter attribute
                const newTile = document.createElement('div');
                newTile.id = `tile-${letterTile.id}`;
                newTile.classList.add('tile');
                newTile.innerHTML = `
                    <div class="circle"></div>
                    <span class="letter">${key}</span>
                    <span class="tile-points">0</span>`;
                newTile.classList.add('newly-placed', 'blank-tile'); // Add necessary classes
                newTile.setAttribute('data-assigned-letter', key); // Set the data-assigned-letter attribute
                newTile.setAttribute('draggable', 'true');
                newTile.addEventListener('dragstart', handleDragStart);
                newTile.addEventListener('dragend', handleDragEnd);
                newTile.addEventListener('click', handleBlankTileClick);

                selectedCell.appendChild(newTile);

                // Push the placed tile and its parent cell to the stack
                placedTilesStack.push({ tile: newTile, parentCell: selectedCell });
    
                // Remove the used tile from the player's rack
                playerTiles = playerTiles.filter(tile => tile !== letterTile);
                createPlayerRack(playerTiles);

                // Calculate and display the current score
                const newlyPlacedTiles = Array.from(board.querySelectorAll('.tile.newly-placed'));
                const { words, wordPositions, newLetters } = getNewWords(newlyPlacedTiles);
                const score = calculateScore(words, newLetters, wordPositions);

                showScoreBubble(selectedCell, score);
    
                // Move to the next cell in the arrow direction
                moveToNextCell();
            }
        } else {
            placeTileOnBoard(selectedCell, letterTile);
    
            // Remove the used tile from the player's rack
            playerTiles = playerTiles.filter(tile => tile !== letterTile);
            createPlayerRack(playerTiles);
    
            // Move to the next cell in the arrow direction
            moveToNextCell();
        }
    }    
             
    function placeTileOnBoard(cell, tile) {
        const newTile = document.createElement('div');
        newTile.id = `tile-${tile.id}`;
        newTile.classList.add('tile');
        if (tile.isBlank) {
            newTile.innerHTML = `
                <div class="circle"></div>
                <span class="letter">${tile.letter}</span>
                <span class="tile-points">0</span>`;
            newTile.classList.add('newly-placed', 'blank-tile'); // Add necessary classes
        } else {
            newTile.innerHTML = `${tile.letter}<span class="tile-points">${tile.points}</span>`;
            newTile.classList.add('newly-placed'); // Add a class to flag the tile
        }
    
        cell.appendChild(newTile);
    
        // Add drag and drop functionality to the new tile
        newTile.setAttribute('draggable', 'true');
        newTile.addEventListener('dragstart', handleDragStart);
        newTile.addEventListener('dragend', handleDragEnd);
    
        // Add click event listener for newly placed blank tile
        if (tile.isBlank) {
            newTile.classList.add('blank-tile'); // Add a class for blank tiles
            newTile.addEventListener('click', handleBlankTileClick);
        }
    
        // If the tile is placed on the star cell, hide the star icon
        if (cell.classList.contains('star')) {
            cell.classList.add('tile-placed');
        }
    
        // Push the placed tile and its parent cell to the stack
        placedTilesStack.push({ tile: newTile, parentCell: cell });
    
        // Calculate and display the current score
        const newlyPlacedTiles = Array.from(board.querySelectorAll('.tile.newly-placed'));
        const { words, wordPositions, newLetters } = getNewWords(newlyPlacedTiles);
        const score = calculateScore(words, newLetters, wordPositions);
    
        showScoreBubble(cell, score);
    }        

    function undoLastTile() {
        const lastPlaced = placedTilesStack.pop();
        if (lastPlaced) {
            const { tile, parentCell } = lastPlaced;

            // Check if the tile has the 'newly-placed' class
            if (!tile.classList.contains('newly-placed')) {
                return;
            }

            const tileObject = {
                letter: tile.classList.contains('blank-tile') ? '' : tile.textContent.trim().charAt(0),
                points: tile.classList.contains('blank-tile') ? 0 : parseInt(tile.querySelector('.tile-points').textContent),
                id: tile.id.replace('tile-', ''),
                isBlank: tile.classList.contains('blank-tile')
            };
            playerTiles.push(tileObject);
            createPlayerRack(playerTiles);
            tile.remove();
    
            // Remove overlay and arrow class from the current selected cell
            selectedCell.classList.remove('arrow-down', 'arrow-right');
            const overlay = selectedCell.querySelector('.overlay');
            if (overlay) {
                overlay.remove();
            }
    
            // Set the selected cell back to the parent cell
            selectedCell = parentCell;
            addOverlay(selectedCell);
            selectedCell.classList.add(`arrow-${arrowDirection}`);
        }
    }

    function moveToNextCell() {
        let row = parseInt(selectedCell.dataset.row);
        let col = parseInt(selectedCell.dataset.col);

        if (arrowDirection === 'down') {
            row += 1;
        } else if (arrowDirection === 'right') {
            col += 1;
        }

        // Check if the next cell is within bounds
        if (row >= 0 && row < 15 && col >= 0 && col < 15) {
            let nextCell = board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            while (nextCell && nextCell.querySelector('.tile')) {
                if (arrowDirection === 'down') {
                    row += 1;
                } else if (arrowDirection === 'right') {
                    col += 1;
                }
                // Check if the next cell is within bounds
                if (row >= 0 && row < 15 && col >= 0 && col < 15) {
                    nextCell = board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                } else {
                    nextCell = null;
                }
            }

            if (nextCell && !nextCell.querySelector('.tile')) {
                selectedCell.classList.remove('arrow-down', 'arrow-right');
                const overlay = selectedCell.querySelector('.overlay');
                if (overlay) {
                    overlay.remove();
                }
                selectedCell = nextCell;
                addOverlay(selectedCell);
                selectedCell.classList.add(`arrow-${arrowDirection}`);
            } else {
                // If the next cell is out of bounds, stop auto-population
                selectedCell.classList.remove('arrow-down', 'arrow-right');
                const overlay = selectedCell.querySelector('.overlay');
                if (overlay) {
                    overlay.remove();
                }
                selectedCell = null;
                arrowDirection = null;
            }
        } else {
            // If the next cell is out of bounds, stop auto-population
            selectedCell.classList.remove('arrow-down', 'arrow-right');
            const overlay = selectedCell.querySelector('.overlay');
            if (overlay) {
                overlay.remove();
            }
            selectedCell = null;
            arrowDirection = null;
        }
    }

    // Create the board (add event listener inside the loop)
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
    
            // Add event listener for cell click
            cell.addEventListener('click', () => handleCellClick(cell));
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

    function createLetterGrid() {
        const letterGrid = document.getElementById('letter-grid');
        letterGrid.innerHTML = ''; // Clear existing tiles
        for (let i = 65; i <= 90; i++) {
            const letterTile = document.createElement('div');
            letterTile.classList.add('letter-tile');
            letterTile.textContent = String.fromCharCode(i);
            letterTile.addEventListener('click', () => {
                document.getElementById('blank-tile-letter').value = letterTile.textContent;
                submitBlankTileLetter();  // Automatically submit
            });
            letterGrid.appendChild(letterTile);
        }
    }
    
    function submitBlankTileLetter() {
        const letter = document.getElementById('blank-tile-letter').value.toUpperCase();
        if (letter.match(/^[A-Z]$/)) {
            currentTile.innerHTML = `
                <div class="circle"></div>
                <span class="letter">${letter}</span>
                <span class="tile-points">0</span>`;
            currentTile.classList.add('blank-tile'); // Add a class for blank tiles
            currentTile.dataset.assignedLetter = letter; // Store the assigned letter
    
            // Push the placed tile and its parent cell to the stack if not already there
            const parentCell = currentTile.parentElement;
            if (!placedTilesStack.some(entry => entry.tile === currentTile)) {
                placedTilesStack.push({ tile: currentTile, parentCell });
            }
    
            popupContainer.style.display = 'none';
        } else {
            alert('Please enter a valid letter.');
        }
    }      

    function showBlankTilePopup(tile) {
        currentTile = tile;  // Set the current tile
        document.getElementById('blank-tile-letter').value = ''; // Clear input field
        createLetterGrid(); // Populate the letter grid
        popupContainer.style.display = 'flex';
        blankTileSubmit.onclick = submitBlankTileLetter;
    }  
    
    function showScoreBubble(cell, score) {
        // Remove existing score bubble if any
        const existingBubble = document.querySelector('.score-bubble');
        if (existingBubble) {
            existingBubble.remove();
        }
    
        // Create a new score bubble
        const bubble = document.createElement('div');
        bubble.classList.add('score-bubble');
        bubble.textContent = score;
        cell.appendChild(bubble);
    
        // Remove the bubble after a short delay
        setTimeout(() => {
            if (bubble.parentNode === cell) {
                cell.removeChild(bubble);
            }
        }, 5000); // Adjust the delay as needed
    }

    function handleDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        const tile = document.getElementById(id);
        tile.style.visibility = 'visible';
        tile.classList.remove('dragging'); // Remove the dragging class
    
        let targetCell;
        if (e.target.classList.contains('board-cell') && !e.target.querySelector('.tile')) {
            e.target.appendChild(tile);
            tile.classList.add('newly-placed'); // Add a class to flag the tile
            targetCell = e.target;
        } else if (e.target.parentElement.classList.contains('board-cell') && !e.target.parentElement.querySelector('.tile')) {
            e.target.parentElement.appendChild(tile);
            tile.classList.add('newly-placed'); // Add a class to flag the tile
            targetCell = e.target.parentElement;
        }
    
        if (targetCell) {
            // Push the placed tile and its parent cell to the stack
            placedTilesStack.push({ tile, parentCell: targetCell });
    
            // Remove the tile from playerTiles
            const tileId = tile.id.replace('tile-', '');
            playerTiles = playerTiles.filter(t => t.id !== tileId);
            createPlayerRack(playerTiles);
    
            // Check if the tile is a blank tile
            if (tile.classList.contains('blank-tile') && !tile.dataset.assignedLetter) {
                showBlankTilePopup(tile);
                tile.addEventListener('click', handleBlankTileClick); // Add click event listener for newly placed blank tile
            }
    
            // Calculate and display the current score
            const newlyPlacedTiles = Array.from(board.querySelectorAll('.tile.newly-placed'));
            const { words, wordPositions, newLetters } = getNewWords(newlyPlacedTiles);
            const score = calculateScore(words, newLetters, wordPositions);
    
            showScoreBubble(targetCell, score);
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
        tile.classList.remove('newly-placed'); // Remove the newly-placed class
    
        // Reset blank tile to its original state when returned to the rack
        if (tile.classList.contains('blank-tile')) {
            tile.innerHTML = `<span class="tile-points">0</span>`;
            tile.removeEventListener('click', handleBlankTileClick); // Remove click event listener after setting letter
            delete tile.dataset.assignedLetter; // Remove the assigned letter attribute
            tile.classList.remove('blank-tile'); // Remove blank tile class
        }
    
        // Re-add the tile back to playerTiles
        const tileId = tile.id.replace('tile-', '');
        if (!playerTiles.some(t => t.id === tileId)) {
            playerTiles.push({
                letter: tile.classList.contains('blank-tile') ? '' : tile.textContent.trim().charAt(0),
                points: tile.classList.contains('blank-tile') ? 0 : parseInt(tile.querySelector('.tile-points').textContent),
                id: tileId,
                isBlank: tile.classList.contains('blank-tile')
            });
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

        // Clear the placed tiles stack
        placedTilesStack = [];

        // Remove existing score bubble if any
        const existingBubble = document.querySelector('.score-bubble');
        if (existingBubble) {
            existingBubble.remove();
        }

        // Get the newly placed tiles from the board
        const newlyPlacedTiles = Array.from(board.querySelectorAll('.tile.newly-placed'));
    
        // Create a Set to track unique tile IDs from playerTiles
        const uniqueTileIds = new Set(playerTiles.map(tile => tile.id));
    
        // Add the newly placed tiles back to the player's rack if they are not duplicates
        newlyPlacedTiles.forEach(tile => {
            const tileId = tile.id.replace('tile-', '');
            if (!uniqueTileIds.has(tileId)) {
                uniqueTileIds.add(tileId);
                playerTiles.push({
                    letter: tile.classList.contains('blank-tile') ? '' : tile.textContent.trim().charAt(0),
                    points: tile.classList.contains('blank-tile') ? 0 : parseInt(tile.querySelector('.tile-points').textContent),
                    id: tileId,
                    isBlank: tile.classList.contains('blank-tile')
                });
            }
            tile.remove();
        });
    
        // Sort playerTiles alphabetically
        playerTiles.sort((a, b) => a.letter.localeCompare(b.letter));
    
        // Update the player's rack with unique tiles
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

        // Remove existing score bubble if any
        const existingBubble = document.querySelector('.score-bubble');
        if (existingBubble) {
            existingBubble.remove();
        }

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
                resetRackButton.click();
                return;
            }
    
            // Ensure all newly placed tiles form a single continuous word
            const areTilesConnected = checkIfTilesFormSingleWord(newlyPlacedTiles);
            if (!areTilesConnected) {
                alert("All tiles must form a single continuous word.");
                resetRackButton.click();
                return;
            }
        } else {
            // Ensure subsequent moves are adjacent to existing tiles
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
                resetRackButton.click();
                return;
            }
        }
    
        const { words, wordPositions, newLetters } = getNewWords(newlyPlacedTiles);
    
        // Log new letters and their positions
        console.log("New Letters:", newLetters);
    
        // Log words formed and their positions
        console.log("Words and Positions:", { words, wordPositions });
    
        // Calculate the score for the new words
        const score = calculateScore(words, newLetters, wordPositions);
        console.log("Score for the play:", score);
    
        // Check each word's validity
        if (words.length > 0) {
            checkWordsValidity(words, score);
        }

        // Remove click event listener from blank tiles
        newlyPlacedTiles.forEach(tile => {
            if (tile.classList.contains('blank-tile')) {
                tile.removeEventListener('click', handleBlankTileClick);
            }
        });
    });
    
    // Function to check if all tiles form a single continuous word
    function checkIfTilesFormSingleWord(tiles) {
        if (tiles.length <= 1) return true;
    
        const coordinates = tiles.map(tile => {
            const cell = tile.parentElement;
            return { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) };
        });
    
        const rows = [...new Set(coordinates.map(coord => coord.row))];
        const cols = [...new Set(coordinates.map(coord => coord.col))];
    
        if (rows.length === 1) {
            // All tiles are in the same row
            const row = rows[0];
            const sortedCols = cols.sort((a, b) => a - b);
            for (let i = 0; i < sortedCols.length - 1; i++) {
                if (sortedCols[i + 1] !== sortedCols[i] + 1) {
                    return false;
                }
            }
        } else if (cols.length === 1) {
            // All tiles are in the same column
            const col = cols[0];
            const sortedRows = rows.sort((a, b) => a - b);
            for (let i = 0; i < sortedRows.length - 1; i++) {
                if (sortedRows[i + 1] !== sortedRows[i] + 1) {
                    return false;
                }
            }
        } else {
            return false; // Tiles are neither in a single row nor in a single column
        }
    
        return true;
    }
    
    // Function to get new words formed by newly placed tiles
    function getNewWords(newlyPlacedTiles) {
        const words = [];
        const wordPositions = [];  // Array to store positions of all letters in the words
        const newLetters = [];  // Array to store new letters and their positions
    
        // Collect coordinates of newly placed tiles
        const coordinates = newlyPlacedTiles.map(tile => {
            const cell = tile.parentElement;
            const letter = tile.classList.contains('blank-tile') ? tile.dataset.assignedLetter : tile.textContent.trim().charAt(0);
            newLetters.push({ letter, row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) });  // Add new letters to the array
            return { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col), letter };
        });

        console.log(coordinates)
    
        // Sort by row and column
        coordinates.sort((a, b) => (a.row === b.row) ? a.col - b.col : a.row - b.row);
    
        // Determine if the main word is vertical or horizontal
        const isHorizontal = coordinates.every(coord => coord.row === coordinates[0].row);
        const isVertical = coordinates.every(coord => coord.col === coordinates[0].col);
    
        if (!isHorizontal && !isVertical) {
            alert("Tiles must be placed in a straight line.");
            resetRackButton.click()
            return { words: [], wordPositions: [], newLetters: [] };
        }
    
        // Get the main word formed
        let mainWord = "";
        let mainWordPositions = [];
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
                mainWordPositions.push({ letter: tile.textContent.trim().charAt(0), row: startRow, col });
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
                mainWordPositions.push({ letter: tile.textContent.trim().charAt(0), row, col: startCol });
                row++;
            }
        }
        if (mainWord.length > 1) {
            words.push(mainWord);
            wordPositions.push(mainWordPositions);
        }
    
        // Get adjacent words formed
        coordinates.forEach(coord => {
            const row = coord.row;
            const col = coord.col;
    
            if (isHorizontal) {
                // Check vertically for adjacent words
                let verticalWord = coord.letter;
                let verticalWordPositions = [{ letter: coord.letter, row, col }];
                for (let i = row - 1; i >= 0; i--) {
                    const aboveTile = board.querySelector(`[data-row="${i}"][data-col="${col}"] .tile`);
                    if (aboveTile) {
                        verticalWord = aboveTile.textContent.trim().charAt(0) + verticalWord;
                        verticalWordPositions.unshift({ letter: aboveTile.textContent.trim().charAt(0), row: i, col });
                    } else {
                        break;
                    }
                }
                for (let i = row + 1; i < 15; i++) {
                    const belowTile = board.querySelector(`[data-row="${i}"][data-col="${col}"] .tile`);
                    if (belowTile) {
                        verticalWord += belowTile.textContent.trim().charAt(0);
                        verticalWordPositions.push({ letter: belowTile.textContent.trim().charAt(0), row: i, col });
                    } else {
                        break;
                    }
                }
                if (verticalWord.length > 1) {
                    words.push(verticalWord);
                    wordPositions.push(verticalWordPositions);
                }
            } else {
                // Check horizontally for adjacent words
                let horizontalWord = coord.letter;
                let horizontalWordPositions = [{ letter: coord.letter, row, col }];
                for (let i = col - 1; i >= 0; i--) {
                    const leftTile = board.querySelector(`[data-row="${row}"][data-col="${i}"] .tile`);
                    if (leftTile) {
                        horizontalWord = leftTile.textContent.trim().charAt(0) + horizontalWord;
                        horizontalWordPositions.unshift({ letter: leftTile.textContent.trim().charAt(0), row, col: i });
                    } else {
                        break;
                    }
                }
                for (let i = col + 1; i < 15; i++) {
                    const rightTile = board.querySelector(`[data-row="${row}"][data-col="${i}"] .tile`);
                    if (rightTile) {
                        horizontalWord += rightTile.textContent.trim().charAt(0);
                        horizontalWordPositions.push({ letter: rightTile.textContent.trim().charAt(0), row, col: i });
                    } else {
                        break;
                    }
                }
                if (horizontalWord.length > 1) {
                    words.push(horizontalWord);
                    wordPositions.push(horizontalWordPositions);
                }
            }
        });
    
        return { words, wordPositions, newLetters };
    }
     
    function calculateScore(newWords, newLetters, wordPositions) {
        let totalScore = 0;
        let bingoBonus = newLetters.length === 7 ? 50 : 0; // Bingo bonus
    
        newWords.forEach((word, index) => {
            let wordScore = 0;
            let wordMultiplier = 1;
            let positions = wordPositions[index];
    
            positions.forEach(pos => {
                const cell = board.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                const letter = pos.letter;
                let letterScore = 0;
    
                // Check if the tile is newly placed and if it's a blank tile
                const tileElement = cell.querySelector('.tile');
                if (tileElement.classList.contains('blank-tile')) {
                    letterScore = 0; // Blank tiles are worth 0 points
                } else {
                    letterScore = tileDistribution[letter] ? tileDistribution[letter].points : 0;
                }
    
                // Check if the tile is newly placed
                if (tileElement.classList.contains('newly-placed')) {
                    if (cell.classList.contains('double-letter')) {
                        letterScore *= 2;
                    } else if (cell.classList.contains('triple-letter')) {
                        letterScore *= 3;
                    }
    
                    if (cell.classList.contains('double-word')) {
                        wordMultiplier *= 2;
                    } else if (cell.classList.contains('triple-word')) {
                        wordMultiplier *= 3;
                    }
                }
    
                wordScore += letterScore;
            });
    
            totalScore += wordScore * wordMultiplier;
        });
    
        totalScore += bingoBonus;
    
        return totalScore;
    }       
    
    // Function to check words validity
    function checkWordsValidity(words, score) {
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
                    resetRackButton.click()
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
                    // Update player's score
                    playerScore += score;
                    document.getElementById('player-score').textContent = `Player: ${playerScore}`;
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

        const letters = Object.keys(tileDistribution).sort();
        let displayString = '';

        letters.forEach(letter => {
            const remainingCount = tileBag.filter(tile => tile.letter === letter).length;
            if (remainingCount > 0) {
                let letterDisplay = letter === '' ? '?' : letter;
                for (let i = 0; i < remainingCount; i++) {
                    if (i > 0 && i % 6 === 0) {
                        displayString += ' ';
                    }
                    displayString += letterDisplay;
                }
                displayString += ' ';
            }
        });

        bagContents.textContent = displayString.trim();
    }

    // Initial sidebar update
    updateSidebar();
});