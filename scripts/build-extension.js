#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = 'dist';
const PACKAGE_DIR = 'extension-package';

console.log('🚀 开始构建Chrome插件包...\n');

// 1. 清理旧的构建文件
console.log('📁 清理构建目录...');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
if (fs.existsSync(PACKAGE_DIR)) {
  fs.rmSync(PACKAGE_DIR, { recursive: true, force: true });
}

// 2. 编译TypeScript
console.log('🔨 编译TypeScript文件...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ TypeScript编译失败');
  process.exit(1);
}

// 3. 创建插件包目录
console.log('📦 创建插件包目录...');
fs.mkdirSync(PACKAGE_DIR, { recursive: true });

// 4. 复制必要文件到插件包目录
console.log('📋 复制文件到插件包...');

const filesToCopy = [
  'manifest.json',
  'popup.html',
  'styles',
  'icons',
  'dist'
];

filesToCopy.forEach(file => {
  const srcPath = path.join(process.cwd(), file);
  const destPath = path.join(PACKAGE_DIR, file);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`  ✅ 已复制: ${file}`);
  } else {
    console.log(`  ⚠️  文件不存在: ${file}`);
  }
});

// 5. 创建ZIP包
console.log('🗜️  创建ZIP包...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const zipFileName = `${packageJson.name}-v${packageJson.version}.zip`;

try {
  execSync(`cd ${PACKAGE_DIR} && zip -r ../${zipFileName} .`, { stdio: 'inherit' });
  console.log(`✅ ZIP包已创建: ${zipFileName}`);
} catch (error) {
  console.error('❌ 创建ZIP包失败');
  process.exit(1);
}

// 6. 显示构建信息
console.log('\n🎉 构建完成！');
console.log(`📁 插件包目录: ${PACKAGE_DIR}`);
console.log(`📦 ZIP文件: ${zipFileName}`);
console.log(`📊 包大小: ${getFileSize(zipFileName)}`);

console.log('\n📝 下一步操作:');
console.log('1. 打开Chrome浏览器');
console.log('2. 访问 chrome://extensions/');
console.log('3. 开启"开发者模式"');
console.log(`4. 点击"加载已解压的扩展程序"，选择 ${PACKAGE_DIR} 目录`);
console.log(`5. 或者直接拖拽 ${zipFileName} 到扩展程序页面`);

// 辅助函数：递归复制目录
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 辅助函数：获取文件大小
function getFileSize(filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
  return `${fileSizeInMB} MB`;
}