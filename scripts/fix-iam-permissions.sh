#!/bin/bash
# Fix missing IAM permissions for Lambda functions after DynamoDB GSI changes
# Run this on EC2 or any machine with AWS CLI configured

ACCOUNT_ID="880755836258"
REGION="us-east-2"

echo "=== Fixing IAM permissions for DynamoDB GSI access ==="

# Get the execution role for PublicBrowsing Lambda
PUBLIC_BROWSING_ROLE=$(aws lambda get-function-configuration \
  --function-name IndustryPortal-PublicBrowsing \
  --region $REGION \
  --query 'Role' \
  --output text | sed 's|arn:aws:iam::[0-9]*:role/||')

echo "PublicBrowsing role: $PUBLIC_BROWSING_ROLE"

# Add inline policy for missing GSI permissions on Industries table
aws iam put-role-policy \
  --role-name "$PUBLIC_BROWSING_ROLE" \
  --policy-name "DynamoDBGSIAccess" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:Scan"
        ],
        "Resource": [
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-Industries/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-SubIndustries/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-UseCases/index/*"
        ]
      }
    ]
  }'

echo "PublicBrowsing GSI permissions added."

# Fix SubIndustryManagement Lambda
SUB_INDUSTRY_ROLE=$(aws lambda get-function-configuration \
  --function-name IndustryPortal-SubIndustryManagement \
  --region $REGION \
  --query 'Role' \
  --output text | sed 's|arn:aws:iam::[0-9]*:role/||')

echo "SubIndustryManagement role: $SUB_INDUSTRY_ROLE"

aws iam put-role-policy \
  --role-name "$SUB_INDUSTRY_ROLE" \
  --policy-name "DynamoDBGSIAccess" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem"
        ],
        "Resource": [
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-SubIndustries/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-Industries/index/*"
        ]
      }
    ]
  }'

echo "SubIndustryManagement GSI permissions added."

# Fix UseCaseManagement Lambda
USE_CASE_ROLE=$(aws lambda get-function-configuration \
  --function-name IndustryPortal-UseCaseManagement \
  --region $REGION \
  --query 'Role' \
  --output text | sed 's|arn:aws:iam::[0-9]*:role/||')

echo "UseCaseManagement role: $USE_CASE_ROLE"

aws iam put-role-policy \
  --role-name "$USE_CASE_ROLE" \
  --policy-name "DynamoDBGSIAccess" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem"
        ],
        "Resource": [
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-UseCases/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-SubIndustries/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-Industries/index/*"
        ]
      }
    ]
  }'

echo "UseCaseManagement GSI permissions added."

# Fix CustomerCaseManagement Lambda
CUSTOMER_CASE_ROLE=$(aws lambda get-function-configuration \
  --function-name IndustryPortal-CustomerCaseManagement \
  --region $REGION \
  --query 'Role' \
  --output text | sed 's|arn:aws:iam::[0-9]*:role/||')

echo "CustomerCaseManagement role: $CUSTOMER_CASE_ROLE"

aws iam put-role-policy \
  --role-name "$CUSTOMER_CASE_ROLE" \
  --policy-name "DynamoDBGSIAccess" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem"
        ],
        "Resource": [
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-Industries/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-SubIndustries/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-UseCases/index/*",
          "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-CustomerCases/index/*"
        ]
      }
    ]
  }'

echo "CustomerCaseManagement GSI permissions added."

echo ""
echo "=== All IAM permissions fixed! ==="
echo "Testing /public/industries endpoint..."
curl -s https://jglfkmap11.execute-api.us-east-2.amazonaws.com/public/industries | head -c 500
