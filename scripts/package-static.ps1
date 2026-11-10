[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputArchive
)

$ErrorActionPreference = 'Stop'
$projectDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archivePath = [System.IO.Path]::GetFullPath($OutputArchive)
if ([System.IO.Path]::GetExtension($archivePath) -ne '.zip') {
    throw 'OutputArchive harus menggunakan ekstensi .zip.'
}
if ($archivePath.StartsWith($projectDirectory + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Pilih OutputArchive di luar checkout agar paket release tidak ikut masuk repository publik.'
}
if (Test-Path -LiteralPath $archivePath) {
    throw "Archive sudah ada. Pilih nama release baru: $archivePath"
}

$npmCommand = if ($env:OS -eq 'Windows_NT') { 'npm.cmd' } else { 'npm' }
Push-Location -LiteralPath $projectDirectory
try {
    & $npmCommand ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci gagal.' }
    & $npmCommand test
    if ($LASTEXITCODE -ne 0) { throw 'Pengujian frontend gagal.' }
    & $npmCommand run test:db
    if ($LASTEXITCODE -ne 0) { throw 'Pengujian database lokal gagal.' }
    & $npmCommand run build
    if ($LASTEXITCODE -ne 0) { throw 'Build gagal.' }

    $distributionDirectory = Join-Path $projectDirectory 'dist'
    if (-not (Test-Path -LiteralPath (Join-Path $distributionDirectory 'index.html'))) {
        throw 'dist/index.html tidak ditemukan setelah build.'
    }
    $archiveParent = [System.IO.Path]::GetDirectoryName($archivePath)
    New-Item -ItemType Directory -Force -Path $archiveParent | Out-Null
    Compress-Archive -Path (Join-Path $distributionDirectory '*') -DestinationPath $archivePath -CompressionLevel Optimal
    Get-FileHash -LiteralPath $archivePath -Algorithm SHA256 | Select-Object Path, Hash
    Write-Output 'Paket static dibuat. Upload dan verifikasi hosting/target Supabase masih harus dijalankan sesuai docs/DEPLOYMENT.md.'
}
finally {
    Pop-Location
}
