@echo off
chcp 65001 > nul
title 区块链医疗系统一键启动
color 0A

echo =========================================
echo   区块链医疗系统一键启动脚本
echo =========================================
echo.

cd /d "D:\专业资料\大三上\区块链\bc"

echo [1/4] 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖包，请稍等...
    npm install
) else (
    echo 依赖包已存在，跳过安装。
)

echo.
echo [2/4] 启动本地区块链节点...
start cmd /k "cd /d "D:\专业资料\大三上\区块链\bc" && title 区块链节点 && npm run node"
timeout /t 5 > nul

echo [3/4] 编译并部署智能合约...
start cmd /k "cd /d "D:\专业资料\大三上\区块链\bc" && title 合约部署 && npm run compile && npm run deploy"
timeout /t 10 > nul

echo [4/4] 启动前端应用...
start cmd /k "cd /d "D:\专业资料\大三上\区块链\bc" && title 前端应用 && npm run dev"
timeout /t 3 > nul

echo.
echo =========================================
echo   启动完成！请按以下步骤操作：
echo =========================================
echo.
echo 1. 浏览器访问：http://localhost:3000
echo.
echo 2. 配置 MetaMask：
echo    - 网络名称：Hardhat Local
echo    - RPC URL：http://localhost:8545
echo    - 链ID：1337
echo    - 货币符号：ETH
echo.
echo 3. 导入测试账户：
echo    在区块链节点窗口中找到私钥，复制到MetaMask
echo.
echo 4. 开始使用系统！
echo =========================================
echo.
echo 按任意键查看日志和帮助...
pause > nul

echo.
echo 当前服务状态：
echo - 区块链节点：运行在 http://localhost:8545
echo - 前端应用：运行在 http://localhost: 3000
echo - 智能合约：已部署
echo.
echo 重要提示：
echo 1. 不要关闭区块链节点窗口！
echo 2. 每天第一次使用需要重新部署合约
echo 3. 测试数据在节点关闭后会丢失
echo.
echo 按任意键退出...
pause > nul