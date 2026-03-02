#!/bin/bash
cat > /tmp/test-payload.json << 'ENDOFPAYLOAD'
{"httpMethod":"GET","path":"/public/use-cases/13a23ec6-0be2-4f74-ae28-5035a773aed6","pathParameters":{"id":"13a23ec6-0be2-4f74-ae28-5035a773aed6"},"queryStringParameters":null}
ENDOFPAYLOAD

aws lambda invoke \
  --function-name IndustryPortal-PublicBrowsing \
  --cli-binary-format raw-in-base64-out \
  --payload file:///tmp/test-payload.json \
  --region us-east-2 \
  /tmp/lambda-output.json

echo "=== Lambda Output ==="
python3 -m json.tool /tmp/lambda-output.json
