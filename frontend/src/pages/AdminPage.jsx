import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Package, 
  ShoppingCart, 
  FolderTree, 
  Key, 
  Settings, 
  BarChart3, 
  Receipt, 
  Building2, 
  CreditCard, 
  ClipboardList, 
  Folder, 
  Check, 
  X, 
  Info, 
  AlertTriangle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Save, 
  Sparkles, 
  Trash2, 
  Zap, 
  Download 
} from "lucide-react";
import request from "../api/client";
import styles from "./AdminPage.module.css";

function formatHeader(str) {
  if (!str) return "";
  return str.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()
    .replace(/^\w/, c => c.toUpperCase());
}
function normalizeResource(path) {
  return path.replace("/api/", "").split("/")[0];
}
function formatValue(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Sí" : "No";
  if (typeof val === "object") return JSON.stringify(val).slice(0, 60) + "…";
  const s = String(val);
  if (s.match(/^\d{4}-\d{2}-\d{2}T/)) return new Date(s).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

const RESOURCE_ICONS = {
  users: <User size={18} />, 
  products: <Package size={18} />, 
  orders: <ShoppingCart size={18} />, 
  categories: <FolderTree size={18} />,
  roles: <Key size={18} />, 
  settings: <Settings size={18} />, 
  reports: <BarChart3 size={18} />, 
  invoices: <Receipt size={18} />,
  clients: <Building2 size={18} />, 
  payments: <CreditCard size={18} />, 
  logs: <ClipboardList size={18} />, 
  default: <Folder size={18} />
};
function getIcon(name) {
  return RESOURCE_ICONS[name?.toLowerCase()] || RESOURCE_ICONS.default;
}

const systemFields = new Set(["id", "_id", "__v", "createdAt", "updatedAt", "v"]);

const fadeSlideIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } }
};
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.055 } }
};
const rowVariant = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.18 } }
};
const drawerVariant = {
  initial: { opacity: 0, x: 400 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: 400, transition: { duration: 0.25, ease: "easeIn" } }
};
const overlayVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const toastVariant = {
  initial: { opacity: 0, y: 40, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
};

function Toast({ toasts }) {
  return (
    <div className={styles.toastContainer}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} variants={toastVariant} initial="initial" animate="animate" exit="exit"
            className={styles.toastItem}
            style={{
              background: t.type === "success" ? "#0a3d2b" : t.type === "error" ? "#3d0a0a" : "#1a1a2e",
              color: t.type === "success" ? "#4ade80" : t.type === "error" ? "#f87171" : "#a5b4fc",
              border: `1px solid ${t.type === "success" ? "#166534" : t.type === "error" ? "#7f1d1d" : "#312e81"}`
            }}>
            <span className={styles.toastIcon}>
              {t.type === "success" ? <Check size={16} /> : t.type === "error" ? <X size={16} /> : <Info size={16} />}
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConfirmModal({ open, message, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div variants={overlayVariant} initial="initial" animate="animate" exit="exit"
            onClick={onCancel} className={styles.modalOverlay} />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, scale: 0.92, y: -10, transition: { duration: 0.18 } }}
            className={styles.modalContent}>
            <div className={styles.modalIcon}><AlertTriangle size={28} /></div>
            <h3 className={styles.modalTitle}>Confirmar acción</h3>
            <p className={styles.modalText}>{message}</p>
            <div className={styles.modalActions}>
              <button onClick={onCancel} className={styles.cancelBtn}>Cancelar</button>
              <button onClick={onConfirm} className={styles.saveBtn} style={{ background: "#dc2626", borderColor: "#dc2626" }}>
                Sí, eliminar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ label, value, icon, color = "#4f46e5", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] } }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: color + "22", border: `1px solid ${color}44` }}>{icon}</div>
      <div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
      </div>
    </motion.div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className={styles.searchContainer}>
      <span className={styles.searchIcon}><Search size={18} /></span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.searchInput}
        onFocus={e => e.target.style.borderColor = "#4f46e5"}
        onBlur={e => e.target.style.borderColor = "#1f2937"}
      />
    </div>
  );
}

function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (i === 0) return 1;
    if (i === 6) return totalPages;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });
  return (
    <div className={styles.paginationContainer}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className={styles.paginBtn} style={{ opacity: page === 1 ? 0.35 : 1 }}><ChevronLeft size={16} /></button>
      {pages.map((p, i) => (
        <button key={i} onClick={() => p !== "…" && onChange(p)}
          className={`${styles.paginBtn} ${p === page ? styles.paginActive : ""}`} style={{ cursor: p === "…" ? "default" : "pointer" }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className={styles.paginBtn} style={{ opacity: page === totalPages ? 0.35 : 1 }}><ChevronRight size={16} /></button>
      <span className={styles.paginationInfo}>
        {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} de {total}
      </span>
    </div>
  );
}

function DrawerForm({ open, selectedRow, headers, form, setForm, onSave, onClose, resourceName }) {
  const editableHeaders = useMemo(() => headers.filter(h => !systemFields.has(h)), [headers]);
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(e);
    setSaving(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div variants={overlayVariant} initial="initial" animate="animate" exit="exit"
            onClick={onClose} className={styles.drawerOverlay} />
          <motion.div variants={drawerVariant} initial="initial" animate="animate" exit="exit"
            className={styles.drawerPanel}>
            <div className={styles.drawerHeader}>
              <div>
                <div className={styles.drawerSubtitle}>
                  {selectedRow ? "Editar" : "Nuevo"} registro
                </div>
                <h3 className={styles.drawerTitle}>
                  {formatHeader(resourceName)}
                </h3>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose} className={styles.drawerCloseBtn}>
                <X size={18} />
              </motion.button>
            </div>

            <form onSubmit={handleSave} className={styles.drawerBody}>
              {selectedRow && (
                <div className={styles.drawerIdBanner} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={14} /> ID: <span className={styles.drawerIdSpan}>{selectedRow.id}</span>
                </div>
              )}
              {editableHeaders.map((field, i) => (
                <motion.div key={field}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.25 } }}>
                  <label className={styles.drawerLabel}>
                    {formatHeader(field)}
                  </label>
                  {field.toLowerCase().includes("description") || field.toLowerCase().includes("notes") || field.toLowerCase().includes("content") ? (
                    <textarea
                      value={form[field] || ""}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      rows={4}
                      placeholder={`Ingresa ${formatHeader(field).toLowerCase()}…`}
                      className={styles.inputStyle} />
                  ) : field.toLowerCase().includes("password") ? (
                    <input type="password" value={form[field] || ""}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder="••••••••" className={styles.inputStyle} />
                  ) : field.toLowerCase().includes("email") ? (
                    <input type="email" value={form[field] || ""}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder="correo@ejemplo.com" className={styles.inputStyle} />
                  ) : (
                    <input type="text" value={form[field] || ""}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={`Ingresa ${formatHeader(field).toLowerCase()}…`}
                      className={styles.inputStyle} />
                  )}
                </motion.div>
              ))}

              <div className={styles.drawerSubmitContainer}>
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={saving}
                  className={`${styles.saveBtn} ${styles.drawerSubmitBtn}`} style={{ opacity: saving ? 0.7 : 1 }}>
                  {saving ? (
                    <><LoadingDots />Guardando…</>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {selectedRow ? <><Save size={16} /> Guardar cambios</> : <><Sparkles size={16} /> Crear registro</>}
                    </div>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LoadingDots() {
  return (
    <span className={styles.loadingDots}>
      {[0, 1, 2].map(i => (
        <motion.span key={i} className={styles.loadingDot}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </span>
  );
}

function BulkActionsBar({ selected, total, onDeleteAll, onClearSelection }) {
  return (
    <AnimatePresence>
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.18 } }}
          className={styles.bulkBar}>
          <span className={styles.bulkText}>
            {selected.length} de {total} seleccionados
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClearSelection} className={`${styles.cancelBtn} ${styles.bulkCancelBtn}`}>
            Deseleccionar
          </button>
          <button onClick={onDeleteAll} className={styles.bulkDeleteBtn} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Trash2 size={16} /> Eliminar selección
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminPage() {
  const [schema, setSchema] = useState(null);
  const [activeResource, setActiveResource] = useState(null);
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resourceLoading, setResourceLoading] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/swagger.json`);
        const json = await res.json();
        setSchema(json);
      } catch {
        showToast("No se pudo cargar el esquema de la API.", "error");
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
      if (!map.has(resource)) map.set(resource, { name: resource, endpoints: [] });
      map.get(resource).endpoints.push({ path, methods });
    });
    return Array.from(map.values());
  }, [schema]);

  const headers = useMemo(() => data.length === 0 ? [] : Object.keys(data[0]), [data]);

  const filtered = useMemo(() => {
    let d = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
    }
    if (sortField) {
      d.sort((a, b) => {
        const av = a[sortField], bv = b[sortField];
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""), "es", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return d;
  }, [data, search, sortField, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  async function loadResource(resource) {
    setActiveResource(resource);
    setSelectedRow(null);
    setForm({});
    setShowForm(false);
    setSearch("");
    setPage(1);
    setSortField(null);
    setSelectedIds([]);
    setResourceLoading(true);
    try {
      const res = await request(`/${resource}`);
      setData(Array.isArray(res) ? res : res.data || []);
    } catch {
      setData([]);
      showToast("Error al cargar los datos.", "error");
    } finally {
      setResourceLoading(false);
    }
  }

  async function remove(id) {
    try {
      await request(`/api/${activeResource}/${id}`, { method: "DELETE" });
      setData(p => p.filter(x => x.id !== id));
      setSelectedIds(p => p.filter(x => x !== id));
      showToast("Registro eliminado correctamente.");
    } catch {
      showToast("No se pudo eliminar el registro.", "error");
    }
  }

  async function bulkDelete() {
    try {
      await Promise.all(selectedIds.map(id => request(`/api/${activeResource}/${id}`, { method: "DELETE" })));
      setData(p => p.filter(x => !selectedIds.includes(x.id)));
      showToast(`${selectedIds.length} registros eliminados.`);
      setSelectedIds([]);
    } catch {
      showToast("Error al eliminar registros.", "error");
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (selectedRow) {
        const res = await request(`/api/${activeResource}/${selectedRow.id}`, { method: "PUT", body: JSON.stringify(form) });
        setData(p => p.map(x => (x.id === selectedRow.id ? res : x)));
        showToast("Registro actualizado correctamente.");
      } else {
        const res = await request(`/api/${activeResource}`, { method: "POST", body: JSON.stringify(form) });
        setData(p => [res, ...p]);
        showToast("Registro creado exitosamente.");
      }
      setForm({});
      setSelectedRow(null);
      setShowForm(false);
    } catch {
      showToast("Ocurrió un error al guardar.", "error");
    }
  }

  function handleEdit(row) { setSelectedRow(row); setForm({ ...row }); setShowForm(true); }
  function handleCreateNew() { setSelectedRow(null); setForm({}); setShowForm(true); }
  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }
  function toggleRow(id) {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function toggleAll() {
    const ids = paginated.map(r => r.id).filter(Boolean);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])]);
  }

  function exportCSV() {
    const rows = [headers.join(","), ...filtered.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeResource}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Exportado a CSV correctamente.");
  }

  if (loading) {
    return (
      <div className={`${styles.pageStyle} ${styles.centered}`}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.pageStyle}>
      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={styles.sidebar}>

        <div className={styles.sidebarLogoContainer}
          style={{ padding: sidebarCollapsed ? "18px 0" : "22px 20px 16px", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
          <motion.div whileHover={{ rotate: 20 }} className={styles.logoIcon} style={{ display: "flex", alignItems: "center" }}>
            <Zap size={20} />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.05 } }} exit={{ opacity: 0, x: -10 }}>
                <div className={styles.logoTitle}>AdminPanel</div>
                <div className={styles.logoSubtitle}>WALTER</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.resourcesList} style={{ padding: sidebarCollapsed ? "12px 8px" : "12px 10px" }}>
          {!sidebarCollapsed && (
            <div className={styles.sidebarSectionTitle}>Módulos</div>
          )}
          {resources.map((r, i) => (
            <motion.button key={r.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06, duration: 0.28 } }}
              whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadResource(r.name)}
              title={sidebarCollapsed ? formatHeader(r.name) : undefined}
              className={styles.resourceBtn}
              style={{
                padding: sidebarCollapsed ? "10px 0" : "10px 12px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                fontWeight: activeResource === r.name ? 700 : 500,
                background: activeResource === r.name ? "rgba(79,70,229,0.18)" : "transparent",
                color: activeResource === r.name ? "#a5b4fc" : "#6b7280",
                boxShadow: activeResource === r.name ? "inset 0 0 0 1px rgba(99,102,241,0.3)" : "none"
              }}>
              <span className={styles.resourceIcon} style={{ display: "flex", alignItems: "center" }}>{getIcon(r.name)}</span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} exit={{ opacity: 0 }}
                    className={styles.resourceText}>
                    {formatHeader(r.name)}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <div className={styles.collapseContainer}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarCollapsed(p => !p)}
            className={styles.collapseBtn}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Colapsar</>}
          </motion.button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <main className={styles.mainContainer}>

        {/* Topbar — fixed height, never scrolls */}
        <div className={styles.topbar}>
          <div style={{ flex: 1 }}>
            <AnimatePresence mode="wait">
              {activeResource ? (
                <motion.div key={activeResource} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <div className={styles.topbarTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {getIcon(activeResource)} {formatHeader(activeResource)}
                  </div>
                  <div className={styles.topbarSubtitle}>
                    {filtered.length} registros · Última actualización: {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={styles.topbarTitle}>Panel de Administración</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content area — fills remaining height, no outer scroll */}
        <div className={styles.contentWrapper}>
          <AnimatePresence mode="wait">
            {!activeResource ? (
              <motion.div key="welcome" variants={fadeSlideIn} initial="initial" animate="animate" exit="exit"
                className={styles.welcomeScroll}>
                <div className={styles.welcomeHeader}>
                  <p className={styles.welcomeSubtitle}>
                    Selecciona un módulo para gestionar tus datos.
                  </p>
                </div>
                <motion.div variants={staggerContainer} initial="initial" animate="animate"
                  className={styles.modulesGrid}>
                  {resources.map((r) => (
                    <motion.button key={r.name} variants={rowVariant}
                      whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(79,70,229,0.2)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => loadResource(r.name)}
                      className={styles.moduleCard}>
                      <div className={styles.moduleCardTitle}>{formatHeader(r.name)}</div>
                      <div className={styles.moduleCardMeta}>{r.endpoints.length} endpoints</div>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              /* Resource view: flex column, table scrolls internally */
              <motion.div key={activeResource} variants={fadeSlideIn} initial="initial" animate="animate" exit="exit"
                className={styles.resourceContent}>

                {/* Toolbar row — fixed, never scrolls */}
                <div className={styles.resourceToolbar}>
                  <SearchBar value={search} onChange={setSearch} placeholder="Buscar..." />
                  <button onClick={handleCreateNew} className={styles.saveBtn} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={16} /> Nuevo
                  </button>
                  <button onClick={exportCSV} className={styles.cancelBtn} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={16} /> Exportar CSV
                  </button>
                </div>

                <BulkActionsBar selected={selectedIds} total={filtered.length} onDeleteAll={bulkDelete} onClearSelection={() => setSelectedIds([])} />

                {/* Scrollable table container — grows to fill remaining space */}
                <div className={styles.tableWrapper}>
                  {resourceLoading ? (
                    <div className={styles.centered} style={{ height: "100%" }}><LoadingDots /></div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th><input type="checkbox" onChange={toggleAll} /></th>
                          {headers.map(h => (
                            <th key={h} onClick={() => toggleSort(h)}>{formatHeader(h)}</th>
                          ))}
                          <th style={{ textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(row => (
                          <tr key={row.id}>
                            <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} /></td>
                            {headers.map(h => (
                              <td key={h}>{formatValue(row[h])}</td>
                            ))}
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <button onClick={() => handleEdit(row)} className={styles.actionEditBtn}>Editar</button>
                              <button onClick={() => setConfirmDelete({ id: row.id, message: "¿Eliminar registro?" })} className={styles.actionDeleteBtn}>Eliminar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination — fixed at bottom */}
                <div className={styles.paginationRow}>
                  <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <DrawerForm open={showForm} selectedRow={selectedRow} headers={headers} form={form} setForm={setForm} onSave={save} onClose={() => setShowForm(false)} resourceName={activeResource} />
      <ConfirmModal open={!!confirmDelete} message={confirmDelete?.message} onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
      <Toast toasts={toasts} />
    </div>
  );
}