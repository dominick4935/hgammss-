/* ================= CONFIG =================
 * Web search
 * - googleSearchId: paste a Google Programmable Search Engine ID ("cx") to show
 *   results right inside GameHub. Create one free at
 *   https://programmablesearchengine.google.com → "Search the entire web".
 * - Without an ID, searches open in a new tab on the fallback engine.
 *   (Google, Bing and DuckDuckGo all refuse to load inside an iframe.)
 */
const CONFIG = {
  googleSearchId: "",
  fallbackSearchUrl: "https://duckduckgo.com/?q="
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

function openSite(href) {
  $("searchResults").classList.add("hidden");
  $("frameWrap").classList.remove("hidden");
  $("browserFrame").src = href;
  $("frameUrl").textContent = href;
  $("frameOpen").href = href;
  setBrowserMessage("If the page stays blank, that site blocks embedding — use “Open in new tab”.");
}

let googleSearchReady = null;
function loadGoogleSearch() {
  if (googleSearchReady) return googleSearchReady;

  googleSearchReady = new Promise((resolve, reject) => {
    window.__gcse = {
      parsetags: "explicit",
      initializationCallback() {
        google.search.cse.element.render({
          div: "gcse",
          tag: "searchresults-only",
          gname: "gamehub",
          attributes: { linkTarget: "_blank" }
        });
        resolve(google.search.cse.element.getElement("gamehub"));
      }
    };

    const script = document.createElement("script");
    script.src = "https://cse.google.com/cse.js?cx=" + encodeURIComponent(CONFIG.googleSearchId);
    script.async = true;
    script.onerror = () => {
      googleSearchReady = null;
      reject(new Error("Search failed to load"));
    };
    document.head.appendChild(script);
  });

  return googleSearchReady;
}

function runSearch(query) {
  if (!CONFIG.googleSearchId) {
    window.open(CONFIG.fallbackSearchUrl + encodeURIComponent(query), "_blank", "noopener");
    setBrowserMessage(`Opened results for “${query}” in a new tab.`);
    return;
  }

  $("frameWrap").classList.add("hidden");
  $("searchResults").classList.remove("hidden");
  setBrowserMessage(`Searching for “${query}”…`);

  loadGoogleSearch()
    .then(search => {
      search.execute(query);
      setBrowserMessage(`Results for “${query}” — links open in a new tab.`);
    })
    .catch(() => {
      $("searchResults").classList.add("hidden");
      window.open(CONFIG.fallbackSearchUrl + encodeURIComponent(query), "_blank", "noopener");
      setBrowserMessage("Built-in search couldn't load, so results opened in a new tab.");
    });
}

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
