# 验证私钥格式的 PowerShell 脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "私钥格式验证工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 标准测试私钥
$testPrivateKeys = @(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
)

Write-Host "验证标准测试私钥格式..." -ForegroundColor Yellow
Write-Host ""

foreach ($key in $testPrivateKeys) {
    $length = $key.Length
    $startsWith0x = $key.StartsWith("0x")
    $hasInvalidChars = $key -match "[^0-9a-fx]"
    $firstChar = $key[0]
    $secondChar = $key[1]
    
    Write-Host "私钥: $key" -ForegroundColor White
    Write-Host "  长度: $length (应该是 66)" -ForegroundColor $(if ($length -eq 66) { "Green" } else { "Red" })
    Write-Host "  以0x开头: $startsWith0x" -ForegroundColor $(if ($startsWith0x) { "Green" } else { "Red" })
    Write-Host "  第一个字符: '$firstChar' (应该是数字0)" -ForegroundColor $(if ($firstChar -eq '0') { "Green" } else { "Red" })
    Write-Host "  第二个字符: '$secondChar' (应该是小写x)" -ForegroundColor $(if ($secondChar -eq 'x') { "Green" } else { "Red" })
    Write-Host "  包含无效字符: $hasInvalidChars" -ForegroundColor $(if (-not $hasInvalidChars) { "Green" } else { "Red" })
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "可用的测试账户私钥（可直接复制）:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "账户 #0:" -ForegroundColor Yellow
Write-Host "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor Green
Write-Host ""
Write-Host "账户 #1:" -ForegroundColor Yellow
Write-Host "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" -ForegroundColor Green
Write-Host ""
Write-Host "账户 #2:" -ForegroundColor Yellow
Write-Host "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" -ForegroundColor Green
Write-Host ""

