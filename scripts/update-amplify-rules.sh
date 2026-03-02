#!/bin/bash
# Update Amplify custom rules for SPA routing
aws amplify update-app \
  --app-id dvlzz7r606v3p \
  --region us-east-2 \
  --custom-rules '[{"source":"</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>","target":"/index.html","status":"200"},{"source":"/<*>","target":"/index.html","status":"404-200"}]'

echo "Custom rules updated"
