#!/usr/bin/env node

import { startServer } from './app';

startServer().catch((error) => {
  console.error('Failed to start patient service:', error);
  process.exit(1);
});