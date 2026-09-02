const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
let profile;

async function loadProfile() {
  const response = await fetch("./launch-profile.json", { cache: "no-store" });
  if (!response.ok) throw new Error("launch profile unavailable");
  profile = await response.json();
  render();
}

function badge(state) {
  const label = state.replaceAll("_", " ");
  const cls = state.includes("READY") ? "ready" : state.includes("REVIEW") || state.includes("PIN") ? "review" : "muted";
  return '<span class="badge ' + cls + '">' + label + '</span>';
}

function card(item, kind) {
  return '<article class="system-card">' +
    '<div class="system-top"><div><p class="kicker">' + kind + '</p><h3>' + item.label + '</h3></div>' +
    badge(item.state || "HELD") + '</div>' +
    (item.action ? '<p class="action">' + item.action + '</p>' : '') +
    '<dl><div><dt>Source</dt><dd>' + item.sourcePath + '</dd></div>' +
    (item.commit ? '<div><dt>Pin</dt><dd><code>' + item.commit.slice(0, 12) + '</code></dd></div>' : '') +
    (item.reason ? '<div><dt>Gate</dt><dd>' + item.reason + '</dd></div>' : '') +
    '</dl></article>';
}

function render() {
  $("#coreGrid").innerHTML = profile.core.map(x => card(x, "CORE")).join("");
  $("#engineGrid").innerHTML = profile.launchEngines.map(x => card(x, "ENGINE")).join("");
  $("#heldGrid").innerHTML = profile.heldEngines.map(x => card(x, "HELD")).join("");
  $("#sourceCount").textContent = profile.core.length + profile.launchEngines.length + profile.heldEngines.length + profile.data.length;
  $("#readyCount").textContent = [...profile.core, ...profile.launchEngines].filter(x => x.state === "READY_FOR_ADAPTER").length;
  $("#heldCount").textContent = profile.heldEngines.length;
  $("#manifestSource").textContent = profile.generatedFrom[0];
}

function setView(name) {
  $$(".view").forEach(x => x.hidden = x.dataset.view !== name);
  $$(".nav-btn").forEach(x => x.classList.toggle("active", x.dataset.target === name));
  history.replaceState(null, "", "#" + name);
}

$$(".nav-btn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.target)));

$("#manifestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const template = data.get("template");
  const engine = profile.launchEngines.find(x => x.id === template);
  const output = {
    schemaVersion: 1,
    status: "DRAFT_LOCAL_ONLY",
    business: {
      displayName: String(data.get("displayName") || "").trim(),
      jurisdiction: String(data.get("jurisdiction") || "").trim() || null
    },
    requestedEngine: engine ? {
      id: engine.id,
      sourcePath: engine.sourcePath,
      pinnedCommit: engine.commit
    } : null,
    requiredControlPlane: profile.core.filter(x => x.state === "READY_FOR_ADAPTER").map(x => x.id),
    note: "This manifest is generated locally in the browser. It is not persisted or provisioned."
  };
  $("#manifestOutput").textContent = JSON.stringify(output, null, 2);
});

const initial = location.hash.replace("#", "") || "home";
setView(["home","business","systems","launch"].includes(initial) ? initial : "home");
loadProfile().catch(err => {
  $("#loadError").hidden = false;
  $("#loadError").textContent = "Unable to load launch profile: " + err.message;
});
