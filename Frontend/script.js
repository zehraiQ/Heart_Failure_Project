/**
 * Heart Failure Prediction System
 * Main JavaScript Module
 *
 * Handles form submission, API integration, and UI updates
 */

(function() {
    'use strict';

    // ===================================
    // Configuration
    // ===================================

    const CONFIG = {
        API_ENDPOINT: 'http://localhost:8000/predict',
        PREDICTION_LABELS: {
            0: 'Healthy',
            1: 'Risk of Heart Failure'
        },
        ANIMATION_DURATION: 500,
        TOAST_DURATION: 3000
    };

    // ===================================
    // DOM Elements
    // ===================================

    const DOM = {
        form: document.getElementById('predictionForm'),
        resetBtn: document.getElementById('resetBtn'),
        predictBtn: document.getElementById('predictBtn'),
        initialState: document.getElementById('initialState'),
        loadingState: document.getElementById('loadingState'),
        resultsState: document.getElementById('resultsState'),
        errorMessage: document.getElementById('errorMessage'),
        errorText: document.getElementById('errorText'),
        toastMessage: document.getElementById('toastMessage'),
        resultToast: document.getElementById('resultToast'),
        summaryText: document.getElementById('summaryText'),
        // Result cards
        knnCard: document.getElementById('knnCard'),
        knnResult: document.getElementById('knnResult'),
        knnFooter: document.getElementById('knnFooter'),
        naiveBayesCard: document.getElementById('naiveBayesCard'),
        naiveBayesResult: document.getElementById('naiveBayesResult'),
        naiveBayesFooter: document.getElementById('naiveBayesFooter'),
        decisionTreeCard: document.getElementById('decisionTreeCard'),
        decisionTreeResult: document.getElementById('decisionTreeResult'),
        decisionTreeFooter: document.getElementById('decisionTreeFooter'),
        randomForestCard: document.getElementById('randomForestCard'),
        randomForestResult: document.getElementById('randomForestResult'),
        randomForestFooter: document.getElementById('randomForestFooter')
    };

    // ===================================
    // State Management
    // ===================================

    let state = {
        isLoading: false,
        lastResults: null
    };

    // ===================================
    // Utility Functions
    // ===================================

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success/error)
     */
    function showToast(message, type = 'success') {
        const toastEl = DOM.resultToast;
        const toastMessageEl = DOM.toastMessage;

        toastMessageEl.textContent = message;
        toastEl.classList.remove('bg-success', 'bg-danger');
        toastEl.classList.add(type === 'success' ? 'bg-success text-white' : 'bg-danger text-white');

        const toast = new bootstrap.Toast(toastEl, {
            animation: true,
            autohide: true,
            delay: CONFIG.TOAST_DURATION
        });
        toast.show();
    }

    /**
     * Sleep utility for animations
     * @param {number} ms - Milliseconds to sleep
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate form inputs
     * @returns {boolean} Whether form is valid
     */
    function validateForm() {
        const form = DOM.form;
        let isValid = true;

        // Get all form controls
        const formControls = form.querySelectorAll('.form-control, .form-select');

        formControls.forEach(control => {
            // Reset validation state
            control.classList.remove('is-invalid');

            // Check validity
            if (!control.checkValidity()) {
                control.classList.add('is-invalid');
                isValid = false;
            }
        });

        // Bootstrap validation
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Collect form data
     * @returns {Object} Form data object
     */
    function collectFormData() {
        const formData = new FormData(DOM.form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            // Convert to number if applicable
            const numValue = Number(value);
            data[key] = isNaN(numValue) ? value : numValue;
        }

        return data;
    }

    /**
     * Set button loading state
     * @param {boolean} loading - Whether to show loading state
     */
    function setButtonLoading(loading) {
        const btnText = DOM.predictBtn.querySelector('.btn-text');
        const btnLoading = DOM.predictBtn.querySelector('.btn-loading');

        if (loading) {
            btnText.classList.add('d-none');
            btnLoading.classList.remove('d-none');
            DOM.predictBtn.disabled = true;
        } else {
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
            DOM.predictBtn.disabled = false;
        }
    }

    /**
     * Show/hide result states
     * @param {string} stateName - State to show ('initial', 'loading', 'results')
     */
    function showState(stateName) {
        // Hide all states
        DOM.initialState.classList.add('d-none');
        DOM.loadingState.classList.add('d-none');
        DOM.resultsState.classList.add('d-none');
        DOM.errorMessage.classList.add('d-none');

        // Show requested state
        switch (stateName) {
            case 'initial':
                DOM.initialState.classList.remove('d-none');
                break;
            case 'loading':
                DOM.loadingState.classList.remove('d-none');
                break;
            case 'results':
                DOM.resultsState.classList.remove('d-none');
                break;
        }
    }

    /**
     * Update a single result card
     * @param {string} cardId - Card element ID
     * @param {string} resultId - Result element ID
     * @param {string} footerId - Footer element ID
     * @param {number} prediction - Prediction value (0 or 1)
     */
    function updateResultCard(cardId, resultId, footerId, prediction) {
        const card = document.getElementById(cardId);
        const result = document.getElementById(resultId);
        const footer = document.getElementById(footerId);

        // Remove existing classes
        card.classList.remove('healthy', 'risk');

        // Add appropriate class and content
        if (prediction === 0) {
            card.classList.add('healthy');
            result.querySelector('.result-value').textContent = CONFIG.PREDICTION_LABELS[0];
            result.querySelector('.result-label').textContent = 'Healthy';
            footer.querySelector('.status-badge').textContent = 'Healthy';
        } else if (prediction === 1) {
            card.classList.add('risk');
            result.querySelector('.result-value').textContent = CONFIG.PREDICTION_LABELS[1];
            result.querySelector('.result-label').textContent = 'At Risk';
            footer.querySelector('.status-badge').textContent = 'Heart Failure Risk';
        } else {
            result.querySelector('.result-value').textContent = 'Unknown';
            result.querySelector('.result-label').textContent = 'Prediction';
            footer.querySelector('.status-badge').textContent = 'Error';
        }
    }

    /**
     * Update all result cards with predictions
     * @param {Object} results - API response object
     */
    function updateResults(results) {
        // Update KNN
        updateResultCard('knnCard', 'knnResult', 'knnFooter', results.knn);

        // Update Naive Bayes
        updateResultCard('naiveBayesCard', 'naiveBayesResult', 'naiveBayesFooter', results.naive_bayes);

        // Update Decision Tree
        updateResultCard('decisionTreeCard', 'decisionTreeResult', 'decisionTreeFooter', results.decision_tree);

        // Update Random Forest
        updateResultCard('randomForestCard', 'randomForestResult', 'randomForestFooter', results.random_forest);

        // Generate summary
        const predictions = [
            results.knn,
            results.naive_bayes,
            results.decision_tree,
            results.random_forest
        ];

        const riskCount = predictions.filter(p => p === 1).length;
        const healthyCount = predictions.filter(p => p === 0).length;

        let summary = '';
        if (riskCount >= 3) {
            summary = `⚠️ High Risk Alert: ${riskCount} out of 4 models predict heart failure risk. ` +
                      'Immediate clinical consultation is strongly recommended.';
        } else if (riskCount >= 2) {
            summary = `⚡ Moderate Risk: ${riskCount} out of 4 models indicate potential heart failure risk. ` +
                      'Further cardiac evaluation may be warranted.';
        } else if (riskCount >= 1) {
            summary = `ℹ️ Low Risk: ${riskCount} out of 4 models suggest possible risk. ` +
                      'Consider routine follow-up monitoring.';
        } else {
            summary = `✅ Low Risk: All ${healthyCount} models predict healthy status. ` +
                      'No immediate concerns based on the provided clinical parameters.';
        }

        DOM.summaryText.textContent = summary;

        // Store results
        state.lastResults = results;
    }

    /**
     * Reset all result cards to initial state
     */
    function resetResultCards() {
        const cards = [
            { card: 'knnCard', result: 'knnResult', footer: 'knnFooter' },
            { card: 'naiveBayesCard', result: 'naiveBayesResult', footer: 'naiveBayesFooter' },
            { card: 'decisionTreeCard', result: 'decisionTreeResult', footer: 'decisionTreeFooter' },
            { card: 'randomForestCard', result: 'randomForestResult', footer: 'randomForestFooter' }
        ];

        cards.forEach(({ card, result, footer }) => {
            document.getElementById(card).classList.remove('healthy', 'risk');
            document.getElementById(result).querySelector('.result-value').textContent = '--';
            document.getElementById(result).querySelector('.result-label').textContent = 'Prediction';
            document.getElementById(footer).querySelector('.status-badge').textContent = 'Awaiting';
        });

        DOM.summaryText.textContent = '--';
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        DOM.errorText.textContent = message;
        DOM.errorMessage.classList.remove('d-none');
    }

    /**
     * Reset form to initial state
     */
    function resetForm() {
        DOM.form.reset();
        DOM.form.classList.remove('was-validated');

        // Reset validation styles
        const formControls = DOM.form.querySelectorAll('.form-control, .form-select');
        formControls.forEach(control => {
            control.classList.remove('is-valid', 'is-invalid');
        });

        // Reset results
        resetResultCards();
        showState('initial');
    }

    // ===================================
    // API Functions
    // ===================================

    /**
     * Send prediction request to API
     * @param {Object} data - Form data to send
     * @returns {Promise<Object>} API response
     */
    async function sendPredictionRequest(data) {
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data),
            mode: 'cors'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Handle form submission
     * @param {Event} event - Submit event
     */
    async function handleSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        // Validate form
        if (!validateForm()) {
            showToast('Please fill in all required fields correctly.', 'error');
            return;
        }

        // Check if already loading
        if (state.isLoading) {
            return;
        }

        // Collect data
        const formData = collectFormData();

        // Show loading state
        state.isLoading = true;
        setButtonLoading(true);
        showState('loading');

        try {
            // Send API request
            const results = await sendPredictionRequest(formData);

            // Validate response
            if (!results || typeof results !== 'object') {
                throw new Error('Invalid response from server');
            }

            // Update UI with results
            await sleep(CONFIG.ANIMATION_DURATION);
            updateResults(results);
            showState('results');

            // Show success toast
            const riskCount = [results.knn, results.naive_bayes, results.decision_tree, results.random_forest]
                .filter(p => p === 1).length;

            if (riskCount >= 3) {
                showToast('High Risk Detected! Please consult a cardiologist.', 'error');
            } else if (riskCount >= 1) {
                showToast('Prediction Complete - Further evaluation may be needed.', 'warning');
            } else {
                showToast('Prediction Complete - Patient appears healthy.', 'success');
            }

        } catch (error) {
            console.error('Prediction Error:', error);

            // Show error state
            showState('initial');

            // Provide user-friendly error message
            let errorMessage = 'Unable to connect to the prediction server. ';

            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage += 'Please ensure the backend server is running at ' + CONFIG.API_ENDPOINT;
            } else if (error.message.includes('HTTP error')) {
                errorMessage = 'Server error occurred. Please try again later.';
            } else {
                errorMessage += error.message || 'Please check your connection and try again.';
            }

            showError(errorMessage);
            showToast('Prediction failed. Please try again.', 'error');
        } finally {
            // Reset loading state
            state.isLoading = false;
            setButtonLoading(false);
        }
    }

    /**
     * Handle reset button click
     * @param {Event} event - Click event
     */
    function handleReset(event) {
        event.preventDefault();
        resetForm();
        showToast('Form has been reset.', 'success');
    }

    // ===================================
    // Event Listeners
    // ===================================

    function initEventListeners() {
        // Form submission
        DOM.form.addEventListener('submit', handleSubmit);

        // Reset button
        DOM.resetBtn.addEventListener('click', handleReset);

        // Input validation on blur
        const formControls = DOM.form.querySelectorAll('.form-control, .form-select');
        formControls.forEach(control => {
            control.addEventListener('blur', function() {
                if (this.value !== '') {
                    if (this.checkValidity()) {
                        this.classList.remove('is-invalid');
                        this.classList.add('is-valid');
                    } else {
                        this.classList.remove('is-valid');
                        this.classList.add('is-invalid');
                    }
                }
            });

            // Remove validation on input
            control.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    this.classList.remove('is-invalid');
                }
            });
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    // ===================================
    // Initialization
    // ===================================

    function init() {
        // Initialize event listeners
        initEventListeners();

        // Show initial state
        showState('initial');

        // Log initialization
        console.log('Heart Failure Prediction System initialized successfully');
        console.log('API Endpoint:', CONFIG.API_ENDPOINT);
    }

    // Start application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===================================
    // Export for testing (if needed)
    // ===================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CONFIG,
            validateForm,
            collectFormData,
            updateResults
        };
    }

})();
