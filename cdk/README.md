# Industry Portal CDK

AWS CDK infrastructure for Industry Portal application.

## Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

```bash
cd cdk
npm install
```

## Build Backend

Before deploying, build the backend Lambda functions:

```bash
cd ../backend
npm install
npm run build
cd ../cdk
```

## Build Frontend

Build the frontend before deploying:

```bash
cd ../frontend
npm install
npm run build
cd ../cdk
```

## Deploy

```bash
# Bootstrap CDK (first time only)
cdk bootstrap

# Synthesize CloudFormation template
cdk synth

# Deploy all stacks
npm run deploy

# Or deploy with auto-approval
cdk deploy --all --require-approval never
```

## Outputs

After deployment, CDK will output:
- API Gateway endpoint
- Cognito User Pool ID
- Cognito Client ID
- Identity Pool ID
- S3 Documents Bucket
- CloudFront Domain for Documents
- Frontend URL

## Destroy

```bash
npm run destroy
```

## Structure

- `bin/app.ts` - CDK app entry point
- `lib/industry-portal-stack.ts` - Main infrastructure stack
