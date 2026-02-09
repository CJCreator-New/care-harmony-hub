import { performance } from 'perf_hooks';
import { render } from '@testing-library/react';

describe('Performance Tests', () => {
  it('simple component renders within performance threshold', () => {
    const start = performance.now();
    
    render(<div>Simple Component</div>);
    
    const end = performance.now();
    const renderTime = end - start;
    
    expect(renderTime).toBeLessThan(150); // 150ms threshold for test environment
  });

  it('handles large datasets efficiently', () => {
    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    const start = performance.now();
    
    render(
      <div>
        {mockData.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    );
    
    const end = performance.now();
    const renderTime = end - start;
    
    expect(renderTime).toBeLessThan(600); // 600ms threshold for large datasets
  });
});