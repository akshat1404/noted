document.getElementById('save').onclick = () => {
    const token = document.getElementById('token').value;
    chrome.storage.local.set({ noted_token: token }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => window.close(), 1500);
    });
};

// Load existing token
chrome.storage.local.get(['noted_token'], (result) => {
    if (result.noted_token) {
        document.getElementById('token').value = result.noted_token;
    }
});
