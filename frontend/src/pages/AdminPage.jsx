import { useEffect, useState } from "react";
import request from "../api/client";

export default function AdminPage() {
  const [schema, setSchema] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/swagger.json`)
      .then(r => r.json())
      .then(setSchema)
      .catch(err => console.error("Swagger error:", err));
  }, []);

  if (!schema) return <div style={{ padding: 20 }}>Cargando API...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: 320, overflowY: "auto", borderRight: "1px solid #ddd", padding: 10 }}>
        <h3>Admin API</h3>

        {Object.entries(schema.paths).map(([path, methods]) => (
          <div key={path} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: "bold" }}>{path}</div>

            {Object.keys(methods).map(method => (
              <button
                key={method}
                onClick={() => setSelected({ path, method })}
                style={{
                  display: "block",
                  marginLeft: 10,
                  marginTop: 4,
                  cursor: "pointer"
                }}
              >
                {method.toUpperCase()}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: 20 }}>
        {!selected ? (
          <h2>Selecciona un endpoint</h2>
        ) : (
          <EndpointPanel
            schema={schema}
            path={selected.path}
            method={selected.method}
          />
        )}
      </div>
    </div>
  );
}

/* ========================= */
/* ENDPOINT PANEL           */
/* ========================= */

function EndpointPanel({ schema, path, method }) {
  const endpoint = schema.paths[path][method];
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const params = endpoint.parameters || [];

  async function execute() {
    setLoading(true);
    setResult(null);

    try {
      let url = path;

      // PATH PARAMS
      params.forEach(p => {
        if (p.in === "path") {
          url = url.replace(`{${p.name}}`, form[p.name] || "");
        }
      });

      // QUERY PARAMS
      const query = params
        .filter(p => p.in === "query")
        .map(p => `${p.name}=${form[p.name] || ""}`)
        .join("&");

      if (query) url += `?${query}`;

      const res = await request(url, {
        method: method.toUpperCase(),
        body:
          method !== "get"
            ? JSON.stringify(form)
            : undefined,
      });

      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>{method.toUpperCase()} {path}</h2>

      {/* PARAMS */}
      {params.map(p => (
        <div key={p.name} style={{ marginBottom: 10 }}>
          <label>{p.name}</label>
          <input
            style={{ marginLeft: 10 }}
            placeholder={p.description}
            onChange={e =>
              setForm({ ...form, [p.name]: e.target.value })
            }
          />
        </div>
      ))}

      <button onClick={execute} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Ejecutando..." : "Ejecutar"}
      </button>

      <pre style={{
        marginTop: 20,
        background: "#111",
        color: "#0f0",
        padding: 10,
        overflow: "auto"
      }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}