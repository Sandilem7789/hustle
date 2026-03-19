import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Community = {
  id: string;
  name: string;
  region?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  _count?: { hustlers: number };
};

type Hustler = {
  id: string;
  businessName: string;
  businessType: string;
  description: string;
  operatingArea: string;
  products: { id: string; name: string; price: string }[];
};

export function CommunityHub() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hustlers, setHustlers] = useState<Hustler[]>([]);

  useEffect(() => {
    api.listCommunities().then(setCommunities);
  }, []);

  useEffect(() => {
    if (!selected) {
      setHustlers([]);
      return;
    }
    api.listMarketplace(selected).then(setHustlers);
  }, [selected]);

  return (
    <section className="card">
      <header>
        <h2>Community Hubs</h2>
        <p>Select a community to explore approved hustlers and the services/products they sell.</p>
      </header>
      <div className="community-grid">
        {communities.map((community) => (
          <button
            key={community.id}
            className={selected === community.id ? 'community selected' : 'community'}
            onClick={() => setSelected(community.id)}
          >
            <strong>{community.name}</strong>
            <span>{community.region}</span>
            <small>{community._count?.hustlers ?? 0} hustlers</small>
          </button>
        ))}
      </div>
      {selected && (
        <div className="hustlers">
          {hustlers.map((hustler) => (
            <article key={hustler.id} className="queue-card">
              <h3>{hustler.businessName}</h3>
              <p className="muted">{hustler.businessType}</p>
              <p>{hustler.description}</p>
              <p>
                <strong>Operating area:</strong> {hustler.operatingArea}
              </p>
              {hustler.products.length > 0 && (
                <ul>
                  {hustler.products.map((product) => (
                    <li key={product.id}>
                      {product.name} — R{product.price}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
          {hustlers.length === 0 && <p>No verified hustlers yet in this community.</p>}
        </div>
      )}
    </section>
  );
}
