import { logs } from "./store.js";
import run from '../../src/psre.js'

globalThis.config = {
  tab: 1,
  max_loop_limit: 1000,
};

function console_log(string) {
  logs.update((log) => log + `${string}\n`);
}

export default function execute(input) {
  logs.set("");
  run(input)
}
