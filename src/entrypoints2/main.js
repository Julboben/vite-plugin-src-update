// Base styling
import "@/styles/base.css";
import "@/styles/typography.css";

// Message
const message =
  "Please check the DOM elements to see if the vite scripts updates correctly.";

  console.log(`${import.meta.url} loaded`);
const body = document.getElementsByTagName("body")[0];
if (body) {
  body.innerHTML = `
    <main>
        <h1>${message}</h1>
    </main>
`;
}
