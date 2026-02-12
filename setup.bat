@echo off
REM Industry Portal Setup Script for Windows

echo =========================================
echo 行业信息门户 - 项目初始化
echo Industry Portal - Project Setup
echo =========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安装。请先安装 Node.js 18 或更高版本。
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    exit /b 1
)
echo ✅ Node.js installed

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm 未安装
    echo ❌ npm is not installed
    exit /b 1
)
echo ✅ npm installed

REM Check AWS CLI (optional)
where aws >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ AWS CLI installed
) else (
    echo ⚠️  AWS CLI 未安装（部署时需要）
    echo ⚠️  AWS CLI not installed (required for deployment)
)

REM Check SAM CLI (optional)
where sam >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ AWS SAM CLI installed
) else (
    echo ⚠️  AWS SAM CLI 未安装（部署时需要）
    echo ⚠️  AWS SAM CLI not installed (required for deployment)
)

echo.
echo =========================================
echo 安装依赖...
echo Installing dependencies...
echo =========================================
echo.

REM Install frontend dependencies
echo 📦 安装前端依赖...
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 前端依赖安装失败
    echo ❌ Frontend dependencies installation failed
    cd ..
    exit /b 1
)
cd ..
echo ✅ 前端依赖安装完成
echo.

REM Install backend dependencies
echo 📦 安装后端依赖...
echo 📦 Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 后端依赖安装失败
    echo ❌ Backend dependencies installation failed
    cd ..
    exit /b 1
)
cd ..
echo ✅ 后端依赖安装完成
echo.

REM Create .env file if not exists
if not exist "frontend\.env" (
    echo 📝 创建环境变量文件...
    echo 📝 Creating environment file...
    copy frontend\.env.example frontend\.env
    echo ✅ 已创建 frontend\.env，请根据实际情况修改配置
    echo ✅ Created frontend\.env, please update with actual values
) else (
    echo ℹ️  frontend\.env 已存在
    echo ℹ️  frontend\.env already exists
)

echo.
echo =========================================
echo ✅ 项目初始化完成！
echo ✅ Project setup completed!
echo =========================================
echo.
echo 下一步 (Next steps):
echo.
echo 1. 部署后端 (Deploy backend):
echo    cd backend
echo    sam deploy --guided
echo.
echo 2. 更新前端环境变量 (Update frontend env):
echo    编辑 frontend\.env 文件
echo    Edit frontend\.env file
echo.
echo 3. 启动前端开发服务器 (Start frontend dev server):
echo    cd frontend
echo    npm run dev
echo.
echo 详细部署指南请查看 DEPLOYMENT.md
echo See DEPLOYMENT.md for detailed deployment guide
echo.

pause
