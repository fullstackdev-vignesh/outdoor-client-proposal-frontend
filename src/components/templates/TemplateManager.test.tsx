import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateManager from './TemplateManager';

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  apiGet.mockReset().mockResolvedValue({ data: [] });
  apiPost.mockReset().mockResolvedValue({ data: {} });
});

async function openUploadModal(props: Partial<React.ComponentProps<typeof TemplateManager>> = {}) {
  const utils = render(
    <TemplateManager title="PPT Master Templates" subtitle="sub" endpoint="/ppt-templates" showVariant simpleCreateFields {...props} />
  );
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  await userEvent.click(screen.getByRole('button', { name: /upload template/i }));
  const form = utils.container.querySelector('form') as HTMLFormElement;
  return { ...utils, form };
}

describe('TemplateManager - PPT Master Upload Template popup', () => {
  it('opens the Upload Template popup', async () => {
    await openUploadModal();
    expect(screen.getByRole('heading', { name: /upload template/i })).toBeInTheDocument();
  });

  it('shows Template Name, Description and Status fields', async () => {
    const { form } = await openUploadModal();
    const scope = within(form);
    expect(scope.getByText(/template name/i)).toBeInTheDocument();
    expect(scope.getByText(/^description$/i)).toBeInTheDocument();
    expect(scope.getByText(/^status$/i)).toBeInTheDocument();
  });

  it('does not show Version, Template Variant or File Upload fields', async () => {
    const { form } = await openUploadModal();
    const scope = within(form);
    expect(scope.queryByText(/^version$/i)).not.toBeInTheDocument();
    expect(scope.queryByText(/template variant/i)).not.toBeInTheDocument();
    expect(scope.queryByText(/file \(\.pptx/i)).not.toBeInTheDocument();
    expect(scope.queryByText(/click to select file/i)).not.toBeInTheDocument();
  });

  it('requires Template Name before submit', async () => {
    const { container } = await openUploadModal();
    const nameInput = container.querySelector('form input') as HTMLInputElement;
    expect(nameInput).toBeRequired();
  });

  it('submits with only name, description and status in the payload', async () => {
    const { container } = await openUploadModal();
    const user = userEvent.setup();
    const nameInput = container.querySelector('form input') as HTMLInputElement;
    const descriptionInput = container.querySelector('form textarea') as HTMLTextAreaElement;

    await user.type(nameInput, 'New PPT Template');
    await user.type(descriptionInput, 'A test description');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    const [endpoint, formData] = apiPost.mock.calls[0];
    expect(endpoint).toBe('/ppt-templates');
    expect(formData instanceof FormData).toBe(true);
    expect(formData.get('name')).toBe('New PPT Template');
    expect(formData.get('description')).toBe('A test description');
    expect(formData.get('status')).toBe('active');
    expect(formData.get('version')).toBeNull();
    expect(formData.get('variant')).toBeNull();
    expect(formData.get('file')).toBeNull();
  });
});

describe('TemplateManager - Excel Templates modal stays unaffected', () => {
  it('still shows Version and File Upload for Excel (no simpleCreateFields)', async () => {
    const { container } = render(<TemplateManager title="Excel Templates" subtitle="sub" endpoint="/excel-templates" />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /upload template/i }));
    const form = container.querySelector('form') as HTMLFormElement;
    const scope = within(form);
    expect(scope.getByText(/^version$/i)).toBeInTheDocument();
    expect(scope.getByText(/file \(\.pptx/i)).toBeInTheDocument();
    expect(scope.queryByText(/template variant/i)).not.toBeInTheDocument();
  });
});
