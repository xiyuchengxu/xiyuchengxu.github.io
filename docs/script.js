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

function getPosts() {
  return typeof posts === "undefined" ? [] : [...posts].sort((left, right) => right.date.localeCompare(left.date));
}

function getSelectedQuery(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function getTagCounts(posts) {
  return posts
    .flatMap((post) => post.tags || [])
    .reduce((counts, tag) => counts.set(tag, (counts.get(tag) || 0) + 1), new Map());
}

function groupPostsByMonth(posts) {
  return posts.reduce((groups, post) => {
    const month = post.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), post]);
    return groups;
  }, new Map());
}

function tagUrl(tag) {
  return `tags.html?tag=${encodeURIComponent(tag)}`;
}

function archiveUrl(month) {
  return `archive.html?month=${encodeURIComponent(month)}`;
}

function postMarkup(post) {
  const author = post.author || {};
  const tags = (post.tags || []).map((tag) => (
    `<a class="tag" href="${tagUrl(tag)}">#${escapeHtml(tag)}</a>`
  )).join("");
  const title = escapeHtml(post.title);
  const summary = escapeHtml(post.summary);
  const url = escapeHtml(post.url);
  const date = escapeHtml(post.date);
  const authorName = escapeHtml(author.name || "YuCheng");
  const authorHandle = escapeHtml(author.handle || "");
  const postId = escapeHtml(String(post.id));

  return `<article class="post-item" data-post-id="${postId}">
    <div class="post-avatar-column" aria-hidden="true">
      <span class="avatar">Y</span>
    </div>
    <div class="post-content">
      <div class="post-meta">
        <strong>${authorName}</strong>
        <span>${authorHandle}</span>
        <span aria-hidden="true">·</span>
        <time datetime="${date}">${date}</time>
      </div>
      <a class="post-link" href="${url}">
        <h2>${title}</h2>
        <p>${summary}</p>
      </a>
      <div class="post-tags">${tags}</div>
      <div class="post-actions" role="group" aria-label="文章互动">
        <button class="post-action" type="button" data-post-action="comment" data-post-id="${postId}" disabled aria-label="评论功能暂未开放" title="评论功能暂未开放">
          <svg aria-hidden="true"><use href="icons.svg#icon-comment"></use></svg>
        </button>
        <button class="post-action" type="button" data-post-action="repost" data-post-id="${postId}" data-post-url="${url}" aria-label="转发并复制链接" title="转发并复制链接">
          <svg aria-hidden="true"><use href="icons.svg#icon-repost"></use></svg>
        </button>
        <button class="post-action" type="button" data-post-action="like" data-post-id="${postId}" disabled aria-label="点赞功能暂未开放" title="点赞功能暂未开放">
          <svg aria-hidden="true"><use href="icons.svg#icon-like"></use></svg>
        </button>
        <span class="post-metric" data-engagement="views" data-post-id="${postId}" role="img" aria-label="阅读量暂未统计" title="阅读量暂未统计">
          <svg aria-hidden="true"><use href="icons.svg#icon-views"></use></svg>
        </span>
      </div>
    </div>
  </article>`;
}

function renderEmptyState(title, body, clearUrl) {
  const action = clearUrl ? `<a class="clear-action" href="${clearUrl}">清除筛选</a>` : "";
  return `<section class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>${action}</section>`;
}

function renderPosts(filteredPosts) {
  const list = document.getElementById("pageContent");
  if (!list) return;
  list.setAttribute("aria-busy", "false");
  list.innerHTML = filteredPosts.length
    ? filteredPosts.map(postMarkup).join("")
    : renderEmptyState("没有匹配的文章", "试试清除筛选或搜索其他关键词。", "search.html");
}

function matchesFilter(post, filter) {
  const query = normalize(filter);
  if (!query) return true;
  return [post.title, post.summary, ...(post.tags || [])].map(normalize).join(" ").includes(query);
}

function filterPosts() {
  return getPosts().filter((post) => matchesFilter(post, getSelectedQuery("q")));
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
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
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = nextTheme === "dark" ? "◐" : "☀";
  });
}

function applyStoredTheme() {
  applyTheme(localStorage.getItem("blog-theme") || "dark");
}

function bindThemeButtons() {
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      localStorage.setItem("blog-theme", nextTheme);
    });
  });
}

function bindArticleActions() {
  document.addEventListener("click", (event) => {
    const repost = event.target.closest('[data-post-action="repost"]');
    if (repost) copyPostLink(repost.dataset.postUrl || "");
  });
}

function renderRightRail(postList) {
  const rail = document.getElementById("rightRail");
  if (!rail) return;
  const tags = [...getTagCounts(postList).entries()]
    .sort(([leftTag, leftCount], [rightTag, rightCount]) => rightCount - leftCount || leftTag.localeCompare(rightTag))
    .slice(0, 8)
    .map(([tag, count]) => `<a class="tag" href="${tagUrl(tag)}">#${escapeHtml(tag)} <span>${count}</span></a>`)
    .join("");
  const months = [...groupPostsByMonth(postList).entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 6)
    .map(([month, monthPosts]) => `<li><a href="${archiveUrl(month)}">${escapeHtml(month)} <span>${monthPosts.length}</span></a></li>`)
    .join("");
  const recent = postList.slice(0, 5)
    .map((post) => `<li><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></li>`)
    .join("");

  rail.innerHTML = `<section class="author-summary"><p class="eyebrow">作者</p><h2>YuCheng</h2><p>记录编程、建站与持续学习。</p><a href="about.html">了解更多</a></section>
    <section><h2>标签</h2><div class="tag-list">${tags}</div><a class="rail-more" href="tags.html">查看全部标签</a></section>
    <section><h2>归档</h2><ol class="archive-list">${months}</ol><a class="rail-more" href="archive.html">查看全部归档</a></section>
    <section><h2>最近文章</h2><ol class="recent-posts">${recent}</ol></section>`;
}

function initHomePage() {
  const postList = getPosts();
  renderPosts(postList);
  renderRightRail(postList);
}

function initSearchPage() {
  const searchInput = document.getElementById("postSearch");
  if (!searchInput) return;
  const searchParams = new URLSearchParams(window.location.search);
  const updateResults = () => {
    const query = searchInput.value.trim();
    const results = getPosts().filter((post) => matchesFilter(post, query));
    const list = document.getElementById("pageContent");
    if (!list) return;
    list.setAttribute("aria-busy", "false");
    list.innerHTML = results.length
      ? results.map(postMarkup).join("")
      : renderEmptyState("没有匹配的文章", "试试其他关键词。", "search.html");
  };
  searchInput.value = searchParams.get("q") || "";
  searchInput.addEventListener("input", updateResults);
  updateResults();
  searchInput.focus();
}

function initArchivePage() {
  const postList = getPosts();
  const selectedMonth = getSelectedQuery("month");
  const groups = groupPostsByMonth(postList);
  const list = document.getElementById("pageContent");
  if (!list) return;
  list.setAttribute("aria-busy", "false");
  if (selectedMonth && !groups.has(selectedMonth)) {
    list.innerHTML = renderEmptyState("没有对应归档", "该月份没有文章。", "archive.html");
    return;
  }
  const visibleGroups = selectedMonth ? [[selectedMonth, groups.get(selectedMonth)]] : [...groups.entries()].sort(([left], [right]) => right.localeCompare(left));
  list.innerHTML = visibleGroups.map(([month, monthPosts]) => (
    `<section class="archive-group"><h2>${escapeHtml(month)}</h2><ol>${monthPosts.map((post) => `<li><time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></li>`).join("")}</ol></section>`
  )).join("");
}

function initTagsPage() {
  const postList = getPosts();
  const selectedTag = getSelectedQuery("tag");
  const counts = [...getTagCounts(postList).entries()]
    .sort(([leftTag, leftCount], [rightTag, rightCount]) => rightCount - leftCount || leftTag.localeCompare(rightTag));
  const list = document.getElementById("pageContent");
  if (!list) return;
  list.setAttribute("aria-busy", "false");
  const tagLinks = `<div class="tag-list tag-directory">${counts.map(([tag, count]) => `<a class="tag" href="${tagUrl(tag)}">#${escapeHtml(tag)} <span>${count}</span></a>`).join("")}</div>`;
  if (!selectedTag) {
    list.innerHTML = tagLinks;
    return;
  }
  const matchingPosts = postList.filter((post) => (post.tags || []).includes(selectedTag));
  const resultMarkup = matchingPosts.length
    ? matchingPosts.map(postMarkup).join("")
    : renderEmptyState("没有匹配的文章", `没有带有 #${selectedTag} 的文章。`, "tags.html");
  list.innerHTML = `${tagLinks}<section class="tag-results"><h2>#${escapeHtml(selectedTag)}</h2>${resultMarkup}</section>`;
}

function initAboutPage() {
  // The static about page only needs shared theme and navigation behavior.
}

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();
  bindThemeButtons();
  bindArticleActions();
  const page = document.body.dataset.page;
  const initializers = {
    home: initHomePage,
    search: initSearchPage,
    archive: initArchivePage,
    tags: initTagsPage,
    about: initAboutPage,
  };
  initializers[page]?.();
});