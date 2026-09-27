import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert('没有可导出的数据')
    return
  }

  const headers = Object.keys(rows[0])

  const escapeCell = (value: any) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // 如果包含逗号、引号或换行，按 CSV 规则包裹并转义
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent =
    headers.join(',') +
    '\n' +
    rows
      .map((row) => headers.map((h) => escapeCell(row[h])).join(','))
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

interface RecordData {
  id: bigint
  doctor: string
  patient: string
  patientName: string
  consultationTime: bigint
  chiefComplaint: string
  presentIllness: string
  pastHistory: string
  examination: string
  diagnosis: string
  treatment: string
  timestamp: bigint
  hash: string
}

interface UserInfo {
  doctorName?: string
  patientName?: string
}

export async function exportRecordToDocx(
  record: RecordData,
  userInfo: UserInfo = {},
  formatTimestamp: (timestamp: bigint) => string,
  formatAddress: (address: string) => string
) {
  try {
    const sections = [
      // 标题
      new Paragraph({
        text: '病历记录',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      // 病历ID
      new Paragraph({
        children: [
          new TextRun({
            text: '病历编号：',
            bold: true,
          }),
          new TextRun({
            text: `#${Number(record.id)}`,
          }),
        ],
        spacing: { after: 200 },
      }),

      // 病人信息
      new Paragraph({
        children: [
          new TextRun({
            text: '病人姓名：',
            bold: true,
          }),
          new TextRun({
            text: record.patientName || '未设置',
          }),
        ],
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: '病人地址：',
            bold: true,
          }),
          new TextRun({
            text: formatAddress(record.patient),
            color: '666666',
          }),
        ],
        spacing: { after: 200 },
      }),

      // 医生信息
      new Paragraph({
        children: [
          new TextRun({
            text: '医生：',
            bold: true,
          }),
          new TextRun({
            text: userInfo.doctorName ? `${userInfo.doctorName} ` : '',
          }),
          new TextRun({
            text: `(${formatAddress(record.doctor)})`,
            color: '666666',
          }),
        ],
        spacing: { after: 200 },
      }),

      // 就诊时间
      new Paragraph({
        children: [
          new TextRun({
            text: '就诊时间：',
            bold: true,
          }),
          new TextRun({
            text: formatTimestamp(record.consultationTime),
          }),
        ],
        spacing: { after: 200 },
      }),

      // 分隔线
      new Paragraph({
        text: '',
        border: {
          bottom: {
            color: 'CCCCCC',
            size: 1,
            style: 'single',
          },
        },
        spacing: { after: 400 },
      }),

      // 主诉
      new Paragraph({
        children: [
          new TextRun({
            text: '主诉',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: record.chiefComplaint || '无',
        spacing: { after: 400 },
      }),

      // 现病史
      new Paragraph({
        children: [
          new TextRun({
            text: '现病史',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: record.presentIllness || '无',
        spacing: { after: 400 },
      }),

      // 既往史
      new Paragraph({
        children: [
          new TextRun({
            text: '既往史',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: record.pastHistory || '无',
        spacing: { after: 400 },
      }),

      // 体格检查和辅助检查
      new Paragraph({
        children: [
          new TextRun({
            text: '体格检查和辅助检查',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: record.examination || '无',
        spacing: { after: 400 },
      }),

      // 诊断
      new Paragraph({
        children: [
          new TextRun({
            text: '诊断',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: record.diagnosis || '无',
        spacing: { after: 400 },
      }),

      // 处理
      new Paragraph({
        children: [
          new TextRun({
            text: '处理',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),
      new Paragraph({
        text: record.treatment || '无',
        spacing: { after: 400 },
      }),

      // 分隔线
      new Paragraph({
        text: '',
        border: {
          top: {
            color: 'CCCCCC',
            size: 1,
            style: 'single',
          },
        },
        spacing: { before: 400, after: 200 },
      }),

      // 区块链信息
      new Paragraph({
        children: [
          new TextRun({
            text: '区块链哈希值：',
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: record.hash,
            color: '666666',
            size: 20,
          }),
        ],
        spacing: { after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: '创建时间：',
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: formatTimestamp(record.timestamp),
            color: '666666',
            size: 20,
          }),
        ],
        spacing: { after: 400 },
      }),
    ]

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    const filename = `病历_${record.patientName || '未知'}_${formatTimestamp(record.consultationTime).replace(/[\/\s:]/g, '_')}.docx`
    saveAs(blob, filename)
  } catch (error) {
    console.error('导出DOCX失败:', error)
    alert('导出失败，请重试')
  }
}

interface InvoiceData {
  id: bigint
  patient: string
  doctor: string
  amount: bigint
  recordId: bigint
  timestamp: bigint
  invoiceNumber: string
  hash: string
  verified: boolean
  verifier: string
}

interface InvoiceUserInfo {
  patientName?: string
  doctorName?: string
  verifierName?: string
}

export async function exportInvoiceToPdf(
  invoice: InvoiceData,
  userInfo: InvoiceUserInfo = {},
  formatTimestamp: (timestamp: bigint) => string,
  formatAddress: (address: string) => string,
  formatEther: (amount: bigint) => string
) {
  try {
    // 生成验证链接和二维码
    const verificationUrl = `${window.location.origin}/invoice/${Number(invoice.id)}`
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#596A4A', // primary-600
        light: '#FFFFFF',
      },
    })

    const invoiceDate = formatTimestamp(invoice.timestamp)
    const generatedTime = new Date().toLocaleString('zh-CN')

    // 创建HTML内容
    const invoiceHtml = `
      <div style="
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', 'STHeiti', 'WenQuanYi Micro Hei', sans-serif;
        color: #1f2937;
        box-sizing: border-box;
      ">
        <!-- 标题 -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="
            font-size: 28px;
            font-weight: bold;
            color: #596A4A;
            margin: 0;
            padding: 0;
          ">医疗发票</h1>
        </div>

        <!-- 分隔线 -->
        <div style="
          height: 2px;
          background: #596A4A;
          margin-bottom: 20px;
        "></div>

        <!-- 发票基本信息 -->
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 12px;
        ">
          <div>发票编号：${invoice.invoiceNumber}</div>
          <div>开具日期：${invoiceDate}</div>
        </div>

        <div style="
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 15px;
        ">发票ID：#${Number(invoice.id)}</div>

        <!-- 分隔线 -->
        <div style="
          height: 1px;
          background: #e5e7eb;
          margin: 15px 0;
        "></div>

        <!-- 病人信息 -->
        <div style="margin-bottom: 20px;">
          <div style="
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
          ">病人信息</div>
          <div style="font-size: 11px; margin-left: 10px;">
            <div style="margin-bottom: 5px;">姓名：${userInfo.patientName || '未设置'}</div>
            <div style="color: #6b7280;">地址：${formatAddress(invoice.patient)}</div>
          </div>
        </div>

        <!-- 医生信息 -->
        <div style="margin-bottom: 20px;">
          <div style="
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
          ">开具医生</div>
          <div style="font-size: 11px; margin-left: 10px;">
            <div style="margin-bottom: 5px;">姓名：${userInfo.doctorName || '未设置'}</div>
            <div style="color: #6b7280;">地址：${formatAddress(invoice.doctor)}</div>
          </div>
        </div>

        <!-- 金额信息（突出显示） -->
        <div style="
          background: #f4f6f3;
          border: 2px solid #596A4A;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div style="
              font-size: 16px;
              font-weight: bold;
              color: #596A4A;
            ">金额</div>
            <div style="
              font-size: 20px;
              font-weight: bold;
              color: #596A4A;
            ">${formatEther(invoice.amount)} ETH</div>
          </div>
        </div>

        <!-- 关联病历 -->
        <div style="margin-bottom: 20px; font-size: 11px;">
          关联病历ID：#${Number(invoice.recordId)}
        </div>

        <!-- 验证状态 -->
        <div style="margin-bottom: 20px;">
          ${invoice.verified
            ? `
              <div style="
                font-size: 13px;
                font-weight: bold;
                color: #22c55e;
                margin-bottom: 8px;
              ">✓ 已验证</div>
              <div style="font-size: 11px; margin-left: 10px;">
                <div style="margin-bottom: 5px;">验证单位：${userInfo.verifierName || '未设置'}</div>
                <div style="color: #6b7280;">验证地址：${formatAddress(invoice.verifier)}</div>
              </div>
            `
            : `
              <div style="
                font-size: 13px;
                font-weight: bold;
                color: #eab308;
              ">待验证</div>
            `}
        </div>

        <!-- 分隔线 -->
        <div style="
          height: 1px;
          background: #e5e7eb;
          margin: 20px 0;
        "></div>

        <!-- 区块链信息和二维码 -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        ">
          <div style="flex: 1; margin-right: 20px;">
            <div style="
              font-size: 10px;
              color: #6b7280;
              margin-bottom: 5px;
            ">区块链哈希值：</div>
            <div style="
              font-size: 9px;
              color: #6b7280;
              word-break: break-all;
            ">${invoice.hash}</div>
            <div style="
              font-size: 9px;
              color: #6b7280;
              margin-top: 10px;
            ">验证链接：</div>
            <div style="
              font-size: 8px;
              color: #596A4A;
              word-break: break-all;
              margin-top: 3px;
            ">${verificationUrl}</div>
          </div>
          <div style="text-align: center;">
            <img src="${qrCodeDataUrl}" style="width: 80px; height: 80px;" />
            <div style="
              font-size: 9px;
              color: #6b7280;
              margin-top: 5px;
            ">扫描二维码验证</div>
          </div>
        </div>

        <!-- 页脚 -->
        <div style="
          position: absolute;
          bottom: 20mm;
          left: 20mm;
          right: 20mm;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        ">
          <div style="
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
          ">
            <div>基于区块链的数字病历存证系统</div>
            <div style="margin-top: 5px;">生成时间：${generatedTime}</div>
          </div>
        </div>
      </div>
    `

    // 创建临时容器
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.innerHTML = invoiceHtml
    document.body.appendChild(container)

    const invoiceElement = container.firstElementChild as HTMLElement

    // 等待图片加载
    await new Promise((resolve) => {
      const img = invoiceElement.querySelector('img')
      if (img) {
        img.onload = resolve
        img.onerror = resolve
        // 如果图片已经加载，立即resolve
        if (img.complete) resolve(undefined)
      } else {
        resolve(undefined)
      }
    })

    // 转换为canvas
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    // 清理临时元素
    document.body.removeChild(container)

    // 创建PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // 保存PDF
    const filename = `发票_${invoice.invoiceNumber}_${formatTimestamp(invoice.timestamp).replace(/[\/\s:]/g, '_')}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('导出PDF失败:', error)
    alert('导出失败，请重试')
  }
}


