/** All sound is synthesised in the browser. No samples, recordings, network requests or autoplay. */
export class RadioAudio {
  constructor(){this.enabled=false;this.context=null;this.nodes=new Set();}
  async unlock(){if(!this.enabled)return;try{if(!this.context)this.context=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')await this.context.resume();}catch{this.enabled=false;}}
  setEnabled(value){this.enabled=value;if(!value)this.stop();}
  tone(frequency,start,duration,volume=.06){const c=this.context;if(!c)return;const osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.setValueAtTime(volume,Math.max(start+.008,start+duration-.012));gain.gain.linearRampToValueAtTime(0,start+duration);osc.connect(gain).connect(c.destination);osc.start(start);osc.stop(start+duration+.02);this.nodes.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();this.nodes.delete(osc);};}
  async transmit(mode,ok){if(!this.enabled)return;await this.unlock();if(!this.context)return;this.stop();const c=this.context,t=c.currentTime+.02;
    if(mode==='CW'){const pattern=[1,1,1,3,1,3];let start=t;for(const units of pattern){this.tone(650,start,units*.065,.045);start+=units*.065+.07;}}
    else if(mode==='FT8'){for(let i=0;i<12;i++)this.tone(820+[0,4,2,7,1,5,3,6,2,0,7,4][i]*6.25,t+i*.08,.077,.035);}
    else {const buffer=c.createBuffer(1,Math.floor(c.sampleRate*.7),c.sampleRate),data=buffer.getChannelData(0);let x=113;for(let i=0;i<data.length;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;data[i]=(x/4294967296*2-1)*.1;}const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1200;filter.Q.value=.6;gain.gain.setValueAtTime(.2,t);gain.gain.linearRampToValueAtTime(0,t+.7);source.connect(filter).connect(gain).connect(c.destination);source.start(t);this.nodes.add(source);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.nodes.delete(source);};}
    this.tone(ok?1000:350,t+1,.12,.04);if(ok)this.tone(1300,t+1.16,.12,.04);
  }
  stop(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
  pause(){this.stop();this.context?.suspend().catch(()=>{});}
  resume(){if(this.enabled&&this.context)this.context.resume().catch(()=>{});}
}
