// 检查并更新合约地址
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=".repeat(70));
  console.log("检查并更新合约地址");
  console.log("=".repeat(70));
  
  // 1. 读取当前配置的地址
  let configAddress = null;
  if (fs.existsSync('./contract-address.json')) {
    const config = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
    configAddress = config.address;
    console.log("\n[1] 当前配置的地址:", configAddress);
  } else {
    console.log("\n[1] contract-address.json 不存在");
  }
  
  // 2. 检查 .env 文件
  let envAddress = null;
  if (fs.existsSync('./.env')) {
    const envContent = fs.readFileSync('./.env', 'utf8');
    const match = envContent.match(/VITE_CONTRACT_ADDRESS=(.+)/);
    if (match) {
      envAddress = match[1].trim();
      console.log("[2] .env 文件中的地址:", envAddress);
    } else {
      console.log("[2] .env 文件中未找到 VITE_CONTRACT_ADDRESS");
    }
  } else {
    console.log("[2] .env 文件不存在");
  }
  
  // 3. 检查这些地址是否有代码
  console.log("\n[3] 检查地址是否有代码...");
  
  const addresses = [configAddress, envAddress].filter(Boolean);
  const uniqueAddresses = [...new Set(addresses)];
  
  let validAddress = null;
  
  for (const addr of uniqueAddresses) {
    if (!addr) continue;
    
    try {
      const code = await ethers.provider.getCode(addr);
      if (code === "0x") {
        console.log(`  ❌ ${addr} - 没有代码`);
      } else {
        console.log(`  ✓ ${addr} - 有代码 (长度: ${code.length})`);
        
        // 测试合约函数
        try {
          const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
          const contract = MedicalRecord.attach(addr);
          const isRegistered = await contract.isUserRegistered(ethers.ZeroAddress);
          console.log(`    ✓ 合约函数可用 (isUserRegistered 返回: ${isRegistered})`);
          validAddress = addr;
        } catch (e) {
          console.log(`    ❌ 合约函数不可用: ${e.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ ${addr} - 检查失败: ${error.message}`);
    }
  }
  
  // 4. 如果地址不一致，提示更新
  if (configAddress && envAddress && configAddress.toLowerCase() !== envAddress.toLowerCase()) {
    console.log("\n⚠️  警告: 配置的地址不一致！");
    console.log(`  contract-address.json: ${configAddress}`);
    console.log(`  .env: ${envAddress}`);
    
    if (validAddress) {
      console.log(`\n建议: 使用有效地址 ${validAddress} 更新两个文件`);
      
      // 更新 contract-address.json
      fs.writeFileSync(
        './contract-address.json',
        JSON.stringify({ address: validAddress }, null, 2)
      );
      console.log("✓ 已更新 contract-address.json");
      
      // 更新 .env 文件
      if (fs.existsSync('./.env')) {
        let envContent = fs.readFileSync('./.env', 'utf8');
        if (envContent.match(/VITE_CONTRACT_ADDRESS=/)) {
          envContent = envContent.replace(
            /VITE_CONTRACT_ADDRESS=.*/,
            `VITE_CONTRACT_ADDRESS=${validAddress}`
          );
        } else {
          envContent += `\nVITE_CONTRACT_ADDRESS=${validAddress}`;
        }
        fs.writeFileSync('./.env', envContent);
        console.log("✓ 已更新 .env 文件");
        console.log("\n⚠️  重要: 请重启前端开发服务器以加载新的 .env 配置！");
      }
    }
  }
  
  // 5. 如果所有地址都没有代码，提示重新部署
  if (!validAddress && uniqueAddresses.length > 0) {
    console.log("\n❌ 所有配置的地址都没有代码！");
    console.log("请运行: npm run deploy");
  } else if (validAddress) {
    console.log("\n✓ 找到有效的合约地址:", validAddress);
  }
  
  console.log("\n" + "=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


