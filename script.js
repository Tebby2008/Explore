function evaluateFunction(func, x) {
    switch (func) {
        case "sin(x)":
            return Math.sin(x);
        case "cos(x)":
            return Math.cos(x);
        case "x":
            return x;
        case "quadratic":
            return x * x - 1;
        case "cubic":
            return x * x * x - 1.5 * x;
        case "log(x)":
            return Math.log(x);
        case "e^x":
            return Math.exp(x);
        case "tan(x)":
            return Math.tan(x);
        default:
            return 0;
    }
}

function resizeCanvas() {
    const canvas = document.getElementById("graphCanvas");
    const width = canvas.parentNode.clientWidth; // Adjust to parent width (80% of body width)
    const height = parseInt(document.getElementById("height").value);
    canvas.width = width;
    canvas.height = height;
    return { width, height };
}

function drawGraph() {
    const { width, height } = resizeCanvas();
    const canvas = document.getElementById("graphCanvas");
    const ctx = canvas.getContext("2d");
    const func = document.getElementById("function").value;
    const symbol = document.getElementById("symbol").value;
    const size = parseFloat(document.getElementById("size").value);

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.beginPath();

    // Draw axes
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Plot the function
    for (let i = 0; i < width; i++) {
        const x = (i - width / 2) / size;
        const y = evaluateFunction(func, x);

        if (isNaN(y) || y === Infinity || y === -Infinity) continue; // Skip undefined points

        const plotX = i;
        const plotY = height / 2 - (y * size);

        if (plotY >= 0 && plotY <= height) {
            ctx.fillText(symbol, plotX, plotY);
        }
    }
}

// Adjust canvas size when window is resized
window.addEventListener("resize", drawGraph);

// Initial draw
drawGraph();
