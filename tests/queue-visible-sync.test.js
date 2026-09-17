// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "../src/homeii-music-flow.js";
const prototype = globalThis.customElements.get("homeii-music-flow").prototype;
afterEach(()=>vi.useRealTimers());
describe("visible queue synchronization", () => {
  it("returns a browsed cover to the playing track after ten idle seconds", async () => {
    vi.useFakeTimers();
    const card={_state:{mobileArtBrowseOffset:2},_clearArtDragOffset:vi.fn(),_refreshMobileArtStack:vi.fn()};
    prototype._scheduleMobileArtBrowseReset.call(card);
    await vi.advanceTimersByTimeAsync(9999);
    expect(card._state.mobileArtBrowseOffset).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(card._state.mobileArtBrowseOffset).toBe(0);
    expect(card._clearArtDragOffset).toHaveBeenCalledOnce();
    expect(card._refreshMobileArtStack).toHaveBeenCalledWith(true);
  });
  it("restarts the ten-second return countdown after more browsing", async () => {
    vi.useFakeTimers();
    const card={_state:{mobileArtBrowseOffset:1},_clearArtDragOffset:vi.fn(),_refreshMobileArtStack:vi.fn()};
    prototype._scheduleMobileArtBrowseReset.call(card);
    await vi.advanceTimersByTimeAsync(7000);
    card._state.mobileArtBrowseOffset=2;
    prototype._scheduleMobileArtBrowseReset.call(card);
    await vi.advanceTimersByTimeAsync(9999);
    expect(card._state.mobileArtBrowseOffset).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(card._state.mobileArtBrowseOffset).toBe(0);
  });
  it("refreshes an outdated rendered queue even when in-memory data was already updated", async () => {
    vi.useFakeTimers();
    const body = {dataset:{menuPage:"queue",queueSignature:"old"}};
    const card = {_state:{menuOpen:true,menuPage:"queue"},$:()=>body,_queueRenderSignature:()=>"new",isConnected:true,_renderMobileMenu:vi.fn(async()=>{})};
    prototype._scheduleVisibleQueueSync.call(card);
    await vi.advanceTimersByTimeAsync(200);
    expect(card._renderMobileMenu).toHaveBeenCalledOnce();
  });
  it("clears old rows when MA confirms an empty queue", () => {
    const card = {_state:{queueItems:[{queue_item_id:"old"}]},_queueItemsWithSequentialSortIndexes:items=>items};
    prototype._applyQueueSnapshot.call(card,{items:0,current_item:null},[],true);
    expect(card._state.queueItems).toEqual([]);
  });
  it("coalesces refreshes and waits for a queue drag to finish", async () => {
    vi.useFakeTimers();
    const body={dataset:{menuPage:"queue",queueSignature:"old"}};
    const card={_state:{menuOpen:true,menuPage:"queue"},$:()=>body,_queueRenderSignature:()=>"new",isConnected:true,_queueDragActive:true,_renderMobileMenu:vi.fn(async()=>{})};
    card._scheduleVisibleQueueSync=()=>prototype._scheduleVisibleQueueSync.call(card);
    card._scheduleVisibleQueueSync(); card._scheduleVisibleQueueSync();
    await vi.advanceTimersByTimeAsync(200);
    expect(card._renderMobileMenu).not.toHaveBeenCalled();
    card._queueDragActive=false; await vi.advanceTimersByTimeAsync(200);
    expect(card._renderMobileMenu).toHaveBeenCalledOnce();
  });
});
