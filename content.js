// Content script for Noted Extension

(function() {
    'use strict';

    const siteKey = "note_" + window.location.hostname;
    const domain = window.location.hostname;

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

    // 2. MAIN WIDGET
    const widget = document.createElement('div');
    widget.style = `
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        background: #feff9c; border: 1px solid #e6e600; border-radius: 4px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; flex-direction: column;
        min-width: 250px; min-height: 150px; width: 300px; height: 260px;
        overflow: visible; resize: both; font-family: 'Segoe UI', Tahoma, sans-serif;
    `;

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
    closeBtn.onclick = () => widget.remove();

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
            alert("Please set your User Token in the extension settings (click extension icon).");
            return;
        }

        const originalText = saveBtn.innerText;
        saveBtn.innerText = "SAVING...";
        saveBtn.disabled = true;

        chrome.runtime.sendMessage({
            type: "SAVE_NOTE",
            token: token,
            domain: domain,
            content: editor.innerHTML
        }, (response) => {
            if (response && response.success) {
                saveBtn.innerText = "SAVED!";
                setTimeout(() => {
                    saveBtn.innerText = originalText;
                    saveBtn.disabled = false;
                }, 2000);
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
    document.body.appendChild(widget);

})();
