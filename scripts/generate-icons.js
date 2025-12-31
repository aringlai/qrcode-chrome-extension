#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 生成Chrome插件图标...\n');

// 检查是否安装了ImageMagick或其他转换工具
function checkConversionTool() {
  try {
    execSync('which convert', { stdio: 'ignore' });
    return 'imagemagick';
  } catch (error) {
    try {
      execSync('which rsvg-convert', { stdio: 'ignore' });
      return 'rsvg';
    } catch (error) {
      try {
        execSync('which inkscape', { stdio: 'ignore' });
        return 'inkscape';
      } catch (error) {
        return null;
      }
    }
  }
}

// 使用不同工具转换SVG到PNG
function convertSvgToPng(inputSvg, outputPng, size, tool) {
  try {
    switch (tool) {
      case 'imagemagick':
        execSync(`convert -background transparent -size ${size}x${size} "${inputSvg}" "${outputPng}"`);
        break;
      case 'rsvg':
        execSync(`rsvg-convert -w ${size} -h ${size} -o "${outputPng}" "${inputSvg}"`);
        break;
      case 'inkscape':
        execSync(`inkscape -w ${size} -h ${size} -o "${outputPng}" "${inputSvg}"`);
        break;
      default:
        throw new Error('No conversion tool available');
    }
    return true;
  } catch (error) {
    return false;
  }
}

// 创建简单的PNG图标（如果没有转换工具）
function createSimplePng(size, outputPath) {
  // 创建一个简单的base64编码的PNG图标
  const canvas = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size/8}" fill="#4285f4"/>
  <g fill="white">
    <rect x="${size*0.125}" y="${size*0.125}" width="${size*0.1875}" height="${size*0.1875}" rx="${size*0.015625}"/>
    <rect x="${size*0.15625}" y="${size*0.15625}" width="${size*0.125}" height="${size*0.125}" rx="${size*0.0078125}" fill="#4285f4"/>
    <rect x="${size*0.1875}" y="${size*0.1875}" width="${size*0.0625}" height="${size*0.0625}" rx="${size*0.0078125}" fill="white"/>
    
    <rect x="${size*0.6875}" y="${size*0.125}" width="${size*0.1875}" height="${size*0.1875}" rx="${size*0.015625}"/>
    <rect x="${size*0.71875}" y="${size*0.15625}" width="${size*0.125}" height="${size*0.125}" rx="${size*0.0078125}" fill="#4285f4"/>
    <rect x="${size*0.75}" y="${size*0.1875}" width="${size*0.0625}" height="${size*0.0625}" rx="${size*0.0078125}" fill="white"/>
    
    <rect x="${size*0.125}" y="${size*0.6875}" width="${size*0.1875}" height="${size*0.1875}" rx="${size*0.015625}"/>
    <rect x="${size*0.15625}" y="${size*0.71875}" width="${size*0.125}" height="${size*0.125}" rx="${size*0.0078125}" fill="#4285f4"/>
    <rect x="${size*0.1875}" y="${size*0.75}" width="${size*0.0625}" height="${size*0.0625}" rx="${size*0.0078125}" fill="white"/>
  </g>
</svg>`;
  
  fs.writeFileSync(outputPath.replace('.png', '.svg'), canvas);
  console.log(`  ⚠️  创建了SVG版本: ${path.basename(outputPath.replace('.png', '.svg'))}`);
}

const inputSvg = 'icons/icon.svg';
const sizes = [16, 32, 48, 128];
const tool = checkConversionTool();

if (!fs.existsSync(inputSvg)) {
  console.error('❌ 找不到源SVG文件: icons/icon.svg');
  process.exit(1);
}

console.log(`🔧 使用转换工具: ${tool || '无 (将创建SVG版本)'}\n`);

let success = true;

for (const size of sizes) {
  const outputPng = `icons/icon${size}.png`;
  
  if (tool) {
    if (convertSvgToPng(inputSvg, outputPng, size, tool)) {
      console.log(`✅ 已生成: icon${size}.png`);
    } else {
      console.log(`❌ 生成失败: icon${size}.png`);
      createSimplePng(size, outputPng);
      success = false;
    }
  } else {
    createSimplePng(size, outputPng);
    success = false;
  }
}

if (!success) {
  console.log('\n⚠️  注意: 由于缺少图像转换工具，已创建SVG版本的图标。');
  console.log('如需PNG格式，请安装以下工具之一:');
  console.log('- ImageMagick: brew install imagemagick');
  console.log('- librsvg: brew install librsvg');
  console.log('- Inkscape: brew install inkscape');
  console.log('\n然后重新运行此脚本。');
} else {
  console.log('\n🎉 所有图标生成完成！');
}