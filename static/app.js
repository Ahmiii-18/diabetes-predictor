// Build sliders from /api/info, call /api/predict on every change.
const $ = (id) => document.getElementById(id);
let info, values = {}, last = null, timer = null;
const HKEY = "diabetes_history";
const nice = (n) => n.replace(/([a-z])([A-Z])/g, "$1 $2");

async function init() {
  try {
    info = await (await fetch("/api/info")).json();
    $("status").textContent = "API connected";
    $("status").className = "badge on";
  } catch (e) {
    $("status").textContent = "API offline";
    $("status").className = "badge off";
    return;
  }
  $("modelname").textContent = info.model;

  info.features.forEach((f) => {
    $("sliders").insertAdjacentHTML("beforeend",
      `<div class="row"><label>${nice(f.name)}<output id="o_${f.name}"></output></label>
       <input type="range" id="r_${f.name}" min="${f.min}" max="${f.max}" step="${f.step}"></div>`);
    $("r_" + f.name).addEventListener("input", (e) => { values[f.name] = +e.target.value; refresh(); });
  });
  $("thead").innerHTML = "<th>#</th>" + info.features.map((f) => `<th>${nice(f.name).split(" ")[0]}</th>`).join("") + "<th>Result</th>";
  resetValues();
  renderHistory();
}

function resetValues() { info.features.forEach((f) => (values[f.name] = f.ref)); refresh(); }

function randomValues() {
  info.features.forEach((f) => {
    const v = f.min + (f.max - f.min) * (0.1 + Math.random() * 0.6);
    values[f.name] = Math.round(v / f.step) * f.step;
  });
  refresh();
}

function refresh() {
  info.features.forEach((f) => {
    $("r_" + f.name).value = values[f.name];
    $("o_" + f.name).textContent = (+values[f.name]).toFixed(f.step < 1 ? 2 : 0) + " " + f.unit;
  });
  clearTimeout(timer);
  timer = setTimeout(predict, 80); // debounce
}

async function predict() {
  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    last = await res.json();
    show(last);
  } catch (e) {
    $("label").textContent = "Error";
    $("prob").textContent = String(e).slice(0, 120);
  }
}

function show(r) {
  const bad = r.label === "Diabetic";
  $("label").textContent = r.label;
  $("label").style.color = bad ? "var(--bad)" : "var(--ok)";
  $("prob").textContent = `Probability of diabetes: ${(r.probability * 100).toFixed(1)}%`;
  $("fill").style.width = r.probability * 100 + "%";

  const mx = Math.max(1, ...r.contributions.map((c) => Math.abs(c.effect)));
  $("why").innerHTML = r.contributions.map((c) => {
    const w = (Math.abs(c.effect) / mx) * 50, up = c.effect >= 0;
    return `<span>${nice(c.feature)}</span>
      <div class="track"><b style="left:${up ? 50 : 50 - w}%;width:${w}%;background:${up ? "var(--bad)" : "var(--ok)"}"></b></div>
      <span style="text-align:right">${up ? "+" : ""}${c.effect.toFixed(2)}</span>`;
  }).join("");
}

// ---- history (kept in the browser) ----
const loadH = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } };
const saveH = (h) => { try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch {} };

function renderHistory() {
  const h = loadH();
  $("count").textContent = h.length ? `(${h.length})` : "";
  $("tbody").innerHTML = h.length
    ? h.map((row, i) => `<tr><td>${i + 1}</td>${info.features.map((f) => `<td>${(+row.v[f.name]).toFixed(f.step < 1 ? 2 : 0)}</td>`).join("")}
        <td class="tag ${row.label === "Diabetic" ? "Malignant" : "Benign"}">${row.label} ${(row.p * 100).toFixed(0)}%</td></tr>`).join("")
    : `<tr><td colspan="8" class="empty">Nothing saved yet. Click "Save to history".</td></tr>`;
}

$("reset").onclick = resetValues;
$("random").onclick = randomValues;
$("save").onclick = () => {
  if (!last) return;
  const h = loadH();
  h.push({ v: { ...values }, label: last.label, p: last.probability });
  saveH(h); renderHistory();
};
$("clear").onclick = () => { saveH([]); renderHistory(); };

init();
