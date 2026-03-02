#!/bin/bash
aws dynamodb scan \
  --table-name IndustryPortal-UseCases \
  --region us-east-2 \
  --projection-expression "id,#n,customerPainPoints,targetAudience" \
  --expression-attribute-names '{"#n":"name"}' \
  --query 'Items[*].{id:id.S,name:"#n".S,hasPainPoints:customerPainPoints.S,hasAudience:targetAudience.S}'
