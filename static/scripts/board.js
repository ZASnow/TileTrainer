const tile_points = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
  "": 0,
};

document.addEventListener("DOMContentLoaded", () => {
  const board = document.getElementById("board");
  const resetRackButton = document.getElementById("reset-rack");
  const shuffleRackButton = document.getElementById("shuffle-rack");
  const playerRack = document.getElementById("player-rack");

  const popupContainer = document.getElementById("popup-container");
  const blankTileSubmit = document.getElementById("blank-tile-submit");

  const optionsButton = document.getElementById("options-button");
  const passButton = document.getElementById("pass-button");
  const exchangeButton = document.getElementById("exchange-button");
  const playButton = document.getElementById("play-button");

  let isFirstMove = true;
  let currentTile;
  let playerScore = 0;

  // Add after the declaration of let playerScore = 0;
  let consecutiveZeroScoreTurns = 0;
  let gameEnded = false;

  // Update the exchange button event listener
  exchangeButton.addEventListener("click", () => {
    // Check if the game has ended
    if (gameEnded) {
      alert("The game has ended. No more moves are allowed.");
      return;
    }

    // Check if there are at least 7 tiles in the bag
    if (tileBag.length < 7) {
      alert(
        "Exchange is only allowed when there are at least 7 tiles in the bag."
      );
      return;
    }

    // Create the exchange rack with the player's current tiles
    createExchangeRack();

    // Show the exchange popup
    exchangePopup.style.display = "flex";
  });

  // Track the selected cell and arrow state
  let selectedCell = null;
  let arrowDirection = null;

  function getBoardState() {
    const boardState = [];
    for (let i = 0; i < 15; i++) {
      const row = [];
      for (let j = 0; j < 15; j++) {
        const cell = document.querySelector(
          `[data-row="${i}"][data-col="${j}"]`
        );
        const tile = cell.querySelector(".tile");
        if (tile) {
          const isOriginallyBlank = tile.classList.contains("blank-tile");
          let letter;
          // Check if the tile has a .letter span for blank tiles
          const letterSpan = tile.querySelector(".letter");
          if (letterSpan) {
            // If it's a blank tile with a letter span
            letter = letterSpan.textContent;
          } else {
            // Regular tile, get only the letter (excluding point value)
            letter = tile.textContent.trim().replace(/[0-9]/g, ""); // Removes any numbers from the tile text
          }
          // Decide on case based on whether it was originally a blank tile
          row.push(
            isOriginallyBlank ? letter.toLowerCase() : letter.toUpperCase()
          );
        } else {
          row.push("."); // Use '.' to denote an empty cell
        }
      }
      boardState.push(row.join(" ")); // Join the row into a string and push to the board state array
    }
    return boardState.join("\n"); // Join all rows to form the full board text
  }

  // Define special tile positions
  const specialTiles = {
    "triple-word": [
      [0, 0],
      [0, 7],
      [0, 14],
      [7, 0],
      [7, 14],
      [14, 0],
      [14, 7],
      [14, 14],
    ],
    "double-word": [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [7, 7],
      [10, 10],
      [11, 11],
      [12, 12],
      [13, 13],
      [1, 13],
      [2, 12],
      [3, 11],
      [4, 10],
      [10, 4],
      [11, 3],
      [12, 2],
      [13, 1],
    ],
    "triple-letter": [
      [1, 5],
      [1, 9],
      [5, 1],
      [5, 5],
      [5, 9],
      [5, 13],
      [9, 1],
      [9, 5],
      [9, 9],
      [9, 13],
      [13, 5],
      [13, 9],
    ],
    "double-letter": [
      [0, 3],
      [0, 11],
      [2, 6],
      [2, 8],
      [3, 0],
      [3, 7],
      [3, 14],
      [6, 2],
      [6, 6],
      [6, 8],
      [6, 12],
      [7, 3],
      [7, 11],
      [8, 2],
      [8, 6],
      [8, 8],
      [8, 12],
      [11, 0],
      [11, 7],
      [11, 14],
      [12, 6],
      [12, 8],
      [14, 3],
      [14, 11],
    ],
    star: [[7, 7]],
  };

  function isSpecialTile(i, j, type) {
    return specialTiles[type].some((pos) => pos[0] === i && pos[1] === j);
  }

  function handleCellClick(cell) {
    if (selectedCell && selectedCell !== cell) {
      selectedCell.classList.remove("arrow-down", "arrow-right");
      const overlay = selectedCell.querySelector(".overlay");
      if (overlay) {
        overlay.remove();
      }
      arrowDirection = null;
    }

    if (selectedCell === cell) {
      if (arrowDirection === null) {
        addOverlay(cell);
        cell.classList.add("arrow-down");
        arrowDirection = "down";
      } else if (arrowDirection === "down") {
        cell.classList.remove("arrow-down");
        cell.classList.add("arrow-right");
        arrowDirection = "right";
      } else if (arrowDirection === "right") {
        cell.classList.remove("arrow-right");
        const overlay = cell.querySelector(".overlay");
        if (overlay) {
          overlay.remove();
        }
        arrowDirection = null;
        selectedCell = null;
      }
    } else {
      if (selectedCell) {
        selectedCell.classList.remove("arrow-down", "arrow-right");
        const overlay = selectedCell.querySelector(".overlay");
        if (overlay) {
          overlay.remove();
        }
      }
      selectedCell = cell;
      addOverlay(cell);
      cell.classList.add("arrow-down");
      arrowDirection = "down";
    }
  }

  function addOverlay(cell) {
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");
    cell.appendChild(overlay);
  }

  document.addEventListener("keydown", handleKeyPress);

  let placedTilesStack = [];

  function handleKeyPress(event) {
    const key = event.key.toUpperCase();

    if (key === "BACKSPACE") {
      // Remove existing score bubble if any
      const existingBubble = document.querySelector(".score-bubble");
      if (existingBubble) {
        existingBubble.remove();
      }
      undoLastTile();
      return;
    }

    if (key === "ENTER") {
      playButton.click();
      return;
    }

    if (!selectedCell || !arrowDirection) return;

    // Ensure the key pressed is a letter from A to Z
    if (!/^[A-Z]$/.test(key)) {
      return;
    }

    // Check if the selected cell already has a tile
    if (selectedCell.querySelector(".tile")) {
      return;
    }

    let letterTile = playerTiles.find((tile) => tile.letter === key);

    // If the pressed key does not match any tile in the player's hand, use a blank tile
    if (!letterTile) {
      letterTile = playerTiles.find(
        (tile) => tile.letter === "" || tile.isBlank
      );
      if (letterTile) {
        letterTile.letter = key; // Assign the pressed key to the blank tile
        letterTile.points = 0; // Points for a blank tile is 0
        letterTile.isBlank = true; // Mark as blank tile

        // Create the tile element with data-assigned-letter attribute
        const newTile = document.createElement("div");
        newTile.id = `tile-${letterTile.id}`;
        newTile.classList.add("tile");
        newTile.innerHTML = `
                    <div class="circle"></div>
                    <span class="letter">${key}</span>
                    <span class="tile-points">0</span>`;
        newTile.classList.add("newly-placed", "blank-tile"); // Add necessary classes
        newTile.setAttribute("data-assigned-letter", key); // Set the data-assigned-letter attribute
        newTile.setAttribute("draggable", "true");
        newTile.addEventListener("dragstart", handleDragStart);
        newTile.addEventListener("dragend", handleDragEnd);
        newTile.addEventListener("click", handleBlankTileClick);

        selectedCell.appendChild(newTile);

        // Push the placed tile and its parent cell to the stack
        placedTilesStack.push({ tile: newTile, parentCell: selectedCell });

        // Remove the used tile from the player's rack
        playerTiles = playerTiles.filter((tile) => tile !== letterTile);
        createPlayerRack(playerTiles);

        // Calculate and display the current score
        const newlyPlacedTiles = Array.from(
          board.querySelectorAll(".tile.newly-placed")
        );
        const { words, wordPositions, newLetters } =
          getNewWords(newlyPlacedTiles);
        const score = calculateScore(words, newLetters, wordPositions);

        showScoreBubble(selectedCell, score);

        // Move to the next cell in the arrow direction
        moveToNextCell();
      }
    } else {
      placeTileOnBoard(selectedCell, letterTile);

      // Remove the used tile from the player's rack
      playerTiles = playerTiles.filter((tile) => tile !== letterTile);
      createPlayerRack(playerTiles);

      // Move to the next cell in the arrow direction
      moveToNextCell();
    }
  }

  function placeTileOnBoard(cell, tile) {
    const newTile = document.createElement("div");
    newTile.id = `tile-${tile.id}`;
    newTile.classList.add("tile");
    if (tile.isBlank) {
      newTile.innerHTML = `
                <div class="circle"></div>
                <span class="letter">${tile.letter}</span>
                <span class="tile-points">0</span>`;
      newTile.classList.add("newly-placed", "blank-tile", "originally-blank"); // Add necessary classes
    } else {
      newTile.innerHTML = `${tile.letter}<span class="tile-points">${tile.points}</span>`;
      newTile.classList.add("newly-placed"); // Add a class to flag the tile
    }

    cell.appendChild(newTile);

    // Add drag and drop functionality to the new tile
    newTile.setAttribute("draggable", "true");
    newTile.addEventListener("dragstart", handleDragStart);
    newTile.addEventListener("dragend", handleDragEnd);

    // Add click event listener for newly placed blank tile
    if (tile.isBlank) {
      newTile.classList.add("blank-tile"); // Add a class for blank tiles
      newTile.addEventListener("click", handleBlankTileClick);
    }

    // If the tile is placed on the star cell, hide the star icon
    if (cell.classList.contains("star")) {
      cell.classList.add("tile-placed");
    }

    // Push the placed tile and its parent cell to the stack
    placedTilesStack.push({ tile: newTile, parentCell: cell });

    // Calculate and display the current score
    const newlyPlacedTiles = Array.from(
      board.querySelectorAll(".tile.newly-placed")
    );
    const { words, wordPositions, newLetters } = getNewWords(newlyPlacedTiles);
    const score = calculateScore(words, newLetters, wordPositions);

    showScoreBubble(cell, score);
  }

  function undoLastTile() {
    const lastPlaced = placedTilesStack.pop();
    if (lastPlaced) {
      const { tile, parentCell } = lastPlaced;

      // Check if the tile has the 'newly-placed' class
      if (!tile.classList.contains("newly-placed")) {
        return;
      }

      const tileObject = {
        letter: tile.classList.contains("blank-tile")
          ? ""
          : tile.textContent.trim().charAt(0),
        points: tile.classList.contains("blank-tile")
          ? 0
          : parseInt(tile.querySelector(".tile-points").textContent),
        id: tile.id.replace("tile-", ""),
        isBlank: tile.classList.contains("blank-tile"),
      };
      playerTiles.push(tileObject);
      createPlayerRack(playerTiles);
      tile.remove();

      // Remove overlay and arrow class from the current selected cell
      selectedCell.classList.remove("arrow-down", "arrow-right");
      const overlay = selectedCell.querySelector(".overlay");
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

    if (arrowDirection === "down") {
      row += 1;
    } else if (arrowDirection === "right") {
      col += 1;
    }

    // Check if the next cell is within bounds
    if (row >= 0 && row < 15 && col >= 0 && col < 15) {
      let nextCell = board.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      while (nextCell && nextCell.querySelector(".tile")) {
        if (arrowDirection === "down") {
          row += 1;
        } else if (arrowDirection === "right") {
          col += 1;
        }
        // Check if the next cell is within bounds
        if (row >= 0 && row < 15 && col >= 0 && col < 15) {
          nextCell = board.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
          );
        } else {
          nextCell = null;
        }
      }

      if (nextCell && !nextCell.querySelector(".tile")) {
        selectedCell.classList.remove("arrow-down", "arrow-right");
        const overlay = selectedCell.querySelector(".overlay");
        if (overlay) {
          overlay.remove();
        }
        selectedCell = nextCell;
        addOverlay(selectedCell);
        selectedCell.classList.add(`arrow-${arrowDirection}`);
      } else {
        // If the next cell is out of bounds, stop auto-population
        selectedCell.classList.remove("arrow-down", "arrow-right");
        const overlay = selectedCell.querySelector(".overlay");
        if (overlay) {
          overlay.remove();
        }
        selectedCell = null;
        arrowDirection = null;
      }
    } else {
      // If the next cell is out of bounds, stop auto-population
      selectedCell.classList.remove("arrow-down", "arrow-right");
      const overlay = selectedCell.querySelector(".overlay");
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
      const cell = document.createElement("div");
      cell.classList.add("board-cell");
      cell.dataset.row = i;
      cell.dataset.col = j;

      if (isSpecialTile(i, j, "triple-word")) cell.classList.add("triple-word");
      else if (isSpecialTile(i, j, "double-word"))
        cell.classList.add("double-word");
      else if (isSpecialTile(i, j, "triple-letter"))
        cell.classList.add("triple-letter");
      else if (isSpecialTile(i, j, "double-letter"))
        cell.classList.add("double-letter");
      if (isSpecialTile(i, j, "star")) {
        cell.classList.add("star");
        cell.innerHTML = '<i class="fa-regular fa-star"></i>';
      }

      // Add event listener for cell click
      cell.addEventListener("click", () => handleCellClick(cell));
      board.appendChild(cell);
    }
  }

  // Tile distribution and drawing function
  const tileDistribution = {
    A: { count: 9, points: 1 },
    B: { count: 2, points: 3 },
    C: { count: 2, points: 3 },
    D: { count: 4, points: 2 },
    E: { count: 12, points: 1 },
    F: { count: 2, points: 4 },
    G: { count: 3, points: 2 },
    H: { count: 2, points: 4 },
    I: { count: 9, points: 1 },
    J: { count: 1, points: 8 },
    K: { count: 1, points: 5 },
    L: { count: 4, points: 1 },
    M: { count: 2, points: 3 },
    N: { count: 6, points: 1 },
    O: { count: 8, points: 1 },
    P: { count: 2, points: 3 },
    Q: { count: 1, points: 10 },
    R: { count: 6, points: 1 },
    S: { count: 4, points: 1 },
    T: { count: 6, points: 1 },
    U: { count: 4, points: 1 },
    V: { count: 2, points: 4 },
    W: { count: 2, points: 4 },
    X: { count: 1, points: 8 },
    Y: { count: 2, points: 4 },
    Z: { count: 1, points: 10 },
    "": { count: 2, points: 0 }, // Blanks
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

  let botTiles = drawTiles(7).sort((a, b) => a.letter.localeCompare(b.letter));
  let playerTiles = drawTiles(7).sort((a, b) =>
    a.letter.localeCompare(b.letter)
  ); // Sort tiles alphabetically

  function updatePlayerTiles(newTiles) {
    playerTiles = newTiles.sort((a, b) => a.letter.localeCompare(b.letter));
  }

  // Create the player's rack
  function createPlayerRack(tiles) {
    playerRack.innerHTML = ""; // Clear existing tiles
    tiles.forEach(({ letter, points, id, isBlank }) => {
      const tile = document.createElement("div");
      tile.id = `tile-${id}`; // Use the unique ID
      tile.classList.add("tile");
      tile.setAttribute("draggable", "true");
      if (isBlank || letter === "") {
        tile.classList.add("blank-tile"); // Add class for blank tiles
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
    const tiles = document.querySelectorAll(".tile");
    tiles.forEach((tile) => {
      tile.addEventListener("dragstart", handleDragStart);
      tile.addEventListener("dragend", handleDragEnd); // Add dragend event
    });

    board.addEventListener("dragover", handleDragOver);
    board.addEventListener("drop", handleDrop);

    playerRack.addEventListener("dragover", handleDragOver);
    playerRack.addEventListener("drop", handleRackDrop);
  }

  function handleDragStart(e) {
    e.dataTransfer.setData("text/plain", e.target.id);
    setTimeout(() => {
      e.target.style.visibility = "hidden";
      e.target.classList.add("dragging"); // Add a class to indicate the tile is being dragged
    }, 0);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function createLetterGrid() {
    const letterGrid = document.getElementById("letter-grid");
    letterGrid.innerHTML = ""; // Clear existing tiles
    for (let i = 65; i <= 90; i++) {
      const letterTile = document.createElement("div");
      letterTile.classList.add("letter-tile");
      letterTile.textContent = String.fromCharCode(i);
      letterTile.addEventListener("click", () => {
        document.getElementById("blank-tile-letter").value =
          letterTile.textContent;
        submitBlankTileLetter(); // Automatically submit
      });
      letterGrid.appendChild(letterTile);
    }
  }

  function submitBlankTileLetter() {
    const letter = document
      .getElementById("blank-tile-letter")
      .value.toUpperCase();
    if (letter.match(/^[A-Z]$/)) {
      currentTile.innerHTML = `
                <div class="circle"></div>
                <span class="letter">${letter}</span>
                <span class="tile-points">0</span>`;
      currentTile.classList.add("blank-tile"); // Add a class for blank tiles
      currentTile.dataset.assignedLetter = letter; // Store the assigned letter

      // Push the placed tile and its parent cell to the stack if not already there
      const parentCell = currentTile.parentElement;
      if (!placedTilesStack.some((entry) => entry.tile === currentTile)) {
        placedTilesStack.push({ tile: currentTile, parentCell });
      }

      popupContainer.style.display = "none";
    } else {
      alert("Please enter a valid letter.");
    }
  }

  function showBlankTilePopup(tile) {
    currentTile = tile; // Set the current tile
    document.getElementById("blank-tile-letter").value = ""; // Clear input field
    createLetterGrid(); // Populate the letter grid
    popupContainer.style.display = "flex";
    blankTileSubmit.onclick = submitBlankTileLetter;
  }

  function showScoreBubble(cell, score) {
    // Remove existing score bubble if any
    const existingBubble = document.querySelector(".score-bubble");
    if (existingBubble) {
      existingBubble.remove();
    }

    // Create a new score bubble
    const bubble = document.createElement("div");
    bubble.classList.add("score-bubble");
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
    const id = e.dataTransfer.getData("text");
    const tile = document.getElementById(id);
    tile.style.visibility = "visible";
    tile.classList.remove("dragging"); // Remove the dragging class

    let targetCell;
    if (
      e.target.classList.contains("board-cell") &&
      !e.target.querySelector(".tile")
    ) {
      e.target.appendChild(tile);
      tile.classList.add("newly-placed"); // Add a class to flag the tile
      targetCell = e.target;
    } else if (
      e.target.parentElement.classList.contains("board-cell") &&
      !e.target.parentElement.querySelector(".tile")
    ) {
      e.target.parentElement.appendChild(tile);
      tile.classList.add("newly-placed"); // Add a class to flag the tile
      targetCell = e.target.parentElement;
    }

    if (targetCell) {
      // Push the placed tile and its parent cell to the stack
      placedTilesStack.push({ tile, parentCell: targetCell });

      // Remove the tile from playerTiles
      const tileId = tile.id.replace("tile-", "");
      playerTiles = playerTiles.filter((t) => t.id !== tileId);
      createPlayerRack(playerTiles);

      // Check if the tile is a blank tile
      if (
        tile.classList.contains("blank-tile") &&
        !tile.dataset.assignedLetter
      ) {
        showBlankTilePopup(tile);
        tile.addEventListener("click", handleBlankTileClick); // Add click event listener for newly placed blank tile
      }

      // Calculate and display the current score
      const newlyPlacedTiles = Array.from(
        board.querySelectorAll(".tile.newly-placed")
      );
      const { words, wordPositions, newLetters } =
        getNewWords(newlyPlacedTiles);
      const score = calculateScore(words, newLetters, wordPositions);

      showScoreBubble(targetCell, score);
    }
  }

  function handleBlankTileClick() {
    showBlankTilePopup(this);
  }

  function handleRackDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    const tile = document.getElementById(id);
    tile.style.visibility = "visible";
    tile.classList.remove("dragging"); // Remove the dragging class
    tile.classList.remove("newly-placed"); // Remove the newly-placed class

    // Reset blank tile to its original state when returned to the rack
    if (tile.classList.contains("blank-tile")) {
      tile.innerHTML = `<span class="tile-points">0</span>`;
      tile.removeEventListener("click", handleBlankTileClick); // Remove click event listener after setting letter
      delete tile.dataset.assignedLetter; // Remove the assigned letter attribute
      tile.classList.remove("blank-tile"); // Remove blank tile class
    }

    // Re-add the tile back to playerTiles
    const tileId = tile.id.replace("tile-", "");
    if (!playerTiles.some((t) => t.id === tileId)) {
      playerTiles.push({
        letter: tile.classList.contains("blank-tile")
          ? ""
          : tile.textContent.trim().charAt(0),
        points: tile.classList.contains("blank-tile")
          ? 0
          : parseInt(tile.querySelector(".tile-points").textContent),
        id: tileId,
        isBlank: tile.classList.contains("blank-tile"),
      });
    }

    // Append the tile to the player rack in the exact position it was dragged from
    const draggedTile = playerRack.querySelector(".dragging");
    if (draggedTile) {
      const index = Array.from(playerRack.children).indexOf(draggedTile);
      playerRack.insertBefore(tile, playerRack.children[index]);
    } else {
      playerRack.appendChild(tile);
    }
  }

  function handleDragEnd(e) {
    e.target.style.visibility = "visible";
    e.target.classList.remove("dragging"); // Remove the dragging class
  }

  // Reset the rack
  resetRackButton.addEventListener("click", () => {
    // Clear the placed tiles stack
    placedTilesStack = [];

    // Remove existing score bubble if any
    const existingBubble = document.querySelector(".score-bubble");
    if (existingBubble) {
      existingBubble.remove();
    }

    // Get the newly placed tiles from the board
    const newlyPlacedTiles = Array.from(
      board.querySelectorAll(".tile.newly-placed")
    );

    // Create a Set to track unique tile IDs from playerTiles
    const uniqueTileIds = new Set(playerTiles.map((tile) => tile.id));

    // Add the newly placed tiles back to the player's rack if they are not duplicates
    newlyPlacedTiles.forEach((tile) => {
      const tileId = tile.id.replace("tile-", "");
      if (!uniqueTileIds.has(tileId)) {
        uniqueTileIds.add(tileId);
        playerTiles.push({
          letter: tile.classList.contains("blank-tile")
            ? ""
            : tile.textContent.trim().charAt(0),
          points: tile.classList.contains("blank-tile")
            ? 0
            : parseInt(tile.querySelector(".tile-points").textContent),
          id: tileId,
          isBlank: tile.classList.contains("blank-tile"),
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
  shuffleRackButton.addEventListener("click", () => {
    const tiles = Array.from(playerRack.querySelectorAll(".tile"));
    const shuffledTiles = tiles
      .map((tile) => {
        return {
          letter: tile.classList.contains("blank-tile")
            ? ""
            : tile.textContent.trim().charAt(0),
          points: parseInt(tile.querySelector(".tile-points").textContent) || 0,
          id: tile.id.replace("tile-", ""),
          isBlank: tile.classList.contains("blank-tile"),
        };
      })
      .sort(() => Math.random() - 0.5);

    createPlayerRack(shuffledTiles);
  });

  // Event listeners for new buttons
  optionsButton.addEventListener("click", () => {
    console.log("Options button clicked");
  });

  playButton.addEventListener("click", () => {
    // Remove existing score bubble if any
    const existingBubble = document.querySelector(".score-bubble");
    if (existingBubble) {
      existingBubble.remove();
    }

    const newlyPlacedTiles = Array.from(
      board.querySelectorAll(".tile.newly-placed")
    );

    if (newlyPlacedTiles.length === 0) {
      alert("No tiles placed.");
      return;
    }

    // Ensure the first word crosses through the center tile (7,7)
    if (isFirstMove) {
      const crossesCenter = newlyPlacedTiles.some((tile) => {
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
      const allTiles = Array.from(
        board.querySelectorAll(".tile:not(.newly-placed)")
      );
      const isAdjacentToExistingTile = newlyPlacedTiles.some((tile) => {
        const cell = tile.parentElement;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        return allTiles.some((existingTile) => {
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

    // Reset consecutive zero score turns if this move has a score
    if (score > 0) {
      consecutiveZeroScoreTurns = 0;
    }

    // Check each word's validity
    if (words.length > 0) {
      checkWordsValidity(words, score, wordPositions, newLetters);
    }

    // Remove click event listener from blank tiles
    newlyPlacedTiles.forEach((tile) => {
      if (tile.classList.contains("blank-tile")) {
        tile.removeEventListener("click", handleBlankTileClick);
      }
    });
  });

  // Function to check if all tiles form a single continuous word
  function checkIfTilesFormSingleWord(tiles) {
    if (tiles.length <= 1) return true;

    const coordinates = tiles.map((tile) => {
      const cell = tile.parentElement;
      return {
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
      };
    });

    const rows = [...new Set(coordinates.map((coord) => coord.row))];
    const cols = [...new Set(coordinates.map((coord) => coord.col))];

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
    const wordPositions = []; // Array to store positions of all letters in the words
    const newLetters = []; // Array to store new letters and their positions

    // Collect coordinates of newly placed tiles
    const coordinates = newlyPlacedTiles.map((tile) => {
      const cell = tile.parentElement;
      const letter = tile.classList.contains("blank-tile")
        ? tile.dataset.assignedLetter
        : tile.textContent.trim().charAt(0);
      newLetters.push({
        letter,
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
      }); // Add new letters to the array
      return {
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
        letter,
      };
    });

    console.log(coordinates);

    // Sort by row and column
    coordinates.sort((a, b) =>
      a.row === b.row ? a.col - b.col : a.row - b.row
    );

    // Determine if the main word is vertical or horizontal
    const isHorizontal = coordinates.every(
      (coord) => coord.row === coordinates[0].row
    );
    const isVertical = coordinates.every(
      (coord) => coord.col === coordinates[0].col
    );

    if (!isHorizontal && !isVertical) {
      alert("Tiles must be placed in a straight line.");
      resetRackButton.click();
      return { words: [], wordPositions: [], newLetters: [] };
    }

    // Get the main word formed
    let mainWord = "";
    let mainWordPositions = [];
    let startRow = coordinates[0].row;
    let startCol = coordinates[0].col;

    if (isHorizontal) {
      // Find the starting column of the main word
      while (
        startCol > 0 &&
        board.querySelector(
          `[data-row="${startRow}"][data-col="${startCol - 1}"] .tile`
        )
      ) {
        startCol--;
      }
      // Construct the main word
      let col = startCol;
      while (
        col < 15 &&
        board.querySelector(`[data-row="${startRow}"][data-col="${col}"] .tile`)
      ) {
        const tile = board.querySelector(
          `[data-row="${startRow}"][data-col="${col}"] .tile`
        );
        mainWord += tile.textContent.trim().charAt(0);
        mainWordPositions.push({
          letter: tile.textContent.trim().charAt(0),
          row: startRow,
          col,
        });
        col++;
      }
    } else {
      // Find the starting row of the main word
      while (
        startRow > 0 &&
        board.querySelector(
          `[data-row="${startRow - 1}"][data-col="${startCol}"] .tile`
        )
      ) {
        startRow--;
      }
      // Construct the main word
      let row = startRow;
      while (
        row < 15 &&
        board.querySelector(`[data-row="${row}"][data-col="${startCol}"] .tile`)
      ) {
        const tile = board.querySelector(
          `[data-row="${row}"][data-col="${startCol}"] .tile`
        );
        mainWord += tile.textContent.trim().charAt(0);
        mainWordPositions.push({
          letter: tile.textContent.trim().charAt(0),
          row,
          col: startCol,
        });
        row++;
      }
    }
    if (mainWord.length > 1) {
      words.push(mainWord);
      wordPositions.push(mainWordPositions);
    }

    // Get adjacent words formed
    coordinates.forEach((coord) => {
      const row = coord.row;
      const col = coord.col;

      if (isHorizontal) {
        // Check vertically for adjacent words
        let verticalWord = coord.letter;
        let verticalWordPositions = [{ letter: coord.letter, row, col }];
        for (let i = row - 1; i >= 0; i--) {
          const aboveTile = board.querySelector(
            `[data-row="${i}"][data-col="${col}"] .tile`
          );
          if (aboveTile) {
            verticalWord =
              aboveTile.textContent.trim().charAt(0) + verticalWord;
            verticalWordPositions.unshift({
              letter: aboveTile.textContent.trim().charAt(0),
              row: i,
              col,
            });
          } else {
            break;
          }
        }
        for (let i = row + 1; i < 15; i++) {
          const belowTile = board.querySelector(
            `[data-row="${i}"][data-col="${col}"] .tile`
          );
          if (belowTile) {
            verticalWord += belowTile.textContent.trim().charAt(0);
            verticalWordPositions.push({
              letter: belowTile.textContent.trim().charAt(0),
              row: i,
              col,
            });
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
          const leftTile = board.querySelector(
            `[data-row="${row}"][data-col="${i}"] .tile`
          );
          if (leftTile) {
            horizontalWord =
              leftTile.textContent.trim().charAt(0) + horizontalWord;
            horizontalWordPositions.unshift({
              letter: leftTile.textContent.trim().charAt(0),
              row,
              col: i,
            });
          } else {
            break;
          }
        }
        for (let i = col + 1; i < 15; i++) {
          const rightTile = board.querySelector(
            `[data-row="${row}"][data-col="${i}"] .tile`
          );
          if (rightTile) {
            horizontalWord += rightTile.textContent.trim().charAt(0);
            horizontalWordPositions.push({
              letter: rightTile.textContent.trim().charAt(0),
              row,
              col: i,
            });
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

      positions.forEach((pos) => {
        const cell = board.querySelector(
          `[data-row="${pos.row}"][data-col="${pos.col}"]`
        );
        const letter = pos.letter;
        let letterScore = 0;

        // Check if the tile is newly placed and if it's a blank tile
        const tileElement = cell.querySelector(".tile");
        if (tileElement.classList.contains("blank-tile")) {
          letterScore = 0; // Blank tiles are worth 0 points
        } else {
          letterScore = tileDistribution[letter]
            ? tileDistribution[letter].points
            : 0;
        }

        // Check if the tile is newly placed
        if (tileElement.classList.contains("newly-placed")) {
          if (cell.classList.contains("double-letter")) {
            letterScore *= 2;
          } else if (cell.classList.contains("triple-letter")) {
            letterScore *= 3;
          }

          if (cell.classList.contains("double-word")) {
            wordMultiplier *= 2;
          } else if (cell.classList.contains("triple-word")) {
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
  function checkWordsValidity(words, score, wordPositions, newLetters) {
    const checkWordPromises = words.map((word) => {
      return fetch("/check_word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: word }),
      }).then((response) => response.json());
    });

    Promise.all(checkWordPromises)
      .then((results) => {
        const invalidWords = results.filter((result) => !result.in_nwl);
        if (invalidWords.length > 0) {
          alert("Invalid word played.");
          // Clear the newly placed tiles from the board
          resetRackButton.click();
        } else {
          // Increment or reset consecutive zero score turns
          if (score === 0) {
            consecutiveZeroScoreTurns++;
          } else {
            consecutiveZeroScoreTurns = 0;
          }

          // Remove the newly-placed class from all tiles on the board
          const newlyPlacedTiles = board.querySelectorAll(".tile.newly-placed");
          newlyPlacedTiles.forEach((tile) => {
            tile.classList.remove("newly-placed");
            tile.setAttribute("draggable", "false");
          });

          // Draw new tiles for the player
          const remainingTiles = Array.from(
            playerRack.querySelectorAll(".tile")
          ).map((tile) => ({
            letter:
              tile.textContent.trim().charAt(0) === "0"
                ? ""
                : tile.textContent.trim().charAt(0), // Handle blank tiles
            points: parseInt(tile.querySelector(".tile-points").textContent),
            id: tile.id.replace("tile-", ""),
          }));

          const numTilesToDraw = 7 - remainingTiles.length;
          const newTiles = drawTiles(numTilesToDraw).sort((a, b) =>
            a.letter.localeCompare(b.letter)
          );
          const updatedTiles = remainingTiles
            .concat(newTiles)
            .sort((a, b) => a.letter.localeCompare(b.letter));

          createPlayerRack(updatedTiles);
          updatePlayerTiles(updatedTiles);

          // Update player's score
          playerScore += score;
          document.getElementById(
            "player-score"
          ).textContent = `Player: ${playerScore}`;
          updateSidebar();

          const oldScore = playerScore - score;
          const formattedWords = [];
          for (let i = 0; i < words.length; i++) {
            formattedWords.push(
              formatWordText(words[i], wordPositions[i], newLetters)
            );
          }
          const wordText = formattedWords.join("/");
          const position = determineWordPosition(newlyPlacedTiles);
          addMoveToGameLog("player", position, wordText, oldScore, score);

          // Mark that the first move has been made
          if (isFirstMove) isFirstMove = false;

          // Check if the player has played all tiles and the bag is empty (game end)
          if (playerTiles.length === 0 && tileBag.length === 0) {
            // Player has played out - end the game
            endGame();
            return;
          }

          // Check if the game should end due to consecutive passes
          if (consecutiveZeroScoreTurns >= 6) {
            showGameEndDialog(
              "There have been 6 consecutive turns with no score. Would you like to end the game?"
            );
            return;
          }

          // Gather the current state
          const boardState = getBoardState();
          const playerRackState = playerTiles.map((tile) => ({
            letter: tile.letter,
            points: tile.points,
          }));
          const botRackState = botTiles.map((tile) => ({
            letter: tile.letter,
            points: tile.points,
          }));
          const tileBagState = tileBag;
          getMove(boardState, playerRackState, botRackState, tileBagState);
        }
      })
      .catch((error) => {
        // Add error handling for the Promise.all
        console.error("Error checking word validity:", error);
        alert("There was an error checking word validity. Please try again.");
      });
  }

  // Game log functions
  function createGameLogEntry(
    player,
    position,
    tiles,
    scoreBefore,
    scoreGain,
    totalScore
  ) {
    const moveEntry = document.createElement("div");
    moveEntry.classList.add("move-entry");

    // Create avatar element
    const avatar = document.createElement("div");
    avatar.classList.add("player-avatar");

    // Different styles for player vs bot
    const avatarColor = player === "player" ? "#5e6fcc" : "#e74c3c";
    avatar.innerHTML = `<div style="width:30px;height:30px;background:${avatarColor};border-radius:50%;"></div>`;

    // Create move info section
    const moveInfo = document.createElement("div");
    moveInfo.classList.add("move-info");

    const movePosition = document.createElement("div");
    movePosition.classList.add("move-position");
    movePosition.textContent = position;

    const tilesPlayed = document.createElement("div");
    tilesPlayed.classList.add("tiles-played");
    tilesPlayed.textContent = tiles;

    moveInfo.appendChild(movePosition);
    moveInfo.appendChild(tilesPlayed);

    // Create score section
    const moveScore = document.createElement("div");
    moveScore.classList.add("move-score");

    const scoreBeforeEl = document.createElement("div");
    scoreBeforeEl.classList.add("score-before");
    scoreBeforeEl.textContent = scoreBefore;

    const scoreGainEl = document.createElement("div");
    scoreGainEl.classList.add("score-gain");
    scoreGainEl.textContent = scoreGain > 0 ? `+${scoreGain}` : "0";

    const totalScoreEl = document.createElement("div");
    totalScoreEl.classList.add("total-score");
    totalScoreEl.textContent = totalScore;

    moveScore.appendChild(scoreBeforeEl);
    moveScore.appendChild(scoreGainEl);
    moveScore.appendChild(totalScoreEl);

    // Assemble the move entry
    moveEntry.appendChild(avatar);
    moveEntry.appendChild(moveInfo);
    moveEntry.appendChild(moveScore);

    return moveEntry;
  }

  // Function to add a move to the game log
  function addMoveToGameLog(player, position, tiles, scoreBefore, scoreGain) {
    const gameLog = document.getElementById("game-log");
    const totalScore = scoreBefore + scoreGain;

    const entry = createGameLogEntry(
      player,
      position,
      tiles,
      scoreBefore,
      scoreGain,
      totalScore
    );

    // Simply append to the game log instead of inserting at the top
    gameLog.appendChild(entry);

    // Update turn counter
    const currentTurn = document.getElementById("current-turn");
    currentTurn.textContent = parseInt(currentTurn.textContent) + 1;

    // Scroll to the bottom to show the latest move
    gameLog.scrollTop = gameLog.scrollHeight;
  }

  // Enhanced update sidebar function with vowel/consonant counting
  function updateSidebar() {
    document.getElementById("tiles-left").textContent = tileBag.length;
    const bagContents = document.getElementById("bag-contents");
    bagContents.innerHTML = "";

    // Count vowels and consonants
    let vowels = 0;
    let consonants = 0;

    const letters = Object.keys(tileDistribution).sort();
    let displayString = "";

    letters.forEach((letter) => {
      const remainingCount = tileBag.filter(
        (tile) => tile.letter === letter
      ).length;

      if (remainingCount > 0) {
        // Count vowels and consonants
        if (
          letter === "A" ||
          letter === "E" ||
          letter === "I" ||
          letter === "O" ||
          letter === "U"
        ) {
          vowels += remainingCount;
        } else if (letter !== "") {
          // Skip blank tiles in the count
          consonants += remainingCount;
        }

        let letterDisplay = letter === "" ? "?" : letter;
        for (let i = 0; i < remainingCount; i++) {
          if (i > 0 && i % 6 === 0) {
            displayString += " ";
          }
          displayString += letterDisplay;
        }
        displayString += " ";
      }
    });

    // Update the display for bag contents
    bagContents.textContent = displayString.trim();

    // Update vowel and consonant counts
    document.getElementById("vowel-count").textContent = vowels;
    document.getElementById("consonant-count").textContent = consonants;
  }

  // Initial sidebar update
  updateSidebar();

  function placeBotWord(word, startRow, startCol, direction, score) {
    console.log(
      `Placing bot word: "${word}" at (${
        startRow + 1
      },${startCol}) ${direction}`
    );

    let row = startRow;
    let col = startCol;

    // First check if all cells along the word path exist and are valid
    const wordCells = [];
    const cellsToPopulate = [];

    for (let i = 0; i < word.length; i++) {
      // Check if this position is on the board
      if (row >= 15 || col >= 15) {
        console.error(`Word exceeds board boundaries at letter ${i + 1}`);
        return;
      }

      // Get the cell at this position
      const cell = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (!cell) {
        console.error(`Cannot find cell at position (${row},${col})`);
        return;
      }

      // Check if there's already a tile at this position
      const existingTile = cell.querySelector(".tile");

      // Store information about this cell
      const letterToPlace = word[i];
      const isBlank = letterToPlace === letterToPlace.toLowerCase(); // Lowercase indicates blank

      // Only add to cellsToPopulate if there is no existing tile
      if (!existingTile) {
        cellsToPopulate.push({
          cell,
          row,
          col,
          letter: letterToPlace,
          isBlank,
        });
      }

      // Move to the next position
      if (direction === "horizontal") {
        col++;
      } else {
        row++;
      }
    }

    console.log(
      `Word cells: ${word.length}, Cells to populate: ${cellsToPopulate.length}`
    );

    // Now place tiles only in the empty cells
    cellsToPopulate.forEach(({ cell, letter, isBlank }) => {
      // Create a new tile element
      const newTile = document.createElement("div");
      // Generate a unique ID for this bot tile
      const uniqueId = `bot-${letter}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;
      newTile.id = uniqueId;
      newTile.classList.add("tile", "bot-placed");

      if (isBlank) {
        // Handle blank tile
        newTile.classList.add("blank-tile");
        newTile.innerHTML = `
          <div class="circle"></div>
          <span class="letter">${letter.toUpperCase()}</span>
          <span class="tile-points">0</span>`;
      } else {
        // Regular tile
        const points = tile_points[letter.toUpperCase()] || 0;
        newTile.innerHTML = `${letter.toUpperCase()}<span class="tile-points">${points}</span>`;
      }

      // Add tile to the board
      cell.appendChild(newTile);

      // If the tile is placed on the star cell, hide the star icon
      if (cell.classList.contains("star")) {
        cell.classList.add("tile-placed");
      }

      // Add animation
      setTimeout(() => {
        newTile.classList.add("placed");
      }, 10);
    });

    // Display a message about the play
    if (cellsToPopulate.length > 0) {
      showBotMoveMessage(`Bot played "${word}" for ${score} points`);
    } else {
      showBotMoveMessage(`Bot's word "${word}" used only existing tiles`);
    }

    // After placing the word, add it to the game log
    const botScore =
      parseInt(
        document.getElementById("opponent-score").textContent.split(": ")[1]
      ) - score;

    // Format position based on direction
    let position;
    if (direction === "vertical") {
      position = `${String.fromCharCode(65 + startCol)}${startRow + 1}`;
    } else {
      position = `${startRow + 1}${String.fromCharCode(65 + startCol)}`;
    }

    // Create a properly formatted word with grouped parentheses
    let formattedWord = "";
    let inParentheses = false;
    let currentParenGroup = "";

    let rowPtr = startRow;
    let colPtr = startCol;

    for (let i = 0; i < word.length; i++) {
      const letterToPlace = word[i];
      const isBlank = letterToPlace === letterToPlace.toLowerCase();

      // Check if this position already had a tile
      const cell = document.querySelector(
        `[data-row="${rowPtr}"][data-col="${colPtr}"]`
      );
      const existingTile = cell.querySelector(".tile");
      const wasExisting =
        existingTile &&
        !cellsToPopulate.some(
          (info) => info.row === rowPtr && info.col === colPtr
        );

      // Determine the letter to display (uppercase or lowercase)
      const displayLetter = isBlank
        ? letterToPlace.toLowerCase()
        : letterToPlace.toUpperCase();

      if (wasExisting) {
        // Existing tile - add to parentheses group
        if (!inParentheses) {
          inParentheses = true;
          currentParenGroup = displayLetter;
        } else {
          // Add to the current group
          currentParenGroup += displayLetter;
        }
      } else {
        // New tile - if we were in parentheses, close the group
        if (inParentheses) {
          formattedWord += `(${currentParenGroup})`;
          inParentheses = false;
          currentParenGroup = "";
        }

        // Add the newly placed letter
        formattedWord += displayLetter;
      }

      // Move to the next position
      if (direction === "horizontal") {
        colPtr++;
      } else {
        rowPtr++;
      }
    }

    // If we ended while still in a parentheses group, add it
    if (inParentheses) {
      formattedWord += `(${currentParenGroup})`;
    }

    // Then use formattedWord instead of word.toUpperCase()
    addMoveToGameLog("bot", position, formattedWord, botScore, score);
  }

  // Function to format word text with proper notation
  function formatWordText(word, wordPositions, newLetters) {
    // Create a formatted version of the word with proper notation
    let formattedWord = "";
    let inParentheses = false;
    let currentParenGroup = "";

    // For each letter position in the word
    for (let i = 0; i < wordPositions.length; i++) {
      const pos = wordPositions[i];
      const row = pos.row;
      const col = pos.col;
      const letter = pos.letter;

      // Check if this letter is newly placed or existing
      const isNewlyPlaced = newLetters.some(
        (newLetter) => newLetter.row === row && newLetter.col === col
      );

      // Check if the letter is from a blank tile
      const cell = board.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      const tile = cell.querySelector(".tile");
      const isBlank = tile.classList.contains("blank-tile");

      // Determine the letter to display (uppercase or lowercase)
      const displayLetter = isBlank
        ? letter.toLowerCase()
        : letter.toUpperCase();

      if (isNewlyPlaced) {
        // If we were in parentheses and now we're not, close the group
        if (inParentheses) {
          formattedWord += `(${currentParenGroup})`;
          inParentheses = false;
          currentParenGroup = "";
        }

        // Newly placed tiles - just add the letter
        formattedWord += displayLetter;
      } else {
        // Existing tiles - collect into parentheses groups
        if (!inParentheses) {
          inParentheses = true;
          currentParenGroup = displayLetter;
        } else {
          // Add to the current group
          currentParenGroup += displayLetter;
        }
      }
    }

    // If we ended while still in a parentheses group, add it
    if (inParentheses) {
      formattedWord += `(${currentParenGroup})`;
    }

    return formattedWord;
  }

  function determineWordPosition(tiles) {
    console.log("Starting determineWordPosition with tiles:", tiles);

    if (tiles.length === 0) {
      console.log("No tiles provided, returning empty position");
      return "";
    }

    // Check if we can determine orientation
    let isVertical = false;

    if (tiles.length > 1) {
      const firstTileRow = parseInt(tiles[0].parentElement.dataset.row);
      const firstTileCol = parseInt(tiles[0].parentElement.dataset.col);
      const secondTileRow = parseInt(tiles[1].parentElement.dataset.row);
      const secondTileCol = parseInt(tiles[1].parentElement.dataset.col);

      console.log("First tile position:", firstTileRow, firstTileCol);
      console.log("Second tile position:", secondTileRow, secondTileCol);

      isVertical = firstTileCol === secondTileCol;
      console.log("Word orientation is vertical:", isVertical);
    } else {
      console.log("Only one tile, defaulting to horizontal orientation");
    }

    const firstTile = tiles[0];
    const cell = firstTile.parentElement;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    console.log("Using row:", row, "and col:", col);

    // For vertical words: column letter then row number
    // For horizontal words: row number then column letter
    let position;
    if (isVertical) {
      position = `${String.fromCharCode(65 + col)}${row + 1}`;
      console.log("Vertical word position:", position);
    } else {
      position = `${row + 1}${String.fromCharCode(65 + col)}`;
      console.log("Horizontal word position:", position);
    }

    return position;
  }

  // Add improved bot message styling and animation
  function showBotMoveMessage(message) {
    // Create a message overlay that will appear briefly
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("bot-message");
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Show and then fade out
    setTimeout(() => {
      messageDiv.classList.add("show");
    }, 100);

    setTimeout(() => {
      messageDiv.classList.remove("show");
      setTimeout(() => {
        messageDiv.remove();
      }, 500);
    }, 3000);
  }

  // Add debug visualization function to help troubleshoot
  function showBoardState() {
    const boardState = [];
    for (let i = 0; i < 15; i++) {
      const row = [];
      for (let j = 0; j < 15; j++) {
        const cell = document.querySelector(
          `[data-row="${i}"][data-col="${j}"]`
        );
        const tile = cell.querySelector(".tile");
        if (tile) {
          const isBlank = tile.classList.contains("blank-tile");
          let letter;

          // Check if the tile has a .letter span for blank tiles
          const letterSpan = tile.querySelector(".letter");
          if (letterSpan) {
            letter = letterSpan.textContent;
          } else {
            letter = tile.textContent.trim().charAt(0);
          }

          // Add visual indicator of blank tiles
          row.push(isBlank ? letter.toLowerCase() : letter);
        } else {
          row.push("·"); // Use a centered dot for empty cells
        }
      }
      boardState.push(row);
    }

    // Display in console as a nicely formatted grid
    console.log("Current Board State:");
    const formattedBoard = boardState.map((row) => row.join(" ")).join("\n");
    console.log(formattedBoard);

    return formattedBoard;
  }

  // Fix for the second error related to message channel closing
  // This might be related to the server-side implementation
  // Modify the getMove function to handle timeouts and connection errors

  function getMove(boardState, playerRackState, botRackState, tileBagState) {
    // If the game has ended, don't make any more moves
    if (gameEnded) {
      return;
    }

    console.log("=== Bot's Turn ===");
    console.log("Current board state:");
    showBoardState();
    console.log("Bot's rack:", botRackState);

    // Construct the request data
    const requestData = {
      board: boardState,
      playerRack: playerRackState,
      botRack: botRackState,
      tileBag: tileBagState,
    };

    // Add a timeout to the fetch request
    const fetchPromise = fetch("/get_move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 30000); // 30 second timeout
    });

    // Race the fetch against the timeout
    Promise.race([fetchPromise, timeoutPromise])
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Bot move response:", data);

        // Process the response from the server
        if (data.moveType === "play") {
          // Increment or reset consecutive zero score turns
          if (data.score === 0) {
            consecutiveZeroScoreTurns++;
          } else {
            consecutiveZeroScoreTurns = 0;
          }

          // Update opponent score
          const opponentScoreElement =
            document.getElementById("opponent-score");
          if (opponentScoreElement) {
            const opponentScore = parseInt(
              opponentScoreElement.textContent.split(": ")[1] || "0"
            );
            opponentScoreElement.textContent = `Opponent: ${
              opponentScore + data.score
            }`;
          }

          // Find the actual word start position
          let actualRow = data.row;
          let actualCol = data.col;

          // Adjust the position to find the beginning of the word
          if (data.direction === "horizontal") {
            // Move backwards horizontally to find the start of the word
            let currentCol = actualCol;
            while (currentCol > 0) {
              const cell = document.querySelector(
                `[data-row="${actualRow}"][data-col="${currentCol - 1}"]`
              );
              if (cell && cell.querySelector(".tile")) {
                currentCol--;
              } else {
                break;
              }
            }
            actualCol = currentCol;
          } else {
            // vertical
            // Move backwards vertically to find the start of the word
            let currentRow = actualRow;
            while (currentRow > 0) {
              const cell = document.querySelector(
                `[data-row="${currentRow - 1}"][data-col="${actualCol}"]`
              );
              if (cell && cell.querySelector(".tile")) {
                currentRow--;
              } else {
                break;
              }
            }
            actualRow = currentRow;
          }

          // Place the bot's tiles on the board
          console.log(
            `Bot is playing "${data.word}" at (${data.row},${data.col}) ${data.direction} for ${data.score} points`
          );
          placeBotWord(
            data.word,
            actualRow,
            actualCol,
            data.direction,
            data.score
          );

          // Show the board state after the bot's move
          setTimeout(() => {
            console.log("Board state after bot's move:");
            showBoardState();
          }, 500);

          // Update bot rack and tile bag
          botTiles = data.newBotRack.map((tile, index) => {
            // Ensure all tiles have IDs
            if (!tile.id) {
              tile.id = `bot-tile-${index}-${Math.random()
                .toString(36)
                .substring(2, 8)}`;
            }
            return tile;
          });

          // Update the tile bag from the server response
          tileBag = data.newTileBag;

          // Check if the bot has played out (used all tiles and the bag is empty)
          if (botTiles.length === 0 && tileBag.length === 0) {
            // Bot has played out - end the game
            endGame();
            return;
          }

          // Check if the game should end due to consecutive passes
          if (consecutiveZeroScoreTurns >= 6) {
            showGameEndDialog(
              "There have been 6 consecutive turns with no score. Would you like to end the game?"
            );
            return;
          }
        } else if (data.moveType === "exchange" || data.moveType === "pass") {
          // Handle exchange or pass moves (similar logic to the original)
          // Update turn info, increment consecutive zero score turns, update UI, etc.
          // ...

          // Update the sidebar to reflect the new tile bag status
          updateSidebar();
        }

        // Update the sidebar to reflect the new tile bag status
        updateSidebar();
      })
      .catch((error) => {
        console.error("Error processing move:", error);
        if (document.getElementById("turn-info")) {
          document.getElementById("turn-info").textContent =
            "Error getting bot move";
        }

        // Provide a retry option
        if (
          confirm(
            "There was an error getting the bot's move. Would you like to try again?"
          )
        ) {
          // Wait a moment and retry
          setTimeout(() => {
            getMove(boardState, playerRackState, botRackState, tileBagState);
          }, 1000);
        }
      });
  }

  // Get the exchange popup elements
  const exchangePopup = document.getElementById("exchange-popup");
  const exchangeRack = document.getElementById("exchange-rack");
  const exchangeConfirmBtn = document.getElementById("exchange-confirm");
  const exchangeCancelBtn = document.getElementById("exchange-cancel");

  // Event listeners for Pass button
  passButton.addEventListener("click", () => {
    // Check if the game has ended
    if (gameEnded) {
      alert("The game has ended. No more moves are allowed.");
      return;
    }

    // Increment consecutive zero score turns
    consecutiveZeroScoreTurns++;

    // Simple pass functionality - just call the bot move
    const boardState = getBoardState();
    const playerRackState = playerTiles.map((tile) => ({
      letter: tile.letter,
      points: tile.points,
    }));
    const botRackState = botTiles.map((tile) => ({
      letter: tile.letter,
      points: tile.points,
    }));
    const tileBagState = tileBag;

    // If this is the first move, mark it as completed since the player passed
    if (isFirstMove) {
      isFirstMove = false;
    }

    // Show a message that the player passed
    showPlayerMoveMessage("You passed your turn");

    // Check if the game should end due to consecutive passes
    if (consecutiveZeroScoreTurns >= 6) {
      showGameEndDialog(
        "There have been 6 consecutive turns with no score. Would you like to end the game?"
      );
      return;
    }

    // Get the bot's move
    getMove(boardState, playerRackState, botRackState, tileBagState);
  });

  // Add a function to handle game end dialog
  function showGameEndDialog(message) {
    // Create a game end dialog
    const dialogOverlay = document.createElement("div");
    dialogOverlay.id = "game-end-dialog-overlay";
    dialogOverlay.style.position = "fixed";
    dialogOverlay.style.top = "0";
    dialogOverlay.style.left = "0";
    dialogOverlay.style.width = "100%";
    dialogOverlay.style.height = "100%";
    dialogOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    dialogOverlay.style.display = "flex";
    dialogOverlay.style.justifyContent = "center";
    dialogOverlay.style.alignItems = "center";
    dialogOverlay.style.zIndex = "2000";

    const dialogBox = document.createElement("div");
    dialogBox.style.backgroundColor = "white";
    dialogBox.style.padding = "30px";
    dialogBox.style.borderRadius = "8px";
    dialogBox.style.maxWidth = "500px";
    dialogBox.style.textAlign = "center";

    const dialogMessage = document.createElement("p");
    dialogMessage.textContent = message;
    dialogMessage.style.marginBottom = "20px";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "20px";

    const endGameButton = document.createElement("button");
    endGameButton.textContent = "End Game";
    endGameButton.style.padding = "10px 20px";
    endGameButton.style.backgroundColor = "#e74c3c";
    endGameButton.style.color = "white";
    endGameButton.style.border = "none";
    endGameButton.style.borderRadius = "4px";
    endGameButton.style.cursor = "pointer";

    const continueButton = document.createElement("button");
    continueButton.textContent = "Continue Playing";
    continueButton.style.padding = "10px 20px";
    continueButton.style.backgroundColor = "#27ae60";
    continueButton.style.color = "white";
    continueButton.style.border = "none";
    continueButton.style.borderRadius = "4px";
    continueButton.style.cursor = "pointer";

    endGameButton.addEventListener("click", () => {
      endGame();
      document.body.removeChild(dialogOverlay);
    });

    continueButton.addEventListener("click", () => {
      document.body.removeChild(dialogOverlay);
      // Continue the game by getting the bot's move
      const boardState = getBoardState();
      const playerRackState = playerTiles.map((tile) => ({
        letter: tile.letter,
        points: tile.points,
      }));
      const botRackState = botTiles.map((tile) => ({
        letter: tile.letter,
        points: tile.points,
      }));
      const tileBagState = tileBag;
      getMove(boardState, playerRackState, botRackState, tileBagState);
    });

    buttonContainer.appendChild(endGameButton);
    buttonContainer.appendChild(continueButton);
    dialogBox.appendChild(dialogMessage);
    dialogBox.appendChild(buttonContainer);
    dialogOverlay.appendChild(dialogBox);

    document.body.appendChild(dialogOverlay);
  }

  // Fix the endGame function to correctly handle scoring
  function endGame() {
    gameEnded = true;

    // Calculate final scores
    const playerFinalScore = parseInt(
      document.getElementById("player-score").textContent.split(": ")[1]
    );
    const botFinalScore = parseInt(
      document.getElementById("opponent-score").textContent.split(": ")[1]
    );

    // Calculate remaining tile values for both players
    let playerRemainingPoints = 0;
    playerTiles.forEach((tile) => {
      playerRemainingPoints += tile.points;
    });

    let botRemainingPoints = 0;
    botTiles.forEach((tile) => {
      botRemainingPoints += tile.points;
    });

    // Determine if player played out (used all tiles)
    const playerPlayedOut = playerTiles.length === 0 && tileBag.length === 0;

    // Determine if bot played out (used all tiles)
    const botPlayedOut = botTiles.length === 0 && tileBag.length === 0;

    // Adjust scores based on remaining tiles
    let adjustedPlayerScore = playerFinalScore;
    let adjustedBotScore = botFinalScore;

    if (playerPlayedOut) {
      // Player played out, add bot's remaining points to player score
      adjustedPlayerScore += botRemainingPoints;
      // Bot subtracts the value of their remaining tiles
      adjustedBotScore -= botRemainingPoints;
    } else if (botPlayedOut) {
      // Bot played out, add player's remaining points to bot score
      adjustedBotScore += playerRemainingPoints;
      // Player subtracts the value of their remaining tiles
      adjustedPlayerScore -= playerRemainingPoints;
    } else {
      // Neither played out, subtract each player's remaining points from their score
      adjustedPlayerScore -= playerRemainingPoints;
      adjustedBotScore -= botRemainingPoints;
    }

    // Determine the winner
    let resultMessage;
    if (adjustedPlayerScore > adjustedBotScore) {
      resultMessage = `Game Over! You win with a score of ${adjustedPlayerScore} to ${adjustedBotScore}!`;
    } else if (adjustedBotScore > adjustedPlayerScore) {
      resultMessage = `Game Over! The bot wins with a score of ${adjustedBotScore} to ${adjustedPlayerScore}.`;
    } else {
      resultMessage = `Game Over! It's a tie with a score of ${adjustedPlayerScore}!`;
    }

    // Display the results
    displayGameResults(
      resultMessage,
      playerFinalScore,
      botFinalScore,
      playerRemainingPoints,
      botRemainingPoints,
      adjustedPlayerScore,
      adjustedBotScore
    );
  }

  // Add a function to display the game results
  function displayGameResults(
    resultMessage,
    playerScore,
    botScore,
    playerRemainingPoints,
    botRemainingPoints,
    adjustedPlayerScore,
    adjustedBotScore
  ) {
    // Create a results overlay
    const resultsOverlay = document.createElement("div");
    resultsOverlay.id = "game-results-overlay";
    resultsOverlay.style.position = "fixed";
    resultsOverlay.style.top = "0";
    resultsOverlay.style.left = "0";
    resultsOverlay.style.width = "100%";
    resultsOverlay.style.height = "100%";
    resultsOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    resultsOverlay.style.display = "flex";
    resultsOverlay.style.justifyContent = "center";
    resultsOverlay.style.alignItems = "center";
    resultsOverlay.style.zIndex = "2000";

    const resultsBox = document.createElement("div");
    resultsBox.style.backgroundColor = "white";
    resultsBox.style.padding = "30px";
    resultsBox.style.borderRadius = "8px";
    resultsBox.style.maxWidth = "600px";
    resultsBox.style.width = "80%";

    const resultsHeader = document.createElement("h2");
    resultsHeader.textContent = "Game Results";
    resultsHeader.style.textAlign = "center";
    resultsHeader.style.marginBottom = "20px";
    resultsHeader.style.color = "#2c3e50";

    const resultsMessage = document.createElement("p");
    resultsMessage.textContent = resultMessage;
    resultsMessage.style.textAlign = "center";
    resultsMessage.style.fontSize = "18px";
    resultsMessage.style.marginBottom = "30px";
    resultsMessage.style.fontWeight = "bold";

    const scoreDetails = document.createElement("div");
    scoreDetails.style.display = "flex";
    scoreDetails.style.justifyContent = "space-between";
    scoreDetails.style.marginBottom = "30px";

    // Player score column
    const playerScoreColumn = document.createElement("div");
    playerScoreColumn.style.flex = "1";
    playerScoreColumn.style.borderRight = "1px solid #ddd";
    playerScoreColumn.style.padding = "0 20px";

    const playerHeader = document.createElement("h3");
    playerHeader.textContent = "Your Score";
    playerHeader.style.textAlign = "center";
    playerHeader.style.marginBottom = "15px";

    const playerScoreRow = document.createElement("div");
    playerScoreRow.style.display = "flex";
    playerScoreRow.style.justifyContent = "space-between";
    playerScoreRow.style.marginBottom = "10px";
    playerScoreRow.innerHTML = `<span>Base Score:</span><span>${playerScore}</span>`;

    const playerRemainingRow = document.createElement("div");
    playerRemainingRow.style.display = "flex";
    playerRemainingRow.style.justifyContent = "space-between";
    playerRemainingRow.style.marginBottom = "10px";
    playerRemainingRow.innerHTML = `<span>Remaining Tiles:</span><span>-${playerRemainingPoints}</span>`;

    const playerFinalRow = document.createElement("div");
    playerFinalRow.style.display = "flex";
    playerFinalRow.style.justifyContent = "space-between";
    playerFinalRow.style.fontWeight = "bold";
    playerFinalRow.style.borderTop = "1px solid #ddd";
    playerFinalRow.style.paddingTop = "10px";
    playerFinalRow.innerHTML = `<span>Final Score:</span><span>${adjustedPlayerScore}</span>`;

    // Bot score column
    const botScoreColumn = document.createElement("div");
    botScoreColumn.style.flex = "1";
    botScoreColumn.style.padding = "0 20px";

    const botHeader = document.createElement("h3");
    botHeader.textContent = "Bot's Score";
    botHeader.style.textAlign = "center";
    botHeader.style.marginBottom = "15px";

    const botScoreRow = document.createElement("div");
    botScoreRow.style.display = "flex";
    botScoreRow.style.justifyContent = "space-between";
    botScoreRow.style.marginBottom = "10px";
    botScoreRow.innerHTML = `<span>Base Score:</span><span>${botScore}</span>`;

    const botRemainingRow = document.createElement("div");
    botRemainingRow.style.display = "flex";
    botRemainingRow.style.justifyContent = "space-between";
    botRemainingRow.style.marginBottom = "10px";
    botRemainingRow.innerHTML = `<span>Remaining Tiles:</span><span>-${botRemainingPoints}</span>`;

    const botFinalRow = document.createElement("div");
    botFinalRow.style.display = "flex";
    botFinalRow.style.justifyContent = "space-between";
    botFinalRow.style.fontWeight = "bold";
    botFinalRow.style.borderTop = "1px solid #ddd";
    botFinalRow.style.paddingTop = "10px";
    botFinalRow.innerHTML = `<span>Final Score:</span><span>${adjustedBotScore}</span>`;

    // Add new game button
    const newGameButton = document.createElement("button");
    newGameButton.textContent = "Play New Game";
    newGameButton.style.display = "block";
    newGameButton.style.margin = "0 auto";
    newGameButton.style.padding = "15px 30px";
    newGameButton.style.backgroundColor = "#5e6fcc";
    newGameButton.style.color = "white";
    newGameButton.style.border = "none";
    newGameButton.style.borderRadius = "4px";
    newGameButton.style.cursor = "pointer";
    newGameButton.style.fontSize = "16px";
    newGameButton.style.fontWeight = "bold";

    newGameButton.addEventListener("click", () => {
      // Reload the page to start a new game
      window.location.reload();
    });

    // Build the results display
    playerScoreColumn.appendChild(playerHeader);
    playerScoreColumn.appendChild(playerScoreRow);
    playerScoreColumn.appendChild(playerRemainingRow);
    playerScoreColumn.appendChild(playerFinalRow);

    botScoreColumn.appendChild(botHeader);
    botScoreColumn.appendChild(botScoreRow);
    botScoreColumn.appendChild(botRemainingRow);
    botScoreColumn.appendChild(botFinalRow);

    scoreDetails.appendChild(playerScoreColumn);
    scoreDetails.appendChild(botScoreColumn);

    resultsBox.appendChild(resultsHeader);
    resultsBox.appendChild(resultsMessage);
    resultsBox.appendChild(scoreDetails);
    resultsBox.appendChild(newGameButton);

    resultsOverlay.appendChild(resultsBox);
    document.body.appendChild(resultsOverlay);
  }

  // Function to create the exchange rack
  function createExchangeRack() {
    exchangeRack.innerHTML = ""; // Clear the exchange rack

    // Add each player tile to the exchange rack
    playerTiles.forEach((tile) => {
      const tileElement = document.createElement("div");
      tileElement.classList.add("tile");
      tileElement.dataset.id = tile.id;

      if (tile.isBlank || tile.letter === "") {
        tileElement.classList.add("blank-tile");
        tileElement.innerHTML = `<span class="tile-points">0</span>`;
      } else {
        tileElement.innerHTML = `${tile.letter}<span class="tile-points">${tile.points}</span>`;
      }

      // Add click event to toggle selection
      tileElement.addEventListener("click", () => {
        tileElement.classList.toggle("selected");

        // Enable/disable the confirm button based on selections
        const selectedTiles = exchangeRack.querySelectorAll(".tile.selected");
        exchangeConfirmBtn.disabled =
          selectedTiles.length === 0 || selectedTiles.length > tileBag.length;
      });

      exchangeRack.appendChild(tileElement);
    });

    // Initially disable the confirm button
    exchangeConfirmBtn.disabled = true;
  }

  // Exchange confirm button
  exchangeConfirmBtn.addEventListener("click", () => {
    // Check if the game has ended
    if (gameEnded) {
      alert("The game has ended. No more moves are allowed.");
      return;
    }

    const selectedTiles = exchangeRack.querySelectorAll(".tile.selected");

    if (selectedTiles.length === 0) {
      alert("Please select at least one tile to exchange.");
      return;
    }

    if (selectedTiles.length > tileBag.length) {
      alert(`You can only exchange up to ${tileBag.length} tiles.`);
      return;
    }

    // Get the IDs of the selected tiles
    const selectedTileIds = Array.from(selectedTiles).map(
      (tile) => tile.dataset.id
    );

    // Find the corresponding tile objects
    const tilesToExchange = playerTiles.filter((tile) =>
      selectedTileIds.includes(tile.id)
    );

    // Remove the tiles from player's rack
    playerTiles = playerTiles.filter(
      (tile) => !selectedTileIds.includes(tile.id)
    );

    // Draw new tiles from the bag before adding the exchanged tiles back
    const newTiles = drawTiles(selectedTileIds.length);

    // Add the exchanged tiles back to the bag
    tileBag = tileBag.concat(tilesToExchange);

    // Add new tiles to player's rack
    playerTiles = playerTiles.concat(newTiles);

    // Sort the tiles alphabetically
    playerTiles.sort((a, b) => a.letter.localeCompare(b.letter));

    // Update the player's rack
    createPlayerRack(playerTiles);

    // Close the exchange popup
    exchangePopup.style.display = "none";

    // Increment consecutive zero score turns
    consecutiveZeroScoreTurns++;

    // Update the sidebar to reflect the new tile bag status
    updateSidebar();

    // Show a message about the exchange
    showPlayerMoveMessage(`You exchanged ${selectedTiles.length} tiles`);

    // Check if the game should end due to consecutive passes
    if (consecutiveZeroScoreTurns >= 6) {
      showGameEndDialog(
        "There have been 6 consecutive turns with no score. Would you like to end the game?"
      );
      return;
    }

    // Get the bot's move
    const boardState = getBoardState();
    const playerRackState = playerTiles.map((tile) => ({
      letter: tile.letter,
      points: tile.points,
    }));
    const botRackState = botTiles.map((tile) => ({
      letter: tile.letter,
      points: tile.points,
    }));
    const tileBagState = tileBag;

    getMove(boardState, playerRackState, botRackState, tileBagState);
  });

  // Exchange cancel button
  exchangeCancelBtn.addEventListener("click", () => {
    exchangePopup.style.display = "none";
  });

  // Function to show player move message
  function showPlayerMoveMessage(message) {
    // Create a message overlay that will appear briefly
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("player-message");
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Show and then fade out
    setTimeout(() => {
      messageDiv.classList.add("show");
    }, 100);

    setTimeout(() => {
      messageDiv.classList.remove("show");
      setTimeout(() => {
        messageDiv.remove();
      }, 500);
    }, 3000);
  }

  // Add CSS for player message animation
  const style = document.createElement("style");
  style.textContent = `
.player-message {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  padding: 15px 30px;
  background-color: rgba(39, 174, 96, 0.9);
  color: white;
  border-radius: 50px;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 2000;
  opacity: 0;
  transition: all 0.3s ease-out;
}

.player-message.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
`;
  document.head.appendChild(style);

  // Call the initial update
  updateSidebar();
});
