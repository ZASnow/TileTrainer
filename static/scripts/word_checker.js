document.addEventListener('DOMContentLoaded', function() {
    const wordForm = document.getElementById('word-check-form');
    const wordInput = document.getElementById('word');
    const resultDiv = document.getElementById('result');
    const container = document.querySelector('.container');
    
    // Create and add a history section
    const historySection = document.createElement('div');
    historySection.className = 'history';
    historySection.innerHTML = `
        <h3>Recent Checks</h3>
        <div id="history-items" class="history-items"></div>
    `;
    container.appendChild(historySection);
    
    // Create and add a legend
    const legendSection = document.createElement('div');
    legendSection.className = 'legend';
    legendSection.innerHTML = `
        <h3>Dictionary Legend</h3>
        <div class="legend-items">
            <div class="legend-item">
                <span class="color-box both"></span>
                <span>In both NWL and Collins</span>
            </div>
            <div class="legend-item">
                <span class="color-box nwl-only"></span>
                <span>NWL only</span>
            </div>
            <div class="legend-item">
                <span class="color-box collins-only"></span>
                <span>Collins only</span>
            </div>
            <div class="legend-item">
                <span class="color-box invalid"></span>
                <span>Not in either dictionary</span>
            </div>
        </div>
    `;
    container.appendChild(legendSection);
    
    // Store checked words in history (using localStorage)
    let wordHistory = JSON.parse(localStorage.getItem('wordHistory') || '[]');
    
    // Limit history to 20 items
    if (wordHistory.length > 20) {
        wordHistory = wordHistory.slice(0, 20);
    }
    
    // Show history items
    updateHistoryDisplay();
    
    // Focus on input field when page loads
    wordInput.focus();
    
    // Validate input to allow only letters
    wordInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    });
    
    // Submit form handler
    wordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const word = wordInput.value.trim();
        
        if (!word) {
            alert('Please enter a word to check');
            return;
        }
        
        checkWord(word);
    });
    
    // Check word and update display
    function checkWord(word) {
        fetch('/check_word', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word: word })
        })
        .then(response => response.json())
        .then(data => {
            // Clear any existing classes
            resultDiv.className = '';
            
            // Get validity status and apply appropriate styling
            const validity = data.validity;
            let resultClass = '';
            
            if (validity.includes('both')) {
                resultClass = 'valid-both';
            } else if (validity.includes('NWL but not Collins')) {
                resultClass = 'valid-nwl-only';
            } else if (validity.includes('Collins but not NWL')) {
                resultClass = 'valid-collins-only';
            } else {
                resultClass = 'invalid';
            }
            
            // Add class to result div
            resultDiv.classList.add(resultClass);
            
            // Set result text
            resultDiv.textContent = `"${word}" is ${validity}.`;
            
            // Add to history if not already there
            addToHistory(word, data.in_nwl, data.in_collins);
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.textContent = 'An error occurred. Please try again.';
            resultDiv.className = 'invalid';
        });
    }
    
    // Add word to history
    function addToHistory(word, inNwl, inCollins) {
        // Check if word is already in history
        const existingIndex = wordHistory.findIndex(item => item.word === word);
        
        if (existingIndex !== -1) {
            // Remove it so we can add it at the beginning
            wordHistory.splice(existingIndex, 1);
        }
        
        // Add to beginning of array
        wordHistory.unshift({
            word: word,
            in_nwl: inNwl,
            in_collins: inCollins
        });
        
        // Limit to 20 items
        if (wordHistory.length > 20) {
            wordHistory.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('wordHistory', JSON.stringify(wordHistory));
        
        // Update display
        updateHistoryDisplay();
    }
    
    // Update history display
    function updateHistoryDisplay() {
        const historyItemsDiv = document.getElementById('history-items');
        historyItemsDiv.innerHTML = '';
        
        if (wordHistory.length === 0) {
            historyItemsDiv.innerHTML = '<p>No words checked yet</p>';
            return;
        }
        
        wordHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.textContent = item.word;
            historyItem.className = 'history-item';
            
            // Add appropriate class based on dictionary status
            if (item.in_nwl && item.in_collins) {
                historyItem.classList.add('both');
            } else if (item.in_nwl) {
                historyItem.classList.add('nwl-only');
            } else if (item.in_collins) {
                historyItem.classList.add('collins-only');
            } else {
                historyItem.classList.add('invalid');
            }
            
            // Click handler to check this word again
            historyItem.addEventListener('click', function() {
                wordInput.value = item.word;
                checkWord(item.word);
            });
            
            historyItemsDiv.appendChild(historyItem);
        });
    }
});