#!/bin/bash
cat > /tmp/bp.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["xray:PutTelemetryRecords", "xray:PutTraceSegments"],
      "Resource": "*",
      "Effect": "Allow"
    },
    {
      "Action": ["dynamodb:BatchGetItem", "dynamodb:ConditionCheckItem", "dynamodb:DescribeTable", "dynamodb:GetItem", "dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:Query", "dynamodb:Scan"],
      "Resource": ["arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-Industries", "arn:aws:dynamodb:us-east-2:880755836258:table/IndustryPortal-SubIndustries"],
      "Effect": "Allow"
    },
    {
      "Action": "bedrock:InvokeModel",
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name industry-portal-CopilotAgentServiceRole74257212-ey4EcCasVdn1 \
  --policy-name CopilotAgentServiceRoleDefaultPolicy10AF4153 \
  --policy-document file:///tmp/bp.json \
  --region us-east-2

echo "Policy update exit code: $?"
