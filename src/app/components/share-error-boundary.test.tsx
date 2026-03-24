import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareErrorBoundary } from './share-error-boundary';

const useRouteError = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useRouteError: () => useRouteError(),
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  };
});

describe('ShareErrorBoundary', () => {
  beforeEach(() => {
    useRouteError.mockReset();
  });

  it('renders the route error message when present', () => {
    useRouteError.mockReturnValue(new Error('This shared palette has expired'));

    render(<ShareErrorBoundary />);

    expect(screen.getByText('This shared palette has expired')).toBeInTheDocument();
  });

  it('falls back to the default invalid-link message', () => {
    useRouteError.mockReturnValue(null);

    render(<ShareErrorBoundary />);

    expect(screen.getByText('This link may have expired or is invalid. Shared links expire after 30 days.')).toBeInTheDocument();
  });
});
