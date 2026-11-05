/* ================= CONFIG =================
 * Web search: queries load search.brave.com inside the Browser tab.
 */
const CONFIG = {
  searchUrl: "https://search.brave.com/search?q=",
  homeUrl: "https://search.brave.com/"
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

  if (page === "browser") {
    ensureBrowserStarted();
    $("browserInput").focus();
  }
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

const visited = []; // pages loaded from the address bar, for the ← button

function loadInFrame(href) {
  $("frameWrap").classList.remove("hidden");
  $("browserFrame").src = href;
  $("frameUrl").textContent = href;
  $("frameBack").disabled = visited.length < 2;
}

function openSite(href) {
  visited.push(href);
  loadInFrame(href);
  setBrowserMessage("If a site stays blank, that site doesn't allow being shown inside other websites.");
}

function runSearch(query) {
  openSite(CONFIG.searchUrl + encodeURIComponent(query));
  setBrowserMessage(`Brave results for “${query}”`);
}

// Open Brave Search the first time the Browser tab is shown
function ensureBrowserStarted() {
  if (visited.length === 0) {
    openSite(CONFIG.homeUrl);
    setBrowserMessage("");
  }
}

$("frameBack").addEventListener("click", () => {
  if (visited.length < 2) return;
  visited.pop();
  loadInFrame(visited[visited.length - 1]);
});

$("frameFull").addEventListener("click", () => {
  const frame = $("browserFrame");
  (frame.requestFullscreen || frame.webkitRequestFullscreen)?.call(frame);
});

$("frameHome").addEventListener("click", () => {
  openSite(CONFIG.homeUrl);
  setBrowserMessage("");
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

  // Never use Google: send any google.* address to Brave Search instead
  if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname)) {
    const query = url.searchParams.get("q");
    if (query) {
      runSearch(query);
    } else {
      openSite(CONFIG.homeUrl);
      setBrowserMessage("Google isn't used here — searching with Brave instead.");
    }
    return;
  }

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
