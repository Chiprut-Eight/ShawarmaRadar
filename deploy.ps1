param(
    [string]$CommitMessage = ""
)

Write-Host "🚀 Starting ShawarmaRadar Deployment..." -ForegroundColor Cyan

if ($CommitMessage -ne "") {
    Write-Host "📦 Adding and committing changes..." -ForegroundColor Yellow
    git add .
    git commit -m "$CommitMessage"
}

Write-Host "☁️ Pushing to GitHub..." -ForegroundColor Yellow
git push

Write-Host "🔄 Triggering Render Backend Deployment (Clear Cache)..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "https://api.render.com/deploy/srv-d6gp1bfkijhs73f27qtg?key=RxOJW71tiLc&clearCache=true" -Method Post

Write-Host "🔄 Triggering Render Frontend Deployment (Clear Cache)..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "https://api.render.com/deploy/srv-d6gp5i7kijhs73f2ajq0?key=WP5PdvvheVQ&clearCache=true" -Method Post

Write-Host "✅ Deployment triggered successfully! Your servers are building on Render." -ForegroundColor Green
Write-Host "💡 Note: It usually takes 1-2 minutes for the changes to go live." -ForegroundColor Gray
