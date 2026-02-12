@echo off
echo Building backend...
cd backend
call npm install
call npm run build
cd ..

echo Building frontend...
cd frontend
call npm install
call npm run build
cd ..

echo Deploying with CDK...
cd cdk
call npm install
call cdk deploy --all --require-approval never
cd ..

echo Deployment complete!
