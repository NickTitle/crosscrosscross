# crosscrosscross

## UI tests

Install dependencies:

```sh
npm install
npx playwright install chromium
```

`npm install` also points Git at the repo-local hooks in `.githooks`. To set them manually:

```sh
npm run setup-hooks
```

Run the baseline UI suite:

```sh
npm test
```

Update screenshot baselines after intentional UI changes:

```sh
npm run test:update-snapshots
```

The `pre-push` hook runs `npm test` before local pushes. The same suite also runs in GitHub Actions on pushes to `main` and on pull requests.
