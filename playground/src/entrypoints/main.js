import "../styles/main.css";
import { pass } from "../lib/checks.js";

pass("script");
document.getElementById("mode").value = import.meta.env.DEV ? "dev" : "build";

if (import.meta.hot) {
  pass("hmr");
} else {
  document.querySelector('[data-check="hmr"]')?.remove();
}
