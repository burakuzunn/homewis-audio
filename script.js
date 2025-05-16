const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100; // 100  adet bar
const bars = [];

/* ------- barları oluştur (0-dB yeşil, 100-dB kırmızı) ------- */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.classList.add("bar");

    /* alt-orta-üst renk dilimi: 0-29 green, 30-59 yellow, 60-79 orange, 80-99 red */
    if (i < 30) bar.classList.add("green");
    else if (i < 60) bar.classList.add("yellow");
    else if (i < 80) bar.classList.add("orange");
    else bar.classList.add("red");

    /* hafif opaklık efekti */
    const center = barCount / 2,
        dist = Math.abs(i + .5 - center);
    bar.style.opacity = (0.5 + (dist / center) * 0.5).toFixed(2);

    container.appendChild(bar);
    bars.push(bar);
}

let ctx, analyser;
let noiseFloor = null,
    calibFrames = 0;

function updateStatus(dB) {
    if (dB < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (dB < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    /* RMS */
    let sum = 0;
    for (const v of data) { const x = (v - 128) / 128;
        sum += x * x; }
    const rms = Math.sqrt(sum / data.length);

    /* kalibrasyon – ilk 1 sn en düşük RMS’i taban al */
    if (noiseFloor === null) { noiseFloor = rms;
        calibFrames = 0; }
    if (calibFrames < 10) { noiseFloor = Math.min(noiseFloor, rms);
        calibFrames++; }

    const adj = Math.max(0, rms - noiseFloor);
    const norm = Math.min(adj / 0.05, 1); // 0-1; 0.05 ≈ ~100 dB civarı gürültüde doyum

    const dB = Math.round(norm * 100); // 0-100 arası skala

    valEl.innerHTML = `${dB} <span>dB</span>`;
    updateStatus(dB);

    /* pointer & bar dolumu */
    ptrEl.style.top = `${(1-norm)*100}%`;
    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => { b.style.opacity = i < active ? "1" : "0.2"; });
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        setInterval(render, 100); // 10 FPS
    } catch (e) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mikrofon hatası:", e);
    }
}
window.addEventListener("load", init);