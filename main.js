const message =
  "This is a test. Please check the DOM elements to see if the vite scripts updated correctly.";

console.log(`${message}`);
const body = document.getElementsByTagName("body")[0];
if (body) {
  body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 80vh;">
        <p>${message}</p>
    </div>
`;
}
