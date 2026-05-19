document.getElementById("logo").onerror = function () {
  document.getElementById("err").textContent =
    "Image failed to load — re-copy URL from Assets (Copy as HTML img).";
};
