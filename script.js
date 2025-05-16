'use strict';

// Parametreler
const SAMPLE_WINDOW = 128;
const MIN_DB = 0;
const MAX_DB = 80;
const UI_INTERVAL_MS = 150;
const TOTAL_BARS = 40;

// DOM
const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const barBox = document.getElementById("bar-container");

// Gradient barları oluştur
for (let i = 0; i < TOTAL_BARS; i++) {
    const bar = document.createElement("div");
    bar.classList.add("bar");

    const r = i / TOTAL_BARS;
    if (r < 0.5) bar.classList.add("green");
    else if (r < 0.75) bar.classList.add("yellow");
    else if (r < 0.9) bar.classList.add("orange");
    else bar.classList.add("red");

    barBox.appendChild(bar);
}
const bars = [...document.querySelectorAll("#bar-container .bar")];

// (İsteğe bağlı: min/avg/max göstergeleri)
const minEl = document.getElementById("mindbText");
const avgEl = document.getElementById("avrdbText");
const maxEl = document.getElementById("maxdbText");

// Audio analiz
let ctx, analyser;

// İstatistik
let minDb = Infinity;
let maxDb = -Infinity;
let sumDb = 0;
let sampleCnt = 0;

// Mikrofon başlat
async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;

        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(updateUI, UI_INTERVAL_MS);
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        console.error("Mic error:", e);
    }
}

// RMS ve dB hesaplama
function getRms() {
    const buf = new Float32Array(SAMPLE_WINDOW);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
}

function getDb() {
    const rms = getRms();
    const db = 20 * Math.log10(rms);
    const shifted = db + MAX_DB;
    return Math.min(Math.max(shifted, MIN_DB), MAX_DB);
}

// UI güncelle
function updateStatus(db) {
    if (db < 40) {
        statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)";
    } else if (db < 70) {
        statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)";
    } else {
        statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)";
    }
}

function updateUI() {
    const db = getDb();
    const norm = db / MAX_DB;
    const active = Math.round(norm * bars.length);

    bars.forEach((b, i) => {
        b.style.opacity = i < active ? "1" : "0.25";
    });

    valEl.innerHTML = `${Math.round(db)} <span>dB</span>`;
    updateStatus(db);

    minDb = Math.min(minDb, db);
    maxDb = Math.max(maxDb, db);
    sumDb += db;
    sampleCnt++;

    if (minEl) minEl.textContent = `${Math.round(minDb)}`;
    if (avgEl) avgEl.textContent = `${Math.round(sumDb / sampleCnt)}`;
    if (maxEl) maxEl.textContent = `${Math.round(maxDb)}`;
}

// Başlat
window.addEventListener("load", init);