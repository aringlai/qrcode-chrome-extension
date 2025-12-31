#!/bin/bash

# Chrome插件打包脚本
# 使用方法: ./scripts/package.sh

set -e  # 遇到错误时退出

echo "🚀 开始构建Chrome插件包..."
echo

# 读取package.json中的版本信息
VERSION=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').name")

BUILD_DIR="dist"
PACKAGE_DIR="extension-package"
ZIP_NAME="${NAME}-v${VERSION}.zip"

# 1. 清理旧文件
echo "📁 清理构建目录..."
rm -rf "$BUILD_DIR" "$PACKAGE_DIR" *.zip

# 2. 编译TypeScript
echo "🔨 编译TypeScript文件..."
npm run build

# 3. 创建插件包目录
echo "📦 创建插件包目录..."
mkdir -p "$PACKAGE_DIR"

# 4. 复制必要文件
echo "📋 复制文件到插件包..."
cp manifest.json "$PACKAGE_DIR/"
cp popup.html "$PACKAGE_DIR/"
cp -r styles "$PACKAGE_DIR/"
cp -r icons "$PACKAGE_DIR/"
cp -r dist "$PACKAGE_DIR/"

echo "  ✅ 文件复制完成"

# 5. 创建ZIP包
echo "🗜️  创建ZIP包..."
cd "$PACKAGE_DIR"
zip -r "../$ZIP_NAME" .
cd ..

# 6. 显示结果
echo
echo "🎉 构建完成！"
echo "📁 插件包目录: $PACKAGE_DIR"
echo "📦 ZIP文件: $ZIP_NAME"
echo "📊 包大小: $(du -h "$ZIP_NAME" | cut -f1)"

echo
echo "📝 下一步操作:"
echo "1. 打开Chrome浏览器"
echo "2. 访问 chrome://extensions/"
echo "3. 开启"开发者模式""
echo "4. 点击"加载已解压的扩展程序"，选择 $PACKAGE_DIR 目录"
echo "5. 或者直接拖拽 $ZIP_NAME 到扩展程序页面"