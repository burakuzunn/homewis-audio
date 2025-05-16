const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 100;
const bars = [];

/* — barları oluştur, alt yeşil → üst kırmızı — */
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

/* — Web Audio — */
let ctx, analyser;

/* kalibrasyon */
let noiseRef = null; // ortam sessizken taban dB
let calFrames = 0;
const CAL_FRAME_LIMIT = 10; // 10 × 150 ms ≈ 1.5 s

/* EMA */
let smoothDb = 0;

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

    /* RMS */
    let sum = 0;
    for (let n = 0; n < N; n++) {
        const v = (data[n] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / N);

    /* dBFS (0 = tam skala, –∞ = sessizlik) +100 shift ile pozitif */
    const rawDb = 20 * Math.log10(rms) + 100;

    /* ilk 1.5 s taban değeri yakala */
    if (noiseRef === null || calFrames < CAL_FRAME_LIMIT) {
        noiseRef = noiseRef === null ? rawDb : Math.min(noiseRef, rawDb);
        calFrames++;
    }

    /* ortama göre ayarlanmış değer & EMA */
    const adjDb = Math.max(0, rawDb - noiseRef); // 0 dB = sessizlik
    smoothDb = 0.9 * smoothDb + 0.1 * adjDb; // α 0.1

    /* 0–100 map: 0 dB → 0, 30 dB → 100 (ayar) */
    const norm = Math.min(smoothDb / 30, 1);
    const dispDb = Math.round(norm * 100);

    /* --- UI --- */
    valEl.innerHTML = `${dispDb} <span>dB</span>`;
    updateStatus(dispDb);

    ptrEl.style.top = `${(1 - norm) * 100}%`;

    const active = Math.round(norm * barCount);
    bars.forEach((b, i) => b.style.opacity = i < active ? "1" : "0.25");
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new(window.AudioContext || window.webkitAudioContext)();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; // daha kararlı RMS

        ctx.createMediaStreamSource(stream).connect(analyser);

        /* 150 ms’de bir ölçüm */
        setInterval(render, 150);
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mic error:", err);
    }
}
window.addEventListener("load", init);