document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const standardModeBtn = document.getElementById('standard-mode');
    const extensionModeBtn = document.getElementById('extension-mode');
    const standardSettings = document.getElementById('standard-settings');
    const extensionSettings = document.getElementById('extension-settings');
    const extensionSection = document.querySelector('.extension-section');
    const dictionarySelect = document.getElementById('dictionary-select');
    const probabilityRange = document.getElementById('probability-range');
    const baseRackSize = document.getElementById('base-rack-size');
    const targetLength = document.getElementById('target-length');
    const rackElement = document.getElementById('rack');
    const letterPool = document.getElementById('letter-pool');
    const shuffleRackBtn = document.getElementById('shuffle-rack');
    const resetRackBtn = document.getElementById('reset-rack');
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    const revealButton = document.getElementById('reveal-button');
    const resultMessage = document.getElementById('result-message');
    const bingoList = document.getElementById('bingo-list');
    const bingoWords = document.getElementById('bingo-words');
    
    // Statistics elements
    const totalRacksElem = document.getElementById('total-racks');
    const correctAnswersElem = document.getElementById('correct-answers');
    const accuracyElem = document.getElementById('accuracy');
    const streakElem = document.getElementById('streak');
    const learnedRacksList = document.getElementById('learned-racks-list');
    
    // Game state
    let currentMode = 'standard';
    let currentRack = [];
    let originalRack = [];
    let possibleBingos = [];
    let selectedPoolTiles = [];
    let statistics = loadStatistics();
    
    // Tile data
    const TILE_DISTRIBUTION = {
        'A': { count: 9, points: 1 },
        'B': { count: 2, points: 3 },
        'C': { count: 2, points: 3 },
        'D': { count: 4, points: 2 },
        'E': { count: 12, points: 1 },
        'F': { count: 2, points: 4 },
        'G': { count: 3, points: 2 },
        'H': { count: 2, points: 4 },
        'I': { count: 9, points: 1 },
        'J': { count: 1, points: 8 },
        'K': { count: 1, points: 5 },
        'L': { count: 4, points: 1 },
        'M': { count: 2, points: 3 },
        'N': { count: 6, points: 1 },
        'O': { count: 8, points: 1 },
        'P': { count: 2, points: 3 },
        'Q': { count: 1, points: 10 },
        'R': { count: 6, points: 1 },
        'S': { count: 4, points: 1 },
        'T': { count: 6, points: 1 },
        'U': { count: 4, points: 1 },
        'V': { count: 2, points: 4 },
        'W': { count: 2, points: 4 },
        'X': { count: 1, points: 8 },
        'Y': { count: 2, points: 4 },
        'Z': { count: 1, points: 10 },
        '?': { count: 2, points: 0 } // Blank tile
    };
    
    // Initialize
    updateStatisticsDisplay();
    showLearnedRacks();
    
    // Event Listeners
    standardModeBtn.addEventListener('click', () => switchMode('standard'));
    extensionModeBtn.addEventListener('click', () => switchMode('extension'));
    shuffleRackBtn.addEventListener('click', shuffleRack);
    resetRackBtn.addEventListener('click', resetRack);
    yesButton.addEventListener('click', () => checkAnswer(true));
    noButton.addEventListener('click', () => checkAnswer(false));
    revealButton.addEventListener('click', revealAnswer);
    
    // Mode switching
    probabilityRange.addEventListener('change', generateRack);
    dictionarySelect.addEventListener('change', generateRack);
    baseRackSize.addEventListener('change', generateExtensionRack);
    targetLength.addEventListener('change', generateExtensionRack);
    
    // Generate initial rack
    generateRack();
    
    // Functions
    
    function switchMode(mode) {
        currentMode = mode;
        
        // Update UI
        if (mode === 'standard') {
            standardModeBtn.classList.add('active');
            extensionModeBtn.classList.remove('active');
            standardSettings.classList.remove('hidden');
            extensionSettings.classList.add('hidden');
            extensionSection.classList.add('hidden');
            generateRack();
        } else {
            standardModeBtn.classList.remove('active');
            extensionModeBtn.classList.add('active');
            standardSettings.classList.add('hidden');
            extensionSettings.classList.remove('hidden');
            extensionSection.classList.remove('hidden');
            generateExtensionRack();
        }
        
        // Reset UI state
        resetUIState();
    }
    
    function resetUIState() {
        resultMessage.classList.add('hidden');
        bingoList.classList.add('hidden');
        resultMessage.textContent = '';
        bingoWords.innerHTML = '';
    }
    
    function generateRack() {
        resetUIState();
        
        const probabilityLevel = parseInt(probabilityRange.value);
        
        // Generate a rack based on probability level
        let rack = generateProbabilityBasedRack(probabilityLevel);
        
        // Sort rack alphabetically
        rack.sort();
        
        // Store the original rack for reset
        originalRack = [...rack];
        currentRack = [...rack];
        
        // Get possible bingos for this rack
        checkPossibleBingos(rack);
        
        // Render the rack
        renderRack();
    }
    
    function generateProbabilityBasedRack(probabilityLevel) {
        // Create a full bag of tiles based on distribution
        let tileBag = [];
        for (const [letter, data] of Object.entries(TILE_DISTRIBUTION)) {
            for (let i = 0; i < data.count; i++) {
                tileBag.push(letter);
            }
        }
        
        // Different probability approaches based on level
        let rack = [];
        
        switch (probabilityLevel) {
            case 1: // Very rare
                // Include at least one Q, J, X, or Z
                const rareLetters = ['Q', 'J', 'X', 'Z'];
                rack.push(rareLetters[Math.floor(Math.random() * rareLetters.length)]);
                
                // Few vowels, more consonants
                const vowels = ['A', 'E', 'I', 'O', 'U'];
                const consonants = Object.keys(TILE_DISTRIBUTION).filter(l => !vowels.includes(l) && l !== '?');
                
                // Add 1-2 vowels
                for (let i = 0; i < 2; i++) {
                    rack.push(vowels[Math.floor(Math.random() * vowels.length)]);
                }
                
                // Fill the rest with consonants
                while (rack.length < 7) {
                    rack.push(consonants[Math.floor(Math.random() * consonants.length)]);
                }
                break;
                
            case 2: // Rare
                // Include a somewhat awkward letter distribution
                const uncommonLetters = ['B', 'C', 'F', 'G', 'H', 'J', 'K', 'M', 'P', 'Q', 'V', 'W', 'X', 'Y', 'Z'];
                
                // Add 3 uncommon letters
                for (let i = 0; i < 3; i++) {
                    rack.push(uncommonLetters[Math.floor(Math.random() * uncommonLetters.length)]);
                }
                
                // Add 4 random letters
                while (rack.length < 7) {
                    rack.push(tileBag[Math.floor(Math.random() * tileBag.length)]);
                }
                break;
                
            case 3: // Common (default)
                // Completely random selection from the bag
                while (rack.length < 7) {
                    const randomIndex = Math.floor(Math.random() * tileBag.length);
                    rack.push(tileBag[randomIndex]);
                    tileBag.splice(randomIndex, 1);
                }
                break;
                
            case 4: // Frequent
                // More vowels and common consonants
                const commonVowels = ['A', 'E', 'I', 'O'];
                const commonConsonants = ['N', 'R', 'S', 'T', 'L', 'D'];
                
                // Add 3-4 common vowels
                for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
                    rack.push(commonVowels[Math.floor(Math.random() * commonVowels.length)]);
                }
                
                // Fill with common consonants
                while (rack.length < 7) {
                    rack.push(commonConsonants[Math.floor(Math.random() * commonConsonants.length)]);
                }
                break;
                
            case 5: // Very frequent
                // High-probability bingo-friendly racks
                const bingoFriendlyRacks = [
                    ['A', 'E', 'I', 'N', 'R', 'S', 'T'],
                    ['A', 'E', 'I', 'O', 'R', 'S', 'T'],
                    ['A', 'E', 'I', 'L', 'N', 'S', 'T'],
                    ['A', 'E', 'I', 'L', 'R', 'S', 'T'],
                    ['A', 'E', 'O', 'R', 'S', 'T', '?'],
                    ['A', 'E', 'I', 'N', 'R', 'S', '?'],
                    ['A', 'E', 'I', 'N', 'S', 'T', '?'],
                    ['A', 'D', 'E', 'I', 'L', 'R', 'S'],
                    ['A', 'D', 'E', 'I', 'R', 'S', 'T'],
                    ['A', 'E', 'G', 'I', 'N', 'R', 'S']
                ];
                
                // Select a random bingo-friendly rack
                rack = [...bingoFriendlyRacks[Math.floor(Math.random() * bingoFriendlyRacks.length)]];
                break;
        }
        
        return rack;
    }
    
    function generateExtensionRack() {
        resetUIState();
        
        const rackSize = parseInt(baseRackSize.value);
        
        // Generate a smaller base rack
        let rack = [];
        let tileBag = [];
        
        // Create the tile bag
        for (const [letter, data] of Object.entries(TILE_DISTRIBUTION)) {
            for (let i = 0; i < data.count; i++) {
                tileBag.push(letter);
            }
        }
        
        // Randomly select tiles for the base rack
        while (rack.length < rackSize) {
            const randomIndex = Math.floor(Math.random() * tileBag.length);
            rack.push(tileBag[randomIndex]);
            tileBag.splice(randomIndex, 1);
        }
        
        // Sort rack alphabetically
        rack.sort();
        
        // Store the original rack for reset
        originalRack = [...rack];
        currentRack = [...rack];
        
        // Generate letter pool (remaining tiles in the bag)
        generateLetterPool(tileBag);
        
        // Render the rack
        renderRack();
    }
    
    function generateLetterPool(tileBag) {
        letterPool.innerHTML = '';
        selectedPoolTiles = [];
        
        // Group the tiles by letter for visual simplicity
        const groupedTiles = {};
        tileBag.forEach(letter => {
            if (!groupedTiles[letter]) {
                groupedTiles[letter] = 0;
            }
            groupedTiles[letter]++;
        });
        
        // Create and add pool tiles to the UI
        for (const [letter, count] of Object.entries(groupedTiles)) {
            const tileElement = document.createElement('div');
            tileElement.className = 'pool-tile';
            tileElement.textContent = letter;
            tileElement.dataset.letter = letter;
            tileElement.dataset.count = count;
            
            if (count > 1) {
                const countBadge = document.createElement('span');
                countBadge.className = 'count-badge';
                countBadge.textContent = count;
                countBadge.style.position = 'absolute';
                countBadge.style.top = '-5px';
                countBadge.style.right = '-5px';
                countBadge.style.backgroundColor = '#3498db';
                countBadge.style.color = 'white';
                countBadge.style.borderRadius = '50%';
                countBadge.style.width = '18px';
                countBadge.style.height = '18px';
                countBadge.style.fontSize = '12px';
                countBadge.style.display = 'flex';
                countBadge.style.justifyContent = 'center';
                countBadge.style.alignItems = 'center';
                tileElement.style.position = 'relative';
                tileElement.appendChild(countBadge);
            }
            
            tileElement.addEventListener('click', function() {
                selectPoolTile(this);
            });
            
            letterPool.appendChild(tileElement);
        }
    }
    
    function selectPoolTile(tileElement) {
        const letter = tileElement.dataset.letter;
        let count = parseInt(tileElement.dataset.count);
        
        // Add the letter to the rack
        currentRack.push(letter);
        
        // Update pool tile count
        count--;
        
        if (count > 0) {
            tileElement.dataset.count = count;
            tileElement.querySelector('.count-badge').textContent = count;
        } else {
            // Remove the tile from the pool if count is 0
            tileElement.remove();
        }
        
        // Re-render the rack
        renderRack();
        
        // Check if we have reached the target length
        const targetWordLength = parseInt(targetLength.value);
        if (currentRack.length === targetWordLength - 1) {
            // Check for bingos with one more letter
            checkExtensionBingos();
        }
    }
    
    function renderRack(skipSort = false) {
        rackElement.innerHTML = '';
        
        // Sort rack alphabetically (unless skipSort is true)
        if (!skipSort) {
            currentRack.sort();
        }
        
        currentRack.forEach(letter => {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';
            tileElement.textContent = letter;
            
            // Add tile point values
            const points = letter === '?' ? 0 : TILE_DISTRIBUTION[letter].points;
            tileElement.dataset.points = points;
            
            rackElement.appendChild(tileElement);
        });
    }
    
    function shuffleRack() {
        // Create a copy of the current rack
        let shuffledRack = [...currentRack];
        
        // Fisher-Yates shuffle algorithm
        for (let i = shuffledRack.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledRack[i], shuffledRack[j]] = [shuffledRack[j], shuffledRack[i]];
        }
        
        // Update the current rack with the shuffled version
        currentRack = shuffledRack;
        
        // Re-render the rack without sorting
        renderRack(true);
    }

    function resetRack() {
        currentRack = [...originalRack];
        renderRack();
        resetUIState();
        
        // If in extension mode, reset letter pool
        if (currentMode === 'extension') {
            // Re-generate the rack and letter pool
            generateExtensionRack();
        }
    }
    
    function checkPossibleBingos(rack) {
        // In a real implementation, we would check against a dictionary
        // For this demo, we'll make an API call to our server
        
        const dictionary = dictionarySelect.value;
        
        // Format the rack as a string for the API call
        const rackStr = rack.join('');
        
        // Make an API call to check for possible bingos
        fetch('/bingo_practice/check_bingos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rack: rackStr,
                dictionary: dictionary
            })
        })
        .then(response => response.json())
        .then(data => {
            possibleBingos = data.bingos || [];
        })
        .catch(error => {
            console.error('Error checking bingos:', error);
            // For demo purposes, use some sample data if the API fails
            const hasBlanks = rack.includes('?');
            
            // More likely to have bingos with frequent racks or those containing blanks
            const probabilityLevel = parseInt(probabilityRange.value);
            const bingoChance = hasBlanks ? 0.8 : (probabilityLevel >= 4 ? 0.6 : probabilityLevel >= 3 ? 0.4 : 0.2);
            
            if (Math.random() < bingoChance) {
                // Generate some fake bingos for demo purposes
                possibleBingos = generateSampleBingos(rack, 1 + Math.floor(Math.random() * 3));
            } else {
                possibleBingos = [];
            }
        });
    }
    
    function checkExtensionBingos() {
        const dictionary = dictionarySelect.value;
        const targetWordLength = parseInt(targetLength.value);
        
        // Format the rack as a string for the API call
        const rackStr = currentRack.join('');
        
        // Make an API call to check for possible extension bingos
        fetch('/bingo_practice/check_extension_bingos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rack: rackStr,
                targetLength: targetWordLength,
                dictionary: dictionary
            })
        })
        .then(response => response.json())
        .then(data => {
            possibleBingos = data.bingos || [];
        })
        .catch(error => {
            console.error('Error checking extension bingos:', error);
            // For demo purposes, use some sample data if the API fails
            
            // Generate some fake extension bingos for demo
            if (Math.random() < 0.7) {
                possibleBingos = generateSampleBingos(currentRack, 2 + Math.floor(Math.random() * 3), targetWordLength);
            } else {
                possibleBingos = [];
            }
        });
    }
    
    function generateSampleBingos(rack, count, targetLength = 7) {
        // This is just for demonstration - would be replaced by actual dictionary lookup
        const sampleWords = [
            'ADINERT', 'STAINER', 'RETAINS', 'TRAINED', 'RETSINA',
            'RELATED', 'DEALING', 'DEPARTS', 'SECTION', 'REBOUND',
            'OUTSIDE', 'CAUTION', 'ANTIQUE', 'PAINTER', 'HOSTING',
            'ROUTINE', 'PEANUTS', 'STEROID', 'TANGIER', 'TRIANGLE'
        ];
        
        // For extension mode, use longer words
        const sampleLongWords = [
            'RELATIONS', 'TARGETING', 'STREAMING', 'OPERATING', 'CAPTURING',
            'RESPONSES', 'QUESTIONS', 'MATERIALS', 'PAINTINGS', 'LOCATIONS',
            'FURNITURE', 'SECONDARY', 'BEAUTIFUL', 'DANGEROUS', 'AUTOMATIC'
        ];
        
        const wordPool = targetLength > 7 ? sampleLongWords : sampleWords;
        
        // Return a random selection
        const result = [];
        for (let i = 0; i < count && i < wordPool.length; i++) {
            result.push(wordPool[Math.floor(Math.random() * wordPool.length)]);
        }
        
        return result;
    }
    
    function checkAnswer(userSaidYes) {
        const correctAnswer = possibleBingos.length > 0;
        const isCorrect = (userSaidYes === correctAnswer);
        
        // Update statistics
        statistics.totalRacks++;
        if (isCorrect) {
            statistics.correctAnswers++;
            statistics.streak++;
        } else {
            statistics.streak = 0;
        }
        saveStatistics();
        updateStatisticsDisplay();
        
        // Display result
        resultMessage.classList.remove('hidden');
        resultMessage.classList.remove('correct', 'incorrect');
        resultMessage.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        if (isCorrect) {
            resultMessage.textContent = userSaidYes 
                ? "Correct! There is at least one bingo possible." 
                : "Correct! No bingos are possible with this rack.";
        } else {
            resultMessage.textContent = userSaidYes 
                ? "Incorrect. There are no bingos possible with this rack." 
                : "Incorrect. There is at least one bingo possible.";
        }
        
        // Show bingos if they exist
        if (possibleBingos.length > 0) {
            bingoList.classList.remove('hidden');
            bingoWords.innerHTML = '';
            
            possibleBingos.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.className = 'bingo-word';
                wordElement.textContent = word;
                bingoWords.appendChild(wordElement);
            });
            
            // Add rack to learned racks if user got it wrong
            if (!isCorrect) {
                addToLearnedRacks(currentRack.join(''), possibleBingos);
            }
        }
        
        // Generate a new rack after a delay
        setTimeout(() => {
            if (currentMode === 'standard') {
                generateRack();
            } else {
                generateExtensionRack();
            }
        }, 3000);
    }
    
    function revealAnswer() {
        // Show whether there are bingos and what they are
        if (possibleBingos.length > 0) {
            resultMessage.classList.remove('hidden');
            resultMessage.textContent = `This rack has ${possibleBingos.length} possible bingo(s).`;
            
            bingoList.classList.remove('hidden');
            bingoWords.innerHTML = '';
            
            possibleBingos.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.className = 'bingo-word';
                wordElement.textContent = word;
                bingoWords.appendChild(wordElement);
            });
            
            // Add to learned racks
            addToLearnedRacks(currentRack.join(''), possibleBingos);
        } else {
            resultMessage.classList.remove('hidden');
            resultMessage.textContent = "No bingos are possible with this rack.";
        }
        
        // Update statistics
        statistics.totalRacks++;
        saveStatistics();
        updateStatisticsDisplay();
        
        // Generate a new rack after a delay
        setTimeout(() => {
            if (currentMode === 'standard') {
                generateRack();
            } else {
                generateExtensionRack();
            }
        }, 3000);
    }
    
    function loadStatistics() {
        const stats = localStorage.getItem('bingoStats');
        return stats ? JSON.parse(stats) : {
            totalRacks: 0,
            correctAnswers: 0,
            streak: 0,
            learnedRacks: []
        };
    }
    
    function saveStatistics() {
        localStorage.setItem('bingoStats', JSON.stringify(statistics));
    }
    
    function updateStatisticsDisplay() {
        totalRacksElem.textContent = statistics.totalRacks;
        correctAnswersElem.textContent = statistics.correctAnswers;
        accuracyElem.textContent = statistics.totalRacks === 0 ? '0%' : 
            Math.round((statistics.correctAnswers / statistics.totalRacks) * 100) + '%';
        streakElem.textContent = statistics.streak;
    }
    
    function addToLearnedRacks(rack, bingos) {
        // Check if rack already exists in learned racks
        const existingIndex = statistics.learnedRacks.findIndex(item => item.rack === rack);
        
        if (existingIndex !== -1) {
            // Update existing learned rack
            statistics.learnedRacks[existingIndex].lastSeen = new Date().toISOString();
            statistics.learnedRacks[existingIndex].count++;
        } else {
            // Add new learned rack
            statistics.learnedRacks.push({
                rack: rack,
                bingos: bingos,
                lastSeen: new Date().toISOString(),
                count: 1
            });
        }
        
        // Sort by most recently seen
        statistics.learnedRacks.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
        
        // Limit to 10 most recent
        if (statistics.learnedRacks.length > 10) {
            statistics.learnedRacks = statistics.learnedRacks.slice(0, 10);
        }
        
        saveStatistics();
        showLearnedRacks();
    }
    
    function showLearnedRacks() {
        learnedRacksList.innerHTML = '';
        
        if (statistics.learnedRacks.length === 0) {
            learnedRacksList.innerHTML = '<p>Your recently learned racks will appear here</p>';
            return;
        }
        
        statistics.learnedRacks.forEach(item => {
            const rackElement = document.createElement('div');
            rackElement.className = 'learned-rack-item';
            
            const lettersElement = document.createElement('div');
            lettersElement.className = 'learned-rack-letters';
            lettersElement.textContent = item.rack;
            
            const bingosElement = document.createElement('div');
            bingosElement.className = 'learned-rack-bingos';
            bingosElement.textContent = item.bingos.join(', ');
            
            rackElement.appendChild(lettersElement);
            rackElement.appendChild(bingosElement);
            
            // Add click listener to load this rack
            rackElement.addEventListener('click', () => {
                loadLearnedRack(item.rack, item.bingos);
            });
            
            learnedRacksList.appendChild(rackElement);
        });
    }
    
    function loadLearnedRack(rackStr, bingos) {
        // Convert string rack to array
        currentRack = rackStr.split('');
        originalRack = [...currentRack];
        possibleBingos = bingos;
        
        // Make sure we're in standard mode
        if (currentMode !== 'standard') {
            switchMode('standard');
        }
        
        renderRack();
        resetUIState();
    }
});