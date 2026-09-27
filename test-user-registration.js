// 完整测试用户注册和查询流程
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("部署账户:", deployer.address);
  
  // 获取合约实例
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const contract = MedicalRecord.attach(contractAddress);
  
  // 检查合约代码
  const code = await ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    console.error("❌ 合约地址没有代码！请先部署合约");
    return;
  }
  console.log("✓ 合约代码存在");
  
  // 测试注册用户
  console.log("\n=== 测试注册用户 ===");
  try {
    const tx = await contract.registerUser(1, "测试用户", "123456789");
    console.log("交易已发送，等待确认...");
    const receipt = await tx.wait();
    console.log("✓ 注册成功！交易哈希:", receipt.hash);
    console.log("交易确认数:", receipt.confirmations);
  } catch (error) {
    console.error("❌ 注册失败:", error.message);
    return;
  }
  
  // 等待状态更新
  console.log("\n等待状态更新...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 测试 getUser
  console.log("\n=== 测试 getUser ===");
  try {
    const user = await contract.getUser(deployer.address);
    console.log("用户信息:", {
      userAddress: user.userAddress,
      role: user.role,
      name: user.name,
      idNumber: user.idNumber,
      registered: user.registered
    });
    
    if (user.registered) {
      console.log("✓ 用户已成功注册");
    } else {
      console.log("❌ 用户未注册（registered=false）");
    }
  } catch (error) {
    console.error("❌ getUser 调用失败:", error.message);
  }
  
  // 测试 users mapping
  console.log("\n=== 测试 users mapping ===");
  try {
    const userData = await contract.users(deployer.address);
    console.log("users mapping 结果:", {
      userAddress: userData.userAddress,
      role: userData.role,
      name: userData.name,
      idNumber: userData.idNumber,
      registered: userData.registered
    });
    
    if (userData.registered) {
      console.log("✓ users mapping 返回正确数据");
    } else {
      console.log("❌ users mapping 返回未注册状态");
    }
  } catch (error) {
    console.error("❌ users mapping 调用失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

