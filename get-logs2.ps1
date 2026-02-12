$functions = @("IndustryManagement", "SubIndustryManagement")
foreach ($fn in $functions) {
    $logGroup = "/aws/lambda/IndustryPortal-$fn"
    Write-Host "=== $logGroup ==="
    $streams = aws logs describe-log-streams --log-group-name $logGroup --region us-east-2 --order-by LastEventTime --descending --max-items 1 --output json | ConvertFrom-Json
    if ($streams.logStreams.Count -gt 0) {
        $streamName = $streams.logStreams[0].logStreamName
        $events = aws logs get-log-events --log-group-name $logGroup --log-stream-name "$streamName" --region us-east-2 --limit 30 --output json | ConvertFrom-Json
        foreach ($evt in $events.events) {
            Write-Host $evt.message
        }
    }
    Write-Host ""
}
