if (file.type?.startsWith("video/")) {
  const video = document.createElement("video");
  video.src = file.url; // ✅ must include full URL from backend
  video.controls = true;
  video.classList.add("rounded-lg", "w-full", "h-40", "object-cover");
  preview.appendChild(video);
}

// Lightweight client helper to centralize API base URL and attach JWT Authorization header
(function () {
  const BASE = window.API_BASE || '';
  const api = {
    base: BASE,
    getToken() {
      return localStorage.getItem('token');
    },
    setToken(t) {
      if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
    },
    async fetch(input, init = {}) {
      // normalize url
      let url = input;
      if (!/^https?:\/\//i.test(url)) {
        // relative path -> prefix with base (empty means same origin)
        url = (this.base || '') + (url.startsWith('/') ? url : ('/' + url));
      }

      init.headers = init.headers || {};
      // if body is FormData, let the browser set Content-Type (multipart boundary)
      const formData = new FormData();
formData.append("file", file);

// add user info from localStorage
const user = JSON.parse(localStorage.getItem("user"));
if (user && user.email) {
  formData.append("userEmail", user.email);
}


      const token = this.getToken();
      if (token) {
        init.headers['Authorization'] = 'Bearer ' + token;
      }

      const res = await window.fetch(url, init);
      // try parse JSON, but don't throw here — leave error to caller
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
      return { ok: res.ok, status: res.status, data, raw: res };
    }
  };

  window.API = api;
})();
// Global references for modal
let activeFile = null;
const commentsModal = document.getElementById("commentsModal");
const commentsList = document.getElementById("commentsList");
const newComment = document.getElementById("newComment");
const sendComment = document.getElementById("sendComment");
const closeComments = document.getElementById("closeComments");
// 💬 Comment button (opens modal)
actions.querySelector(".comment-btn").addEventListener("click", async () => {
  activeFile = file.storedName || file.name;
  commentsModal.classList.remove("hidden");
  await loadComments(activeFile);
});
// ===== 📝 FEEDBACK FEATURE =====
const feedbackModal = document.getElementById("feedbackModal");
const feedbackText = document.getElementById("feedbackText");
const feedbackRating = document.getElementById("feedbackRating");
const sendFeedback = document.getElementById("sendFeedback");
const closeFeedback = document.getElementById("closeFeedback");

let activeFeedbackFile = null;

// 🎬 Open feedback modal
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("feedback-btn")) {
    activeFeedbackFile = e.target.closest(".bg-gray-800").querySelector("h3").textContent;
    feedbackModal.classList.remove("hidden");
  }
});

// 📨 Submit feedback
sendFeedback.addEventListener("click", async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.name || "Anonymous";
  const rating = feedbackRating.value;
  const text = feedbackText.value.trim();

  if (!rating || !text) {
    alert("Please provide both rating and feedback!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/feedback/${activeFeedbackFile}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: username, rating, text })
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ Feedback submitted!");
      feedbackText.value = "";
      feedbackRating.value = "";
      feedbackModal.classList.add("hidden");
    } else {
      alert("❌ " + data.error);
    }
  } catch (err) {
    alert("🚫 Error submitting feedback");
  }
});

// ✖ Close modal
closeFeedback.addEventListener("click", () => {
  feedbackModal.classList.add("hidden");
  feedbackText.value = "";
  feedbackRating.value = "";
});


// ✖ Close modal
closeComments.addEventListener("click", () => {
  commentsModal.classList.add("hidden");
  commentsList.innerHTML = "";
  newComment.value = "";
});

// 📨 Send comment
sendComment.addEventListener("click", async () => {
  if (!newComment.value.trim()) return;
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.name || "Anonymous";

  try {
    const res = await fetch(`http://localhost:5000/api/comment/${activeFile}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: username, text: newComment.value.trim() })
    });
    const data = await res.json();
    if (res.ok) {
      newComment.value = "";
      await loadComments(activeFile); // reload comments
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert("Failed to add comment.");
  }
});
// 🧠 Load comments from backend
async function loadComments(fileName) {
  commentsList.innerHTML = "<p class='text-gray-400'>Loading comments...</p>";
  try {
    const res = await fetch("http://localhost:5000/api/files");
    const files = await res.json();
    const file = files.find(f => f.storedName === fileName || f.name === fileName);

    if (!file || !file.comments || file.comments.length === 0) {
      commentsList.innerHTML = "<p class='text-gray-400'>No comments yet.</p>";
      return;
    }

    commentsList.innerHTML = file.comments
      .map(c => `
        <div class="bg-gray-600 p-2 rounded">
          <p class="font-semibold text-yellow-300">${c.user}</p>
          <p>${c.text}</p>
          <p class="text-xs text-gray-400">${new Date(c.date).toLocaleString()}</p>
        </div>
      `)
      .join("");
  } catch (err) {
    commentsList.innerHTML = "<p class='text-red-400'>Error loading comments</p>";
  }
}
