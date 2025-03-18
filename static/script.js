// createApp - function by Vue 3 to create new Vue app instance, app init + mount to DOM elem
// ref - function by Vue 3 to create a reactive reference to a value. can create reactive state vars to use in Vue components
// onMounted - runs code after Vue component is mounted to DOM (good for initialization stuff)
// computed - creates a reactive value derived from other reactive values (like a formula cell in Excel)
const {createApp, ref, onMounted, computed} = Vue;

const app = createApp({
    setup() {
        // CREATE REACTIVE STATE VARS
        const inputText = ref('');
        const summary = ref('');
        const error = ref(''); 
        const isLoading = ref(false); 
        const showHistory = ref(false);
        const isPinned = ref(false);
        const history = ref([]);

        // load history from localStorage when component mounts
        onMounted(() => {
            // try to get saved history items from localStorage
            const savedHistory = localStorage.getItem('summaryHistory');
            if (savedHistory) {
                try {
                    history.value = JSON.parse(savedHistory);
                } catch (e) {
                    console.error('Error loading history:', e);
                }
            }
        
            // setup event listener for mouse leaving the sidebar
            document.addEventListener('mousemove', (e) => {
                // only hide sidebar if not pinned AND currently showing
                if (!isPinned.value && showHistory.value) {
                    // check if mouse is outside the sidebar and trigger
                    const sidebar = document.querySelector('.history-sidebar');
                    const trigger = document.querySelector('.history-trigger');
                    
                    if (sidebar && trigger) {
                        // getBoundingClientRect() - gets element's size and position relative to viewport
                        const sidebarRect = sidebar.getBoundingClientRect();
                        const triggerRect = trigger.getBoundingClientRect();
                        
                        // check if mouse coords are inside sidebar area
                        const isOverSidebar = e.clientX >= sidebarRect.left && 
                                            e.clientX <= sidebarRect.right && 
                                            e.clientY >= sidebarRect.top && 
                                            e.clientY <= sidebarRect.bottom;
                        
                        // check if mouse coords are inside trigger area            
                        const isOverTrigger = e.clientX >= triggerRect.left && 
                                            e.clientX <= triggerRect.right && 
                                            e.clientY >= triggerRect.top && 
                                            e.clientY <= triggerRect.bottom;
                        
                        // if mouse isn't over either element, hide the sidebar
                        if (!isOverSidebar && !isOverTrigger) {
                            showHistory.value = false;
                        }
                    }
                }
            });
        });
      
        const togglePin = () => {
            // if it's pinned, we unpin it and hide it
            if (isPinned.value) {
                isPinned.value = false;
                showHistory.value = false;
            } 
            // if it's not pinned, we pin it (it's already showing from hover)
            else {
                isPinned.value = true;
                showHistory.value = true;
            }
        };

        // function to get summary from API
        const getSummary = async () => {
            // NO TEXT ERROR
            if(!inputText.value.trim()){
                error.value = 'Please enter text to summarize';
                return;
            }
            try {
                isLoading.value = true;
                error.value = '';
                
                console.log('Sending request to summarize text of length:', inputText.value.length);
                
                // use relative URL instead of absolute URL to avoid CORS issues
                // this will work no matter what domain/port the frontend is running on
                const response = await fetch('/summarize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        text: inputText.value 
                    }),
                });
                
                console.log('Response status:', response.status);
                
                // debugging - log the raw response
                const responseText = await response.text();
                console.log('Response text:', responseText);
                
                // Parse the JSON response
                let data;
                try {
                    // try to parse the response as JSON
                    data = JSON.parse(responseText);
                } catch (e) {
                    console.error('Error parsing response as JSON:', e);
                    throw new Error('Invalid response from server');
                }
                
                if (!response.ok) {
                    console.error('Error response:', data);
                    error.value = data.error || 'Failed to get summary';
                    return; // exit early if error
                }

                summary.value = data.summary;
                console.log('Summary received, length:', data.summary.length);
                
                // save to history
                saveToHistory(inputText.value, data.summary);
            }
            catch (err) {
                console.error('Error in getSummary:', err);
                summary.value = '';
                /* have default error message */
                error.value = 'An error occurred while getting the summary: ' + err.message;
            }
            finally {
                isLoading.value = false;
            }
        };
        // save to history
        const saveToHistory = (text, summaryText) => {
            // create history item with timestamp as ID
            const newItem = {
            id: Date.now(), // unique ID based on current time
            date: new Date().toLocaleString(),
            text: text.length > 100 ? text.substring(0, 100) + '...' : text, // truncate for display
            fullText: text, // keep full text for loading
            summary: summaryText
            };
            
            // add to beginning of array (newest first)
            history.value.unshift(newItem);
            
            // keep only 10 most recent items
            if (history.value.length > 10) {
            history.value = history.value.slice(0, 10);
            }
            
            // save to localStorage for persistence
            localStorage.setItem('summaryHistory', JSON.stringify(history.value));
        };
        
        // load from history - repopulates the input/output when history item is clicked
        const loadFromHistory = (item) => {
            inputText.value = item.fullText;
            summary.value = item.summary;
            error.value = '';
        };

        // add function to clear history - use later
        const clearHistory = () => {
            history.value = [];
            localStorage.removeItem('summaryHistory');
        };

        // add computed property for counting characters - if i want to add a char limit
        const charCount = computed(() => {
            return inputText.value.length;
        });

        const renderedSummary = computed(() => {
            if (!summary.value) return '';
            // use marked library to render the HTML
            return marked.parse(summary.value);
        });

        return {
            inputText, 
            getSummary,
            summary,
            error,
            history,
            isLoading,
            showHistory,
            isPinned,
            togglePin,
            loadFromHistory,
            clearHistory,
            charCount,
            renderedSummary
        };
    }
});

app.mount('#app'); // mount the app to the DOM element with id 'app'