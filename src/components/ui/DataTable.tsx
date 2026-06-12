import type { ReactNode } from 'react';
import { Loader } from './Loader';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string; // Optional custom class for the <td>
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No hay datos disponibles.',
  keyExtractor
}: DataTableProps<T>) {
  
  if (loading) {
    return (
      <div className="table-container" style={{ padding: '2rem' }}>
        <Loader text="Cargando datos..." size="medium" />
      </div>
    );
  }

  return (
    <div className="table-container">
      {data.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={keyExtractor(row)}>
                {columns.map((col) => (
                  <td 
                    key={col.key} 
                    data-label={col.header}
                    className={col.className}
                  >
                    {col.render ? col.render(row) : String((row as any)[col.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
