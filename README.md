# getchore.github.io

The [chore](https://github.com/getchore/chore) website.

```sh
chore dev     # http://localhost:5173
chore build   # into dist/
```

The language reference is **generated**, never written: `chore spec` emits the
whole language as JSON and the site renders that, so it cannot drift from the
binary. `src/spec.json` is a committed snapshot for building without chore
installed — the build warns when it falls back to it, and refuses to let an
older chore overwrite a newer snapshot.

`/llms.txt`, `/llms-full.txt` and `/spec.json` come from the same source, for
agents and tools.

`install.sh` and `install.ps1` are not kept here. They live in the chore repo,
where CI lints them and where they are versioned with what they install; the
build takes them from a side-by-side checkout if there is one and fetches them
from the chore repo otherwise.
