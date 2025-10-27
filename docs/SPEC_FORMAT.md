# Spec Format Documentation

BuildMate Studio uses YAML-based specifications to describe applications. This document explains how to write specs that BuildMate can understand and generate code from.

## Basic Structure

Every spec must include these core fields:

```yaml
name: Your App Name
type: app_type
description: Brief description of what the app does
design_system: design_system_name
framework: react
```

## App Types

BuildMate supports several app types, each with specific features:

### Dashboard
Used for admin panels, analytics dashboards, and data visualization apps.

```yaml
type: dashboard
features:
  - data_tables
  - charts
  - filters
  - real_time_updates
```

### Landing Page
Used for marketing sites, product launches, and promotional pages.

```yaml
type: landing_page
sections:
  - hero
  - features
  - pricing
  - testimonials
  - cta
```

### E-commerce
Used for online stores and marketplaces.

```yaml
type: ecommerce
features:
  - product_catalog
  - shopping_cart
  - checkout
  - payment_integration
```

### SaaS Application
Used for subscription-based software products.

```yaml
type: saas
features:
  - user_authentication
  - subscription_management
  - user_dashboard
  - settings
```

## Features Specification

Define the functionality of your app with the `features` section:

```yaml
features:
  - user_authentication:
      providers:
        - email
        - google
        - github
      features:
        - password_reset
        - email_verification
        - two_factor_auth
  
  - data_management:
      crud: true
      entities:
        - users
        - posts
        - comments
      
  - real_time:
      enabled: true
      features:
        - notifications
        - live_updates
        - presence
```

## Design System Integration

BuildMate automatically fetches design tokens from DesignMate Studio:

```yaml
design_system: employse  # References Employse design system

# BuildMate will:
# 1. Query DesignMate API for 'employse' tokens
# 2. Generate token references in code
# 3. Ensure design consistency
```

### Custom Styling (Optional)

Override default styling when needed:

```yaml
styling:
  theme:
    mode: light  # or dark, or both
    accent_color: custom-primary
  typography:
    headings: font-display
    body: font-sans
  spacing: comfortable  # compact, comfortable, or spacious
```

## Pages and Routes

Define your app's navigation structure:

```yaml
pages:
  - name: Home
    route: /
    components:
      - Hero
      - Features
      - CTA
    
  - name: Dashboard
    route: /dashboard
    protected: true  # Requires authentication
    components:
      - Stats
      - ActivityFeed
      - QuickActions
    
  - name: Settings
    route: /settings
    protected: true
    components:
      - ProfileSettings
      - PreferencesForm
      - DangerZone
```

## Components

Specify custom components with their properties:

```yaml
components:
  - name: UserList
    type: data_table
    props:
      columns:
        - name
        - email
        - role
        - status
      sortable: true
      searchable: true
      pagination: true
      
  - name: ShiftCalendar
    type: calendar
    props:
      views: [day, week, month]
      drag_and_drop: true
      color_coding: by_employee
```

## API Endpoints

Define backend API structure:

```yaml
api_endpoints:
  - path: /api/users
    methods: [GET, POST, PUT, DELETE]
    authentication: required
    
  - path: /api/public/stats
    methods: [GET]
    authentication: optional
    cache: 5m
```

## Database Schema

Specify data models:

```yaml
database: supabase  # or postgres, mysql, mongodb

models:
  - name: User
    fields:
      - name: id
        type: uuid
        primary_key: true
      - name: email
        type: string
        unique: true
      - name: name
        type: string
      - name: role
        type: enum
        values: [admin, user, guest]
    
  - name: Post
    fields:
      - name: id
        type: uuid
        primary_key: true
      - name: title
        type: string
      - name: content
        type: text
      - name: author_id
        type: uuid
        foreign_key: users.id
      - name: created_at
        type: timestamp
```

## Authentication

Configure authentication and authorization:

```yaml
authentication: true
auth_providers:
  - email
  - google
  - github

authorization:
  roles:
    - admin:
        permissions: [all]
    - user:
        permissions: [read, write_own]
    - guest:
        permissions: [read]
```

## Third-Party Integrations

Specify external services:

```yaml
integrations:
  - stripe:
      for: payments
      plans:
        - free
        - premium
        - enterprise
  
  - sendgrid:
      for: email
      templates:
        - welcome
        - password_reset
        - notifications
  
  - analytics:
      provider: google_analytics
      tracking_id: GA-XXXXX
```

## Performance Optimization

Configure performance features:

```yaml
performance:
  lazy_loading: true
  image_optimization: true
  code_splitting: true
  caching:
    strategy: swr  # stale-while-revalidate
    duration: 5m
```

## SEO Configuration

Optimize for search engines:

```yaml
seo:
  title: "App Title - Tagline"
  description: "App description for search results"
  keywords:
    - keyword1
    - keyword2
  og_image: og-image.png
  twitter_card: summary_large_image
```

## Deployment

Specify deployment configuration:

```yaml
deployment:
  platform: vercel  # or netlify, aws, replit
  domain: myapp.com
  environment:
    - name: DATABASE_URL
      required: true
      secret: true
    - name: API_KEY
      required: true
      secret: true
    - name: PUBLIC_URL
      required: false
```

## Complete Example

Here's a complete spec for a task management app:

```yaml
name: TaskFlow
type: saas
description: Team task management with real-time collaboration

design_system: taskflow
framework: react
ui_library: shadcn/ui
database: supabase

features:
  - user_authentication:
      providers: [email, google]
      features:
        - password_reset
        - email_verification
  
  - task_management:
      crud: true
      fields:
        - title
        - description
        - status
        - priority
        - assignee
        - due_date
  
  - real_time:
      enabled: true
      features:
        - live_updates
        - notifications

pages:
  - name: Dashboard
    route: /
    protected: true
    components:
      - TaskList
      - TaskStats
      - ActivityFeed
  
  - name: Project
    route: /projects/:id
    protected: true
    components:
      - ProjectHeader
      - TaskBoard
      - TeamMembers

api_endpoints:
  - path: /api/tasks
    methods: [GET, POST, PUT, DELETE]
    authentication: required
  
  - path: /api/projects
    methods: [GET, POST, PUT, DELETE]
    authentication: required

deployment:
  platform: vercel
  domain: taskflow.app
  environment:
    - name: DATABASE_URL
      required: true
      secret: true
    - name: SUPABASE_ANON_KEY
      required: true
      secret: true
```

## Tips for Writing Good Specs

1. **Be Specific**: Clearly describe what you want instead of being vague
2. **Use Examples**: Reference similar apps or provide mockups
3. **Start Simple**: Begin with core features, add complexity later
4. **Reference Design System**: Always specify a design system for consistency
5. **Think About Users**: Consider user flows and journeys
6. **Plan for Scale**: Think about performance and data volume
7. **Security First**: Always include authentication for sensitive data

## Validation

BuildMate validates specs before generation:

- ✅ Required fields present
- ✅ Valid app type
- ✅ Design system exists in DesignMate
- ✅ Valid routes and component names
- ✅ Database schema consistency
- ✅ API endpoint validity

If validation fails, BuildMate provides helpful error messages to fix the spec.

## Next Steps

- See [Design Integration](./DESIGN_INTEGRATION.md) for design token usage
- See [API Reference](./API.md) for programmatic spec generation
- Check [examples/](../examples/) for more complete specs
