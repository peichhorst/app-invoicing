# Color replacement script for Tailwind classes
$rootPath = "c:\Users\Peter Eichhorst\app-invoicing\src"

$files = Get-ChildItem -Path $rootPath -Recurse -Include *.tsx,*.ts,*.jsx,*.js,*.css | 
    Where-Object { $_.FullName -notlike "*node_modules*" }

$totalFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName | Out-String
    $modified = $false
    $original = $content
    
    # Replace colors
    $content = $content -replace 'purple-', 'brand-primary-'
    $content = $content -replace 'indigo-', 'brand-secondary-'
    $content = $content -replace 'blue-', 'brand-accent-'
    
    if ($content -ne $original) {
        $modified = $true
    }
    
    if ($modified) {
        $purpleCount = ([regex]::Matches($content, 'brand-primary-\d+')).Count
        $indigoCount = ([regex]::Matches($content, 'brand-secondary-\d+')).Count
        $blueCount = ([regex]::Matches($content, 'brand-accent-\d+')).Count
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $replacementCount = $purpleCount + $indigoCount + $blueCount
        $totalReplacements += $replacementCount
        
        Write-Host "Updated $($file.Name): $replacementCount replacements" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Files updated: $totalFiles" -ForegroundColor Cyan
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Cyan
