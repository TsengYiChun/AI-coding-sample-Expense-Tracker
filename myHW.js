// ====== 請填入 ======
const CLIENT_ID = "471276001563-bi6rfu2a518u11bjl78puv7ggrhi30vh.apps.googleusercontent.com";
const SPREADSHEET_ID = "1DoHym07QjeT-y269spghtwWLLyqR1utPCxu2e58pj7Q";

// ===================

const SHEET_RECORD = "記帳紀錄";
const SHEET_FIELD = "欄位表";

let tokenClient;
let accessToken = null;

let fieldData = [];

document.getElementById("loginBtn").onclick = login;
document.getElementById("addBtn").onclick = addRecord;
document.getElementById("type").onchange = updateCategory;

// OAuth 登入
function login() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    callback: (resp) => {
      accessToken = resp.access_token;
      initApp();
    }
  });

  tokenClient.requestAccessToken();
}

// 初始化
async function initApp() {
  await loadField();
  await loadRecords();
}

// 共用 fetch（用 OAuth token）
async function sheetsFetch(range) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  return res.json();
}

// 讀欄位表
async function loadField() {
  const data = await sheetsFetch(`${SHEET_FIELD}!A2:C`);
  fieldData = data.values || [];

  updateCategory();
  updatePayment();
}

// 更新分類（依 Type 篩選）
function updateCategory() {
  const type = document.getElementById("type").value;
  const categorySelect = document.getElementById("category");

  categorySelect.innerHTML = "";

  fieldData.forEach(r => {
    if (!r[0] || r[0] === type) {
      if (r[1]) {
        categorySelect.innerHTML += `<option>${r[1]}</option>`;
      }
    }
  });
}

// 更新付款方式
function updatePayment() {
  const paymentSelect = document.getElementById("payment");
  const payments = [...new Set(fieldData.map(r => r[2]).filter(Boolean))];

  paymentSelect.innerHTML = "";
  payments.forEach(p => {
    paymentSelect.innerHTML += `<option>${p}</option>`;
  });
}

// 新增記錄
async function addRecord() {
  const row = [
    Date.now(),
    document.getElementById("date").value,
    document.getElementById("type").value,
    document.getElementById("category").value,
    document.getElementById("amount").value,
    document.getElementById("desc").value,
    document.getElementById("payment").value
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RECORD}!A:G:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [row]
      })
    }
  );

  alert("✅ 新增成功");
  loadRecords();
}

// 載入記錄 + 統計
async function loadRecords() {
  const data = await sheetsFetch(`${SHEET_RECORD}!A2:G`);
  const rows = data.values || [];

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  let income = 0;
  let expense = 0;
  let categoryMap = {};

  const nowMonth = new Date().getMonth();

  rows.forEach(r => {
    const [id, date, type, category, amount, desc, payment] = r;
    const m = new Date(date).getMonth();

    if (m === nowMonth) {
      if (type === "收入") income += Number(amount);
      else {
        expense += Number(amount);
        categoryMap[category] = (categoryMap[category] || 0) + Number(amount);
      }
    }

    tbody.innerHTML += `
      <tr>
        <td>${date}</td>
        <td>${type}</td>
        <td>${category}</td>
        <td>${amount}</td>
        <td>${desc}</td>
        <td>${payment}</td>
      </tr>
    `;
  });

  // 更新統計
  document.getElementById("income").innerText = `收入：${income}`;
  document.getElementById("expense").innerText = `支出：${expense}`;

  // 分類排行
  const stats = document.getElementById("categoryStats");
  stats.innerHTML = "";

  Object.entries(categoryMap)
    .sort((a,b) => b[1] - a[1])
    .forEach(([cat, val]) => {
      stats.innerHTML += `<li>${cat}：${val}</li>`;
    });
}