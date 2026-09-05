param(
    [string]$CommitMessage = ""
)

Write-Host "Starting ShawarmaRadar Deployment..." -ForegroundColor Cyan

if ($CommitMessage -ne "") {
    Write-Host "Adding and committing changes..." -ForegroundColor Yellow
    git add .
    git commit -m "$CommitMessage"
}

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push

Write-Host "Building Frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
Set-Location ..

Write-Host "Deploying to Firebase..." -ForegroundColor Yellow
firebase deploy

Write-Host "Deployment to Firebase completed successfully!" -ForegroundColor Green
