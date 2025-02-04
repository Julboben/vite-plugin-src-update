// Base styling
import "@/styles/base.css";
import "@/styles/typography.css";

console.log(`${import.meta.url} loaded`);
// Message
const message =
  "The Vite plugin source update is working. Please check network tab to verify if all files are loaded.";

const body = document.getElementsByTagName("body")[0];

if (body) {
  body.innerHTML = `
  <main>
      <p style="display: none;" class="joker">
        Separate CSS file imported and working.
      </p>
      <h1>${message}</h1>
      <div id="success-container">
          <div class="checkmark-container">
              <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
          </div>
      </div>
  </main>
`;

  const successContainer = document.getElementById("success-container");
  if (successContainer) {
    successContainer.style.display = "flex"; // Show the container
    successContainer.classList.add("success-animation"); // Start the animation
  }
}
