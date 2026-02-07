// Background script to handle API requests

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SAVE_NOTE") {
    fetch("https://noted-backend-6wc6.onrender.com/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: request.token,
        domain: request.domain,
        content: request.content
      })
    })
    .then(response => response.json())
    .then(data => sendResponse({ success: true, data: data }))
    .catch(error => sendResponse({ success: false, error: error.toString() }));

    return true; // Will respond asynchronously
  }
});
