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

export const SECTOR_MAP: Record<string, string> = {
  // Technology
  AAPL:"Tech", MSFT:"Tech", NVDA:"Tech", AVGO:"Tech", AMD:"Tech",
  INTC:"Tech", QCOM:"Tech", TXN:"Tech", MU:"Tech", LRCX:"Tech",
  AMAT:"Tech", MCHP:"Tech", NXPI:"Tech", ADI:"Tech", ON:"Tech",
  CDNS:"Tech", SNPS:"Tech", FTNT:"Tech", PANW:"Tech", NOW:"Tech",
  CRM:"Tech", ADBE:"Tech", ORCL:"Tech", IBM:"Tech", ACN:"Tech",
  CSCO:"Tech", HPQ:"Tech", GLW:"Tech", KEYS:"Tech", ANSS:"Tech",
  CTSH:"Tech", VRSK:"Tech", LDOS:"Tech", SMCI:"Tech", CRWD:"Tech",
  APH:"Tech", ADP:"Tech", PYPL:"Tech", FI:"Tech", FICO:"Tech",
  ROP:"Tech", PAYX:"Tech", MSI:"Tech", KLAC:"Tech", ASML:"Tech",
  MRVL:"Tech", WDAY:"Tech", TEAM:"Tech", CDW:"Tech", GFS:"Tech",
  TTD:"Tech", DDOG:"Tech", OKTA:"Tech", NET:"Tech", SNOW:"Tech",
  MDB:"Tech", ZS:"Tech", ZM:"Tech", PLTR:"Tech", IONQ:"Tech",
  RGTI:"Tech", QBTS:"Tech", APP:"Tech",
  // Finance
  JPM:"Finance", BAC:"Finance", GS:"Finance", MS:"Finance",
  V:"Finance", MA:"Finance", AXP:"Finance", COF:"Finance",
  USB:"Finance", BK:"Finance", C:"Finance", SCHW:"Finance",
  CME:"Finance", ICE:"Finance", SPGI:"Finance", MCO:"Finance",
  CB:"Finance", AIG:"Finance", AFL:"Finance", MMC:"Finance",
  WTW:"Finance", AJG:"Finance", PGR:"Finance", HIG:"Finance",
  ACGL:"Finance", KKR:"Finance", BLK:"Finance", TRV:"Finance",
  ALL:"Finance", COIN:"Finance", HOOD:"Finance", SOFI:"Finance",
  AFRM:"Finance", CPAY:"Finance",
  // Healthcare
  UNH:"Health", JNJ:"Health", ABT:"Health", TMO:"Health",
  MRK:"Health", PFE:"Health", ABBV:"Health", LLY:"Health",
  BMY:"Health", AMGN:"Health", GILD:"Health", BIIB:"Health",
  REGN:"Health", VRTX:"Health", ISRG:"Health", MDT:"Health",
  BSX:"Health", ZTS:"Health", EW:"Health", DHR:"Health",
  STE:"Health", IQV:"Health", DXCM:"Health", MRNA:"Health",
  IDXX:"Health", SGEN:"Health", ALGN:"Health", GEHC:"Health",
  HCA:"Health", CI:"Health", ELV:"Health", NVO:"Health",
  HIMS:"Health",
  // Consumer Discretionary
  AMZN:"Consumer", TSLA:"Consumer", HD:"Consumer", MCD:"Consumer",
  TJX:"Consumer", SBUX:"Consumer", TGT:"Consumer", LOW:"Consumer",
  BKNG:"Consumer", ABNB:"Consumer", RCL:"Consumer", HLT:"Consumer",
  CMG:"Consumer", NKE:"Consumer", EBAY:"Consumer", F:"Consumer",
  APTV:"Consumer", ROST:"Consumer", ORLY:"Consumer", RIVN:"Consumer",
  LCID:"Consumer", MTCH:"Consumer",
  // Consumer Staples
  WMT:"Staples", PG:"Staples", KO:"Staples", PEP:"Staples",
  COST:"Staples", MO:"Staples", CL:"Staples", GIS:"Staples",
  STZ:"Staples", TSN:"Staples", CLX:"Staples", MNST:"Staples",
  KDP:"Staples", DLTR:"Staples", DG:"Staples", WBA:"Staples",
  // Communication
  META:"Comm", GOOGL:"Comm", GOOG:"Comm", NFLX:"Comm",
  DIS:"Comm", T:"Comm", VZ:"Comm", CMCSA:"Comm",
  WBD:"Comm", SIRI:"Comm", RBLX:"Comm", TMUS:"Comm",
  // Energy
  XOM:"Energy", CVX:"Energy", COP:"Energy", EOG:"Energy",
  SLB:"Energy", OXY:"Energy", MPC:"Energy", VLO:"Energy",
  DVN:"Energy", FANG:"Energy", HES:"Energy", BKR:"Energy",
  HAL:"Energy", TRGP:"Energy", OKE:"Energy", NRG:"Energy",
  PSX:"Energy", ENPH:"Energy", FSLR:"Energy",
  // Industrials
  GE:"Indust", HON:"Indust", CAT:"Indust", DE:"Indust",
  UPS:"Indust", FDX:"Indust", RTX:"Indust", LMT:"Indust",
  NOC:"Indust", GD:"Indust", BA:"Indust", MMM:"Indust",
  ETN:"Indust", EMR:"Indust", AME:"Indust", ROK:"Indust",
  PH:"Indust", ITW:"Indust", GWW:"Indust", PCAR:"Indust",
  OTIS:"Indust", CTAS:"Indust", CSX:"Indust", UNP:"Indust",
  NSC:"Indust", FAST:"Indust", ODFL:"Indust", URI:"Indust",
  WCN:"Indust", WM:"Indust", LHX:"Indust", HUBB:"Indust",
  SWK:"Indust", TT:"Indust", CPRT:"Indust", RKLB:"Indust",
  JOBY:"Indust",
  // Materials
  LIN:"Matls", APD:"Matls", ECL:"Matls", SHW:"Matls",
  NUE:"Matls", FCX:"Matls", VMC:"Matls", CF:"Matls",
  PKG:"Matls", FMC:"Matls",
  // Real Estate
  PLD:"RealEst", AMT:"RealEst", EQIX:"RealEst", CCI:"RealEst",
  SPG:"RealEst", DLR:"RealEst", PSA:"RealEst", WELL:"RealEst",
  CBRE:"RealEst",
  // Utilities
  NEE:"Utility", SO:"Utility", DUK:"Utility", AEP:"Utility",
  SRE:"Utility", D:"Utility", EXC:"Utility", PCG:"Utility",
  ES:"Utility", EIX:"Utility", ATO:"Utility", CEG:"Utility",
  // ETFs
  ARKG:"ETF", ARKK:"ETF",
};

export function getSector(ticker: string): string {
  return SECTOR_MAP[ticker] ?? "Other";
}

export const ALL_SECTORS = [
  "Tech","Finance","Health","Consumer","Staples","Comm",
  "Energy","Indust","Matls","RealEst","Utility","ETF","Other",
] as const;
