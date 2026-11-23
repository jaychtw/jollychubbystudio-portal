export const SCENE_COUNT = 5;
export const initialState = () => ({
  stage: "intro",
  index: 0,
  found: [],
  selected: null,
  results: [],
});

export function transition(state, action, scenes) {
  if (action.type === "START" || action.type === "RESTART")
    return { ...initialState(), stage: "playing" };
  if (state.stage !== "playing") return state;
  const scene = scenes[state.index];
  const revealed = state.results.length > state.index;
  switch (action.type) {
    case "CLUE":
      if (
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index >= scene.clues.length ||
        state.found.includes(action.index)
      )
        return state;
      return { ...state, found: [...state.found, action.index].sort() };
    case "SELECT":
      if (
        revealed ||
        state.found.length < 2 ||
        !Number.isInteger(action.index) ||
        !scene.options[action.index]
      )
        return state;
      return { ...state, selected: action.index };
    case "REVEAL":
      if (revealed || state.found.length < 2 || state.selected === null)
        return state;
      return {
        ...state,
        found: scene.clues.map((_, i) => i),
        results: [...state.results, state.selected],
      };
    case "NEXT":
      if (!revealed) return state;
      return {
        ...state,
        stage: state.index === scenes.length - 1 ? "complete" : "playing",
        index: Math.min(state.index + 1, scenes.length - 1),
        found: [],
        selected: null,
      };
    default:
      return state;
  }
}

export const score = (state, scenes) =>
  state.results.reduce(
    (sum, answer, index) => sum + Number(answer === scenes[index].answer),
    0,
  );

// Replay saved actions rather than trusting arbitrary serialized application state.
export function restoreState(raw, scenes) {
  try {
    const saved = JSON.parse(raw);
    if (
      !saved ||
      saved.version !== 1 ||
      !["intro", "playing", "complete"].includes(saved.stage) ||
      !Array.isArray(saved.results) ||
      saved.results.length > scenes.length
    )
      return initialState();
    if (saved.stage === "intro") return initialState();
    let state = transition(initialState(), { type: "START" }, scenes);
    for (const answer of saved.results) {
      if (!Number.isInteger(answer) || !scenes[state.index].options[answer])
        return initialState();
      for (const index of [0, 1])
        state = transition(state, { type: "CLUE", index }, scenes);
      state = transition(state, { type: "SELECT", index: answer }, scenes);
      state = transition(state, { type: "REVEAL" }, scenes);
      if (saved.stage === "complete" || state.index < saved.index)
        state = transition(state, { type: "NEXT" }, scenes);
    }
    if (
      state.index !== saved.index ||
      state.stage !== saved.stage ||
      !Array.isArray(saved.found)
    )
      return initialState();
    for (const index of saved.found)
      state = transition(state, { type: "CLUE", index }, scenes);
    if (saved.selected !== null)
      state = transition(
        state,
        { type: "SELECT", index: saved.selected },
        scenes,
      );
    return state;
  } catch {
    return initialState();
  }
}

export function saveState(state) {
  return JSON.stringify({ version: 1, ...state });
}
