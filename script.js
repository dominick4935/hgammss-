
const games = [
  {
    name: "Example Arcade",
    category: "Arcade",
    description: "Your first game entry",
    url: ""
  },
  {
    name: "Puzzle Challenge",
    category: "Puzzle",
    description: "A puzzle game",
    url: ""
  },
  {
    name: "Racing Challenge",
    category: "Racing",
    description: "A racing game",
    url: ""
  },
  {
    name: "Action Adventure",
    category: "Action",
    description: "An action game",
    url: ""
  }
];

let category = "All";
let favorites = JSON.parse(
  localStorage.getItem("gamehub-favorites") || "[]"
);

function showPage(page) {
  ["home", "browser", "favorites", "player"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });

  document.getElementById(page).classList.remove("hidden");
}

function setCategory(value) {
  category = value;
  renderGames();
}

function toggleFavorite(name) {
  if (favorites.includes(name)) {
    favorites = favorites.filter(item => item !== name);
  } else {
    favorites.push(name);
  }

  localStorage.setItem(
    "gamehub-favorites",
    JSON.stringify(favorites)
  );

  renderGames();
}

function createCard(game) {
  const card = document.createElement("div");
  card.className = "game-card";

  const title = document.createElement("h3");
  title.textContent = game.name;

  const description = document.createElement("p");
  description.textContent = game.description;

  const type = document.createElement("p");
  type.textContent = game.category;

  const play = document.createElement("button");
  play.textContent = "Play";
  play.onclick = () => openGame(game);

  const favorite = document.createElement("button");
  favorite.textContent = favorites.includes(game.name)
    ? "★ Favorited"
    : "☆ Favorite";
  favorite.onclick = () => toggleFavorite(game.name);

  card.append(title, description, type, play, favorite);
  return card;
}

function renderGames() {
  const query = document.getElementById("search").value.toLowerCase();

  const filtered = games.filter(game =>
    game.name.toLowerCase().includes(query) &&
    (category === "All" || game.category === category)
  );

  const container = document.getElementById("games");
  container.replaceChildren();

  filtered.forEach(game => container.appendChild(createCard(game)));
  renderFavorites();
}

function renderFavorites() {
  const container = document.getElementById("favoriteGames");
  container.replaceChildren();

  games
    .filter(game => favorites.includes(game.name))
    .forEach(game => container.appendChild(createCard(game)));
}

function openGame(game) {
  if (!game.url) {
    alert("Add a valid game URL to this game in script.js first.");
    return;
  }

  document.getElementById("playerTitle").textContent = game.name;
  document.getElementById("gameFrame").src = game.url;
  showPage("player");
}

document.getElementById("browserForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = document.getElementById("browserUrl");
  let url;

  try {
    url = new URL(input.value);
  } catch {
    document.getElementById("browserMessage").textContent =
      "Please enter a valid website address.";
    return;
  }

  if (url.protocol !== "https:") {
    document.getElementById("browserMessage").textContent =
      "Only HTTPS websites are supported.";
    return;
  }

  document.getElementById("browserFrame").src = url.href;
  document.getElementById("browserMessage").textContent =
    "Some websites do not allow embedding.";
});

renderGames();
