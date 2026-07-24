import { useEffect, useMemo, useState } from 'react';
import { api, Hotel, ImageItem } from './api';

type Tab = 'all' | 'rooms' | 'facilities';

export default function App() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>('');
  const [tab, setTab] = useState<Tab>('all');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState(0.25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImageItem | null>(null);

  useEffect(() => {
    api.hotels()
      .then((data) => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0].id);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedHotel) return;
    setLoading(true);
    const load = async () => {
      try {
        if (search || roomFilter) {
          const params: Record<string, string> = {
            hotel_id: selectedHotel,
            min_confidence: String(minConfidence),
          };
          if (roomFilter) params.room = roomFilter;
          if (search) params.q = search;
          setImages(await api.search(params));
        } else if (tab === 'rooms') {
          setImages(await api.rooms(selectedHotel));
        } else if (tab === 'facilities') {
          setImages(await api.facilities(selectedHotel));
        } else {
          setImages(await api.images(selectedHotel, minConfidence));
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedHotel, tab, search, roomFilter, minConfidence]);

  const roomTypes = useMemo(() => {
    const set = new Set(images.map((i) => i.room_type).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [images]);

  const downloadMetadata = async () => {
    const data = await api.exportMetadata(selectedHotel || undefined);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-${selectedHotel || 'all'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !hotels.length) {
    return <div className="shell"><p className="muted">Loading dashboard…</p></div>;
  }

  return (
    <div className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">E Stays Data Engineering</p>
          <h1>Hotel Image Dataset</h1>
          <p className="muted">Classified rooms & facilities from public OTA listings</p>
        </div>
        <button className="btn primary" onClick={downloadMetadata}>Download metadata</button>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="controls">
        <label>
          Hotel
          <select value={selectedHotel} onChange={(e) => setSelectedHotel(e.target.value)}>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.image_count})</option>
            ))}
          </select>
        </label>

        <label>
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="caption, alt text…" />
        </label>

        <label>
          Room filter
          <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
            <option value="">All rooms</option>
            {roomTypes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <label>
          Min confidence: {minConfidence.toFixed(2)}
          <input type="range" min={0} max={1} step={0.05} value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))} />
        </label>
      </section>

      <nav className="tabs">
        {(['all', 'rooms', 'facilities'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <span className="count">{images.length} images</span>
      </nav>

      <section className="grid">
        {images.map((img) => (
          <article key={img.id} className="card" onClick={() => setPreview(img)}>
            <img src={api.imageUrl(img.id)} alt={img.alt_text || img.caption || 'hotel'} loading="lazy" />
            <div className="card-body">
              <div className="badges">
                <span className="badge">{img.primary_category}</span>
                {img.room_type && <span className="badge room">{img.room_type}</span>}
                {img.facility_type && <span className="badge fac">{img.facility_type}</span>}
              </div>
              <p className="caption">{img.caption || img.alt_text || '—'}</p>
              <div className="meta">
                <span>{(img.confidence * 100).toFixed(0)}%</span>
                <span>{img.source}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {preview && (
        <div className="modal" onClick={() => setPreview(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setPreview(null)}>×</button>
            <img src={api.imageUrl(preview.id)} alt="" />
            <div className="modal-meta">
              <h2>{preview.room_type || preview.facility_type || preview.primary_category}</h2>
              <p>Confidence: {(preview.confidence * 100).toFixed(1)}%</p>
              <p>Source: {preview.source}</p>
              <p><a href={preview.page_url} target="_blank" rel="noreferrer">Listing page</a></p>
              <p className="small">{preview.license_note}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
