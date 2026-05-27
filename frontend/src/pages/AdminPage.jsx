import { useEffect, useMemo, useState } from "react";
import request from "../api/client";
import styles from "./AdminPage.module.css";

function formatHeader(str) {
  if (!str) return "";
  const spaced = str.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).trim();
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeResource(path) {
  return path.replace("/api/", "").split("/")[0];
}

export default function AdminPage() {
  const [schema, setSchema] = useState(null);
  const [activeResource, setActiveResource] = useState(null);
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/swagger.json`);
        const json = await res.json();
        setSchema(json);
      } catch (error) {
        console.error("Error cargando esquema:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const resources = useMemo(() => {
    if (!schema?.paths) return [];
    const map = new Map();

    Object.entries(schema.paths).forEach(([path, methods]) => {
      const resource = normalizeResource(path);
      if (!resource) return;

      if (!map.has(resource)) {
        map.set(resource, {
          name: resource,
          endpoints: [],
        });
      }
      map.get(resource).endpoints.push({ path, methods });
    });

    return Array.from(map.values());
  }, [schema]);

  const headers = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const systemFields = ["id", "createdAt", "updatedAt", "v", "_v", "__v"];

  async function loadResource(resource) {
    setActiveResource(resource);
    setSelectedRow(null);
    setForm({});
    setShowForm(false);

    try {
      const res = await request(`/${resource}`);
      setData(Array.isArray(res) ? res : res.data || []);
    } catch {
      setData([]);
    }
  }

  async function remove(id) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro permanentemente?")) return;

    try {
      await request(`/api/${activeResource}/${id}`, {
        method: "DELETE",
      });
      setData((prev) => prev.filter((x) => x.id !== id));
    } catch (error) {
      alert("No se pudo eliminar el registro.");
    }
  }

  async function save(e) {
    e.preventDefault();

    try {
      if (selectedRow) {
        const res = await request(`/api/${activeResource}/${selectedRow.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setData((prev) => prev.map((x) => (x.id === selectedRow.id ? res : x)));
      } else {
        const res = await request(`/api/${activeResource}`, {
          method: "POST",
          body: JSON.stringify(form),
        });
        setData((prev) => [...prev, res]);
      }
      setForm({});
      setSelectedRow(null);
      setShowForm(false);
    } catch (error) {
      alert("Ocurrió un error al guardar los cambios. Verifica los datos.");
    }
  }

  function handleEdit(row) {
    setSelectedRow(row);
    setForm({ ...row });
    setShowForm(true);
  }

  function handleCreateNew() {
    setSelectedRow(null);
    setForm({});
    setShowForm(true);
  }

  if (loading) return <div className={styles.loading}>Cargando panel de administración...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.logo}>⚙️ Panel de Control</div>
        <p className={styles.sidebarSubtitle}>Módulos editables:</p>
        <div className={styles.menuList}>
          {resources.map((r) => (
            <button
              key={r.name}
              className={`${styles.resourceBtn} ${activeResource === r.name ? styles.active : ""}`}
              onClick={() => loadResource(r.name)}
            >
              📊 {formatHeader(r.name)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.main}>
        {!activeResource ? (
          <div className={styles.welcomeMessage}>
            <h2>Bienvenido</h2>
            <p>Por favor, selecciona una tabla en el menú de la izquierda para empezar a gestionar los datos.</p>
          </div>
        ) : (
          <>
            <div className={styles.headerRow}>
              <h2>Gestionando: {formatHeader(activeResource)}</h2>
              <button className={styles.newBtn} onClick={handleCreateNew}>
                ➕ Agregar Nuevo Registro
              </button>
            </div>

            {data.length === 0 ? (
              <div className={styles.noData}>No hay registros guardados en esta tabla todavía.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h}>{formatHeader(h)}</th>
                      ))}
                      <th style={{ textAlign: "center" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id || Math.random()}>
                        {headers.map((headerKey) => (
                          <td key={headerKey}>
                            {row[headerKey] !== null && row[headerKey] !== undefined
                              ? String(row[headerKey])
                              : "—"}
                          </td>
                        ))}
                        <td className={styles.actionCells}>
                          <button className={styles.editBtn} onClick={() => handleEdit(row)}>
                            ✏️ Editar
                          </button>
                          <button className={styles.deleteBtn} onClick={() => remove(row.id)}>
                            🗑️ Borrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showForm && (
              <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                  <h3>{selectedRow ? "📝 Modificar Registro" : "✨ Crear Nuevo Registro"}</h3>
                  <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
                </div>

                <form onSubmit={save} className={styles.adminForm}>
                  <div className={styles.formGrid}>
                    {headers
                      .filter((field) => !systemFields.includes(field))
                      .map((field) => (
                        <div key={field} className={styles.formGroup}>
                          <label>{formatHeader(field)}</label>
                          <input
                            type="text"
                            placeholder={`Ingresa ${formatHeader(field).toLowerCase()}...`}
                            value={form[field] || ""}
                            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                          />
                        </div>
                      ))}
                  </div>

                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className={styles.saveBtn}>
                      💾 Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}