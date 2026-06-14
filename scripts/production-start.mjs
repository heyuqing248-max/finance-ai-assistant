#!/usr/bin/env node

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.FINANCE_AI_PUBLIC_HOST = process.env.FINANCE_AI_PUBLIC_HOST || "0.0.0.0";

await import("./public-preview-server.mjs");
