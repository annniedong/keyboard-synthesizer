// title.js
document.querySelectorAll(".title-text").forEach(el => {
    const letters = el.textContent.split("");

    el.innerHTML = letters
        .map(
            (char, i) =>
                `<span style="animation-delay:${i * 0.1}s">${
                    char === " " ? "&nbsp;" : char
                }</span>`
        )
        .join("");
});