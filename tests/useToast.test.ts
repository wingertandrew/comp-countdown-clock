import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useToast, _listeners } from '../src/hooks/use-toast';

function Wrapper() {
  useToast();
  return null;
}

describe('useToast listeners', () => {
  test('multiple renders do not add duplicate listeners', () => {
    const renderer = TestRenderer.create(<Wrapper />);
    expect(_listeners.length).toBe(1);
    act(() => {
      renderer.update(<Wrapper />);
    });
    expect(_listeners.length).toBe(1);
    renderer.unmount();
    expect(_listeners.length).toBe(0);
  });
});
