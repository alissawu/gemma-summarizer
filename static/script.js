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
            return marked.parse(summary.value);
        });

        const tryItOut = () => {
            inputText.value = `Study: Newly Discovered Beneficial Mutation in Mitochondrial DNA Appears to Help Alzheimer’s Gene Carriers Live Longer, Stay Sharper and Represents a New Direction in Drug Discovery 6 min read
        Brain releasing vibrant colored powder
        Findings suggest the rare variant prevents Alzheimer’s onset by clearing away amyloid-beta buildup in long-lived carriers of APOE4, the gene most strongly associated with disease risk.
        March 23, 2024 | Print
        Researchers at the USC Leonard Davis School of Gerontology have discovered a genetic mutation in a small mitochondrial protein that may promote longevity, preserve cognitive function, and protect against Alzheimer’s disease among carriers of APOE4, a gene associated with a dramatic increase in the risk of developing Alzheimer’s disease.
        In a study of centenarians conducted in collaboration with scientists at Albert Einstein College of Medicine, the variant, affecting a mitochondrial microprotein called humanin, was found to be more prevalent in individuals who reached the age of 100 in spite of having the APOE4 allele which predisposes people to Alzheimer’s disease and earlier death.
        In a series of analyses, the researchers found that the presence of the variant (termed P3S-humanin) in APOE4 carriers seemed to preserve cognitive function. The P3S variant is thought to be extremely rare in the general population and is found primarily in people of Ashkenazi Jewish descent. Subjects were enrolled in the Einstein Longevity Genes Project, a study of more than 500 healthy centenarians, near-centenarians and their children.
        “This new study sheds light on resilience genes that help people live longer and partially explains why some people at high risk for developing Alzheimer’s disease are spared,” said senior author Pinchas Cohen, distinguished professor of gerontology and biological sciences and dean of the USC Leonard Davis School. “It also opens a new direction for exploring therapies based on mitochondrial microproteins.”
        The findings appeared online on March 23, 2024, in the journal Aging Cell.
        “This work shows the incredible utility of studying centenarians to discover new targets for healthy longevity,” said co-author Nir Barzilai, director of the Institute for Aging Research at Einstein.
        In addition to demonstrating the direct binding and stabilizing effects of the P3S-humanin on the harmful APOE4 protein, the investigators showed that giving the P3S microprotein to mice engineered to express human APOE4, (and develop an Alzheimer’s-like condition), reduced the build-up of amyloid-beta in their brains. This build-up is a key feature of Alzheimer’s disease.
        Mitochondrial microproteins and aging
        Cohen has long studied how different mitochondrial small genes might influence aging. His team pioneered the emerging field of microproteins and has already described ten of them, including one, named MOTS-c, that has progressed to clinical trials for reducing obesity.
        Earlier this year, his lab identified a microprotein that offers protection against Parkinson’s disease (named SHLP2) and in 2022 they described a new microprotein that is also involved in Alzheimer’s (named SHMOOSE). This latest finding builds upon the team’s prior mitochondrial research and represents an advance at the intersection of longevity science, precision health, and microprotein discovery.
        In the current study, first author Brendan Miller, a former Cohen Lab doctoral student and current postdoctoral scientist at the Salk Institute, led a series of experiments that identified P3S, a rare humanin variant that was most prevalent among centenarians of Ashkenazi decent. They found that approximately 12% of these centenarians had this variant, which changes the third amino acid from proline to serine. In contrast, the frequency of humanin P3S was less than 0.2% in other populations of European and non-European descent.
        APOE4 and Alzheimer’s Risk
        Individuals who carry the APOE4 version of the APOE gene usually face poorer health outcomes compared to those with the common version (APOE3) and have significantly higher risk of Alzheimer’s disease as well as shorter lifespans. However, APOE4 carriers, who also inherited the P3S variant were largely protected from these poor outcomes. Among APOE4-carrying centenarians, those with humanin P3S outperformed those without the humanin variant in a test of cognitive function, suggesting that the variant mitigated the increased risk posed by the APOE4 gene.
        The team further studied the effects of humanin P3S by administering the protein to mice genetically engineered for Alzheimer’s with a humanized APOE4 gene. Treatment with humanin P3S resulted in a marked reduction of amyloid-beta in the brains of the mice. Treatment with the standard version of humanin resulted in some decrease of amyloid-beta but was outperformed by humanin P3S. Further in vitro and computer analysis indicated that humanin P3S’s slight structural differences allowed it to bind more effectively to APOE4, resulting in increased uptake and destruction of amyloid-beta.
        “This humanin P3S, when made by mitochondria, actually binds the protein product of APOE4 very tightly. This seems to help clear away harmful amyloid-beta, which builds up in the brains of people with Alzheimer’s,” said Miller. “Our experiments showed that this protein variant could be a reason why some people with the risk-gene avoid Alzheimer’s and maintain good brain health into old age.”
        New insights and directions
        The study illustrates a new way of understanding how people with the APOE4 gene may resist common age-related diseases like Alzheimer’s, and the findings also emphasize the need for further research into how interactions between mitochondrial and nuclear DNA influence aging. The researchers say that ultimately, this discovery opens more therapeutic avenues for individuals at risk for age-associated diseases, such as Alzheimer’s disease.
        “Going forward, since humanin P3S is a microprotein, it could serve as a template for drug design,” said Cohen. “Microproteins are much smaller than typical proteins, providing advantages for drug development. Additionally, since we understand where humanin P3S binds to the protein product of APOE4, designing small molecules could be a viable strategy.”
        Along with Miller and Cohen, coauthors included Su-Jeong Kim, Kevin Cao, Hemal H. Mehta, Neehar Thumaty, Hiroshi Kumagai, Tomomitsu Iida, Cassandra McGill, Christian J. Pike, and Kelvin Yen of the USC Leonard Davis School; Kamila Nurmakova and Zachary A. Levine of Yale University; Patrick M. Sullivan of Duke University Medical Center; Nilüfer Ertekin-Taner of the Mayo Clinic Department of Neuroscience; and Gil Atzmon and Nir Barzilai of the Albert Einstein College of Medicine.
        This work was supported by National Institutes of Health/National Institute on Aging grant AG057912 and the Yale Center for Research Computing to Levine, NIH RF1AG058068 to Pike; NIH/NIA T32AG00037 to Miller; and NIH/NIA grants R01AG061834, R01AG068405, R01AG069698, P01AG034906, and P30AG068345 to Cohen.`;
            getSummary();
        }

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
            renderedSummary,
            tryItOut
        };
    }
});

app.mount('#app'); // mount the app to the DOM element with id 'app'