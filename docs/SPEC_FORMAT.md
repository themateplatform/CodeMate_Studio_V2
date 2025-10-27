# Spec Format Documentation

BuildMate Studio uses YAML-based specification files to define application requirements. These specs are parsed by the AI generation engine to produce production-ready code.

## Basic Structure

```yaml
name: Application Name
type: app_type
description: Brief description of the application
features: []
design_system: system_name
framework: react
database: database_provider
```

## Supported App Types

### Dashboard
For admin panels, management interfaces, and data visualization apps.

```yaml
type: dashboard
features:
  - data_grid
  - charts
  - filters
  - export
```

### Landing Page
For marketing sites, product pages, and promotional content.

```yaml
type: landing_page
sections:
  - hero
  - features
  - testimonials
  - pricing
  - cta
```

### SaaS Application
For full-featured web applications with authentication and database.

```yaml
type: saas
features:
  - authentication
  - user_dashboard
  - settings
  - billing
  - notifications
```

## Common Properties

### name (required)
The display name of your application.
```yaml
name: My Awesome App
```

### type (required)
The type of application to generate. Supported types:
- `dashboard`
- `landing_page`
- `saas`
- `e-commerce`
- `blog`
- `portfolio`

### description (optional)
A brief description of what the app does.
```yaml
description: Employee management system with shift scheduling
```

### features (optional)
List of features to include in the application.
```yaml
features:
  - authentication
  - user_management
  - real_time_updates
  - notifications
```

### design_system (optional)
Name of the design system to use from DesignMate Studio.
```yaml
design_system: employse
```

### framework (optional, default: react)
Frontend framework to use.
```yaml
framework: react
```

### database (optional, default: supabase)
Database provider to use.
```yaml
database: supabase
```

### authentication (optional, default: false)
Whether to include authentication.
```yaml
authentication: true
```

### responsive (optional, default: true)
Whether to make the app responsive.
```yaml
responsive: mobile-first
```

## Advanced Features

### Custom Styling
Override design tokens or add custom styles.

```yaml
styling:
  theme: dark
  primary_color: var(--custom-primary)
  font_family: Inter
```

### API Integration
Define external API endpoints to integrate.

```yaml
integrations:
  - name: stripe
    type: payment
  - name: sendgrid
    type: email
```

### Routes
Define custom routes for your application.

```yaml
routes:
  - path: /dashboard
    component: Dashboard
  - path: /settings
    component: Settings
```

## Example Specs

### Dashboard Example
```yaml
name: Employse Dashboard
type: dashboard
description: Employee management dashboard with scheduling
features:
  - employee_list
  - shift_calendar
  - notifications
  - reports
design_system: employse
framework: react
database: supabase
authentication: true
responsive: true
```

### Landing Page Example
```yaml
name: Product Landing
type: landing_page
description: Marketing page for SaaS product
sections:
  - hero
  - features
  - pricing
  - testimonials
  - cta
design_system: hottr
animations: true
responsive: mobile-first
seo: true
```

## Validation

BuildMate validates your spec before generation:
- Required fields must be present
- Type must be valid
- Features must be supported
- Design system must exist in DesignMate (if specified)

## Tips

1. **Start simple**: Begin with minimal specs and add features incrementally
2. **Use design systems**: Leverage DesignMate for consistent styling
3. **Be specific**: More detailed specs produce better results
4. **Test incrementally**: Generate and test small features first

## Next Steps

- [Design Integration](./DESIGN_INTEGRATION.md) - Connect to DesignMate Studio
- [Deployment](./DEPLOYMENT.md) - Deploy your generated app
- [API Reference](./API.md) - Use BuildMate programmatically
