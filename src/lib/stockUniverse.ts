export const SP500_TICKERS = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","BRK.B","LLY","AVGO",
  "TSLA","JPM","WMT","V","XOM","UNH","MA","COST","PG","JNJ",
  "HD","ABBV","BAC","NFLX","KO","CRM","CVX","AMD","ORCL","MRK",
  "PEP","TMO","ACN","NOW","ADBE","IBM","MCD","GE","QCOM","T",
  "DHR","TXN","INTC","CAT","AMGN","INTU","GS","VZ","SPGI","MS",
  "NEE","DIS","AXP","ISRG","RTX","PFE","LOW","UNP","BLK","SYK",
  "BKNG","AMAT","ETN","MDT","MU","ADI","C","BSX","LMT","GILD",
  "SCHW","PLD","CME","REGN","TJX","VRTX","NOC","DE","MMC","MMM",
  "KKR","HCA","CB","CI","APH","ELV","CL","ADP","ICE","MCO",
  "CMG","GD","PGR","SHW","MO","WM","FI","ECL","PCAR","ITW",
  "PYPL","COF","TGT","CTAS","WELL","EOG","ZTS","NSC","CEG","USB",
  "HLT","MSI","WCN","CDNS","SNPS","MNST","MCHP","SPG","OKE","EMR",
  "APD","LRCX","NUE","FCX","ROP","GWW","PAYX","FICO","AME","AJG",
  "FDX","NXPI","IQV","FSLR","FAST","VRSK","URI","CSX","EW","TRV",
  "DLR","AFL","ALL","STE","ODFL","CTSH","BK","STZ","D","AIG",
  "HIG","KEYS","GLW","CBRE","MTD","PH","F","FTNT","OTIS","TRGP",
  "DXCM","RCL","WTW","EBAY","ANSS","NVO","BIIB","LDOS","GIS","ALGN",
  "DG","CLX","MPC","DLTR","VLO","OXY","PSA","VMC","HPQ","ENPH",
  "SWK","ES","CF","PKG","NRG","HUBB","LHX","FMC","EIX","APTV",
  "CPAY","TSN","PCG","DVN","ATO","ACGL","TT","ROK","WBD","JNPR",
] as const;

export const NASDAQ100_TICKERS = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","COST",
  "NFLX","AMD","ADBE","QCOM","PEP","INTC","INTU","AMGN","CSCO","ISRG",
  "VRTX","AMAT","MU","ADP","ADI","REGN","LRCX","MNST","KLAC","CDNS",
  "SNPS","MCHP","ASML","ON","PANW","ORLY","FTNT","BKNG","KDP","MRVL",
  "WDAY","CTAS","ROST","PAYX","ODFL","DXCM","FANG","CEG","TEAM","CPRT",
  "SGEN","DLTR","GEHC","IDXX","EXC","MRNA","ZS","BIIB","FAST","ANSS",
  "CTSH","VRSK","NXPI","WBA","ABNB","TTD","ALGN","SMCI","CDW","PCAR",
  "MTCH","GFS","ILMN","WBD","SIRI","ZM","ENPH","RIVN","LCID","DDOG",
  "OKTA","CRWD","MDB","NET","SNOW","RBLX","COIN","HOOD","SOFI","AFRM",
] as const;

export const CEO_PORTFOLIO_TICKERS = [
  "NVDA","TSLA","AAPL","MSFT","META","AMZN","GOOGL","NFLX","AMD","PLTR",
  "RKLB","IONQ","JOBY","RGTI","QBTS","ARKG","ARKK","SMCI","APP","HIMS",
] as const;

export type Universe = "SP500" | "NASDAQ100" | "CEO";

export function getUniverseTickers(universe: Universe): readonly string[] {
  switch (universe) {
    case "SP500":      return SP500_TICKERS;
    case "NASDAQ100":  return NASDAQ100_TICKERS;
    case "CEO":        return CEO_PORTFOLIO_TICKERS;
  }
}
