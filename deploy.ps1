# 区块链医疗系统 - 自动化部署脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "区块链医疗系统 - 部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Hardhat 节点是否运行
Write-Host "步骤 1: 检查 Hardhat 节点..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8545" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Hardhat 节点正在运行" -ForegroundColor Green
} catch {
    Write-Host "✗ Hardhat 节点未运行！" -ForegroundColor Red
    Write-Host "请先运行: npm run node" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "步骤 2: 编译智能合约..." -ForegroundColor Yellow
$env:HARDHAT_DISABLE_TELEMETRY = "1"
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 编译失败！" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 编译成功" -ForegroundColor Green

Write-Host ""
Write-Host "步骤 3: 部署智能合约..." -ForegroundColor Yellow
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 部署失败！" -ForegroundColor Red
    exit 1
}

# 读取合约地址
if (Test-Path "contract-address.json") {
    $contractData = Get-Content "contract-address.json" | ConvertFrom-Json
    $contractAddress = $contractData.address
    Write-Host ""
    Write-Host "✓ 合约部署成功！" -ForegroundColor Green
    Write-Host "合约地址: $contractAddress" -ForegroundColor Cyan
    
    # 更新 .env 文件
    Write-Host ""
    Write-Host "步骤 4: 更新环境变量..." -ForegroundColor Yellow
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $updated = $false
        $newContent = @()
        foreach ($line in $envContent) {
            if ($line -match "^VITE_CONTRACT_ADDRESS=") {
                $newContent += "VITE_CONTRACT_ADDRESS=$contractAddress"
                $updated = $true
            } else {
                $newContent += $line
            }
        }
        if (-not $updated) {
            $newContent += "VITE_CONTRACT_ADDRESS=$contractAddress"
        }
        $newContent | Set-Content ".env"
    } else {
        "VITE_CONTRACT_ADDRESS=$contractAddress" | Set-Content ".env"
    }
    Write-Host "✓ 环境变量已更新" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "部署完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Yellow
    Write-Host "1. 确保 MetaMask 连接到本地网络 (localhost:8545, ChainID: 1337)" -ForegroundColor White
    Write-Host "2. 运行 'npm run dev' 启动前端应用" -ForegroundColor White
    Write-Host "3. 访问 http://localhost:5173" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✗ 未找到合约地址文件！" -ForegroundColor Red
    exit 1
}

