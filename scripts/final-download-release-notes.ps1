# ============================================
# SALESFORCE RELEASE NOTES PDF DOWNLOADER
# ============================================
# Downloads ALL release notes from Winter '04 to Spring '26
# Coverage: 22+ years of Salesforce releases (70 releases)
# 
# Expected Result: ~69 PDFs, ~1 GB
# ============================================

$ErrorActionPreference = "Continue"
$baseDir = Split-Path -Parent $PSScriptRoot
$pdfsDir = Join-Path $baseDir "docs\release-notes"

# Create directory if not exists
if (!(Test-Path $pdfsDir)) {
    New-Item -ItemType Directory -Path $pdfsDir -Force | Out-Null
}

# All Release Notes - organized by release (Winter '04 to Spring '26)
$releaseNotes = @(
    # === NEWEST RELEASES (rel1/doc format) ===
    @{name="Spring_26"; url="https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/salesforce_spring26_release_notes.pdf"},
    @{name="Winter_26"; url="https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/salesforce_winter26_release_notes.pdf"},
    @{name="Summer_25"; url="https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/salesforce_summer25_release_notes.pdf"},
    @{name="Spring_25"; url="https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/salesforce_spring25_release_notes.pdf"},
    
    # === 2020-2024 RELEASES ===
    @{name="Winter_25"; url="https://resources.docs.salesforce.com/252/latest/en-us/sfdc/pdf/salesforce_winter25_release_notes.pdf"},
    @{name="Summer_24"; url="https://resources.docs.salesforce.com/250/latest/en-us/sfdc/pdf/salesforce_summer24_release_notes.pdf"},
    @{name="Spring_24"; url="https://resources.docs.salesforce.com/248/latest/en-us/sfdc/pdf/salesforce_spring24_release_notes.pdf"},
    @{name="Winter_24"; url="https://resources.docs.salesforce.com/246/latest/en-us/sfdc/pdf/salesforce_winter24_release_notes.pdf"},
    @{name="Summer_23"; url="https://resources.docs.salesforce.com/244/latest/en-us/sfdc/pdf/salesforce_summer23_release_notes.pdf"},
    @{name="Spring_23"; url="https://resources.docs.salesforce.com/242/latest/en-us/sfdc/pdf/salesforce_spring23_release_notes.pdf"},
    @{name="Winter_23"; url="https://resources.docs.salesforce.com/240/latest/en-us/sfdc/pdf/salesforce_winter23_release_notes.pdf"},
    @{name="Summer_22"; url="https://resources.docs.salesforce.com/238/latest/en-us/sfdc/pdf/salesforce_summer22_release_notes.pdf"},
    @{name="Spring_22"; url="https://resources.docs.salesforce.com/236/latest/en-us/sfdc/pdf/salesforce_spring22_release_notes.pdf"},
    @{name="Winter_22"; url="https://resources.docs.salesforce.com/234/latest/en-us/sfdc/pdf/salesforce_winter22_release_notes.pdf"},
    @{name="Summer_21"; url="https://resources.docs.salesforce.com/232/latest/en-us/sfdc/pdf/salesforce_summer21_release_notes.pdf"},
    @{name="Spring_21"; url="https://resources.docs.salesforce.com/230/latest/en-us/sfdc/pdf/salesforce_spring21_release_notes.pdf"},
    @{name="Winter_21"; url="https://resources.docs.salesforce.com/228/latest/en-us/sfdc/pdf/salesforce_winter21_release_notes.pdf"},
    @{name="Summer_20"; url="https://resources.docs.salesforce.com/226/latest/en-us/sfdc/pdf/salesforce_summer20_release_notes.pdf"},
    @{name="Spring_20"; url="https://resources.docs.salesforce.com/224/latest/en-us/sfdc/pdf/salesforce_spring20_release_notes.pdf"},
    @{name="Winter_20"; url="https://resources.docs.salesforce.com/222/latest/en-us/sfdc/pdf/salesforce_winter20_release_notes.pdf"},
    
    # === 2015-2019 RELEASES ===
    @{name="Summer_19"; url="https://resources.docs.salesforce.com/220/latest/en-us/sfdc/pdf/salesforce_summer19_release_notes.pdf"},
    @{name="Spring_19"; url="https://resources.docs.salesforce.com/218/latest/en-us/sfdc/pdf/salesforce_spring19_release_notes.pdf"},
    @{name="Winter_19"; url="https://resources.docs.salesforce.com/216/latest/en-us/sfdc/pdf/salesforce_winter19_release_notes.pdf"},
    @{name="Summer_18"; url="https://resources.docs.salesforce.com/214/latest/en-us/sfdc/pdf/salesforce_summer18_release_notes.pdf"},
    @{name="Spring_18"; url="https://resources.docs.salesforce.com/212/latest/en-us/sfdc/pdf/salesforce_spring18_release_notes.pdf"},
    @{name="Winter_18"; url="https://resources.docs.salesforce.com/210/latest/en-us/sfdc/pdf/salesforce_winter18_release_notes.pdf"},
    @{name="Summer_17"; url="https://resources.docs.salesforce.com/208/latest/en-us/sfdc/pdf/salesforce_summer17_release_notes.pdf"},
    @{name="Spring_17"; url="https://resources.docs.salesforce.com/206/latest/en-us/sfdc/pdf/salesforce_spring17_release_notes.pdf"},
    @{name="Winter_17"; url="https://resources.docs.salesforce.com/204/latest/en-us/sfdc/pdf/salesforce_winter17_release_notes.pdf"},
    @{name="Summer_16"; url="https://resources.docs.salesforce.com/202/latest/en-us/sfdc/pdf/salesforce_summer16_release_notes.pdf"},
    @{name="Spring_16"; url="https://resources.docs.salesforce.com/200/latest/en-us/sfdc/pdf/salesforce_spring16_release_notes.pdf"},
    @{name="Winter_16"; url="https://resources.docs.salesforce.com/198/latest/en-us/sfdc/pdf/salesforce_winter16_release_notes.pdf"},
    @{name="Summer_15"; url="https://resources.docs.salesforce.com/196/latest/en-us/sfdc/pdf/salesforce_summer15_release_notes.pdf"},
    @{name="Spring_15"; url="https://resources.docs.salesforce.com/194/latest/en-us/sfdc/pdf/salesforce_spring15_release_notes.pdf"},
    @{name="Winter_15"; url="https://resources.docs.salesforce.com/192/latest/en-us/sfdc/pdf/salesforce_winter15_release_notes.pdf"},
    
    # === 2010-2014 RELEASES ===
    @{name="Summer_14"; url="https://resources.docs.salesforce.com/190/latest/en-us/sfdc/pdf/salesforce_summer14_release_notes.pdf"},
    @{name="Spring_14"; url="https://resources.docs.salesforce.com/188/latest/en-us/sfdc/pdf/salesforce_spring14_release_notes.pdf"},
    @{name="Winter_14"; url="https://resources.docs.salesforce.com/186/latest/en-us/sfdc/pdf/salesforce_winter14_release_notes.pdf"},
    @{name="Summer_13"; url="https://resources.docs.salesforce.com/184/latest/en-us/sfdc/pdf/salesforce_summer13_release_notes.pdf"},
    @{name="Spring_13"; url="https://resources.docs.salesforce.com/182/latest/en-us/sfdc/pdf/salesforce_spring13_release_notes.pdf"},
    @{name="Winter_13"; url="https://resources.docs.salesforce.com/180/latest/en-us/sfdc/pdf/salesforce_winter13_release_notes.pdf"},
    @{name="Summer_12"; url="https://resources.docs.salesforce.com/178/latest/en-us/sfdc/pdf/salesforce_summer12_release_notes.pdf"},
    @{name="Spring_12"; url="https://resources.docs.salesforce.com/176/latest/en-us/sfdc/pdf/salesforce_spring12_release_notes.pdf"},
    @{name="Winter_12"; url="https://resources.docs.salesforce.com/174/latest/en-us/sfdc/pdf/salesforce_winter12_release_notes.pdf"},
    @{name="Summer_11"; url="https://resources.docs.salesforce.com/172/latest/en-us/sfdc/pdf/salesforce_summer11_release_notes.pdf"},
    @{name="Spring_11"; url="https://resources.docs.salesforce.com/170/latest/en-us/sfdc/pdf/salesforce_spring11_release_notes.pdf"},
    @{name="Winter_11"; url="https://resources.docs.salesforce.com/168/latest/en-us/sfdc/pdf/salesforce_winter11_release_notes.pdf"},
    @{name="Summer_10"; url="https://resources.docs.salesforce.com/166/latest/en-us/sfdc/pdf/salesforce_summer10_release_notes.pdf"},
    @{name="Spring_10"; url="https://resources.docs.salesforce.com/164/latest/en-us/sfdc/pdf/salesforce_spring10_release_notes.pdf"},
    @{name="Winter_10"; url="https://resources.docs.salesforce.com/162/latest/en-us/sfdc/pdf/salesforce_winter10_release_notes.pdf"},
    
    # === 2004-2009 RELEASES (Legacy) ===
    @{name="Summer_09"; url="https://resources.docs.salesforce.com/160/latest/en-us/sfdc/pdf/salesforce_summer09_release_notes.pdf"},
    @{name="Spring_09"; url="https://resources.docs.salesforce.com/158/latest/en-us/sfdc/pdf/salesforce_spring09_release_notes.pdf"},
    @{name="Winter_09"; url="https://resources.docs.salesforce.com/156/latest/en-us/sfdc/pdf/salesforce_winter09_release_notes.pdf"},
    @{name="Summer_08"; url="https://resources.docs.salesforce.com/154/latest/en-us/sfdc/pdf/salesforce_summer08_release_notes.pdf"},
    @{name="Spring_08"; url="https://resources.docs.salesforce.com/152/latest/en-us/sfdc/pdf/salesforce_spring08_release_notes.pdf"},
    @{name="Winter_08"; url="https://resources.docs.salesforce.com/150/latest/en-us/sfdc/pdf/salesforce_winter08_release_notes.pdf"},
    @{name="Summer_07"; url="https://resources.docs.salesforce.com/148/latest/en-us/sfdc/pdf/salesforce_summer07_release_notes.pdf"},
    @{name="Spring_07"; url="https://resources.docs.salesforce.com/146/latest/en-us/sfdc/pdf/salesforce_spring07_release_notes.pdf"},
    @{name="Winter_07"; url="https://resources.docs.salesforce.com/144/latest/en-us/sfdc/pdf/salesforce_winter07_release_notes.pdf"},
    @{name="Summer_06"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_summer06_release_notes.pdf"},
    @{name="Winter_06"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_winter06_release_notes.pdf"},
    @{name="Summer_05"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_summer05_release_notes.pdf"},
    @{name="Winter_05"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_winter05_release_notes.pdf"},
    @{name="Summer_04"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_summer04_release_notes.pdf"},
    @{name="Spring_04"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_spring04_release_notes.pdf"},
    @{name="Winter_04"; url="https://resources.docs.salesforce.com/142/latest/en-us/sfdc/pdf/salesforce_winter04_release_notes.pdf"},

    # === SPECIAL RELEASE NOTES ===
    @{name="WorkDotCom_2020_2023"; url="https://resources.docs.salesforce.com/rel1/doc/en-us/static/pdf/workdotcom_rn.pdf"},
    @{name="Platform_Mobile_7.0_BlackBerry"; url="https://resources.docs.salesforce.com/146/latest/en-us/sfdc/pdf/salesforce_axm_7.0_release_notes.pdf"},
    @{name="Platform_Mobile_6.1_WinMobile5"; url="https://resources.docs.salesforce.com/146/latest/en-us/sfdc/pdf/salesforce_axm_wm5_release_notes.pdf"},
    @{name="Platform_Mobile_6.0"; url="https://resources.docs.salesforce.com/146/latest/en-us/sfdc/pdf/salesforce_axm_6.0_release_notes.pdf"}
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SALESFORCE RELEASE NOTES PDF DOWNLOADER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Coverage: Winter '04 to Spring '26 (22+ years)" -ForegroundColor Yellow
Write-Host "Total Releases: $($releaseNotes.Count)" -ForegroundColor Yellow
Write-Host "Target Dir: $pdfsDir" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$downloaded = 0
$skipped = 0
$failed = 0
$totalSize = 0

for ($i = 0; $i -lt $releaseNotes.Count; $i++) {
    $release = $releaseNotes[$i]
    $fileName = "ReleaseNotes_$($release.name).pdf"
    $pdfPath = Join-Path $pdfsDir $fileName
    
    $progress = [math]::Round((($i + 1) / $releaseNotes.Count) * 100, 1)
    Write-Host "[$($i+1)/$($releaseNotes.Count)] ($progress%) " -NoNewline
    
    if (Test-Path $pdfPath) {
        $size = [math]::Round((Get-Item $pdfPath).Length / 1MB, 2)
        $totalSize += $size
        Write-Host "EXISTS: $($release.name) ($size MB)" -ForegroundColor Cyan
        $skipped++
        continue
    }
    
    Write-Host "Downloading: $($release.name)... " -NoNewline
    
    try {
        Invoke-WebRequest -Uri $release.url -OutFile $pdfPath -UseBasicParsing -TimeoutSec 120 -ErrorAction Stop
        
        if ((Test-Path $pdfPath) -and ((Get-Item $pdfPath).Length -gt 1000)) {
            $size = [math]::Round((Get-Item $pdfPath).Length / 1MB, 2)
            $totalSize += $size
            Write-Host "OK ($size MB)" -ForegroundColor Green
            $downloaded++
        } else {
            Write-Host "FAILED (empty)" -ForegroundColor Red
            if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
            $failed++
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match "404") {
            Write-Host "NOT FOUND" -ForegroundColor Yellow
        } else {
            Write-Host "FAILED: $errorMsg" -ForegroundColor Red
        }
        if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
        $failed++
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DOWNLOAD COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Downloaded: $downloaded new files" -ForegroundColor Green
Write-Host "Skipped:    $skipped (already exist)" -ForegroundColor Cyan
Write-Host "Failed:     $failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })
Write-Host "Total Size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Yellow

$finalCount = (Get-ChildItem $pdfsDir -Filter "*.pdf" -ErrorAction SilentlyContinue).Count
$finalSize = 0
if ($finalCount -gt 0) {
    $finalSize = [math]::Round((Get-ChildItem $pdfsDir -Filter "*.pdf" | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
}
Write-Host ""
Write-Host "Final PDF Count: $finalCount files ($finalSize MB)" -ForegroundColor Magenta
Write-Host "Coverage: 22+ years of Salesforce releases (Winter '04 - Spring '26)" -ForegroundColor Green
