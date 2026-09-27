// 测试合约调用的脚本
const { ethers } = require("hardhat");

async function main() {
  const [deployer, account1] = await ethers.getSigners();
  
  console.log("部署账户:", deployer.address);
  console.log("测试账户:", account1.address);
  
  // 获取合约实例
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const contract = MedicalRecord.attach(contractAddress);
  
  // 测试注册用户（使用 deployer 账户注册自己）
  console.log("\n注册用户（使用部署账户）...");
  const tx = await contract.registerUser(1, "测试用户", "123456789");
  const receipt = await tx.wait();
  console.log("注册成功！交易哈希:", receipt.hash);
  
  // 等待几个区块
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试获取用户信息（使用 deployer 地址）
  console.log("\n获取用户信息（部署账户）...");
  try {
    const user = await contract.getUser(deployer.address);
    console.log("用户信息:", user);
    console.log("是否注册:", user.registered);
    console.log("用户角色:", user.role);
    console.log("用户姓名:", user.name);
  } catch (error) {
    console.error("获取用户信息失败:", error.message);
  }
  
  // 测试 users mapping
  console.log("\n使用 users mapping（部署账户）...");
  try {
    const userData = await contract.users(deployer.address);
    console.log("users mapping 结果类型:", typeof userData);
    console.log("users mapping 结果:", userData);
    if (userData && typeof userData === 'object') {
      console.log("是否注册:", userData.registered);
      console.log("用户角色:", userData.role);
    }
  } catch (error) {
    console.error("users mapping 失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

