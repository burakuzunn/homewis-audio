const valEl = document.getElementById("value");
const statEl = document.getElementById("status");
const ptrEl = document.getElementById("pointer");
const container = document.getElementById("bar-container");

const barCount = 50;
const bars = [];

/* 50 bar – 0 dB’de alttaki yeşil barlardan başlayacak şekilde */
for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.classList.add("bar");

    /* TERS GRADIENT: en alttaki 15 bar green → sarı → turuncu → en üstte kırmızı */
    if (i < 15) bar.classList.add("green");
    else if (i < 30) bar.classList.add("yellow");
    else if (i < 40) bar.classList.add("orange");
    else bar.classList.add("red");

    /* hafif merkez-zayıf opaklık efekti */
    const center = barCount / 2,
        dist = Math.abs(i + 0.5 - center);
    bar.style.opacity = (0.5 + (dist / center) * 0.5).toFixed(2);

    container.appendChild(bar);
    bars.push(bar);
}

let ctx, analyser;
let noiseFloor = null;
let calibratingFrames = 0;

function updateStatus(dB) {
    if (dB < 40) { statEl.textContent = "Çok sessiz";
        statEl.style.color = "var(--quiet)"; } else if (dB < 70) { statEl.textContent = "Orta";
        statEl.style.color = "var(--mid)"; } else { statEl.textContent = "Yüksek";
        statEl.style.color = "var(--loud)"; }
}

function render() {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (const v of data) { const x = (v - 128) / 128;
        sum += x * x; }
    const rms = Math.sqrt(sum / data.length);

    /* — kalibrasyon — */
    if (noiseFloor === null) { noiseFloor = rms;
        calibratingFrames = 0; }
    if (calibratingFrames < 10) {
        noiseFloor = Math.min(noiseFloor, rms);
        calibratingFrames++;
    }

    const adj = Math.max(0, rms - noiseFloor);
    const norm = Math.min(adj / 0.05, 1); // 0-1 arası

    const dB = Math.round(norm * 100);

    valEl.innerHTML = `${dB} <span>dB</span>`;
    updateStatus(dB);

    ptrEl.style.top = `${(1 - norm) * 100}%`;

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
        setInterval(render, 100);
    } catch (err) {
        valEl.textContent = "İzin reddedildi";
        statEl.textContent = "";
        console.error("Mikrofon hatası:", err);
    }
}

window.addEventListener("load", init);