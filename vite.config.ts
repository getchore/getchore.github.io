import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const INSTALLERS = ['install.sh', 'install.ps1']

/**
 * The install one-liners point at this site, so the scripts have to ship with
 * it -- but they live in the chore repo, where CI lints them and where they
 * are versioned with the thing they install. Keeping a copy here would be a
 * second source of truth for the one file that must never be wrong.
 *
 * So: a side-by-side checkout if there is one, otherwise fetched from the
 * chore repo at build time. Either way the build fails rather than deploying
 * a site whose headline command 404s.
 */
function installers(): Plugin {
  const RAW = 'https://raw.githubusercontent.com/getchore/chore/main/installers'

  return {
    name: 'installers',
    apply: 'build',
    async closeBundle() {
      for (const name of INSTALLERS) {
        const local = here(`../chore/installers/${name}`)
        let text: string
        let from: string

        if (existsSync(local) && statSync(local).size > 0) {
          text = readFileSync(local, 'utf8')
          from = 'checkout'
        } else {
          const res = await fetch(`${RAW}/${name}`)
          if (!res.ok) {
            this.error(`cannot fetch ${name} from the chore repo (${res.status}) -- the install command would 404`)
          }
          text = await res.text()
          from = 'chore repo'
        }

        if (!text.trim()) {
          this.error(`${name} came back empty -- refusing to publish an empty installer`)
        }
        writeFileSync(here(`./dist/${name}`), text)
        console.log(`  installers  dist/${name}  ${(text.length / 1024).toFixed(1)} kB  (${from})`)
      }
    },
  }
}

/**
 * The language reference is generated, never written. `chore spec` emits the
 * whole language as JSON -- builtins with their flags, variables, syntax,
 * and the rules that surprise people -- and a test in the crate asserts every
 * builtin appears in it exactly once. Rendering the site from that is the only
 * way the reference cannot drift from the binary, and it has drifted before.
 *
 * The committed `src/spec.json` is a snapshot so the site builds for someone
 * who does not have chore installed. When a chore IS available the snapshot is
 * refreshed from it; when it is not, the build warns loudly and uses whatever
 * was committed, which may be older than the release the page describes.
 */
function spec(): Plugin {
  const snapshot = here('./src/spec.json')
  const candidates = [
    process.env.CHORE_BIN,
    // A side-by-side checkout of the chore repo, for working on both at once.
    here('../chore/target/release/chore'),
    here('../chore/target/debug/chore'),
    'chore',
  ].filter(Boolean) as string[]

  return {
    name: 'spec',
    buildStart() {
      const committed = existsSync(snapshot) ? readFileSync(snapshot, 'utf8') : ''
      const have = committed ? JSON.parse(committed).version : '0.0.0'

      for (const bin of candidates) {
        let json: string
        let version: string
        try {
          json = execFileSync(bin, ['spec'], { encoding: 'utf8' })
          version = JSON.parse(json).version
        } catch {
          continue // Not this one; try the next.
        }
        // An older chore on PATH must not rewrite a newer reference. A stale
        // binary is exactly how the page would come to describe a language
        // that no longer matches the release it links to.
        if (older(version, have)) {
          this.warn(
            `${bin} is chore ${version}, older than the committed reference (${have}); ` +
              'keeping the newer one. Set CHORE_BIN to the binary you meant.',
          )
          return
        }
        if (json !== committed) {
          writeFileSync(snapshot, json)
          console.log(`  spec        regenerated from ${bin} (chore ${version})`)
        } else {
          console.log(`  spec        up to date with ${bin} (chore ${version})`)
        }
        return
      }
      if (!existsSync(snapshot)) {
        this.error('no chore binary and no committed src/spec.json -- the reference would be empty')
      }
      this.warn(
        `no chore binary found, so the reference is the committed snapshot of chore ${have}. ` +
          'Install chore, or set CHORE_BIN, to regenerate it.',
      )
    },
  }
}


/** `a` is an older release than `b`, comparing major.minor.patch numerically. */
function older(a: string, b: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const [x, y] = [parse(a), parse(b)]
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] < y[i]
  }
  return false
}


/**
 * `/llms.txt` and `/llms-full.txt`, the convention from llmstxt.org: a short
 * index an agent can find, and one file holding everything so it needs a
 * single fetch rather than a crawl.
 *
 * Both are generated from the same `chore spec` output the reference page
 * renders, and from docs/SPEC.md, so there is no third copy of the language to
 * keep in step. Markdown because that is what the convention says and what
 * models read best; `/spec.json` ships alongside for anything programmatic.
 */
function llms(): Plugin {
  const site = 'https://getchore.github.io'

  return {
    name: 'llms',
    apply: 'build',
    closeBundle() {
      const spec = JSON.parse(readFileSync(here('./src/spec.json'), 'utf8'))
      const url = (p: string) => `${site}${p}`

      const index = [
        '# chore',
        '',
        `> A single static binary that runs project tasks from a \`chorefile\`. It never`,
        `> spawns a shell: tasks run through its own POSIX-sh-subset interpreter, so a`,
        `> chorefile behaves identically on macOS, Linux and Windows. Version ${spec.version}.`,
        '',
        'Two things are worth knowing before reading anything else: a quoted word is',
        'always one argument while an unquoted `$var` splits on whitespace, and a task',
        'runs once per invocation keyed on its name *and* its arguments.',
        '',
        '## Docs',
        '',
        `- [Language reference](${url('/reference')}): every builtin, variable, syntax form and rule, rendered from the binary's own output`,
        `- [Full text](${url('/llms-full.txt')}): the whole reference inlined, for one-fetch reading`,
        `- [spec.json](${url('/spec.json')}): the same reference as typed JSON, for tools`,
        `- [SPEC.md](https://github.com/getchore/chore/blob/main/docs/SPEC.md): the language specification, with the reasoning`,
        `- [README](https://github.com/getchore/chore): what it is and how to install it`,
        '',
        '## Optional',
        '',
        `- [Releases](https://github.com/getchore/chore/releases): prebuilt binaries for macOS, Linux and Windows`,
        `- [RELEASING.md](https://github.com/getchore/chore/blob/main/docs/RELEASING.md): how a release is cut`,
        '',
        'If you have a shell you need none of this: `chore spec` prints that JSON and',
        '`chore help <builtin>` prints one entry, offline and versioned with the binary',
        'you actually have.',
        '',
      ].join('\n')

      const section = (title: string, body: string[]) => ['', `## ${title}`, '', ...body].join('\n')
      const full: string[] = [
        `# chore ${spec.version} — language reference`,
        '',
        'Generated from `chore spec`. Everything below is the language as the binary',
        'implements it, not a description of it.',
      ]

      full.push(
        section(
          'Files',
          spec.files.map(
            (f: { name: string; examples: string; meaning: string }) =>
              `- **${f.name}** (${f.examples.split('  ').map((e: string) => `\`${e}\``).join(', ')}): ${f.meaning}`,
          ),
        ),
        section(
          'Rules that surprise people',
          spec.rules.map((r: { name: string; rule: string }) => `- **${r.name}**: ${r.rule}`),
        ),
      )
      full.push(
        section(
          'Builtins',
          spec.builtins.flatMap((b: any) => [
            `### ${b.name}`,
            '',
            '```',
            b.usage,
            '```',
            '',
            `${b.summary}. ${b.effects ? 'Has effects, so `--dry` skips it.' : 'Read-only, so `--dry` still runs it.'}`,
            '',
            b.description,
            ...(b.flags.length
              ? ['', ...b.flags.map((f: any) => `- \`${f.name}${f.argument ? ' ' + f.argument : ''}\` (default: ${f.default}) — ${f.meaning}`)]
              : []),
            '',
          ]),
        ),
      )
      full.push(
        section(
          'Variables',
          spec.variables.map((v: any) => `- \`$${v.name}\` — ${v.values}. ${v.meaning} (${v.scope}-scoped)`),
        ),
      )
      full.push(
        section(
          'Syntax',
          spec.syntax.flatMap((f: any) => [`### ${f.name}`, '', '```sh', f.syntax, f.example, '```', '', f.meaning, '']),
        ),
      )
      full.push(
        section('Conditions', spec.conditions.map((c: any) => `- \`${c.syntax}\` — ${c.meaning}`)),
        section('Chaining', spec.chaining.map((c: any) => `- \`${c.symbol}\` — ${c.meaning}`)),
        section('Resolution', spec.resolution.map((r: any) => `- **${r.name}**: ${r.rule}`)),
        section(
          'Reserved',
          [
            `Task names that cannot be used, because they are subcommands: ${spec.reserved_tasks.map((t: string) => `\`${t}\``).join(', ')}.`,
            '',
            `An \`include ... as ns\` namespaces its tasks with \`${spec.namespace_separator}\`.`,
          ],
        ),
      )

      for (const [name, text] of [
        ['llms.txt', index],
        ['llms-full.txt', full.join('\n') + '\n'],
      ] as const) {
        writeFileSync(here(`./dist/${name}`), text)
        console.log(`  llms        dist/${name}  ${(statSync(here(`./dist/${name}`)).size / 1024).toFixed(1)} kB`)
      }

      // A real file at /reference, not just the SPA fallback. Pages answers an
      // unknown path with 404.html and a 404 status -- the page renders, but
      // anything that reads the status (a link checker, a fetch tool, an
      // agent) is told the page does not exist.
      mkdirSync(here('./dist/reference'), { recursive: true })
      copyFileSync(here('./dist/index.html'), here('./dist/reference/index.html'))
      console.log('  llms        dist/reference/index.html')

      copyFileSync(here('./src/spec.json'), here('./dist/spec.json'))
      console.log(`  llms        dist/spec.json  ${(statSync(here('./dist/spec.json')).size / 1024).toFixed(1)} kB`)
    },
  }
}

// Served at the root of getchore.github.io, so there is no base path.
export default defineConfig({
  base: '/',
  plugins: [react(), installers(), spec(), llms()],
  resolve: {
    alias: {
      'styled-system': here('./styled-system'),
    },
  },
})
