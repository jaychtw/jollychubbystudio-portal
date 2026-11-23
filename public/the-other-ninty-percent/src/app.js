import { copy, scenes } from "./content.js";
import { illustration } from "./art.js";
import {
  initialState,
  transition,
  restoreState,
  saveState,
  score,
} from "./engine.js";
const $ = (selector) => document.querySelector(selector);
const safeGet = (storage, key) => {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (storage, key, value) => {
  try {
    window[storage].setItem(key, value);
  } catch {
    /* Game remains fully playable without storage. */
  }
};
let lang = safeGet("localStorage", "other90-lang");
if (!Object.hasOwn(copy, lang)) lang = "en";
let state = restoreState(safeGet("sessionStorage", "other90-progress"), scenes);
let resetOpener = null;
const text = (pair) => pair[lang === "en" ? 0 : 1];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const arrow =
  '<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function render({ focus = null, announce = "" } = {}) {
  const t = copy[lang];
  document.documentElement.lang = lang;
  document.title =
    lang === "en"
      ? "The Other 90% · Look a little closer"
      : "The Other 90% · 再多看一眼";
  $("#brand-sub").textContent = t.brandSub;
  $("#skip").textContent = t.skip;
  $("#language-label").textContent = t.lang;
  $("#language").setAttribute("aria-label", t.langLabel);
  $("#footer-copy").textContent = t.footer;
  $("#footer-note").textContent = t.privacy;
  if (state.stage === "intro") renderIntro(t);
  else if (state.stage === "complete") renderComplete(t);
  else renderScene(t);
  if (focus) {
    const target = document.getElementById(focus);
    target?.focus({ preventScroll: true });
    if (
      focus === "scene-heading" ||
      focus === "complete-heading" ||
      focus === "hero-heading"
    )
      window.scrollTo({ top: 0, behavior: "instant" });
    else if (focus === "result-heading")
      target?.scrollIntoView({ block: "center", behavior: "instant" });
  }
  if (announce) $("#announcement").textContent = announce;
  safeSet("sessionStorage", "other90-progress", saveState(state));
}
function renderIntro(t) {
  $("#main").innerHTML =
    `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="little-line"></span>${t.eyebrow}</p><h1 id="hero-heading" tabindex="-1">${t.heroA}<br><em>${t.heroB}</em></h1><p class="hero-intro">${t.heroIntro}</p><p class="hero-text">${t.heroText}</p><button id="start" class="button primary">${t.start}${arrow}</button><div class="hero-meta"><span>${t.duration}</span><span>${t.noRush}</span></div></div><div class="hero-picture"><div class="illustration-frame">${illustration("cafe", lang, t.introArt)}<span class="illustration-index">${lang === "en" ? "FIG. 01" : "圖 01"}</span></div><div class="round-sticker" aria-hidden="true">${arrow}${t.sticker}</div><p class="picture-caption"><span>01—05</span>${t.heroCaption}</p></div></section><section class="how"><div class="how-heading"><span class="eyebrow">THE OTHER 90%</span><h2>${t.how}</h2></div><div class="steps">${t.steps.map((step) => `<div class="step"><span class="step-number">${step[0]}</span><div><h3>${step[1]}</h3><p>${step[2]}</p></div></div>`).join("")}</div></section><p class="storage-note">${t.saved}</p>`;
  $("#start").onclick = () => dispatch({ type: "START" }, "scene-heading");
}
function renderScene(t) {
  const s = scenes[state.index];
  const revealed = state.results.length > state.index;
  const correct = state.selected === s.answer;
  const sceneNumber = String(state.index + 1).padStart(2, "0");
  $("#main").innerHTML =
    `<section class="game"><div class="journey"><div class="eyebrow">${t.field}<span class="divider">/</span>${t.case} ${sceneNumber} ${t.of} 05</div><div class="journey-dots" role="img" aria-label="${t.progress}: ${state.index + 1} / 5">${scenes.map((_, i) => `<span class="journey-dot ${i < state.index ? "done" : i === state.index ? "current" : ""}" aria-hidden="true"></span>`).join("")}</div><button id="reset" class="text-button">${t.reset} <span aria-hidden="true">↺</span></button></div><div class="case-heading"><p class="eyebrow location">${text(s.place)}</p><h1 id="scene-heading" tabindex="-1">${text(s.name)}<span class="case-number" aria-hidden="true">/${sceneNumber}</span></h1><p class="scene-story">${text(s.story)}</p></div><div class="investigation"><div class="scene-column"><div class="scene-art" style="--scene-color:${s.color}">${illustration(s.key, lang, `${t.sceneArt}: ${text(s.name)}`)}${s.clues.map((clue, i) => `<button type="button" id="clue-${i}" class="hotspot ${state.found.includes(i) ? "seen" : ""}" style="left:${clue.x}%;top:${clue.y}%" data-clue="${i}" aria-label="${state.found.includes(i) ? t.seenLabel : t.inspectLabel} ${i + 1}" aria-pressed="${state.found.includes(i)}" aria-controls="note-${i}"><span aria-hidden="true">${state.found.includes(i) ? "✓" : i + 1}</span></button>`).join("")}</div><div class="scene-caption"><span class="inspect-icon" aria-hidden="true">⌕</span><p>${t.inspect}</p><span class="clue-count">${state.found.length}/3</span></div></div><aside class="notebook" aria-labelledby="notebook-heading"><div class="notebook-top"><span class="eyebrow">${t.field} / ${sceneNumber}</span><span aria-hidden="true">✳</span></div><h2 id="notebook-heading">${t.notebook}</h2><p class="notebook-sub">${t.note}</p><ol class="evidence-list">${s.clues.map((clue, i) => `<li id="note-${i}" class="evidence ${state.found.includes(i) ? "discovered" : ""}"><span class="evidence-number">0${i + 1}</span><div><h3>${t.clue} ${i + 1}</h3><p>${state.found.includes(i) ? text(clue.text) : t.hiddenClue}</p>${state.found.includes(i) ? `<div class="evidence-detail" aria-hidden="true">${illustration(s.key, lang, "", clue.crop)}</div>` : ""}</div></li>`).join("")}</ol><div class="notebook-bottom"><span>${state.found.length}/3 ${t.collected}</span><span aria-hidden="true">${state.found.length === 3 ? "✓" : "…"}</span></div></aside></div><section class="deduction ${state.found.length < 2 ? "locked" : ""}" aria-labelledby="question-heading"><div class="deduction-intro"><p class="eyebrow">${state.found.length < 2 ? "○" : "+"} ${t.question}</p><h2 id="question-heading">${state.found.length < 2 ? t.locked : text(s.q)}</h2>${state.found.length >= 2 ? `<p>${t.choose}</p>` : ""}</div>${state.found.length >= 2 ? `<fieldset class="answers" ${revealed ? "disabled" : ""}><legend class="sr-only">${text(s.q)}</legend>${s.options.map((option, i) => `<label class="answer ${state.selected === i ? "selected" : ""} ${revealed && s.answer === i ? "is-correct" : ""}" for="answer-${i}"><input type="radio" name="answer" id="answer-${i}" value="${i}" ${state.selected === i ? "checked" : ""}><span class="answer-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="answer-text">${text(option)}${revealed && (s.answer === i || state.selected === i) ? `<small>${s.answer === i ? t.supported : t.selected}</small>` : ""}</span><span class="answer-check" aria-hidden="true">${revealed && s.answer === i ? "✓" : state.selected === i ? "●" : ""}</span></label>`).join("")}</fieldset>${!revealed ? `<div class="reveal-actions"><button id="reveal" class="button primary" ${state.selected === null ? "disabled" : ""}>${t.reveal}${arrow}</button></div>` : ""}` : ""}</section>${
      revealed
        ? `<section class="reveal ${correct ? "" : "reconsider"}" aria-labelledby="result-heading"><div class="reveal-title"><span class="result-symbol" aria-hidden="true">${correct ? "✓" : "↻"}</span><div><p class="eyebrow">${t.field} / ${sceneNumber}</p><h2 id="result-heading" tabindex="-1">${correct ? t.right : t.wrong}</h2></div></div><div class="reasoning">${[
            ["observed", "observation"],
            ["inference", "inference"],
            ["limits", "limits"],
          ]
            .map(([a, b]) => `<div><h3>${t[a]}</h3><p>${text(s[b])}</p></div>`)
            .join(
              "",
            )}</div><p class="reveal-note">${t.allEvidence}</p><button id="next" class="button primary">${state.index === scenes.length - 1 ? t.finish : t.next}${arrow}</button></section>`
        : ""
    }<p class="storage-note">${t.saved}</p></section>`;
  $('[id="reset"]').onclick = () => showReset(t, "reset");
  document.querySelectorAll("[data-clue]").forEach(
    (button) =>
      (button.onclick = () => {
        const index = Number(button.dataset.clue);
        dispatch(
          { type: "CLUE", index },
          button.id,
          `${t.evidenceAnnounce} ${index + 1}. ${text(s.clues[index].text)}`,
        );
      }),
  );
  document
    .querySelectorAll('input[name="answer"]')
    .forEach(
      (input) =>
        (input.onchange = () =>
          dispatch({ type: "SELECT", index: Number(input.value) }, input.id)),
    );
  if ($("#reveal"))
    $("#reveal").onclick = () => dispatch({ type: "REVEAL" }, "result-heading");
  if ($("#next"))
    $("#next").onclick = () =>
      dispatch(
        { type: "NEXT" },
        state.index === scenes.length - 1
          ? "complete-heading"
          : "scene-heading",
      );
}
function renderComplete(t) {
  $("#main").innerHTML =
    `<section class="completion"><div class="completion-heading"><p class="eyebrow">${t.completeTag}</p><span class="completion-seal" aria-hidden="true">✳</span><h1 id="complete-heading" tabindex="-1">${t.completeA}<br><em>${t.completeB}</em></h1><p>${t.completeText}</p></div><div class="score-card"><span class="score-value">${score(state, scenes)}<span>/5</span></span><strong>${t.score}</strong><p>${t.noGrade}</p></div><section class="summary" aria-labelledby="summary-heading"><h2 id="summary-heading">${t.summary}</h2>${scenes.map((s, i) => `<article class="summary-item"><span class="summary-number">0${i + 1}</span><div><h3>${text(s.name)}</h3><p>${text(s.inference)}</p></div><span class="summary-status ${state.results[i] === s.answer ? "correct" : ""}">${state.results[i] === s.answer ? t.correct : t.reconsider}</span></article>`).join("")}</section><button id="restart" class="button primary">${t.again}<span aria-hidden="true">↺</span></button><p class="storage-note">${t.saved}</p></section>`;
  $("#restart").onclick = () => dispatch({ type: "RESTART" }, "scene-heading");
}
function dispatch(action, focus, announce) {
  state = transition(state, action, scenes);
  render({ focus, announce });
}
function showReset(t, opener) {
  if ($("#reset-dialog")) return;
  resetOpener = opener;
  const dialog = document.createElement("dialog");
  dialog.id = "reset-dialog";
  dialog.setAttribute("aria-labelledby", "reset-title");
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const buttons = [...dialog.querySelectorAll("button")];
    const first = buttons[0],
      last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.innerHTML = `<h2 id="reset-title">${t.resetTitle}</h2><p>${t.resetText}</p><div class="dialog-actions"><button id="cancel-reset" class="button secondary" autofocus>${t.cancel}</button><button id="confirm-reset" class="button primary">${t.reset}</button></div>`;
  document.body.append(dialog);
  const close = () => {
    dialog.close();
    dialog.remove();
    document.getElementById(resetOpener)?.focus();
  };
  $("#cancel-reset").onclick = close;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  $("#confirm-reset").onclick = () => {
    dialog.close();
    dialog.remove();
    dispatch({ type: "RESTART" }, "scene-heading");
  };
  dialog.showModal();
}
$("#language").onclick = () => {
  lang = lang === "en" ? "zh-TW" : "en";
  safeSet("localStorage", "other90-lang", lang);
  render({ focus: "language" });
};
$("#home").onclick = (event) => {
  event.preventDefault();
  if (state.stage === "playing") showReset(copy[lang], "home");
  else {
    state = initialState();
    render({ focus: "hero-heading" });
  }
};
render();
