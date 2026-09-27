// 直接测试合约调用
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("部署账户:", deployer.address);
  
  // 获取合约实例
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const contract = MedicalRecord.attach(contractAddress);
  
  // 先检查合约是否存在
  console.log("\n检查合约代码...");
  const code = await ethers.provider.getCode(contractAddress);
  console.log("合约代码长度:", code.length);
  if (code === "0x") {
    console.error("合约地址没有代码！合约可能未部署或地址错误！");
    return;
  }
  
  // 测试注册用户
  console.log("\n注册用户...");
  try {
    const tx = await contract.registerUser(1, "测试用户", "123456789");
    const receipt = await tx.wait();
    console.log("注册成功！交易哈希:", receipt.hash);
    console.log("交易确认数:", receipt.confirmations);
  } catch (error) {
    console.error("注册失败:", error.message);
    return;
  }
  
  // 等待几个区块
  console.log("\n等待状态更新...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 直接使用 provider 调用
  console.log("\n使用 provider 直接调用...");
  try {
    const iface = new ethers.Interface(MedicalRecord.abi);
    const data = iface.encodeFunctionData("getUser", [deployer.address]);
    const result = await ethers.provider.call({
      to: contractAddress,
      data: data
    });
    console.log("原始返回数据:", result);
    console.log("数据长度:", result.length);
    
    if (result === "0x") {
      console.error("返回空数据！可能用户未注册或合约有问题");
    } else {
      const decoded = iface.decodeFunctionResult("getUser", result);
      console.log("解码后的数据:", decoded);
    }
  } catch (error) {
    console.error("直接调用失败:", error.message);
  }
  
  // 使用合约实例调用
  console.log("\n使用合约实例调用...");
  try {
    const user = await contract.getUser(deployer.address);
    console.log("用户信息:", user);
    console.log("是否注册:", user.registered);
    console.log("用户角色:", user.role);
    console.log("用户姓名:", user.name);
  } catch (error) {
    console.error("合约实例调用失败:", error.message);
    console.error("错误详情:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

