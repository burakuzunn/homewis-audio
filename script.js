const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* bar renkleri (0-100 dB) */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    if (i < 30) bar.classList.add("green");
    else if (i < 60) bar.classList.add("yellow");
    else if (i < 80) bar.classList.add("orange");
    else bar.classList.add("red");
    container.appendChild(bar);
    bars.push(bar);
}

let ctx, analyser;
let noiseFloor = null,
    calibFrames = 0;
let smoothRms = 0; // EMA

function hann(n, N) { return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))); }

function updateStatus(dB) {
    if (dB < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (dB < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    const N = analyser.fftSize;
    const data = new Uint8Array(N);
    analyser.getByteTimeDomainData(data);

    /* RMS + Hann penceresi */
    let sum = 0;
    for (let n = 0; n < N; n++) {
        const x = ((data[n] - 128) / 128) * hann(n, N);
        sum += x * x;
    }
    const rms = Math.sqrt(sum / N);

    /* ortam tabanı kalibrasyonu (10 kare ≈ 2 sn) */
    if (noiseFloor === null) { noiseFloor = rms;
        calibFrames = 0; }
    if (calibFrames < 10) { noiseFloor = Math.min(noiseFloor, rms);
        calibFrames++; }

    /* EMA ile yumuşatma (alpha=0.85) */
    smoothRms = smoothRms * 0.85 + rms * 0.15;

    const adj = Math.max(0, smoothRms - noiseFloor);
    const norm = Math.min(adj / 0.08, 1); // 0-1 arası
    const dB = Math.round(norm * 100);

    /* UI güncelle */
    valEl.innerHTML = `${dB} <span>dB</span>`;
    updateStatus(dB);
    ptrEl.style.top = `${(1-norm)*100}%`;

    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => { b.style.opacity = i < active ? "1" : "0.25"; });
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; // daha geniş pencere
        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(render, 200); // 5 FPS – kararlı
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", e);
    }
}
window.addEventListener("load", init);