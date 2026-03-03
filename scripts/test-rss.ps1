$urls = @(
    'https://news.google.com/rss/search?q=energy+news&hl=en',
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://www.woodmac.com/rss'
)

foreach ($url in $urls) {
    Write-Host "`n=== Testing: $url ==="
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
        Write-Host "Status: $($r.StatusCode), Length: $($r.Content.Length)"
        Write-Host "Preview: $($r.Content.Substring(0, [Math]::Min(300, $r.Content.Length)))"
    } catch {
        Write-Host "Error: $($_.Exception.Message)"
    }
}
