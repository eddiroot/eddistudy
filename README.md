## ShadCN

`npx shadcn-svelte@latest add component-name-here`

## Developing

Once you've installed dependencies with `npm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

If you make breaking changes to the db:

```
docker compose down --volumes
docker compose up --detach
npm run db:push
npm run db:seed
npm run dev
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
