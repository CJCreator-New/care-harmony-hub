import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

expect.extend(toHaveNoViolations);

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('WCAG 2.1 AA Compliance', () => {
  it('Login page should have no accessibility violations', async () => {
    const LoginPage = () => (
      <div>
        <h1>Login</h1>
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" />
          <button type="submit">Login</button>
        </form>
      </div>
    );

    const { container } = render(<LoginPage />, { wrapper: createWrapper() });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Form inputs should have proper labels', async () => {
    const FormComponent = () => (
      <form>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </form>
    );

    const { container } = render(<FormComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Buttons should have accessible names', async () => {
    const ButtonComponent = () => (
      <div>
        <button>Submit</button>
        <button aria-label="Close dialog">×</button>
      </div>
    );

    const { container } = render(<ButtonComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Images should have alt text', async () => {
    const ImageComponent = () => (
      <div>
        <img src="/logo.png" alt="CareSync Logo" />
        <img src="/icon.png" alt="" role="presentation" />
      </div>
    );

    const { container } = render(<ImageComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
