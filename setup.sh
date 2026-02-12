#!/bin/bash

# Industry Portal Setup Script

echo "========================================="
echo "行业信息门户 - 项目初始化"
echo "Industry Portal - Project Setup"
echo "========================================="
echo ""

# Check prerequisites
echo "检查前提条件..."
echo "Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装。请先安装 Node.js 18 或更高版本。"
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低。需要 18 或更高版本，当前版本: $(node -v)"
    echo "❌ Node.js version too low. Required 18+, current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm $(npm -v)"

# Check AWS CLI (optional)
if command -v aws &> /dev/null; then
    echo "✅ AWS CLI $(aws --version | cut -d' ' -f1)"
else
    echo "⚠️  AWS CLI 未安装（部署时需要）"
    echo "⚠️  AWS CLI not installed (required for deployment)"
fi

# Check SAM CLI (optional)
if command -v sam &> /dev/null; then
    echo "✅ AWS SAM CLI $(sam --version | cut -d' ' -f4)"
else
    echo "⚠️  AWS SAM CLI 未安装（部署时需要）"
    echo "⚠️  AWS SAM CLI not installed (required for deployment)"
fi

echo ""
echo "========================================="
echo "安装依赖..."
echo "Installing dependencies..."
echo "========================================="
echo ""

# Install frontend dependencies
echo "📦 安装前端依赖..."
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ 前端依赖安装失败"
    echo "❌ Frontend dependencies installation failed"
    exit 1
fi
cd ..
echo "✅ 前端依赖安装完成"
echo ""

# Install backend dependencies
echo "📦 安装后端依赖..."
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ 后端依赖安装失败"
    echo "❌ Backend dependencies installation failed"
    exit 1
fi
cd ..
echo "✅ 后端依赖安装完成"
echo ""

# Create .env file if not exists
if [ ! -f "frontend/.env" ]; then
    echo "📝 创建环境变量文件..."
    echo "📝 Creating environment file..."
    cp frontend/.env.example frontend/.env
    echo "✅ 已创建 frontend/.env，请根据实际情况修改配置"
    echo "✅ Created frontend/.env, please update with actual values"
else
    echo "ℹ️  frontend/.env 已存在"
    echo "ℹ️  frontend/.env already exists"
fi

echo ""
echo "========================================="
echo "✅ 项目初始化完成！"
echo "✅ Project setup completed!"
echo "========================================="
echo ""
echo "下一步 (Next steps):"
echo ""
echo "1. 部署后端 (Deploy backend):"
echo "   cd backend"
echo "   sam deploy --guided"
echo ""
echo "2. 更新前端环境变量 (Update frontend env):"
echo "   编辑 frontend/.env 文件"
echo "   Edit frontend/.env file"
echo ""
echo "3. 启动前端开发服务器 (Start frontend dev server):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "详细部署指南请查看 DEPLOYMENT.md"
echo "See DEPLOYMENT.md for detailed deployment guide"
echo ""
