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



canvas.addEventListener('mousedown', (e) => {
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
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && draggingPoint) {
        const rect = canvas.getBoundingClientRect();
        draggingPoint.x = (e.clientX - rect.left - offsetX) / zoomLevel;
        draggingPoint.y = (e.clientY - rect.top - offsetY) / zoomLevel;
        draw();
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
const x = (e.clientX - rect.left - offsetX) / zoomLevel;
const y = (e.clientY - rect.top - offsetY) / zoomLevel;
    const pointIndex = currentPolygon.points.findIndex(point => Math.hypot(point.x - x, point.y - y) < SNAP_DISTANCE / zoomLevel);
    if (pointIndex !== -1) {
        currentPolygon.points.splice(pointIndex, 1);
        draw();
    }
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

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggingPoint = null;
});


function finalizePolygon() {
    if (currentPolygon.points.length > 0) {
        polygons.push(currentPolygon);
        currentPolygon = { points: [], color: getRandomColor() };
        draw();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    const output = polygons.map(polygon => ({
        color: polygon.color,
        points: polygon.points.map(point => ({
            x: (point.x * zoomLevel + offsetX) / 800,
            y: (point.y * zoomLevel + offsetY) / 600
        }))
    }));
    console.log(output);
    document.getElementById('output').textContent = JSON.stringify(output, null, 2);
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