# Timer 24H Card Release Script for Windows
# Usage: .\release.ps1 [stable|beta|dev] [version]

param(
    [string]$Channel = "dev",
    [string]$Version = ""
)

# Colors for output
$Colors = @{
    Red = [ConsoleColor]::Red
    Green = [ConsoleColor]::Green  
    Yellow = [ConsoleColor]::Yellow
    Blue = [ConsoleColor]::Blue
    White = [ConsoleColor]::White
}

function Write-ColorOutput {
    param([string]$Message, [ConsoleColor]$Color)
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "🚀 Timer 24H Card Release Script" $Colors.Blue
Write-ColorOutput "================================" $Colors.Blue

# Validate channel
switch ($Channel) {
    { $_ -in "stable", "beta", "dev" } {
        Write-ColorOutput "✅ Channel: $Channel" $Colors.Green
        break
    }
    default {
        Write-ColorOutput "❌ Invalid channel. Use: stable, beta, or dev" $Colors.Red
        exit 1
    }
}

# Generate version if not provided
if ([string]::IsNullOrEmpty($Version)) {
    switch ($Channel) {
        "stable" {
            Write-ColorOutput "⚠️  Please provide version for stable release" $Colors.Yellow
            Write-ColorOutput "Usage: .\release.ps1 stable v1.2.0" $Colors.Yellow
            exit 1
        }
        "beta" {
            $Date = Get-Date -Format "yyyy.MM.dd"
            $Hash = (git rev-parse --short HEAD)
            $Version = "v$Date-beta.$Hash"
        }
        "dev" {
            $Date = Get-Date -Format "yyyy.MM.dd"
            $Hash = (git rev-parse --short HEAD)
            $Version = "v$Date-dev.$Hash"
        }
    }
}

Write-ColorOutput "📦 Version: $Version" $Colors.Green

# Update version in files
Write-ColorOutput "🔧 Updating version in files..." $Colors.Blue

# Update timer-24h-card.js
$Content = Get-Content "timer-24h-card.js" -Raw
$Content = $Content -replace "Version [0-9.]*", "Version $Version"
Set-Content "timer-24h-card.js" -Value $Content
Write-ColorOutput "  ✅ Updated timer-24h-card.js" $Colors.Green

# Update package.json if exists
if (Test-Path "package.json") {
    $Content = Get-Content "package.json" -Raw
    $Content = $Content -replace '"version": "[^"]*"', "`"version`": `"$Version`""
    Set-Content "package.json" -Value $Content
    Write-ColorOutput "  ✅ Updated package.json" $Colors.Green
}

# Create ZIP archive
Write-ColorOutput "📦 Creating ZIP archive..." $Colors.Blue
$ZipName = "timer-24h-card-$Version.zip"

# Remove old zip if exists
if (Test-Path $ZipName) {
    Remove-Item $ZipName
}

# Create zip (requires PowerShell 5.0+)
$FilesToZip = @(
    "timer-24h-card.js",
    "timer-24h-card-editor.js", 
    "hacs.json",
    "README.md",
    "info.md",
    "CHANNELS.md"
)

# Add images folder if exists
if (Test-Path "images") {
    $FilesToZip += "images"
}

Compress-Archive -Path $FilesToZip -DestinationPath $ZipName -Force
Write-ColorOutput "✅ Created: $ZipName" $Colors.Green

# Git operations
Write-ColorOutput "📝 Git operations..." $Colors.Blue

# Check if we have uncommitted changes
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-ColorOutput "⚠️  You have uncommitted changes. Commit them first." $Colors.Yellow
    git status --short
    exit 1
}

# Create and push tag
switch ($Channel) {
    "stable" {
        Write-ColorOutput "🏷️  Creating stable release tag..." $Colors.Blue
        git tag $Version
        git push origin $Version
        Write-ColorOutput "✅ Stable release tagged and pushed" $Colors.Green
    }
    "beta" {
        Write-ColorOutput "🏷️  Creating beta release tag..." $Colors.Blue
        git tag $Version
        git push origin $Version
        
        # Check if beta branch exists
        $BetaBranchExists = git show-ref --verify --quiet refs/heads/beta
        if ($LASTEXITCODE -eq 0) {
            git push origin beta
            Write-ColorOutput "✅ Beta release tagged and beta branch updated" $Colors.Green
        } else {
            Write-ColorOutput "⚠️  Beta branch doesn't exist, creating it..." $Colors.Yellow
            git checkout -b beta
            git push -u origin beta
            git checkout main
            Write-ColorOutput "✅ Beta branch created and pushed" $Colors.Green
        }
    }
    "dev" {
        Write-ColorOutput "🏷️  Creating development tag..." $Colors.Blue
        git tag $Version
        git push origin $Version
        Write-ColorOutput "✅ Development build tagged" $Colors.Green
    }
}

# Summary
Write-ColorOutput "📋 Release Summary" $Colors.Blue
Write-ColorOutput "=================" $Colors.Blue
Write-ColorOutput "Channel: $Channel" $Colors.Green
Write-ColorOutput "Version: $Version" $Colors.Green
Write-ColorOutput "Archive: $ZipName" $Colors.Green
Write-ColorOutput "Tag: Pushed to GitHub" $Colors.Green

switch ($Channel) {
    "stable" {
        Write-ColorOutput "🎉 Stable release complete!" $Colors.Blue
        Write-ColorOutput "📝 Don't forget to create a GitHub release with the ZIP file" $Colors.Yellow
    }
    "beta" {
        Write-ColorOutput "🧪 Beta release complete!" $Colors.Blue
        Write-ColorOutput "📝 Beta users will receive this update automatically" $Colors.Yellow
    }
    "dev" {
        Write-ColorOutput "🔧 Development build complete!" $Colors.Blue
        Write-ColorOutput "📝 This is for testing purposes only" $Colors.Yellow
    }
}

Write-ColorOutput "🔗 GitHub Actions will automatically create the release" $Colors.Blue
Write-ColorOutput "✨ Done!" $Colors.Green
