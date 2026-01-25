<#
.SYNOPSIS
    Seals OpenCode configuration with cryptographic signature using Ed25519 SSH keys.

.DESCRIPTION
    This script computes the SHA256 hash of an OpenCode configuration file,
    signs the hash using ssh-keygen with Ed25519 keys, and stores the seal
    and signature in a governance directory for later verification.

.PARAMETER OpenCodeConfigPath
    Path to the OpenCode configuration file to seal.

.PARAMETER SealDir
    Directory where seal artifacts (hash and signature) will be stored.

.PARAMETER PrivateKeyPath
    Path to the Ed25519 private key for signing.

.PARAMETER AllowedSignersPath
    Path to the allowed_signers file for signature verification.

.PARAMETER SignerIdentity
    Identity of the signer (e.g., email or namespace identifier).

.PARAMETER Namespace
    Namespace for the signature (used by ssh-keygen -Y sign).

.PARAMETER HashFilename
    Name of the hash file. Default: "opencode.json.sha256"

.PARAMETER SigFilename
    Name of the signature file. Default: "opencode.json.sha256.sig"

.EXAMPLE
    .\Seal-OpenCodeConfig.ps1 `
        -OpenCodeConfigPath "C:\Users\admin\.config\opencode\opencode.json" `
        -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
        -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
        -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
        -SignerIdentity "sintraprime-opencode-config" `
        -Namespace "sintraprime-opencode-config"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$OpenCodeConfigPath,

    [Parameter(Mandatory=$true)]
    [string]$SealDir,

    [Parameter(Mandatory=$true)]
    [string]$PrivateKeyPath,

    [Parameter(Mandatory=$true)]
    [string]$AllowedSignersPath,

    [Parameter(Mandatory=$true)]
    [string]$SignerIdentity,

    [Parameter(Mandatory=$true)]
    [string]$Namespace,

    [Parameter(Mandatory=$false)]
    [string]$HashFilename = "opencode.json.sha256",

    [Parameter(Mandatory=$false)]
    [string]$SigFilename = "opencode.json.sha256.sig"
)

$ErrorActionPreference = "Stop"

# Expand environment variables in paths
$OpenCodeConfigPath = [Environment]::ExpandEnvironmentVariables($OpenCodeConfigPath)
$SealDir = [Environment]::ExpandEnvironmentVariables($SealDir)
$PrivateKeyPath = [Environment]::ExpandEnvironmentVariables($PrivateKeyPath)
$AllowedSignersPath = [Environment]::ExpandEnvironmentVariables($AllowedSignersPath)

# Validate inputs
Write-Host "[SEAL] Validating inputs..." -ForegroundColor Cyan

if (-not (Test-Path $OpenCodeConfigPath)) {
    Write-Error "OpenCode config not found: $OpenCodeConfigPath"
}

if (-not (Test-Path $PrivateKeyPath)) {
    Write-Error "Private key not found: $PrivateKeyPath"
}

if (-not (Test-Path $AllowedSignersPath)) {
    Write-Error "Allowed signers file not found: $AllowedSignersPath"
}

# Create seal directory if it doesn't exist
if (-not (Test-Path $SealDir)) {
    Write-Host "[SEAL] Creating seal directory: $SealDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $SealDir -Force | Out-Null
}

# Compute SHA256 hash
Write-Host "[SEAL] Computing SHA256 hash of: $OpenCodeConfigPath" -ForegroundColor Cyan
$hashObj = Get-FileHash -Path $OpenCodeConfigPath -Algorithm SHA256
$hash = $hashObj.Hash.ToLower()

Write-Host "[SEAL] SHA256: $hash" -ForegroundColor Green

# Prepare hash file path
$hashFilePath = Join-Path $SealDir $HashFilename
$sigFilePath = Join-Path $SealDir $SigFilename

# Write hash to file
Write-Host "[SEAL] Writing hash to: $hashFilePath" -ForegroundColor Cyan
$hash | Out-File -FilePath $hashFilePath -Encoding ASCII -NoNewline

# Sign the hash file using ssh-keygen
Write-Host "[SEAL] Signing hash with Ed25519 key..." -ForegroundColor Cyan
Write-Host "[SEAL]   Namespace: $Namespace" -ForegroundColor Gray
Write-Host "[SEAL]   Signer: $SignerIdentity" -ForegroundColor Gray

$sshKeygenArgs = @(
    "-Y", "sign",
    "-f", $PrivateKeyPath,
    "-n", $Namespace,
    $hashFilePath
)

try {
    $result = & ssh-keygen @sshKeygenArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ssh-keygen signing failed with exit code $LASTEXITCODE. Output: $result"
    }
} catch {
    Write-Error "Failed to execute ssh-keygen: $_"
}

# The signature file should be created as <hashfile>.sig
$expectedSigPath = "$hashFilePath.sig"
if (-not (Test-Path $expectedSigPath)) {
    Write-Error "Signature file was not created at expected path: $expectedSigPath"
}

# Move signature to final location if different
if ($expectedSigPath -ne $sigFilePath) {
    Move-Item -Path $expectedSigPath -Destination $sigFilePath -Force
}

Write-Host "[SEAL] Signature written to: $sigFilePath" -ForegroundColor Green

# Verify the signature immediately
Write-Host "[SEAL] Verifying signature..." -ForegroundColor Cyan

$verifyArgs = @(
    "-Y", "verify",
    "-f", $AllowedSignersPath,
    "-I", $SignerIdentity,
    "-n", $Namespace,
    "-s", $sigFilePath,
    "<", $hashFilePath
)

try {
    # ssh-keygen -Y verify requires the data to be piped or redirected
    $verifyResult = Get-Content $hashFilePath | & ssh-keygen -Y verify -f $AllowedSignersPath -I $SignerIdentity -n $Namespace -s $sigFilePath 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Signature verification failed with exit code $LASTEXITCODE. Output: $verifyResult"
    }
} catch {
    Write-Error "Failed to verify signature: $_"
}

Write-Host "[SEAL] ✓ Signature verified successfully" -ForegroundColor Green

# Log the sealing operation
$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$operator = $env:USERNAME

Write-Host ""
Write-Host "[SEAL] ═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "[SEAL] SEAL COMPLETE" -ForegroundColor Green
Write-Host "[SEAL] ═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "[SEAL] Timestamp:    $timestamp" -ForegroundColor White
Write-Host "[SEAL] Operator:     $operator" -ForegroundColor White
Write-Host "[SEAL] Config:       $OpenCodeConfigPath" -ForegroundColor White
Write-Host "[SEAL] SHA256:       $hash" -ForegroundColor White
Write-Host "[SEAL] Seal Dir:     $SealDir" -ForegroundColor White
Write-Host "[SEAL] Hash File:    $HashFilename" -ForegroundColor White
Write-Host "[SEAL] Sig File:     $SigFilename" -ForegroundColor White
Write-Host "[SEAL] ═══════════════════════════════════════════════════" -ForegroundColor Cyan

# Create audit log entry
$auditLogDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"
$auditLogDir = [Environment]::ExpandEnvironmentVariables($auditLogDir)

if (Test-Path $auditLogDir) {
    $auditEntry = @{
        timestamp = $timestamp
        operation = "SEAL"
        operator = $operator
        config_path = $OpenCodeConfigPath
        hash = $hash
        seal_dir = $SealDir
        namespace = $Namespace
        signer_identity = $SignerIdentity
    }
    
    $auditLogFile = Join-Path $auditLogDir "seal_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
    $auditEntry | ConvertTo-Json -Depth 10 | Out-File -FilePath $auditLogFile -Encoding UTF8
    Write-Host "[SEAL] Audit log: $auditLogFile" -ForegroundColor Gray
}

exit 0
