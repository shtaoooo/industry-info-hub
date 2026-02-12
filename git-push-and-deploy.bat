@echo off
REM Git push and EC2 deployment script

echo ========================================
echo Git 推送并在 EC2 上部署
echo ========================================

REM Git 配置
set EC2_HOST=ec2-user@54.227.42.240
set SSH_KEY=C:/Users/Administrator/.ssh/Global-001.pem
set REMOTE_PATH=~/industry-portal

echo.
echo [1/4] 添加所有更改到 Git...
git add .

echo.
set /p COMMIT_MSG="请输入提交信息: "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update backend security and API fixes

echo.
echo [2/4] 提交更改...
git commit -m "%COMMIT_MSG%"

echo.
echo [3/4] 推送到 GitHub...
git push origin main

echo.
echo [4/4] 连接 EC2 并部署...
ssh -i %SSH_KEY% %EC2_HOST% "cd %REMOTE_PATH% && git pull origin main && cd backend && npm install && npm run build && sam deploy"

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 现在可以测试 API (需要 JWT token):
echo node test-api.js https://jipxuzbq1f.execute-api.us-east-1.amazonaws.com/prod
echo.
pause
