import './extended.js';
import './reward.js';
import {runTests} from './cases.js';
import {runPoints} from './points.mjs';
const results=[...runTests(),...await runPoints()];for(const r of results)console.log(`${r.pass?'PASS':'FAIL'} ${r.name}${r.error?'\n  '+r.error:''}`);
console.log(`${results.filter(r=>r.pass).length}/${results.length} passed`);
process.exitCode=results.every(r=>r.pass)?0:1;
