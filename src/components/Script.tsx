import { css, cx } from 'styled-system/css'
import { Code } from './Code'
import { spec } from '../lib/spec'
import { Band, EXTERNAL, Eyebrow, Heading } from './ui'

/**
 * The escape hatch, and the price of it. The section exists to say what a
 * block costs, not what it enables: `check` cannot read one, `--dry` cannot
 * preview one, and a shell block is not portable no matter who writes it.
 *
 * The form is read from the spec, so the syntax line above the sample is the
 * binary's own, and the section disappears rather than describing a language
 * chore no longer implements.
 */
const FORM = spec.syntax.find((s) => s.name === 'script')
const ENV = spec.builtins.find((b) => b.name === 'env')
const TRIPLE = spec.variables.find((v) => v.name === 'TRIPLE')

const SAMPLE = `task version {
  v=$(script uv run - {
    import tomllib, pathlib
    text = pathlib.Path("Cargo.toml").read_text()
    print(tomllib.loads(text)["workspace"]["package"]["version"])
  })
  echo "version is $v"
}`

function Mono({ children }: { children: string }) {
  return <code className={css({ fontFamily: 'mono', fontSize: '0.94em' })}>{children}</code>
}

const TRADE: { tag: string; body: string; warn?: boolean }[] = [
  { tag: 'chore check', body: 'reads nothing inside a block, and says so once per file, with a count.' },
  { tag: '--dry', body: 'skips the block whole rather than previewing a program it cannot read.' },
  {
    tag: 'script sh -',
    warn: true,
    body: 'is warned about. A host shell is a different program on every machine, which is the thing chore exists to remove.',
  },
]

export function Script() {
  if (!FORM || !ENV || !TRIPLE) return null

  return (
    <Band id="script" ambient="dots">
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'end',
          justifyContent: 'space-between',
          gap: '6',
        })}
      >
        <div>
          <Eyebrow>escape hatch</Eyebrow>
          <Heading>Some work needs a real language.</Heading>
        </div>
        <p className={css({ fontSize: '14.5px', color: 'fg.faint', maxW: '300px', lineHeight: '1.55' })}>
          chore's language is small on purpose. That is what lets <Mono>check</Mono> know every command in a
          file. Small languages run out.
        </p>
      </div>

      <div
        className={css({
          mt: '10',
          display: 'grid',
          gridTemplateColumns: { base: '1fr', lg: '1.1fr 1fr' },
          alignItems: 'start',
          gap: { base: '5', lg: '6' },
        })}
      >
        <div
          className={css({
            bg: 'bg.panel',
            border: '1px solid token(colors.border.default)',
            rounded: '16px',
            overflow: 'hidden',
            minW: '0',
          })}
        >
          <div
            className={css({
              px: '4',
              py: '2.5',
              bg: 'bg.subtle',
              borderBottom: '1px solid token(colors.border.default)',
              fontFamily: 'mono',
              fontSize: '11.5px',
              color: 'fg.accent',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            })}
          >
            {FORM.syntax}
          </div>
          <Code source={SAMPLE} lang="chore" size="sm" />
        </div>

        <div className={css({ minW: '0' })}>
          <p className={css({ fontSize: '15px', lineHeight: '1.6', color: 'fg.muted' })}>
            The command runs, and the block reaches it on stdin, raw. That is why <Mono>uv run -</Mono>,{' '}
            <Mono>python3 -</Mono>, <Mono>node -</Mono> and <Mono>nu --stdin</Mono> all work without chore
            knowing anything about any of them, and why a block can declare its own dependencies with{' '}
            <a
              href="https://peps.python.org/pep-0723/"
              {...EXTERNAL}
              className={css({
                color: 'fg.accent',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                textDecorationColor: 'accent.ring',
                _hover: { textDecorationColor: 'currentColor' },
              })}
            >
              PEP 723
            </a>
            . Values reach it through the environment: <Mono>{`${ENV.name} TARGET $${TRIPLE.name}`}</Mono>.
          </p>

          <p className={css({ mt: '6', fontSize: '14px', fontWeight: '600', color: 'fg.default' })}>
            The guarantees stop at the opening brace.
          </p>

          <div
            className={css({
              mt: '3',
              display: 'grid',
              gap: '1px',
              bg: 'border.default',
              border: '1px solid token(colors.border.default)',
              rounded: '14px',
              overflow: 'hidden',
            })}
          >
            {TRADE.map((t) => (
              <p
                key={t.tag}
                className={cx(
                  css({ bg: 'bg.panel', px: '5', py: '3.5', fontSize: '14px', lineHeight: '1.5', color: 'fg.faint' }),
                  t.warn && css({ bg: 'accent.soft', color: 'fg.muted' }),
                )}
              >
                <span className={css({ fontFamily: 'mono', fontSize: '13px', color: 'fg.accent' })}>
                  {t.tag}
                </span>{' '}
                {t.body}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Band>
  )
}
