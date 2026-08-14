import { clusterRows, downloads, snapshot } from "./dashboard-data";

const metricCards = [
  { label: "Total GIFs", value: snapshot.totalGifs, note: "StockTwits top-popular stratum" },
  { label: "Model agreement", value: snapshot.agreement, note: `${snapshot.matched} matching labels` },
  { label: "CLIP embedding", value: `${snapshot.embeddingDimensions}D`, note: "ViT-B-32, three-frame mean" },
  { label: "KMeans clusters", value: snapshot.clusters, note: `Silhouette ${snapshot.silhouette}` },
];

const emotionClass = (emotion: string) =>
  emotion === "—" ? "emotion neutral" : `emotion ${emotion}`;

export default function Home() {
  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#overview" aria-label="GIF Emotion Atlas home">
          <span className="brand-mark">G</span>
          <span>GIFS / GMIS</span>
        </a>
        <nav aria-label="Dashboard navigation">
          <a href="#findings">Findings</a>
          <a href="#method">Method</a>
          <a className="nav-pill" href="#data">Get data</a>
        </nav>
      </header>

      <section className="hero shell" id="overview">
        <div className="hero-copy">
          <p className="kicker"><span /> Research dashboard · Snapshot 01</p>
          <h1>GIFs, mapped<br /><em>by emotion.</em></h1>
          <p className="hero-lede">
            A visual study of {snapshot.totalGifs} market-reaction GIFs—comparing two vision-language models and the patterns they reveal in CLIP space.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#findings">Explore findings <span>↓</span></a>
            <a className="text-link" href="#method">Read the method <span>↗</span></a>
          </div>
        </div>

        <aside className="hero-signal" aria-label="Key signal">
          <div className="signal-orbit"><span /><span /><span /></div>
          <p className="signal-label">Key signal</p>
          <strong>{snapshot.agreement}</strong>
          <p>of GIFs received the same dominant emotion label from both models.</p>
          <div className="signal-split" aria-label={`${snapshot.matched} agreements and ${snapshot.disagreed} disagreements`}>
            <span style={{ width: snapshot.agreement }} />
          </div>
          <div className="signal-legend">
            <span><i className="agree" /> {snapshot.matched} agree</span>
            <span><i /> {snapshot.disagreed} differ</span>
          </div>
        </aside>
      </section>

      <section className="metrics shell" aria-label="Analysis summary">
        {metricCards.map((metric, index) => (
          <article className="metric" key={metric.label}>
            <span className="metric-index">0{index + 1}</span>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      <section className="section shell" id="findings">
        <div className="section-heading">
          <p className="section-number">01 / LABELS</p>
          <div>
            <h2>Two models,<br />two readings.</h2>
            <p>Qwen8B most often reads fear; MoSS leans strongly toward neutral. The gap is the central finding—not noise to hide.</p>
          </div>
        </div>
        <figure className="figure-card featured">
          <div className="figure-topline">
            <span>Dominant emotion distribution</span>
            <span>n = {snapshot.totalGifs}</span>
          </div>
          <img src="/assets/dominant_emotions.png" alt="Bar charts comparing dominant emotion labels from Qwen8B and MoSS" />
          <figcaption>Counts by each model’s highest-scoring emotion label.</figcaption>
        </figure>
      </section>

      <section className="section shell split-section">
        <div className="section-heading compact">
          <p className="section-number">02 / AGREEMENT</p>
          <div>
            <h2>Disagreement is the result.</h2>
            <p>{snapshot.disagreed} GIFs receive different labels. This cross-tab shows where each Qwen8B category lands under MoSS.</p>
          </div>
        </div>
        <figure className="figure-card">
          <img src="/assets/agreement.png" alt="Stacked bar chart comparing Qwen8B and MoSS emotion classifications" loading="lazy" />
        </figure>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <p className="section-number">03 / EMBEDDINGS</p>
          <div>
            <h2>Visual structure,<br />soft emotion borders.</h2>
            <p>UMAP compresses 512-dimensional CLIP embeddings into two dimensions. KMeans finds visual neighborhoods, while emotion labels remain heavily interwoven.</p>
          </div>
        </div>
        <figure className="figure-card featured">
          <div className="figure-topline">
            <span>CLIP embedding space</span>
            <span>UMAP · k = {snapshot.clusters}</span>
          </div>
          <img src="/assets/umap_clusters.png" alt="Side-by-side UMAP plots colored by dominant emotion and KMeans cluster" loading="lazy" />
          <figcaption>Left: Qwen8B emotion. Right: KMeans cluster assignment.</figcaption>
        </figure>
      </section>

      <section className="section shell" id="method">
        <div className="section-heading compact">
          <p className="section-number">04 / SIGNAL</p>
          <div>
            <h2>Valence meets energy.</h2>
            <p>The average GIF is slightly negative in sentiment ({snapshot.meanSentiment}) and moderately high in arousal ({snapshot.meanArousal}).</p>
          </div>
        </div>
        <div className="figure-grid">
          <figure className="figure-card">
            <div className="figure-topline"><span>All observations</span><span>Sentiment × arousal</span></div>
            <img src="/assets/sentiment_arousal.png" alt="Scatter plot of sentiment and arousal for all GIFs" loading="lazy" />
          </figure>
          <figure className="figure-card">
            <div className="figure-topline"><span>Cluster view</span><span>Colored by KMeans</span></div>
            <img src="/assets/sentiment_arousal_clusters.png" alt="Scatter plot of sentiment and arousal colored by cluster" loading="lazy" />
          </figure>
        </div>
      </section>

      <section className="section shell table-section">
        <div className="section-heading compact">
          <p className="section-number">05 / CLUSTERS</p>
          <div>
            <h2>Cluster field guide.</h2>
            <p>The majority label in each visual cluster, plus the next two most common readings.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Cluster</th><th>GIFs</th><th>Dominant</th><th>Second</th><th>Third</th><th>Top share</th></tr>
            </thead>
            <tbody>
              {clusterRows.map((row) => (
                <tr key={row.cluster}>
                  <td><span className="cluster-id">C{row.cluster}</span></td>
                  <td>{row.size.toLocaleString("en-US")}</td>
                  <td><span className={emotionClass(row.first)}>{row.first}</span></td>
                  <td><span className={emotionClass(row.second)}>{row.second}</span></td>
                  <td><span className={emotionClass(row.third)}>{row.third}</span></td>
                  <td><strong>{row.share}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-section" id="data">
        <div className="shell data-inner">
          <div>
            <p className="section-number">DATA / CSV</p>
            <h2>Take the result<br />with you.</h2>
            <p>Download the current research sets. Future snapshots can replace these files and the dashboard assets without changing the site structure.</p>
          </div>
          <div className="download-list">
            {downloads.map((download) => (
              <a href={download.href} download={download.filename} key={download.filename}>
                <span>
                  <strong>{download.title}</strong>
                  <small>{download.detail}</small>
                </span>
                <span className="download-icon">↓</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="shell">
        <p>GIF Emotion Atlas</p>
        <p>StockTwits GIF dataset · CLIP ViT-B-32 · Qwen8B + MoSS · KMeans</p>
        <a href="#overview">Back to top ↑</a>
      </footer>
    </main>
  );
}
