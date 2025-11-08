document.addEventListener('DOMContentLoaded', function() {
    const requestInput = document.getElementById('request-input');
    const yearInput = document.getElementById('year-input');
    const typeSelect = document.getElementById('type-select');
    const priorityCheckbox = document.getElementById('priority-checkbox');
    const submitBtn = document.getElementById('submit-btn');
    const requestsList = document.getElementById('requests-list');
    const nameModal = document.getElementById('name-modal');
    const nameInput = document.getElementById('name-input');
    const saveNameBtn = document.getElementById('save-name-btn');
    const editNameBtn = document.getElementById('edit-name-btn');
    const userNameSpan = document.getElementById('user-name');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const botTokenStatus = document.getElementById('bot-token-status');
    const guildIdStatus = document.getElementById('guild-id-status');
    const botTokenInput = document.getElementById('bot-token-input');
    const guildIdInput = document.getElementById('guild-id-input');
    const saveEnvBtn = document.getElementById('save-env-btn');
    const cancelEnvBtn = document.getElementById('cancel-env-btn');
    
    // API base URL
    const API_BASE_URL = 'http://192.168.1.85:3001/api';
    
    // Array to store requests
    let requests = [];
    
    // Auto-refresh variables
    let refreshInterval;
    let isUserInteracting = false; // Flag to prevent refresh during user actions
    
    // Helper function to show error
    function showError(input, errorMessageId, message) {
        const errorElement = document.getElementById(errorMessageId);
        input.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
    
    // Helper function to clear error
    function clearError(input, errorMessageId) {
        const errorElement = document.getElementById(errorMessageId);
        input.classList.remove('error');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    function setEnvStatus(element, key, state) {
        element.classList.remove('status-loading', 'status-set', 'status-missing', 'status-error');

        if (state === 'loading') {
            element.textContent = `Checking ${key}...`;
            element.classList.add('status-loading');
            return;
        }

        if (state === 'set') {
            element.textContent = `${key} is set`;
            element.classList.add('status-set');
            return;
        }

        if (state === 'missing') {
            element.textContent = `${key} is not set`;
            element.classList.add('status-missing');
            return;
        }

        element.textContent = `Unable to determine ${key}`;
        element.classList.add('status-error');
    }

    async function refreshEnvStatus(key, element) {
        setEnvStatus(element, key, 'loading');

        try {
            const response = await fetch(`${API_BASE_URL}/env/${key}/exists`);
            if (!response.ok) {
                throw new Error(`Failed to check ${key}`);
            }

            const data = await response.json();
            setEnvStatus(element, key, data.exists ? 'set' : 'missing');
        } catch (error) {
            console.error(`Error checking ${key}:`, error);
            setEnvStatus(element, key, 'error');
        }
    }

    async function loadEnvStatuses() {
        await Promise.all([
            refreshEnvStatus('BOT_TOKEN', botTokenStatus),
            refreshEnvStatus('GUILD_ID', guildIdStatus)
        ]);
    }

    async function setEnvValue(key, value) {
        const response = await fetch(`${API_BASE_URL}/env/${key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value })
        });

        if (!response.ok) {
            let message = `Failed to update ${key}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    message = errorData.error;
                }
            } catch (err) {
                const text = await response.text();
                if (text) {
                    message = text;
                }
            }
            throw new Error(message);
        }
    }

    function openSettingsModal() {
        isUserInteracting = true;
        settingsModal.style.display = 'block';
        botTokenInput.value = '';
        guildIdInput.value = '';
        loadEnvStatuses();
    }

    function closeSettingsModal() {
        settingsModal.style.display = 'none';
        botTokenInput.value = '';
        guildIdInput.value = '';
        isUserInteracting = false;
    }

    async function saveEnvSettings() {
        const updates = [];
        const botTokenValue = botTokenInput.value.trim();
        const guildIdValue = guildIdInput.value.trim();

        if (!botTokenValue && !guildIdValue) {
            alert('Please enter a value for at least one variable before saving.');
            return;
        }

        if (botTokenValue) {
            updates.push(setEnvValue('BOT_TOKEN', botTokenValue));
        }

        if (guildIdValue) {
            updates.push(setEnvValue('GUILD_ID', guildIdValue));
        }

        saveEnvBtn.disabled = true;
        const previousText = saveEnvBtn.textContent;
        saveEnvBtn.textContent = 'Saving...';

        try {
            await Promise.all(updates);
            await loadEnvStatuses();
            botTokenInput.value = '';
            guildIdInput.value = '';
            alert('Environment variables updated successfully.');
        } catch (error) {
            console.error('Error saving environment variables:', error);
            alert(error.message || 'Failed to save environment variables. Please try again.');
        } finally {
            saveEnvBtn.disabled = false;
            saveEnvBtn.textContent = previousText;
        }
    }
    
    // Function to add a new request
    async function addRequest(text, isPriority) {
        // Clear all errors first
        clearError(requestInput, 'request-input-error');
        clearError(yearInput, 'year-input-error');
        clearError(typeSelect, 'type-select-error');
        
        // Validate request text
        if (text.trim() === '') {
            showError(requestInput, 'request-input-error', 'Please enter a request before submitting.');
            return;
        }
        
        // Validate year
        const year = parseInt(yearInput.value);
        const currentYear = new Date().getFullYear();
        if (isNaN(year)) {
            showError(yearInput, 'year-input-error', 'Please enter a valid year.');
            return;
        }
        if (year < 1900) {
            showError(yearInput, 'year-input-error', 'Video media didn\'t exist before this, bub.');
            return;
        }
        if (year > currentYear) {
            showError(yearInput, 'year-input-error', 'You can\'t get something from the future, buddy.');
            return;
        }
        
        // Validate type
        const type = typeSelect.value;
        if (!type) {
            showError(typeSelect, 'type-select-error', 'Please select a type.');
            return;
        }
        
        isUserInteracting = true; // Prevent auto-refresh during user action
        
        try {
            const response = await fetch(`${API_BASE_URL}/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text.trim(),
                    submittedBy: userNameSpan.textContent,
                    priority: isPriority,
                    sortOrder: requests.length,
                    year: year,
                    type: type
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create request');
            }
            
            // Reload requests from server
            await loadRequests();
            renderRequests();
            requestInput.value = '';
            yearInput.value = '';
            typeSelect.value = '';
            priorityCheckbox.checked = false;
            // Clear any errors
            clearError(requestInput, 'request-input-error');
            clearError(yearInput, 'year-input-error');
            clearError(typeSelect, 'type-select-error');
            requestInput.focus();
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Failed to create request. Please try again.');
        } finally {
            isUserInteracting = false; // Re-enable auto-refresh
        }
    }
    
    // Function to render all requests
    function renderRequests() {
        if (requests.length === 0) {
            requestsList.innerHTML = '<div class="empty-state">No requests yet. Add one above!</div>';
            return;
        }
        
        requestsList.innerHTML = requests.map((request, index) => `
            <div class="request-item ${request.Priority ? 'priority' : ''} ${request.Status === 'in-progress' ? 'in-progress' : ''} ${request.Status === 'completed' ? 'completed' : ''}" 
                 draggable="true" 
                 data-index="${index}"
                 data-id="${request.rowId}">
                <div class="drag-handle"></div>
                <div class="status-btn" data-id="${request.rowId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="complete-btn" data-id="${request.rowId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="delete-btn" data-id="${request.rowId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18l-1 13H4L3 6zM8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="request-content">
                    <div class="request-text">${escapeHtml(request.RequestText)}</div>
                    <div class="request-meta-info">
                        ${request.Year ? `<span class="meta-label">Year:</span>${request.Year}` : ''} 
                        ${request.Type ? `<span class="meta-label">Type:</span>${escapeHtml(request.Type)}` : ''}
                    </div>
                    <div class="request-timestamp">
                        <span class="timestamp-label">Submitted:</span>${formatTimestamp(request.SubmitDate)}
                    </div>
                    <div class="request-submitted-by">
                        <span class="submitted-by-label">Submitted By:</span>${escapeHtml(request.SubmittedBy || 'Unknown')}
                    </div>
                    ${request.Status === 'pending' ? '<div class="status-text pending-text">Pending...</div>' : ''}
                    ${request.Status === 'in-progress' ? '<div class="status-text in-progress-text">In Progress</div>' : ''}
                    ${request.Status === 'completed' ? '<div class="status-text completed-text">Completed</div>' : ''}
                </div>
            </div>
        `).join('');
        
        // Add drag event listeners to all items
        addDragListeners();
        // Add delete event listeners to all items
        addDeleteListeners();
        // Add status event listeners to all items
        addStatusListeners();
        // Add complete event listeners to all items
        addCompleteListeners();
    }
    
    // Function to escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Function to format timestamp as "date @ time" in Central Time
    function formatTimestamp(dateString) {
        const date = new Date(dateString);
        const dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
        const timeStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(date);
        return `${dateStr} @ ${timeStr}`;
    }
    
    // Drag and drop functionality
    let draggedElement = null;
    let draggedIndex = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let isDragging = false;
    
    function addDragListeners() {
        const items = document.querySelectorAll('.request-item');
        
        items.forEach(item => {
            // Standard drag events
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
            
            // Touch events for mobile
            item.addEventListener('touchstart', handleTouchStart, { passive: false });
            item.addEventListener('touchmove', handleTouchMove, { passive: false });
            item.addEventListener('touchend', handleTouchEnd, { passive: false });
        });
    }
    
    function handleDragStart(e) {
        draggedElement = this;
        draggedIndex = parseInt(this.dataset.index);
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }
    
    function handleDragEnd(e) {
        this.classList.remove('dragging');
        draggedElement = null;
        draggedIndex = null;
        
        // Remove all drag-over classes
        document.querySelectorAll('.request-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDragEnter(e) {
        e.preventDefault();
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }
    
    async function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (this === draggedElement) return;
        
        const dropIndex = parseInt(this.dataset.index);
        
        // Reorder the requests array
        const draggedRequest = requests[draggedIndex];
        requests.splice(draggedIndex, 1);
        requests.splice(dropIndex, 0, draggedRequest);
        
        // Update sort order on server
        await updateRequestOrder();
        // Don't call renderRequests() here since updateRequestOrder will reload from server
    }
    
    // Touch event handlers for mobile
    function handleTouchStart(e) {
        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchStartX = touch.clientX;
        isDragging = false;
        
        // Only start drag if touching the drag handle or item body
        const target = e.target;
        const isDragHandle = target.classList.contains('drag-handle') || target.closest('.drag-handle');
        const isItemBody = target.classList.contains('request-item') || target.closest('.request-content');
        
        if (isDragHandle || isItemBody) {
            e.preventDefault();
        }
    }
    
    function handleTouchMove(e) {
        if (!isDragging) {
            const touch = e.touches[0];
            const deltaY = Math.abs(touch.clientY - touchStartY);
            const deltaX = Math.abs(touch.clientX - touchStartX);
            
            // Start dragging if moved more than 10px in any direction
            if (deltaY > 10 || deltaX > 10) {
                isDragging = true;
                const item = e.target.closest('.request-item');
                if (item) {
                    draggedElement = item;
                    draggedIndex = parseInt(item.dataset.index);
                    item.classList.add('dragging');
                }
            }
        }
        
        if (isDragging) {
            e.preventDefault();
        }
    }
    
    async function handleTouchEnd(e) {
        if (isDragging && draggedElement) {
            // Find the element under the touch point
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetItem = elementBelow ? elementBelow.closest('.request-item') : null;
            
            if (targetItem && targetItem !== draggedElement) {
                const dropIndex = parseInt(targetItem.dataset.index);
                
                // Reorder the requests array
                const draggedRequest = requests[draggedIndex];
                requests.splice(draggedIndex, 1);
                requests.splice(dropIndex, 0, draggedRequest);
                
                // Update sort order on server
                await updateRequestOrder();
                // Don't call renderRequests() here since updateRequestOrder will reload from server
            } else {
                // Just re-render to remove dragging state
                renderRequests();
            }
        }
        
        // Reset drag state
        isDragging = false;
        draggedElement = null;
        draggedIndex = null;
    }
    
    // Delete functionality
    function addDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering drag events
                const requestId = parseInt(this.dataset.id);
                deleteRequest(requestId);
            });
        });
    }
    
    async function deleteRequest(requestId) {
        if (confirm('Are you sure you want to delete this request?')) {
            isUserInteracting = true; // Prevent auto-refresh during user action
            
            try {
                const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to delete request');
                }
                
                // Reload requests from server
                await loadRequests();
                renderRequests();
                
                // Update sort order to fill in the gap
                await updateRequestOrder();
            } catch (error) {
                console.error('Error deleting request:', error);
                alert('Failed to delete request. Please try again.');
            } finally {
                isUserInteracting = false; // Re-enable auto-refresh
            }
        }
    }
    
    // Status functionality
    function addStatusListeners() {
        const statusButtons = document.querySelectorAll('.status-btn');
        
        statusButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering drag events
                const requestId = parseInt(this.dataset.id);
                toggleStatus(requestId);
            });
        });
    }
    
    async function toggleStatus(requestId) {
        const request = requests.find(r => r.rowId === requestId);
        if (request) {
            let newStatus;
            if (request.Status === 'pending') {
                newStatus = 'in-progress';
            } else if (request.Status === 'in-progress') {
                newStatus = 'pending';
            } else {
                return; // Don't change completed status
            }
            
            isUserInteracting = true; // Prevent auto-refresh during user action
            
            try {
                const response = await fetch(`${API_BASE_URL}/requests/${requestId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update request status');
                }
                
                // Reload requests from server
                await loadRequests();
                renderRequests();
            } catch (error) {
                console.error('Error updating request status:', error);
                alert('Failed to update request status. Please try again.');
            } finally {
                isUserInteracting = false; // Re-enable auto-refresh
            }
        }
    }
    
    // Complete functionality
    function addCompleteListeners() {
        const completeButtons = document.querySelectorAll('.complete-btn');
        
        completeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering drag events
                const requestId = parseInt(this.dataset.id);
                completeRequest(requestId);
            });
        });
    }
    
    async function completeRequest(requestId) {
        const request = requests.find(r => r.rowId === requestId);
        if (request) {
            isUserInteracting = true; // Prevent auto-refresh during user action
            
            try {
                const response = await fetch(`${API_BASE_URL}/requests/${requestId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'completed' })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to complete request');
                }
                
                // Reload requests from server
                await loadRequests();
                renderRequests();
            } catch (error) {
                console.error('Error completing request:', error);
                alert('Failed to complete request. Please try again.');
            } finally {
                isUserInteracting = false; // Re-enable auto-refresh
            }
        }
    }
    
    // API functions
    async function loadRequests() {
        try {
            const response = await fetch(`${API_BASE_URL}/requests`);
            if (!response.ok) {
                throw new Error('Failed to fetch requests');
            }
            requests = await response.json();
        } catch (error) {
            console.error('Error loading requests:', error);
            alert('Failed to load requests. Please check if the server is running.');
            requests = [];
        }
    }
    
    async function updateRequestOrder() {
        isUserInteracting = true; // Prevent auto-refresh during user action
        
        try {
            const requestIds = requests.map(request => request.rowId);
            
            const response = await fetch(`${API_BASE_URL}/requests/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestIds })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update request order');
            }
            
            // Reload requests from server to get the updated order
            await loadRequests();
            renderRequests();
        } catch (error) {
            console.error('Error updating request order:', error);
            alert('Failed to update request order. Please try again.');
        } finally {
            isUserInteracting = false; // Re-enable auto-refresh
        }
    }
    
    // Auto-refresh functionality
    function startAutoRefresh() {
        // Clear any existing interval
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        // Set up new interval to refresh every 5 seconds
        refreshInterval = setInterval(async () => {
            if (!isUserInteracting) {
                try {
                    const response = await fetch(`${API_BASE_URL}/requests`);
                    if (response.ok) {
                        const newRequests = await response.json();
                        
                        // Only update if the data has changed
                        if (JSON.stringify(newRequests) !== JSON.stringify(requests)) {
                            requests = newRequests;
                            renderRequests();
                            console.log('List auto-refreshed');
                        }
                    }
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                    // Don't show error to user for background refresh
                }
            }
        }, 5000); // 5 seconds
    }
    
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }
    
    // Event listeners
    settingsBtn.addEventListener('click', openSettingsModal);
    cancelEnvBtn.addEventListener('click', function() {
        closeSettingsModal();
    });
    settingsModal.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
    saveEnvBtn.addEventListener('click', saveEnvSettings);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && settingsModal.style.display === 'block') {
            closeSettingsModal();
        }
    });

    submitBtn.addEventListener('click', function() {
        addRequest(requestInput.value, priorityCheckbox.checked);
    });
    
    requestInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addRequest(requestInput.value, priorityCheckbox.checked);
        }
    });
    
    yearInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addRequest(requestInput.value, priorityCheckbox.checked);
        }
    });
    
    typeSelect.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addRequest(requestInput.value, priorityCheckbox.checked);
        }
    });
    
    // Clear errors when user starts typing
    requestInput.addEventListener('input', function() {
        clearError(requestInput, 'request-input-error');
    });
    
    yearInput.addEventListener('input', function() {
        clearError(yearInput, 'year-input-error');
    });
    
    typeSelect.addEventListener('change', function() {
        clearError(typeSelect, 'type-select-error');
    });
    
    // Name functionality
    function initializeName() {
        const savedName = localStorage.getItem('userName');
        
        if (savedName) {
            userNameSpan.textContent = savedName;
        } else {
            showNameModal();
        }
        
        // Event listeners for name functionality
        saveNameBtn.addEventListener('click', saveName);
        editNameBtn.addEventListener('click', showNameModal);
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveName();
            }
        });
    }
    
    function showNameModal() {
        nameModal.style.display = 'block';
        nameInput.value = userNameSpan.textContent === 'User' ? '' : userNameSpan.textContent;
        nameInput.focus();
        nameInput.select();
    }
    
    function hideNameModal() {
        nameModal.style.display = 'none';
    }
    
    function saveName() {
        const name = nameInput.value.trim();
        if (name) {
            userNameSpan.textContent = name;
            localStorage.setItem('userName', name);
            hideNameModal();
        } else {
            alert('Please enter a valid name.');
        }
    }
    
    
    // Initialize name functionality first
    initializeName();
    
    // Initialize the app
    loadRequests().then(() => {
        renderRequests();
        requestInput.focus();
        startAutoRefresh(); // Start auto-refresh after initial load
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });
});
