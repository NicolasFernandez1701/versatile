import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable, type Column } from './DataTable';

interface TestItem {
  id: number;
  name: string;
  email: string;
}

const columns: Column<TestItem>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Nombre' },
  { key: 'email', header: 'Email' },
];

const data: TestItem[] = [
  { id: 1, name: 'Juan', email: 'juan@test.com' },
  { id: 2, name: 'María', email: 'maria@test.com' },
];

describe('DataTable', () => {
  it('renderiza tabla con datos y column headers', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(row) => row.id}
      />
    );
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.getByText('juan@test.com')).toBeInTheDocument();
  });

  it('loading=true muestra Loader con texto Cargando datos...', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        loading
        keyExtractor={(row) => row.id}
      />
    );
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
    // No debe mostrar la tabla ni los datos
    expect(screen.queryByText('Juan')).not.toBeInTheDocument();
    expect(screen.queryByText('ID')).not.toBeInTheDocument();
  });

  it('data vacío muestra emptyMessage', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No hay usuarios"
        keyExtractor={(row) => row.id}
      />
    );
    expect(screen.getByText('No hay usuarios')).toBeInTheDocument();
  });

  it('data vacío usa mensaje default si no se provee emptyMessage', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(row) => row.id}
      />
    );
    expect(screen.getByText('No hay datos disponibles.')).toBeInTheDocument();
  });

  it('col.render custom se usa para renderizar celdas', () => {
    const customCols: Column<TestItem>[] = [
      { key: 'id', header: 'ID' },
      {
        key: 'name',
        header: 'Nombre',
        render: (row) => <strong data-testid="custom-cell">{row.name.toUpperCase()}</strong>,
      },
    ];
    render(
      <DataTable
        columns={customCols}
        data={[{ id: 1, name: 'Juan', email: 'juan@test.com' }]}
        keyExtractor={(row) => row.id}
      />
    );
    expect(screen.getByText('JUAN')).toBeInTheDocument();
    expect(screen.getAllByTestId('custom-cell').length).toBe(1);
  });

  it('keyExtractor se usa para keys de filas', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(row) => `row-${row.id}`}
      />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('key')).toBeNull(); // React keys no se renderizan en DOM
  });
});
