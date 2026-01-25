# Frontend Architecture

This project uses a layered architecture design, organizing code into four main layers based on responsibilities:

## Architecture Layers

### 1. Infrastructure Layer
**Path**: `src/infrastructure/`

Handles low-level infrastructure functionality:
- **auth.ts**: Authentication utility functions (token management, user ID parsing)
- **http-client.ts**: HTTP request client (unified error handling, interceptors)
- **error-handler.ts**: Error handling utilities (unified error format, error classification)

### 2. Data Layer
**Path**: `src/data/services/`

Handles API requests, data transformation, and cache management:
- **post.service.ts**: Post-related APIs
- **comment.service.ts**: Comment-related APIs
- **user.service.ts**: User-related APIs
- **follow.service.ts**: Follow-related APIs
- **event.service.ts**: Event/notification-related APIs

### 3. Logic Layer
**Path**: `src/logic/hooks/`

Handles business logic and data transformation:
- **useAuth.ts**: Authentication business logic
- **usePosts.ts**: Post business logic
- **useUser.ts**: User business logic
- **useFollows.ts**: Follow business logic
- **useSearch.ts**: Search business logic
- **useUserProfile.ts**: User profile page business logic

### 4. View Layer
**Path**: `src/components/` and `app/`

Handles UI rendering, layout, and styling:
- **Components**: Reusable UI components (e.g., ImageCarousel)
- **Pages**: Next.js page components (under app/ directory)

## Usage Guide

### New Feature Development

1. **API Requests**: Use Data Layer services
   ```typescript
   import { postService } from '@/src/data/services';
   const posts = await postService.getPosts();
   ```

2. **Business Logic**: Use Logic Layer Hooks
   ```typescript
   import { usePosts } from '@/src/logic/hooks';
   const { posts, loading, createPost } = usePosts();
   ```

3. **UI Components**: Only handle UI rendering in View Layer
   ```typescript
   // Components should only use hooks, not directly call APIs
   const { posts, loading } = usePosts();
   return <div>{/* UI rendering */}</div>;
   ```

### Backward Compatibility

For backward compatibility, the original `src/lib/api.ts` is still available, but new code should use the new layered architecture.

## Migration Guide

### Migrating from Old API to New Architecture

**Old Way**:
```typescript
import { getPosts, likePost } from '@/src/lib/api';
const posts = await getPosts();
await likePost(postId);
```

**New Way**:
```typescript
// Using Data Layer
import { postService } from '@/src/data/services';
const posts = await postService.getPosts();
await postService.likePost(postId);

// Or using Logic Layer Hook
import { usePosts } from '@/src/logic/hooks';
const { posts, toggleLike } = usePosts();
toggleLike(post);
```

## File Structure

```
src/
├── infrastructure/     # Infrastructure Layer
│   ├── auth.ts
│   ├── http-client.ts
│   └── error-handler.ts
├── data/              # Data Layer
│   └── services/
│       ├── post.service.ts
│       ├── comment.service.ts
│       ├── user.service.ts
│       ├── follow.service.ts
│       ├── event.service.ts
│       └── index.ts
├── logic/             # Logic Layer
│   └── hooks/
│       ├── useAuth.ts
│       ├── usePosts.ts
│       ├── useUser.ts
│       ├── useFollows.ts
│       ├── useSearch.ts
│       ├── useUserProfile.ts
│       └── index.ts
├── components/        # View Layer - Components
│   └── ImageCarousel.tsx
├── types/             # Type Definitions
│   ├── post.ts
│   └── user.ts
└── lib/               # Backward Compatibility Layer
    └── api.ts
```
