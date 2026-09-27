import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("部署合约，账户:", deployer.address);
  console.log("账户余额:", (await ethers.provider.getBalance(deployer.address)).toString());

  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy();

  await medicalRecord.waitForDeployment();

  console.log("MedicalRecord 合约已部署到:", await medicalRecord.getAddress());
  
  // 保存合约地址到文件
  const contractAddress = await medicalRecord.getAddress();
  fs.writeFileSync(
    './contract-address.json',
    JSON.stringify({ address: contractAddress }, null, 2)
  );
  console.log("合约地址已保存到 contract-address.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

