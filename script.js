fetch("/api/test.js")
  .then(res => res.json())
  .then(data => console.log(data.message))
  .catch(err => console.error(err));
