import TemplateManager from '@/components/templates/TemplateManager';

export default function PPTMasterPage() {
  return (
    <TemplateManager
      title="PPT Master Templates"
      subtitle="Manage reusable PPT templates used for proposal generation"
      endpoint="/ppt-templates"
      showVariant
      simpleCreateFields
    />
  );
}
