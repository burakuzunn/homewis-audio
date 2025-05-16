'use strict';

// Parametreler
const SAMPLE_WINDOW = 128;
const MIN_DB = 0;
const MAX_DB = 80;
const UI_INTERVAL = 150;
const SLIDER_LERP = 0.5;
const TOTAL_BARS = 40;

// DOM
const valEl = document.getElementById('value');
const statEl = document.getElementById('status');
const ptrEl = document.getElementById('pointer');
const barBox = document.getElementById('bar-container');

// Barları oluştur
for (let i = 0; i < TOTAL_BARS; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const r = i / TOTAL_BARS;
    if (r < 0.50) bar.classList.add('green');
    else if (r < 0.75) bar.classList.add('yellow');
    else if (r < 0.90) bar.classList.add('orange');
    else bar.classList.add('red');
    barBox.appendChild(bar);
}
const bars = [...document.querySelectorAll('#bar-container .bar')];

// Değişkenler
let ctx, analyser, smoothDb = 0;
let minDb = Infinity,
    maxDb = -Infinity,
    sumDb = 0,
    cnt = 0;

// Mikrofon başlat
async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(updateUI, UI_INTERVAL);
    } catch (e) {
        valEl.textContent = 'İzin reddedildi';
        console.error(e);
    }
}

// RMS & dB
function getRms() {
    const buf = new Float32Array(SAMPLE_WINDOW);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
}

function getDb() {
    return Math.min(Math.max(20 * Math.log10(getRms()) + MAX_DB, MIN_DB), MAX_DB);
}

// UI güncelle
function updateStatus(db) {
    if (db < 40) {
        statEl.textContent = 'Çok sessiz';
        statEl.style.color = 'var(--quiet)';
    } else if (db < 70) {
        statEl.textContent = 'Orta';
        statEl.style.color = 'var(--mid)';
    } else {
        statEl.textContent = 'Yüksek';
        statEl.style.color = 'var(--loud)';
    }
}

function updateUI() {
    const db = getDb();
    smoothDb = smoothDb * (1 - SLIDER_LERP) + db * SLIDER_LERP;

    const norm = smoothDb / MAX_DB;
    ptrEl.style.top = `${(1 - norm) * 100}%`;
    const active = Math.round(norm * bars.length);
    bars.forEach((b, i) => b.style.opacity = i < active ? '1' : '0.25');

    valEl.innerHTML = `${Math.round(smoothDb)} <span>dB</span>`;
    updateStatus(smoothDb);

    minDb = Math.min(minDb, db);
    maxDb = Math.max(maxDb, db);
    sumDb += db;
    cnt++;
}

// Başlat
window.addEventListener('load', init);