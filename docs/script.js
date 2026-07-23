const state = { filter: "all", query: "" };
const technicalTags = new Set(["Python", "JavaScript", "CSS", "HTML", "建站", "开发", "技术", "Markdown", "Web 开发"]);
const notesTags = new Set(["随想", "生活", "学习", "记录"]);

function normalize(value) {
  return String(value || "").toLocaleLowerCase();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function matchesFilter(post, filter) {
  if (filter === "all") return true;
  const taxonomy = filter === "technical" ? technicalTags : notesTags;
  return (post.tags || []).some((tag) => taxonomy.has(tag));
}

function filterPosts() {
  const query = normalize(state.query);
  return posts.filter((post) => {
    const searchable = [post.title, post.summary, ...(post.tags || [])].map(normalize).join(" ");
    return matchesFilter(post, state.filter) && searchable.includes(query);
  });
}

function postMarkup(post) {
  const author = post.author || {};
  const tags = (post.tags || []).map((tag) => {
    const safeTag = escapeHtml(tag);
    return `<button class="tag" type="button" data-tag="${safeTag}">#${safeTag}</button>`;
  }).join("");
  const title = escapeHtml(post.title);
  const summary = escapeHtml(post.summary);
  const url = escapeHtml(post.url);
  const date = escapeHtml(post.date);
  const authorName = escapeHtml(author.name);
  const authorHandle = escapeHtml(author.handle);

  return `<article class="post-item">
    <div class="post-meta"><span class="avatar" aria-hidden="true">Y</span><span><strong>${authorName}</strong> <span>${authorHandle}</span> · <time datetime="${date}">${date}</time></span></div>
    <a class="post-link" href="${url}"><h2>${title}</h2><p>${summary}</p></a>
    <div class="post-tags">${tags}</div>
    <div class="post-actions"><a class="read-action" href="${url}">阅读文章 <span aria-hidden="true">→</span></a><button class="copy-action" type="button" data-url="${url}">复制链接</button></div>
  </article>`;
}

function renderPosts(filteredPosts) {
  const list = document.getElementById("postsList");
  if (!list) return;
  list.setAttribute("aria-busy", "false");
  list.innerHTML = filteredPosts.length
    ? filteredPosts.map(postMarkup).join("")
    : '<section class="empty-state"><h2>没有匹配的文章</h2><p>试试清除筛选或搜索其他关键词。</p><button type="button" id="clearFilters">清除筛选</button></section>';
}

function renderTags() {
  const tagCloud = document.getElementById("tagCloud");
  if (!tagCloud) return;
  tagCloud.innerHTML = popularTags.map((tag) => {
    const safeTag = escapeHtml(tag);
    return `<button class="tag" type="button" data-tag="${safeTag}">#${safeTag}</button>`;
  }).join("");
}

function renderArchive() {
  const archive = document.getElementById("archiveList");
  if (!archive) return;
  const counts = new Map();
  posts.forEach((post) => {
    const month = String(post.date || "").slice(0, 7);
    if (month) counts.set(month, (counts.get(month) || 0) + 1);
  });
  archive.innerHTML = [...counts.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([month, count]) => (
    `<a href="#articles">${escapeHtml(month)} <span>${count}</span></a>`
  )).join("");
}

function renderRecentPosts() {
  const recent = document.getElementById("recentPosts");
  if (!recent) return;
  recent.innerHTML = posts.slice(0, 5).map((post) => (
    `<li><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></li>`
  )).join("");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 1800);
}

async function copyPostLink(url) {
  const absoluteUrl = new URL(url, window.location.href).href;
  try {
    await navigator.clipboard.writeText(absoluteUrl);
    showToast("链接已复制");
  } catch {
    showToast("无法复制链接");
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", nextTheme);
  document.querySelectorAll("#themeToggle, #themeToggleDesktop").forEach((button) => {
    button.textContent = nextTheme === "dark" ? "◐" : "☀";
  });
}

function toggleTheme() {
  const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem("blog-theme", nextTheme);
}

function updateActiveTabs() {
  document.querySelectorAll(".topic-tab").forEach((tab) => {
    const active = tab.dataset.filter === state.filter;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
}

function renderCurrentView() {
  renderPosts(filterPosts());
  renderTags();
  renderArchive();
  renderRecentPosts();
  updateActiveTabs();
}

function setTagFilter(tag) {
  state.filter = "all";
  state.query = tag;
  const search = document.getElementById("postSearch");
  if (search) search.value = tag;
  renderCurrentView();
  document.getElementById("articles")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function registerInteractions() {
  document.querySelectorAll(".topic-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.filter = tab.dataset.filter || "all";
      renderCurrentView();
    });
  });

  const searchPanel = document.getElementById("searchPanel");
  const searchInput = document.getElementById("postSearch");
  document.getElementById("searchToggle")?.addEventListener("click", () => {
    searchPanel.hidden = !searchPanel.hidden;
    if (!searchPanel.hidden) searchInput.focus();
  });
  document.querySelector('[data-view="search"]')?.addEventListener("click", () => {
    searchPanel.hidden = false;
    searchInput.focus();
  });
  searchInput?.addEventListener("input", () => {
    state.query = searchInput.value;
    renderCurrentView();
  });

  document.addEventListener("click", (event) => {
    const tag = event.target.closest("[data-tag]");
    if (tag) setTagFilter(tag.dataset.tag || "");

    const copy = event.target.closest("[data-url]");
    if (copy) copyPostLink(copy.dataset.url || "");

    if (event.target.closest("#clearFilters")) {
      state.filter = "all";
      state.query = "";
      if (searchInput) searchInput.value = "";
      renderCurrentView();
    }
  });

  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
  document.getElementById("themeToggleDesktop")?.addEventListener("click", toggleTheme);
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(localStorage.getItem("blog-theme") || "dark");
  renderCurrentView();
  registerInteractions();
});