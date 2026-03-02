#!/bin/bash
aws apigatewayv2 get-routes --api-id vto9lsjvn3 --region us-east-2 | python3 -c '
import json, sys
data = json.load(sys.stdin)
for r in data["Items"]:
    rk = r.get("RouteKey", "")
    if "use-cases" in rk or "public" in rk:
        print(rk)
'
