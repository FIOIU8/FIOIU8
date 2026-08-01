const OWNER = "FIOIU8";
const DEVINFO = `${OWNER}/DevInfo`;
const LANGUAGE_COLORS = {
  Kotlin: "#a97bff",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Python: "#3572a5",
  Swift: "#f05138",
  Go: "#00add8",
  Rust: "#dea584",
};

let repositoryCatalog = [];
let repositoryQuery = "";
let repositoryLanguage = "all";
let morphState = null;
let morphCloseTimer = null;
let morphClosing = false;

const $ = (selector, root = document) => root.querySelector(selector);

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCount(value) {
  const count = Number(value || 0);
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(".0", "")}k` : String(count);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toISOString().slice(0, 10);
}

function relativeDate(value) {
  if (!value) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  const units = [[31536000, "年"], [2592000, "个月"], [604800, "周"], [86400, "天"]];
  for (const [unit, label] of units) {
    if (seconds >= unit) return `${Math.floor(seconds / unit)}${label}前`;
  }
  return "今天";
}

function languageColor(language) {
  return LANGUAGE_COLORS[language] || "#7c8798";
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function initializeReveal() {
  const sections = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  sections.forEach((section) => observer.observe(section));
}

function initializeNavigation() {
  const links = [...document.querySelectorAll(".nav a[data-section]")];
  const sections = links.map((link) => document.getElementById(link.dataset.section)).filter(Boolean);
  const update = () => {
    const marker = window.scrollY + 120;
    let active = sections[0];
    sections.forEach((section) => {
      if (section.offsetTop <= marker) active = section;
    });
    links.forEach((link) => link.classList.toggle("active", link.dataset.section === active?.id));
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function renderHeatmap(contributions) {
  const grid = $("#heatmap-grid");
  const months = $("#heatmap-months");
  const total = $("#contribution-total");
  if (!grid || !months) return;

  const map = new Map(contributions.map((item) => [item.date, item]));
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());
  const cells = [];
  const monthLabels = [];
  let cursor = new Date(start);
  let column = 0;
  let previousMonth = -1;
  while (cursor <= end || cursor.getDay() !== 0) {
    const date = cursor.toISOString().slice(0, 10);
    const item = map.get(date) || { count: 0, level: 0 };
    if (cursor.getDay() === 0 && cursor.getMonth() !== previousMonth) {
      monthLabels.push({ label: cursor.toLocaleString("en", { month: "short" }), column });
      previousMonth = cursor.getMonth();
    }
    const delay = Math.min(300, (cells.length % 52) * 6);
    cells.push(`<button class="heatmap-cell level-${item.level}" type="button" style="--cell-delay:${delay}ms" data-date="${date}" data-count="${item.count}" aria-label="${date}，${item.count} 次贡献"></button>`);
    if (cursor.getDay() === 6) column += 1;
    cursor.setDate(cursor.getDate() + 1);
    if (cursor > end && cursor.getDay() === 0) break;
  }
  const columns = Math.ceil(cells.length / 7);
  months.style.gridTemplateColumns = `repeat(${columns}, 13px)`;
  months.innerHTML = monthLabels.map((item) => `<span style="grid-column:${item.column + 1}">${item.label}</span>`).join("");
  grid.innerHTML = cells.join("");
  total.textContent = contributions.reduce((sum, item) => sum + item.count, 0).toLocaleString();
}

function initializeHeatmapTooltip() {
  const grid = $("#heatmap-grid");
  const tooltip = $("#heatmap-tooltip");
  if (!grid || !tooltip) return;
  const position = (clientX, clientY) => {
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = Math.max(8, Math.min(clientX - width / 2, window.innerWidth - width - 8));
    const top = clientY - height - 12 < 8 ? clientY + 20 : clientY - height - 12;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  grid.addEventListener("mouseover", (event) => {
    const cell = event.target.closest(".heatmap-cell");
    if (!cell) return;
    tooltip.textContent = `${cell.dataset.date} · ${cell.dataset.count} 次贡献`;
    tooltip.classList.add("show");
  });
  grid.addEventListener("mousemove", (event) => {
    if (tooltip.classList.contains("show")) position(event.clientX, event.clientY);
  });
  grid.addEventListener("mouseout", (event) => {
    if (!event.relatedTarget?.closest?.(".heatmap-cell")) tooltip.classList.remove("show");
  });
  grid.addEventListener("focusin", (event) => {
    const cell = event.target.closest(".heatmap-cell");
    if (cell) {
      const rect = cell.getBoundingClientRect();
      tooltip.textContent = `${cell.dataset.date} · ${cell.dataset.count} 次贡献`;
      tooltip.classList.add("show");
      position(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  });
  grid.addEventListener("focusout", () => tooltip.classList.remove("show"));
}

async function loadContributions() {
  let contributions;
  try {
    const data = await fetchJson(`https://github-contributions-api.jogruber.de/v4/${OWNER}?y=last`);
    contributions = data.contributions;
  } catch (_) {
    const counts = {};
    try {
      for (let page = 1; page <= 4; page += 1) {
        const events = await fetchJson(`https://api.github.com/users/${OWNER}/events/public?per_page=100&page=${page}`);
        events.forEach((event) => {
          const date = event.created_at?.slice(0, 10);
          if (date) counts[date] = (counts[date] || 0) + 1;
        });
        if (events.length < 100) break;
      }
    } catch (_) {
      // Keep the graph useful even when both public endpoints are unavailable.
    }
    const end = new Date();
    contributions = Array.from({ length: 365 }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (364 - index));
      const dateString = date.toISOString().slice(0, 10);
      const count = counts[dateString] || 0;
      return { date: dateString, count, level: Math.min(4, Math.ceil(count / 3)) };
    });
  }
  if (!Array.isArray(contributions) || contributions.length === 0) throw new Error("No contribution data");
  renderHeatmap(contributions.map((item) => ({ date: item.date, count: item.count || 0, level: item.level ?? Math.min(4, Math.ceil((item.count || 0) / 3)) })));
}

function buildRepositoryCard(repo, index) {
  const topics = (repo.topics || []).slice(0, 4).map((topic) => `<span class="topic">${escapeText(topic)}</span>`).join("");
  return `<article class="project-card" tabindex="0" data-repository-id="${repo.id}" style="--bar-origin:left;--entry-delay:${Math.min(index * 55, 330)}ms">
    <div>
      <p class="project-kicker">${escapeText(repo.language || "Repository")} / ${repo.fork ? "Fork" : "Project"}</p>
      <div class="project-title-row"><h3>${escapeText(repo.name)}</h3><span class="repository-badge">${repo.private ? "Private" : "Public"}</span></div>
      <p class="project-description">${escapeText(repo.description || "这个仓库还没有描述。")}</p>
      ${topics ? `<div class="topics">${topics}</div>` : ""}
    </div>
    <div class="project-meta">
      <span><i class="language-dot" style="--language-color:${languageColor(repo.language)}"></i>${escapeText(repo.language || "Other")}</span>
      <span>★ ${formatCount(repo.stargazers_count)}</span>
      <span>⑂ ${formatCount(repo.forks_count)}</span>
      <time datetime="${escapeText(repo.pushed_at || "")}">${relativeDate(repo.pushed_at)}</time>
    </div>
  </article>`;
}

function renderRepositoryControls() {
  const filters = $("#language-filters");
  const count = $("#repo-result-count");
  const list = $("#project-list");
  if (!filters || !count || !list) return;
  const languages = [...new Set(repositoryCatalog.map((repo) => repo.language).filter(Boolean))].sort();
  filters.innerHTML = ["all", ...languages].map((language) => `<button class="filter-button${repositoryLanguage === language ? " active" : ""}" type="button" data-language="${escapeText(language)}">${language === "all" ? "全部" : escapeText(language)}</button>`).join("");
  const visible = repositoryCatalog.filter((repo) => {
    const searchable = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
    return (repositoryLanguage === "all" || repo.language === repositoryLanguage) && searchable.includes(repositoryQuery);
  });
  count.textContent = `${visible.length} / ${repositoryCatalog.length} 个仓库`;
  list.innerHTML = visible.length ? visible.map(buildRepositoryCard).join("") : `<p class="repo-empty">没有匹配当前条件的仓库。</p>`;
  filters.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => {
    repositoryLanguage = button.dataset.language || "all";
    renderRepositoryControls();
  }));
  list.querySelectorAll("[data-repository-id]").forEach((card) => {
    const repo = visible.find((item) => String(item.id) === card.dataset.repositoryId);
    if (!repo) return;
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--bar-origin", event.clientX - rect.left < rect.width / 2 ? "left" : "right");
    });
    card.addEventListener("click", () => openRepositoryDetails(repo, card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openRepositoryDetails(repo, card);
      }
    });
  });
}

function initializeRepositoryExplorer(repos) {
  repositoryCatalog = [...repos]
    .filter((repo) => !repo.fork || repo.name === "DevInfo")
    .sort((a, b) => {
      if (a.name === "DevInfo") return -1;
      if (b.name === "DevInfo") return 1;
      return new Date(b.pushed_at) - new Date(a.pushed_at);
    })
    .slice(0, 24);
  const search = $("#repo-search");
  const clear = $("#repo-search-clear");
  search?.addEventListener("input", () => {
    repositoryQuery = search.value.trim().toLowerCase();
    if (clear) clear.hidden = !repositoryQuery;
    renderRepositoryControls();
  });
  clear?.addEventListener("click", () => {
    search.value = "";
    repositoryQuery = "";
    clear.hidden = true;
    renderRepositoryControls();
    search.focus();
  });
  renderRepositoryControls();
}

function buildMorphMarkup(repo) {
  const details = [
    ["语言", repo.language ? `<span><i class="language-dot" style="--language-color:${languageColor(repo.language)}"></i>${escapeText(repo.language)}</span>` : "-"],
    ["License", repo.license?.spdx_id || repo.license?.name || "-"],
    ["创建于", formatDate(repo.created_at)],
    ["最近推送", formatDate(repo.pushed_at)],
  ];
  const topics = (repo.topics || []).map((topic) => `<span class="morph-topic">${escapeText(topic)}</span>`).join("");
  return `<div class="morph-head"><div><p class="morph-label">${escapeText(repo.language || "Repository")} / ${repo.fork ? "Fork" : "Project"}</p><h2 class="morph-title">${escapeText(repo.name)}</h2></div><button class="icon-button morph-close" type="button" aria-label="关闭详情" title="关闭详情">×</button></div>
    <p class="morph-description">${escapeText(repo.description || "这个仓库还没有描述。")}</p>
    ${topics ? `<div class="morph-topics">${topics}</div>` : ""}
    <div class="morph-stats"><div><strong>${formatCount(repo.stargazers_count)}</strong><span>Stars</span></div><div><strong>${formatCount(repo.forks_count)}</strong><span>Forks</span></div><div><strong>${formatCount(repo.watchers_count)}</strong><span>Watchers</span></div><div><strong>${formatCount(repo.open_issues_count)}</strong><span>Issues</span></div></div>
    <dl class="morph-facts">${details.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
    <div class="morph-actions"><a class="button primary" href="${escapeText(repo.html_url)}" target="_blank" rel="noreferrer">打开 GitHub ↗</a>${repo.homepage ? `<a class="button ghost" href="${escapeText(repo.homepage)}" target="_blank" rel="noreferrer">项目主页 ↗</a>` : ""}</div>`;
}

function forceCloseRepositoryDetails() {
  if (morphCloseTimer) window.clearTimeout(morphCloseTimer);
  if (morphState) morphState.overlay.remove();
  morphState = null;
  morphCloseTimer = null;
  morphClosing = false;
  document.body.classList.remove("modal-open");
}

function closeRepositoryDetails() {
  if (!morphState || morphClosing) return;
  morphClosing = true;
  const state = morphState;
  state.card.style.overflowY = "hidden";
  state.card.classList.remove("expanded");
  state.background.classList.remove("active");
  if (state.originRect) {
    state.card.style.left = `${state.originRect.left}px`;
    state.card.style.top = `${state.originRect.top}px`;
    state.card.style.width = `${state.originRect.width}px`;
    state.card.style.maxHeight = `${state.originRect.height}px`;
    state.card.style.borderRadius = "var(--radius)";
    state.card.style.boxShadow = "none";
  } else {
    state.card.style.opacity = "0";
  }
  morphCloseTimer = window.setTimeout(() => {
    if (morphState === state) {
      state.overlay.remove();
      morphState = null;
      document.body.classList.remove("modal-open");
      state.source?.focus();
    } else if (state.overlay.parentNode) {
      state.overlay.remove();
    }
    morphClosing = false;
    morphCloseTimer = null;
  }, 560);
}

function openRepositoryDetails(repo, source) {
  forceCloseRepositoryDetails();
  const originRect = source?.getBoundingClientRect() || null;
  const width = Math.min(600, window.innerWidth - 48);
  const left = (window.innerWidth - width) / 2;
  const initialTop = window.innerHeight * 0.08;
  const overlay = document.createElement("div");
  overlay.className = "morph-overlay";
  const background = document.createElement("div");
  background.className = "morph-bg";
  const card = document.createElement("section");
  card.className = "morph-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "morph-title");
  card.tabIndex = -1;
  if (originRect) {
    card.style.cssText = `left:${originRect.left}px;top:${originRect.top}px;width:${originRect.width}px;max-height:${originRect.height}px;border-radius:var(--radius)`;
  } else {
    card.style.cssText = `left:${left}px;top:${initialTop}px;width:${width}px;max-height:84vh;border-radius:20px`;
  }
  card.innerHTML = `<div class="morph-bar"></div><div class="morph-inner">${buildMorphMarkup(repo)}</div>`;
  overlay.append(background, card);
  document.body.append(overlay);
  card.querySelector(".morph-title")?.setAttribute("id", "morph-title");
  const initialStyles = card.style.cssText;
  card.style.width = `${width}px`;
  card.style.maxHeight = "none";
  const targetHeight = Math.min(Math.ceil(card.scrollHeight), Math.floor(window.innerHeight * 0.84));
  card.style.cssText = initialStyles;
  const top = Math.max(16, (window.innerHeight - targetHeight) / 2);
  document.body.classList.add("modal-open");
  morphState = { overlay, card, background, originRect, source, targetHeight, top };
  requestAnimationFrame(() => requestAnimationFrame(() => {
    background.classList.add("active");
    card.classList.add("expanded");
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.width = `${width}px`;
    card.style.maxHeight = `${targetHeight}px`;
    card.style.borderRadius = "20px";
    card.style.boxShadow = "0 30px 80px -20px rgba(0,0,0,.5)";
  }));
  const onEnd = (event) => {
    if (event.propertyName !== "max-height") return;
    card.style.overflowY = "auto";
    card.removeEventListener("transitionend", onEnd);
  };
  card.addEventListener("transitionend", onEnd);
  card.querySelector(".morph-close")?.addEventListener("click", closeRepositoryDetails);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target === background) closeRepositoryDetails();
  });
  card.querySelector(".morph-close")?.focus();
}

function buildCurvePath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middle = (previous.x + current.x) / 2;
    parts.push(`C ${middle} ${previous.y}, ${middle} ${current.y}, ${current.x} ${current.y}`);
  }
  return parts.join(" ");
}

function renderChart(items) {
  const chart = $("#commit-chart");
  const area = $("#chart-area");
  const curve = $("#chart-curve");
  const dots = $("#chart-dots");
  if (!chart || !area || !curve || !dots) return;
  const counts = new Map();
  items.filter((item) => item.date).forEach((item) => {
    const day = item.date.slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  });
  const days = [...counts.keys()].sort();
  if (!days.length) return;
  const values = days.map((day) => counts.get(day));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = days.map((day, index) => ({ x: days.length === 1 ? 84 : 84 + (620 * index) / (days.length - 1), y: 204 - (max === min ? 0.5 : (counts.get(day) - min) / (max - min)) * 166 }));
  const path = buildCurvePath(points);
  area.setAttribute("d", `${path} L 704 204 L 84 204 Z`);
  curve.setAttribute("d", path);
  dots.innerHTML = points.map((point, index) => `<circle class="dot${index === points.length - 1 ? " hot" : ""}" cx="${point.x}" cy="${point.y}" r="${index === points.length - 1 ? 6 : 5}" />`).join("");
  $("#chart-label-left").textContent = days[0];
  $("#chart-label-right").textContent = days[days.length - 1];
  $("#chart-value-top").textContent = max;
  $("#chart-value-bottom").textContent = min;
}

function renderCommitList(items) {
  const list = $("#commit-list");
  if (!list) return;
  list.innerHTML = items.filter((item) => item.date).slice(0, 3).map((item) => `<article><span>${escapeText(formatDate(item.date))}</span><strong>${escapeText(item.message)}</strong></article>`).join("");
}

async function loadHome() {
  const userResult = await fetchJson(`https://api.github.com/users/${OWNER}`);
  const reposResult = await fetchJson(`https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`);
  const user = userResult;
  const repos = reposResult;
  const avatar = $("#avatar");
  if (avatar) avatar.src = user.avatar_url;
  $("#profile-name").textContent = user.name || user.login;
  $("#profile-link").textContent = `@${user.login}`;
  $("#profile-bio").textContent = user.bio || "持续构建 Android、Kotlin、设备信息工具和自动化相关项目。";
  $("#public-repos").textContent = formatCount(user.public_repos ?? repos.length);
  $("#followers").textContent = formatCount(user.followers);
  $("#total-stars").textContent = formatCount(repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0));
  $("#total-forks").textContent = formatCount(repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0));
  initializeRepositoryExplorer(repos);
  try {
    const commits = await fetchJson(`https://api.github.com/repos/${DEVINFO}/commits?per_page=30`);
    const items = commits.map((item) => ({ date: item.commit?.author?.date, message: item.commit?.message || item.sha }));
    renderChart(items);
    renderCommitList(items);
  } catch (_) {
    // The homepage does not depend on the optional commit feed.
  }
}

async function loadProjectPage() {
  const repo = await fetchJson(`https://api.github.com/repos/${DEVINFO}`);
  const commits = await fetchJson(`https://api.github.com/repos/${DEVINFO}/commits?per_page=30`);
  const fields = { "repo-language": repo.language || "-", "repo-stars": repo.stargazers_count ?? "-", "repo-forks": repo.forks_count ?? "-", "repo-issues": repo.open_issues_count ?? "-", "repo-license": repo.license?.spdx_id || repo.license?.name || "-", "repo-pushed-at": formatDate(repo.pushed_at) };
  Object.entries(fields).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = String(value); });
  const items = commits.map((item) => ({ date: item.commit?.author?.date, message: item.commit?.message || item.sha }));
  renderChart(items);
  renderCommitList(items);
}

initializeReveal();
initializeNavigation();
initializeHeatmapTooltip();
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeRepositoryDetails();
});

(async () => {
  try {
    if (document.getElementById("project-list")) {
      await Promise.all([loadHome(), loadContributions()]);
    } else if (document.getElementById("repo-language")) {
      await loadProjectPage();
    }
  } catch (error) {
    console.error(error);
    const list = $("#project-list");
    if (list) list.innerHTML = `<p class="repo-empty">GitHub 数据暂时无法读取，请稍后刷新。</p>`;
    const total = $("#contribution-total");
    if (total) total.textContent = "-";
  }
})();
