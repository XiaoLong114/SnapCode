# SnapCode — 代码截图

一个零依赖的 VS Code 扩展：把选中的代码（或整个文件）渲染成精美的图片，可保存为 PNG 或复制到剪贴板。

![SnapCode](images/icon.png)

## 功能

- **代码截图**：选中代码截图，或截取整个文件
- **语法高亮**：内置轻量 tokenizer，支持 JS/TS/Python/Java/Kotlin/C++/C#/Go/Rust/SQL/JSON/Shell/YAML 等常见语言
- **7 套主题**：One Dark、Dracula、Monokai、GitHub Dark、Solarized Light、极简白、薰衣草
- **实时预览**：主题、字号、边距、行号、标题栏、阴影、水印都可实时调整，所见即所得
- **高清导出**：2 倍分辨率 PNG，文字清晰
- **灵活保存**：保存到指定路径，或一键复制到剪贴板
- **零外部依赖**：不需要联网加载字体或脚本，纯本地渲染

## 使用

1. 在编辑器里选中想截图的代码（或打开整个文件）
2. 通过以下任一方式打开：
   - **快捷键 `Ctrl + Alt + P`**（有选中则截选中，无选中则截整个文件）
   - 命令面板：`Ctrl/Cmd + Shift + P` → 输入 `SnapCode: 截图选中代码`
   - 右键选中代码 → `SnapCode: 截图选中代码`
   - 编辑器右上角图标 → `SnapCode: 截图当前文件`
3. 在面板里调整主题、字号等参数，右侧实时预览
4. 点击 **保存 PNG**（选择保存位置）或 **复制到剪贴板**

## 配置项

在 VS Code 设置中搜索 `SnapCode`，可修改默认值：

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `snapcode.defaultTheme` | `oneDark` | 默认主题 |
| `snapcode.fontSize` | `15` | 默认字号 |
| `snapcode.fontFamily` | Consolas… | 等宽字体 |
| `snapcode.showLineNumbers` | `true` | 显示行号 |
| `snapcode.watermark` | `SnapCode` | 水印文字，留空关闭 |

## 本地开发

```bash
# 语法校验
node --check extension.js
node --check media/tokenizer.js
node --check media/renderer.js

# 打包 .vsix（需 npm install 安装 vsce）
npm install
npx vsce package
```

生成 `snapcode-1.2.0.vsix` 后，可在 VS Code 中通过「扩展 → … → 从 VSIX 安装」安装。

## 项目结构

```
SnapCode/
├── extension.js              扩展入口：命令注册、Webview、保存逻辑
├── package.json              扩展清单（命令、菜单、配置项）
├── media/
│   ├── index.html            Webview 界面
│   ├── tokenizer.js          语法高亮（零依赖）
│   └── renderer.js           canvas 渲染器 + 主题定义
├── images/icon.png           扩展图标
├── tools/gen_icon.py         生成图标的脚本
└── LICENSE                   MIT 协议
```

## 开源协议

MIT License，可自由使用、修改与分发。
