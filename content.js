const sidebar = document.createElement("div");

sidebar.innerHTML = `
<div id="ai-sidebar">

  <div id="ai-header">

    <span>
      ✨ AI Assistant
    </span>

    <div class="header-actions">
      <div class="mode-toggle">
        <button id="mode-ai" class="active">AI</button>
        <button id="mode-kb">KB</button>
      </div>

      <button id="themeToggleBtn" title="Toggle Theme">
        <svg id="themeIcon" viewBox="0 0 24 24" width="16" height="16">
          <!-- Default Moon Icon -->
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
        </svg>
      </button>
      <button id="minimizeBtn">
        —
      </button>
    </div>

  </div>

  <div id="ai-content">

    <textarea id="inputText"
      placeholder="Type rough reply..."></textarea>

    <div class="buttons" id="ai-buttons">

      <button data-tone="professional">
        Professional
      </button>

      <button data-tone="short">
        Short
      </button>

      <button data-tone="technical">
        Technical
      </button>

      <button data-tone="layman">
        Layman
      </button>

    </div>

    <div class="buttons" id="kb-buttons" style="display: none;">

      <button data-tone="fetch" style="grid-column: span 2;">
        Fetch
      </button>

    </div>

    <textarea id="outputText"
      placeholder="AI response..."></textarea>

    <div class="footer-buttons">

      <button id="copyBtn">
        Copy
      </button>

      <button id="insertBtn">
        Insert
      </button>

          <button id="resetBtn">
          Reset
         </button>


    </div>

  </div>

  <div id="ai-footer">
    Powered by Gaurav
  </div>

  <div class="resize-handle resize-right"></div>
  <div class="resize-handle resize-left"></div>
  <div class="resize-handle resize-top"></div>
  <div class="resize-handle resize-bottom"></div>
  <div class="resize-handle resize-top-left"></div>
  <div class="resize-handle resize-top-right"></div>
  <div class="resize-handle resize-bottom-left"></div>
  <div class="resize-handle resize-bottom-right"></div>

</div>
`;

document.body.appendChild(sidebar);

async function rewriteReply(tone) {

  const text =
    document.getElementById("inputText").value;

  const response = await fetch(
    "https://ai-support-backend-83ds.onrender.com/rewrite",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        text,
        tone,
        mode: currentMode
      })
    }
  );

  const data = await response.json();

  console.log(data);

  document.getElementById("outputText").value =
    data.reply || data.error || "No response";

}

document.querySelectorAll(".buttons button")
.forEach(button => {

  button.addEventListener("click", () => {

    rewriteReply(button.dataset.tone);

  });

});

let currentMode = "ai";

document.getElementById("mode-ai").addEventListener("click", () => {
  currentMode = "ai";
  document.getElementById("mode-ai").classList.add("active");
  document.getElementById("mode-kb").classList.remove("active");
  document.getElementById("ai-buttons").style.display = "grid";
  document.getElementById("kb-buttons").style.display = "none";
});

document.getElementById("mode-kb").addEventListener("click", () => {
  currentMode = "kb";
  document.getElementById("mode-kb").classList.add("active");
  document.getElementById("mode-ai").classList.remove("active");
  document.getElementById("ai-buttons").style.display = "none";
  document.getElementById("kb-buttons").style.display = "grid";
});

document.getElementById("copyBtn")
.addEventListener("click", () => {

  const output =
    document.getElementById("outputText");

  output.select();

  document.execCommand("copy");

  alert("Copied!");

});

document.getElementById("insertBtn")
.addEventListener("click", () => {

  const aiText =
    document.getElementById("outputText").value;

  let inserted = false;

  const editors =
    document.querySelectorAll(
      '[contenteditable="true"]'
    );

  editors.forEach(editor => {

    if (
      editor.offsetParent !== null
    ) {

      editor.focus();

      document.execCommand(
        "insertText",
        false,
        aiText
      );

      inserted = true;

    }

  });

  if (!inserted) {

    alert(
      "Tawk.to chat editor not found"
    );

  }

});
   
document.getElementById("resetBtn")
.addEventListener("click", () => {

  document.getElementById("inputText").value = "";

  document.getElementById("outputText").value = "";

});


let minimized = false;

document.getElementById("minimizeBtn")
.addEventListener("click", () => {

  minimized = !minimized;

  const content =
    document.getElementById("ai-content");

  const sidebar =
    document.getElementById("ai-sidebar");

  if (minimized) {

    content.style.display = "none";

    sidebar.style.height = "60px";

    sidebar.style.minHeight = "60px";

    sidebar.style.resize = "none";

    sidebar.style.overflow = "hidden";

  } else {

    content.style.display = "flex";

    content.style.flexDirection = "column";

    sidebar.style.height = "600px";

    sidebar.style.minHeight = "450px";

    sidebar.style.resize = "both";

    sidebar.style.overflow = "auto";

  }

});

const aiSidebar =
  document.getElementById("ai-sidebar");

const aiHeader =
  document.getElementById("ai-header");

let isDragging = false;

let offsetX, offsetY;

aiHeader.addEventListener(
  "mousedown",
  (e) => {

    if (e.target.closest('button')) return;

    isDragging = true;

    offsetX =
      e.clientX -
      aiSidebar.getBoundingClientRect().left;

    offsetY =
      e.clientY -
      aiSidebar.getBoundingClientRect().top;

    aiSidebar.style.transition = "none";

  }
);

document.addEventListener(
  "mousemove",
  (e) => {

    if (!isDragging) return;

    aiSidebar.style.left =
      `${e.clientX - offsetX}px`;

    aiSidebar.style.top =
      `${e.clientY - offsetY}px`;

    aiSidebar.style.right = "auto";

  }
);

document.addEventListener(
  "mouseup",
  () => {

    isDragging = false;

  }
);

const sidebarBox =
  document.getElementById("ai-sidebar");

const MIN_WIDTH = 320;
const MIN_HEIGHT = 450;

function makeResizable(selector, direction) {
  const handle = document.querySelector(selector);
  
  handle.addEventListener("mousedown", function(e) {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    
    const rect = sidebarBox.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startLeft = rect.left;
    const startTop = rect.top;

    function resize(e) {
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      // X-axis resizing
      if (direction.includes("right")) {
        newWidth = startWidth + (e.clientX - startX);
        if (startLeft + newWidth > window.innerWidth) {
          newWidth = window.innerWidth - startLeft;
        }
        newWidth = Math.max(MIN_WIDTH, newWidth);
      } else if (direction.includes("left")) {
        newWidth = startWidth - (e.clientX - startX);
        newLeft = startLeft + (e.clientX - startX);

        if (newLeft < 0) {
          newLeft = 0;
          newWidth = startLeft + startWidth;
        }

        if (newWidth < MIN_WIDTH) {
          newWidth = MIN_WIDTH;
          newLeft = startLeft + startWidth - MIN_WIDTH;
        }
      }

      // Y-axis resizing
      if (direction.includes("bottom")) {
        newHeight = startHeight + (e.clientY - startY);
        if (startTop + newHeight > window.innerHeight) {
          newHeight = window.innerHeight - startTop;
        }
        newHeight = Math.max(MIN_HEIGHT, newHeight);
      } else if (direction.includes("top")) {
        newHeight = startHeight - (e.clientY - startY);
        newTop = startTop + (e.clientY - startY);

        if (newTop < 0) {
          newTop = 0;
          newHeight = startTop + startHeight;
        }

        if (newHeight < MIN_HEIGHT) {
          newHeight = MIN_HEIGHT;
          newTop = startTop + startHeight - MIN_HEIGHT;
        }
      }

      // Apply dimensions
      sidebarBox.style.width = newWidth + "px";
      sidebarBox.style.height = newHeight + "px";

      // Apply positions if resizing left/top
      if (direction.includes("left")) {
        sidebarBox.style.left = newLeft + "px";
        sidebarBox.style.right = "auto";
      }
      if (direction.includes("top")) {
        sidebarBox.style.top = newTop + "px";
        sidebarBox.style.bottom = "auto";
      }
    }

    function stopResize() {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResize);
    }

    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
  });
}

makeResizable(".resize-right", "right");
makeResizable(".resize-left", "left");
makeResizable(".resize-top", "top");
makeResizable(".resize-bottom", "bottom");
makeResizable(".resize-top-left", "top-left");
makeResizable(".resize-top-right", "top-right");
makeResizable(".resize-bottom-left", "bottom-left");
makeResizable(".resize-bottom-right", "bottom-right");

// Theme Toggling Logic
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const aiSidebarContainer = document.getElementById("ai-sidebar");

const sunPath = "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z";
const moonPath = "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z";

function applyTheme(theme) {
  if (theme === "dark") {
    aiSidebarContainer.setAttribute("data-theme", "dark");
    themeIcon.innerHTML = `<path d="${sunPath}"/>`;
  } else {
    aiSidebarContainer.removeAttribute("data-theme");
    themeIcon.innerHTML = `<path d="${moonPath}"/>`;
  }
}

// Check saved or OS preference
let currentTheme = localStorage.getItem("ai-theme");
if (!currentTheme) {
  currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
applyTheme(currentTheme);

themeToggleBtn.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
  localStorage.setItem("ai-theme", currentTheme);
});