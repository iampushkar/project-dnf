let resourcesData = [];
let currentPage = 1;
const resourcesPerPage = 10;
let filteredResources = [];

// Load completed status from localStorage
function getCompletedResources() {
    return JSON.parse(localStorage.getItem('completedResources') || '{}');
}

// Save completed status to localStorage
function saveCompletedStatus(id, completed) {
    const completedResources = getCompletedResources();
    completedResources[id] = completed;
    localStorage.setItem('completedResources', JSON.stringify(completedResources));
    updateProgressBar();
    updateStatistics();
}

function updateProgressBar() {
    const completedResources = getCompletedResources();
    const totalResources = resourcesData.length;
    const completedCount = Object.values(completedResources).filter(Boolean).length;
    document.getElementById('progress').textContent = `${completedCount} / ${totalResources} completed`;
}

function updateStatistics() {
    const completedResources = getCompletedResources();
    const totalResources = resourcesData.length;
    const completedCount = Object.values(completedResources).filter(Boolean).length;
    
    // Update total stats
    document.getElementById('total-stats').innerHTML = `
        <div>Total Resources: ${totalResources}</div>
        <div>Completed: ${completedCount}</div>
        <div>Remaining: ${totalResources - completedCount}</div>
    `;

    // Update topic progress
    const topicProgress = {};
    resourcesData.forEach(resource => {
        if (!topicProgress[resource.topic]) {
            topicProgress[resource.topic] = {
                total: 0,
                completed: 0
            };
        }
        topicProgress[resource.topic].total++;
        if (completedResources[resource.id]) {
            topicProgress[resource.topic].completed++;
        }
    });

    const topicProgressHTML = Object.entries(topicProgress)
        .map(([topic, stats]) => {
            const percentage = (stats.completed / stats.total * 100).toFixed(1);
            return `
                <div class="progress-item">
                    <div>${topic} (${stats.completed}/${stats.total})</div>
                    <div class="progress-bar">
                        <div class="fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    document.getElementById('topic-progress').innerHTML = topicProgressHTML;

    // Update recent completions
    const recentCompletions = resourcesData
        .filter(resource => completedResources[resource.id])
        .slice(0, 5)
        .map(resource => `
            <div class="completion-item">
                <div>${resource.title}</div>
                <small>${resource.topic}</small>
            </div>
        `).join('');
    document.getElementById('recent-completions').innerHTML = recentCompletions;
}

// Function to get unique values from an array
const getUniqueValues = (array, property) => {
    return [...new Set(array.map(item => item[property]))].filter(Boolean).sort();
};

// Create filter checkboxes dynamically
function createFilterCheckboxes(containerId, filterType, values) {
    const container = document.getElementById(containerId);
    container.innerHTML = values.map(value => `
        <label>
            <input type="checkbox" class="${filterType}-filter" value="${value}">
            ${value}
        </label>
    `).join('');
}

async function loadResources() {
    try {
        const response = await fetch('resources.json');
        resourcesData = await response.json();
        filteredResources = resourcesData;

        // Create filters dynamically
        const companies = getUniqueValues(resourcesData, 'company');
        const topics = getUniqueValues(resourcesData, 'topic');
        const types = getUniqueValues(resourcesData, 'type');
        const difficulties = getUniqueValues(resourcesData, 'difficulty');

        createFilterCheckboxes('company-filters', 'company', companies);
        createFilterCheckboxes('topic-filters', 'topic', topics);
        createFilterCheckboxes('type-filters', 'type', types);
        createFilterCheckboxes('difficulty-filters', 'difficulty', difficulties);

        // Add event listeners to all filter checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', filterResources);
        });

        renderResources();
    } catch (error) {
        console.error("Error loading resources:", error);
    }
}

function renderResources() {
    const startIndex = (currentPage - 1) * resourcesPerPage;
    const endIndex = startIndex + resourcesPerPage;
    const resourcesToDisplay = filteredResources.slice(startIndex, endIndex);
    const completedResources = getCompletedResources();

    const container = document.getElementById('resourcesContainer');
    container.innerHTML = resourcesToDisplay.map(resource => `
        <div class="resource" data-id="${resource.id}">
            <div class="resource-header">
                <h3><a href="${resource.link}" target="_blank" rel="noopener noreferrer">${resource.title}</a></h3>
                <input type="checkbox" class="completion-checkbox" 
                    data-id="${resource.id}" 
                    ${completedResources[resource.id] ? 'checked' : ''}>
            </div>
            <div class="labels">
                <span class="label company-label">${resource.company}</span>
                <span class="label topic-label">${resource.topic}</span>
                <span class="label type-label">${resource.type}</span>
                <span class="label difficulty-label">${resource.difficulty}</span>
            </div>
        </div>
    `).join('');

    // Add event listeners to checkboxes
    document.querySelectorAll('.completion-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            saveCompletedStatus(e.target.dataset.id, e.target.checked);
        });
    });

    updatePaginationButtons();
    updateProgressBar();
    updateStatistics();
}

function updatePaginationButtons() {
    const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

function filterResources() {
    const activeFilters = {
        company: getActiveFilters('company-filter'),
        topic: getActiveFilters('topic-filter'),
        type: getActiveFilters('type-filter'),
        difficulty: getActiveFilters('difficulty-filter')
    };

    filteredResources = resourcesData.filter(resource => {
        return Object.entries(activeFilters).every(([filterType, activeValues]) => {
            return activeValues.length === 0 || activeValues.includes(resource[filterType]);
        });
    });

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredResources = filteredResources.filter(resource =>
            resource.title.toLowerCase().includes(searchTerm)
        );
    }

    currentPage = 1;
    renderResources();
}

function getActiveFilters(className) {
    return Array.from(document.querySelectorAll(`.${className}:checked`))
        .map(checkbox => checkbox.value);
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', filterResources);

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderResources();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderResources();
    }
});

// Initialize the application
window.addEventListener('load', () => {
    loadResources();
    updateProgressBar();
    updateStatistics();
});
