import { readFile, stat } from 'node:fs/promises';

export interface SheetProjection {
  readonly name: string;
  readonly rows: readonly (readonly unknown[])[];
  readonly truncated: boolean;
}

async function assertProjectionSize(path: string, maximumBytes: number, label: string): Promise<void> {
  const info = await stat(path);
  if (info.size > maximumBytes) throw new Error(`${label} projection limit exceeded: ${info.size} bytes`);
}

export async function renderDocxHtml(path: string): Promise<string> {
  await assertProjectionSize(path, 32 * 1024 * 1024, 'DOCX');
  const [{ default: mammoth }, buffer] = await Promise.all([
    import('mammoth'),
    readFile(path),
  ]);
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

export async function projectWorkbook(path: string): Promise<readonly SheetProjection[]> {
  await assertProjectionSize(path, 64 * 1024 * 1024, 'workbook');
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  if (path.toLowerCase().endsWith('.csv')) await workbook.csv.readFile(path);
  else await workbook.xlsx.readFile(path);

  const maximumRows = 10_000;
  const maximumColumns = 256;
  return workbook.worksheets.map((sheet) => {
    const rows: unknown[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > maximumRows) return;
      const values = Array.isArray(row.values) ? row.values.slice(1, maximumColumns + 1) : [];
      rows.push(values.map((value) => {
        if (value && typeof value === 'object' && 'text' in value) return String(value.text);
        if (value instanceof Date) return value.toISOString();
        return value ?? '';
      }));
    });
    return {
      name: sheet.name,
      rows,
      truncated: sheet.rowCount > maximumRows || sheet.columnCount > maximumColumns,
    };
  });
}
