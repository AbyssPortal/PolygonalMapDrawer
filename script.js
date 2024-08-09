const canvas = document.getElementById('polygonCanvas');
const ctx = canvas.getContext('2d');
let polygons = [];
let currentPolygon = { points: [], color: getRandomColor() };
let draggingPoint = null;
let isDragging = false;
const SNAP_DISTANCE = 5; // Distance threshold for snapping
let zoomLevel = 1;

const ZOOM_STEP = 0.1;

let offsetX = 0;
let offsetY = 0;


let isPanning = false;
let panStartX, panStartY;


canvas.addEventListener('mousedown', (e) => {
    if (e.button == 0) { //left
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / zoomLevel;
        const y = (e.clientY - rect.top - offsetY) / zoomLevel;
        draggingPoint = currentPolygon.points.find(point => Math.hypot(point.x - x, point.y - y) < SNAP_DISTANCE / zoomLevel);
        if (draggingPoint) {
            isDragging = true;
        } else {
            const snappedPoint = getSnappedPoint(x, y);
            currentPolygon.points.push(snappedPoint);
            draw();
        }
    } else if (e.button == 2) { // right 
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / zoomLevel;
        const y = (e.clientY - rect.top - offsetY) / zoomLevel;
        const pointIndex = currentPolygon.points.findIndex(point => Math.hypot(point.x - x, point.y - y) < SNAP_DISTANCE / zoomLevel);
        if (pointIndex !== -1) {
            currentPolygon.points.splice(pointIndex, 1);
            draw();
        }
    } else if (e.button == 1) { //middle
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault(); // Prevent default middle mouse button behavior
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && draggingPoint) {
        const rect = canvas.getBoundingClientRect();
        draggingPoint.x = (e.clientX - rect.left - offsetX) / zoomLevel;
        draggingPoint.y = (e.clientY - rect.top - offsetY) / zoomLevel;
        draw();
    } else if (isPanning) {
        const dx = (e.clientX - panStartX) ;
        const dy = (e.clientY - panStartY) ;
        offsetX += dx;
        offsetY += dy;
        panStartX = e.clientX;
        panStartY = e.clientY;
        draw();
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if (e.deltaY < 0) {
        zoomIn(mouseX, mouseY);
    } else {
        zoomOut(mouseX, mouseY);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button == 0) { // left
    isDragging = false;
    draggingPoint = null;
    } else if (e.button == 1) { // middle
        isPanning = false;
        canvas.style.cursor = 'default';
    }
});

canvas.addEventListener('mouseleave', () => {
    isPanning = false;
    canvas.style.cursor = 'default';
});


function finalizePolygon() {
    if (currentPolygon.points.length > 0) {
        polygons.push(currentPolygon);
        currentPolygon = { points: [], color: getRandomColor() };
        draw();
    }
}


let img = new Image();

function loadImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            img.onload = function () {
                draw();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function loadGraph(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            let graphData;
            try {
                graphData = JSON.parse(e.target.result);
            } catch (error) {
                console.error('Invalid JSON data:', error);
                return;
            }
            loadPolygons(graphData);
        };
        reader.readAsText(file);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, canvas.width * zoomLevel, canvas.height * zoomLevel);
    ctx.save();
    ctx.translate(offsetX, offsetY)
    ctx.scale(zoomLevel, zoomLevel);
    polygons.forEach(polygon => {
        drawPolygon(polygon);
    });
    drawPolygon(currentPolygon);
    ctx.restore();
}

function drawPolygon(polygon) {
    if (polygon.points.length > 1) {
        ctx.save();
        ctx.lineWidth = 1 / zoomLevel; // Adjust line width based on zoom level
        ctx.beginPath();
        ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
        for (let i = 1; i < polygon.points.length; i++) {
            ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = polygon.color;
        ctx.stroke();
        ctx.restore();
    }
    polygon.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, SNAP_DISTANCE / zoomLevel, 0, Math.PI * 2);
        ctx.fillStyle = polygon.color;
        ctx.fill();
    });
}

function outputCoordinates() {
    const width = document.getElementById('canvasWidth').value;
    const height = document.getElementById('canvasHeight').value;

    if (currentPolygon.points.length > 0) {
        if (confirm("Saving without finalizing will not save the current polygon. would you like to finalize it?")) {
            finalizePolygon();
        }
    }

    const output = polygons.map(polygon => ({
        color: polygon.color,
        points: polygon.points.map(point => ({
            x: (point.x) / width,
            y: (point.y) / height
        }))
    }));
    console.log(output);

    const outputData = JSON.stringify(output);
    const blob = new Blob([outputData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'graph.json';
    link.click();
}

function getLuminance(color) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    const backgroundLuminance = 1; // Assuming white background
    const colorLuminance = getLuminance(color);
    const contrastThreshold = 0.75; // Adjust this value as needed

    // Ensure high contrast
    if (Math.abs(backgroundLuminance - colorLuminance) < contrastThreshold) {
        // Invert color to ensure contrast
        color = '#' + (0xFFFFFF ^ parseInt(color.slice(1), 16)).toString(16).padStart(6, '0').toUpperCase();
    }

    return color;
}

function getSnappedPoint(x, y) {
    for (const polygon of polygons) {
        for (const point of polygon.points) {
            if (Math.hypot(point.x - x, point.y - y) < SNAP_DISTANCE / zoomLevel) {
                return { x: point.x, y: point.y };
            }
        }
    }
    return { x, y };
}

function zoomIn(mouseX, mouseY) {
    const zoomFactor = 1 + ZOOM_STEP;
    offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
    offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
    zoomLevel *= zoomFactor;
    draw();
}

function zoomOut(mouseX, mouseY) {
    const zoomFactor = 1 - ZOOM_STEP;
    offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
    offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
    zoomLevel *= zoomFactor;
    draw();
}

function resetZoom() {
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
    draw();
}

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left - offsetX) / zoomLevel;
    mouseY = (e.clientY - rect.top - offsetY) / zoomLevel;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete') {
        const polygonIndex = polygons.findIndex(polygon =>
            polygon.points.some(point => Math.hypot(mouseX - point.x, mouseY - point.y) < SNAP_DISTANCE)
        );
        if (polygonIndex !== -1) {
            polygons.splice(polygonIndex, 1);
            draw();
        }
    }
});

function changeCanvasResolution() {
    const canvas = document.getElementById('polygonCanvas');
    const width = document.getElementById('canvasWidth').value;
    const height = document.getElementById('canvasHeight').value;

    canvas.width = width;
    canvas.height = height;

    draw()
}



function loadPolygons(graphData) {
    polygons = graphData.map(polygonData => ({
        color: polygonData.color,
        points: polygonData.points.map(point => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height
        }))
    }));
    draw();
}
