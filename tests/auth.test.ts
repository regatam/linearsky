import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { hiddenQuestion } from "../src/cli/auth.js";

class FakeInput extends EventEmitter {
  isRaw = false;
  paused = true;
  isPaused() { return this.paused; }
  pause() { this.paused = true; return this; }
  resume() { this.paused = false; return this; }
  setRawMode(mode: boolean) { this.isRaw = mode; return this; }
}

describe("hidden API key prompt", () => {
  it("does not echo input and restores terminal state after completion", async () => {
    const input = new FakeInput();
    let output = "";
    const answer = hiddenQuestion("Key: ", input, { write: (value) => { output += String(value); return true; } });
    input.emit("data", Buffer.from("secret-key\r"));

    await expect(answer).resolves.toBe("secret-key");
    expect(output).toBe("Key: \n");
    expect(input.isRaw).toBe(false);
    expect(input.isPaused()).toBe(true);
  });

  it("restores terminal state when input is interrupted", async () => {
    const input = new FakeInput();
    const answer = hiddenQuestion("Key: ", input, { write: () => true });
    input.emit("data", Buffer.from("partial\u0003"));

    await expect(answer).rejects.toThrow("cancelled");
    expect(input.isRaw).toBe(false);
    expect(input.isPaused()).toBe(true);
  });
});
