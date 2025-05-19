document.addEventListener("DOMContentLoaded", () => {
  fetch("advice-posts.json")
    .then(response => response.json())
    .then(posts => {
      const container = document.getElementById("advice-container");

 // Sort by most recent
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Sort by most recent
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));  
      posts.forEach(post => {
        const article = document.createElement("article");
        article.classList.add("advice-card");


        article.innerHTML = `
          <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
          <p class="advice-date">${new Date(post.date).toLocaleDateString("en-AU")}</p>
          <p>${post.summary}</p>
          <a href="posts/${post.slug}.html" class="read-more">Read More</a>
        `;

        container.appendChild(article);
      });
    })
    .catch(error => {
      console.error("Failed to load advice posts:", error);
    });
});
