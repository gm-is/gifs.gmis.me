export const snapshot = {
  totalGifs: "3,647",
  agreement: "29.1%",
  matched: "1,063",
  disagreed: "2,584",
  embeddingDimensions: "512",
  clusters: "7",
  silhouette: "0.027",
  meanSentiment: "−0.17",
  meanArousal: "0.64",
};

export const clusterRows = [
  { cluster: 0, size: 617, first: "anger", second: "fear", third: "disgust", share: "38.9%" },
  { cluster: 1, size: 660, first: "fear", second: "anger", third: "disgust", share: "45.5%" },
  { cluster: 2, size: 278, first: "fear", second: "anger", third: "—", share: "78.4%" },
  { cluster: 3, size: 247, first: "fear", second: "anger", third: "—", share: "48.6%" },
  { cluster: 4, size: 366, first: "fear", second: "anger", third: "happy", share: "53.0%" },
  { cluster: 5, size: 922, first: "fear", second: "anger", third: "disgust", share: "34.7%" },
  { cluster: 6, size: 557, first: "fear", second: "happy", third: "anger", share: "39.7%" },
];

export const downloads = [
  {
    title: "High-confidence set",
    detail: "1,063 rows where Qwen8B and MoSS agree",
    href: "/assets/high_conf.csv",
    filename: "high_conf.csv",
  },
  {
    title: "Disagreement set",
    detail: "2,584 rows where the dominant labels differ",
    href: "/assets/disagree.csv",
    filename: "disagree.csv",
  },
];
