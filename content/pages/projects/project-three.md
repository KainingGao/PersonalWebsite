---
type: ProjectLayout
title: AI Chat & Image Platform
colors: colors-a
date: '2025-02-01'
client: Personal Project
description: >-
  A Next.js and PostgreSQL platform with persistent AI chat threads, image generation, token metering, API keys, and quota-aware OpenAI-compatible proxying.
featuredImage:
  type: ImageBlock
  url: /images/bg3.jpg
  altText: AI chat and image platform thumbnail
media:
  type: ImageBlock
  url: /images/bg3.jpg
  altText: AI chat and image platform screenshot
---

## Project Overview

I built an AI chat and image platform using Next.js, TypeScript, PostgreSQL, and serverless API routes. The application supports persisted chat threads, image workflows, user authentication, API key issuance, and token metering for more than 200 monthly active users.

### Key Technologies

- **Frontend**: Next.js, TypeScript, React
- **Backend**: Serverless API routes, provider proxying
- **Database**: PostgreSQL
- **Auth and Access**: NextAuth sessions, API keys, usage tracking
- **AI Integration**: OpenAI-compatible proxy, response sanitization, quotas

### Features

- Persistent AI chat threads with pagination and client-side caching
- Image generation workflow alongside text chat
- API key issuance and usage tracking for developer access
- OpenAPI documentation for integration workflows
- OpenAI-compatible proxy that enforces quotas and sanitizes provider responses
- Role-aware access control across user-facing and developer-facing surfaces

## Engineering Details

The platform uses serverless routes to keep the API surface modular while routing requests through a provider proxy layer. That layer normalizes upstream responses, applies usage limits, and records token consumption so the product can expose reliable metering to users and developers.

I also focused on product reliability patterns: paginated thread history, secure session handling, API key lifecycle management, and access control checks around both UI actions and backend endpoints.

## Results

This project strengthened my experience building production-style AI applications: authentication, metering, provider abstraction, database-backed state, API design, and safeguards around generated content and third-party responses.
