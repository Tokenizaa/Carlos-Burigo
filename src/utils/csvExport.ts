/**
 * Exportador CSV no padrão brasileiro (delimitador ponto-e-vírgula e codificação UTF-8 com BOM).
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const formatCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(formatCell).join(';'),
    ...rows.map((row) => row.map(formatCell).join(';')),
  ].join('\r\n');

  // Adiciona BOM (\uFEFF) para compatibilidade perfeita com Excel em português
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
