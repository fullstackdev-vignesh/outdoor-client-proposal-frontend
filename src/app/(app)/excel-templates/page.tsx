import TemplateManager from '@/components/templates/TemplateManager';

export default function ExcelTemplatesPage() {
  return (
    <TemplateManager
      title="Excel Templates"
      subtitle="Manage Excel formats used for client-specific proposal exports"
      endpoint="/excel-templates"
      simpleCreateFields
    />
  );
}
