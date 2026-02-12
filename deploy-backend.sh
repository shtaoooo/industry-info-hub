#!/bin/bash
# Backend deployment script for EC2

echo "🚀 开始部署后端..."

cd backend

echo "📦 安装依赖..."
npm install

echo "🔨 构建 TypeScript..."
npm run build

echo "☁️  部署到 AWS..."
sam deploy

echo "✅ 部署完成！"
