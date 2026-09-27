# 区块链医疗系统 - 完整部署指南

本文档提供区块链医疗系统的详尽部署指南，包括本地开发环境部署和生产环境部署。

## 📋 目录

- [环境要求](#环境要求)
- [本地开发环境部署](#本地开发环境部署)
- [生产环境部署](#生产环境部署)
- [自动化部署脚本](#自动化部署脚本)
- [常见问题排查](#常见问题排查)
- [维护和更新](#维护和更新)

---

## 环境要求

### 必需软件

1. **Node.js** >= 16.0.0
   - 下载地址：https://nodejs.org/
   - 验证安装：`node --version`

2. **npm** >= 8.0.0（通常随 Node.js 一起安装）
   - 验证安装：`npm --version`

3. **MetaMask 浏览器扩展**
   - Chrome: https://chrome.google.com/webstore/detail/metamask
   - Firefox: https://addons.mozilla.org/firefox/addon/ether-metamask
   - Edge: https://microsoftedge.microsoft.com/addons/detail/metamask

4. **Git**（可选，用于版本控制）
   - 下载地址：https://git-scm.com/

### 系统要求

- **操作系统**: Windows 10/11, macOS, 或 Linux
- **内存**: 至少 4GB RAM（推荐 8GB+）
- **磁盘空间**: 至少 2GB 可用空间
- **网络**: 互联网连接（用于下载依赖和部署到测试网/主网）

---

## 本地开发环境部署

### 步骤 1: 克隆或下载项目

如果使用 Git：
```bash
git clone <项目仓库地址>
cd blockchain-medical
```

如果直接下载 ZIP 文件，解压后进入项目目录。

### 步骤 2: 安装项目依赖

在项目根目录执行：
```bash
npm install
```

**预期输出**：
- 会下载并安装所有依赖包（可能需要几分钟）
- 如果看到警告（WARN），通常可以忽略
- 如果看到错误（ERROR），请检查 Node.js 版本

**常见问题**：
- 如果安装失败，尝试删除 `node_modules` 和 `package-lock.json`，然后重新运行 `npm install`
- 如果网络较慢，可以使用国内镜像：`npm install --registry=https://registry.npmmirror.com`

### 步骤 3: 启动本地区块链节点

打开**第一个终端窗口**，运行：
```bash
npm run node
```

**预期输出**：
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

...
```

**重要提示**：
- ✅ **保持这个终端窗口打开**！关闭窗口会停止区块链节点
- ✅ 记录至少一个账户的私钥（用于 MetaMask 导入）
- ✅ 节点运行在 `http://localhost:8545`，链ID 为 `1337`

### 步骤 4: 编译智能合约

打开**第二个终端窗口**（保持第一个终端运行），执行：
```bash
npm run compile
```

**预期输出**：
```
Compiled 1 Solidity file successfully
```

**常见问题**：
- 如果首次运行，Hardhat 可能询问是否发送匿名数据，输入 `y` 或 `n` 都可以
- 如果编译失败，检查 `contracts/MedicalRecord.sol` 文件是否有语法错误

### 步骤 5: 部署智能合约

在**同一个终端窗口**（步骤 4 的终端），执行：
```bash
npm run deploy
```

**预期输出**：
```
部署合约，账户: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
账户余额: 10000000000000000000000
MedicalRecord 合约已部署到: 0x5FbDB2315678afecb367f032d93F642f64180aa3
合约地址已保存到 contract-address.json
```

**重要提示**：
- ✅ **复制合约地址**（例如：`0x5FbDB2315678afecb367f032d93F642f64180aa3`）
- ✅ 合约地址已自动保存到 `contract-address.json` 文件

### 步骤 6: 配置环境变量

在项目根目录创建或编辑 `.env` 文件：

**Windows (PowerShell)**:
```powershell
echo "VITE_CONTRACT_ADDRESS=你的合约地址" > .env
```

**Windows (CMD)**:
```cmd
echo VITE_CONTRACT_ADDRESS=你的合约地址 > .env
```

**macOS/Linux**:
```bash
echo "VITE_CONTRACT_ADDRESS=你的合约地址" > .env
```

**或者手动创建 `.env` 文件**，内容如下：
```
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**注意**：将 `你的合约地址` 替换为步骤 5 中获得的实际合约地址。

### 步骤 7: 启动前端应用

打开**第三个终端窗口**，执行：
```bash
npm run dev
```

**预期输出**：
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**重要提示**：
- ✅ 前端应用运行在 `http://localhost:5173`（注意：不是 3000）
- ✅ 如果端口被占用，Vite 会自动使用下一个可用端口

### 步骤 8: 配置 MetaMask

#### 8.1 添加本地网络

1. 打开 MetaMask 浏览器扩展
2. 点击网络选择器（顶部显示当前网络的地方，如"以太坊主网络"）
3. 点击"添加网络" → "手动添加网络"
4. 填写以下信息：
   - **网络名称**: `Hardhat Local`
   - **RPC URL**: `http://localhost:8545`
   - **链ID**: `1337`
   - **货币符号**: `ETH`
   - **区块浏览器URL**: （留空）
5. 点击"保存"

#### 8.2 导入测试账户

1. 在运行 `npm run node` 的终端中，找到测试账户私钥（例如：`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`）
2. 在 MetaMask 中：
   - 点击账户图标（右上角圆形图标）
   - 选择"导入账户"
   - 选择"私钥"
   - **仔细粘贴私钥**（确保包含 `0x` 前缀，共 66 个字符，无空格）
   - 点击"导入"

**重要提示**：
- ✅ 私钥必须以 `0x` 开头
- ✅ 私钥总长度为 66 个字符
- ✅ 可以导入多个账户，用于测试不同角色（医生、病人、查证单位）
- ✅ 这些是测试账户，**不要在生产环境使用这些私钥**

### 步骤 9: 使用系统

1. **访问前端应用**
   - 打开浏览器，访问 `http://localhost:5173`

2. **连接钱包**
   - 点击"连接 MetaMask 钱包"按钮
   - 在 MetaMask 弹窗中确认连接

3. **注册账户**
   - 如果账户未注册，点击"立即注册"
   - 选择角色：
     - **医生**：可以创建病历和开具发票
     - **病人**：可以查看自己的病历和发票
     - **发票查证单位**：可以验证发票
   - 填写姓名和身份证号/执业证号
   - 点击"注册"

4. **开始使用**
   - 根据角色使用相应功能
   - 医生可以创建病历和开具发票
   - 病人可以查看自己的病历和发票
   - 查证单位可以验证发票

---

## 生产环境部署

生产环境部署需要将智能合约部署到真实的区块链网络（如以太坊测试网或主网）。

### 准备工作

#### 1. 获取测试网代币

**Sepolia 测试网**（推荐）：
- 水龙头：https://sepoliafaucet.com/
- 或：https://faucet.quicknode.com/ethereum/sepolia

**Goerli 测试网**（已弃用，不推荐）：
- 水龙头：https://goerlifaucet.com/

#### 2. 配置网络

编辑 `hardhat.config.ts`，添加测试网配置：

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    // 添加 Sepolia 测试网配置
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // 添加以太坊主网配置（谨慎使用）
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
  },
  // ... 其他配置
};

export default config;
```

#### 3. 配置环境变量

创建 `.env` 文件（**不要提交到 Git**）：

```
# 合约地址（部署后更新）
VITE_CONTRACT_ADDRESS=

# 部署账户私钥（不要泄露！）
PRIVATE_KEY=你的私钥（0x开头）

# Infura API Key（用于连接以太坊网络）
INFURA_API_KEY=你的Infura_API_Key

# 或者使用 Alchemy
ALCHEMY_API_KEY=你的Alchemy_API_Key
```

**安全提示**：
- ⚠️ **永远不要将 `.env` 文件提交到 Git**
- ⚠️ **不要在生产环境使用测试账户私钥**
- ⚠️ **妥善保管私钥，丢失无法恢复**

#### 4. 获取 RPC 端点

**选项 1: Infura**
1. 访问 https://infura.io/
2. 注册账户并创建项目
3. 获取 API Key

**选项 2: Alchemy**
1. 访问 https://www.alchemy.com/
2. 注册账户并创建应用
3. 获取 API Key

### 部署到测试网

#### 步骤 1: 编译合约

```bash
npm run compile
```

#### 步骤 2: 部署到 Sepolia 测试网

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

**预期输出**：
```
部署合约，账户: 0x你的账户地址
账户余额: 你的余额
MedicalRecord 合约已部署到: 0x合约地址
合约地址已保存到 contract-address.json
```

#### 步骤 3: 验证合约（可选）

如果使用 Etherscan 验证：

```bash
npx hardhat verify --network sepolia 合约地址
```

#### 步骤 4: 更新前端配置

更新 `.env` 文件：
```
VITE_CONTRACT_ADDRESS=0x你的测试网合约地址
```

#### 步骤 5: 构建前端

```bash
npm run build
```

构建产物在 `dist` 目录。

#### 步骤 6: 部署前端

**选项 1: Vercel**
```bash
npm install -g vercel
vercel
```

**选项 2: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**选项 3: 传统服务器**
- 将 `dist` 目录内容上传到 Web 服务器
- 配置 Nginx/Apache 指向 `dist` 目录

### 部署到主网（谨慎！）

⚠️ **警告**：部署到主网需要真实 ETH，且不可撤销。请确保：
1. 代码已经过充分测试
2. 合约已经过安全审计
3. 有足够的 ETH 支付 Gas 费用

部署步骤与测试网相同，但使用 `mainnet` 网络：

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

---

## 自动化部署脚本

### Windows PowerShell 脚本

项目包含 `deploy.ps1` 脚本，可以自动化部署流程：

```powershell
.\deploy.ps1
```

**脚本功能**：
- ✅ 检查 Hardhat 节点是否运行
- ✅ 编译智能合约
- ✅ 部署智能合约
- ✅ 自动更新 `.env` 文件

### 一键启动脚本（Windows）

项目包含 `start.bat` 脚本，可以一键启动所有服务：

```cmd
start.bat
```

**注意**：需要根据实际项目路径修改脚本中的路径。

### 手动创建自动化脚本

**macOS/Linux** - 创建 `deploy.sh`：

```bash
#!/bin/bash

echo "========================================"
echo "区块链医疗系统 - 部署脚本"
echo "========================================"
echo ""

# 检查 Hardhat 节点
echo "步骤 1: 检查 Hardhat 节点..."
if curl -s http://localhost:8545 > /dev/null; then
    echo "✓ Hardhat 节点正在运行"
else
    echo "✗ Hardhat 节点未运行！"
    echo "请先运行: npm run node"
    exit 1
fi

# 编译合约
echo ""
echo "步骤 2: 编译智能合约..."
npm run compile
if [ $? -ne 0 ]; then
    echo "✗ 编译失败！"
    exit 1
fi
echo "✓ 编译成功"

# 部署合约
echo ""
echo "步骤 3: 部署智能合约..."
npm run deploy
if [ $? -ne 0 ]; then
    echo "✗ 部署失败！"
    exit 1
fi

# 读取合约地址并更新 .env
if [ -f "contract-address.json" ]; then
    CONTRACT_ADDRESS=$(cat contract-address.json | grep -o '"address":"[^"]*' | cut -d'"' -f4)
    echo ""
    echo "✓ 合约部署成功！"
    echo "合约地址: $CONTRACT_ADDRESS"
    
    # 更新 .env
    if [ -f ".env" ]; then
        sed -i.bak "s/VITE_CONTRACT_ADDRESS=.*/VITE_CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" .env
    else
        echo "VITE_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > .env
    fi
    echo "✓ 环境变量已更新"
    
    echo ""
    echo "========================================"
    echo "部署完成！"
    echo "========================================"
else
    echo "✗ 未找到合约地址文件！"
    exit 1
fi
```

使用：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 常见问题排查

### 问题 1: npm install 失败

**症状**：安装依赖时出现错误

**解决方案**：
1. 检查 Node.js 版本：`node --version`（需要 >= 16.0.0）
2. 清除缓存：`npm cache clean --force`
3. 删除 `node_modules` 和 `package-lock.json`，重新安装
4. 使用国内镜像：`npm install --registry=https://registry.npmmirror.com`

### 问题 2: Hardhat 节点无法启动

**症状**：`npm run node` 报错或端口被占用

**解决方案**：
1. 检查端口 8545 是否被占用：
   - Windows: `netstat -ano | findstr :8545`
   - macOS/Linux: `lsof -i :8545`
2. 如果被占用，关闭占用进程或修改 `hardhat.config.ts` 中的端口
3. 确保防火墙允许端口 8545

### 问题 3: 合约部署失败

**症状**：`npm run deploy` 报错

**可能原因和解决方案**：

1. **Hardhat 节点未运行**
   - 确保在另一个终端运行 `npm run node`
   - 等待节点完全启动（看到账户列表）

2. **账户余额不足**
   - 本地节点账户默认有 10000 ETH，应该足够
   - 如果是测试网，确保账户有足够的测试代币

3. **编译错误**
   - 先运行 `npm run compile` 检查编译错误
   - 修复 Solidity 代码中的错误

### 问题 4: 前端无法连接合约

**症状**：前端显示"无法连接到合约"或"合约地址无效"

**解决方案**：
1. 检查 `.env` 文件中的 `VITE_CONTRACT_ADDRESS` 是否正确
2. 确保合约已成功部署（检查 `contract-address.json`）
3. 确保前端已重启（修改 `.env` 后需要重启 `npm run dev`）
4. 检查 MetaMask 是否连接到正确的网络（本地网络：ChainID 1337）

### 问题 5: MetaMask 连接失败

**症状**：点击"连接钱包"后 MetaMask 无响应

**解决方案**：
1. 确保 MetaMask 扩展已安装并启用
2. 刷新浏览器页面
3. 检查 MetaMask 是否连接到正确的网络
4. 尝试重新导入账户

### 问题 6: 私钥导入失败

**症状**：MetaMask 显示"无效的私钥"

**解决方案**：
1. 确保私钥以 `0x` 开头
2. 确保私钥总长度为 66 个字符（包括 `0x`）
3. 确保没有多余的空格或换行符
4. 直接从终端复制，不要手动输入

### 问题 7: 前端页面空白

**症状**：访问 `http://localhost:5173` 显示空白页面

**解决方案**：
1. 打开浏览器开发者工具（F12），查看控制台错误
2. 检查 `.env` 文件是否存在且格式正确
3. 确保 `VITE_CONTRACT_ADDRESS` 已设置
4. 重启前端服务：停止 `npm run dev`，然后重新运行

### 问题 8: 交易失败（Gas 不足）

**症状**：MetaMask 显示"交易失败"或"Gas 不足"

**解决方案**：
1. 本地网络：账户应该有足够的 ETH（默认 10000 ETH）
2. 测试网：从水龙头获取更多测试代币
3. 在 MetaMask 中增加 Gas Limit（如果允许）

### 问题 9: 端口被占用

**症状**：前端或节点无法启动，提示端口被占用

**解决方案**：

**前端端口（5173）**：
- 修改 `vite.config.ts` 中的 `server.port`
- 或使用 `npm run dev -- --port 3001`

**节点端口（8545）**：
- 修改 `hardhat.config.ts` 中的网络配置
- 同时更新 MetaMask 网络配置中的 RPC URL

---

## 维护和更新

### 日常维护

1. **定期备份**
   - 备份 `contract-address.json`
   - 备份 `.env` 文件（不包含私钥）
   - 备份智能合约源代码

2. **监控节点**
   - 确保 Hardhat 节点稳定运行
   - 监控节点日志，查找异常

3. **更新依赖**
   ```bash
   npm update
   ```

### 更新智能合约

⚠️ **注意**：更新智能合约会部署新合约，旧合约数据不会自动迁移。

1. 修改 `contracts/MedicalRecord.sol`
2. 重新编译：`npm run compile`
3. 重新部署：`npm run deploy`
4. 更新 `.env` 中的合约地址
5. 重启前端服务

### 数据迁移

如果需要保留旧合约数据：
1. 从旧合约读取所有数据
2. 编写迁移脚本
3. 将数据写入新合约

---

## 部署检查清单

### 本地开发环境

- [ ] Node.js >= 16.0.0 已安装
- [ ] 项目依赖已安装（`npm install`）
- [ ] Hardhat 节点正在运行
- [ ] 智能合约已编译
- [ ] 智能合约已部署
- [ ] `.env` 文件已配置合约地址
- [ ] 前端应用正在运行
- [ ] MetaMask 已配置本地网络
- [ ] 测试账户已导入 MetaMask
- [ ] 可以访问前端应用
- [ ] 可以连接 MetaMask 钱包
- [ ] 可以注册账户
- [ ] 可以创建病历/发票（根据角色）

### 生产环境

- [ ] 智能合约已通过安全审计
- [ ] 测试网部署测试通过
- [ ] 环境变量已配置（私钥、API Key）
- [ ] 智能合约已部署到目标网络
- [ ] 合约地址已更新到 `.env`
- [ ] 前端已构建（`npm run build`）
- [ ] 前端已部署到服务器
- [ ] MetaMask 网络配置已更新（如需要）
- [ ] 域名和 SSL 证书已配置
- [ ] 监控和日志系统已设置

---

## 获取帮助

如果遇到问题：

1. **查看日志**：检查终端输出和浏览器控制台
2. **查阅文档**：查看 `README.md` 和 `deploy-guide.md`
3. **检查配置**：确认所有配置文件正确
4. **社区支持**：在项目 Issues 中提问

---

## 附录

### 常用命令速查

```bash
# 安装依赖
npm install

# 启动本地区块链节点
npm run node

# 编译智能合约
npm run compile

# 部署智能合约（本地）
npm run deploy

# 部署到测试网
npx hardhat run scripts/deploy.ts --network sepolia

# 启动前端开发服务器
npm run dev

# 构建前端（生产）
npm run build

# 预览构建结果
npm run preview
```

### 重要文件说明

- `contracts/MedicalRecord.sol` - 智能合约源代码
- `scripts/deploy.ts` - 部署脚本
- `hardhat.config.ts` - Hardhat 配置
- `vite.config.ts` - Vite 前端配置
- `.env` - 环境变量（不提交到 Git）
- `contract-address.json` - 合约地址（自动生成）
- `package.json` - 项目依赖和脚本

---

**最后更新**: 2024年

**文档版本**: 1.0

