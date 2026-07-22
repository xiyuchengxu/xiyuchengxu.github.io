// 博文数据
const posts = [
  {
    id: 1,
    author: {
      name: "YuCheng",
      handle: "@xiyuchengxu",
      verified: true
    },
    date: "2024-01-15",
    content: "今天成功搭建了这个 X 风格的博客！使用了从 thisblog.me 提取的完整设计系统，包括三套主题、响应式布局和流畅的交互动画。\n\n接下来计划添加 Markdown 支持和评论功能。",
    tags: ["建站", "设计", "Web开发"],
    stats: {
      replies: 5,
      reposts: 12,
      likes: 48
    }
  },
  {
    id: 2,
    author: {
      name: "YuCheng",
      handle: "@xiyuchengxu",
      verified: true
    },
    date: "2024-01-14",
    content: "分享一个有趣的发现：X (Twitter) 的设计语言非常适合博客展示。\n\n关键特点：\n• 信息密度高但不拥挤\n• 卡片式布局易于浏览\n• 交互反馈即时清晰\n• 响应式设计优雅\n\n这种设计让内容成为焦点，而不是过度装饰。",
    tags: ["设计思考", "UI/UX"],
    stats: {
      replies: 8,
      reposts: 23,
      likes: 67
    }
  },
  {
    id: 3,
    author: {
      name: "YuCheng",
      handle: "@xiyuchengxu",
      verified: true
    },
    date: "2024-01-13",
    content: "学习笔记：CSS 自定义属性（CSS Variables）真的很强大！\n\n通过 data-theme 属性切换，可以轻松实现多主题支持。这个博客就实现了深色、浅色和 Sepia 三套主题。\n\n代码示例：\n:root { --bg: #000; }\n[data-theme=\"light\"] { --bg: #fff; }",
    tags: ["CSS", "前端", "学习笔记"],
    stats: {
      replies: 3,
      reposts: 15,
      likes: 52
    }
  }
];

// 热门标签
const popularTags = [
  "建站", "设计", "Web开发", "CSS", "前端",
  "学习笔记", "UI/UX", "设计思考", "JavaScript"
];