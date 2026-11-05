/* ================= CONFIG =================
 * Web search (Brave Search, shown inside GameHub)
 * Paste the URL of your deployed worker.js (see the setup steps at the top of
 * worker.js), e.g. "https://gamehub-search.yourname.workers.dev"
 */
const CONFIG = {
  searchProxyUrl: ""
};

/* ================= GAMES =================
 * Add a "url" to each game to make its Play button work.
 */
const games = [
  { name: "Example Arcade",   category: "Arcade", description: "Your first game entry", url: "" },
  { name: "Puzzle Challenge", category: "Puzzle", description: "A puzzle game",         url: "" },
  { name: "Racing Challenge", category: "Racing", description: "A racing game",         url: "" },
  { name: "Action Adventure", category: "Action", description: "An action game",        url: "" }
];

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
  }
};

const CATEGORIES = ["All", ...new Set(games.map(g => g.category))];
let category = "All";
let favorites = new Set(store.get("gamehub-favorites", []));

/* ================= NAVIGATION ================= */
function showPage(page) {
  document.querySelectorAll(".page").forEach(section =>
    section.classList.toggle("hidden", section.id !== page)
  );

  const navTarget = page === "player" ? "home" : page;
  document.querySelectorAll(".nav-btn").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.page === navTarget)
  );

  // Stop any running game (and its audio) when leaving the player
  if (page !== "player") $("gameFrame").src = "about:blank";

  if (page === "browser") $("browserInput").focus();
  window.scrollTo({ top: 0 });
}

document.querySelectorAll(".nav-btn").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

/* ================= CATEGORIES ================= */
function renderCategories() {
  const container = $("categories");
  container.replaceChildren();

  CATEGORIES.forEach(name => {
    const chip = document.createElement("button");
    chip.className = "chip" + (name === category ? " active" : "");
    chip.textContent = name;
    chip.setAttribute("aria-pressed", name === category);
    chip.addEventListener("click", () => {
      category = name;
      renderCategories();
      renderGames();
    });
    container.appendChild(chip);
  });
}

/* ================= GAME CARDS ================= */
function toggleFavorite(name) {
  favorites.has(name) ? favorites.delete(name) : favorites.add(name);
  store.set("gamehub-favorites", [...favorites]);
  renderGames();
}

function createCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = game.category;

  const title = document.createElement("h3");
  title.textContent = game.name;

  const description = document.createElement("p");
  description.textContent = game.description;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const play = document.createElement("button");
  play.className = "primary";
  if (game.url) {
    play.textContent = "▶ Play";
    play.addEventListener("click", () => openGame(game));
  } else {
    play.textContent = "Coming soon";
    play.disabled = true;
    play.title = "Add a url for this game in script.js";
  }

  const isFav = favorites.has(game.name);
  const favorite = document.createElement("button");
  favorite.className = "icon-btn" + (isFav ? " is-fav" : "");
  favorite.textContent = isFav ? "★" : "☆";
  favorite.setAttribute("aria-label", isFav ? "Remove from favorites" : "Add to favorites");
  favorite.setAttribute("aria-pressed", isFav);
  favorite.addEventListener("click", () => toggleFavorite(game.name));

  actions.append(play, favorite);
  card.append(tag, title, description, actions);
  return card;
}

function renderGames() {
  const query = $("search").value.trim().toLowerCase();

  const filtered = games.filter(game =>
    (category === "All" || game.category === category) &&
    [game.name, game.description, game.category].some(text =>
      text.toLowerCase().includes(query)
    )
  );

  $("games").replaceChildren(...filtered.map(createCard));
  $("gamesEmpty").classList.toggle("hidden", filtered.length > 0);
  $("resultCount").textContent = `${filtered.length} game${filtered.length === 1 ? "" : "s"}`;

  renderFavorites();
}

function renderFavorites() {
  const favGames = games.filter(game => favorites.has(game.name));
  $("favoriteGames").replaceChildren(...favGames.map(createCard));
  $("favoritesEmpty").classList.toggle("hidden", favGames.length > 0);
  $("favCount").textContent = favGames.length;
}

$("search").addEventListener("input", renderGames);

/* ================= PLAYER ================= */
function openGame(game) {
  $("playerTitle").textContent = game.name;
  $("gameFrame").src = game.url;
  showPage("player");
}

$("backBtn").addEventListener("click", () => showPage("home"));
$("fullscreenBtn").addEventListener("click", () => {
  const frame = $("gameFrame");
  (frame.requestFullscreen || frame.webkitRequestFullscreen)?.call(frame);
});

/* ================= BROWSER + WEB SEARCH ================= */
function setBrowserMessage(text) {
  $("browserMessage").textContent = text;
}

function looksLikeUrl(text) {
  if (/\s/.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return true;
  return /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(text); // e.g. example.com/page
}

const searchState = { query: "", offset: 0, more: false, hasResults: false };

function openSite(href, fromResults = false) {
  $("searchResults").classList.add("hidden");
  $("frameWrap").classList.remove("hidden");
  $("backToResults").classList.toggle("hidden", !(fromResults && searchState.hasResults));
  $("browserFrame").src = href;
  $("frameUrl").textContent = href;
  $("frameOpen").href = href;
  setBrowserMessage("If the page stays blank, that site blocks embedding — use “Open in new tab”.");
}

function showResults() {
  $("frameWrap").classList.add("hidden");
  $("browserFrame").src = "about:blank";
  $("searchResults").classList.remove("hidden");
}

// Brave descriptions contain <strong> tags; turn them into safe plain text
function plainText(html) {
  return new DOMParser().parseFromString(html || "", "text/html").body.textContent;
}

function renderResults(results) {
  const list = $("resultList");
  list.replaceChildren();

  results.forEach(result => {
    const item = document.createElement("li");
    item.className = "result";

    const link = document.createElement("a");
    link.href = result.url;
    link.className = "result-title";
    link.textContent = plainText(result.title);
    link.addEventListener("click", event => {
      event.preventDefault();
      openSite(result.url, true);
    });

    const site = document.createElement("span");
    site.className = "result-url";
    site.textContent = result.url.replace(/^https?:\/\//, "");

    const description = document.createElement("p");
    description.textContent = plainText(result.description);

    item.append(site, link, description);
    list.appendChild(item);
  });

  $("prevPage").disabled = searchState.offset === 0;
  $("nextPage").disabled = !searchState.more;
}

async function runSearch(query, offset = 0) {
  showResults();

  if (!CONFIG.searchProxyUrl) {
    $("resultList").replaceChildren();
    setBrowserMessage("Search isn't connected yet — add your worker URL to CONFIG.searchProxyUrl in script.js.");
    return;
  }

  setBrowserMessage(`Searching Brave for “${query}”…`);
  $("resultList").classList.add("loading");

  try {
    const endpoint = new URL(CONFIG.searchProxyUrl);
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("offset", offset);

    const response = await fetch(endpoint);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);

    Object.assign(searchState, {
      query,
      offset,
      more: Boolean(data.more),
      hasResults: data.results.length > 0
    });

    renderResults(data.results);
    setBrowserMessage(data.results.length
      ? `Results for “${query}”${offset ? ` — page ${offset + 1}` : ""}`
      : `No results for “${query}”.`);
    window.scrollTo({ top: 0 });
  } catch (error) {
    setBrowserMessage(`Search failed: ${error.message}`);
  } finally {
    $("resultList").classList.remove("loading");
  }
}

$("prevPage").addEventListener("click", () =>
  runSearch(searchState.query, Math.max(0, searchState.offset - 1))
);
$("nextPage").addEventListener("click", () =>
  runSearch(searchState.query, searchState.offset + 1)
);
$("backToResults").addEventListener("click", () => {
  showResults();
  setBrowserMessage(`Results for “${searchState.query}”`);
});

$("browserForm").addEventListener("submit", event => {
  event.preventDefault();
  const value = $("browserInput").value.trim();
  if (!value) return;

  if (!looksLikeUrl(value)) {
    runSearch(value);
    return;
  }

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
  } catch {
    setBrowserMessage("That doesn't look like a valid web address.");
    return;
  }
  if (url.protocol === "http:") url.protocol = "https:"; // upgrade insecure links
  openSite(url.href);
});

/* ================= KEYBOARD ================= */
document.addEventListener("keydown", event => {
  const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
  if (event.key === "/" && !typing && !$("home").classList.contains("hidden")) {
    event.preventDefault();
    $("search").focus();
  }
});

/* ================= START ================= */
renderCategories();
renderGames();
