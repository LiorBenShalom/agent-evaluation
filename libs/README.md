# libs

This folder contains shared NestJS libraries used across apps in this monorepo.

Libraries differ from the `shared/` folder in that they are fully integrated with the NestJS module system — each library exports a module, providers, and types that apps can import via a typed path alias (`@app/<name>`).

Use `shared/` for plain TypeScript utilities. Use `libs/` for anything that needs to participate in NestJS dependency injection.

## Adding a new library

```bash
nest g library <name>
```

This will:
- Create `libs/<name>/src/` with a module, service, and barrel `index.ts`
- Register the library in `nest-cli.json`
- Add the path alias `@app/<name>` to `tsconfig.json`

## Importing a library in an app

```typescript
import { MyLibModule } from '@app/my-lib';
```

Add the library's module to the `imports` array of the consuming app's root module.
