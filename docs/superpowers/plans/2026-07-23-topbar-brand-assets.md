# 首页顶部品牌栏实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 只把博客首页顶部栏改为左侧圆形头像、中间自适应主题的 Logo、右侧现有主题按钮，并保证 Logo 在桌面端与最窄 `320px` 视口中始终几何居中。

**架构：** 两张上传源图通过仅监听 `127.0.0.1` 的一次性本地传输进入开发工作树，再由现有 Playwright / Chromium Canvas 裁剪为仓库内 PNG 资产；源图和生成脚本均不进入版本库。首页使用三列对称 CSS Grid 和现有 `.visually-hidden` 语义标题，主题交互继续由未修改的 `docs/script.js` 驱动；静态契约负责文件与结构，Playwright 负责图片解码、几何、主题持久化和截图。

**技术栈：** 静态 HTML、CSS、原生 JavaScript、PNG、Python 标准库 `unittest`、Node.js、Playwright、系统 Chromium。

---

## 文件结构

- 创建：`docs/assets/site-logo.png`
  - 保存 `128 × 120px` 透明背景白色 Logo；浅色主题通过 CSS 滤镜显示为深色。
- 创建：`docs/assets/avatar.png`
  - 保存 `256 × 256px` 方形头像；页面以 `40 × 40px` 圆形显示。
- 修改：`docs/index.html:24-27`
  - 将首页可见文字标题栏替换为头像、视觉隐藏标题、居中 Logo 和原主题按钮。
- 修改：`docs/styles.css:150-182`
  - 增加首页专属三列 Grid、`44px` 命中区、头像、Logo、悬停和浅色主题规则。
- 修改：`tests/test_frontend_contract.py:1-179`
  - 增加无第三方依赖的 PNG 结构检查，以及首页结构、其他页面不变和 CSS 契约。
- 修改：`tests/visual.spec.mjs:1-70`
  - 增加资源解码、顶栏高度、几何居中、窄屏无重叠、主题持久化和滤镜断言。
- 修改：`tests/visual.spec.mjs-snapshots/desktop-home-linux.png`
  - 更新 `1440 × 1000` 桌面首页基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`
  - 更新 `390 × 844` 移动首页基线。

## 全局约束

- 在专用工作树 `/workspace/YuCheng_web/.worktrees/topbar-brand-assets` 和分支 `feature/topbar-brand-assets` 中执行。
- Logo 源图固定为 Termux 路径 `/data/data/com.termux/files/home/.aether/workspace/uploads/12569_8-1736929482.png`，SHA-256 为 `8d2e8afb1285dd0e03fa1d256a4d162b1700136753ca2e6e412aeaf8753e0ceb`。
- 头像源图固定为 Termux 路径 `/data/data/com.termux/files/home/.aether/workspace/uploads/6971_6-1718753706.jpg`，SHA-256 为 `ef0e96933d78e21ddec6c7fd13287b457e28dd28f03e17175343d71f3463b1fc`。
- 两张源图只允许进入 Alpine 的 `/tmp`；不得复制到仓库或提交。临时 HTTP 服务只监听 `127.0.0.1`，每个文件传输一次后立即退出。
- 不新增 npm、Python 或浏览器依赖。`npm ci` 只安装锁文件中已有的 `@playwright/test@1.54.1`。
- Python 测试与构建只依赖标准库，统一使用环境中的 `python3`；Playwright 使用 `playwright.config.mjs` 中已有的 `/usr/bin/chromium-browser`。
- 不修改 `docs/script.js`、`docs/search.html`、`docs/archive.html`、`docs/tags.html`、`docs/about.html`、文章内容、构建脚本、工作流或搜索 / 标签截图基线。
- 每个任务先观察预期失败，再写最少实现使测试通过，并单独提交。

### 任务 1：生成并固定本地品牌资产

**文件：**
- 创建：`docs/assets/site-logo.png`
- 创建：`docs/assets/avatar.png`
- 修改：`tests/test_frontend_contract.py`

- [ ] **步骤 1：编写失败的 PNG 资产契约**

在 `tests/test_frontend_contract.py` 顶部加入标准库导入，并在测试类之前加入可读取 Chromium Canvas RGBA PNG 的辅助函数：

```python
import struct
import unittest
import zlib
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _paeth_predictor(left, above, upper_left):
    estimate = left + above - upper_left
    left_distance = abs(estimate - left)
    above_distance = abs(estimate - above)
    upper_left_distance = abs(estimate - upper_left)
    if left_distance <= above_distance and left_distance <= upper_left_distance:
        return left
    if above_distance <= upper_left_distance:
        return above
    return upper_left


def _read_rgba_png(path):
    data = path.read_bytes()
    if data[:8] != PNG_SIGNATURE:
        raise ValueError(f"{path} is not a PNG")

    offset = 8
    header = None
    compressed = []
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        offset += 12 + length
        if chunk_type == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif chunk_type == b"IDAT":
            compressed.append(payload)
        elif chunk_type == b"IEND":
            break

    if header is None:
        raise ValueError(f"{path} has no IHDR chunk")
    width, height, bit_depth, color_type, compression, filter_method, interlace = header
    if (bit_depth, color_type, compression, filter_method, interlace) != (8, 6, 0, 0, 0):
        raise ValueError(f"{path} must be an 8-bit, non-interlaced RGBA PNG")

    raw = zlib.decompress(b"".join(compressed))
    bytes_per_pixel = 4
    stride = width * bytes_per_pixel
    if len(raw) != (stride + 1) * height:
        raise ValueError(f"{path} has an unexpected scanline length")

    decoded = bytearray()
    previous = bytearray(stride)
    cursor = 0
    for _ in range(height):
        filter_type = raw[cursor]
        cursor += 1
        scanline = bytearray(raw[cursor:cursor + stride])
        cursor += stride
        for index in range(stride):
            left = scanline[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            above = previous[index]
            upper_left = previous[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            if filter_type == 1:
                scanline[index] = (scanline[index] + left) & 0xFF
            elif filter_type == 2:
                scanline[index] = (scanline[index] + above) & 0xFF
            elif filter_type == 3:
                scanline[index] = (scanline[index] + ((left + above) // 2)) & 0xFF
            elif filter_type == 4:
                scanline[index] = (
                    scanline[index] + _paeth_predictor(left, above, upper_left)
                ) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"{path} uses unknown PNG filter {filter_type}")
        decoded.extend(scanline)
        previous = scanline

    return width, height, bytes(decoded)
```

在 `FrontendContractTests` 中加入资产测试：

```python
    def test_home_topbar_assets_are_valid_local_png_files(self):
        expected_sizes = {
            Path("docs/assets/site-logo.png"): (128, 120),
            Path("docs/assets/avatar.png"): (256, 256),
        }
        decoded_assets = {}
        for path, expected_size in expected_sizes.items():
            self.assertTrue(path.is_file(), f"{path} must exist")
            self.assertGreater(path.stat().st_size, 1_000, f"{path} must not be empty")
            width, height, rgba = _read_rgba_png(path)
            self.assertEqual((width, height), expected_size)
            decoded_assets[path] = (width, height, rgba)

        width, height, logo_rgba = decoded_assets[Path("docs/assets/site-logo.png")]
        alpha_at = lambda x, y: logo_rgba[((y * width + x) * 4) + 3]
        self.assertEqual(
            [alpha_at(0, 0), alpha_at(width - 1, 0), alpha_at(0, height - 1), alpha_at(width - 1, height - 1)],
            [0, 0, 0, 0],
        )
        self.assertGreater(max(logo_rgba[3::4]), 0)
```

- [ ] **步骤 2：运行资产测试确认红灯**

运行：

```bash
python3 -m unittest \
  tests.test_frontend_contract.FrontendContractTests.test_home_topbar_assets_are_valid_local_png_files -v
```

预期：FAIL，错误首先指出 `docs/assets/site-logo.png must exist`。

- [ ] **步骤 3：把已校验源图一次性传入 Alpine 的 `/tmp`**

先在 Termux 运行：

```bash
sha256sum \
  /data/data/com.termux/files/home/.aether/workspace/uploads/12569_8-1736929482.png \
  /data/data/com.termux/files/home/.aether/workspace/uploads/6971_6-1718753706.jpg
```

预期：输出与全局约束中的两个 SHA-256 完全一致。

以长运行方式在 Termux 启动一次性 Logo 服务：

```bash
/system/bin/toybox nc -s 127.0.0.1 -p 18765 -l sh -c '
source="/data/data/com.termux/files/home/.aether/workspace/uploads/12569_8-1736929482.png"
size=$(wc -c < "$source")
printf "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: %s\r\nConnection: close\r\n\r\n" "$size"
cat "$source"
'
```

保持该调用运行，并在 Alpine 下载；下载结束后 Termux 服务应以状态 `0` 退出：

```bash
curl --fail --silent --show-error --max-time 30 \
  http://127.0.0.1:18765/ \
  --output /tmp/topbar-logo-source.png
```

再以同样方式在 Termux 启动一次性头像服务：

```bash
/system/bin/toybox nc -s 127.0.0.1 -p 18766 -l sh -c '
source="/data/data/com.termux/files/home/.aether/workspace/uploads/6971_6-1718753706.jpg"
size=$(wc -c < "$source")
printf "HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: %s\r\nConnection: close\r\n\r\n" "$size"
cat "$source"
'
```

在 Alpine 下载并校验两个临时文件：

```bash
curl --fail --silent --show-error --max-time 30 \
  http://127.0.0.1:18766/ \
  --output /tmp/topbar-avatar-source.jpg
printf '%s  %s\n' \
  '8d2e8afb1285dd0e03fa1d256a4d162b1700136753ca2e6e412aeaf8753e0ceb' /tmp/topbar-logo-source.png \
  'ef0e96933d78e21ddec6c7fd13287b457e28dd28f03e17175343d71f3463b1fc' /tmp/topbar-avatar-source.jpg \
  | sha256sum --check --strict
```

预期：两个临时文件都输出 `OK`。任何校验失败都必须停止，不能继续生成资产。

- [ ] **步骤 4：使用现有 Chromium Canvas 生成两个 PNG**

安装锁文件中的现有 Node.js 开发依赖：

```bash
npm ci
```

预期：命令成功，`package.json` 和 `package-lock.json` 不发生变化。

使用文件写入工具在工作树根目录创建未跟踪的一次性脚本 `.generate-topbar-assets.mjs`。脚本必须位于仓库根目录，Node.js 才能按 ESM 解析规则找到同级 `node_modules` 中的 `@playwright/test`：

```javascript
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const assets = [
  {
    name: "site-logo",
    source: "/tmp/topbar-logo-source.png",
    mime: "image/png",
    sourceSize: { width: 1254, height: 1254 },
    crop: { left: 324, top: 355, right: 933, bottom: 926 },
    target: { width: 128, height: 120 },
    transparentMonochrome: true,
    output: resolve("docs/assets/site-logo.png"),
  },
  {
    name: "avatar",
    source: "/tmp/topbar-avatar-source.jpg",
    mime: "image/jpeg",
    sourceSize: { width: 1264, height: 1264 },
    crop: { left: 205, top: 75, right: 905, bottom: 775 },
    target: { width: 256, height: 256 },
    transparentMonochrome: false,
    output: resolve("docs/assets/avatar.png"),
  },
];

async function generateAsset(page, asset) {
  const source = await readFile(asset.source);
  const dataUrl = `data:${asset.mime};base64,${source.toString("base64")}`;
  const encodedPng = await page.evaluate(async ({ dataUrl, ...config }) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    if (
      image.naturalWidth !== config.sourceSize.width
      || image.naturalHeight !== config.sourceSize.height
    ) {
      throw new Error(
        `${config.name}: expected ${config.sourceSize.width}x${config.sourceSize.height}, `
        + `received ${image.naturalWidth}x${image.naturalHeight}`,
      );
    }

    const cropWidth = config.crop.right - config.crop.left;
    const cropHeight = config.crop.bottom - config.crop.top;
    if (
      config.crop.left < 0
      || config.crop.top < 0
      || config.crop.right > image.naturalWidth
      || config.crop.bottom > image.naturalHeight
    ) {
      throw new Error(`${config.name}: crop is outside the source image`);
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
    cropContext.drawImage(
      image,
      config.crop.left,
      config.crop.top,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    if (config.transparentMonochrome) {
      const pixels = cropContext.getImageData(0, 0, cropWidth, cropHeight);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const alpha = Math.max(
          pixels.data[index],
          pixels.data[index + 1],
          pixels.data[index + 2],
        );
        pixels.data[index] = 255;
        pixels.data[index + 1] = 255;
        pixels.data[index + 2] = 255;
        pixels.data[index + 3] = alpha > 8 ? alpha : 0;
      }
      cropContext.putImageData(pixels, 0, 0);
    }

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = config.target.width;
    outputCanvas.height = config.target.height;
    const outputContext = outputCanvas.getContext("2d");
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(
      cropCanvas,
      0,
      0,
      cropWidth,
      cropHeight,
      0,
      0,
      config.target.width,
      config.target.height,
    );
    return outputCanvas.toDataURL("image/png").replace(/^data:image/png;base64,/, "");
  }, { dataUrl, ...asset });

  await mkdir(dirname(asset.output), { recursive: true });
  await writeFile(asset.output, Buffer.from(encodedPng, "base64"));
  console.log(`${asset.name}: ${asset.target.width}x${asset.target.height}`);
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium-browser",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  for (const asset of assets) {
    await generateAsset(page, asset);
  }
} finally {
  await browser.close();
}
```

在工作树根目录运行并删除所有临时输入与脚本：

```bash
node .generate-topbar-assets.mjs
rm -f \
  .generate-topbar-assets.mjs \
  /tmp/topbar-logo-source.png \
  /tmp/topbar-avatar-source.jpg
```

预期：输出 `site-logo: 128x120` 和 `avatar: 256x256`；仓库中只新增 `docs/assets/site-logo.png` 与 `docs/assets/avatar.png`。

- [ ] **步骤 5：运行资产测试确认绿灯**

运行：

```bash
python3 -m unittest \
  tests.test_frontend_contract.FrontendContractTests.test_home_topbar_assets_are_valid_local_png_files -v
git diff --check
```

预期：资产测试 PASS；Logo 四角 Alpha 为 `0`，至少有一个像素 Alpha 大于 `0`；格式检查无输出。

- [ ] **步骤 6：提交生成资产与契约**

运行：

```bash
git add \
  docs/assets/site-logo.png \
  docs/assets/avatar.png \
  tests/test_frontend_contract.py
git commit -m "feat(博客): 添加首页品牌图片资产"
```

预期：提交只包含两个 PNG 和资产契约；源图、临时脚本、`node_modules`、`package.json` 与锁文件不在提交中。

### 任务 2：实现首页三列对称品牌栏

**文件：**
- 修改：`docs/index.html:24-27`
- 修改：`docs/styles.css:150-182`
- 修改：`tests/test_frontend_contract.py`

- [ ] **步骤 1：编写失败的首页结构、隔离范围与 CSS 契约**

在 `FrontendContractTests` 中新增以下测试：

```python
    def test_homepage_uses_accessible_three_slot_brand_bar(self):
        for snippet in (
            '<header class="timeline-header home-topbar" aria-label="首页顶部栏">',
            '<a class="topbar-avatar" href="about.html" aria-label="查看关于 YuCheng">',
            '<img src="assets/avatar.png" alt="" width="40" height="40">',
            '<h1 class="visually-hidden">YuCheng 的博客</h1>',
            '<a class="topbar-logo" href="index.html" aria-label="返回首页">',
            '<img src="assets/site-logo.png" alt="" width="128" height="120">',
            '<button class="icon-button topbar-theme" type="button" data-theme-toggle',
        ):
            self.assertIn(snippet, self.index)
        self.assertEqual(self.index.count('data-theme-toggle'), 1)
        self.assertEqual(self.index.count('YuCheng 的博客</h1>'), 1)

    def test_non_home_pages_keep_their_text_headers(self):
        page_titles = {
            "search.html": "搜索",
            "archive.html": "归档",
            "tags.html": "标签",
            "about.html": "关于",
        }
        for filename, title in page_titles.items():
            html = Path("docs", filename).read_text(encoding="utf-8")
            self.assertIn('<header class="timeline-header">', html)
            self.assertIn(f"<h1>{title}</h1>", html)
            self.assertNotIn("home-topbar", html)
            self.assertNotIn("topbar-avatar", html)
            self.assertNotIn("topbar-logo", html)

    def test_styles_define_centered_home_topbar_without_changing_shared_header(self):
        home_rules = self.styles.split(".timeline-header.home-topbar {", 1)[1].split("}", 1)[0]
        for snippet in (
            "display: grid",
            "grid-template-columns: 44px minmax(0, 1fr) 44px",
            "height: 56px",
            "min-height: 56px",
            "justify-content: normal",
            "gap: 0",
            "padding-block: 0",
        ):
            self.assertIn(snippet, home_rules)

        logo_rules = self.styles.split(".topbar-logo img {", 1)[1].split("}", 1)[0]
        for snippet in ("max-width: 44px", "height: 32px", "object-fit: contain"):
            self.assertIn(snippet, logo_rules)
        self.assertIn('[data-theme="light"] .topbar-logo img', self.styles)
        self.assertIn("filter: brightness(0)", self.styles)
```

将现有 `test_homepage_is_limited_to_post_stream_and_compact_header` 中的旧断言：

```python
self.assertIn('<h1>YuCheng 的博客</h1>', self.index)
```

替换为：

```python
self.assertIn('<h1 class="visually-hidden">YuCheng 的博客</h1>', self.index)
```

- [ ] **步骤 2：运行新契约确认红灯**

运行：

```bash
python3 -m unittest \
  tests.test_frontend_contract.FrontendContractTests.test_homepage_uses_accessible_three_slot_brand_bar \
  tests.test_frontend_contract.FrontendContractTests.test_non_home_pages_keep_their_text_headers \
  tests.test_frontend_contract.FrontendContractTests.test_styles_define_centered_home_topbar_without_changing_shared_header \
  tests.test_frontend_contract.FrontendContractTests.test_homepage_is_limited_to_post_stream_and_compact_header -v
```

预期：`test_non_home_pages_keep_their_text_headers` PASS；其余测试 FAIL，因为首页仍是可见文字标题且 CSS 中没有 `.home-topbar`。

- [ ] **步骤 3：替换首页顶部栏标记**

将 `docs/index.html` 当前 `.timeline-header` 替换为：

```html
<header class="timeline-header home-topbar" aria-label="首页顶部栏">
  <a class="topbar-avatar" href="about.html" aria-label="查看关于 YuCheng">
    <img src="assets/avatar.png" alt="" width="40" height="40">
  </a>
  <h1 class="visually-hidden">YuCheng 的博客</h1>
  <a class="topbar-logo" href="index.html" aria-label="返回首页">
    <img src="assets/site-logo.png" alt="" width="128" height="120">
  </a>
  <button class="icon-button topbar-theme" type="button" data-theme-toggle aria-label="切换主题" title="切换主题">◐</button>
</header>
```

不得修改页面 `<title>`、描述元信息、侧栏、文章列表、移动导航或脚本引用。

- [ ] **步骤 4：增加首页专属 Grid 与图片样式**

紧接 `docs/styles.css` 的通用 `.timeline-header` 规则后加入：

```css
.timeline-header.home-topbar {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  height: 56px;
  min-height: 56px;
  justify-content: normal;
  gap: 0;
  padding-block: 0;
}

.topbar-avatar,
.topbar-logo {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  text-decoration: none;
}

.topbar-avatar { grid-column: 1; }
.topbar-logo { grid-column: 2; justify-self: center; }
.topbar-theme { grid-column: 3; }

.topbar-avatar:hover,
.topbar-logo:hover { background: var(--surface-hover); }

.topbar-avatar img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 50%;
}

.topbar-logo img {
  display: block;
  width: auto;
  max-width: 44px;
  height: 32px;
  object-fit: contain;
}

[data-theme="light"] .topbar-logo img { filter: brightness(0); }
```

不修改通用 `.timeline-header`、`.icon-button` 或 `@media (max-width: 700px)` 规则。组合选择器 `.timeline-header.home-topbar` 的特异性会使 `56px` 首页高度覆盖后置的移动端 `52px` 通用最小高度。

- [ ] **步骤 5：运行前端契约确认绿灯**

运行：

```bash
python3 -m unittest tests.test_frontend_contract -v
node --check docs/script.js
git diff --check
```

预期：所有前端契约 PASS；`docs/script.js` 语法检查和格式检查无输出。

额外确认本任务未触碰其他页面或主题脚本：

```bash
git diff --exit-code -- \
  docs/search.html \
  docs/archive.html \
  docs/tags.html \
  docs/about.html \
  docs/script.js
```

预期：无输出，退出状态为 `0`。

- [ ] **步骤 6：提交首页结构和样式**

运行：

```bash
git add docs/index.html docs/styles.css tests/test_frontend_contract.py
git commit -m "feat(博客): 重构首页顶部品牌栏"
```

预期：提交只包含首页 HTML、共享样式表中的首页专属规则和静态契约更新。

### 任务 3：增加浏览器几何门禁并更新首页截图

**文件：**
- 修改：`tests/visual.spec.mjs`
- 修改：`tests/visual.spec.mjs-snapshots/desktop-home-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`

- [ ] **步骤 1：加入首页资源与几何辅助断言**

在 `tests/visual.spec.mjs` 的 `baseUrl` 后加入：

```javascript
async function expectHomeTopbarGeometry(page) {
  const avatarImage = page.locator(".topbar-avatar img");
  const logoImage = page.locator(".topbar-logo img");
  await avatarImage.evaluate((image) => image.decode());
  await logoImage.evaluate((image) => image.decode());
  await expect(avatarImage).toHaveJSProperty("naturalWidth", 256);
  await expect(avatarImage).toHaveJSProperty("naturalHeight", 256);
  await expect(logoImage).toHaveJSProperty("naturalWidth", 128);
  await expect(logoImage).toHaveJSProperty("naturalHeight", 120);

  const boxes = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    return {
      header: rect(".home-topbar"),
      avatar: rect(".topbar-avatar"),
      logo: rect(".topbar-logo"),
      logoImage: rect(".topbar-logo img"),
      theme: rect(".topbar-theme"),
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  for (const name of ["header", "avatar", "logo", "logoImage", "theme"]) {
    expect(boxes[name], `${name} must have a layout box`).not.toBeNull();
  }

  const headerCenter = boxes.header.left + (boxes.header.width / 2);
  const logoCenter = boxes.logoImage.left + (boxes.logoImage.width / 2);
  expect(Math.abs(headerCenter - logoCenter)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes.header.height - 56)).toBeLessThanOrEqual(0.5);
  expect(boxes.avatar.width).toBe(44);
  expect(boxes.logo.width).toBe(44);
  expect(boxes.theme.width).toBe(44);
  expect(boxes.avatar.right <= boxes.logo.left).toBeTruthy();
  expect(boxes.logo.right <= boxes.theme.left).toBeTruthy();
  expect(boxes.hasHorizontalOverflow).toBeFalsy();
}
```

- [ ] **步骤 2：把辅助断言接入桌面、移动和最窄视口测试**

在桌面首页测试中删除：

```javascript
await expect(page.locator(".timeline-header")).toContainText("YuCheng 的博客");
```

替换为：

```javascript
await expect(page.locator(".home-topbar h1")).toHaveAttribute("class", "visually-hidden");
await expect(page.locator(".home-topbar h1")).toHaveCSS("position", "absolute");
await expectHomeTopbarGeometry(page);
```

在现有移动首页测试完成 `page.goto` 后加入：

```javascript
await expectHomeTopbarGeometry(page);
```

在移动首页测试之后新增 `320 × 700` 测试：

```javascript
test("home topbar stays centered and persists its light theme at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("blog-theme"));
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".topbar-logo img")).toHaveCSS("filter", "none");
  await expectHomeTopbarGeometry(page);

  await page.locator(".topbar-theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".topbar-logo img")).toHaveCSS("filter", "brightness(0)");
  expect(await page.evaluate(() => localStorage.getItem("blog-theme"))).toBe("light");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".topbar-logo img")).toHaveCSS("filter", "brightness(0)");
  await expectHomeTopbarGeometry(page);
});
```

该新用例只做几何和交互验证，不创建第三张首页截图。

- [ ] **步骤 3：运行视觉套件确认旧首页基线红灯**

运行：

```bash
npm run test:visual
```

预期：新增 DOM、资源、几何和主题断言 PASS；桌面首页与移动首页两个截图比较 FAIL；搜索页和标签页截图比较 PASS。总用例数为 `5`。

- [ ] **步骤 4：只更新两张首页截图基线**

运行：

```bash
npm run test:visual -- \
  --update-snapshots \
  --grep "desktop home shows|mobile home navigation"
```

预期：只更新：

```text
tests/visual.spec.mjs-snapshots/desktop-home-linux.png
tests/visual.spec.mjs-snapshots/mobile-home-linux.png
```

搜索页和标签页基线不得变化。用以下命令确认：

```bash
git diff --exit-code -- \
  tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png \
  tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png
```

预期：无输出，退出状态为 `0`。

- [ ] **步骤 5：正常模式复跑完整视觉套件**

运行：

```bash
npm run test:visual
rm -rf test-results playwright-report
```

预期：`5 passed`；没有失败截图或 `test-results` 临时目录遗留。

- [ ] **步骤 6：提交视觉断言和首页基线**

运行：

```bash
git add \
  tests/visual.spec.mjs \
  tests/visual.spec.mjs-snapshots/desktop-home-linux.png \
  tests/visual.spec.mjs-snapshots/mobile-home-linux.png
git commit -m "test(博客): 固定首页品牌栏视觉布局"
```

预期：提交只包含一个 Playwright 测试文件和两张首页截图。

### 任务 4：执行完整集成验证

**文件：**
- 验证：`docs/assets/site-logo.png`
- 验证：`docs/assets/avatar.png`
- 验证：`docs/index.html`
- 验证：`docs/styles.css`
- 验证：`tests/test_frontend_contract.py`
- 验证：`tests/visual.spec.mjs`
- 验证：两张首页截图基线

- [ ] **步骤 1：运行完整 Python、JavaScript 和浏览器测试**

运行：

```bash
python3 -m unittest discover -s tests -v
PLAYWRIGHT_BROWSER=1 python3 \
  -m unittest discover -s tests -p 'test_visual_regression.py' -v
node --check docs/script.js
```

预期：全部 Python 测试 PASS；常规发现阶段只按既有条件跳过浏览器包装测试，显式浏览器阶段执行并 PASS；JavaScript 语法检查无输出。

- [ ] **步骤 2：运行构建和格式门禁**

运行：

```bash
python3 -m py_compile scripts/build.py
python3 scripts/build.py
git diff --check
```

预期：编译和构建成功；构建不产生额外已跟踪文件变化；格式检查无输出。

- [ ] **步骤 3：确认范围和提交历史**

确认明确排除的文件相对设计提交 `1660da4` 完全未变：

```bash
git diff --exit-code 1660da4 -- \
  docs/script.js \
  docs/search.html \
  docs/archive.html \
  docs/tags.html \
  docs/about.html \
  tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png \
  tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png
```

预期：无输出，退出状态为 `0`。

检查本功能提交后的文件清单：
清理 `npm ci` 和 Playwright 产生的未跟踪目录。本仓库当前没有忽略这些目录，因此必须在最终状态检查前执行：

```bash
rm -rf node_modules test-results playwright-report
```

预期：以下命令无输出，证明只清理了生成目录：

```bash
git status --short -- node_modules test-results playwright-report
```


```bash
git diff --name-only 1660da4..HEAD | sort
git log --oneline --decorate -5
git status --short
```

预期文件清单只包含：

```text
docs/assets/avatar.png
docs/assets/site-logo.png
docs/index.html
docs/styles.css
docs/superpowers/plans/2026-07-23-topbar-brand-assets.md
tests/test_frontend_contract.py
tests/visual.spec.mjs
tests/visual.spec.mjs-snapshots/desktop-home-linux.png
tests/visual.spec.mjs-snapshots/mobile-home-linux.png
```

预期历史包含计划提交和三个实现提交；`git status --short` 无输出。若构建、测试或截图生成留下未列出的文件，先判断来源并清理生成物，不能提交范围外变化。