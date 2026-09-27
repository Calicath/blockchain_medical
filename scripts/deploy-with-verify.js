const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("部署合约，账户:", deployer.address);
  console.log("账户余额:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 检查网络
  const network = await ethers.provider.getNetwork();
  console.log("网络信息:", {
    name: network.name,
    chainId: network.chainId.toString()
  });

  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  console.log("开始部署合约...");
  
  const medicalRecord = await MedicalRecord.deploy();
  console.log("等待部署确认...");
  
  await medicalRecord.waitForDeployment();

  const contractAddress = await medicalRecord.getAddress();
  console.log("MedicalRecord 合约已部署到:", contractAddress);
  
  // 立即验证合约代码是否存在
  console.log("\n验证合约代码...");
  const code = await ethers.provider.getCode(contractAddress);
  if (code === "0x") {
    console.error("❌ 错误：合约地址没有代码！部署可能失败！");
    process.exit(1);
  }
  console.log("✓ 合约代码存在，长度:", code.length);
  
  // 测试合约函数
  console.log("\n测试合约函数...");
  try {
    const isRegistered = await medicalRecord.isUserRegistered(deployer.address);
    console.log("✓ isUserRegistered 函数可用，返回:", isRegistered);
  } catch (error) {
    console.error("❌ isUserRegistered 函数测试失败:", error.message);
    process.exit(1);
  }
  
  // 保存合约地址到文件
  fs.writeFileSync(
    './contract-address.json',
    JSON.stringify({ address: contractAddress }, null, 2)
  );
  console.log("\n✓ 合约地址已保存到 contract-address.json");
  console.log("\n✓ 部署完成并验证成功！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });

