# Today's Puzzle: the puzzle file

`build/puzzles.json` is a list with one object per UK date. `python3 build/gen.py` checks it and copies it to
`puzzle/puzzles.json`, which the page reads. The page picks the entry whose `date` is today in Europe/London.

Never put the answer in this file. It is public. Only its SHA-256 goes in.

| field | needed | what |
|---|---|---|
| `date` | yes | `YYYY-MM-DD`, one entry per date |
| `id` | yes | unique id, e.g. `p-025`. The Worker checks it |
| `type` | yes | `cipher`, `morse`, `aviation` or `physics`. Keep the rotation in that order |
| `title` | yes | short title, e.g. `Morse riddle` |
| `prompt` | yes | the question, UK English, first person, no dashes |
| `hint` | yes | one line; showing it costs 10 points |
| `hash` | yes | SHA-256 hex of the answer, trimmed and lower cased |
| `cipher`, `rings`, `start` | cipher days | cipher text from rotors I II III, reflector B, no plugboard (see the rotor demonstrator's reference.py) |
| `morse` | morse days | dots, dashes, a space between letters and ` / ` between words |

Answers are single words or numbers. Make a hash with:
`printf '%s' 'answer' | tr 'A-Z' 'a-z' | sha256sum`

After adding days, rebuild with `python3 build/gen.py`, then `python3 build/light.py`, run `node build/tests/run.js`,
and add the same `{date: {id, hash}}` pairs to the Worker's ANSWERS variable.
