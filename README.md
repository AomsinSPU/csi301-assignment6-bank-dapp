# Bank DApp · Assignment 6

เว็บสำหรับเชื่อมต่อ MetaMask และใช้ Smart Contract บน Sepolia

[เปิดเว็บ DApp](https://aomsinspu.github.io/csi301-assignment6-bank-dapp/)

[ซอร์สโค้ดบน GitHub](https://github.com/AomsinSPU/csi301-assignment6-bank-dapp)

- รหัสนักศึกษา 66057370
- ผู้จัดทำ นายสรัลนิธิสมบัติสกุล
- Contract Address `0x5DbAFaB64a5eb80F8a98D2136F365C554e4E178b`
- ฟังก์ชัน `deposit()`, `withdraw(uint256)`, `checkBlance()`

ซอร์ส Smart Contract อยู่ใน `contracts/Bank.sol` โดยชื่อ Contract บน Remix ของผู้จัดทำคือ `Assignment6`

## เปิดทดสอบในเครื่อง

เปิด Terminal ในโฟลเดอร์นี้แล้วรัน

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

เปิด http://localhost:8000 ในเบราว์เซอร์ที่ติดตั้ง MetaMask แล้วเชื่อมต่อบัญชีบน Sepolia

ทดสอบฝาก 0.001 ETH เช็กยอด แล้วถอน 0.0005 ETH และเช็กยอดอีกครั้ง ต้องมี Sepolia ETH ในกระเป๋าสำหรับเงินฝากและค่าธรรมเนียม

ช่องจำนวนเงินบนเว็บใช้ ETH และแปลงเป็น wei ด้วย ethers ก่อนเรียก Contract

## นำขึ้น GitHub Pages

1. สร้าง repository สำหรับงานนี้ แล้วอัปโหลดไฟล์และโฟลเดอร์ทั้งหมดภายใน `bank-dapp` ให้ `index.html` อยู่ที่ราก repository
2. เปิด Settings → Pages เลือก Deploy from a branch
3. เลือก branch `main` และโฟลเดอร์ `/ (root)` แล้ว Save
4. รอ GitHub แสดง URL เว็บ แล้วเปิดทดสอบผ่าน MetaMask อีกครั้ง
5. ส่ง URL เว็บใน dlearning

หาก Deploy Contract ใหม่ ให้แก้ `CONTRACT_ADDRESS` ใน `app.js` และตรวจว่า ABI ตรงกับ Contract ที่ Deploy

หน้าเว็บใช้ ethers 6.17.0 ที่เก็บใน `vendor` พร้อมใบอนุญาต MIT
