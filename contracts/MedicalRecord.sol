// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRecord {
    // 用户角色枚举
    enum UserRole {
        Doctor,
        Patient,
        Verifier
    }

    // 病历结构
    struct Record {
        uint256 id;
        address doctor;
        address patient;
        string patientName; // 病人姓名
        uint256 consultationTime; // 就诊时间
        string chiefComplaint; // 主诉
        string presentIllness; // 现病史
        string pastHistory; // 既往史
        string examination; // 体格检查和辅助检查
        string diagnosis; // 诊断
        string treatment; // 处理
        uint256 timestamp;
        string hash; // 病历哈希值
    }

    // 发票结构
    struct Invoice {
        uint256 id;
        address patient;
        address doctor;
        uint256 amount;
        uint256 recordId;
        uint256 timestamp;
        string invoiceNumber;
        string hash; // 发票哈希值
        bool verified;
        address verifier;
    }

    // 用户信息结构
    struct User {
        address userAddress;
        UserRole role;
        string name;
        string idNumber; // 身份证号或医生执业证号
        bool registered;
    }

    // 存储映射
    mapping(address => User) public users;
    mapping(uint256 => Record) public records;
    mapping(uint256 => Invoice) public invoices;
    mapping(address => uint256[]) public patientRecords; // 病人的病历ID列表
    mapping(address => uint256[]) public doctorRecords; // 医生的病历ID列表
    mapping(address => uint256[]) public patientInvoices; // 病人的发票ID列表

    uint256 public recordCount;
    uint256 public invoiceCount;

    // 事件
    event UserRegistered(address indexed user, UserRole role, string name);
    event RecordCreated(
        uint256 indexed recordId,
        address indexed doctor,
        address indexed patient,
        uint256 timestamp
    );
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed patient,
        uint256 amount,
        string invoiceNumber
    );
    event InvoiceVerified(
        uint256 indexed invoiceId,
        address indexed verifier,
        bool verified
    );

    // 修饰符：检查用户是否已注册
    modifier onlyRegistered() {
        require(users[msg.sender].registered, "User not registered");
        _;
    }

    // 修饰符：检查是否为医生
    modifier onlyDoctor() {
        require(
            users[msg.sender].role == UserRole.Doctor,
            "Only doctors can perform this action"
        );
        _;
    }

    // 修饰符：检查是否为查证单位
    modifier onlyVerifier() {
        require(
            users[msg.sender].role == UserRole.Verifier,
            "Only verifiers can perform this action"
        );
        _;
    }

    // 注册用户
    function registerUser(
        UserRole role,
        string memory name,
        string memory idNumber
    ) public {
        require(!users[msg.sender].registered, "User already registered");
        users[msg.sender] = User({
            userAddress: msg.sender,
            role: role,
            name: name,
            idNumber: idNumber,
            registered: true
        });
        emit UserRegistered(msg.sender, role, name);
    }

    // 创建病历（仅医生）
    function createRecord(
        address patient,
        string memory patientName,
        uint256 consultationTime,
        string memory chiefComplaint,
        string memory presentIllness,
        string memory pastHistory,
        string memory examination,
        string memory diagnosis,
        string memory treatment,
        string memory hash
    ) public onlyRegistered onlyDoctor {
        require(users[patient].registered, "Patient not registered");
        require(users[patient].role == UserRole.Patient, "Invalid patient");

        recordCount++;
        records[recordCount] = Record({
            id: recordCount,
            doctor: msg.sender,
            patient: patient,
            patientName: patientName,
            consultationTime: consultationTime,
            chiefComplaint: chiefComplaint,
            presentIllness: presentIllness,
            pastHistory: pastHistory,
            examination: examination,
            diagnosis: diagnosis,
            treatment: treatment,
            timestamp: block.timestamp,
            hash: hash
        });

        patientRecords[patient].push(recordCount);
        doctorRecords[msg.sender].push(recordCount);

        emit RecordCreated(recordCount, msg.sender, patient, block.timestamp);
    }

    // 创建发票（仅医生）
    function createInvoice(
        address patient,
        uint256 recordId,
        uint256 amount,
        string memory invoiceNumber,
        string memory hash
    ) public onlyRegistered onlyDoctor {
        require(users[patient].registered, "Patient not registered");
        require(records[recordId].patient == patient, "Invalid record");
        require(records[recordId].doctor == msg.sender, "Record not yours");

        invoiceCount++;
        invoices[invoiceCount] = Invoice({
            id: invoiceCount,
            patient: patient,
            doctor: msg.sender,
            amount: amount,
            recordId: recordId,
            timestamp: block.timestamp,
            invoiceNumber: invoiceNumber,
            hash: hash,
            verified: false,
            verifier: address(0)
        });

        patientInvoices[patient].push(invoiceCount);

        emit InvoiceCreated(invoiceCount, patient, amount, invoiceNumber);
    }

    // 验证发票（仅查证单位）
    function verifyInvoice(
        uint256 invoiceId,
        bool isValid
    ) public onlyRegistered onlyVerifier {
        require(invoices[invoiceId].id > 0, "Invoice does not exist");
        require(!invoices[invoiceId].verified, "Invoice already verified");

        invoices[invoiceId].verified = isValid;
        invoices[invoiceId].verifier = msg.sender;

        emit InvoiceVerified(invoiceId, msg.sender, isValid);
    }

    // 批量验证发票（仅查证单位）
    function verifyInvoices(
        uint256[] calldata invoiceIds,
        bool isValid
    ) external onlyRegistered onlyVerifier {
        require(invoiceIds.length > 0, "No invoice ids");

        for (uint256 i = 0; i < invoiceIds.length; i++) {
            uint256 invoiceId = invoiceIds[i];
            // 跳过不存在或已验证的发票，避免整个交易回滚
            if (invoiceId == 0 || invoices[invoiceId].id == 0) {
                continue;
            }
            if (invoices[invoiceId].verified) {
                continue;
            }

            invoices[invoiceId].verified = isValid;
            invoices[invoiceId].verifier = msg.sender;

            emit InvoiceVerified(invoiceId, msg.sender, isValid);
        }
    }

    // 检查用户是否已注册
    function isUserRegistered(address userAddress) public view returns (bool) {
        return users[userAddress].registered;
    }

    // 获取用户信息
    function getUser(address userAddress) public view returns (User memory) {
        User memory user = users[userAddress];
        // 如果用户未注册，返回一个明确的默认值
        if (!user.registered) {
            return User({
                userAddress: address(0),
                role: UserRole.Patient,
                name: "",
                idNumber: "",
                registered: false
            });
        }
        return user;
    }

    // 获取病历
    function getRecord(uint256 recordId) public view returns (Record memory) {
        require(
            records[recordId].doctor == msg.sender ||
                records[recordId].patient == msg.sender ||
                users[msg.sender].role == UserRole.Verifier,
            "No permission to view this record"
        );
        return records[recordId];
    }

    // 获取发票
    function getInvoice(uint256 invoiceId) public view returns (Invoice memory) {
        require(
            invoices[invoiceId].patient == msg.sender ||
                invoices[invoiceId].doctor == msg.sender ||
                users[msg.sender].role == UserRole.Verifier,
            "No permission to view this invoice"
        );
        return invoices[invoiceId];
    }

    // 获取病人的所有病历ID
    function getPatientRecords(
        address patient
    ) public view returns (uint256[] memory) {
        require(
            patient == msg.sender || users[msg.sender].role == UserRole.Doctor,
            "No permission"
        );
        return patientRecords[patient];
    }

    // 获取医生的所有病历ID
    function getDoctorRecords() public view onlyDoctor returns (uint256[] memory) {
        return doctorRecords[msg.sender];
    }

    // 获取病人的所有发票ID
    function getPatientInvoices(
        address patient
    ) public view returns (uint256[] memory) {
        require(
            patient == msg.sender || users[msg.sender].role == UserRole.Verifier,
            "No permission"
        );
        return patientInvoices[patient];
    }

    // 获取所有待验证的发票ID（仅查证单位）
    function getPendingInvoices() public view onlyVerifier returns (uint256[] memory) {
        uint256[] memory pendingIds = new uint256[](invoiceCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= invoiceCount; i++) {
            if (!invoices[i].verified) {
                pendingIds[count] = i;
                count++;
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = pendingIds[i];
        }
        
        return result;
    }

    // 获取所有已验证的发票ID（仅查证单位）
    function getVerifiedInvoices() public view onlyVerifier returns (uint256[] memory) {
        uint256[] memory verifiedIds = new uint256[](invoiceCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= invoiceCount; i++) {
            if (invoices[i].verified) {
                verifiedIds[count] = i;
                count++;
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = verifiedIds[i];
        }
        
        return result;
    }

    // 获取发票总数（仅查证单位）
    function getInvoiceCount() public view onlyVerifier returns (uint256) {
        return invoiceCount;
    }
}

