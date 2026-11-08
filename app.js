"use strict";

const CONTRACT_ADDRESS = "0x5DbAFaB64a5eb80F8a98D2136F365C554e4E178b";
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const EXPLORER_URL = "https://sepolia.etherscan.io";
const CONTRACT_ABI = [
  { inputs: [], name: "deposit", outputs: [], stateMutability: "payable", type: "function" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "Deposit", type: "event"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "Withdraw", type: "event"
  },
  {
    inputs: [], name: "checkBlance",
    outputs: [{ internalType: "uint256", name: "balance", type: "uint256" }],
    stateMutability: "view", type: "function"
  }
];

const ui = {
  connect: document.getElementById("connect-wallet"),
  switchNetwork: document.getElementById("switch-network"),
  refresh: document.getElementById("refresh-balance"),
  depositForm: document.getElementById("deposit-form"),
  withdrawForm: document.getElementById("withdraw-form"),
  depositAmount: document.getElementById("deposit-amount"),
  withdrawAmount: document.getElementById("withdraw-amount"),
  depositButton: document.getElementById("deposit-button"),
  withdrawButton: document.getElementById("withdraw-button"),
  balance: document.getElementById("bank-balance"),
  balanceDetail: document.getElementById("balance-detail"),
  walletLabel: document.getElementById("wallet-label"),
  walletAddress: document.getElementById("wallet-address"),
  feedback: document.getElementById("feedback"),
  status: document.getElementById("status-message"),
  transactionResult: document.getElementById("transaction-result"),
  transactionLink: document.getElementById("transaction-link")
};

let announcedMetaMask = null;
let wallet = null;
let account = null;
let contract = null;
let revision = 0;
let busy = false;
let wrongNetwork = false;

window.addEventListener("eip6963:announceProvider", (event) => {
  if (event.detail?.info?.rdns === "io.metamask") {
    announcedMetaMask = event.detail.provider;
  }
});
window.dispatchEvent(new Event("eip6963:requestProvider"));

const contractLink = document.getElementById("contract-link");
contractLink.href = `${EXPLORER_URL}/address/${CONTRACT_ADDRESS}#code`;
contractLink.textContent = `${CONTRACT_ADDRESS} ↗`;

function setStatus(message, tone = "info") {
  ui.status.textContent = message;
  ui.feedback.dataset.tone = tone;
}

function updateControls() {
  const unavailable = busy || !contract;
  ui.connect.disabled = busy || Boolean(contract);
  ui.connect.textContent = account ? "เชื่อมต่อแล้ว" : "เชื่อมต่อ MetaMask ↗";
  ui.switchNetwork.hidden = !wrongNetwork;
  ui.switchNetwork.disabled = busy;
  ui.refresh.disabled = unavailable;
  ui.depositAmount.disabled = unavailable;
  ui.withdrawAmount.disabled = unavailable;
  ui.depositButton.disabled = unavailable;
  ui.withdrawButton.disabled = unavailable;
  ui.feedback.setAttribute("aria-busy", String(busy));
}

function clearSession() {
  revision += 1;
  account = null;
  contract = null;
  wrongNetwork = false;
  ui.balance.textContent = "—";
  ui.balanceDetail.textContent = "เชื่อมต่อกระเป๋าเงินเพื่อดูยอด";
  ui.walletLabel.textContent = "กระเป๋าเงินของคุณ";
  ui.walletAddress.textContent = "ยังไม่ได้เชื่อมต่อ MetaMask";
  ui.depositAmount.value = "";
  ui.withdrawAmount.value = "";
  updateControls();
}

function describeError(error) {
  const code = error.code ?? error.info?.error?.code;
  if (code === 4001 || code === "ACTION_REJECTED") return "คุณยกเลิกคำขอใน MetaMask";
  if (code === -32002) return "มีคำขอค้างอยู่ กรุณาเปิด MetaMask เพื่อดำเนินการ";
  if (code === 4902) return "กรุณาเปิดใช้งานเครือข่าย Sepolia ใน MetaMask แล้วลองอีกครั้ง";
  if (code === "INSUFFICIENT_FUNDS") return "Sepolia ETH ในกระเป๋าไม่พอสำหรับจำนวนเงินและค่าธรรมเนียม";
  if (code === "CALL_EXCEPTION") return "Contract ปฏิเสธรายการ กรุณาตรวจจำนวนเงิน ยอดเงินฝาก และ Contract Address";
  return error.reason || error.shortMessage || error.message || "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
}

async function runAction(action) {
  if (busy) return;
  busy = true;
  updateControls();
  try {
    await action();
  } catch (error) {
    setStatus(describeError(error), "error");
  } finally {
    busy = false;
    updateControls();
  }
}

async function refreshBalance() {
  if (!contract) throw new Error("กรุณาเชื่อมต่อ MetaMask บน Sepolia ก่อน");
  const currentRevision = revision;
  const balance = await contract.checkBlance();
  if (currentRevision !== revision) return;
  const formatted = ethers.formatEther(balance);
  ui.balance.textContent = formatted;
  ui.balanceDetail.textContent = `${balance.toString()} wei · ยอดเงินฝากของบัญชีนี้`;
}

async function synchronizeWallet() {
  clearSession();
  const currentRevision = revision;
  const [accounts, chainId] = await Promise.all([
    wallet.request({ method: "eth_accounts" }),
    wallet.request({ method: "eth_chainId" })
  ]);
  if (currentRevision !== revision) return;
  if (accounts.length === 0) {
    setStatus("ยังไม่ได้อนุญาตบัญชี กรุณาเชื่อมต่อ MetaMask");
    return;
  }
  account = ethers.getAddress(accounts[0]);
  ui.walletAddress.textContent = account;
  ui.walletLabel.textContent = "เชื่อมต่อ MetaMask แล้ว";
  if (BigInt(chainId) !== BigInt(SEPOLIA_CHAIN_ID)) {
    wrongNetwork = true;
    ui.balanceDetail.textContent = "กรุณาเปลี่ยนเครือข่ายเป็น Sepolia";
    setStatus("เครือข่ายไม่ตรง กรุณากดเปลี่ยนเป็น Sepolia", "error");
    updateControls();
    return;
  }
  const provider = new ethers.BrowserProvider(wallet);
  const signer = await provider.getSigner(account);
  const bytecode = await provider.getCode(CONTRACT_ADDRESS);
  if (currentRevision !== revision) return;
  if (bytecode === "0x") {
    throw new Error("ไม่พบ Smart Contract ที่ Address นี้บน Sepolia กรุณาตรวจสอบ Address ใน app.js");
  }
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  try {
    await refreshBalance();
  } catch (error) {
    if (currentRevision === revision) contract = null;
    throw error;
  }
  if (currentRevision !== revision) return;
  setStatus("เชื่อมต่อสำเร็จ · พร้อมฝาก ถอน และเช็กยอดบน Sepolia", "success");
  updateControls();
}

async function handleWalletChange() {
  try {
    await synchronizeWallet();
  } catch (error) {
    setStatus(describeError(error), "error");
  } finally {
    updateControls();
  }
}

function handleDisconnect() {
  clearSession();
  setStatus("MetaMask ตัดการเชื่อมต่อ กรุณาเชื่อมต่อใหม่", "error");
}

function selectWallet() {
  const injectedWallet = window.ethereum;
  const selectedWallet = announcedMetaMask
    || injectedWallet?.providers?.find((provider) => provider.isMetaMask)
    || (injectedWallet?.isMetaMask ? injectedWallet : null);
  if (!selectedWallet) {
    throw new Error("ไม่พบ MetaMask กรุณาติดตั้งส่วนขยาย หรือเปิดเว็บผ่านเบราว์เซอร์ในแอป MetaMask");
  }
  if (wallet === selectedWallet) return;
  wallet?.removeListener?.("accountsChanged", handleWalletChange);
  wallet?.removeListener?.("chainChanged", handleWalletChange);
  wallet?.removeListener?.("disconnect", handleDisconnect);
  wallet = selectedWallet;
  wallet.on("accountsChanged", handleWalletChange);
  wallet.on("chainChanged", handleWalletChange);
  wallet.on("disconnect", handleDisconnect);
}

function parseAmount(input) {
  const value = input.value.trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(value)) {
    throw new Error("กรุณาระบุจำนวน ETH เป็นตัวเลขบวก ทศนิยมไม่เกิน 18 ตำแหน่ง เช่น 0.001");
  }
  const amount = ethers.parseEther(value);
  if (amount <= 0n) throw new Error("จำนวนเงินต้องมากกว่า 0 ETH");
  return amount;
}

async function submitTransaction(operation) {
  if (!contract) throw new Error("กรุณาเชื่อมต่อ MetaMask บน Sepolia ก่อน");
  const input = operation === "deposit" ? ui.depositAmount : ui.withdrawAmount;
  const amount = parseAmount(input);
  const currentRevision = revision;
  const activeContract = contract;
  const activeAccount = account;
  ui.transactionResult.hidden = true;
  if (operation === "withdraw") {
    const balance = await activeContract.checkBlance();
    if (amount > balance) throw new Error("จำนวนเงินที่ถอนเกินยอดเงินฝากใน Contract");
  }
  const [chainId, accounts] = await Promise.all([
    wallet.request({ method: "eth_chainId" }),
    wallet.request({ method: "eth_accounts" })
  ]);
  if (currentRevision !== revision || BigInt(chainId) !== BigInt(SEPOLIA_CHAIN_ID)
      || accounts[0]?.toLowerCase() !== activeAccount.toLowerCase()) {
    throw new Error("บัญชีหรือเครือข่ายเปลี่ยนแปลง กรุณาตรวจสอบแล้วลองอีกครั้ง");
  }
  const label = operation === "deposit" ? "ฝากเงิน" : "ถอนเงิน";
  setStatus(`กรุณายืนยันการ${label} ${ethers.formatEther(amount)} ETH ใน MetaMask`);
  const transaction = operation === "deposit"
    ? await activeContract.deposit({ value: amount })
    : await activeContract.withdraw(amount);
  ui.transactionLink.href = `${EXPLORER_URL}/tx/${transaction.hash}`;
  ui.transactionResult.hidden = false;
  setStatus(`ส่งรายการ${label}แล้ว กำลังรอการยืนยันบนบล็อกเชน…`);
  let receipt;
  try {
    receipt = await transaction.wait();
  } catch (error) {
    if (error.code !== "TRANSACTION_REPLACED") {
      throw new Error(`ยังยืนยันผลไม่ได้ กรุณาตรวจสถานะธุรกรรมบน Etherscan ก่อนทำรายการซ้ำ (${describeError(error)})`);
    }
    if (error.replacement?.hash) {
      ui.transactionLink.href = `${EXPLORER_URL}/tx/${error.replacement.hash}`;
    }
    if (error.cancelled) throw new Error("ธุรกรรมถูกยกเลิกหรือแทนที่ กรุณาตรวจรายการบน Etherscan");
    receipt = error.receipt;
  }
  if (!receipt || receipt.status !== 1) throw new Error("ธุรกรรมไม่สำเร็จ กรุณาตรวจรายการบน Etherscan");
  if (currentRevision !== revision) {
    setStatus(`${label}สำเร็จสำหรับบัญชี ${activeAccount} · บัญชีหรือเครือข่ายปัจจุบันเปลี่ยนแล้ว`, "success");
    return;
  }
  input.value = "";
  try {
    await refreshBalance();
    setStatus(`${label} ${ethers.formatEther(amount)} ETH สำเร็จ · อัปเดตยอดเงินแล้ว`, "success");
  } catch {
    ui.balance.textContent = "—";
    ui.balanceDetail.textContent = "กรุณากดเช็กยอดเงินอีกครั้ง";
    setStatus(`${label}สำเร็จ แต่โหลดยอดล่าสุดไม่ได้ กรุณากดเช็กยอดเงินอีกครั้ง`, "success");
  }
}

ui.connect.addEventListener("click", () => runAction(async () => {
  selectWallet();
  setStatus("กรุณาอนุญาตการเชื่อมต่อใน MetaMask");
  await wallet.request({ method: "eth_requestAccounts" });
  await synchronizeWallet();
}));

ui.switchNetwork.addEventListener("click", () => runAction(async () => {
  await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
  await synchronizeWallet();
}));

ui.refresh.addEventListener("click", () => runAction(async () => {
  setStatus("กำลังอ่านยอดเงินฝากจาก Contract…");
  await refreshBalance();
  setStatus("อัปเดตยอดเงินฝากแล้ว", "success");
}));

ui.depositForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runAction(() => submitTransaction("deposit"));
});

ui.withdrawForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runAction(() => submitTransaction("withdraw"));
});

if (!window.ethers) {
  ui.connect.disabled = true;
  setStatus("โหลดไลบรารีไม่สำเร็จ กรุณาตรวจว่ามีไฟล์ vendor/ethers.umd.min.js แล้วรีเฟรชหน้าเว็บ", "error");
}
