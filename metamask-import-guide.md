# MetaMask 导入私钥故障排除指南

## ⚠️ 最常见问题：0x vs Ox（数字0 vs 字母O）

**这是导致红色框框的最常见原因！**

- ✅ **正确**：`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`（数字0）
- ❌ **错误**：`Oxac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`（字母O）

**解决方法**：确保私钥以 `0x` 开头（数字0，不是字母O）

---

## 问题：导入私钥时显示红色框框

### 常见原因和解决方法

#### 1. 私钥格式问题 ⚠️ 最常见

**问题**: MetaMask 要求私钥必须是正确的格式

**解决方法**:
- 确保私钥以 `0x` 开头
- 确保私钥总长度为 **66 个字符**（包括 `0x`）
- 确保没有多余的空格、换行符或特殊字符

**正确格式示例**:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
注意：`0x` 是**数字0**，不是字母O

**错误格式示例**:
```
Oxac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  ❌ 字母O（最常见错误！）
ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  ❌ 缺少 0x
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   ❌ 末尾有空格
0Xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  ❌ 大写X
```

#### 2. 复制粘贴问题

**解决方法**:
1. 在 Hardhat 终端中，**只复制私钥部分**（从 `0x` 开始到结束）
2. 在 MetaMask 中粘贴前，先清空输入框
3. 粘贴后检查是否有隐藏字符

**推荐操作**:
- 使用 `Ctrl+A` 全选私钥
- 使用 `Ctrl+C` 复制
- 在 MetaMask 中使用 `Ctrl+V` 粘贴

#### 3. MetaMask 版本问题

**解决方法**:
- 确保 MetaMask 是最新版本
- 如果问题持续，尝试：
  1. 刷新浏览器页面
  2. 重新打开 MetaMask 扩展
  3. 清除浏览器缓存后重试

#### 4. 使用助记词导入（替代方案）

如果私钥导入一直失败，可以：

1. **创建新账户**，然后使用 Hardhat 的 `impersonateAccount` 功能
2. 或者使用 **MetaMask 的开发者模式**：
   - 打开 MetaMask
   - 设置 → 高级 → 启用"显示测试网络"
   - 然后尝试导入

## 标准导入步骤

### 步骤 1: 获取私钥

在运行 `npm run node` 的终端中，找到类似这样的输出：

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**只复制私钥部分**：`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### 步骤 2: 在 MetaMask 中导入

1. 打开 MetaMask 扩展
2. 点击右上角的**账户图标**（圆形头像）
3. 选择 **"导入账户"**（Import Account）
4. 选择 **"私钥"**（Private Key）
5. **仔细粘贴私钥**（确保没有多余空格）
6. 点击 **"导入"**

### 步骤 3: 验证导入

- 检查账户地址是否与 Hardhat 显示的地址一致
- 检查余额是否显示为 10000 ETH（或接近）

## Hardhat 标准测试账户

以下是 Hardhat 默认生成的测试账户（可以直接使用）：

### 账户 #0
- **地址**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **私钥**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **余额**: 10000 ETH

### 账户 #1
- **地址**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **私钥**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- **余额**: 10000 ETH

### 账户 #2
- **地址**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **私钥**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- **余额**: 10000 ETH

## 快速验证私钥格式

在 PowerShell 中运行以下命令验证私钥格式：

```powershell
# 检查私钥长度（应该是 66）
"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80".Length

# 应该输出: 66
```

## 如果仍然无法导入

### 方法 1: 使用 MetaMask 的开发者工具

1. 打开浏览器控制台（F12）
2. 在 MetaMask 扩展中，打开开发者模式
3. 尝试使用 `ethereum.request()` API 直接导入

### 方法 2: 使用 Hardhat 的账户功能

如果导入失败，可以：
1. 在 MetaMask 中创建新账户
2. 使用 Hardhat 的 `hardhat_impersonateAccount` 功能来模拟账户

### 方法 3: 检查网络配置

确保：
- MetaMask 已切换到 **Hardhat Local** 网络
- 链ID 设置为 **1337**
- RPC URL 为 `http://localhost:8545`

## 常见错误信息

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| "Invalid private key" | 私钥格式错误 | 检查是否有 0x 前缀，长度是否为 66 |
| "Private key must be 64 hex characters" | 缺少 0x 前缀 | 添加 0x 前缀 |
| "Invalid hex string" | 包含无效字符 | 检查是否有空格或特殊字符 |

## 提示

- ✅ 总是从 Hardhat 终端**直接复制**私钥，不要手动输入
- ✅ 粘贴前**清空输入框**
- ✅ 检查私钥**总长度为 66 个字符**（包括 0x）
- ✅ 确保在**正确的网络**（Hardhat Local）上导入
- ❌ 不要在有其他人的地方分享你的私钥
- ❌ 不要在真实网络上使用测试私钥

