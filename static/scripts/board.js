document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const tilesContainer = document.getElementById('tiles');
    const resetRackButton = document.getElementById('reset-rack');
    const shuffleRackButton = document.getElementById('shuffle-rack');
    const playerRack = document.getElementById('player-rack');

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

    // Create the player's rack
    function createPlayerRack(tiles) {
        playerRack.innerHTML = ''; // Clear existing tiles
        tiles.forEach(({ letter, points, id }) => {
            const tile = document.createElement('div');
            tile.id = `tile-${id}`; // Use the unique ID
            tile.classList.add('tile');
            tile.setAttribute('draggable', 'true');
            tile.innerHTML = `${letter}<span class="tile-points">${points}</span>`;
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

    function handleDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        const tile = document.getElementById(id);
        tile.style.visibility = 'visible';
        tile.classList.remove('dragging'); // Remove the dragging class

        if (e.target.classList.contains('board-cell')) {
            e.target.appendChild(tile);
        } else if (e.target.parentElement.classList.contains('board-cell')) {
            e.target.parentElement.appendChild(tile);
        }
    }

    function handleRackDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        const tile = document.getElementById(id);
        tile.style.visibility = 'visible';
        tile.classList.remove('dragging'); // Remove the dragging class

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
        // Collect all tiles currently on the board
        const boardTiles = Array.from(board.querySelectorAll('.tile')).map(tile => ({
            letter: tile.textContent.trim().charAt(0),
            points: parseInt(tile.querySelector('.tile-points').textContent),
            id: tile.id.replace('tile-', '')
        }));

        playerTiles = playerTiles.concat(boardTiles);

        // Clear the board
        board.querySelectorAll('.tile').forEach(tile => tile.remove());

        createPlayerRack(playerTiles);
    });

    // Shuffle the rack
    shuffleRackButton.addEventListener('click', () => {
        const shuffledTiles = Array.from(playerRack.querySelectorAll('.tile'))
            .map(tile => ({
                letter: tile.textContent.trim().charAt(0),
                points: parseInt(tile.querySelector('.tile-points').textContent),
                id: tile.id.replace('tile-', '')
            }))
            .sort(() => Math.random() - 0.5);

        createPlayerRack(shuffledTiles);
    });

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
