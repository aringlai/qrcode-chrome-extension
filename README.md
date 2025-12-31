# QR Code Generator Chrome Extension

一个简洁高效的 Chrome 扩展，用于快速生成二维码并管理历史记录。

## 效果预览

| 生成二维码 | 历史记录 |
|:---:|:---:|
| ![生成二维码](./docs/image-1.png) | ![历史记录](./docs/image-2.png) |

## 功能特性

- **快速生成**: 输入文本即可实时生成高质量二维码
- **自动恢复**: 打开插件时自动加载最近访问的历史记录
- **新建按钮**: 一键清空当前内容，快速创建新的二维码
- **历史记录**: 自动保存生成记录，支持搜索、重命名、删除和批量清空
- **键盘快捷键**: 支持 Ctrl+Enter 快速生成

## 安装

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 打包扩展
npm run package
```

在 Chrome 中加载扩展：
1. 打开 `chrome://extensions/`
2. 启用「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `extension-package` 目录

## 开发

```bash
npm run build        # 构建生产版本
npm run build:dev    # 构建开发版本
npm run watch        # 监听模式
npm run test         # 运行测试
npm run test:coverage # 测试覆盖率
```

## 项目结构

```
├── src/
│   ├── popup.ts              # 主界面逻辑
│   ├── qr-generator.ts       # 二维码生成器
│   ├── favorites-manager.ts  # 收藏管理器
│   ├── storage-service.ts    # 存储服务
│   └── types.ts              # 类型定义
├── styles/popup.css          # 样式文件
├── popup.html                # 弹窗界面
├── manifest.json             # 扩展配置 (Manifest V3)
└── scripts/                  # 构建脚本
```

## 技术栈

- TypeScript + Webpack
- Chrome Extension Manifest V3
- Chrome Storage API
- qrcode.js
- Jest 测试框架

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新信息。

## License

MIT
