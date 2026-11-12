// Written by scripts/hnsw-count.mjs --module. 32-d clustered data, M = 16, efConstruction = 100, efSearch = 64, k = 10, 200 queries per size.
// perInsert is the mean over the inserts that grew the index to n.
export const COUNT = [
  { n: 1000, perQuery: 638, brute: 1000, recall: 0.999, perInsert: 690 },
  { n: 3000, perQuery: 923, brute: 3000, recall: 0.996, perInsert: 1428 },
  { n: 10000, perQuery: 1108, brute: 10000, recall: 0.998, perInsert: 2007 },
  { n: 30000, perQuery: 1064, brute: 30000, recall: 1, perInsert: 2302 },
  { n: 100000, perQuery: 727, brute: 100000, recall: 0.998, perInsert: 1981 },
  { n: 300000, perQuery: 623, brute: 300000, recall: 0.998, perInsert: 1270 },
];
