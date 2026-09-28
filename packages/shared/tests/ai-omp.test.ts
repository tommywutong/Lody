import { describe, expect, it } from 'vitest';

import {
  getManagedBuiltinRuntimeByAgentType,
  getManagedBuiltinRuntimeByRuntimeName,
  getStaticBuiltinAcpCapabilities,
  isBuiltinAgentType,
  isManagedBuiltinAgentType,
  supportsBuiltinProviderSetup,
} from '../src/ai';

describe('builtin OMP shared contract', () => {
  it('maps OMP to its managed adapter runtime without fabricating runtime capabilities', () => {
    expect(isBuiltinAgentType('omp')).toBe(true);
    expect(isManagedBuiltinAgentType('omp')).toBe(true);
    expect(supportsBuiltinProviderSetup('omp')).toBe(true);
    expect(getManagedBuiltinRuntimeByAgentType('omp')).toEqual({
      runtimeName: 'omp',
      agentType: 'omp',
      displayName: 'Oh My Pi',
    });
    expect(getManagedBuiltinRuntimeByRuntimeName('omp')?.agentType).toBe('omp');
    expect(getStaticBuiltinAcpCapabilities('builtin', 'omp')).toBeUndefined();
  });
});
