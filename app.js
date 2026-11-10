// State
let state = {
    bank: 'chase',
    isBack: false,
    fields: {},
    bgImg: null,
    logoImg: null,
    microprint: false,
    voidMark: false,
    activeField: null
};

const banks = {
    chase: { name: 'JPMorgan Chase', color: '#117ACA', addr: '270 Park Ave, NY' },
    wells: { name: 'WELLS FARGO', color: '#D71E28', addr: '420 Montgomery St, SF' },
    boa: { name: 'Bank of America', color: '#E31837', addr: '100 N Tryon St, Charlotte' },
    citi: { name: 'Citibank', color: '#003B70', addr: '388 Greenwich St, NY' },
    ally: { name: 'ally', color: '#6B2D5B', addr: 'Horsham, PA' },
    blank: { name: 'Bank Name', color: '#000000', addr: 'Bank Address' }
};

// Setup Dashboard
function initDashboard() {
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = '';
    Object.keys(banks).forEach(key => {
        if (key === 'blank') return;
        const div = document.createElement('div');
        div.className = 'template-card';
        div.innerHTML = `
            <div>
                <div class="name">${banks[key].name}</div>
                <div class="type">Standard Check</div>
            </div>
            <div style="color: ${banks[key].color}; font-size: 24px;">→</div>
        `;
        div.onclick = () => openEditor(key);
        grid.appendChild(div);
    });
}

function startBlank() {
    openEditor('blank');
}

// Navigation
function openEditor(bankKey) {
    state.bank = bankKey;
    loadBankTemplate();
    
    document.getElementById('screen-dashboard').classList.remove('active');
    document.getElementById('screen-editor').classList.add('active');
    document.getElementById('editorTitle').innerText = banks[bankKey].name;
    
    setTimeout(resizeCanvas, 50); // Let animation finish
}

function goHome() {
    document.getElementById('screen-editor').classList.remove('active');
    document.getElementById('screen-dashboard').classList.add('active');
}

function openPreview() {
    renderCanvas();
    const canvas = document.getElementById('checkCanvas');
    document.getElementById('previewImg').src = canvas.toDataURL('image/png');
    document.getElementById('screen-preview').classList.add('active');
}

function closePreview() {
    document.getElementById('screen-preview').classList.remove('active');
}

// Drawer Logic
function openDrawer(type) {
    document.getElementById('drawerOverlay').classList.add('active');
    document.getElementById('bottomSheet').classList.add('open');
    
    if (type === 'settings') {
        document.getElementById('sheetFieldControls').style.display = 'none';
        document.getElementById('sheetSettingsControls').style.display = 'block';
    }
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('active');
    document.getElementById('bottomSheet').classList.remove('open');
    state.activeField = null;
    document.querySelectorAll('.overlay').forEach(e => e.classList.remove('selected'));
}

function openFieldDrawer(key) {
    state.activeField = key;
    document.getElementById('sheetFieldControls').style.display = 'block';
    document.getElementById('sheetSettingsControls').style.display = 'none';
    document.getElementById('drawerOverlay').classList.add('active');
    document.getElementById('bottomSheet').classList.add('open');
    
    const data = state.fields[key];
    document.getElementById('inputText').value = data.text;
    document.getElementById('inputSize').value = data.size;
    document.getElementById('inputColor').value = data.color;
    document.getElementById('inputFont').value = data.font;
}

// Template Engine
const defaults = {
    bankName: { x: 0.25, y: 0.35, text: '', font: 'Inter', size: 20, color: '#000', bold: true },
    bankAddr: { x: 0.25, y: 0.50, text: '', font: 'Inter', size: 9, color: '#444' },
    checkNo: { x: 5.5, y: 0.35, text: '1001', font: 'Inter', size: 10, color: '#000' },
    date: { x: 4.7, y: 0.35, text: 'MM/DD/YYYY', font: 'Inter', size: 11, color: '#000' },
    payee: { x: 1.5, y: 0.85, text: '', font: 'Inter', size: 12, color: '#000' },
    amountNum: { x: 4.8, y: 0.85, text: '$', font: 'Inter', size: 14, color: '#000' },
    amountWords: { x: 1.5, y: 1.15, text: 'Zero', font: 'Inter', size: 11, color: '#000' },
    memo: { x: 0.70, y: 1.85, text: '', font: 'Inter', size: 10, color: '#000' },
    sigLine: { x: 4.5, y: 1.85, text: 'AUTHORIZED', font: 'Inter', size: 8, color: '#000' },
    micr: { x: 0.25, y: 2.45, text: '⑆000000000⑆ ⑈0000000000⑈ ⑆1001', font: "'Courier New'", size: 14, color: '#000', bold: true }
};

function loadBankTemplate() {
    const b = banks[state.bank];
    state.fields = JSON.parse(JSON.stringify(defaults));
    state.fields.bankName.text = b.name;
    state.fields.bankName.color = b.color;
    state.fields.bankAddr.text = b.addr;
    state.isBack = false;
    
    buildOverlays();
    renderCanvas();
}

function buildOverlays() {
    const container = document.getElementById('paperContainer');
    document.querySelectorAll('.overlay').forEach(e => e.remove());

    Object.keys(state.fields).forEach(key => {
        const data = state.fields[key];
        const el = document.createElement('div');
        el.className = 'overlay';
        el.id = 'ov_' + key;
        el.style.left = (data.x * 300) + 'px';
        el.style.top = (data.y * 300) + 'px';

        const txt = document.createElement('span');
        txt.className = 'text';
        txt.innerText = data.text;
        txt.style.fontFamily = data.font;
        txt.style.fontSize = (data.size * 300 / 72) + 'px';
        txt.style.color = data.color;
        txt.style.fontWeight = data.bold ? 'bold' : 'normal';

        const dot = document.createElement('div');
        dot.className = 'resize-dot';

        el.appendChild(txt);
        el.appendChild(dot);
        container.appendChild(el);

        // Drag logic
        let startX, startY, origX, origY, dragging = false;

        el.addEventListener('touchstart', e => {
            if (e.target === dot) return;
            dragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            origX = data.x;
            origY = data.y;
            selectOverlay(key);
        }, {passive: false});

        window.addEventListener('touchmove', e => {
            if (!dragging) return;
            const scale = getCanvasScale();
            data.x = origX + ((e.touches[0].clientX - startX) / (300 * scale));
            data.y = origY + ((e.touches[0].clientY - startY) / (300 * scale));
            el.style.left = (data.x * 300) + 'px';
            el.style.top = (data.y * 300) + 'px';
            e.preventDefault();
        }, {passive: false});

        window.addEventListener('touchend', () => dragging = false);
    });
}

function selectOverlay(key) {
    document.querySelectorAll('.overlay').forEach(e => e.classList.remove('selected'));
    document.getElementById('ov_' + key).classList.add('selected');
    openFieldDrawer(key);
}

// Resize Canvas to fit screen
function resizeCanvas() {
    const workspace = document.getElementById('canvasWorkspace');
    const container = document.getElementById('paperContainer');
    const canvas = document.getElementById('checkCanvas');
    
    const wIn = 6, hIn = 2.75, dpi = 300;
    canvas.width = wIn * dpi;
    canvas.height = hIn * dpi;
    
    const scale = Math.min(
        (workspace.clientWidth - 32) / canvas.width,
        (workspace.clientHeight - 32) / canvas.height
    );
    
    container.style.width = canvas.width + 'px';
    container.style.height = canvas.height + 'px';
    container.style.transform = `scale(${scale})`;
    
    document.documentElement.style.setProperty('--page-size', `${wIn}in ${hIn}in`);
}

function getCanvasScale() {
    const transform = document.getElementById('paperContainer').style.transform;
    const match = transform.match(/scale\(([^)]+)\)/);
    return match ? parseFloat(match[1]) : 1;
}

// Render Canvas Base
function renderCanvas() {
    const canvas = document.getElementById('checkCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, scale = 300;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    if (state.bgImg) ctx.drawImage(state.bgImg, 0, 0, w, h);

    if (!state.isBack) {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(1.5*scale, 0.9*scale); ctx.lineTo(4.5*scale, 0.9*scale); ctx.stroke();
        ctx.strokeRect(4.7*scale, 0.65*scale, 0.9*scale, 0.3*scale);
        ctx.beginPath(); ctx.moveTo(1.5*scale, 1.2*scale); ctx.lineTo(4.5*scale, 1.2*scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0.7*scale, 1.9*scale); ctx.lineTo(2.5*scale, 1.9*scale); ctx.stroke();
        ctx.strokeStyle = '#000';
        ctx.beginPath(); ctx.moveTo(4.5*scale, 1.95*scale); ctx.lineTo((w/scale)-0.25*scale, 1.95*scale); ctx.stroke();

        if (state.logoImg) {
            ctx.drawImage(state.logoImg, 0.25*scale, 0.1*scale, 120, 60);
        }

        if (state.microprint) {
            ctx.font = '4px Inter'; ctx.fillStyle = '#888';
            ctx.fillText('MICROPRINT SECURITY '.repeat(30), 20, 20);
        }

        if (state.voidMark) {
            ctx.save(); ctx.translate(w/2, h/2); ctx.rotate(-0.5); ctx.font = 'bold 100px Inter'; ctx.fillStyle = 'rgba(255,0,0,0.2)'; ctx.textAlign = 'center'; ctx.fillText('VOID', 0, 0); ctx.restore();
        }
    } else {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 40px Inter';
        ctx.fillText('ENDORSE HERE', 0.25*300, 0.6*300);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0.25*300, 0.7*300); ctx.lineTo((w/300 - 0.25)*300, 0.7*300); ctx.stroke();
        ctx.font = '20px Inter';
        ctx.fillText('DO NOT WRITE, STAMP OR SIGN BELOW THIS LINE', 0.25*300, 1.2*300);
    }
}

// UI Events
function updateField(prop, val) {
    if (!state.activeField) return;
    const data = state.fields[state.activeField];
    const span = document.querySelector(`#ov_${state.activeField} .text`);
    
    if (prop === 'text') {
        data.text = val;
        span.innerText = val;
        if (state.activeField === 'amountNum') {
            // Auto words logic could go here
        }
    } else if (prop === 'size') {
        data.size = parseFloat(val);
        span.style.fontSize = (data.size * 300 / 72) + 'px';
    } else if (prop === 'color') {
        data.color = val;
        span.style.color = val;
    } else if (prop === 'font') {
        data.font = val;
        span.style.fontFamily = val;
    }
}

function uploadImg(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            if (type === 'bg') state.bgImg = img;
            if (type === 'logo') state.logoImg = img;
            renderCanvas();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function toggleSec(type) {
    if (type === 'microprint') state.microprint = document.getElementById('chkMicroprint').checked;
    if (type === 'void') state.voidMark = document.getElementById('chkVoid').checked;
    renderCanvas();
}

function flipCheck() {
    state.isBack = !state.isBack;
    document.querySelectorAll('.overlay').forEach(e => e.style.display = state.isBack ? 'none' : 'block');
    renderCanvas();
}

// Print logic
window.onbeforeprint = () => {
    document.getElementById('screen-editor').classList.add('active');
    document.getElementById('screen-dashboard').classList.remove('active');
    document.getElementById('screen-preview').classList.remove('active');
};

// Init
initDashboard();
</script>