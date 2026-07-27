# Forum/Discussion Thread UI Implementation

This document describes the learner-facing forum UI implementation for Brain-Storm, enabling course discussions with moderation and notification integration.

## Overview

The forum system allows learners and instructors to:
- Create discussion threads with markdown support
- Reply to threads with nested discussions
- Mark answers (instructor/admin only)
- Flag inappropriate content
- Receive notifications for replies and mentions
- Pin important threads (instructor/admin only)

## Architecture

### Components Structure

```
components/forum/
├── ThreadList.tsx          # Paginated thread list with lazy loading
├── ThreadDetail.tsx        # Full thread view with replies
├── ReplyItem.tsx          # Individual reply component
├── MarkdownEditor.tsx     # Markdown editor with preview
└── CreateThreadModal.tsx  # Modal for creating new threads
```

### Hooks

```
hooks/
└── useForum.ts            # All forum-related data fetching hooks
```

### API Client

```
lib/
└── forumApi.ts            # Forum API methods
```

### Pages

```
app/courses/[id]/forum/
├── page.tsx               # Forum list page
└── [postId]/page.tsx      # Thread detail page
```

## Features

### 1. Thread List with Pagination & Lazy Loading

**File**: `components/forum/ThreadList.tsx`

- Displays pinned posts in a separate section
- Shows recent posts below
- Infinite scroll with "Load More" button
- Lazy loading for performance
- Skeleton loading states
- Empty state handling

```tsx
<ThreadList courseId={courseId} />
```

**Props**:
- `courseId` (string): The course ID
- `onThreadClick?` (function): Callback when thread is clicked

### 2. Thread Detail View

**File**: `components/forum/ThreadDetail.tsx`

- Full thread with original post
- Accepted answer highlighted separately
- List of other replies
- Reply composer with markdown support
- Moderation actions (flag, delete)

```tsx
<ThreadDetail
  post={post}
  replies={replies}
  courseId={courseId}
  canMarkAsAnswer={isInstructor}
  onReplyCreated={refreshThread}
/>
```

**Props**:
- `post` (Post): The forum post/thread
- `replies` (Reply[]): List of replies
- `courseId` (string): Course ID
- `onReplyCreated?` (function): Callback when reply created
- `canMarkAsAnswer?` (boolean): Permission to mark answers

### 3. Markdown Editor

**File**: `components/forum/MarkdownEditor.tsx`

Features:
- Live markdown preview toggle
- Quick formatting buttons (bold, italic, code, lists, quotes, links)
- Character count
- Textarea with focus states

```tsx
<MarkdownEditor
  value={content}
  onChange={setContent}
  placeholder="Write your message..."
  minHeight={200}
/>
```

**Toolbar Actions**:
- **B**: Bold (**text**)
- **I**: Italic (_text_)
- **<>**: Code (`text`)
- **•**: List (- item)
- **"**: Quote (> text)
- **🔗**: Link ([text](url))

### 4. Create Thread Modal

**File**: `components/forum/CreateThreadModal.tsx`

- Modal dialog for new thread creation
- Title input (max 200 chars)
- Content editor with markdown support
- Community guidelines tips
- Form validation

```tsx
<CreateThreadModal
  courseId={courseId}
  isOpen={isOpen}
  onClose={handleClose}
  onThreadCreated={refresh}
/>
```

### 5. Reply Item

**File**: `components/forum/ReplyItem.tsx`

- Displays individual reply
- Shows author avatar and info
- Markdown content rendering
- Moderation options menu (flag, delete, mark as answer)
- Answer badge highlighting
- Author-only delete action
- Non-author flag action

## Data Models

### Post
```typescript
interface Post {
  id: string;
  courseId: string;
  title: string;
  content: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
  isPinned: boolean;
  answerReplyId?: string | null;
  replyCount?: number;
  createdAt: string;
}
```

### Reply
```typescript
interface Reply {
  id: string;
  postId: string;
  content: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
  isAnswer: boolean;
  createdAt: string;
}
```

## Hooks

### useForumPosts
Fetches paginated list of posts for a course
```typescript
const { posts, total, hasMore, isLoading, error, mutate } = useForumPosts(courseId, page);
```

### useForumPost
Fetches single post with replies
```typescript
const { post, isLoading, error, mutate } = useForumPost(postId);
```

### useCreatePost
Creates new forum post
```typescript
const { createPost, isLoading, error } = useCreatePost(courseId);
await createPost(title, content, isPinned);
```

### useCreateReply
Creates reply to post
```typescript
const { createReply, isLoading, error } = useCreateReply(postId);
await createReply(content, isAnswer);
```

### useMarkAsAnswer
Marks reply as accepted answer (instructor/admin only)
```typescript
const { markAsAnswer, isLoading, error } = useMarkAsAnswer();
await markAsAnswer(replyId);
```

### useDeletePost
Deletes forum post (author/admin only)
```typescript
const { deletePost, isLoading, error } = useDeletePost();
await deletePost(postId);
```

### useDeleteReply
Deletes reply (author/admin only)
```typescript
const { deleteReply, isLoading, error } = useDeleteReply();
await deleteReply(replyId);
```

### useFlagContent
Flags content for moderation review
```typescript
const { flagContent, isLoading, error } = useFlagContent();
await flagContent('post' | 'reply', contentId, reason);
```

## API Endpoints

**GET /courses/:id/posts** - Get paginated posts
- Query params: `page`, `limit`
- Returns: `{ data: Post[], total, page, limit, hasMore }`

**GET /posts/:id** - Get single post with replies
- Returns: `PostWithReplies`

**POST /courses/:id/posts** - Create new post
- Body: `{ title, content, isPinned? }`
- Returns: `Post`

**POST /posts/:id/replies** - Create reply
- Body: `{ content, isAnswer? }`
- Returns: `Reply`

**POST /replies/:id/mark-answer** - Mark as accepted answer
- Returns: `Reply`

**POST /moderation/flag** - Flag content
- Body: `{ contentType, contentId, reason? }`
- Returns: Moderation item

**DELETE /posts/:id** - Delete post (author/admin)
- Returns: 204 No Content

**DELETE /replies/:id** - Delete reply (author/admin)
- Returns: 204 No Content

## Permission System

### Role-Based Actions

| Action | Student | Instructor | Admin |
|--------|---------|-----------|-------|
| Create Post | ✓ | ✓ | ✓ |
| Create Reply | ✓ | ✓ | ✓ |
| Mark as Answer | ✗ | ✓ | ✓ |
| Pin Post | ✗ | ✓ | ✓ |
| Delete Own Post | ✓ | ✓ | ✓ |
| Delete Own Reply | ✓ | ✓ | ✓ |
| Delete Any Post | ✗ | ✗ | ✓ |
| Delete Any Reply | ✗ | ✗ | ✓ |
| Flag Content | ✓ | ✓ | ✓ |

### Checking Permissions in Components
```typescript
const user = useAuthStore(s => s.user);
const canMarkAsAnswer = user?.role === 'instructor' || user?.role === 'admin';
const isAuthor = user?.id === post.userId;
```

## Notifications Integration

When replies are created or mentioned, the notification system triggers:

```typescript
// Backend automatically sends notifications via NotificationGateway
// Frontend listens to real-time events
const { notifications } = useNotifications();

// Example notification structure:
{
  type: 'REPLY_CREATED',
  message: 'Alice replied to your post',
  threadId: 'post-123',
  link: '/courses/course-1/forum/post-123'
}
```

## Content Moderation

### Auto-Moderation (Backend)
- AWS Comprehend analyzes all posts and replies
- Flags content as pending, approved, or rejected
- Toxicity score tracked

### User Flagging
- Users can flag inappropriate content
- Flag reason collected
- Admin review queue processes flags

### Admin Actions
- Approve/reject flagged content
- Handle appeals
- Delete violating content

## Testing

### Component Tests
```bash
npm test -- ThreadList.test.tsx
npm test -- ReplyItem.test.tsx
```

**Coverage**:
- Thread list rendering and pagination
- Reply display and formatting
- Moderation actions
- Permission-based UI visibility
- Error states and loading states

### E2E Tests
```bash
npm run test:e2e
```

**Scenarios**:
- Create discussion thread
- Reply to thread
- Mark as answer
- Flag inappropriate content
- Edit and delete posts
- User role permissions
- Notification delivery

## Styling

The forum UI uses Tailwind CSS with:
- Responsive design (mobile-first)
- Dark mode support via next-themes
- Accessibility compliance (WCAG 2.1 AA)
- Consistent component patterns

### Color Scheme
- Primary: Blue-600 (interactive elements)
- Success: Green-100/700 (answers)
- Warning: Orange-600 (flags)
- Destructive: Red-600 (delete)
- Neutral: Gray palette (text/backgrounds)

## Performance Optimizations

1. **Pagination**: Load posts in chunks (default 10 per page)
2. **Lazy Loading**: Infinite scroll with "Load More" button
3. **SWR Caching**: 5-second deduping interval, revalidate on focus disabled
4. **Markdown Preview**: Toggle instead of always rendering
5. **Image Optimization**: Avatar images lazy-loaded
6. **Skeleton Loading**: Show placeholders while loading

## Security Considerations

1. **Content Sanitization**: Backend strips HTML, sanitizes input
2. **XSS Prevention**: React markdown with markdown-it and HTML escaping
3. **CSRF Protection**: API client includes JWT tokens
4. **Permission Checks**: Role-based access control enforced
5. **Input Validation**: Client-side validation + server validation
6. **Rate Limiting**: Backend throttles post/reply creation

## Future Enhancements

1. **Voting System**: Upvote/downvote replies (like StackOverflow)
2. **Full-Text Search**: Search threads and replies
3. **Mention System**: @username mentions with notifications
4. **Tags/Categories**: Organize discussions by topic
5. **Rich Formatting**: Code syntax highlighting, embedded media
6. **Threaded Replies**: Nested reply threads
7. **Reactions**: Emoji reactions on posts/replies
8. **Bookmarks**: Save discussions for later
9. **Reputation System**: Points for helpful answers
10. **Moderation Dashboard**: Admin panel for managing flags

## Troubleshooting

### Posts not loading
- Check API connectivity
- Verify course ID is correct
- Check browser console for errors
- Verify authentication token

### Markdown not rendering
- Ensure content is valid markdown
- Check for HTML injection attempts
- Verify react-markdown is installed

### Permissions not working
- Verify user role from auth store
- Check role values match backend enum
- Clear browser cache if recently changed

### Notifications not arriving
- Verify socket.io connection
- Check notification preferences
- Verify user is subscribed to channel
- Check WebSocket console in DevTools

## References

- [Markdown Guide](https://www.markdownguide.org/)
- [React Markdown Docs](https://github.com/remarkjs/react-markdown)
- [SWR Documentation](https://swr.vercel.app/)
- [Tailwind CSS](https://tailwindcss.com/)
- [NextJS File-based Routing](https://nextjs.org/docs/app/building-your-application/routing)
