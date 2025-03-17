// createApp - function by Vue 3 to create new Vue app instance, app init + mount to DOM elem
// ref - function by Vue 3 to create a reactive reference to a value. can create reactive state vars to use in Vue components
const {createApp, ref} = Vue;

const app = createApp({
    setup() {
        // CREATE REACTIVE STATE VARS
        const inputText = ref('');
        const summary = ref('');
        const error = ref(''); 
        const isLoading = ref(false); 

        // function to get summary from API
        const getSummary = async () => {
            // NO TEXT ERROR
            if(!inputText.value.trim()){
                error.value = 'Please enter text to summarize';
                return;
            }
            try {
                // reactive state variable, value is stored in .value
                isLoading.value = true;
                error.value = '';
                // async returns a Promise (object), await pauses the function until the Promise is resolved or rejected
                // Promise - object that represents eventual completion or failure of async operation, and its result value
                // has 3 states - Pending, Fufilled (Resolved), Rejected
                // resolve - fn to call when succeed, reject - fn to call when fail
                await new Promise((resolve, _) => setTimeout(resolve, 1000)); // resolve is the callback fn called after the delay
                summary.value = inputText.value.trim();
                // simulate error
                if(inputText.value.trim().length > 10){
                    throw new Error('Text too long');
                }
            }
            catch (err) {
                summary.value = '';
                /* have default error message */
                error.value = err ? err.message : 'An error occurred';
            }
            finally {
                isLoading.value = false;
            }
            

        };
        return {
            inputText, 
            getSummary,
            summary,
            error,
            isLoading
        };
    }
});

app.mount('#app'); // mount the app to the DOM element with id 'app'
