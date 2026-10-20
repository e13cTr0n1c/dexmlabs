from pathlib import Path
here = Path(__file__).resolve()
src = "".join((here.parent / "gen-src" / f"{i}.py").read_text() for i in range(5))
exec(compile(src, str(here), "exec"), {"__name__": "__main__", "__file__": str(here)})
