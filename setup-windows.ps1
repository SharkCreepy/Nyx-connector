# Nyx V1 Windows MCP setup.
# Runs before bridge.exe so a ZIP copied to another PC does not retain
# developer-specific Roblox or VS Code paths.
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$configPath = Join-Path $root 'config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json

if (-not $config.mcpServers) {
    throw "config.json has no mcpServers object."
}

$robloxRoot = Join-Path $env:LOCALAPPDATA 'Roblox\Versions'
$studioMcp = $null
if (Test-Path -LiteralPath $robloxRoot) {
    $studioMcp = Get-ChildItem -LiteralPath $robloxRoot -Filter 'StudioMCP.exe' -File -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

if ($config.mcpServers.roblox) {
    if ($studioMcp) {
        $config.mcpServers.roblox.command = $studioMcp.FullName
        Write-Host "  Roblox MCP: $($studioMcp.FullName)"
    } else {
        Write-Host "  WARNING: Roblox StudioMCP.exe was not found. Open/install Roblox Studio, then restart Nyx."
    }
}

if ($config.mcpServers.vscode) {
    $vscodeMcp = Join-Path $root 'vscode_mcp.exe'
    if (Test-Path -LiteralPath $vscodeMcp) {
        $config.mcpServers.vscode.command = $vscodeMcp
    }
    if (-not $config.mcpServers.vscode.env) {
        $config.mcpServers.vscode | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{})
    }
    # The old package contained a developer-only D: drive path. Use the
    # extracted Nyx folder as a valid default workspace unless the user edits it.
    $config.mcpServers.vscode.env.VSCODE_WORKSPACE_PATH = $root
    Write-Host "  VS Code MCP: $($config.mcpServers.vscode.command)"
}

$json = $config | ConvertTo-Json -Depth 10
# Windows PowerShell 5.1's -Encoding UTF8 adds a BOM. The bundled bridge's
# JSON reader rejects that prefix, so write explicit UTF-8 without a BOM.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configPath, $json, $utf8NoBom)
