

/* ---------- Helper: rupee formatting (Indian) ---------- */
function formatRupee(num) {
  const neg = num < 0;
  num = Math.abs(Math.round((num + Number.EPSILON) * 100) / 100);
  const parts = num.toFixed(2).split('.');
  let intPart = parts[0];
  let last3 = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  if (rest !== '') last3 = ',' + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? '-' : '') + rest + last3 + '.' + parts[1];
}

/* ---------- DOM Ready ---------- */
document.addEventListener("DOMContentLoaded", () => {

  /* ------------ App State & Data ------------- */
  const INITIAL_CAPITAL = 100000;
  let cash = INITIAL_CAPITAL;
  let initialCapital = INITIAL_CAPITAL;
  let portfolio = {}; // {symbol: {shares, avgBought}}
  let stocks = [
    // IT
    {symbol:"TCS", sector:"IT", price:3500, history:[]},
    {symbol:"INFY", sector:"IT", price:1450, history:[]},
    {symbol:"WIPRO", sector:"IT", price:455, history:[]},
    {symbol:"HCLTECH", sector:"IT", price:1180, history:[]},

    // Finance
    {symbol:"HDFCBANK", sector:"Banking", price:1600, history:[]},
    {symbol:"ICICI", sector:"Banking", price:1080, history:[]},
    {symbol:"AXISBANK", sector:"Banking", price:1100, history:[]},
    {symbol:"KOTAK", sector:"Banking", price:1870, history:[]},

    // Energy
    {symbol:"RELIANCE", sector:"Energy", price:2500, history:[]},
    {symbol:"ONGC", sector:"Energy", price:195, history:[]},
    {symbol:"NTPC", sector:"Energy", price:330, history:[]},

    // Auto
    {symbol:"TATAMOTORS", sector:"Auto", price:915, history:[]},
    {symbol:"MARUTI", sector:"Auto", price:10000, history:[]},
    {symbol:"BAJAJ", sector:"Auto", price:6150, history:[]},

    // Chemicals
    {symbol:"GSFC", sector:"Chemicals", price:80, history:[]},
    {symbol:"PIDILITE", sector:"Chemicals", price:1450, history:[]},

    // Pharma
    {symbol:"SUNPHARMA", sector:"Pharma", price:760, history:[]},
    {symbol:"CIPLA", sector:"Pharma", price:980, history:[]},
    {symbol:"DRREDDY", sector:"Pharma", price:5200, history:[]},

    // FMCG
    {symbol:"HUL", sector:"FMCG", price:2450, history:[]},
    {symbol:"ITC", sector:"FMCG", price:460, history:[]},
    {symbol:"NESTLE", sector:"FMCG", price:21000, history:[]},

    // Metals
    {symbol:"TATASTEEL", sector:"Metals", price:120, history:[]},
    {symbol:"JSW", sector:"Metals", price:690, history:[]},
    {symbol:"HINDALCO", sector:"Metals", price:480, history:[]}
  ];

  let selectedSector = "All";
  let nextTopUpThreshold = 10000; // starts at 10k, doubles each time
  const TOPUP_AMOUNT = 100000;

  /* ---------- DOM refs ---------- */
  const usernameInput = document.getElementById("username");
  const startBtn = document.getElementById("start-btn");
  const welcomeScreen = document.getElementById("welcome-screen");
  const welcomeUser = document.getElementById("welcome-user");
  const cashSpan = document.getElementById("cash");
  const cashPortfolioSpan = document.getElementById("cash-portfolio") || null;
  const stockTableBody = document.querySelector("#stock-table tbody");
  const portfolioTableBody = document.querySelector("#portfolio-table tbody");
  const investedSpan = document.getElementById("invested");
  const currentValueSpan = document.getElementById("currentValue");
  const netProfitSpan = document.getElementById("netProfit");
  const addCashBtn = document.getElementById("add-cash-btn");
  const topupNote = document.getElementById("topup-note");
  const sectorRow = document.getElementById("sector-row");
  const initialCapitalSpan = document.getElementById("initial-capital");
  const saveBtn = document.getElementById("save-btn");
  const loadBtn = document.getElementById("load-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const graphCanvas = document.getElementById("stock-graph");
  const graphLegend = document.getElementById("graph-legend");

  /* Chart.js chart instance */
  let chart = null;

  /* ---------- Initialize UI ---------- */
  function initUI() {
    // fill sectors
    const sectors = ["All", ...Array.from(new Set(stocks.map(s=>s.sector)))];
    sectorRow.innerHTML = "";
    sectors.forEach(sec=>{
      const b = document.createElement("button");
      b.textContent = sec;
      b.dataset.sector = sec;
      b.addEventListener("click", ()=>{
        document.querySelectorAll("#sector-row button").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        selectedSector = sec;
        renderMarketTable();
      });
      if(sec === "All") b.classList.add("active");
      sectorRow.appendChild(b);
    });

    // initialize values
    initialCapitalSpan.textContent = formatRupee(initialCapital);
    cash = initialCapital;
    updateCashUI();
    renderMarketTable();
    renderPortfolio();
    updateTopUpUI();
    buildGraph(); // empty chart
  }

  /* ---------- Welcome / Start ---------- */
  startBtn.addEventListener("click", ()=>{
    const name = usernameInput.value.trim();
    if(!name){ alert("Enter your name"); return; }
    welcomeScreen.style.display = "none";
    welcomeUser.innerText = `Hello, ${name}`;
    // popup greeting with formatted rupee
    alert(`Hello ${name}, you have ₹${formatRupee(initialCapital)} to start trading.`);
    // initialize
    initUI();
  });

  /* ---------- Market rendering ---------- */
  function stocksToShow() {
    if(selectedSector === "All") return stocks;
    return stocks.filter(s=>s.sector === selectedSector);
  }

  function renderMarketTable() {
    const list = stocksToShow();
    stockTableBody.innerHTML = "";
    list.forEach((s, idx) => {
      const tr = document.createElement("tr");
      tr.classList.add("stock-row");
      const prev = s.history.length ? s.history[s.history.length-1] : s.price;
      const change = s.price - prev;
      tr.innerHTML = `
        <td>${s.symbol}</td>
        <td>${s.sector}</td>
        <td>₹${formatRupee(s.price)}</td>
        <td class="${change>=0 ? 'positive' : 'negative'}">${change>=0?'+':''}${formatRupee(change)}</td>
        <td>
          <button class="action-btn buy-btn" data-idx="${idx}" data-symbol="${s.symbol}" data-action="buy">Buy</button>
          <button class="action-btn sell-btn" data-idx="${idx}" data-symbol="${s.symbol}" data-action="sell" style="margin-left:6px;background:#ef4444;">Sell</button>
        </td>
      `;
      stockTableBody.appendChild(tr);
    });
  }

  // Buy/Sell handler (event delegation)
  stockTableBody.addEventListener("click", (e)=>{
    const btn = e.target.closest("button.action-btn");
    if(!btn) return;
    const symbol = btn.dataset.symbol;
    const action = btn.dataset.action;
    if(action === "buy") {
      buyStock(symbol);
    } else if(action === "sell") {
      // If user doesn't own the stock, sellStock will alert appropriately.
      // But add an additional explicit popup here as requested.
      if(!portfolio[symbol]) {
        alert("You don't own this stock");
        return;
      }
      // confirm and sell
      if(confirm(`Sell shares of ${symbol}?`)) {
        sellStock(symbol);
      }
    }
  });

  /* ---------- Buy / Sell ---------- */
  function buyStock(symbol) {
    const s = stocks.find(x=>x.symbol === symbol);
    if(!s) return;
    // simple: buy x shares at current price
    const qty = parseInt(prompt(`How many shares of ${symbol} to buy?`, "1"));
    if(!qty || qty <= 0) return;
    const cost = qty * s.price;
    if(cost > cash) { alert("Not enough cash"); return; }
    cash -= cost;
    if(!portfolio[symbol]) portfolio[symbol] = {shares:0, avgBought:0};
    const it = portfolio[symbol];
    const newTotalShares = it.shares + qty;
    const newTotalCost = it.avgBought * it.shares + cost;
    it.shares = newTotalShares;
    it.avgBought = newTotalCost / newTotalShares;
    // record history for graph -> ensure stock.history has latest price
    s.history.push(s.price);
    if(s.history.length > 40) s.history.shift();
    renderPortfolio();
    updateCashUI();
    updateTopUpUI();
    updateGraph();
  }

  function sellStock(symbol) {
    if(!portfolio[symbol]) return alert("You don't own this stock");
    const s = stocks.find(x=>x.symbol === symbol);
    const qty = parseInt(prompt(`How many shares of ${symbol} to sell?`, "1"));
    if(!qty || qty <= 0) return;
    if(qty > portfolio[symbol].shares) return alert("Not enough shares");
    const revenue = qty * s.price;
    cash += revenue;
    portfolio[symbol].shares -= qty;
    if(portfolio[symbol].shares === 0) delete portfolio[symbol];
    s.history.push(s.price);
    if(s.history.length > 40) s.history.shift();
    renderPortfolio();
    updateCashUI();
    updateTopUpUI();
    updateGraph();
  }

  /* ---------- Portfolio UI ---------- */
  function renderPortfolio() {
    portfolioTableBody.innerHTML = "";
    let invested = 0, currentVal = 0;
    Object.keys(portfolio).forEach(sym => {
      const it = portfolio[sym];
      const stock = stocks.find(s=>s.symbol === sym);
      const val = it.shares * stock.price;
      invested += it.shares * it.avgBought;
      currentVal += val;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${sym}</td><td>${it.shares}</td><td>₹${formatRupee(val)}</td>`;
      // add click to sell on row
      tr.addEventListener("click", ()=> {
        if(confirm(`Sell shares of ${sym}?`)) sellStock(sym);
      });
      portfolioTableBody.appendChild(tr);
    });
    investedSpan.textContent = formatRupee(invested);
    currentValueSpan.textContent = formatRupee(currentVal);
    const netProfit = (cash + currentVal) - initialCapital;
    netProfitSpan.textContent = `₹${formatRupee(netProfit)}`;
    netProfitSpan.className = netProfit >= 0 ? 'positive' : 'negative';
  }

  /* ---------- Cash & Topup UI ---------- */
  function updateCashUI() {
    document.getElementById("cash").textContent = formatRupee(cash);
    const cp = document.getElementById("cash-portfolio");
    if(cp) cp.textContent = formatRupee(cash);
  }

  function updateTopUpUI() {
    // check net profit
    let currentValue=0;
    Object.keys(portfolio).forEach(sym=>{
      const it = portfolio[sym];
      const s = stocks.find(x=>x.symbol===sym);
      currentValue += it.shares * s.price;
    });
    const netProfit = (cash + currentValue) - initialCapital;
    topupNote.textContent = `Next top-up threshold: ₹${formatRupee(nextTopUpThreshold)} (Net Profit)`;
    if(netProfit >= nextTopUpThreshold) {
      addCashBtn.style.display = 'inline-block';
    } else {
      addCashBtn.style.display = 'none';
    }
  }

  addCashBtn.addEventListener("click", ()=>{
    // safe guard
    let currentValue=0;
    Object.keys(portfolio).forEach(sym=>{
      const it = portfolio[sym];
      const s = stocks.find(x=>x.symbol===sym);
      currentValue += it.shares * s.price;
    });
    const netProfit = (cash + currentValue) - initialCapital;
    if(netProfit >= nextTopUpThreshold) {
      cash += TOPUP_AMOUNT;
      nextTopUpThreshold *= 2; // double threshold next time
      updateCashUI();
      updateTopUpUI();
      alert(`₹${formatRupee(TOPUP_AMOUNT)} added to your cash.`);
    } else {
      alert("Not eligible yet.");
    }
  });

  /* ---------- Market simulation (every 10s) ---------- */
  function simulateMarketStep(){
    stocks.forEach(s => {
      // push previous price into history for charting (keep limited length)
      if(!Array.isArray(s.history)) s.history = [];
      s.history.push(s.price);
      if(s.history.length > 40) s.history.shift();

      // vary volatility by sector roughly
      let vol = 0.8;
      if(s.sector === "Auto") vol = 1.8;
      if(s.sector === "Energy") vol = 1.4;
      if(s.sector === "Banking" || s.sector === "Finance") vol = 1.2;
      if(s.sector === "Metals") vol = 2.0;

      // percentage change random ±(vol)
      const pct = (Math.random() * vol * 2) - vol; // e.g. -1.2% .. +1.2%
      const newPrice = Math.max(1, s.price * (1 + pct / 100));
      s.price = Math.round(newPrice * 100) / 100;
    });

    renderMarketTable();
    renderPortfolio();
    updateCashUI();
    updateTopUpUI();
    updateGraph();
  }

  setInterval(simulateMarketStep, 3000); // 3 seconds (was 10s in comment)

  /* ---------- Chart.js graph showing only owned stocks ---------- */
  function buildGraph(){
    if(chart) chart.destroy();
    const ctx = document.getElementById('stock-graph').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [], datasets: []
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { display: true, title: { display: false } },
          y: { display: true, title: { display: true, text: 'Price (₹)' } }
        }
      }
    });
  }

  function updateGraph(){
    // show only owned stocks
    const owned = Object.keys(portfolio);
    if(owned.length === 0) {
      // clear chart
      if(chart){
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
      }
      graphLegend.innerHTML = "<small class='muted'>Buy stocks to see their price history here.</small>";
      return;
    }

    // labels: use index as time (all histories aligned by length)
    // we will use the longest history length among owned stocks
    let maxLen = 0;
    owned.forEach(sym=>{
      const s = stocks.find(x=>x.symbol === sym);
      if(s && s.history.length > maxLen) maxLen = s.history.length;
    });

    const labels = Array.from({length: maxLen}, (_,i)=> (i+1 - maxLen)); // relative indices
    const datasets = [];
    graphLegend.innerHTML = "";

    owned.forEach((sym, idx) => {
      const s = stocks.find(x=>x.symbol === sym);
      if(!s) return;
      const hist = s.history.slice(-maxLen);
      // make a color
      const color = pickColor(sym);
      datasets.push({
        label: sym,
        data: hist,
        borderColor: color,
        backgroundColor: color,
        tension: 0.25,
        pointRadius: 3,
        fill: false
      });

      // legend manual (small)
      const it = document.createElement('div');
      it.className = 'item';
      it.innerHTML = `<span class="swatch" style="background:${color}"></span> ${sym}`;
      graphLegend.appendChild(it);
    });

    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update();
  }

  function pickColor(text){
    const palette = ['#e74c3c','#2ecc71','#3498db','#f1c40f','#9b59b6','#00bcd4','#ff9800','#8e44ad','#2c3e50'];
    let sum = 0; for(let i=0;i<text.length;i++) sum += text.charCodeAt(i);
    return palette[sum % palette.length];
  }

  /* ---------- Save / Load ---------- */
  saveBtn.addEventListener("click", ()=>{
    const state = {
      cash, initialCapital, portfolio, stocks, nextTopUpThreshold
    };
    localStorage.setItem("mockstock_state", JSON.stringify(state));
    alert("Progress saved locally.");
  });

  loadBtn.addEventListener("click", ()=>{
    const raw = localStorage.getItem("mockstock_state");
    if(!raw) return alert("No saved progress found.");
    const st = JSON.parse(raw);
    cash = st.cash ?? cash;
    initialCapital = st.initialCapital ?? initialCapital;
    portfolio = st.portfolio ?? portfolio;
    stocks = st.stocks ?? stocks;
    nextTopUpThreshold = st.nextTopUpThreshold ?? nextTopUpThreshold;
    renderMarketTable();
    renderPortfolio();
    updateCashUI();
    updateTopUpUI();
    updateGraph();
    alert("Progress loaded.");
  });

  /* ---------- Dark mode toggle ---------- */
  themeToggle.addEventListener("click", ()=>{
    const body = document.body;
    if(body.classList.contains("dark")){
      body.classList.remove("dark");
      themeToggle.textContent = "Dark";
    } else {
      body.classList.add("dark");
      themeToggle.textContent = "Light";
    }
  });

  /* ---------- Initial render on load ---------- */
  initUI();
  // initial graph render
  updateGraph();

}); // DOMContentLoaded end
