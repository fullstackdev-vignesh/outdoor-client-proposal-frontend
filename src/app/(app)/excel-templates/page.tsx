import TemplateManager from '@/components/templates/TemplateManager';

// Keys must match backend/src/config/excelTemplateConfigs.js EXCEL_CONFIGS.
const EXCEL_FORMAT_OPTIONS = [
  { value: 'adinn-excel-1', label: 'Adinn — Standard Site Sheet' },
  { value: 'rotn-excel-1', label: 'ROTN — Site Sheet (2-row block)' },
  { value: 'jagran-excel-1', label: 'Jagran — Statewide Plan' },
  { value: 'jagran-excel-2', label: 'Jagran — City Proposal' },
];

export default function ExcelTemplatesPage() {
  return (
    <TemplateManager
      title="Excel Templates"
      subtitle="Manage Excel formats used for client-specific proposal exports. Note: legacy .xls files (old binary Excel format) can be uploaded but must be re-saved as .xlsx before proposal generation will work."
      endpoint="/excel-templates"
      formatOptions={EXCEL_FORMAT_OPTIONS}
    />
  );
}
