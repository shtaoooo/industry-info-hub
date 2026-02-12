@echo off
REM Sync code to EC2 and deploy

echo ========================================
echo 同步代码到 EC2 并部署
echo ========================================

set EC2_HOST=ec2-user@54.227.42.240
set SSH_KEY=C:/Users/Administrator/.ssh/Global-001.pem
set REMOTE_PATH=~/industry-portal

echo.
echo [1/3] 同步 backend 代码到 EC2...
scp -i %SSH_KEY% -r backend %EC2_HOST%:%REMOTE_PATH%/

echo.
echo [2/3] 在 EC2 上构建...
ssh -i %SSH_KEY% %EC2_HOST% "cd %REMOTE_PATH%/backend && npm install && npm run build"

echo.
echo [3/3] 部署到 AWS...
ssh -i %SSH_KEY% %EC2_HOST% "cd %REMOTE_PATH%/backend && sam deploy"

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 测试 API:
echo node test-api.js https://jipxuzbq1f.execute-api.us-east-1.amazonaws.com/prod
echo.
pause
