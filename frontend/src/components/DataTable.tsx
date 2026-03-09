import React from 'react';

interface Column {
  Header: string;
  accessor: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Cell?: (props: { value: any }, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
}

const DataTable: React.FC<DataTableProps> = ({ columns, data }) => {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              {columns.map((col) => (
                <th
                  key={col.accessor}
                  className="px-5 py-3 text-left text-[11px] font-mono font-medium text-text-muted uppercase tracking-wider"
                >
                  {col.Header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="transition-colors duration-100 hover:bg-canvas-100/50"
              >
                {columns.map((col) => {
                  const cellValue = row[col.accessor];
                  return (
                    <td
                      key={col.accessor}
                      className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap"
                    >
                      {col.Cell ? col.Cell({ value: cellValue }, row) : cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-text-muted text-sm"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
