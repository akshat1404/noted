// Content script for Noted Extension

(function() {
    'use strict';

    const DASHBOARD_URL = "https://noted-peach.vercel.app/";
    
    // --- DASHBOARD SYNC LOGIC ---
    if (window.location.href.startsWith(DASHBOARD_URL)) {
        // Listen for the custom event from the React app
        window.addEventListener('NOTED_AUTH_SYNC', (e) => {
            if (e.detail && e.detail.token) {
                chrome.storage.local.set({ noted_token: e.detail.token }, () => {
                    console.log("Noted: Token synchronized automatically.");
                });
            }
        });

        // Also check localStorage on load just in case
        const existingToken = localStorage.getItem('noted_token');
        if (existingToken) {
            chrome.storage.local.set({ noted_token: existingToken });
        }
        return;
    }

    // --- REGULAR SITE LOGIC ---
    const siteKey = "note_" + window.location.hostname;
    const domain = window.location.hostname;
    const url = window.location.href;

    // Helper functions
    const getValue = (key, defaultValue) => {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] !== undefined ? result[key] : defaultValue);
            });
        });
    };

    const setValue = (key, value) => {
        chrome.storage.local.set({ [key]: value });
    };

    // 1. TRIGGER ICON (Small button bottom right)
    const trigger = document.createElement('div');
    trigger.innerText = "N";
    trigger.style = `
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        background: #facc15; border: 2px solid #854d0e; border-radius: 50%;
        width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
        color: #854d0e; font-weight: bold; cursor: pointer; font-family: sans-serif;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15); font-size: 20px;
    `;

    // 2. MAIN WIDGET
    const widget = document.createElement('div');
    widget.style = `
        position: fixed; bottom: 70px; right: 20px; z-index: 2147483647;
        background: #feff9c; border: 1px solid #e6e600; border-radius: 4px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: none; flex-direction: column;
        min-width: 250px; min-height: 150px; width: 300px; height: 260px;
        overflow: visible; resize: both; font-family: 'Segoe UI', Tahoma, sans-serif;
    `;

    trigger.onclick = () => {
        widget.style.display = widget.style.display === 'none' ? 'flex' : 'none';
    };

    // 3. TOOLBAR
    const toolbar = document.createElement('div');
    toolbar.style = `background: rgba(0,0,0,0.05); padding: 5px; display: flex; gap: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); align-items: center;`;

    const createStyleBtn = (label, cmd) => {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style = `cursor: pointer; border: 1px solid rgba(0,0,0,0.2); background: transparent; padding: 2px 8px; border-radius: 3px; font-weight: bold; font-size: 12px;`;
        btn.onclick = () => { document.execCommand(cmd, false, null); editor.focus(); };
        return btn;
    };

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'CLOSE';
    closeBtn.style = "margin-left: auto; cursor: pointer; border: none; background: transparent; font-size: 10px; color: #666; font-weight: bold; letter-spacing: 0.5px;";
    closeBtn.onclick = () => widget.style.display = 'none';

    toolbar.append(createStyleBtn('B', 'bold'), createStyleBtn('I', 'italic'), closeBtn);

    // 4. EDITOR AREA
    const editor = document.createElement('div');
    editor.contentEditable = true;
    editor.style = `flex: 1; padding: 12px; overflow-y: auto; outline: none; background: transparent; color: #333; line-height: 1.5; font-size: 14px;`;
    
    getValue(siteKey, "Write a note...").then(content => {
        editor.innerHTML = content;
    });

    editor.addEventListener('input', () => setValue(siteKey, editor.innerHTML));

    // 5. FOOTER
    const footer = document.createElement('div');
    footer.style = `padding: 8px; display: flex; justify-content: space-between; align-items: center; position: relative; border-top: 1px solid rgba(0,0,0,0.03);`;

    const saveBtn = document.createElement('button');
    saveBtn.innerText = "SAVE TO DASHBOARD";
    saveBtn.style = "background: #000; color: #fff; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;";

    saveBtn.onclick = async () => {
        const token = (await getValue('noted_token', '')).trim();
        if (!token) {
            alert("No dashboard link found! Please visit and sign in to noted-peach.vercel.app first.");
            window.open(DASHBOARD_URL, '_blank');
            return;
        }

        const originalText = saveBtn.innerText;
        saveBtn.innerText = "SAVING...";
        saveBtn.disabled = true;

        chrome.runtime.sendMessage({
            type: "SAVE_NOTE",
            token: token,
            domain: domain,
            url: url,
            content: editor.innerHTML
        }, (response) => {
            if (response && response.success) {
                saveBtn.innerText = "SAVED!";
                const viewLink = document.createElement('a');
                viewLink.href = DASHBOARD_URL;
                viewLink.target = "_blank";
                viewLink.innerText = "VIEW DASHBOARD";
                viewLink.style = "margin-left: 10px; color: #854d0e; font-size: 10px; font-weight: bold; text-decoration: underline; cursor: pointer;";
                footer.insertBefore(viewLink, saveBtn.nextSibling);
                
                setTimeout(() => {
                    saveBtn.innerText = originalText;
                    saveBtn.disabled = false;
                    viewLink.remove();
                }, 4000);
            } else {
                alert("Failed to save: " + (response ? response.error : "Unknown error"));
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
            }
        });
    };

    const menuBtn = document.createElement('button');
    menuBtn.innerText = 'MENU';
    menuBtn.style = "background: transparent; border: 1px solid rgba(0,0,0,0.1); border-radius: 3px; cursor: pointer; font-size: 10px; color: #333; padding: 4px 6px; font-weight: bold;";

    const menu = document.createElement('div');
    menu.style = `display: none; position: absolute; bottom: 45px; right: 5px; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 150px; z-index: 10000;`;

    const addAction = (label, fn) => {
        const item = document.createElement('div');
        item.innerText = label;
        item.style = "padding: 10px 12px; cursor: pointer; font-size: 11px; border-bottom: 1px solid #f0f0f0; color: #333; text-transform: uppercase; font-weight: bold;";
        item.onmouseover = () => item.style.background = "#f9f9f9";
        item.onmouseout = () => item.style.background = "white";
        item.onclick = (e) => { e.stopPropagation(); fn(); menu.style.display = 'none'; };
        menu.appendChild(item);
    };

    addAction("Open Dashboard", () => window.open(DASHBOARD_URL, '_blank'));
    addAction("Copy Text", () => {
        navigator.clipboard.writeText(editor.innerText);
        const original = menuBtn.innerText;
        menuBtn.innerText = "COPIED";
        setTimeout(() => menuBtn.innerText = original, 1000);
    });
    addAction("Clear Note", () => { if(confirm("Clear this note?")) { editor.innerHTML = ""; setValue(siteKey, ""); } });

    menuBtn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    };

    document.addEventListener('click', () => menu.style.display = 'none');

    footer.append(saveBtn, menuBtn, menu);
    widget.append(toolbar, editor, footer);
    document.body.appendChild(trigger);
    document.body.appendChild(widget);

})();
