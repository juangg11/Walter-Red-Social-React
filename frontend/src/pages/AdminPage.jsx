import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Folder,
  Image,
  Info,
  Key,
  MessageCircle,
  Search,
  User,
  Users,
  Zap,
} from 'lucide-react';
import request from '../api/client';
import styles from './AdminPage.module.css';

const RESOURCE_ICONS = {
  auth: <Key size={18} />,
  usuarios: <User size={18} />,
  comunidades: <Users size={18} />,
  publicaciones: <Folder size={18} />,
  comentarios: <MessageCircle size={18} />,
  notificaciones: <Info size={18} />,
  media: <Image size={18} />,
  chats: <MessageCircle size={18} />,
  mensajes_chat: <MessageCircle size={18} />,
  default: <Folder size={18} />,
};

const fadeSlideIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

const rowVariant = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

const toastVariant = {
  initial: { opacity: 0, y: 40, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } },
};

function formatHeader(str) {
  if (!str) return '';
  return str
    .replaceAll(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80);

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) || /^\d{4}-\d{2}-\d{2} /.test(text)) {
    return new Date(text).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return text.length > 100 ? `${text.slice(0, 100)}...` : text;
}

function getIcon(name) {
  return RESOURCE_ICONS[name?.toLowerCase()] || RESOURCE_ICONS.default;
}

function removeToastById(currentToasts, toastId) {
  return currentToasts.filter((toast) => toast.id !== toastId);
}

function Toast({ toasts }) {
  return (
    <div className={styles.toastContainer}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            variants={toastVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            className={styles.toastItem}
            style={{
              background: toast.type === 'error' ? 'var(--danger)' : 'var(--bg-tertiary)',
              color: toast.type === 'error' ? '#fca5a5' : 'var(--text-primary)',
              border: toast.type === 'error' ? '1px solid var(--secondary)' : '1px solid var(--primary)',
            }}
          >
            <span className={styles.toastIcon}>{toast.type === 'error' ? '!' : 'i'}</span>
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className={styles.loadingDots}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className={styles.loadingDot}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: index * 0.15 }}
        />
      ))}
    </span>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className={styles.searchContainer}>
      <span className={styles.searchIcon}><Search size={18} /></span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={styles.searchInput}
      />
    </div>
  );
}

function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className={styles.paginationContainer}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className={styles.paginBtn}>
        <ChevronLeft size={16} />
      </button>
      <span className={styles.paginationInfo}>
        Pagina {page} de {totalPages} · {total} registros
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === totalPages} className={styles.paginBtn}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function getRowKey(row, index) {
  return row.id ?? `${row.usuario_id ?? 'row'}-${row.publicacion_id ?? row.chat_id ?? index}`;
}

export default function AdminPage() {
  const [resources, setResources] = useState([]);
  const [activeResource, setActiveResource] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const perPage = 12;

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => removeToastById(current, id));
    }, 3500);
  }, []);

  const loadResource = useCallback(async (resourceName) => {
    setActiveResource(resourceName);
    setSearch('');
    setPage(1);
    setSortField(null);
    setResourceLoading(true);

    try {
      const rows = await request(`/admin/${resourceName}`);
      setData(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setData([]);
      showToast(error.message || 'Error al cargar los datos.', 'error');
    } finally {
      setResourceLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let ignore = false;

    async function loadResources() {
      try {
        const nextResources = await request('/admin/resources');
        if (ignore) return;
        setResources(Array.isArray(nextResources) ? nextResources : []);
      } catch (error) {
        if (!ignore) showToast(error.message || 'No se pudieron cargar los recursos admin.', 'error');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadResources();
    return () => {
      ignore = true;
    };
  }, [showToast]);

  const activeMeta = useMemo(
    () => resources.find((resource) => resource.name === activeResource) || null,
    [activeResource, resources],
  );

  const headers = useMemo(() => (data.length === 0 ? [] : Object.keys(data[0])), [data]);

  const filtered = useMemo(() => {
    let nextData = [...data];
    const query = search.trim().toLowerCase();

    if (query) {
      nextData = nextData.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query)));
    }

    if (sortField) {
      nextData.sort((left, right) => {
        const comparison = String(left[sortField] ?? '').localeCompare(String(right[sortField] ?? ''), 'es', { numeric: true });
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return nextData;
  }, [data, search, sortDir, sortField]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDir('asc');
  }

  function exportCSV() {
    if (headers.length === 0) return;

    const rows = [
      headers.join(','),
      ...filtered.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeResource}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exportado a CSV correctamente.');
  }

  if (loading) {
    return (
      <div className={`${styles.pageStyle} ${styles.centered}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className={styles.spinner}
        />
      </div>
    );
  }

  return (
    <div className={styles.pageStyle}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={styles.sidebar}
      >
        <div
          className={styles.sidebarLogoContainer}
          style={{
            padding: sidebarCollapsed ? '18px 0' : '22px 20px 16px',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <motion.div whileHover={{ rotate: 20 }} className={styles.logoIcon} style={{ display: 'flex', alignItems: 'center' }}>
            <Zap size={20} />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className={styles.logoTitle}>AdminPanel</div>
                <div className={styles.logoSubtitle}>WALTER</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.resourcesList} style={{ padding: sidebarCollapsed ? '12px 8px' : '12px 10px' }}>
          {!sidebarCollapsed && <div className={styles.sidebarSectionTitle}>Modulos</div>}
          {resources.map((resource, index) => (
            <motion.button
              key={resource.name}
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { delay: index * 0.04, duration: 0.28 } }}
              whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadResource(resource.name)}
              title={sidebarCollapsed ? resource.label : undefined}
              className={styles.resourceBtn}
              style={{
                padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                fontWeight: activeResource === resource.name ? 700 : 500,
                background: activeResource === resource.name ? 'var(--bg-tertiary)' : 'transparent',
                color: activeResource === resource.name ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: activeResource === resource.name ? 'inset 0 0 0 1px var(--border-color)' : 'none',
              }}
            >
              <span className={styles.resourceIcon} style={{ display: 'flex', alignItems: 'center' }}>{getIcon(resource.name)}</span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.resourceText}>
                    {resource.label || formatHeader(resource.name)}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <div className={styles.collapseContainer}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarCollapsed((current) => !current)}
            className={styles.collapseBtn}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Colapsar</>}
          </motion.button>
        </div>
      </motion.aside>

      <main className={styles.mainContainer}>
        <div className={styles.topbar}>
          <div style={{ flex: 1 }}>
            <AnimatePresence mode="wait">
              {activeResource ? (
                <motion.div key={activeResource} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <div className={styles.topbarTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getIcon(activeResource)} {activeMeta?.label || formatHeader(activeResource)}
                  </div>
                  <div className={styles.topbarSubtitle}>
                    {filtered.length} registros · Ultima actualizacion: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={styles.topbarTitle}>Panel de Administracion</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={styles.contentWrapper}>
          <AnimatePresence mode="wait">
            {activeResource == null ? (
              <motion.div key="welcome" variants={fadeSlideIn} initial="initial" animate="animate" exit="exit" className={styles.welcomeScroll}>
                <div className={styles.welcomeHeader}>
                  <p className={styles.welcomeSubtitle}>Selecciona un modulo para consultar datos administrativos globales.</p>
                </div>
                <motion.div initial="initial" animate="animate" className={styles.modulesGrid}>
                  {resources.map((resource) => (
                    <motion.button
                      key={resource.name}
                      type="button"
                      variants={rowVariant}
                      whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(79,70,229,0.2)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => loadResource(resource.name)}
                      className={styles.moduleCard}
                    >
                      <div className={styles.moduleCardTitle}>{resource.label || formatHeader(resource.name)}</div>
                      <div className={styles.moduleCardMeta}>{resource.description || 'Datos del sistema'}</div>
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div key={activeResource} variants={fadeSlideIn} initial="initial" animate="animate" exit="exit" className={styles.resourceContent}>
                <div className={styles.resourceToolbar}>
                  <SearchBar value={search} onChange={setSearch} placeholder="Buscar..." />
                  <button type="button" onClick={exportCSV} className={styles.cancelBtn} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={16} /> Exportar CSV
                  </button>
                </div>

                <div className={styles.tableWrapper}>
                  {resourceLoading ? (
                    <div className={styles.centered} style={{ height: '100%' }}><LoadingDots /></div>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          {headers.map((header) => (
                            <th key={header}>
                              <button
                                type="button"
                                onClick={() => toggleSort(header)}
                                style={{ all: 'unset', cursor: 'pointer' }}
                              >
                                {formatHeader(header)} {sortField === header ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((row, index) => (
                          <tr key={getRowKey(row, index)}>
                            {headers.map((header) => (
                              <td key={header}>{formatValue(row[header])}</td>
                            ))}
                          </tr>
                        ))}
                        {paginated.length === 0 && (
                          <tr>
                            <td colSpan={Math.max(headers.length, 1)} style={{ textAlign: 'center' }}>
                              No hay registros para mostrar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className={styles.paginationRow}>
                  <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}

const anyId = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

Toast.propTypes = {
  toasts: PropTypes.arrayOf(PropTypes.shape({
    id: anyId.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.string,
  })).isRequired,
};

SearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
