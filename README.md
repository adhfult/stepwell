# stepwell

Helps students connect careers to programs and colleges using official U.S. data.
A free web app: interests, careers, programs, colleges, scholarships and a saved
plan, with no ads and no selling of student data. Built with Next.js, Supabase and
TypeScript.

## Run it
```bash
cp .env.example .env.local   # then fill in your Supabase URL and key
npm install
npm run dev                   # http://localhost:3000
```

## Check it
```bash
npm run check                 # lint + typecheck + tests
```

## Where things are
- `docs/PRODUCT.md`: what this is, who it's for, what it isn't
- `docs/ARCHITECTURE.md`: how it's built
- `docs/SECURITY.md`: project-specific security rules
- `docs/design/DESIGN.md`: colors, type, spacing
- `docs/specs/`, `docs/decisions/`: feature specs and decision records
- `AGENTS.md`: instructions for AI coding agents

## Data sources
Government data is copied into our own tables by scheduled jobs, never fetched
per page view. Career data is from the O*NET Database by the U.S. Department
of Labor, Employment and Training Administration (USDOL/ETA), used under the
[CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/); Stepwell shows
a selection of it. O*NET is a trademark of USDOL/ETA. College data is from the
College Scorecard and EADA (U.S. Department of Education); more in
`docs/DATA_SOURCES.md`.

## Security
Report vulnerabilities privately through the repository's Security tab
("Report a vulnerability"), not in a public issue. See `.github/SECURITY.md`.

## License
[GNU AGPL-3.0](LICENSE). If you run a modified copy as a public website, you
must offer its source code to the people using it.
