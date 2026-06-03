// S&P 500 constituents (503 components, as of 2025)
export const SP500_TICKERS = [
  // Communication Services (22)
  "GOOGL","GOOG","META","NFLX","DIS","CMCSA","T","VZ","TMUS","CHTR",
  "WBD","FOXA","FOX","NWSA","NWS","OMC","IPG","LYV","EA","TTWO","PARA","MTCH",
  // Consumer Discretionary (51)
  "AMZN","TSLA","HD","MCD","BKNG","NKE","LOW","TJX","SBUX","RCL",
  "HLT","MAR","ABNB","CMG","EBAY","F","GM","TGT","GRMN","ROST",
  "ORLY","APTV","AN","KMX","AZO","DLTR","DG","BBY","DPZ","NCLH",
  "CCL","MGM","WYNN","PHM","LEN","DHI","TOL","NVR","POOL","MHK",
  "WHR","NWL","HBI","PVH","RL","TPR","CPRI","ETSY","DKNG","DECK","BWA",
  // Consumer Staples (37)
  "WMT","PG","KO","PEP","COST","PM","MO","MDLZ","CL","GIS",
  "STZ","TSN","CLX","MNST","KDP","WBA","SYY","HRL","MKC","K",
  "SJM","CAG","CPB","KHC","CHD","BG","ADM","EL","ULTA","COTY",
  "PRGO","FLO","POST","SMPL","CENT","INGR","THS",
  // Energy (23)
  "XOM","CVX","COP","EOG","SLB","OXY","MPC","VLO","DVN","FANG",
  "HES","BKR","HAL","PSX","TRGP","OKE","KMI","WMB","CTRA","APA",
  "MRO","EQT","CHK",
  // Financials (73)
  "JPM","BAC","WFC","GS","MS","C","USB","TFC","PNC","COF",
  "AXP","BK","STT","NTRS","HBAN","RF","CFG","MTB","ZION","KEY",
  "FITB","CMA","SYF","DFS","AIG","MET","PRU","AFL","ALL","TRV",
  "HIG","CB","LNC","UNM","GL","AIZ","EQH","PFG","BLK","SCHW",
  "CME","ICE","SPGI","MCO","V","MA","FI","GPN","CPAY","WEX",
  "BR","AMP","BEN","IVZ","TROW","AMG","CBOE","KKR","APO","BX",
  "MMC","AJG","WTW","AON","ALLY","ACGL","ERIE","FNF","CINF","AFG",
  "FAF","RLI","HCI","GABC","SNV",
  // Health Care (63)
  "UNH","JNJ","LLY","ABT","MRK","PFE","ABBV","TMO","BMY","AMGN",
  "GILD","BIIB","REGN","VRTX","ISRG","MDT","BSX","ZTS","EW","DHR",
  "STE","IQV","DXCM","MRNA","IDXX","ALGN","GEHC","HCA","CI","ELV",
  "MOH","HUM","CVS","MCK","ABC","CAH","DGX","LH","RMD","HOLX",
  "PODD","MASI","HSIC","ZBH","RVTY","MTD","WAT","A","BAX","BDX",
  "BIO","NTRA","PGNY","OMCL","MMSI","ICLR","MEDP","TECH","NEOG",
  "VTRS","PRLD","INCY","JAZZ","EXAS","SDGR",
  // Industrials (78)
  "GE","HON","CAT","DE","UPS","FDX","RTX","LMT","NOC","GD",
  "BA","MMM","ETN","EMR","AME","ROK","PH","ITW","GWW","PCAR",
  "OTIS","CTAS","CSX","UNP","NSC","FAST","ODFL","URI","WCN","WM",
  "LHX","HUBB","TT","TDG","TDY","HII","AXON","LDOS","SAIC",
  "BAH","PNR","GNRC","ALLE","MAS","DOV","IEX","EXPD","XPO","CHRW",
  "JBHT","WAB","CARR","TRMB","FTV","NDSN","CGNX","RBC","HWM","SWK",
  "EFX","VRSK","RSG","CWST","CLH","GFL","SRCL","RXO","UBER","LYFT",
  "DASH","BURL","WDAY","ZI",
  // Information Technology (63)
  "AAPL","MSFT","NVDA","AVGO","AMD","QCOM","TXN","MU","LRCX","AMAT",
  "KLAC","MCHP","ADI","ON","NXPI","SWKS","QRVO","MPWR","ACN","IBM",
  "ORCL","CSCO","HPQ","HPE","NTAP","CDW","FFIV","AKAM","JNPR","CRM",
  "ADBE","INTU","NOW","FTNT","PANW","CRWD","ANSS","CDNS","SNPS","EPAM",
  "CTSH","IT","GFS","PTC","ROP","KEYS","PAYX","ADP","FIS","FISV",
  "JKHY","PAYC","PCTY","GLW","TYL","VRT","ZBRA","APH","TE","ENPH",
  "FSLR","GEN","WDC","STX",
  // Materials (26)
  "LIN","APD","ECL","SHW","NUE","FCX","VMC","CF","PKG","FMC",
  "PPG","IFF","EMN","CE","LYB","DD","DOW","RPM","ALB","WRK",
  "IP","SEE","ATI","RS","STLD","CLF",
  // Real Estate (31)
  "PLD","AMT","EQIX","CCI","SPG","DLR","PSA","WELL","CBRE","ARE",
  "AVB","EQR","ESS","MAA","UDR","CPT","BXP","VNO","KIM","REG",
  "FRT","NNN","O","WY","IRM","SBA","VICI","EPR","GLPI","IIPR","MPW",
  // Utilities (31)
  "NEE","SO","DUK","AEP","SRE","D","EXC","PCG","ES","EIX",
  "ATO","CEG","WEC","CNP","LNT","EVRG","NI","AEE","DTE","PPL",
  "CMS","NRG","AWK","XEL","PNW","AES","BKH","OTTR","NFG","SR","UTL",
] as const;

// Nasdaq-100 Index (NDX) constituents — ~103 components including dual share classes.
// Source: https://www.nasdaq.com/market-activity/quotes/nasdaq-ndx-index
// Last reviewed: 2025-Q2. Rebalances quarterly in December; also check for special rebalances.
export const NASDAQ100_TICKERS = [
  // Top 10 by index weight
  "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","COST",
  // Technology — semiconductors & hardware
  "NFLX","ADBE","AMD","QCOM","INTU","CSCO","TXN","AMAT","MU","LRCX",
  "KLAC","SNPS","CDNS","MCHP","ADI","ASML","FTNT","MRVL","PANW","CRWD",
  // Technology — software & cloud
  "WDAY","ZS","DDOG","ABNB","TEAM","ON","GFS","TTD","ANSS","SMCI",
  // Healthcare & biotech
  "AMGN","ISRG","VRTX","REGN","BIIB","GILD","IDXX","DXCM","MRNA","GEHC",
  // Consumer
  "ORLY","ROST","BKNG","SBUX","LULU","DLTR","MNST","PEP","MDLZ","KHC",
  // Business services & industrials
  "ADP","PAYX","CTAS","ODFL","FAST","CPRT","PCAR","CTSH","VRSK","CDW",
  // Communications & media
  "CMCSA","EA","TTWO","TMUS",
  // Energy & utilities
  "CEG","EXC","FANG",
  // Fintech & payments
  "PYPL",
  // Recent additions & emerging large-caps
  "PLTR","APP","AXON","MSTR","COIN",
  // International ADRs (Nasdaq-listed)
  "MELI","PDD","NXPI","ILMN","SIRI","BIDU","JD","NTES",
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
  CSCO:"Tech", HPQ:"Tech", HPE:"Tech", GLW:"Tech", KEYS:"Tech",
  ANSS:"Tech", CTSH:"Tech", VRSK:"Tech", LDOS:"Tech", SMCI:"Tech",
  CRWD:"Tech", APH:"Tech", ADP:"Tech", PYPL:"Tech", FI:"Tech",
  FICO:"Tech", ROP:"Tech", PAYX:"Tech", MSI:"Tech", KLAC:"Tech",
  ASML:"Tech", MRVL:"Tech", WDAY:"Tech", TEAM:"Tech", CDW:"Tech",
  GFS:"Tech", TTD:"Tech", DDOG:"Tech", OKTA:"Tech", NET:"Tech",
  SNOW:"Tech", MDB:"Tech", ZS:"Tech", ZM:"Tech", PLTR:"Tech",
  IONQ:"Tech", RGTI:"Tech", QBTS:"Tech", APP:"Tech", EPAM:"Tech",
  IT:"Tech", PTC:"Tech", TYL:"Tech", VRT:"Tech", ZBRA:"Tech",
  TE:"Tech", JKHY:"Tech", PAYC:"Tech", PCTY:"Tech", FIS:"Tech",
  FISV:"Tech", GPN:"Tech", WEX:"Tech", NTAP:"Tech", FFIV:"Tech",
  AKAM:"Tech", JNPR:"Tech", WDC:"Tech", STX:"Tech", GEN:"Tech",
  // Finance
  JPM:"Finance", BAC:"Finance", WFC:"Finance", GS:"Finance",
  MS:"Finance", C:"Finance", USB:"Finance", TFC:"Finance",
  PNC:"Finance", COF:"Finance", AXP:"Finance", BK:"Finance",
  STT:"Finance", NTRS:"Finance", HBAN:"Finance", RF:"Finance",
  CFG:"Finance", MTB:"Finance", ZION:"Finance", KEY:"Finance",
  FITB:"Finance", CMA:"Finance", SYF:"Finance", DFS:"Finance",
  AIG:"Finance", MET:"Finance", PRU:"Finance", AFL:"Finance",
  ALL:"Finance", TRV:"Finance", HIG:"Finance", CB:"Finance",
  LNC:"Finance", UNM:"Finance", GL:"Finance", AIZ:"Finance",
  EQH:"Finance", PFG:"Finance", BLK:"Finance", SCHW:"Finance",
  CME:"Finance", ICE:"Finance", SPGI:"Finance", MCO:"Finance",
  V:"Finance", MA:"Finance", CPAY:"Finance", BR:"Finance",
  AMP:"Finance", BEN:"Finance", IVZ:"Finance", TROW:"Finance",
  AMG:"Finance", CBOE:"Finance", KKR:"Finance", APO:"Finance",
  BX:"Finance", MMC:"Finance", AJG:"Finance", WTW:"Finance",
  AON:"Finance", ALLY:"Finance", ACGL:"Finance", COIN:"Finance",
  HOOD:"Finance", SOFI:"Finance", AFRM:"Finance", CINF:"Finance",
  // Healthcare
  UNH:"Health", JNJ:"Health", ABT:"Health", TMO:"Health",
  MRK:"Health", PFE:"Health", ABBV:"Health", LLY:"Health",
  BMY:"Health", AMGN:"Health", GILD:"Health", BIIB:"Health",
  REGN:"Health", VRTX:"Health", ISRG:"Health", MDT:"Health",
  BSX:"Health", ZTS:"Health", EW:"Health", DHR:"Health",
  STE:"Health", IQV:"Health", DXCM:"Health", MRNA:"Health",
  IDXX:"Health", ALGN:"Health", GEHC:"Health", HCA:"Health",
  CI:"Health", ELV:"Health", MOH:"Health", HUM:"Health",
  CVS:"Health", MCK:"Health", ABC:"Health", CAH:"Health",
  DGX:"Health", LH:"Health", RMD:"Health", HOLX:"Health",
  PODD:"Health", MASI:"Health", HSIC:"Health", ZBH:"Health",
  RVTY:"Health", MTD:"Health", WAT:"Health", A:"Health",
  BAX:"Health", BDX:"Health", BIO:"Health", NTRA:"Health",
  VTRS:"Health", INCY:"Health", JAZZ:"Health", EXAS:"Health",
  HIMS:"Health",
  // Consumer Discretionary
  AMZN:"Consumer", TSLA:"Consumer", HD:"Consumer", MCD:"Consumer",
  TJX:"Consumer", SBUX:"Consumer", TGT:"Consumer", LOW:"Consumer",
  BKNG:"Consumer", ABNB:"Consumer", RCL:"Consumer", HLT:"Consumer",
  CMG:"Consumer", NKE:"Consumer", EBAY:"Consumer", F:"Consumer",
  GM:"Consumer", APTV:"Consumer", ROST:"Consumer", ORLY:"Consumer",
  RIVN:"Consumer", LCID:"Consumer", MTCH:"Consumer", ETSY:"Consumer",
  DKNG:"Consumer", DECK:"Consumer", BWA:"Consumer", AN:"Consumer",
  KMX:"Consumer", AZO:"Consumer", BBY:"Consumer", DPZ:"Consumer",
  NCLH:"Consumer", CCL:"Consumer", MGM:"Consumer", WYNN:"Consumer",
  PHM:"Consumer", LEN:"Consumer", DHI:"Consumer", TOL:"Consumer",
  NVR:"Consumer", POOL:"Consumer", MHK:"Consumer", WHR:"Consumer",
  NWL:"Consumer", HBI:"Consumer", PVH:"Consumer", RL:"Consumer",
  TPR:"Consumer", CPRI:"Consumer", GRMN:"Consumer", LULU:"Consumer",
  // Consumer Staples
  WMT:"Staples", PG:"Staples", KO:"Staples", PEP:"Staples",
  COST:"Staples", PM:"Staples", MO:"Staples", MDLZ:"Staples",
  CL:"Staples", GIS:"Staples", STZ:"Staples", TSN:"Staples",
  CLX:"Staples", MNST:"Staples", KDP:"Staples", WBA:"Staples",
  SYY:"Staples", HRL:"Staples", MKC:"Staples", K:"Staples",
  SJM:"Staples", CAG:"Staples", CPB:"Staples", KHC:"Staples",
  CHD:"Staples", BG:"Staples", ADM:"Staples", EL:"Staples",
  ULTA:"Staples",
  // Communication
  META:"Comm", GOOGL:"Comm", GOOG:"Comm", NFLX:"Comm",
  DIS:"Comm", T:"Comm", VZ:"Comm", CMCSA:"Comm",
  WBD:"Comm", FOXA:"Comm", FOX:"Comm", NWSA:"Comm",
  NWS:"Comm", OMC:"Comm", IPG:"Comm", LYV:"Comm",
  EA:"Comm", TTWO:"Comm", PARA:"Comm", TMUS:"Comm",
  CHTR:"Comm", RBLX:"Comm", SIRI:"Comm",
  // Energy
  XOM:"Energy", CVX:"Energy", COP:"Energy", EOG:"Energy",
  SLB:"Energy", OXY:"Energy", MPC:"Energy", VLO:"Energy",
  DVN:"Energy", FANG:"Energy", HES:"Energy", BKR:"Energy",
  HAL:"Energy", PSX:"Energy", TRGP:"Energy", OKE:"Energy",
  KMI:"Energy", WMB:"Energy", CTRA:"Energy", APA:"Energy",
  MRO:"Energy", EQT:"Energy", CHK:"Energy", NRG:"Energy",
  ENPH:"Energy", FSLR:"Energy",
  // Industrials
  GE:"Indust", HON:"Indust", CAT:"Indust", DE:"Indust",
  UPS:"Indust", FDX:"Indust", RTX:"Indust", LMT:"Indust",
  NOC:"Indust", GD:"Indust", BA:"Indust", MMM:"Indust",
  ETN:"Indust", EMR:"Indust", AME:"Indust", ROK:"Indust",
  PH:"Indust", ITW:"Indust", GWW:"Indust", PCAR:"Indust",
  OTIS:"Indust", CTAS:"Indust", CSX:"Indust", UNP:"Indust",
  NSC:"Indust", FAST:"Indust", ODFL:"Indust", URI:"Indust",
  WCN:"Indust", WM:"Indust", LHX:"Indust", HUBB:"Indust",
  SWK:"Indust", TT:"Indust", CPRT:"Indust", TDG:"Indust",
  TDY:"Indust", HII:"Indust", AXON:"Indust", SAIC:"Indust",
  BAH:"Indust", PNR:"Indust", GNRC:"Indust", ALLE:"Indust",
  MAS:"Indust", DOV:"Indust", IEX:"Indust", EXPD:"Indust",
  JBHT:"Indust", WAB:"Indust", CARR:"Indust", TRMB:"Indust",
  FTV:"Indust", NDSN:"Indust", RKLB:"Indust", JOBY:"Indust",
  UBER:"Indust", DASH:"Indust",
  // Materials
  LIN:"Matls", APD:"Matls", ECL:"Matls", SHW:"Matls",
  NUE:"Matls", FCX:"Matls", VMC:"Matls", CF:"Matls",
  PKG:"Matls", FMC:"Matls", PPG:"Matls", IFF:"Matls",
  EMN:"Matls", CE:"Matls", LYB:"Matls", DD:"Matls",
  DOW:"Matls", RPM:"Matls", ALB:"Matls", WRK:"Matls",
  IP:"Matls", SEE:"Matls", ATI:"Matls", RS:"Matls",
  STLD:"Matls", CLF:"Matls",
  // Real Estate
  PLD:"RealEst", AMT:"RealEst", EQIX:"RealEst", CCI:"RealEst",
  SPG:"RealEst", DLR:"RealEst", PSA:"RealEst", WELL:"RealEst",
  CBRE:"RealEst", ARE:"RealEst", AVB:"RealEst", EQR:"RealEst",
  ESS:"RealEst", MAA:"RealEst", UDR:"RealEst", CPT:"RealEst",
  BXP:"RealEst", VNO:"RealEst", KIM:"RealEst", REG:"RealEst",
  FRT:"RealEst", NNN:"RealEst", O:"RealEst", WY:"RealEst",
  IRM:"RealEst", SBA:"RealEst", VICI:"RealEst",
  // Utilities
  NEE:"Utility", SO:"Utility", DUK:"Utility", AEP:"Utility",
  SRE:"Utility", D:"Utility", EXC:"Utility", PCG:"Utility",
  ES:"Utility", EIX:"Utility", ATO:"Utility", CEG:"Utility",
  WEC:"Utility", CNP:"Utility", LNT:"Utility", EVRG:"Utility",
  NI:"Utility", AEE:"Utility", DTE:"Utility", PPL:"Utility",
  CMS:"Utility", AWK:"Utility", XEL:"Utility", PNW:"Utility",
  AES:"Utility",
  // ETFs / thematic
  ARKG:"ETF", ARKK:"ETF",
};

export function getSector(ticker: string): string {
  return SECTOR_MAP[ticker] ?? "Other";
}

export const ALL_SECTORS = [
  "Tech","Finance","Health","Consumer","Staples","Comm",
  "Energy","Indust","Matls","RealEst","Utility","ETF","Other",
] as const;
