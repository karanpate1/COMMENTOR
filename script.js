// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://commentor-5cea3-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 2. DOM ELEMENTS ---
const statusDot = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const btn = document.getElementById('analyze-btn');
const smartInput = document.getElementById('smart-input');
const hiddenFileInput = document.getElementById('hidden-file-input');
const dropZone = document.getElementById('drop-zone');
const inputIcon = document.getElementById('input-icon');

// Views
const landingView = document.getElementById('landing-view');
const terminalView = document.getElementById('terminal-view');
const resultView = document.getElementById('result-view');

let serverUrl = null;
let selectedFile = null;
let currentHtml = "";

// --- 3. SERVER CONNECTION LOGIC ---
db.ref('server_info').on('value', (snapshot) => {
    const data = snapshot.val();
    
    if (!data || !data.url) {
        statusDot.className = "status-dot offline";
        statusText.innerText = "Server Offline. Contact Admin.";
        btn.disabled = true;
    } else if (data.status === 'BUSY') {
        statusDot.className = "status-dot busy";
        statusText.innerText = "Server Busy (Queue full)";
        btn.disabled = true;
    } else {
        serverUrl = data.url;
        statusDot.className = "status-dot online";
        statusText.innerText = "Ready to Decode.";
        btn.disabled = false;
    }
});

// --- 4. SMART INPUT LOGIC ---

// Handle Icon Click -> Open File Dialog
document.querySelector('.icon-slot').addEventListener('click', () => {
    hiddenFileInput.click();
});

// Handle File Select
hiddenFileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// Handle Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if(e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    if(file && file.name.endsWith('.csv')) {
        selectedFile = file;
        smartInput.value = `File: ${file.name}`;
        smartInput.disabled = true; // Lock input so they don't type over it
        // Change Icon to "File" icon
        inputIcon.innerHTML = `<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>`;
    } else {
        alert("Please upload a valid .csv file");
    }
}

// Reset input if they click X (optional logic, kept simple here)
smartInput.addEventListener('click', () => {
    if(selectedFile) {
        let clear = confirm("Remove attached file?");
        if(clear) {
            selectedFile = null;
            smartInput.value = "";
            smartInput.disabled = false;
            hiddenFileInput.value = ""; // clear input
            // Reset Icon to Link/Search
             inputIcon.innerHTML = `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>`;
        }
    }
});

// --- 5. TERMINAL ANIMATION LOGIC ---
const logMessages = [
    "Handshaking with remote server...",
    "Secure tunnel established (TLS 1.3)...",
    "Allocating memory buffers...",
    "Fetching comment pagination tokens...",
    "Batch 1: Retrieved 100 comments...",
    "Batch 2: Retrieved 250 comments...",
    "Filtering null datasets...",
    "Loading NLP Sentiment Model (VADER)...",
    "Tokenizing text strings...",
    "Calculating polarity scores...",
    "Detecting sarcasm patterns...",
    "Aggregating user metrics...",
    "Generating HTML visualization...",
    "Finalizing report render..."
];

async function runTerminal() {
    const termBody = document.getElementById('terminal-logs');
    termBody.innerHTML = ""; // Clear old logs
    
    for (let msg of logMessages) {
        // Random delay for realism
        await new Promise(r => setTimeout(r, Math.random() * 800 + 300));
        
        const line = document.createElement('div');
        line.className = 'log-line';
        
        // Add a timestamp for extra "tech" feel
        const time = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "numeric", minute: "numeric", second: "numeric"});
        line.innerHTML = `<span style="color:#555">[${time}]</span> ${msg}`;
        
        termBody.appendChild(line);
        
        // Auto scroll to ensure newest line is visible
        termBody.scrollTop = termBody.scrollHeight;
    }
}

// --- 6. ANALYSIS EXECUTION ---
async function triggerAnalysis() {
    if (!serverUrl) return;

    const inputValue = smartInput.value;
    
    if (!selectedFile && !inputValue) {
        alert("Please provide a URL or File");
        return;
    }

    // TRANSITION TO TERMINAL
    landingView.classList.add('hidden');
    terminalView.classList.remove('hidden');
    
    // Start fake logs immediately to entertain user
    runTerminal();

    const formData = new FormData();
    if (selectedFile) {
        formData.append('file', selectedFile);
    } else {
        formData.append('youtube_url', inputValue);
    }

    try {
        const response = await fetch(`${serverUrl}/analyze`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Server Error");

        currentHtml = await response.text();
        
        // Wait a small buffer if response was too fast, so logs can finish (optional)
        // Then show result
        showResult();

    } catch (error) {
        alert("Analysis Failed: " + error.message);
        resetApp();
    }
}

function showResult() {
    terminalView.classList.add('hidden');
    resultView.classList.remove('hidden');
    const iframe = document.getElementById('result-frame');
    iframe.srcdoc = currentHtml;
}

function resetApp() {
    resultView.classList.add('hidden');
    terminalView.classList.add('hidden');
    landingView.classList.remove('hidden');
    
    // Reset file/inputs
    selectedFile = null;
    smartInput.value = "";
    smartInput.disabled = false;
    hiddenFileInput.value = "";
}

function downloadResult() {
    const blob = new Blob([currentHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "COMMENTOR_Report.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}