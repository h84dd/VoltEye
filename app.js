const el = {
  currentValue: document.getElementById("currentValue"),
  voltageValue: document.getElementById("voltageValue"),
  powerValue: document.getElementById("powerValue"),
  pfValue: document.getElementById("pfValue"),
  thdValue: document.getElementById("thdValue"),
  leakageValue: document.getElementById("leakageValue"),
  riskValue: document.getElementById("riskValue"),
  suspectHeroValue: document.getElementById("suspectHeroValue"),
  faultTypeValue: document.getElementById("faultTypeValue"),
  suspectValue: document.getElementById("suspectValue"),
  recommendationValue: document.getElementById("recommendationValue"),
  flagsList: document.getElementById("flagsList"),
  rankingList: document.getElementById("rankingList"),
  logList: document.getElementById("logList"),
  statusBadge: document.getElementById("statusBadge"),
  currentChart: document.getElementById("currentChart"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  stepBtn: document.getElementById("stepBtn"),
  scenarioBtn: document.getElementById("scenarioBtn")
};

const DEVICES = [
  { name: "Air Conditioner", room: "Living Room / Bedrooms", load: [6.5, 10.5], pf: [0.82, 0.9], thd: [3.8, 6.4], leakage: [2.2, 5.0], overload: 1.0, leakageWeight: 0.7, arc: 0.7 },
  { name: "Refrigerator", room: "Kitchen", load: [1.1, 2.0], pf: [0.85, 0.91], thd: [2.8, 4.8], leakage: [0.8, 2.1], overload: 0.45, leakageWeight: 0.4, arc: 0.4 },
  { name: "Washing Machine", room: "Laundry", load: [3.0, 5.4], pf: [0.86, 0.93], thd: [4.2, 6.8], leakage: [1.2, 3.7], overload: 0.65, leakageWeight: 1.0, arc: 0.55 },
  { name: "Lighting Circuit", room: "Distributed", load: [0.7, 2.2], pf: [0.95, 0.99], thd: [1.2, 3.2], leakage: [0.2, 0.7], overload: 0.25, leakageWeight: 0.25, arc: 0.85 },
  { name: "Consumer Electronics", room: "Living Room", load: [0.4, 1.2], pf: [0.74, 0.88], thd: [5.2, 9.4], leakage: [0.2, 0.8], overload: 0.15, leakageWeight: 0.2, arc: 0.8 },
  { name: "Water Heater", room: "Bathroom / Kitchen", load: [7.8, 10.8], pf: [0.97, 0.99], thd: [1.0, 2.5], leakage: [1.1, 2.8], overload: 0.9, leakageWeight: 0.45, arc: 0.2 }
];

let timer = null;
let chartHistory = [];
let forcedFault = null;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function chooseActiveDevices() {
  const active = DEVICES.filter(() => Math.random() > 0.32);
  return active.length ? active : [DEVICES[0], DEVICES[1]];
}

function generateExpected(activeDevices) {
  let current = 0;
  let power = 0;
  let leakage = 0;
  let pfWeighted = 0;
  let thdWeighted = 0;

  activeDevices.forEach((device) => {
    const i = rand(device.load[0], device.load[1]);
    const pf = rand(device.pf[0], device.pf[1]);
    const thd = rand(device.thd[0], device.thd[1]);
    const leak = rand(device.leakage[0], device.leakage[1]);
    const p = 230 * i * pf;

    current += i;
    power += p;
    leakage += leak;
    pfWeighted += pf * p;
    thdWeighted += thd * i;
  });

  return {
    current: round(current, 2),
    voltage: round(230 - Math.max(0, current - 10) * 0.32 + rand(-0.8, 0.8), 1),
    power: round(power, 0),
    pf: round(pfWeighted / Math.max(power, 1), 2),
    thd: round(thdWeighted / Math.max(current, 0.1), 1),
    leakage: round(leakage, 1)
  };
}

function pickFault() {
  if (forcedFault) {
    const selected = forcedFault;
    forcedFault = null;
    return selected;
  }

  const roll = Math.random();
  if (roll < 0.58) return "normal";
  if (roll < 0.76) return "overload";
  if (roll < 0.9) return "leakage";
  return "arc";
}

function applyFault(expected, activeDevices, fault) {
  const target = activeDevices[Math.floor(Math.random() * activeDevices.length)];
  const measured = { ...expected };

  if (fault === "overload") {
    measured.current = round(measured.current + rand(1.2, 4.5), 2);
    measured.power = round(measured.power + rand(300, 1350), 0);
    measured.pf = round(Math.max(0.66, measured.pf - rand(0.02, 0.07)), 2);
    measured.voltage = round(measured.voltage - rand(2.0, 6.8), 1);
  }

  if (fault === "leakage") {
    measured.leakage = round(measured.leakage + rand(3.5, 9.5), 1);
    measured.current = round(measured.current + rand(0.2, 0.9), 2);
    measured.pf = round(Math.max(0.7, measured.pf - rand(0.01, 0.04)), 2);
  }

  if (fault === "arc") {
    measured.thd = round(measured.thd + rand(4.5, 11.5), 1);
    measured.current = round(measured.current + rand(0.25, 1.2), 2);
    measured.pf = round(Math.max(0.55, measured.pf - rand(0.05, 0.14)), 2);
    measured.voltage = round(measured.voltage - rand(1.0, 4.2), 1);
  }

  return { measured, target };
}

function infer(expected, measured, activeDevices) {
  const deltaI = measured.current - expected.current;
  const deltaLeak = measured.leakage - expected.leakage;
  const deltaTHD = measured.thd - expected.thd;
  const deltaPF = expected.pf - measured.pf;
  const deltaV = expected.voltage - measured.voltage;

  const overloadScore = Math.max(0, deltaI * 18 + deltaV * 2.2);
  const leakageScore = Math.max(0, deltaLeak * 8.5 + deltaI * 4.5);
  const arcScore = Math.max(0, deltaTHD * 6.8 + deltaPF * 120 + deltaV * 1.2);
  const risk = Math.min(100, round(Math.max(overloadScore, leakageScore, arcScore), 0));

  let faultType = "Normal Operation";
  if (arcScore >= overloadScore && arcScore >= leakageScore && arcScore > 18) {
    faultType = "Arc Fault";
  } else if (leakageScore >= overloadScore && leakageScore > 18) {
    faultType = "Leakage Fault";
  } else if (overloadScore > 18) {
    faultType = "Overload Condition";
  }

  const ranking = activeDevices.map((device) => {
    let score = 18;

    if (faultType === "Overload Condition") score += deltaI * 9 * device.overload;
    if (faultType === "Leakage Fault") score += deltaLeak * 7.5 * device.leakageWeight;
    if (faultType === "Arc Fault") score += deltaTHD * 4.4 * device.arc + deltaPF * 55;

    return {
      name: device.name,
      room: device.room,
      score: round(Math.max(0, Math.min(100, score)), 1)
    };
  }).sort((a, b) => b.score - a.score);

  const suspect = faultType === "Normal Operation" ? "None" : ranking[0]?.name || "None";

  const flags = [];
  if (deltaI > 1) flags.push("Elevated current detected");
  if (deltaLeak > 2) flags.push("Leakage increase detected");
  if (deltaTHD > 3) flags.push("Harmonic distortion anomaly");
  if (deltaPF > 0.04) flags.push("Power factor degradation");
  if (deltaV > 2) flags.push("Voltage drop observed");
  if (!flags.length) flags.push("All indicators within normal limits");

  let recommendation = "Continue monitoring. No strong anomaly is currently detected.";
  if (faultType === "Overload Condition") recommendation = "Inspect high-power loads and reduce simultaneous heavy appliance operation.";
  if (faultType === "Leakage Fault") recommendation = "Check insulation, grounding, and moisture-prone circuits or appliances.";
  if (faultType === "Arc Fault") recommendation = "Inspect wiring, terminals, and unstable electrical connections immediately.";

  let statusText = "Ready";
  let statusClass = "status-ok";
  if (risk >= 65) {
    statusText = "High Risk";
    statusClass = "status-danger";
  } else if (risk >= 25) {
    statusText = "Warning";
    statusClass = "status-warn";
  } else {
    statusText = "Normal";
    statusClass = "status-ok";
  }

  return { faultType, suspect, ranking, flags, recommendation, risk, statusText, statusClass };
}

function getDataPoint() {
  const active = chooseActiveDevices();
  const expected = generateExpected(active);
  const fault = pickFault();
  const { measured } = applyFault(expected, active, fault);
  const analysis = infer(expected, measured, active);

  return {
    measured,
    analysis,
    injectedFault: fault,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}

function setMetricClass(element, type) {
  element.className = "metric-value";
  element.classList.add(type);
}

function renderFlags(flags) {
  el.flagsList.innerHTML = flags.map((flag) => `<span class="chip">● ${flag}</span>`).join("");
}

function renderRanking(ranking) {
  el.rankingList.innerHTML = ranking.slice(0, 5).map((item, index) => `
    <div class="list-item">
      <div class="list-head">
        <div class="list-title">${index + 1}. ${item.name}</div>
        <div class="score ${item.score >= 70 ? "danger" : item.score >= 40 ? "warn" : "ok"}">${item.score}%</div>
      </div>
      <div class="list-body">Location: ${item.room}</div>
    </div>
  `).join("");
}

function renderLog(point) {
  const item = document.createElement("div");
  item.className = "list-item";
  item.innerHTML = `
    <div class="list-head">
      <div class="list-title">${point.timestamp}</div>
      <div class="score ${point.analysis.statusClass === "status-danger" ? "danger" : point.analysis.statusClass === "status-warn" ? "warn" : "ok"}">${point.analysis.faultType}</div>
    </div>
    <div class="list-body">Suspect: ${point.analysis.suspect} · Injected mode: ${point.injectedFault}</div>
  `;
  el.logList.prepend(item);
  while (el.logList.children.length > 8) {
    el.logList.removeChild(el.logList.lastChild);
  }
}

function drawChart() {
  const canvas = el.currentChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = 320;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#09111f";
  ctx.fillRect(0, 0, width, height);

  const pad = 28;
  const max = Math.max(12, ...chartHistory) * 1.15;

  ctx.strokeStyle = "rgba(159,176,207,0.12)";
  for (let i = 0; i < 5; i++) {
    const y = pad + ((height - pad * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  if (!chartHistory.length) return;

  ctx.beginPath();
  chartHistory.forEach((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(chartHistory.length - 1, 1);
    const y = height - pad - (value / max) * (height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  chartHistory.forEach((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(chartHistory.length - 1, 1);
    const y = height - pad - (value / max) * (height - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = value > 10 ? "#ef4444" : "#38bdf8";
    ctx.fill();
  });
}

function updateDashboard(point) {
  const m = point.measured;
  const a = point.analysis;

  el.currentValue.textContent = `${m.current.toFixed(2)} A`;
  el.voltageValue.textContent = `${m.voltage.toFixed(1)} V`;
  el.powerValue.textContent = `${Math.round(m.power)} W`;
  el.pfValue.textContent = m.pf.toFixed(2);
  el.thdValue.textContent = `${m.thd.toFixed(1)}%`;
  el.leakageValue.textContent = `${m.leakage.toFixed(1)} mA`;
  el.riskValue.textContent = `${a.risk}%`;
  el.suspectHeroValue.textContent = a.suspect;

  setMetricClass(el.currentValue, m.current >= 12 ? "danger" : m.current >= 8 ? "warn" : "info");
  setMetricClass(el.voltageValue, m.voltage < 220 ? "warn" : "info");
  setMetricClass(el.powerValue, "violet");
  setMetricClass(el.pfValue, m.pf < 0.75 ? "danger" : m.pf < 0.85 ? "warn" : "ok");
  setMetricClass(el.thdValue, m.thd >= 10 ? "danger" : m.thd >= 6 ? "warn" : "warn");
  setMetricClass(el.leakageValue, m.leakage >= 12 ? "danger" : m.leakage >= 7 ? "warn" : "ok");
  setMetricClass(el.riskValue, a.risk >= 65 ? "danger" : a.risk >= 25 ? "warn" : "ok");
  setMetricClass(el.suspectHeroValue, a.suspect === "None" ? "ok" : "danger");

  el.faultTypeValue.textContent = a.faultType;
  el.suspectValue.textContent = a.suspect;
  el.recommendationValue.textContent = a.recommendation;
  el.statusBadge.textContent = a.statusText;
  el.statusBadge.className = `status-badge ${a.statusClass}`;

  renderFlags(a.flags);
  renderRanking(a.ranking);
  renderLog(point);

  chartHistory.push(m.current);
  if (chartHistory.length > 30) {
    chartHistory.shift();
  }
  drawChart();
}

function step() {
  updateDashboard(getDataPoint());
}

function startLive() {
  if (timer) return;
  step();
  timer = setInterval(step, 1400);
}

function stopLive() {
  clearInterval(timer);
  timer = null;
}

el.startBtn.addEventListener("click", startLive);
el.stopBtn.addEventListener("click", stopLive);
el.stepBtn.addEventListener("click", step);
el.scenarioBtn.addEventListener("click", () => {
  const options = ["overload", "leakage", "arc"];
  forcedFault = options[Math.floor(Math.random() * options.length)];
  step();
});
window.addEventListener("resize", drawChart);

updateDashboard({
  measured: { current: 0, voltage: 0, power: 0, pf: 1, thd: 0, leakage: 0 },
  analysis: {
    faultType: "Normal Operation",
    suspect: "None",
    ranking: [
      { name: "Air Conditioner", room: "Living Room / Bedrooms", score: 0 },
      { name: "Washing Machine", room: "Laundry", score: 0 },
      { name: "Lighting Circuit", room: "Distributed", score: 0 }
    ],
    flags: ["System initialized", "Waiting for live samples"],
    recommendation: "Press Start Live to begin the monitoring sequence.",
    risk: 0,
    statusText: "Ready",
    statusClass: "status-ok"
  },
  injectedFault: "normal",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
});