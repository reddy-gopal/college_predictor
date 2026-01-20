# API Optimization Report - Frequently Called Endpoints

This document lists all API endpoints that are being called repeatedly across the application, organized by frequency and pattern.

## 🔴 CRITICAL: Polling/Interval-Based Calls (Every 5 seconds)

These endpoints are called repeatedly via `setInterval` and should be optimized with caching or WebSocket connections.

### 1. **Room Submission Status** (Guild Results Page)
- **Endpoint**: `GET /mocktest/rooms/{code}/submission-status/`
- **File**: `frontend/src/app/guild/[code]/results/page.jsx`
- **Frequency**: Every 5 seconds
- **Lines**: 44-46
- **Purpose**: Check if all participants have submitted
- **Optimization**: 
  - Cache response for 2-3 seconds
  - Use WebSocket for real-time updates
  - Only poll if room status is ACTIVE

### 2. **Room Details & Participants** (Guild Lobby)
- **Endpoints**: 
  - `GET /mocktest/rooms/{code}/` (Room details)
  - `GET /mocktest/rooms/{code}/participants/` (Participants list)
- **File**: `frontend/src/app/guild/[code]/lobby/page.jsx`
- **Frequency**: Every 5 seconds
- **Lines**: 35-38
- **Purpose**: Update room status and participant list
- **Optimization**:
  - Cache room details (changes infrequently)
  - Only fetch participants if room status is WAITING
  - Use WebSocket for participant join/leave events

## 🟡 HIGH: Event-Triggered Calls (Visibility, Focus, XP Changes)

These endpoints are called on multiple events and can be optimized with debouncing and caching.

### 3. **User Test Attempts** (Dashboard)
- **Endpoint**: `GET /mocktest/test-attempts/`
- **File**: `frontend/src/components/home/DashboardHome.jsx`
- **Triggers**:
  - Component mount (line 49)
  - User XP changes (line 61) - with 1s delay
  - Page visibility change (line 68)
  - Window focus (line 85) - with 500ms delay
- **Frequency**: 4-5 times per user session
- **Optimization**:
  - Cache for 30-60 seconds
  - Debounce visibility/focus events
  - Only refresh if data is stale (>30s old)

### 4. **User Data Refresh** (AuthContext)
- **Endpoint**: `GET /api/auth/me/`
- **File**: `frontend/src/contexts/AuthContext.jsx`
- **Triggers**: 
  - Called by `refreshUser()` function
  - Triggered on visibility change (DashboardHome line 69)
  - Triggered on window focus (DashboardHome line 86)
- **Frequency**: 2-3 times per user session
- **Optimization**:
  - Cache user data for 60 seconds
  - Only refresh if XP/score changed
  - Use optimistic updates

### 5. **Today's Tasks** (Dashboard)
- **Endpoint**: `GET /mocktest/tasks/`
- **File**: `frontend/src/components/home/TodaysFocus.jsx`
- **Triggers**:
  - Component mount (line 15)
  - User XP changes (line 27) - with 1s delay
- **Frequency**: 2-3 times per user session
- **Optimization**:
  - Cache for 5 minutes (tasks don't change frequently)
  - Only refresh on explicit user action

### 6. **Activity Heatmap** (Profile)
- **Endpoint**: `GET /mocktest/profile/activity-heatmap/`
- **File**: `frontend/src/components/profile/ActivityHeatmap.jsx`
- **Triggers**:
  - Component mount (line 116)
  - View type change (line 121)
  - User XP changes (line 134) - with 1s delay
  - Page visibility change (line 139)
- **Frequency**: 3-4 times per profile view
- **Optimization**:
  - Cache for 5-10 minutes (historical data)
  - Only refresh on explicit user action
  - Debounce view type changes

## 🟢 MEDIUM: Component Mount Calls

These endpoints are called once per component mount but may be called multiple times if components remount.

### 7. **Daily Focus** (Dashboard)
- **Endpoints**:
  - `GET /mocktest/daily-focus/today/`
  - `GET /mocktest/daily-focus/monthly/`
- **File**: `frontend/src/components/home/DailyFocus.jsx`
- **Frequency**: Once per component mount
- **Lines**: 18-24
- **Optimization**:
  - Cache today's status for 1 hour
  - Cache monthly data for 24 hours
  - Only refresh on date change

### 8. **Gamification Summary** (Dashboard)
- **Endpoint**: `GET /mocktest/gamification/summary/`
- **File**: `frontend/src/components/home/GamificationSummary.jsx`
- **Frequency**: Once per component mount
- **Lines**: 10-12
- **Optimization**:
  - Cache for 30-60 seconds
  - Refresh on XP change events

### 9. **Rooms List** (Guild Page)
- **Endpoint**: `GET /mocktest/rooms/`
- **File**: `frontend/src/app/guild/page.jsx`
- **Frequency**: On filter change or component mount
- **Lines**: 44, 70
- **Optimization**:
  - Cache for 10-15 seconds
  - Use pagination for large lists
  - Only refresh on filter change

### 10. **Test Attempts** (Home Page)
- **Endpoint**: `GET /mocktest/test-attempts/`
- **File**: `frontend/src/app/page.jsx`
- **Frequency**: Once per page load (if user logged in)
- **Lines**: 26
- **Optimization**:
  - Cache for 30 seconds
  - Share cache with DashboardHome component

## 📊 Summary Statistics

### Most Frequently Called Endpoints:
1. **Room Submission Status** - Every 5 seconds (while waiting)
2. **Room Details & Participants** - Every 5 seconds (in lobby)
3. **User Test Attempts** - 4-5 times per session
4. **User Data** - 2-3 times per session
5. **Today's Tasks** - 2-3 times per session

### Recommended Optimization Strategies:

1. **Caching Layer**:
   - Implement Redis or in-memory cache for frequently accessed data
   - Cache durations:
     - Real-time data (submission status): 2-3 seconds
     - User data: 30-60 seconds
     - Historical data (heatmap, monthly): 5-10 minutes
     - Static data (tasks, gamification): 1-5 minutes

2. **Request Deduplication**:
   - Prevent multiple simultaneous requests to the same endpoint
   - Use request queuing for identical requests

3. **WebSocket/SSE**:
   - Replace polling for room status and participants
   - Real-time updates for submission status

4. **Debouncing**:
   - Debounce visibility/focus events (500ms-1s)
   - Debounce filter changes (300ms)

5. **Conditional Fetching**:
   - Only fetch if data is stale
   - Skip fetch if component is not visible
   - Only poll if room is in active state

## 🎯 Priority Optimization Targets

### Immediate (High Impact):
1. Room submission status polling → WebSocket or cache
2. Room details/participants polling → WebSocket or cache
3. User test attempts (multiple triggers) → Cache + debounce

### Short-term (Medium Impact):
4. User data refresh → Cache + conditional refresh
5. Today's tasks → Cache for 5 minutes
6. Activity heatmap → Cache for 10 minutes

### Long-term (Low Impact):
7. Component mount calls → Standard caching
8. Filter-based calls → Debounce + cache

## 📝 Implementation Notes

- All endpoints should implement ETag or Last-Modified headers
- Use HTTP 304 Not Modified responses when data hasn't changed
- Implement request deduplication at the API client level
- Consider using React Query or SWR for automatic caching and deduplication
- Add database query optimization (indexes, select_related, prefetch_related) for these endpoints

## 📋 Complete Endpoint List with URLs

### Polling Endpoints (setInterval)
| Endpoint | URL Pattern | Frequency | File Location |
|----------|-------------|-----------|---------------|
| Room Submission Status | `GET /mocktest/rooms/{code}/submission-status/` | Every 5s | `guild/[code]/results/page.jsx:44` |
| Room Details | `GET /mocktest/rooms/{code}/` | Every 5s | `guild/[code]/lobby/page.jsx:36` |
| Room Participants | `GET /mocktest/rooms/{code}/participants/` | Every 5s | `guild/[code]/lobby/page.jsx:37` |

### Event-Triggered Endpoints (visibility/focus/XP)
| Endpoint | URL Pattern | Triggers | File Location |
|----------|-------------|----------|---------------|
| User Test Attempts | `GET /mocktest/test-attempts/` | Mount, XP change, visibility, focus | `components/home/DashboardHome.jsx:27` |
| User Data | `GET /api/auth/me/` | Visibility, focus | `contexts/AuthContext.jsx` (via refreshUser) |
| Today's Tasks | `GET /mocktest/tasks/` | Mount, XP change | `components/home/TodaysFocus.jsx:37` |
| Activity Heatmap | `GET /mocktest/profile/activity-heatmap/` | Mount, view change, XP change, visibility | `components/profile/ActivityHeatmap.jsx` |

### Component Mount Endpoints
| Endpoint | URL Pattern | Frequency | File Location |
|----------|-------------|-----------|---------------|
| Daily Focus Today | `GET /mocktest/daily-focus/today/` | Once per mount | `components/home/DailyFocus.jsx:19` |
| Daily Focus Monthly | `GET /mocktest/daily-focus/monthly/` | Once per mount | `components/home/DailyFocus.jsx:20` |
| Gamification Summary | `GET /mocktest/gamification/summary/` | Once per mount | `components/home/GamificationSummary.jsx:17` |
| Rooms List | `GET /mocktest/rooms/` | On filter change | `app/guild/page.jsx:70` |
| Test Attempts (Home) | `GET /mocktest/test-attempts/` | Once per page load | `app/page.jsx:26` |

### Profile Page Endpoints
| Endpoint | URL Pattern | Frequency | File Location |
|----------|-------------|-----------|---------------|
| Profile Overview | `GET /mocktest/profile/overview/` | Once per mount | `app/profile/page.jsx` |
| Profile Badges | `GET /mocktest/profile/badges/` | Once per mount | `app/profile/page.jsx` |
| Profile Analytics | `GET /mocktest/profile/analytics/` | Once per mount | `app/profile/page.jsx` |

### User Action Endpoints (Less Critical)
| Endpoint | URL Pattern | Trigger | File Location |
|----------|-------------|---------|---------------|
| Room Questions | `GET /mocktest/rooms/{code}/questions/` | On test start | `guild/[code]/test/page.jsx:62` |
| Room Leaderboard | `GET /mocktest/rooms/{code}/leaderboard/` | On results view | `guild/[code]/results/page.jsx:76` |
| Room Review | `GET /mocktest/rooms/{code}/review/` | On review button click | `guild/[code]/results/page.jsx:145` |
| Mistakes | `GET /mocktest/mistake-notebook/` | On page load | `app/mistake-notebook/page.jsx:29` |

## 🔍 Backend Query Optimization Checklist

For each endpoint listed above, ensure:

- [ ] Database indexes on foreign keys and frequently filtered columns
- [ ] `select_related()` for ForeignKey relationships
- [ ] `prefetch_related()` for ManyToMany and reverse ForeignKey relationships
- [ ] `only()` or `defer()` to limit fields fetched
- [ ] Pagination for list endpoints
- [ ] Query result caching (Redis/Memcached)
- [ ] Response caching headers (Cache-Control, ETag)
- [ ] Database query logging to identify N+1 queries

