# Lorenz credits and sources

## Code and libraries

- three.js r185 (0.185.0), loaded from jsDelivr, MIT licence: https://threejs.org/ and https://github.com/mrdoob/three.js/blob/r185/LICENSE
  Used only for the 3D wheel rack. If it can't load, a flat 2D view takes over.
- Everything else (cipher core, game, tape, views, text) is my own, all rights reserved. See LICENSE.
- The Buy Me a Coffee button is the official button image, self hosted.
- The photo is of me.

## What's real and what's made up

- Real: the twelve wheels and their cam counts (chi 41, 31, 29, 26, 23; psi 43, 47, 51, 53, 59; motors 37 and 61),
  their order on the machine, the SZ40 motor logic and the SZ42A chi 2 one back limitation as described in the
  General Report on Tunny, the ITA2 teleprinter alphabet in Bletchley notation, the 5 hole tape layout with the
  sprocket between holes 2 and 3, and the QEP system of pointing to a line of start positions.
- Made up: the cam patterns. The real ones changed regularly and weren't published, so the game generates them
  per day from a seed. Rules (mine): chi and psi wheels about half raised with no run of more than four the same;
  motor wheels a little over half raised (mu61 about 62%, mu37 about 57%) with no run over five.
- Made up: every message. Original text, written in English for the game. None is a real intercept.
- Made up: the QEP book page layout, page numbers and the smudges, which are a game device.
- Made up: the example key behind the Worked example button in chi only mode. It's the key on the fixed wheels of the
  printable chi wheel model, made for that model, with the model's own test vectors. It isn't a wartime key.

## Sources for the history and the machine

- Good, Michie and Timms, General Report on Tunny (1945). Transcript of the machine section by Graham Ellsbury:
  http://www.ellsbury.com/tunny/tunny-007.htm (motors, basic motor, limitation, total motor)
  Index at AlanTuring.net: https://alanturing.net/turing_archive/archive/index/tunnyreportindex.html
- W. T. Tutte, FISH and I (lecture, University of Waterloo, 19 June 1998): https://cacr.uwaterloo.ca/techreports/1998/corr98-39.pdf
- B. Jack Copeland, Colossus: Breaking the German Tunny Code at Bletchley Park, The Rutherford Journal:
  https://www.rutherfordjournal.org/article030109.html (QEP from October 1942, 30 August 1941 depth, Tutte January 1942,
  Testery, Heath Robinson June 1943, Colossus 18 January and 5 February 1944, Colossus II 1 June 1944, SZ42A February 1943)
- Bletchley Park, 75 years since Colossus arrived at Bletchley: https://www.bletchleypark.org.uk/our-story/75-years-since-colossus-arrived-at-bletchley/
- The National Museum of Computing: https://www.tnmoc.org/colossus and https://www.tnmoc.org/tunny-heath-robinson
- Tony Sale, The Lorenz cipher and how Bletchley Park broke it: https://www.codesandciphers.org.uk/lorenz/fish.htm
- Tony Sale, The Bedstead (tape layout, elements 1 and 2 on one side of the sprocket, 3 to 5 on the other):
  https://www.codesandciphers.org.uk/index_files/colmk2d/Bedstead.htm
- The Bill Tutte Memorial Fund, Teleprinter code: https://billtuttememorial.org.uk/codebreaking/teleprinter-code/
- Wikipedia, Lorenz cipher (wheel letters A to M and their order): https://en.wikipedia.org/wiki/Lorenz_cipher

Contact: hello@dexmlabs.app
