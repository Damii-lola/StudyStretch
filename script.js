document.getElementById("testBtn").addEventListener("click", async () => {
  const res = await fetch("/.netlify/functions/hello");
  const data = await res.json();
  document.getElementById("response").innerText = data.message;
});
