const routes = {
    'home': 'pages/home.html',
    'queue': 'pages/queue.html',
    'processing': 'pages/processing.html',
    'complete': 'pages/complete.html'
};

let selectedFiles = [];
let currentCompressedFiles = [];

// Global file input
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.multiple = true;
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
});

function handleFiles(files) {
    if (!files || files.length === 0) return;
    for (let f of files) {
        selectedFiles.push({
            originalFile: f,
            name: f.name,
            originalSize: f.size,
            type: f.type,
            originalUrl: URL.createObjectURL(f)
        });
    }
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.remove('active');
    navigate('queue');
}

async function navigate(route) {
    if (!routes[route]) route = 'home';
    history.pushState({ route }, '', `?p=${route}`);
    await loadRoute(route);
}

window.addEventListener('popstate', (e) => {
    const route = e.state?.route || new URLSearchParams(window.location.search).get('p') || 'home';
    loadRoute(route);
});

async function loadRoute(route) {
    try {
        const res = await fetch(routes[route]);
        if (!res.ok) throw new Error('Route not found');
        const html = await res.text();
        document.getElementById('app-root').innerHTML = html;
        initPage(route);
        window.scrollTo(0, 0);
    } catch(err) {
        console.error('Routing Error:', err);
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function bindDropZone(zoneEl, isPersistent = false) {
    if (!zoneEl) return;
    // For persistent elements like the global modal, avoid re-attaching event listeners
    if (isPersistent && zoneEl.dataset.bound) return;
    if (isPersistent) zoneEl.dataset.bound = 'true';

    zoneEl.addEventListener('click', (e) => {
        // Prevent double trigger issues by stopping propagation to nested buttons and making the whole zone clickable
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zoneEl.addEventListener(eventName, preventDefaults, false);
    });

    zoneEl.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Global modal and action handlers
document.addEventListener('click', (e) => {
    if (e.target.closest('button') && e.target.closest('button').innerText.includes('Get Started Free')) {
        document.getElementById('upload-modal')?.classList.add('active');
    }
    if (e.target.closest('#close-modal') || e.target.closest('#cancel-modal')) {
        document.getElementById('upload-modal')?.classList.remove('active');
    }
    if (e.target.closest('#next-to-queue')) {
        if (selectedFiles.length > 0) navigate('queue');
    }
});

function initSlider(containerId, handleId, overlayId) {
    const container = document.getElementById(containerId);
    const handle = document.getElementById(handleId);
    const overlay = document.getElementById(overlayId);
    
    if (!container || !handle || !overlay) return;
    
    let isSliding = false;
    
    // Original pixelation style is assumed to be embedded in HTML (e.g. style="filter: blur(4px)...")
    
    const slide = (x) => {
        const rect = container.getBoundingClientRect();
        let pos = Math.max(0, Math.min(x - rect.left, rect.width));
        const percent = (pos / rect.width) * 100;
        
        handle.style.left = `${percent}%`;
        overlay.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    };
    
    container.addEventListener('mousedown', (e) => {
        isSliding = true;
        slide(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
        if (isSliding) slide(e.clientX);
    });
    window.addEventListener('mouseup', () => {
        isSliding = false;
    });
    container.addEventListener('touchstart', (e) => {
        isSliding = true;
        slide(e.touches[0].clientX);
    }, {passive:true});
    window.addEventListener('touchmove', (e) => {
        if (isSliding) slide(e.touches[0].clientX);
    }, {passive:true});
    window.addEventListener('touchend', () => {
        isSliding = false;
    });
}

function initPage(route) {
    if (route === 'home') {
        bindDropZone(document.getElementById('drop-zone'), false);
        initSlider('comparison-slider', 'slider-handle', 'slider-overlay');
        
        const homeSelectBtn = document.querySelector('#screen-home button:has(img) , #screen-home button:has(svg), #screen-home button:has(span[data-icon="file_open"]');
        if (homeSelectBtn) {
            homeSelectBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                fileInput.click();
            });
        }
    } else if (route === 'queue') {
        renderQueue();
        initQueueSlider();
        document.getElementById('add-more-btn')?.addEventListener('click', () => fileInput.click());
        document.getElementById('start-compression-btn')?.addEventListener('click', () => {
            if (selectedFiles.length > 0) navigate('processing');
        });
    } else if (route === 'processing') {
        startProcessing();
    } else if (route === 'complete') {
        initComplete();
    }
}

function initQueueSlider() {
    const slider = document.getElementById('sizeSlider');
    const manualInput = document.getElementById('manualSizeInput');
    const toggleKB = document.getElementById('unitToggleBtn_KB');
    const toggleMB = document.getElementById('unitToggleBtn_MB');
    const label = document.getElementById('targetSizeLabel');

    if (!slider || !manualInput || !toggleKB || !toggleMB || !label) return;

    // --- Slider UI Logic ---
    function getValueFromIndex(index) {
        if (index <= 9) return { val: (index + 1) * 10, unit: 'KB' };
        if (index <= 18) return { val: (index - 8) * 100, unit: 'KB' };
        return { val: (index - 18), unit: 'MB' };
    }

    function updateSliderUI(index) {
        const { val, unit } = getValueFromIndex(index);
        label.textContent = `${val}${unit}`;
        window.targetCompressionSize = `${val}${unit}`;
    }

    slider.addEventListener('input', (e) => {
        updateSliderUI(parseInt(e.target.value, 10));
    });

    // Initialize Slider
    updateSliderUI(parseInt(slider.value, 10));

    // --- Manual Entry Logic ---
    let currentManualUnit = 'MB'; // manual input tracks its own unit

    function updateManualUnitUI(unit) {
        currentManualUnit = unit;
        if (unit === 'KB') {
            toggleKB.classList.add('text-primary-container', 'bg-primary-container/10');
            toggleKB.classList.remove('text-on-surface-variant');
            toggleMB.classList.remove('text-primary-container', 'bg-primary-container/10');
            toggleMB.classList.add('text-on-surface-variant');
        } else {
            toggleMB.classList.add('text-primary-container', 'bg-primary-container/10');
            toggleMB.classList.remove('text-on-surface-variant');
            toggleKB.classList.remove('text-primary-container', 'bg-primary-container/10');
            toggleKB.classList.add('text-on-surface-variant');
        }
        window.targetCompressionSize = `${manualInput.value}${currentManualUnit}`;
    }

    toggleKB.addEventListener('click', () => updateManualUnitUI('KB'));
    toggleMB.addEventListener('click', () => updateManualUnitUI('MB'));
    manualInput.addEventListener('input', () => {
        window.targetCompressionSize = `${manualInput.value}${currentManualUnit}`;
    });

    // Initialize manual unit
    updateManualUnitUI('MB');
}

function renderQueue() {
    const listContainer = document.getElementById('queue-list-container');
    const totalFilesEl = document.getElementById('queue-total-files');
    const totalSizeEl = document.getElementById('queue-total-size');
    
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    let totalSize = 0;
    
    selectedFiles.forEach((file, idx) => {
        totalSize += file.originalSize;
        const item = document.createElement('div');
        item.className = 'grid grid-cols-12 px-6 py-5 items-center hover:bg-white/5 transition-colors group';
        item.innerHTML = `
            <div class="col-span-6 md:col-span-7 flex items-center gap-4">
                <div class="w-12 h-12 rounded bg-surface-container-high overflow-hidden flex-shrink-0 ghost-border">
                    <img class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" src="${file.originalUrl}" />
                </div>
                <div class="overflow-hidden">
                    <p class="font-body font-medium text-on-surface truncate">${file.name}</p>
                    <p class="font-label text-[10px] text-on-surface-variant uppercase">${file.type || 'image/unknown'}</p>
                </div>
            </div>
            <div class="col-span-4 md:col-span-3 text-right font-body text-sm text-on-surface-variant">
                ${formatBytes(file.originalSize)}
            </div>
            <div class="col-span-2 md:col-span-2 text-right">
                <button class="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error/10" data-idx="${idx}">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    totalFilesEl.textContent = `${String(selectedFiles.length).padStart(2,'0')} Assets`;
    totalSizeEl.textContent = formatBytes(totalSize);
    
    listContainer.querySelectorAll('button[data-idx]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            selectedFiles.splice(idx, 1);
            if (selectedFiles.length === 0) {
                navigate('home');
            } else {
                renderQueue();
            }
        });
    });
}

async function compressImage(fileItem) {
    try {
        const formData = new FormData();
        formData.append('image', fileItem.originalFile);
        
        // Grab the size from our global state set in the queue UI
        const sizeToUse = window.targetCompressionSize || '500KB';
        formData.append('size', sizeToUse);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return {
            ...fileItem,
            compressedBlob: null,
            compressedSize: data.compressed_size || 0,
            compressedUrl: data.download_url,
        };
    } catch (err) {
        console.error('Failed to process image:', err);
        return fileItem; // Fallback to original
    }
}

async function startProcessing() {
    currentCompressedFiles = [];
    const bar = document.getElementById('processing-bar');
    const percentTxt = document.getElementById('processing-percentage');
    const indexTxt = document.getElementById('processing-index');
    const nameTxt = document.getElementById('processing-filename');
    const outTxt = document.getElementById('processing-output-size');
    
    if (!bar) return;
    
    let totalFiles = selectedFiles.length;
    let completed = 0;
    
    for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        indexTxt.innerHTML = `${String(i+1).padStart(2,'0')}<span class="text-primary/40 text-2xl font-normal">/${String(totalFiles).padStart(2,'0')}</span>`;
        nameTxt.textContent = file.name;
        
        let fileProgress = 0;
        const progressInterval = setInterval(() => {
            fileProgress += 10;
            if (fileProgress > 100) fileProgress = 100;
            const overallPercent = ((completed + (fileProgress/100)) / totalFiles) * 100;
            bar.style.width = `${overallPercent}%`;
            percentTxt.innerHTML = `${Math.floor(overallPercent)}<span class="text-lg opacity-60">%</span>`;
        }, 50);

        const result = await compressImage(file);
        
        clearInterval(progressInterval);
        currentCompressedFiles.push(result);
        if (outTxt && result.compressedSize) outTxt.textContent = formatBytes(result.compressedSize);
        
        completed++;
        const overallPercent = (completed / totalFiles) * 100;
        bar.style.width = `${overallPercent}%`;
        percentTxt.innerHTML = `${Math.floor(overallPercent)}<span class="text-lg opacity-60">%</span>`;
        
        await new Promise(r => setTimeout(r, 150));
    }
    
    setTimeout(() => {
        navigate('complete');
    }, 600);
}

function initComplete() {
    initSlider('complete-comparison-container', 'complete-slider-handle', 'complete-slider-overlay');
    
    if (currentCompressedFiles.length === 0) return;
    
    const previewFile = currentCompressedFiles[0];
    
    document.getElementById('complete-img-original').src = previewFile.originalUrl;
    document.getElementById('complete-img-compressed').src = previewFile.compressedUrl;
    
    let totalOrig = 0;
    let totalComp = 0;
    currentCompressedFiles.forEach(f => {
        totalOrig += f.originalSize || 0;
        totalComp += f.compressedSize || 0;
    });
    
    document.getElementById('complete-orig-size').textContent = formatBytes(totalOrig);
    document.getElementById('complete-orig-size-2').textContent = formatBytes(totalOrig);
    document.getElementById('complete-comp-size').textContent = formatBytes(totalComp);
    document.getElementById('complete-comp-size-2').textContent = formatBytes(totalComp);
    
    let avgGain = Math.floor((1 - (totalComp / Math.max(totalOrig, 1))) * 100);
    document.getElementById('complete-gain-ratio').textContent = (avgGain > 0 ? avgGain : 0);
    
    // Format Controls
    let currentFormat = 'image/jpeg';
    let currentExt = 'jpg';
    
    const formatBtns = document.querySelectorAll('.format-btn');
    formatBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            formatBtns.forEach(b => {
                b.classList.remove('active', 'bg-primary/10', 'border-primary/20');
                b.classList.add('bg-surface-container-highest');
                b.querySelector('span').classList.remove('text-primary');
                b.querySelector('span').classList.add('text-white');
            });
            const t = e.currentTarget;
            t.classList.add('active', 'bg-primary/10', 'border-primary/20');
            t.classList.remove('bg-surface-container-highest');
            t.querySelector('span').classList.add('text-primary');
            t.querySelector('span').classList.remove('text-white');
            
            currentFormat = t.getAttribute('data-format');
            currentExt = t.getAttribute('data-ext');
        });
    });
    
    // Download Action
    document.getElementById('download-asset-btn')?.addEventListener('click', async () => {
        for (let file of currentCompressedFiles) {
            const a = document.createElement('a');
            a.href = file.compressedUrl || file.originalUrl;
            // The S3 pre-signed URL includes ResponseContentDisposition attachment with the correct filename
            a.download = `compressed_${file.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // small delay to prevent browser from ignoring multiple rapid downloads
            await new Promise(r => setTimeout(r, 500));
        }
    });
    
    document.getElementById('upload-new-asset-btn')?.addEventListener('click', () => {
        selectedFiles = [];
        currentCompressedFiles = [];
        navigate('home');
    });
}

function convertImageFormat(imgUrl, format) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const cvs = document.createElement('canvas');
            cvs.width = img.width;
            cvs.height = img.height;
            cvs.getContext('2d').drawImage(img, 0, 0);
            cvs.toBlob(blob => resolve(blob), format, 0.75);
        };
        img.src = imgUrl;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Persistent Modal Drop zone
    bindDropZone(document.getElementById('modal-drop-zone'), true);

    // Initial Path Route Loading
    const initialRoute = new URLSearchParams(window.location.search).get('p') || 'home';
    loadRoute(initialRoute);
});
