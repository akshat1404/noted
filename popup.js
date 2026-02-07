// Popup logic - simple status check
chrome.storage.local.get(['noted_token'], (result) => {
    const msg = document.getElementById('sync-msg');
    if (result.noted_token) {
        msg.innerText = "✨ Auto-Sync Connected";
        msg.style.color = "#059669";
    } else {
        msg.innerText = "❌ Not Connected";
        msg.style.color = "#ef4444";
    }
});
