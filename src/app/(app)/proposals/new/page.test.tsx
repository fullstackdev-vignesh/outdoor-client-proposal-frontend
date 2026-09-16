import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewProposalPage from './page';
import { ToastProvider } from '@/components/ui/Toast';

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
  fileBaseURL: 'http://localhost:5000',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  // @ts-expect-error jsdom has no IntersectionObserver
  global.IntersectionObserver = IntersectionObserverStub;
  vi.spyOn(window, 'open').mockImplementation(() => null);

  apiGet.mockReset().mockImplementation((url: string) => {
    if (url === '/clients') return Promise.resolve({ data: { items: [{ _id: 'c1', name: 'Acme Corp', customerType: 'client' }] } });
    if (url === '/sites')
      return Promise.resolve({
        data: { items: [{ _id: 's1', mediaId: 'MED1', mediaType: 'Hoarding', city: 'Chennai', state: 'TN', mediaStatus: 'available', totalCost: 1000 }], total: 1 },
      });
    if (url === '/ppt-templates') return Promise.resolve({ data: [{ _id: 'ppt1', name: 'Adinn New Template', description: '', status: 'active', version: '1.0', usedCount: 0, createdAt: new Date().toISOString() }] });
    if (url === '/excel-templates') return Promise.resolve({ data: [{ _id: 'ex1', name: 'Standard Excel', description: '', status: 'active', version: '1.0', usedCount: 0, createdAt: new Date().toISOString() }] });
    return Promise.resolve({ data: [] });
  });

  apiPost.mockReset().mockImplementation((url: string) => {
    if (url === '/proposals') return Promise.resolve({ data: { _id: 'prop1', pptTemplate: 'ppt1', excelTemplate: 'ex1' } });
    if (url === '/proposals/prop1/generate-ppt') return Promise.resolve({ data: { _id: 'prop1', generatedPptUrl: '/uploads/generated/prop1.pptx' } });
    return Promise.resolve({ data: {} });
  });
});

async function goThroughWizardToPreview() {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <NewProposalPage />
    </ToastProvider>
  );

  await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());
  await user.click(screen.getByText('Acme Corp'));
  await user.click(screen.getByRole('button', { name: /^next$/i }));

  await waitFor(() => expect(screen.getByText('MED1')).toBeInTheDocument());
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.click(screen.getByRole('button', { name: /^next$/i }));

  await waitFor(() => expect(screen.getByText('Adinn New Template')).toBeInTheDocument());
  await user.click(screen.getByText('Adinn New Template'));
  await user.click(screen.getByRole('button', { name: /^next$/i }));

  await waitFor(() => expect(screen.getByText('Standard Excel')).toBeInTheDocument());
  await user.click(screen.getByText('Standard Excel'));
  await user.click(screen.getByRole('button', { name: /^next$/i }));

  await waitFor(() => expect(screen.getByRole('button', { name: /download ppt/i })).toBeInTheDocument());
  return user;
}

describe('NewProposalPage - PPT template selection is preserved through preview/download', () => {
  it('sends the selected PPT template id when creating the proposal', async () => {
    const user = await goThroughWizardToPreview();
    await user.click(screen.getByRole('button', { name: /download ppt/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/proposals', expect.objectContaining({ pptTemplate: 'ppt1' })));
  });

  it('requests generate-ppt for the created proposal (no template mismatch)', async () => {
    const user = await goThroughWizardToPreview();
    await user.click(screen.getByRole('button', { name: /download ppt/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/proposals/prop1/generate-ppt'));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('http://localhost:5000/uploads/generated/prop1.pptx', '_blank'));
  });
});
