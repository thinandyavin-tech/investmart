export interface CompareRow {
  ticker:       string;
  name:         string;
  price:        number | null;
  change1D:     number | null;
  change1W:     number | null;
  change1M:     number | null;
  change3M:     number | null;
  marketCapB:   number | null;  // billions
  pe:           number | null;
  epsGrowth3Y:  number | null;  // %
  pegRatio:     number | null;  // P/E ÷ EPS Growth 3Y
  beta:         number | null;
  rsi:          number | null;
  high52W:      number | null;
  low52W:       number | null;
  volumeAvg10D: number | null;  // raw shares
}
