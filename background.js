// Background script to handle API requests

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GROQ_API") {
    fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body
    })
    .then(response => response.json())
    .then(data => sendResponse({ success: true, data: data }))
    .catch(error => sendResponse({ success: false, error: error.toString() }));

    return true; // Will respond asynchronously
  }
});
