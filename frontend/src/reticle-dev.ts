import { registerCapabilities } from '@reticlehq/core';
if (import.meta.env.DEV) {
  registerCapabilities({
    testids: [], // your data-testid values
    signals: [], // your reticle.signal() names
    stores: [],  // your registerStore() names
  });
}
