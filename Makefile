# Chrome插件打包Makefile

.PHONY: help build package clean test install-dev

# 默认目标
help:
	@echo "Chrome插件构建工具"
	@echo ""
	@echo "可用命令:"
	@echo "  make build     - 编译TypeScript文件"
	@echo "  make package   - 完整打包插件（推荐）"
	@echo "  make clean     - 清理构建文件"
	@echo "  make test      - 运行测试"
	@echo "  make dev       - 开发模式（监听文件变化）"
	@echo "  make install   - 安装依赖"

# 安装依赖
install:
	npm install

# 编译TypeScript
build:
	npm run build

# 完整打包
package:
	@echo "🚀 开始打包Chrome插件..."
	npm run package

# 使用shell脚本打包（备选方案）
package-sh:
	./scripts/package.sh

# 清理文件
clean:
	npm run clean
	npm run package:clean

# 运行测试
test:
	npm test

# 开发模式
dev:
	npm run watch

# 快速构建和打包
quick: clean build package