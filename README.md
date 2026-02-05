# 女性主义谱系测评（静态站，无需构建）

## 本地预览
由于浏览器对 `file://` 下的 fetch 有限制，建议用一个本地静态服务器预览：

### 方式 A：Python
```bash
python -m http.server 8080
```
然后打开：`http://localhost:8080`

### 方式 B：Node
```bash
npx serve .
```

## 部署到 GitHub Pages（最简单）
1. 新建一个 GitHub 仓库（例如 `feminism-lineage-test`）
2. 把本项目所有文件直接推到仓库根目录
3. 进入仓库 Settings → Pages
4. Build and deployment:
   - Source: **Deploy from a branch**
   - Branch: **main**（或 master） / **/(root)**
5. 保存后，GitHub 会给你一个 Pages 链接（通常是 `https://<用户名>.github.io/<仓库名>/`）

## 自定义内容
- 题库：`/data/questions.json`
- 派别原型向量：`/data/types.json` → `ideals`
- 派别百科：`/data/types.json` → `types`

## 说明
- “派别分布”来自 6 轴形状匹配（理论谱系）
- “现实立场倾向”独立计算，不影响谱系归类
