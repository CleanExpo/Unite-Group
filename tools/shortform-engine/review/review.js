"use strict";

const $ = (id) => document.getElementById(id);
const player = $("player");
let state = null;
let shownVersion = 0;
let noteTime = 0;

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function say(text) { $("message").textContent = text; }

function seek(t) { player.currentTime = t; player.pause(); }

function render() {
  if (!state) return;
  $("job").textContent = state.job;
  $("version").textContent = state.review_version ? `Review v${state.review_version}` : "Not rendered";
  const label = {
    in_review: "In review", changes_requested: "Fixing notes", approved: "Approved",
    not_rendered: "Waiting",
  }[state.status] || state.status;
  $("status").textContent = label;
  $("status").dataset.s = state.status;

  if (state.review_version && state.review_version !== shownVersion) {
    shownVersion = state.review_version;
    player.src = `/review.mp4?v=${state.review_version}`;
  }

  const list = $("notes");
  list.innerHTML = "";
  const notes = [...state.notes].sort((a, b) => a.t - b.t);
  $("empty").hidden = notes.length > 0;
  for (const n of notes) {
    const li = document.createElement("li");
    li.className = "note";
    li.dataset.s = n.status;
    const t = document.createElement("button");
    t.className = "t"; t.type = "button"; t.textContent = fmt(n.t);
    t.addEventListener("click", () => seek(n.t));
    const body = document.createElement("div");
    body.className = "body";
    body.textContent = n.text;
    const sub = document.createElement("span");
    sub.className = "sub";
    const statusWord = { draft: "Not sent", sent: "With Claude", applied: "Fixed", declined: "Not changed" }[n.status];
    sub.textContent = `${statusWord} · v${n.version}${n.lasting ? " · style rule" : ""}${n.resolution ? " · " + n.resolution : ""}`;
    body.appendChild(sub);
    li.append(t, body);
    if (n.status === "draft") {
      const x = document.createElement("button");
      x.className = "x"; x.type = "button"; x.textContent = "Remove";
      x.addEventListener("click", async () => { await api("/api/notes/delete", { id: n.id }); refresh(); });
      li.appendChild(x);
    } else {
      li.appendChild(document.createElement("span"));
    }
    list.appendChild(li);
  }

  const drafts = notes.filter((n) => n.status === "draft").length;
  const pending = notes.filter((n) => n.status === "sent").length;
  $("sendBtn").textContent = drafts ? `Send ${drafts} note${drafts > 1 ? "s" : ""}` : "Send notes";
  $("sendBtn").disabled = drafts === 0 || state.status === "approved";
  $("approveBtn").disabled = state.status !== "in_review" || drafts + pending > 0;
  const composing = state.status === "in_review" || state.status === "changes_requested";
  $("addBtn").disabled = !composing;
  $("noteText").disabled = !composing;

  const fin = state.final || {};
  $("finalLink").hidden = fin.status !== "ready";
  if (state.status === "approved") {
    say(fin.status === "ready" ? "Final 1080p render is ready." :
        fin.status === "failed" ? "Final render failed. Claude has the error." : "Rendering the 1080p final...");
  } else if (state.status === "changes_requested") {
    say(`Claude is working on ${pending} note${pending === 1 ? "" : "s"}. The new version loads here when it is ready.`);
  }
  drawPins();
}

function drawPins() {
  const scrub = $("scrub");
  scrub.querySelectorAll(".pin").forEach((p) => p.remove());
  const d = player.duration || state?.review_duration_s || 0;
  if (!d || !state) return;
  for (const n of state.notes) {
    const pin = document.createElement("button");
    pin.className = "pin"; pin.type = "button"; pin.dataset.s = n.status;
    pin.style.left = `${Math.min(100, (n.t / d) * 100)}%`;
    pin.title = `${fmt(n.t)} ${n.text}`;
    pin.addEventListener("click", (e) => { e.stopPropagation(); seek(n.t); });
    scrub.appendChild(pin);
  }
}

async function refresh() {
  try { state = await api("/api/state"); render(); } catch (e) { say(e.message); }
}

player.addEventListener("timeupdate", () => {
  const d = player.duration || 1;
  $("scrubFill").style.width = `${(player.currentTime / d) * 100}%`;
  if (document.activeElement !== $("noteText")) {
    noteTime = player.currentTime;
    $("noteAt").textContent = fmt(noteTime);
  }
});
player.addEventListener("loadedmetadata", drawPins);

$("scrub").addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  seek(((e.clientX - r.left) / r.width) * (player.duration || 0));
});

$("noteText").addEventListener("focus", () => {
  player.pause();
  noteTime = player.currentTime;
  $("noteAt").textContent = fmt(noteTime);
});

$("composer").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("noteText").value.trim();
  if (!text) return;
  try {
    await api("/api/notes", { t: noteTime, text, lasting: $("lasting").checked });
    $("noteText").value = ""; $("lasting").checked = false;
    say(`Note added at ${fmt(noteTime)}.`);
    refresh();
  } catch (err) { say(err.message); }
});

$("sendBtn").addEventListener("click", async () => {
  try { const r = await api("/api/send", {}); say(`Sent ${r.sent.length} note(s) to Claude.`); refresh(); }
  catch (err) { say(err.message); }
});

$("approveBtn").addEventListener("click", async () => {
  try { await api("/api/approve", { sha256: state.review_sha256 }); refresh(); }
  catch (err) { say(err.message); }
});

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "n" && document.activeElement.tagName !== "TEXTAREA") {
    e.preventDefault();
    $("noteText").focus();
  }
});

refresh();
setInterval(refresh, 3000);
