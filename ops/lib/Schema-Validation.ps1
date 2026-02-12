<#
.SYNOPSIS
    Strict Schema Version Pinning for SintraPrime Supermemory operations.
    Upgrade #1 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Requires that Supermemory CLIs emit a schemaVersion field and validates it matches expectations.
    Prevents silent breakage when CLIs are upgraded.
    Prevents "works on my machine" issues.

.PARAMETER ExpectedVersion
    The expected schema version string.

.PARAMETER JsonOutput
    The JSON output from a CLI to validate.

.OUTPUTS
    JSON object with validation result.

.EXAMPLE
    . .\lib\Schema-Validation.ps1
    $result = Test-SchemaVersion -JsonOutput $cliOutput -ExpectedVersion "v1"
#>

# Schema configuration
$script:SchemaConfig = @{
    # Expected schema versions for different CLI outputs
    Versions = @{
        "sm-make" = "sm-make-v1"
        "search" = "search-v1"
        "index" = "index-v1"
        "health" = "sm-health-v1"
        "router" = "router-v1"
        "receipt" = "receipt-v1"
    }
    # Required fields for each schema type
    RequiredFields = @{
        "sm-make-v1" = @("version", "status", "timestamp")
        "search-v1" = @("schemaVersion", "results")
        "index-v1" = @("schemaVersion", "indexed")
        "sm-health-v1" = @("version", "metrics", "status")
        "router-v1" = @("version", "route", "proceed")
        "receipt-v1" = @("event", "timestamp")
    }
}

function Test-SchemaVersion {
    <#
    .SYNOPSIS
        Validates that JSON output has the expected schema version.
    
    .PARAMETER JsonOutput
        The JSON output to validate (string or PSCustomObject).
    
    .PARAMETER ExpectedVersion
        The expected version string.
    
    .PARAMETER SchemaType
        The type of schema (for field validation).
    
    .OUTPUTS
        PSCustomObject with: valid, version, expectedVersion, reason
    #>
    param(
        [Parameter(Mandatory=$true)]
        $JsonOutput,
        
        [Parameter(Mandatory=$true)]
        [string]$ExpectedVersion,
        
        [string]$SchemaType = "sm-make"
    )
    
    $result = @{
        valid = $false
        expectedVersion = $ExpectedVersion
        schemaType = $SchemaType
        timestamp = (Get-Date).ToString("o")
        checks = @()
    }
    
    # Parse JSON if string
    $parsed = $null
    if ($JsonOutput -is [string]) {
        try {
            $parsed = $JsonOutput | ConvertFrom-Json
            $result.checks += @{ check = "json_parse"; passed = $true }
        }
        catch {
            $result.reason = "Failed to parse JSON: $_"
            $result.checks += @{ check = "json_parse"; passed = $false; error = $_.Exception.Message }
            return [PSCustomObject]$result
        }
    }
    else {
        $parsed = $JsonOutput
        $result.checks += @{ check = "json_parse"; passed = $true; note = "Already parsed" }
    }
    
    # Check for version field
    $versionField = $null
    $versionFieldName = $null
    
    # Try different version field names
    foreach ($fieldName in @("version", "schemaVersion", "schema_version", "Version")) {
        if ($parsed.PSObject.Properties[$fieldName]) {
            $versionField = $parsed.$fieldName
            $versionFieldName = $fieldName
            break
        }
    }
    
    if ($null -eq $versionField) {
        $result.reason = "No version field found in output"
        $result.checks += @{ check = "version_field"; passed = $false; error = "Missing version field" }
        return [PSCustomObject]$result
    }
    
    $result.actualVersion = $versionField
    $result.versionFieldName = $versionFieldName
    $result.checks += @{ check = "version_field"; passed = $true; field = $versionFieldName }
    
    # Validate version matches
    if ($versionField -ne $ExpectedVersion) {
        $result.reason = "Version mismatch: expected '$ExpectedVersion', got '$versionField'"
        $result.checks += @{ 
            check = "version_match"
            passed = $false
            expected = $ExpectedVersion
            actual = $versionField
        }
        return [PSCustomObject]$result
    }
    
    $result.checks += @{ check = "version_match"; passed = $true }
    
    # Validate required fields if schema type is known
    $requiredFields = $script:SchemaConfig.RequiredFields[$ExpectedVersion]
    if ($requiredFields) {
        $missingFields = @()
        foreach ($field in $requiredFields) {
            if (-not $parsed.PSObject.Properties[$field]) {
                $missingFields += $field
            }
        }
        
        if ($missingFields.Count -gt 0) {
            $result.reason = "Missing required fields: $($missingFields -join ', ')"
            $result.checks += @{
                check = "required_fields"
                passed = $false
                missing = $missingFields
                required = $requiredFields
            }
            return [PSCustomObject]$result
        }
        
        $result.checks += @{ check = "required_fields"; passed = $true; validated = $requiredFields }
    }
    
    # All checks passed
    $result.valid = $true
    $result.reason = "Schema validation passed"
    
    return [PSCustomObject]$result
}

function Get-SchemaVersionFromCLI {
    <#
    .SYNOPSIS
        Extracts and validates schema version from CLI output.
    
    .PARAMETER CliOutput
        Raw CLI output string.
    
    .PARAMETER CliName
        Name of the CLI for expected version lookup.
    
    .OUTPUTS
        PSCustomObject with validation result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$CliOutput,
        
        [Parameter(Mandatory=$true)]
        [string]$CliName
    )
    
    $expectedVersion = $script:SchemaConfig.Versions[$CliName]
    if (-not $expectedVersion) {
        return @{
            valid = $false
            reason = "Unknown CLI name: $CliName"
            knownClis = $script:SchemaConfig.Versions.Keys
        }
    }
    
    return Test-SchemaVersion -JsonOutput $CliOutput -ExpectedVersion $expectedVersion -SchemaType $CliName
}

function Assert-SchemaVersion {
    <#
    .SYNOPSIS
        Validates schema version and throws if invalid (for -Strict mode).
    
    .PARAMETER JsonOutput
        The JSON output to validate.
    
    .PARAMETER ExpectedVersion
        The expected version string.
    
    .PARAMETER ExitCodeOnFailure
        Exit code to use if validation fails. Default: 7.
    
    .OUTPUTS
        Returns the parsed JSON if valid, throws/exits if invalid.
    #>
    param(
        [Parameter(Mandatory=$true)]
        $JsonOutput,
        
        [Parameter(Mandatory=$true)]
        [string]$ExpectedVersion,
        
        [int]$ExitCodeOnFailure = 7
    )
    
    $validation = Test-SchemaVersion -JsonOutput $JsonOutput -ExpectedVersion $ExpectedVersion
    
    if (-not $validation.valid) {
        $errorResult = @{
            version = "sm-make-v1"
            status = "error"
            error = "Schema validation failed: $($validation.reason)"
            validation = $validation
            exitCode = $ExitCodeOnFailure
            timestamp = (Get-Date).ToString("o")
        }
        
        # Output error and exit
        [Console]::Write(($errorResult | ConvertTo-Json -Depth 5 -Compress))
        exit $ExitCodeOnFailure
    }
    
    # Return parsed JSON
    if ($JsonOutput -is [string]) {
        return $JsonOutput | ConvertFrom-Json
    }
    return $JsonOutput
}

function New-SchemaVersionedOutput {
    <#
    .SYNOPSIS
        Creates a new output object with proper schema versioning.
    
    .PARAMETER Data
        The data to include in the output.
    
    .PARAMETER SchemaType
        The type of schema to use.
    
    .OUTPUTS
        PSCustomObject with version field and data.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Data,
        
        [string]$SchemaType = "sm-make"
    )
    
    $version = $script:SchemaConfig.Versions[$SchemaType]
    if (-not $version) {
        $version = "unknown-v1"
    }
    
    $output = @{
        version = $version
        timestamp = (Get-Date).ToString("o")
    }
    
    # Merge data
    foreach ($key in $Data.Keys) {
        $output[$key] = $Data[$key]
    }
    
    return [PSCustomObject]$output
}

# Export functions
Export-ModuleMember -Function Test-SchemaVersion, Get-SchemaVersionFromCLI, Assert-SchemaVersion, New-SchemaVersionedOutput -ErrorAction SilentlyContinue
