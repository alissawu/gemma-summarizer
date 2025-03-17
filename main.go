// entry point for the api
package main

import (
	"bytes"         //create and manipulate byte buffers, useful for the body
	"encoding/json" //functions to marshal (Go obj -> JSON) and unmarshal (JSON -> GO obj)
	"io"            //read IO streams (ie read HTTP response bodies)
	"log"           //logging erros, informational messages, ..
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// TYPE DEFINITIONS
// JSON request body for the summar endpoint
type SummaryRequest struct {
	// binding: required means that TEXT field MUST be provided
	Text string `json:"text" binding:"required"`
}

// JSON response from the summary endpoint
type SummaryResponse struct {
	Summary string `json:"summary"`
}

// Message represents a message in the OpenAI chat completion request
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func init() {
	// get environment variables from .env
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file.")
	}
}

// call Gemma API for summarization
func summarizeText(text string) (string, error) {
	apiKey := os.Getenv("GEMMA_API_KEY")
	if apiKey == "" {
		return "", &SummaryError{Message: "Gemma API key not found in environment variables"}
	}
	// Gemma 3 27B - FREE!!!
	// 128K context length (good for long docs), has text and vision so can extend beyond text in the future
	apiURL := "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=" + apiKey

	// Create request payload - the data sent to the server (Gemma API), body of the request
	// originally constructed in Go as nested maps and slices
	reqBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{
				{"text": "Summarize the following text concisely:\n\n" + text},
			}},
		},
	}
	// convert Go obj to JSON
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// Create HTTP POST request - sending data to the server (POST)
	// not a database it sends to the API.
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	// tells server the data being sent is in JSON, helsp process correctly
	req.Header.Set("Content-Type", "application/json")

	// Send request
	client := &http.Client{}    // new HTTP client instance, sets up the obj i can use to send requests
	resp, err := client.Do(req) // takes HTTP request (req), sends it over the network, waits until it recieves resp from server (or error)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close() // makes sure the response body is closed when the current function completes
	//important for resource management - not closing response body can lead to open TCP connections

	// Read response into memory
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Parse response from response JSON to a structured format, matching the expected resp from Gemma API
	var gemmaResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	err = json.Unmarshal(body, &gemmaResp)
	if err != nil {
		return "", err
	}

	// Extract summary
	// Navigate thro nested response to get summarized text
	if len(gemmaResp.Candidates) > 0 && len(gemmaResp.Candidates[0].Content.Parts) > 0 {
		return gemmaResp.Candidates[0].Content.Parts[0].Text, nil
	}
	// if no resp is found return error
	return "", &SummaryError{Message: "No summary generated"}
}

// custom error type for summarization errors
type SummaryError struct {
	Message string
}

// provides more context specific error messages related to summarization issues
func (e *SummaryError) Error() string {
	return e.Message
}

// Handle API request in Gin
func summarizeHandler(c *gin.Context) {
	var req SummaryRequest

	// Bind JSON request body to SummaryRequest struct
	if err := c.ShouldBindJSON(&req); err != nil {
		// returns error if it's the wrong format (ie: missing text)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format. Please provide 'text' field."})
		return
	}

	// Check if text is empty
	if req.Text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Text cannot be empty"})
		return
	}

	// Call API to generate summary
	summary, err := summarizeText(req.Text)
	if err != nil {
		// Check if it's our custom error type
		if summaryErr, ok := err.(*SummaryError); ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": summaryErr.Message})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate summary: " + err.Error()})
		}
		return
	}
	// Return the summary
	c.JSON(http.StatusOK, SummaryResponse{Summary: summary})
}

func main() {
	// Configures Gin for production mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Health check endpoint -- returns a success message
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Summarizer API is running"})
	})

	// Summarize endpoint - call the function
	r.POST("/summarize", summarizeHandler)

	// get PORT from environment variable (optional, I didn't set one)
	// defaults to 8080 if no env var
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Println("Server running on port " + port)
	err := r.Run(":" + port)
	if err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
