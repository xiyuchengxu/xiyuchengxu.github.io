// 主题切换功能
const themes = ['dark', 'light', 'sepia'];
let currentThemeIndex = 0;

// 初始化主题
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const themeIndex = themes.indexOf(savedTheme);
  currentThemeIndex = themeIndex >= 0 ? themeIndex : 0;
  document.documentElement.setAttribute('data-theme', themes[currentThemeIndex]);
  updateThemeIcon();
}

// 切换主题
function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const newTheme = themes[currentThemeIndex];
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon();
}

// 更新主题图标
function updateThemeIcon() {
  const theme = themes[currentThemeIndex];
  const icons = document.querySelectorAll('.theme-icon');
  
  icons.forEach(icon => {
    if (theme === 'dark') {
      // 月亮图标
      icon.innerHTML = '<path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/>';
    } else if (theme === 'light') {
      // 太阳图标
      icon.innerHTML = '<path d="M12,18c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S15.3,18,12,18zM12,8c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4c2.2,0,4-1.8,4-4C16,9.8,14.2,8,12,8z"/><path d="M12,4c-0.6,0-1-0.4-1-1V1c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,3.6,12.6,4,12,4z"/><path d="M12,24c-0.6,0-1-0.4-1-1v-2c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,23.6,12.6,24,12,24z"/><path d="M5.6,6.6c-0.3,0-0.5-0.1-0.7-0.3L3.5,4.9c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C6.2,6.5,5.9,6.6,5.6,6.6z"/><path d="M19.8,20.8c-0.3,0-0.5-0.1-0.7-0.3l-1.4-1.4c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C20.3,20.7,20,20.8,19.8,20.8z"/><path d="M3,13H1c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S3.6,13,3,13z"/><path d="M23,13h-2c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S23.6,13,23,13z"/><path d="M4.2,20.8c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C4.7,20.7,4.5,20.8,4.2,20.8z"/><path d="M18.4,6.6c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C18.9,6.5,18.6,6.6,18.4,6.6z"/>';
    } else {
      // Sepia 图标（书本）
      icon.innerHTML = '<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>';
    }
  });
}

// 渲染博文列表
function renderPosts() {
  const postsList = document.getElementById('postsList');
  
  const postsHTML = posts.map(post => `
    <article class="post-card">
      <div class="post-header">
        <div class="avatar"></div>
        <div class="post-info">
          <div class="author-line">
            <span class="author-name">${post.author.name}</span>
            ${post.author.verified ? `
              <span class="verified-badge">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/></svg>
              </span>
            ` : ''}
            <span class="author-handle">${post.author.handle}</span>
            <span class="post-date">${post.date}</span>
          </div>
        </div>
      </div>
      
      <div class="post-content">${post.content}</div>
      
      <div class="post-tags">
        ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
      </div>
      
      <div class="post-actions">
        <button class="action-btn reply-btn" data-id="${post.id}">
          <svg viewBox="0 0 24 24"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg>
          <span>${post.stats.replies}</span>
        </button>
        
        <button class="action-btn repost-btn" data-id="${post.id}">
          <svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          <span>${post.stats.reposts}</span>
        </button>
        
        <button class="action-btn like-btn" data-id="${post.id}">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span class="like-count">${post.stats.likes}</span>
        </button>
      </div>
    </article>
  `).join('');
  
  postsList.innerHTML = postsHTML;
  
  // 添加点赞事件监听
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', handleLike);
  });
}

// 点赞功能
function handleLike(e) {
  const btn = e.currentTarget;
  const isLiked = btn.classList.contains('liked');
  const likeCount = btn.querySelector('.like-count');
  let count = parseInt(likeCount.textContent);
  
  if (isLiked) {
    btn.classList.remove('liked');
    likeCount.textContent = count - 1;
  } else {
    btn.classList.add('liked');
    likeCount.textContent = count + 1;
  }
}

// 渲染标签云
function renderTags() {
  const tagCloud = document.getElementById('tagCloud');
  if (tagCloud) {
    const tagsHTML = popularTags.map(tag => 
      `<span class="tag">#${tag}</span>`
    ).join('');
    tagCloud.innerHTML = tagsHTML;
  }
}

// 标签切换功能
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // 这里可以根据不同 tab 过滤博文
    });
  });
}

// 底部导航切换
function initBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderPosts();
  renderTags();
  initTabs();
  initBottomNav();
  
  // 主题切换按钮事件
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('themeToggleDesktop')?.addEventListener('click', toggleTheme);
});