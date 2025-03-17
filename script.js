// createApp - function by Vue 3 to create new Vue app instance, app init + mount to DOM elem
// ref - function by Vue 3 to create a reactive reference to a value. can create reactive state vars to use in Vue components
const {createApp, ref} = Vue;

const app = createApp({
    setup() {
        // reactive data
        const inputText = ref('');
        // function to get summary from API
        const getSummary = () => {
            console.log('Text to summarize', inputText.value); // health check make sure got the value
            // call the API
        };
        return {
            inputText, 
            getSummary
        };
    }
});

app.mount('#app'); // mount the app to the DOM element with id 'app'
