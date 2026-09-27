# 切换到 Hardhat Local 网络 - 详细步骤

## ⚠️ 当前问题

从截图看，MetaMask 显示的网络是 **"Ethereum"（以太坊主网）**，而不是 **"Hardhat Local"**。

这就是为什么无法使用的原因！所有交易都需要在本地 Hardhat 网络上执行。

## 解决步骤

### 步骤 1: 添加 Hardhat Local 网络

如果还没有添加该网络，请按以下步骤操作：

1. **打开 MetaMask**
2. **点击顶部的网络选择器**（当前显示"Ethereum"的地方）
3. **点击"添加网络"** 或 **"添加网络（手动）"**
4. **填写以下信息**：

   ```
   网络名称: Hardhat Local
   RPC URL: http://localhost:8545
   链ID: 1337
   货币符号: ETH
   区块浏览器URL: (留空)
   ```

5. **点击"保存"**

### 步骤 2: 切换到 Hardhat Local 网络

1. **点击 MetaMask 顶部的网络选择器**
2. **选择 "Hardhat Local"**（应该出现在网络列表中）
3. **确认网络已切换**

### 步骤 3: 验证网络连接

切换后，你应该看到：
- 网络名称显示为 **"Hardhat Local"**
- 账户余额显示为 **10000 ETH**（或接近这个数字）
- 没有网络错误提示

### 步骤 4: 检查 Hardhat 节点状态

确保 Hardhat 节点正在运行：

1. 检查运行 `npm run node` 的终端窗口
2. 应该看到类似这样的输出：
   ```
   Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
   ```
3. 如果没有运行，请重新启动：
   ```powershell
   npm run node
   ```

## 常见问题

### 问题 1: 找不到"添加网络"选项

**解决方法**：
- 在 MetaMask 中，点击右上角三个点（菜单）
- 选择"设置" → "网络"
- 点击"添加网络"

### 问题 2: 添加网络后无法连接

**检查清单**：
- [ ] Hardhat 节点正在运行（`npm run node`）
- [ ] RPC URL 正确：`http://localhost:8545`
- [ ] 链ID 正确：`1337`（不是 31337）
- [ ] 浏览器没有阻止 localhost 连接

### 问题 3: 显示"无法连接到网络"

**解决方法**：
1. 确认 Hardhat 节点正在运行
2. 检查终端是否有错误信息
3. 尝试重启 Hardhat 节点：
   ```powershell
   # 停止当前节点（Ctrl+C）
   # 然后重新启动
   npm run node
   ```

### 问题 4: 网络添加成功但余额为 0

**解决方法**：
- 确保使用的是 Hardhat 生成的测试账户
- 检查账户地址是否与 Hardhat 终端中显示的地址一致
- 如果余额为 0，可以尝试导入其他测试账户

## 验证步骤

完成网络切换后，请验证：

1. ✅ MetaMask 顶部显示 **"Hardhat Local"**
2. ✅ 账户余额显示为 **10000 ETH**（或接近）
3. ✅ 没有红色警告或错误提示
4. ✅ 可以正常发起交易

## 如果仍然无法使用

请检查：

1. **Hardhat 节点状态**
   ```powershell
   # 检查节点是否运行
   Get-Process | Where-Object {$_.ProcessName -eq "node"}
   ```

2. **网络配置**
   - RPC URL: `http://localhost:8545`
   - 链ID: `1337`
   - 货币符号: `ETH`

3. **浏览器控制台错误**
   - 按 F12 打开开发者工具
   - 查看 Console 标签是否有错误信息

4. **合约地址配置**
   - 检查 `.env` 文件中的 `VITE_CONTRACT_ADDRESS` 是否正确

## 快速检查命令

在 PowerShell 中运行以下命令检查 Hardhat 节点：

```powershell
# 检查节点是否运行
$response = Invoke-WebRequest -Uri "http://localhost:8545" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -ErrorAction SilentlyContinue
if ($response) {
    Write-Host "✓ Hardhat 节点正在运行" -ForegroundColor Green
} else {
    Write-Host "✗ Hardhat 节点未运行" -ForegroundColor Red
    Write-Host "请运行: npm run node" -ForegroundColor Yellow
}
```

