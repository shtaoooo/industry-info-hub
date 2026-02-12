@echo off
REM Deploy to EC2 script for Windows

echo 正在连接到 EC2 并部署...

ssh -i C:/Users/Administrator/.ssh/Global-001.pem ec2-user@54.227.42.240 "cd ~/industry-portal/backend && npm install && npm run build && sam deploy"

echo 部署完成！
pause
