// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { syncWaveform } from "../src/core/media/waveform.js";
const { document } = globalThis;
// Renders one analysis result into a fresh progress bar and returns the bar.
async function rendered(analysis, progress = document.createElement("div")) {
  const card = { _config: {}, _getCurrentMediaUri: () => "spotify://track/one", $: () => progress, _callEngineMaCommand: vi.fn(async () => analysis) };
  syncWaveform(card, progress, 25); await Promise.all(card._waveformPending.values());
  syncWaveform(card, progress, 25);
  return progress;
}
const bars = (progress) => (progress.querySelector(".waveform-base").getAttribute("d").match(/M/g) || []).length;

describe("MA waveform", () => {
  it("retries a transient failure during the same track without request flooding", async () => {
    const progress=document.createElement('div');
    const command=vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue([.2,.8]);
    const card={_config:{},_getCurrentMediaUri:()=> 'spotify://track/one',_getCurrentDuration:()=>100,$:()=>progress,_callEngineMaCommand:command};
    syncWaveform(card,progress,10);await Promise.all(card._waveformPending.values());
    syncWaveform(card,progress,11);expect(command).toHaveBeenCalledOnce();
    card._waveformCache.get(':spotify://track/one').ts-=16000;
    syncWaveform(card,progress,20);await Promise.all(card._waveformPending.values());
    expect(command).toHaveBeenCalledTimes(2);expect(progress.classList.contains('has-waveform')).toBe(true);
  });
  it("uses only valid finite analysis bins", async () => {
    for (const invalid of [null, [1, NaN], ["1", 0], [0.5]]) {
      expect((await rendered(invalid)).classList.contains("has-waveform")).toBe(false);
    }
    const path = (await rendered([-1, .3, 2])).querySelector(".waveform-base").getAttribute("d");
    expect(path.startsWith("M6.00 21.00V23.00")).toBe(true); // -1 clamps to 0: the minimum bar
    expect(path).toContain("16.30V27.70"); // .3 stays as is
    expect(path.endsWith("M714.00 3.00V41.00")).toBe(true); // 2 clamps to 1: the full bar
  });
  it("adapts density to width and preserves peaks", async () => {
    const bins = Array(1800).fill(0); bins[0] = 1;
    const progress = document.createElement("div");
    let width = 0;
    Object.defineProperty(progress, "clientWidth", { get: () => width });
    const card = { _config: {}, _getCurrentMediaUri: () => "spotify://track/one", $: () => progress, _callEngineMaCommand: vi.fn(async () => bins) };
    syncWaveform(card, progress, 25); await Promise.all(card._waveformPending.values());
    syncWaveform(card, progress, 25);
    expect(bars(progress)).toBe(60); // an unmeasured bar renders as 300px wide
    expect(progress.querySelector(".waveform-base").getAttribute("d")).toContain("3.00V41.00");
    width = 700; syncWaveform(card, progress, 25);
    expect(bars(progress)).toBe(140);
    card._performanceModeEnabled = () => true; syncWaveform(card, progress, 25);
    expect(bars(progress)).toBe(30);
    expect(card._callEngineMaCommand).toHaveBeenCalledOnce();
  });
  it("deduplicates reads and ignores a stale result after a track change", async () => {
    const progress = document.createElement("div");
    let uri = "spotify://track/one", finish;
    const card = { _config:{}, _getCurrentMediaUri:()=>uri, _getCurrentDuration:()=>100, $:()=>progress,
      _callEngineMaCommand:vi.fn(()=>new Promise(r=>{finish=r;})) };
    syncWaveform(card,progress,25);syncWaveform(card,progress,25);
    await Promise.resolve();
    expect(card._callEngineMaCommand).toHaveBeenCalledOnce();
    expect(card._callEngineMaCommand).toHaveBeenCalledWith("audio_analysis/wave_form",{item_id:"one",provider_instance_id_or_domain:"spotify"});
    uri="spotify://track/two";finish([.1,.5]);
    await Promise.all(card._waveformPending.values());
    expect(progress.querySelector("svg")).toBeNull();
  });
  it("falls back quietly and caches an unavailable analysis", async () => {
    const progress=document.createElement("div");
    const card={_config:{},_getCurrentMediaUri:()=>"spotify://track/one",_getCurrentDuration:()=>100,$:()=>progress,_callEngineMaCommand:vi.fn(async()=>null)};
    syncWaveform(card,progress,25);await Promise.all(card._waveformPending.values());
    syncWaveform(card,progress,30);
    expect(card._callEngineMaCommand).toHaveBeenCalledOnce();
    expect(progress.classList.contains("has-waveform")).toBe(false);
  });
  it("renders the played fraction without refetching analysis", async () => {
    const progress=document.createElement("div");
    const card={_config:{},_getCurrentMediaUri:()=>"spotify://track/one",_getCurrentDuration:()=>100,$:()=>progress,_callEngineMaCommand:vi.fn(async()=>[.1,.7,.3])};
    syncWaveform(card,progress,25);await Promise.all(card._waveformPending.values());
    syncWaveform(card,progress,50);
    expect(progress.querySelector(".waveform-played").style.clipPath).toBe("inset(0 50% 0 0)");
    expect(card._callEngineMaCommand).toHaveBeenCalledOnce();
  });
});

it('resolves a library track through its real provider when MA returns no library analysis', async () => {
 const progress=document.createElement('div');
 const command=vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce([.2,.8,.4]);
 const uri='library://track/1044';
 const card={_config:{},_state:{maQueueState:{current_item:{media_item:{uri,provider_mappings:[{item_id:'spotify-id',provider_instance:'spotify--account',available:true}]}}}},_getCurrentMediaUri:()=>uri,$:()=>progress,_callEngineMaCommand:command};
 syncWaveform(card,progress,25);await Promise.all(card._waveformPending.values());
 expect(command).toHaveBeenNthCalledWith(2,'audio_analysis/wave_form',{item_id:'spotify-id',provider_instance_id_or_domain:'spotify--account'});
 expect(progress.classList.contains('has-waveform')).toBe(true);
});
